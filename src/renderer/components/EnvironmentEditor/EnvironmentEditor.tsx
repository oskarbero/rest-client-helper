import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Environment, EnvironmentVariable } from '@core';

interface EnvironmentEditorProps {
  environment: Environment | null;
  onUpdate: (id: string, name: string, variables: EnvironmentVariable[]) => void;
  onCancel?: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onEnvironmentChange?: () => void; // Callback to refresh environment list
}

export function EnvironmentEditor({
  environment,
  onUpdate,
  onCancel,
  showToast,
  onEnvironmentChange,
}: EnvironmentEditorProps) {
  const [editName, setEditName] = useState('');
  const [editVariables, setEditVariables] = useState<EnvironmentVariable[]>([]);
  const [originalName, setOriginalName] = useState<string>('');
  const [originalVariables, setOriginalVariables] = useState<EnvironmentVariable[]>([]);

  // Initialize editor when environment changes
  useEffect(() => {
    if (environment) {
      setEditName(environment.name);
      // Always use stored variables (user-defined), never show file variables in editor
      setEditVariables([...environment.variables]);
      setOriginalName(environment.name);
      setOriginalVariables(JSON.parse(JSON.stringify(environment.variables))); // Deep copy
    } else {
      setEditName('');
      setEditVariables([]);
      setOriginalName('');
      setOriginalVariables([]);
    }
  }, [environment]);

  const handleVariableChange = (index: number, field: 'key' | 'value', value: string) => {
    const newVariables = [...editVariables];
    newVariables[index] = { ...newVariables[index], [field]: value };
    setEditVariables(newVariables);
  };

  const handleAddVariable = () => {
    setEditVariables([...editVariables, { key: '', value: '' }]);
  };

  const handleRemoveVariable = (index: number) => {
    const newVariables = editVariables.filter((_, i) => i !== index);
    setEditVariables(newVariables);
  };

  const handleLinkEnvFile = useCallback(async () => {
    if (!environment || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.linkEnvironmentToEnvFile(environment.id);
      if (result) {
        showToast?.('Environment linked to .env file', 'success');
        onEnvironmentChange?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to link .env file';
      showToast?.(errorMessage, 'error');
    }
  }, [environment, showToast, onEnvironmentChange]);

  const handleUnlinkEnvFile = useCallback(async () => {
    if (!environment || !window.electronAPI) return;

    try {
      await window.electronAPI.unlinkEnvironmentFromEnvFile(environment.id);
      showToast?.('Environment unlinked from .env file', 'success');
      onEnvironmentChange?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlink .env file';
      showToast?.(errorMessage, 'error');
    }
  }, [environment, showToast, onEnvironmentChange]);

  const handleSave = useCallback(() => {
    if (!environment) return;
    
    if (!editName.trim()) {
      showToast?.('Environment name cannot be empty', 'error');
      return;
    }

    try {
      onUpdate(environment.id, editName.trim(), editVariables);
      // Update original values after successful save
      setOriginalName(editName.trim());
      setOriginalVariables(JSON.parse(JSON.stringify(editVariables)));
      showToast?.('Environment updated', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update environment';
      showToast?.(errorMessage, 'error');
    }
  }, [environment, editName, editVariables, onUpdate, showToast]);

  const handleCancel = useCallback(() => {
    if (environment) {
      setEditName(originalName);
      setEditVariables(JSON.parse(JSON.stringify(originalVariables)));
    }
    onCancel?.();
  }, [environment, originalName, originalVariables, onCancel]);

  // Compute hasUnsavedChanges by comparing current edit state with original
  const hasUnsavedChanges = useMemo(() => {
    if (!environment) return false;
    
    // Compare name
    if (editName.trim() !== originalName.trim()) {
      return true;
    }
    
    // Compare variables (deep comparison)
    if (editVariables.length !== originalVariables.length) {
      return true;
    }
    
    const sortedEdit = [...editVariables].sort((a, b) => a.key.localeCompare(b.key));
    const sortedOriginal = [...originalVariables].sort((a, b) => a.key.localeCompare(b.key));
    
    for (let i = 0; i < sortedEdit.length; i++) {
      if (sortedEdit[i].key !== sortedOriginal[i].key || 
          sortedEdit[i].value !== sortedOriginal[i].value) {
        return true;
      }
    }
    
    return false;
  }, [environment, editName, editVariables, originalName, originalVariables]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && environment && hasUnsavedChanges) {
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
  }, [environment, hasUnsavedChanges, handleSave, handleCancel]);

  if (!environment) {
    return (
      <div className="environment-editor-empty">
        <p>No environment selected</p>
        <p className="environment-editor-empty-hint">
          Select an environment from the sidebar to edit
        </p>
      </div>
    );
  }

  return (
    <div className="environment-editor">
      <div className="environment-editor-header">
        <input
          type="text"
          className="environment-name-input"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Environment name"
        />
        {hasUnsavedChanges && (
          <span className="environment-unsaved-indicator" title="Unsaved changes">
            *
          </span>
        )}
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
      <div className="environment-variables-editor">
        <div className="env-file-link-section">
          {environment.envFilePath ? (
            <div className="env-file-linked">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span className="env-file-path" title={environment.envFilePath}>
                Linked to: {environment.envFilePath.split(/[/\\]/).pop()}
              </span>
              <button
                className="env-file-unlink"
                onClick={handleUnlinkEnvFile}
                title="Unlink from .env file"
              >
                Unlink
              </button>
            </div>
          ) : (
            <button
              className="env-file-link"
              onClick={handleLinkEnvFile}
              title="Link to .env file"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Link to .env file
            </button>
          )}
        </div>
        {environment.envFilePath && (
          <div className="env-file-info">
            <p>Variables from the linked .env file are automatically loaded and used. You can add additional variables below that will override file variables with the same name.</p>
          </div>
        )}
        <div className="env-vars-header">
          <span className="env-var-col-key">Variable Name</span>
          <span className="env-var-col-value">Value</span>
          <span className="env-var-col-actions"></span>
        </div>
        <div className="env-vars-rows">
          {editVariables.map((variable, index) => (
            <div key={index} className="env-var-row">
              <input
                type="text"
                className="env-var-input env-var-key"
                placeholder="Variable name"
                value={variable.key}
                onChange={(e) => handleVariableChange(index, 'key', e.target.value)}
              />
              <input
                type="text"
                className="env-var-input env-var-value"
                placeholder="Value"
                value={variable.value}
                onChange={(e) => handleVariableChange(index, 'value', e.target.value)}
              />
              <button
                className="env-var-remove"
                onClick={() => handleRemoveVariable(index)}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="env-var-add" onClick={handleAddVariable}>
          + Add Variable
        </button>
      </div>
    </div>
  );
}
