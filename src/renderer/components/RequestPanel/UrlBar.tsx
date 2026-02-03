import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { HttpMethod, KeyValuePair, Environment, EnvironmentVariable, replaceVariables } from '@core';
import { VariableInput } from '../common/VariableInput';

interface UrlBarProps {
  url: string;
  method: HttpMethod;
  queryParams: KeyValuePair[];
  onUrlChange: (url: string) => void;
  onMethodChange: (method: HttpMethod) => void;
  onQueryParamsChange: (params: KeyValuePair[]) => void;
  onSend: () => void;
  isLoading: boolean;
  activeEnvironment: Environment | null;
  collectionBaseUrl?: string; // Base URL from collection settings
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// Parse URL and extract base URL + query params
// Handles plain text URLs that may contain variables like {{var-name}}
// No URL encoding/decoding is done here - that only happens when sending the request
function parseUrlWithParams(fullUrl: string): { baseUrl: string; params: KeyValuePair[] } {
  if (!fullUrl) {
    return { baseUrl: '', params: [] };
  }

  // Use manual parsing - don't use URL constructor as it may fail with variables
  // Just split on ? to separate base URL from query string
  const questionIndex = fullUrl.indexOf('?');
  if (questionIndex === -1) {
    return { baseUrl: fullUrl, params: [] };
  }
  
  const baseUrl = fullUrl.substring(0, questionIndex);
  const queryString = fullUrl.substring(questionIndex + 1);
  const params: KeyValuePair[] = [];
  
  if (queryString) {
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split('=');
      const value = valueParts.join('='); // Handle values with = in them
      if (key) {
        // Don't decode URI components - keep variables as {{var-name}}
        params.push({
          key: key,
          value: value || '',
          enabled: true,
        });
      }
    }
  }
  
  return { baseUrl, params };
}

// Build full URL from base URL and params
// This builds a plain text URL without encoding - encoding only happens when sending the request
// This allows variables like {{var-name}} to be displayed as-is
function buildFullUrl(baseUrl: string, params: KeyValuePair[]): string {
  if (!baseUrl) {
    return '';
  }
  
  const enabledParams = params.filter(p => p.enabled && p.key);
  if (enabledParams.length === 0) {
    return baseUrl;
  }

  // Build query string without encoding (variables should remain as {{var-name}})
  const paramString = enabledParams
    .map(p => `${p.key}=${p.value}`)
    .join('&');
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${paramString}`;
}

// Helper function to compute the full resolved URL (with baseURL prepended and variables replaced)
// This is used for display purposes only
function computeFullResolvedUrl(
  requestUrl: string,
  queryParams: KeyValuePair[],
  collectionBaseUrl?: string,
  activeEnvironment?: Environment | null
): string {
  // Create variables record once
  const variables: Record<string, string> = {};
  if (activeEnvironment?.variables) {
    for (const variable of activeEnvironment.variables) {
      if (variable.key) {
        variables[variable.key] = variable.value || '';
      }
    }
  }
  
  // Resolve variables in the request URL
  let resolvedUrl = requestUrl;
  if (Object.keys(variables).length > 0) {
    resolvedUrl = replaceVariables(requestUrl, variables).trim();
  }
  
  // Resolve variables in collection baseURL if present
  let resolvedBaseUrl = collectionBaseUrl;
  if (resolvedBaseUrl && Object.keys(variables).length > 0) {
    resolvedBaseUrl = replaceVariables(resolvedBaseUrl, variables).trim();
  }
  
  // Prepend baseURL if present (always prepend if baseURL is defined)
  let fullUrl = resolvedUrl;
  if (resolvedBaseUrl && resolvedBaseUrl.trim() && resolvedUrl) {
    const trimmedBaseUrl = resolvedBaseUrl.trim();
    const trimmedRequestUrl = resolvedUrl.trim();
    
    // Always prepend baseURL regardless of whether request URL starts with http:// or https://
    const normalizedBaseUrl = trimmedBaseUrl.endsWith('/') ? trimmedBaseUrl.slice(0, -1) : trimmedBaseUrl;
    const normalizedRequestUrl = trimmedRequestUrl.startsWith('/') ? trimmedRequestUrl : '/' + trimmedRequestUrl;
    fullUrl = normalizedBaseUrl + normalizedRequestUrl;
  }
  
  // Resolve variables in query params (both keys and values)
  const resolvedQueryParams = Object.keys(variables).length > 0
    ? queryParams.map(param => ({
        ...param,
        key: replaceVariables(param.key, variables),
        value: replaceVariables(param.value, variables),
      }))
    : queryParams;
  
  // Build full URL with resolved query params
  return buildFullUrl(fullUrl, resolvedQueryParams);
}

export function UrlBar({ 
  url, 
  method, 
  queryParams, 
  onUrlChange, 
  onMethodChange, 
  onQueryParamsChange,
  onSend, 
  isLoading,
  activeEnvironment,
  collectionBaseUrl
}: UrlBarProps) {
  // Compute the full URL with query params for the input (user's entered URL only, no baseURL prepended)
  const fullUrl = useMemo(() => {
    return buildFullUrl(url, queryParams);
  }, [url, queryParams]);

  // Compute the full resolved URL (with baseURL prepended and variables replaced) for display
  const fullResolvedUrl = useMemo(() => {
    return computeFullResolvedUrl(url, queryParams, collectionBaseUrl, activeEnvironment);
  }, [url, queryParams, collectionBaseUrl, activeEnvironment]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      onSend();
    }
  };

  const handleUrlChange = useCallback((newFullUrl: string) => {
    // Parse the URL to extract base URL and params
    const { baseUrl: fullBaseUrl, params: urlParams } = parseUrlWithParams(newFullUrl);
    
    // Store the URL as-is (user's entered URL, no baseURL stripping needed)
    onUrlChange(fullBaseUrl);
    
    // Merge URL params with existing disabled params
    // Keep disabled params from the params tab, replace enabled ones with URL params
    const disabledParams = queryParams.filter(p => !p.enabled);
    const newParams = [...urlParams, ...disabledParams];
    
    // Only update if params actually changed
    const currentEnabled = queryParams.filter(p => p.enabled);
    const paramsChanged = 
      urlParams.length !== currentEnabled.length ||
      urlParams.some((p, i) => 
        !currentEnabled[i] || 
        p.key !== currentEnabled[i].key || 
        p.value !== currentEnabled[i].value
      );
    
    if (paramsChanged) {
      onQueryParamsChange(newParams);
    }
  }, [queryParams, onUrlChange, onQueryParamsChange]);

  return (
    <div className="url-bar-container">
      <div className="url-bar">
        <select
          className="method-select"
          value={method}
          onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
          disabled={isLoading}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <VariableInput
          value={fullUrl}
          onChange={handleUrlChange}
          placeholder="Enter request URL (e.g., https://api.example.com/users?page=1)"
          disabled={isLoading}
          className="url-input"
          activeEnvironment={activeEnvironment}
          onKeyDown={handleKeyDown}
        />
        <button
          className={`send-button ${isLoading ? 'loading' : ''}`}
          onClick={onSend}
          disabled={isLoading || !url}
          title="Send Request (Ctrl+Enter)"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
      {fullResolvedUrl && fullResolvedUrl !== fullUrl && (
        <div style={{
          padding: '4px 12px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--background-secondary)',
          borderTop: '1px solid var(--border-color)',
          fontFamily: 'monospace'
        }}>
          URL: {fullResolvedUrl}
        </div>
      )}
    </div>
  );
}
