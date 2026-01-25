import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { HttpMethod, KeyValuePair } from '../../../core/types';

interface UrlBarProps {
  url: string;
  method: HttpMethod;
  queryParams: KeyValuePair[];
  onUrlChange: (url: string) => void;
  onMethodChange: (method: HttpMethod) => void;
  onQueryParamsChange: (params: KeyValuePair[]) => void;
  onSend: () => void;
  isLoading: boolean;
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

// Parse URL and extract base URL + query params
function parseUrlWithParams(fullUrl: string): { baseUrl: string; params: KeyValuePair[] } {
  if (!fullUrl) {
    return { baseUrl: '', params: [] };
  }

  try {
    const urlObj = new URL(fullUrl);
    const params: KeyValuePair[] = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value, enabled: true });
    });
    // Remove search params from URL to get base URL
    urlObj.search = '';
    return { baseUrl: urlObj.toString(), params };
  } catch {
    // If URL is invalid, try manual parsing
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
          params.push({
            key: decodeURIComponent(key),
            value: value ? decodeURIComponent(value) : '',
            enabled: true,
          });
        }
      }
    }
    
    return { baseUrl, params };
  }
}

// Build full URL from base URL and params
function buildFullUrl(baseUrl: string, params: KeyValuePair[]): string {
  const enabledParams = params.filter(p => p.enabled && p.key);
  if (!baseUrl || enabledParams.length === 0) {
    return baseUrl;
  }

  try {
    const urlObj = new URL(baseUrl);
    enabledParams.forEach(param => {
      urlObj.searchParams.append(param.key, param.value);
    });
    return urlObj.toString();
  } catch {
    // If URL is invalid, append manually
    const paramString = enabledParams
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${paramString}`;
  }
}

export function UrlBar({ 
  url, 
  method, 
  queryParams, 
  onUrlChange, 
  onMethodChange, 
  onQueryParamsChange,
  onSend, 
  isLoading 
}: UrlBarProps) {
  // Track whether user is actively editing the input
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Compute the full URL with query params for display
  const fullUrl = useMemo(() => {
    return buildFullUrl(url, queryParams);
  }, [url, queryParams]);

  // Update edit value when not editing and full URL changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(fullUrl);
    }
  }, [fullUrl, isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      onSend();
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFullUrl = e.target.value;
    setEditValue(newFullUrl);
    
    // Parse the URL to extract base URL and params
    const { baseUrl, params: urlParams } = parseUrlWithParams(newFullUrl);
    
    // Update base URL
    onUrlChange(baseUrl);
    
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

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setEditValue(fullUrl);
  }, [fullUrl]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

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
        <input
          type="text"
          className="url-input"
          placeholder="Enter request URL (e.g., https://api.example.com/users?page=1)"
          value={isEditing ? editValue : fullUrl}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isLoading}
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
    </div>
  );
}
