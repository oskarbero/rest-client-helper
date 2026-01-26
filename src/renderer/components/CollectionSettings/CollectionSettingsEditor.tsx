import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { CollectionSettings, AuthConfig, AuthType, KeyValuePair, Environment } from '../../../core/types';
import { KeyValueEditor } from '../common/KeyValueEditor';
import { VariableInput } from '../common/VariableInput';

interface CollectionSettingsEditorProps {
  collectionId: string;
  collectionName: string;
  settings: CollectionSettings | null;
  onUpdate: (collectionId: string, settings: CollectionSettings) => void;
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
  activeEnvironment = null,
  showToast,
}: CollectionSettingsEditorProps) {
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editAuth, setEditAuth] = useState<AuthConfig>({ type: 'none' });
  const [editHeaders, setEditHeaders] = useState<KeyValuePair[]>([]);
  const [originalBaseUrl, setOriginalBaseUrl] = useState<string>('');
  const [originalAuth, setOriginalAuth] = useState<AuthConfig>({ type: 'none' });
  const [originalHeaders, setOriginalHeaders] = useState<KeyValuePair[]>([]);

  // Initialize editor when settings change
  useEffect(() => {
    if (settings) {
      setEditBaseUrl(settings.baseUrl || '');
      setEditAuth(settings.auth || { type: 'none' });
      setEditHeaders(settings.headers || []);
      setOriginalBaseUrl(settings.baseUrl || '');
      setOriginalAuth(JSON.parse(JSON.stringify(settings.auth || { type: 'none' })));
      setOriginalHeaders(JSON.parse(JSON.stringify(settings.headers || [])));
    } else {
      setEditBaseUrl('');
      setEditAuth({ type: 'none' });
      setEditHeaders([]);
      setOriginalBaseUrl('');
      setOriginalAuth({ type: 'none' });
      setOriginalHeaders([]);
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
    const settingsToSave: CollectionSettings = {
      baseUrl: editBaseUrl.trim() || undefined,
      auth: editAuth.type !== 'none' ? editAuth : undefined,
      headers: editHeaders.length > 0 ? editHeaders : undefined,
    };

    try {
      await onUpdate(collectionId, settingsToSave);
      // Update original values after successful save
      setOriginalBaseUrl(editBaseUrl.trim());
      setOriginalAuth(JSON.parse(JSON.stringify(editAuth)));
      setOriginalHeaders(JSON.parse(JSON.stringify(editHeaders)));
      showToast?.('Collection settings updated', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update collection settings';
      showToast?.(errorMessage, 'error');
    }
  }, [collectionId, editBaseUrl, editAuth, editHeaders, onUpdate, showToast]);

  const handleCancel = useCallback(() => {
    if (settings) {
      setEditBaseUrl(originalBaseUrl);
      setEditAuth(JSON.parse(JSON.stringify(originalAuth)));
      setEditHeaders(JSON.parse(JSON.stringify(originalHeaders)));
    }
  }, [settings, originalBaseUrl, originalAuth, originalHeaders]);

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

    return false;
  }, [editBaseUrl, editAuth, editHeaders, originalBaseUrl, originalAuth, originalHeaders]);

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
              <VariableInput
                value={editAuth.basic?.username || ''}
                onChange={(value) => handleBasicChange('username', value)}
                placeholder="Enter username or {{username}}"
                activeEnvironment={activeEnvironment}
                className="auth-input"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <VariableInput
                value={editAuth.basic?.password || ''}
                onChange={(value) => handleBasicChange('password', value)}
                placeholder="Enter password or {{password}}"
                activeEnvironment={activeEnvironment}
                className="auth-input"
              />
            </div>
            <div className="auth-info">
              The username and password will be Base64 encoded and sent in the{' '}
              <code>Authorization</code> header. You can use variables like <code>{'{{username}}'}</code> or <code>{'{{password}}'}</code>.
            </div>
          </div>
        );

      case 'bearer':
        return (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Token</label>
              <VariableInput
                value={editAuth.bearer?.token || ''}
                onChange={(value) => handleBearerChange(value)}
                placeholder="Enter token or {{token}}"
                activeEnvironment={activeEnvironment}
                className="auth-input"
              />
            </div>
            <div className="auth-info">
              The token will be sent in the <code>Authorization</code> header as{' '}
              <code>Bearer &lt;token&gt;</code>. You can use variables like <code>{'{{token}}'}</code> or <code>{'{{apiKey}}'}</code>.
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
        <div>
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
            activeEnvironment={activeEnvironment}
          />
        </div>
      </div>
    </div>
  );
}
