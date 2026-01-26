import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { UrlBar } from './components/RequestPanel/UrlBar';
import { RequestTabs } from './components/RequestPanel/RequestTabs';
import { ResponseViewer } from './components/ResponsePanel/ResponseViewer';
import { Collections } from './components/Sidebar/Collections';
import { HttpRequest, HttpResponse, HttpMethod, CollectionNode, RecentRequest, Environment, EnvironmentVariable, createEmptyRequest } from '../core/types';
import { resolveRequestVariables } from '../core/variable-replacer';

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
  const [collectionsTree, setCollectionsTree] = useState<CollectionNode[]>([]);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Track unsaved changes
  const [originalRequest, setOriginalRequest] = useState<HttpRequest | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [triggerSaveForm, setTriggerSaveForm] = useState(false);

  // Recent requests history
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  // Environment state
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironment, setActiveEnvironment] = useState<Environment | null>(null);

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

        // Load saved collections tree
        const collections = await window.electronAPI.getCollectionsTree();
        setCollectionsTree(collections);

        // Load environments
        const envs = await window.electronAPI.getEnvironments();
        setEnvironments(envs);

        // Load active environment
        const activeEnv = await window.electronAPI.getActiveEnvironment();
        setActiveEnvironment(activeEnv);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadInitialData();
  }, []);

  // Track unsaved changes by comparing current request with original
  useEffect(() => {
    if (!originalRequest) {
      setHasUnsavedChanges(false);
      return;
    }

    const currentStr = JSON.stringify(request);
    const originalStr = JSON.stringify(originalRequest);
    setHasUnsavedChanges(currentStr !== originalStr);
  }, [request, originalRequest]);

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

  const handleSend = useCallback(async () => {
    if (!request.url) return;

    setIsLoading(true);
    setResponse(null);

    try {
      // Resolve variables before sending
      const resolvedRequest = resolveRequestVariables(request, activeEnvironment);
      
      const result = await window.electronAPI.sendRequest(resolvedRequest);
      setResponse(result);
      
      // Add to recent requests history (store original request, not resolved)
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
  }, [request]);

  // Collection handlers
  const handleSaveToCollection = useCallback(async (name: string, parentId?: string) => {
    try {
      const saved = await window.electronAPI.saveRequestToCollection(
        name,
        request,
        parentId,
        undefined // Always create new request, never update existing
      );
      setCurrentRequestId(saved.id);
      // Update original request to match saved version
      const requestCopy = JSON.parse(JSON.stringify(request));
      setOriginalRequest(requestCopy);
      setHasUnsavedChanges(false);
      // Refresh the tree
      const collections = await window.electronAPI.getCollectionsTree();
      setCollectionsTree(collections);
      showToast(`Request "${name}" saved`, 'success');
    } catch (error) {
      console.error('Failed to save request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save request';
      showToast(errorMessage, 'error');
    }
  }, [request, showToast]);

  const handleSelectFromCollection = useCallback((node: CollectionNode) => {
    if (node.type === 'request' && node.request) {
      const requestCopy = JSON.parse(JSON.stringify(node.request));
      setRequest(requestCopy);
      setOriginalRequest(requestCopy);
      setCurrentRequestId(node.id);
      setHasUnsavedChanges(false);
      setResponse(null);
    }
  }, []);

  const handleDeleteFromCollection = useCallback(async (id: string) => {
    try {
      await window.electronAPI.deleteCollectionNode(id);
      // Clear current ID if we deleted the active request
      if (currentRequestId === id) {
        setCurrentRequestId(null);
      }
      // Refresh the tree
      const collections = await window.electronAPI.getCollectionsTree();
      setCollectionsTree(collections);
      showToast('Deleted', 'info');
    } catch (error) {
      console.error('Failed to delete:', error);
      showToast('Failed to delete', 'error');
    }
  }, [currentRequestId, showToast]);

  const handleRenameInCollection = useCallback(async (id: string, newName: string) => {
    try {
      await window.electronAPI.renameCollectionNode(id, newName);
      // Refresh the tree
      const collections = await window.electronAPI.getCollectionsTree();
      setCollectionsTree(collections);
      showToast('Renamed', 'success');
    } catch (error) {
      console.error('Failed to rename:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to rename';
      showToast(errorMessage, 'error');
    }
  }, [showToast]);

  const handleCreateCollection = useCallback(async (name: string, parentId?: string) => {
    try {
      await window.electronAPI.createCollection(name, parentId);
      // Refresh the tree
      const collections = await window.electronAPI.getCollectionsTree();
      setCollectionsTree(collections);
      // Auto-expand the parent if provided
      if (parentId) {
        setExpandedNodes(prev => new Set(prev).add(parentId));
      }
      showToast(`Collection "${name}" created`, 'success');
    } catch (error) {
      console.error('Failed to create collection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create collection';
      showToast(errorMessage, 'error');
    }
  }, [showToast]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleMoveNode = useCallback(async (id: string, newParentId?: string) => {
    try {
      await window.electronAPI.moveCollectionNode(id, newParentId);
      // Refresh the tree
      const collections = await window.electronAPI.getCollectionsTree();
      setCollectionsTree(collections);
      showToast('Moved', 'success');
    } catch (error) {
      console.error('Failed to move:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to move';
      showToast(errorMessage, 'error');
    }
  }, [showToast]);

  const handleNewRequest = useCallback(() => {
    setRequest(createEmptyRequest());
    setOriginalRequest(null);
    setCurrentRequestId(null);
    setHasUnsavedChanges(false);
    setResponse(null);
  }, []);

  const findNodeById = useCallback((nodes: CollectionNode[], id: string): CollectionNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Quick save handler - saves existing request or triggers save form for new requests
  const handleQuickSave = useCallback(async () => {
    if (currentRequestId) {
      // Save existing request with its current name
      if (!hasUnsavedChanges) {
        // No changes to save
        return;
      }
      const node = findNodeById(collectionsTree, currentRequestId);
      if (node && node.type === 'request') {
        try {
          const saved = await window.electronAPI.saveRequestToCollection(
            node.name,
            request,
            undefined, // Keep in same parent
            currentRequestId
          );
          // Update original request to match saved version
          const requestCopy = JSON.parse(JSON.stringify(request));
          setOriginalRequest(requestCopy);
          setHasUnsavedChanges(false);
          // Refresh the tree
          const collections = await window.electronAPI.getCollectionsTree();
          setCollectionsTree(collections);
          showToast(`Request "${node.name}" saved`, 'success');
        } catch (error) {
          console.error('Failed to save request:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to save request';
          showToast(errorMessage, 'error');
        }
      }
    } else {
      // New request - trigger save form
      setTriggerSaveForm(true);
    }
  }, [hasUnsavedChanges, currentRequestId, request, collectionsTree, findNodeById, showToast]);

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
      // Ctrl+S or Cmd+S to save request
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleQuickSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, request.url, handleQuickSave, handleNewRequest, handleSend]);

  const selectedRequestName = currentRequestId
    ? findNodeById(collectionsTree, currentRequestId)?.name ?? null
    : null;

  const handleSelectFromRecent = useCallback((recentRequest: RecentRequest) => {
    setRequest(recentRequest.request);
    setOriginalRequest(null);
    setCurrentRequestId(null);
    setHasUnsavedChanges(false);
    setResponse(recentRequest.response || null);
  }, []);

  const handleClearRecent = useCallback(() => {
    setRecentRequests([]);
  }, []);

  // Environment handlers
  const handleCreateEnvironment = useCallback(async (name: string) => {
    try {
      const newEnv = await window.electronAPI.createEnvironment(name);
      const updatedEnvs = await window.electronAPI.getEnvironments();
      setEnvironments(updatedEnvs);
      showToast(`Environment "${name}" created`, 'success');
    } catch (error) {
      console.error('Failed to create environment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create environment';
      showToast(errorMessage, 'error');
      throw error;
    }
  }, [showToast]);

  const handleUpdateEnvironment = useCallback(async (id: string, name: string, variables: EnvironmentVariable[]) => {
    try {
      await window.electronAPI.updateEnvironment(id, name, variables);
      const updatedEnvs = await window.electronAPI.getEnvironments();
      setEnvironments(updatedEnvs);
      
      // Update active environment if it was the one being edited
      if (activeEnvironment?.id === id) {
        const updatedActive = await window.electronAPI.getActiveEnvironment();
        setActiveEnvironment(updatedActive);
      }
    } catch (error) {
      console.error('Failed to update environment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update environment';
      showToast(errorMessage, 'error');
      throw error;
    }
  }, [activeEnvironment, showToast]);

  const handleDeleteEnvironment = useCallback(async (id: string) => {
    try {
      await window.electronAPI.deleteEnvironment(id);
      const updatedEnvs = await window.electronAPI.getEnvironments();
      setEnvironments(updatedEnvs);
      
      // Clear active environment if it was deleted
      if (activeEnvironment?.id === id) {
        setActiveEnvironment(null);
      }
    } catch (error) {
      console.error('Failed to delete environment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete environment';
      showToast(errorMessage, 'error');
      throw error;
    }
  }, [activeEnvironment, showToast]);

  const handleSetActiveEnvironment = useCallback(async (id: string | null) => {
    try {
      await window.electronAPI.setActiveEnvironment(id);
      const activeEnv = await window.electronAPI.getActiveEnvironment();
      setActiveEnvironment(activeEnv);
      showToast(id ? 'Environment activated' : 'Environment deactivated', 'info');
    } catch (error) {
      console.error('Failed to set active environment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set active environment';
      showToast(errorMessage, 'error');
    }
  }, [showToast]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>REST Client</h1>
        {selectedRequestName && (
          <div className="app-header-request-name" title={selectedRequestName}>
            {selectedRequestName}
          </div>
        )}
        <div className="app-header-actions">
          <button
            className="save-button"
            onClick={handleQuickSave}
            disabled={currentRequestId ? !hasUnsavedChanges : false}
            title={currentRequestId ? (hasUnsavedChanges ? 'Save changes (Ctrl+S)' : 'No changes to save') : 'Save as new request (Ctrl+S)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {currentRequestId ? 'Save' : 'Save As...'}
          </button>
        </div>
        <div className="app-header-hint">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to send
        </div>
      </header>
      <div className="app-body">
        <PanelGroup direction="horizontal" autoSaveId="main-layout">
          <Panel defaultSize={20} minSize={15} maxSize={40} className="sidebar-panel">
            <aside className="app-sidebar">
              <Collections
                collectionsTree={collectionsTree}
                recentRequests={recentRequests}
                currentRequestId={currentRequestId}
                expandedNodes={expandedNodes}
                onSelect={handleSelectFromCollection}
                onSelectRecent={handleSelectFromRecent}
                onSave={handleSaveToCollection}
                onDelete={handleDeleteFromCollection}
                onRename={handleRenameInCollection}
                onNew={handleNewRequest}
                onClearRecent={handleClearRecent}
                onCreateCollection={handleCreateCollection}
                onToggleExpand={handleToggleExpand}
                onMoveNode={handleMoveNode}
                triggerSaveForm={triggerSaveForm}
                onSaveFormTriggered={() => setTriggerSaveForm(false)}
                hasUnsavedChanges={hasUnsavedChanges}
                environments={environments}
                activeEnvironmentId={activeEnvironment?.id || null}
                onCreateEnvironment={handleCreateEnvironment}
                onUpdateEnvironment={handleUpdateEnvironment}
                onDeleteEnvironment={handleDeleteEnvironment}
                onSetActiveEnvironment={handleSetActiveEnvironment}
                showToast={showToast}
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
