import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { UrlBar } from './components/RequestPanel/UrlBar';
import { RequestTabs } from './components/RequestPanel/RequestTabs';
import { ResponseViewer } from './components/ResponsePanel/ResponseViewer';
import { Collections } from './components/Sidebar/Collections';
import { HttpRequest, HttpResponse, HttpMethod, SavedRequest, RecentRequest, createEmptyRequest } from '../core/types';

// Toast notification type
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [request, setRequest] = useState<HttpRequest>(createEmptyRequest());
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Collections state
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  // Recent requests history
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Load state and collections on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Check if electronAPI is available
        if (!window.electronAPI) {
          console.error('electronAPI is not available. Make sure preload script is loaded.');
          setIsInitialized(true);
          return;
        }

        // Load session state
        const savedRequest = await window.electronAPI.loadState();
        setRequest(savedRequest);

        // Load saved collections
        const collections = await window.electronAPI.listCollection();
        setSavedRequests(collections);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadInitialData();
  }, []);

  // Save state when request changes (debounced)
  useEffect(() => {
    if (!isInitialized) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save to avoid excessive writes
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await window.electronAPI.saveState(request);
      } catch (error) {
        console.error('Failed to save state:', error);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [request, isInitialized]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to send request
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading && request.url) {
          handleSend();
        }
      }
      // Ctrl+N or Cmd+N for new request
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, request.url]);

  const handleUrlChange = (url: string) => {
    setRequest((prev) => ({ ...prev, url }));
  };

  const handleQueryParamsChange = (queryParams: typeof request.queryParams) => {
    setRequest((prev) => ({ ...prev, queryParams }));
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
      
      // Add to recent requests history
      const recentEntry: RecentRequest = {
        id: `recent-${Date.now()}`,
        request: { ...request },
        response: result,
        timestamp: new Date().toISOString(),
      };
      setRecentRequests(prev => {
        // Keep only last 20 requests, most recent first
        const updated = [recentEntry, ...prev].slice(0, 20);
        return updated;
      });
    } catch (error) {
      const errorResponse = {
        status: 0,
        statusText: 'Error',
        headers: {},
        body: error instanceof Error ? error.message : 'Unknown error',
        contentType: 'text/plain',
        duration: 0,
        size: 0,
      };
      setResponse(errorResponse);
      
      // Also add error requests to history
      const recentEntry: RecentRequest = {
        id: `recent-${Date.now()}`,
        request: { ...request },
        response: errorResponse,
        timestamp: new Date().toISOString(),
      };
      setRecentRequests(prev => [recentEntry, ...prev].slice(0, 20));
    } finally {
      setIsLoading(false);
    }
  };

  // Collection handlers
  const handleSaveToCollection = useCallback(async (name: string) => {
    try {
      const saved = await window.electronAPI.saveToCollection(name, request, currentRequestId || undefined);
      setCurrentRequestId(saved.id);
      // Refresh the list
      const collections = await window.electronAPI.listCollection();
      setSavedRequests(collections);
      showToast(`Request "${name}" saved`, 'success');
    } catch (error) {
      console.error('Failed to save request:', error);
      showToast('Failed to save request', 'error');
    }
  }, [request, currentRequestId, showToast]);

  const handleSelectFromCollection = useCallback((savedRequest: SavedRequest) => {
    setRequest(savedRequest.request);
    setCurrentRequestId(savedRequest.id);
    setResponse(null);
  }, []);

  const handleDeleteFromCollection = useCallback(async (id: string) => {
    // Find the request name for the toast
    const requestToDelete = savedRequests.find(r => r.id === id);
    
    // Confirmation dialog
    if (!window.confirm(`Delete "${requestToDelete?.name || 'this request'}"? This cannot be undone.`)) {
      return;
    }

    try {
      await window.electronAPI.deleteFromCollection(id);
      // Clear current ID if we deleted the active request
      if (currentRequestId === id) {
        setCurrentRequestId(null);
      }
      // Refresh the list
      const collections = await window.electronAPI.listCollection();
      setSavedRequests(collections);
      showToast('Request deleted', 'info');
    } catch (error) {
      console.error('Failed to delete request:', error);
      showToast('Failed to delete request', 'error');
    }
  }, [currentRequestId, savedRequests, showToast]);

  const handleRenameInCollection = useCallback(async (id: string, newName: string) => {
    try {
      await window.electronAPI.renameInCollection(id, newName);
      // Refresh the list
      const collections = await window.electronAPI.listCollection();
      setSavedRequests(collections);
      showToast('Request renamed', 'success');
    } catch (error) {
      console.error('Failed to rename request:', error);
      showToast('Failed to rename request', 'error');
    }
  }, [showToast]);

  const handleNewRequest = useCallback(() => {
    setRequest(createEmptyRequest());
    setCurrentRequestId(null);
    setResponse(null);
  }, []);

  const handleSelectFromRecent = useCallback((recentRequest: RecentRequest) => {
    setRequest(recentRequest.request);
    setCurrentRequestId(null);
    setResponse(recentRequest.response || null);
  }, []);

  const handleClearRecent = useCallback(() => {
    setRecentRequests([]);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>REST Client</h1>
        <div className="app-header-hint">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to send
        </div>
      </header>
      <div className="app-body">
        <PanelGroup direction="horizontal" autoSaveId="main-layout">
          <Panel defaultSize={20} minSize={15} maxSize={40} className="sidebar-panel">
            <aside className="app-sidebar">
              <Collections
                requests={savedRequests}
                recentRequests={recentRequests}
                currentRequestId={currentRequestId}
                onSelect={handleSelectFromCollection}
                onSelectRecent={handleSelectFromRecent}
                onSave={handleSaveToCollection}
                onDelete={handleDeleteFromCollection}
                onRename={handleRenameInCollection}
                onNew={handleNewRequest}
                onClearRecent={handleClearRecent}
              />
            </aside>
          </Panel>
          <PanelResizeHandle className="resize-handle-horizontal" />
          <Panel minSize={50}>
            <PanelGroup direction="vertical" autoSaveId="main-vertical">
              <Panel defaultSize={50} minSize={20} className="request-panel">
                <main className="app-main">
                  <div className="request-section">
                    <UrlBar
                      url={request.url}
                      method={request.method}
                      queryParams={request.queryParams}
                      onUrlChange={handleUrlChange}
                      onMethodChange={handleMethodChange}
                      onQueryParamsChange={handleQueryParamsChange}
                      onSend={handleSend}
                      isLoading={isLoading}
                    />
                    <RequestTabs
                      request={request}
                      onRequestChange={handleRequestChange}
                    />
                  </div>
                </main>
              </Panel>
              <PanelResizeHandle className="resize-handle-vertical" />
              <Panel minSize={20} className="response-panel-wrapper">
                <div className="response-section">
                  <ResponseViewer response={response} isLoading={isLoading} />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
