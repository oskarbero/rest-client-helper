import React, { useState } from 'react';
import { HttpResponse } from '../../../core/types';
import { ResponseHeaders } from './ResponseHeaders';
import { SyntaxHighlighter } from './SyntaxHighlighter';

interface ResponseViewerProps {
  response: HttpResponse | null;
  isLoading: boolean;
}

type ResponseTab = 'body' | 'headers';

export function ResponseViewer({ response, isLoading }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');

  if (isLoading) {
    return (
      <div className="response-panel">
        <div className="response-header">
          <span className="response-title">Response</span>
        </div>
        <div className="response-body loading">
          <div className="loading-spinner"></div>
          <span>Sending request...</span>
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
  const isRedirect = response.status >= 300 && response.status < 400;
  const isClientError = response.status >= 400 && response.status < 500;
  const isServerError = response.status >= 500;
  const isNetworkError = response.status === 0;

  const getStatusClass = () => {
    if (isSuccess) return 'success';
    if (isRedirect) return 'redirect';
    if (isClientError) return 'client-error';
    if (isServerError) return 'server-error';
    if (isNetworkError) return 'error';
    return 'warning';
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const headerCount = Object.keys(response.headers).length;

  return (
    <div className="response-panel">
      <div className="response-header">
        <span className="response-title">Response</span>
        <div className="response-meta">
          <span className={`status-badge ${getStatusClass()}`}>
            {response.status === 0 ? 'Error' : `${response.status} ${response.statusText}`}
          </span>
          <span className="meta-item meta-time" title="Response time">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            {formatDuration(response.duration)}
          </span>
          <span className="meta-item meta-size" title="Response size">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14,2 H6 A2,2 0 0,0 4,4 V20 A2,2 0 0,0 6,22 H18 A2,2 0 0,0 20,20 V8 Z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            {formatSize(response.size)}
          </span>
        </div>
      </div>
      
      <div className="response-tabs">
        <div className="response-tabs-header">
          <button
            className={`response-tab-button ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            Body
          </button>
          <button
            className={`response-tab-button ${activeTab === 'headers' ? 'active' : ''}`}
            onClick={() => setActiveTab('headers')}
          >
            Headers
            {headerCount > 0 && (
              <span className="response-tab-badge">{headerCount}</span>
            )}
          </button>
        </div>
        
        <div className="response-tabs-content">
          {activeTab === 'body' ? (
            <div className="response-body-content">
              <SyntaxHighlighter 
                content={response.body} 
                contentType={response.contentType} 
              />
            </div>
          ) : (
            <ResponseHeaders headers={response.headers} />
          )}
        </div>
      </div>
    </div>
  );
}
