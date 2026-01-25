import React, { useState } from 'react';
import { UrlBar } from './components/RequestPanel/UrlBar';
import { RequestTabs } from './components/RequestPanel/RequestTabs';
import { ResponseViewer } from './components/ResponsePanel/ResponseViewer';
import { HttpRequest, HttpResponse, HttpMethod, createEmptyRequest } from '../core/types';

function App() {
  const [request, setRequest] = useState<HttpRequest>(createEmptyRequest());
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUrlChange = (url: string) => {
    setRequest((prev) => ({ ...prev, url }));
  };

  const handleMethodChange = (method: HttpMethod) => {
    setRequest((prev) => ({ ...prev, method }));
  };

  const handleRequestChange = (updatedRequest: HttpRequest) => {
    setRequest(updatedRequest);
  };

  const handleSend = async () => {
    if (!request.url) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const result = await window.electronAPI.sendRequest(request);
      setResponse(result);
    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Error',
        headers: {},
        body: error instanceof Error ? error.message : 'Unknown error',
        contentType: 'text/plain',
        duration: 0,
        size: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>REST Client</h1>
      </header>
      <main className="app-main">
        <div className="request-section">
          <UrlBar
            url={request.url}
            method={request.method}
            onUrlChange={handleUrlChange}
            onMethodChange={handleMethodChange}
            onSend={handleSend}
            isLoading={isLoading}
          />
          <RequestTabs
            request={request}
            onRequestChange={handleRequestChange}
          />
        </div>
        <div className="response-section">
          <ResponseViewer response={response} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}

export default App;
