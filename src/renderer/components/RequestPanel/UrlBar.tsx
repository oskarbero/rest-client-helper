import React from 'react';
import { HttpMethod } from '../../../core/types';

interface UrlBarProps {
  url: string;
  method: HttpMethod;
  onUrlChange: (url: string) => void;
  onMethodChange: (method: HttpMethod) => void;
  onSend: () => void;
  isLoading: boolean;
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function UrlBar({ url, method, onUrlChange, onMethodChange, onSend, isLoading }: UrlBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      onSend();
    }
  };

  return (
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
        placeholder="Enter request URL (e.g., https://jsonplaceholder.typicode.com/posts/1)"
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
  );
}
