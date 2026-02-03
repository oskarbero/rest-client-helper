import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { CollectionSettings, AuthConfig, AuthType, KeyValuePair, Environment, GitRemoteConfig } from '@core';
import { KeyValueEditor } from '../common/KeyValueEditor';
import { VariableInput } from '../common/VariableInput';

interface CollectionSettingsEditorProps {
  collectionId: string;
  collectionName: string;
  settings: CollectionSettings | null;
  onUpdate: (collectionId: string, settings: CollectionSettings) => void;
  onSyncToRemote?: (collectionId: string) => void;
  onPullFromRemote?: (collectionId: string) => void;
  activeEnvironment?: Environment | null;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const authTypes: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
];

export function CollectionSettingsEditor({
  collectionId,
  collectionName,
  settings,
  onUpdate,
  onSyncToRemote,
  onPullFromRemote,
  activeEnvironment = null,
  showToast,
}: CollectionSettingsEditorProps) {
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editAuth, setEditAuth] = useState<AuthConfig>({ type: 'none' });
  const [editHeaders, setEditHeaders] = useState<KeyValuePair[]>([]);
  const [originalBaseUrl, setOriginalBaseUrl] = useState<string>('');
  const [originalAuth, setOriginalAuth] = useState<AuthConfig>({ type: 'none' });
  const [originalHeaders, setOriginalHeaders] = useState<KeyValuePair[]>([]);
  const [showBearerToken, setShowBearerToken] = useState(false);
  
  // Git remote state
  const [editGitRemoteUrl, setEditGitRemoteUrl] = useState('');
  const [editGitBranch, setEditGitBranch] = useState('');
  const [originalGitRemoteUrl, setOriginalGitRemoteUrl] = useState('');
  const [originalGitBranch, setOriginalGitBranch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);
  const [hasSyncFileName, setHasSyncFileName] = useState(false);

  // Initialize editor when settings change
  useEffect(() => {
    if (settings) {
      setEditBaseUrl(settings.baseUrl || '');
      setEditAuth(settings.auth || { type: 'none' });
      setEditHeaders(settings.headers || []);
      setOriginalBaseUrl(settings.baseUrl || '');
      setOriginalAuth(JSON.parse(JSON.stringify(settings.auth || { type: 'none' })));
      setOriginalHeaders(JSON.parse(JSON.stringify(settings.headers || [])));
      // Git remote settings
      setEditGitRemoteUrl(settings.gitRemote?.url || '');
      setEditGitBranch(settings.gitRemote?.branch || '');
      setOriginalGitRemoteUrl(settings.gitRemote?.url || '');
      setOriginalGitBranch(settings.gitRemote?.branch || '');
      setLastSyncedAt(settings.lastSyncedAt);
      setHasSyncFileName(!!settings.gitRemote?.syncFileName);
    } else {
      setEditBaseUrl('');
      setEditAuth({ type: 'none' });
      setEditHeaders([]);
      setOriginalBaseUrl('');
      setOriginalAuth({ type: 'none' });
      setOriginalHeaders([]);
      // Git remote settings
      setEditGitRemoteUrl('');
      setEditGitBranch('');
      setOriginalGitRemoteUrl('');
      setOriginalGitBranch('');
      setLastSyncedAt(undefined);
      setHasSyncFileName(false);
    }
  }, [settings]);

  // Note: Removed auto-save - user will save manually with Ctrl+S or Save button

  const handleAuthTypeChange = (type: AuthType) => {
    setEditAuth({
      ...editAuth,
      type,
    });
  };

  const handleBasicChange = (field: 'username' | 'password', value: string) => {
    setEditAuth({
      ...editAuth,
      type: 'basic',
      basic: {
        username: editAuth.basic?.username || '',
        password: editAuth.basic?.password || '',
        [field]: value,
      },
    });
  };

  const handleBearerChange = (token: string) => {
    setEditAuth({
      ...editAuth,
      type: 'bearer',
      bearer: { token },
    });
  };

  const handleSave = useCallback(async () => {
    // Build git remote config if URL is provided
    const gitRemoteUrl = editGitRemoteUrl.trim();
    const gitBranch = editGitBranch.trim();
    const existingSyncFileName = settings?.gitRemote?.syncFileName;
    const gitRemote = gitRemoteUrl ? {
      url: gitRemoteUrl,
      branch: gitBranch || undefined,
      syncFileName: existingSyncFileName,
    } : undefined;

    const settingsToSave: CollectionSettings = {
      baseUrl: editBaseUrl.trim() || undefined,
      auth: editAuth.type !== 'none' ? editAuth : undefined,
      headers: editHeaders.length > 0 ? editHeaders : undefined,
      gitRemote,
      lastSyncedAt, // Preserve lastSyncedAt
    };

    try {
      await onUpdate(collectionId, settingsToSave);
      // Update original values after successful save
      setOriginalBaseUrl(editBaseUrl.trim());
      setOriginalAuth(JSON.parse(JSON.stringify(editAuth)));
      setOriginalHeaders(JSON.parse(JSON.stringify(editHeaders)));
      setOriginalGitRemoteUrl(gitRemoteUrl);
      setOriginalGitBranch(gitBranch);
      showToast?.('Collection settings updated', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update collection settings';
      showToast?.(errorMessage, 'error');
    }
  }, [collectionId, editBaseUrl, editAuth, editHeaders, editGitRemoteUrl, editGitBranch, lastSyncedAt, onUpdate, settings?.gitRemote?.syncFileName, showToast]);

  const handleCancel = useCallback(() => {
    if (settings) {
      setEditBaseUrl(originalBaseUrl);
      setEditAuth(JSON.parse(JSON.stringify(originalAuth)));
      setEditHeaders(JSON.parse(JSON.stringify(originalHeaders)));
      setEditGitRemoteUrl(originalGitRemoteUrl);
      setEditGitBranch(originalGitBranch);
    }
  }, [settings, originalBaseUrl, originalAuth, originalHeaders, originalGitRemoteUrl, originalGitBranch]);

  // Compute hasUnsavedChanges
  const hasUnsavedChanges = useMemo(() => {
    // Compare baseUrl
    if (editBaseUrl.trim() !== originalBaseUrl.trim()) {
      return true;
    }

    // Compare auth
    const authStr = JSON.stringify(editAuth);
    const originalAuthStr = JSON.stringify(originalAuth);
    if (authStr !== originalAuthStr) {
      return true;
    }

    // Compare headers
    if (editHeaders.length !== originalHeaders.length) {
      return true;
    }

    const sortedEdit = [...editHeaders].sort((a, b) => a.key.localeCompare(b.key));
    const sortedOriginal = [...originalHeaders].sort((a, b) => a.key.localeCompare(b.key));

    for (let i = 0; i < sortedEdit.length; i++) {
      if (
        sortedEdit[i].key !== sortedOriginal[i].key ||
        sortedEdit[i].value !== sortedOriginal[i].value ||
        sortedEdit[i].enabled !== sortedOriginal[i].enabled
      ) {
        return true;
      }
    }

    // Compare git remote settings
    if (editGitRemoteUrl.trim() !== originalGitRemoteUrl.trim()) {
      return true;
    }
    if (editGitBranch.trim() !== originalGitBranch.trim()) {
      return true;
    }

    return false;
  }, [editBaseUrl, editAuth, editHeaders, originalBaseUrl, originalAuth, originalHeaders, editGitRemoteUrl, editGitBranch, originalGitRemoteUrl, originalGitBranch]);

  // Handle sync to remote
  const handleSyncToRemote = useCallback(async () => {
    if (!onSyncToRemote || !editGitRemoteUrl.trim()) return;
    
    setIsSyncing(true);
    try {
      await onSyncToRemote(collectionId);
    } finally {
      setIsSyncing(false);
    }
  }, [collectionId, editGitRemoteUrl, onSyncToRemote]);

  // Handle pull from remote
  const handlePullFromRemote = useCallback(async () => {
    if (!onPullFromRemote || !hasSyncFileName) return;
    
    // Confirm before overwriting local changes
    const confirmed = window.confirm(
      'This will overwrite your local collection with the version from the remote repository. Any local changes will be lost. Continue?'
    );
    
    if (!confirmed) return;
    
    setIsPulling(true);
    try {
      await onPullFromRemote(collectionId);
    } finally {
      setIsPulling(false);
    }
  }, [collectionId, hasSyncFileName, onPullFromRemote]);

  // Validate Git URL format
  const isValidGitUrl = useCallback((url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (optional)
    const trimmed = url.trim();
    // HTTPS format: https://...
    // SSH format: git@...
    // File format (for local repos): file://...
    return trimmed.startsWith('https://') || 
           trimmed.startsWith('http://') || 
           trimmed.startsWith('git@') ||
           trimmed.startsWith('file://');
  }, []);

  const gitUrlError = editGitRemoteUrl.trim() && !isValidGitUrl(editGitRemoteUrl) 
    ? 'URL should start with https://, http://, git@, or file://'
    : undefined;

  // Format lastSyncedAt for display
  const formatLastSynced = (isoDate: string | undefined): string => {
    if (!isoDate) return 'Never';
    try {
      const date = new Date(isoDate);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && settings && hasUnsavedChanges) {
        e.preventDefault();
        handleSave();
      }
      // Escape to cancel
      if (e.key === 'Escape' && hasUnsavedChanges) {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings, hasUnsavedChanges, handleSave, handleCancel]);

  const renderAuthForm = () => {
    switch (editAuth.type) {
      case 'basic':
        return (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Username</label>
              <input
                type="text"
                className="auth-input"
                placeholder="Enter username"
                value={editAuth.basic?.username || ''}
                onChange={(e) => handleBasicChange('username', e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                type="password"
                className="auth-input"
                placeholder="Enter password"
                value={editAuth.basic?.password || ''}
                onChange={(e) => handleBasicChange('password', e.target.value)}
              />
            </div>
            <div className="auth-info">
              The username and password will be Base64 encoded and sent in the{' '}
              <code>Authorization</code> header.
            </div>
          </div>
        );

      case 'bearer':
        return (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Token</label>
              <div className="auth-input-with-toggle">
                <input
                  type={showBearerToken ? "text" : "password"}
                  className="auth-input"
                  placeholder="Enter token"
                  value={editAuth.bearer?.token || ''}
                  onChange={(e) => handleBearerChange(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-toggle-btn"
                  onClick={() => setShowBearerToken(!showBearerToken)}
                  title={showBearerToken ? "Hide token" : "Show token"}
                >
                  {showBearerToken ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="auth-info">
              The token will be sent in the <code>Authorization</code> header as{' '}
              <code>Bearer &lt;token&gt;</code>.
            </div>
          </div>
        );

      case 'none':
      default:
        return (
          <div className="auth-none-message">
            This collection does not use any authorization.
          </div>
        );
    }
  };

  return (
    <div className="environment-editor">
      <div className="environment-editor-header">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Collection: {collectionName}
          </span>
          {hasUnsavedChanges && (
            <span className="environment-unsaved-indicator" title="Unsaved changes">
              *
            </span>
          )}
        </div>
        <div className="environment-editor-actions">
          <button
            className={`save-button ${hasUnsavedChanges ? 'has-changes' : ''}`}
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            title={hasUnsavedChanges ? 'Save changes (Ctrl+S)' : 'No changes to save'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save
          </button>
          {hasUnsavedChanges && (
            <button
              className="cancel-button"
              onClick={handleCancel}
              title="Discard changes (Esc)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="environment-variables-editor" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
        {/* Base URL Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: 'var(--text-primary)', 
            marginBottom: '8px' 
          }}>
            Base URL
          </label>
          <p className="tab-description" style={{ marginBottom: '8px' }}>
            Base URL to prepend to request URLs. Only applied if the request URL is relative (doesn't start with <code>http://</code> or <code>https://</code>). You can use variables like <code>{'{{baseUrl}}'}</code>.
          </p>
          <VariableInput
            value={editBaseUrl}
            onChange={setEditBaseUrl}
            placeholder="https://api.example.com or {{baseUrl}}"
            activeEnvironment={activeEnvironment}
            className="env-var-input"
          />
        </div>

        {/* Auth Section */}
        <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: 'var(--text-primary)', 
            marginBottom: '8px' 
          }}>
            Authentication
          </label>
          <p className="tab-description" style={{ marginBottom: '12px' }}>
            Authentication settings that will be applied to all requests in this collection. Request-level auth takes precedence.
          </p>
          <div className="auth-type-selector">
            {authTypes.map((type) => (
              <button
                key={type.value}
                className={`auth-type-button ${editAuth.type === type.value ? 'active' : ''}`}
                onClick={() => handleAuthTypeChange(type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '16px' }}>
            {renderAuthForm()}
          </div>
        </div>

        {/* Headers Section */}
        <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: 'var(--text-primary)', 
            marginBottom: '8px' 
          }}>
            Common Headers
          </label>
          <p className="tab-description" style={{ marginBottom: '12px' }}>
            Headers that will be applied to all requests in this collection. Request-level headers take precedence.
          </p>
          <KeyValueEditor
            pairs={editHeaders}
            onChange={setEditHeaders}
            keyPlaceholder="Header name"
            valuePlaceholder="Header value"
          />
        </div>

        {/* Git Remote Section */}
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: 'var(--text-primary)', 
            marginBottom: '8px' 
          }}>
            Remote Repository (Git)
          </label>
          <p className="tab-description" style={{ marginBottom: '12px' }}>
            Configure a Git remote to sync this collection. Requires Git to be installed on your system.
          </p>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: 'var(--text-secondary)', 
              marginBottom: '4px' 
            }}>
              Remote URL
            </label>
            <input
              type="text"
              className={`env-var-input ${gitUrlError ? 'input-error' : ''}`}
              placeholder="https://github.com/user/repo.git or git@github.com:user/repo.git"
              value={editGitRemoteUrl}
              onChange={(e) => setEditGitRemoteUrl(e.target.value)}
              style={{ width: '100%' }}
            />
            {gitUrlError && (
              <p style={{ 
                fontSize: '11px', 
                color: 'var(--error-color, #ff6b6b)', 
                marginTop: '4px',
                marginBottom: 0 
              }}>
                {gitUrlError}
              </p>
            )}
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: 'var(--text-secondary)', 
              marginBottom: '4px' 
            }}>
              Branch (optional)
            </label>
            <input
              type="text"
              className="env-var-input"
              placeholder="main"
              value={editGitBranch}
              onChange={(e) => setEditGitBranch(e.target.value)}
              style={{ width: '200px' }}
            />
            <p style={{ 
              fontSize: '11px', 
              color: 'var(--text-secondary)', 
              marginTop: '4px',
              marginBottom: 0 
            }}>
              Defaults to <code>main</code> if not specified.
            </p>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginTop: '16px',
            flexWrap: 'wrap'
          }}>
            <button
              className="save-button"
              onClick={handleSyncToRemote}
              disabled={!editGitRemoteUrl.trim() || !!gitUrlError || isSyncing || isPulling || hasUnsavedChanges}
              title={
                hasUnsavedChanges 
                  ? 'Save settings before syncing' 
                  : !editGitRemoteUrl.trim() 
                    ? 'Configure a remote URL first' 
                    : 'Push collection to remote repository'
              }
              style={{ minWidth: '100px' }}
            >
              {isSyncing ? (
                <>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Pushing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 8l4 4-4 4" />
                    <path d="M3 12h18" />
                  </svg>
                  Push
                </>
              )}
            </button>
            
            <button
              className="save-button"
              onClick={handlePullFromRemote}
              disabled={!hasSyncFileName || isPulling || isSyncing || hasUnsavedChanges}
              title={
                !hasSyncFileName
                  ? 'Push to remote first before pulling'
                  : hasUnsavedChanges
                    ? 'Save settings before pulling'
                    : 'Pull collection from remote (overwrites local)'
              }
              style={{ minWidth: '100px' }}
            >
              {isPulling ? (
                <>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Pulling...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 8l-4 4 4 4" />
                    <path d="M21 12H3" />
                  </svg>
                  Pull
                </>
              )}
            </button>
            
            <div style={{ 
              fontSize: '12px', 
              color: 'var(--text-secondary)' 
            }}>
              Last synced: {formatLastSynced(lastSyncedAt)}
            </div>
          </div>
          
          {hasUnsavedChanges && editGitRemoteUrl.trim() && (
            <p style={{ 
              fontSize: '11px', 
              color: 'var(--warning-color, #ffc107)', 
              marginTop: '8px',
              marginBottom: 0 
            }}>
              Save your settings before syncing to remote.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
