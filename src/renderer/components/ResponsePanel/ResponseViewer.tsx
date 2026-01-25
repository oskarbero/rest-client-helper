import React from 'react';
import { HttpResponse } from '../../../core/types';

interface ResponseViewerProps {
  response: HttpResponse | null;
  isLoading: boolean;
}

export function ResponseViewer({ response, isLoading }: ResponseViewerProps) {
  if (isLoading) {
    return (
      <div className="response-panel">
        <div className="response-header">
          <span className="response-title">Response</span>
        </div>
        <div className="response-body loading">
          Sending request...
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-panel">
        <div className="response-header">
          <span className="response-title">Response</span>
        </div>
        <div className="response-body empty">
          Send a request to see the response
        </div>
      </div>
    );
  }

  const isSuccess = response.status >= 200 && response.status < 300;
  const isError = response.status >= 400 || response.status === 0;
  const statusClass = isSuccess ? 'success' : isError ? 'error' : 'warning';

  // Try to format JSON responses
  let formattedBody = response.body;
  if (response.contentType.includes('application/json')) {
    try {
      formattedBody = JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      // Keep original if parsing fails
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="response-panel">
      <div className="response-header">
        <span className="response-title">Response</span>
        <div className="response-meta">
          <span className={`status-badge ${statusClass}`}>
            {response.status === 0 ? 'Error' : `${response.status} ${response.statusText}`}
          </span>
          <span className="meta-item">{response.duration}ms</span>
          <span className="meta-item">{formatSize(response.size)}</span>
        </div>
      </div>
      <div className="response-body">
        <pre>{formattedBody}</pre>
      </div>
    </div>
  );
}
