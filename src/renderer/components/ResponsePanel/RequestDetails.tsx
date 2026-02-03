import React from 'react';
import { HttpRequest } from '@core';
import { SyntaxHighlighter } from './SyntaxHighlighter';

interface RequestDetailsProps {
  request: HttpRequest | null;
}

export function RequestDetails({ request }: RequestDetailsProps) {
  if (!request) {
    return (
      <div className="request-details-empty">
        <p>No request details available</p>
        <p className="request-details-empty-hint">
          Send a request to see the full request details
        </p>
      </div>
    );
  }

  // Build the full URL with query parameters
  const buildFullUrl = () => {
    const enabledParams = request.queryParams.filter(p => p.enabled && p.key);
    if (enabledParams.length === 0) {
      return request.url;
    }
    
    const queryString = enabledParams
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    
    const separator = request.url.includes('?') ? '&' : '?';
    return `${request.url}${separator}${queryString}`;
  };

  const enabledHeaders = request.headers.filter(h => h.enabled && h.key);
  const enabledParams = request.queryParams.filter(p => p.enabled && p.key);
  const hasBody = request.body.type !== 'none' && request.body.content.trim().length > 0;
  const hasAuth = request.auth.type !== 'none';

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'method-get';
      case 'POST': return 'method-post';
      case 'PUT': return 'method-put';
      case 'PATCH': return 'method-patch';
      case 'DELETE': return 'method-delete';
      default: return '';
    }
  };

  return (
    <div className="request-details">
      <div className="request-details-section">
        <div className="request-details-section-header">
          <span className="request-details-section-title">Method & URL</span>
        </div>
        <div className="request-details-section-content">
          <div className="request-method-url">
            <span className={`request-method-badge ${getMethodColor(request.method)}`}>
              {request.method}
            </span>
            <span className="request-full-url" title={buildFullUrl()}>
              {buildFullUrl()}
            </span>
          </div>
        </div>
      </div>

      {enabledParams.length > 0 && (
        <div className="request-details-section">
          <div className="request-details-section-header">
            <span className="request-details-section-title">Query Parameters</span>
            <span className="request-details-section-count">{enabledParams.length}</span>
          </div>
          <div className="request-details-section-content">
            <div className="request-kv-list">
              {enabledParams.map((param, index) => (
                <div key={index} className="request-kv-item">
                  <span className="request-kv-key">{param.key}</span>
                  <span className="request-kv-separator">:</span>
                  <span className="request-kv-value">{param.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {enabledHeaders.length > 0 && (
        <div className="request-details-section">
          <div className="request-details-section-header">
            <span className="request-details-section-title">Headers</span>
            <span className="request-details-section-count">{enabledHeaders.length}</span>
          </div>
          <div className="request-details-section-content">
            <div className="request-kv-list">
              {enabledHeaders.map((header, index) => (
                <div key={index} className="request-kv-item">
                  <span className="request-kv-key">{header.key}</span>
                  <span className="request-kv-separator">:</span>
                  <span className="request-kv-value">{header.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasAuth && (
        <div className="request-details-section">
          <div className="request-details-section-header">
            <span className="request-details-section-title">Authentication</span>
          </div>
          <div className="request-details-section-content">
            <div className="request-auth-details">
              {request.auth.type === 'basic' && request.auth.basic && (
                <div className="request-kv-item">
                  <span className="request-kv-key">Type</span>
                  <span className="request-kv-separator">:</span>
                  <span className="request-kv-value">Basic Auth</span>
                </div>
              )}
              {request.auth.type === 'basic' && request.auth.basic && (
                <>
                  <div className="request-kv-item">
                    <span className="request-kv-key">Username</span>
                    <span className="request-kv-separator">:</span>
                    <span className="request-kv-value">{request.auth.basic.username}</span>
                  </div>
                  <div className="request-kv-item">
                    <span className="request-kv-key">Password</span>
                    <span className="request-kv-separator">:</span>
                    <span className="request-kv-value">••••••••</span>
                  </div>
                </>
              )}
              {request.auth.type === 'bearer' && request.auth.bearer && (
                <>
                  <div className="request-kv-item">
                    <span className="request-kv-key">Type</span>
                    <span className="request-kv-separator">:</span>
                    <span className="request-kv-value">Bearer Token</span>
                  </div>
                  <div className="request-kv-item">
                    <span className="request-kv-key">Token</span>
                    <span className="request-kv-separator">:</span>
                    <span className="request-kv-value">{request.auth.bearer.token}</span>
                  </div>
                </>
              )}
              {request.auth.type === 'api-key' && request.auth.apiKey && (
                <>
                  <div className="request-kv-item">
                    <span className="request-kv-key">Type</span>
                    <span className="request-kv-separator">:</span>
                    <span className="request-kv-value">API Key</span>
                  </div>
                  <div className="request-kv-item">
                    <span className="request-kv-key">Key</span>
                    <span className="request-kv-separator">:</span>
                    <span className="request-kv-value">{request.auth.apiKey.key}</span>
                  </div>
                  <div className="request-kv-item">
                    <span className="request-kv-key">Value</span>
                    <span className="request-kv-separator">:</span>
                    <span className="request-kv-value">{request.auth.apiKey.value}</span>
                  </div>
                  <div className="request-kv-item">
                    <span className="request-kv-key">Add To</span>
                    <span className="request-kv-separator">:</span>
                    <span className="request-kv-value">{request.auth.apiKey.addTo}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {hasBody && (
        <div className="request-details-section">
          <div className="request-details-section-header">
            <span className="request-details-section-title">Body</span>
            <span className="request-details-section-type">{request.body.type}</span>
          </div>
          <div className="request-details-section-content">
            <div className="request-body-content">
              <SyntaxHighlighter 
                content={request.body.content} 
                contentType={
                  request.body.type === 'json' ? 'application/json' :
                  request.body.type === 'text' ? 'text/plain' :
                  'text/plain'
                } 
              />
            </div>
          </div>
        </div>
      )}

      {!hasBody && !hasAuth && enabledHeaders.length === 0 && enabledParams.length === 0 && (
        <div className="request-details-empty">
          <p>No additional request details</p>
        </div>
      )}
    </div>
  );
}
