import React, { useMemo } from 'react';
import { HttpMethod, KeyValuePair } from '../../../core/types';

interface UrlBarProps {
  url: string;
  method: HttpMethod;
  queryParams: KeyValuePair[];
  onUrlChange: (url: string) => void;
  onMethodChange: (method: HttpMethod) => void;
  onSend: () => void;
  isLoading: boolean;
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function UrlBar({ url, method, queryParams, onUrlChange, onMethodChange, onSend, isLoading }: UrlBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      onSend();
    }
  };

  // Compute the full URL with query params for preview
  const fullUrl = useMemo(() => {
    const enabledParams = queryParams.filter(p => p.enabled && p.key);
    if (!url || enabledParams.length === 0) {
      return null;
    }

    try {
      const urlObj = new URL(url);
      enabledParams.forEach(param => {
        urlObj.searchParams.append(param.key, param.value);
      });
      return urlObj.toString();
    } catch {
      // If URL is invalid, just append params manually
      const paramString = enabledParams
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${paramString}`;
    }
  }, [url, queryParams]);

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
          placeholder="Enter request URL (e.g., https://jsonplaceholder.typicode.com/posts)"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="send-button"
          onClick={onSend}
          disabled={isLoading || !url}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
      {fullUrl && (
        <div className="url-preview">
          <span className="url-preview-label">Full URL:</span>
          <span className="url-preview-value">{fullUrl}</span>
        </div>
      )}
    </div>
  );
}
