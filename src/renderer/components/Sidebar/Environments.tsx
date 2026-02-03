import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Environment, EnvironmentVariable } from '@core';

interface EnvironmentsProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  selectedEnvironmentId: string | null;
  onCreate: (name: string) => void;
  onUpdate: (id: string, name: string, variables: EnvironmentVariable[]) => void;
  onDelete: (id: string) => void;
  onDuplicate: (sourceId: string, newName: string) => void;
  onSetActive: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface EnvironmentItemProps {
  environment: Environment;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSetActive: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function EnvironmentItem({
  environment,
  isActive,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onSetActive,
  onContextMenu,
}: EnvironmentItemProps) {
  return (
    <div
      className={`environment-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <div className="environment-item-header">
        {isActive && (
          <span className="environment-active-badge" title="Active environment">
            ●
          </span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ marginRight: '6px' }}
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="environment-name" title={environment.name}>
          {environment.name}
        </span>
        <span className="environment-variable-count">
          {environment.variables.length} {environment.variables.length === 1 ? 'variable' : 'variables'}
        </span>
      </div>
      <div className="environment-item-footer">
        <div className="environment-item-actions">
          {!isActive && (
            <button
              className="item-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSetActive();
              }}
              title="Set as Active"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
          )}
          <button
            className="item-action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete environment "${environment.name}"? This cannot be undone.`)) {
                onDelete();
              }
            }}
            title="Delete"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Environments({
  environments,
  activeEnvironmentId,
  selectedEnvironmentId,
  onCreate,
  onUpdate,
  onDelete,
  onDuplicate,
  onSetActive,
  onSelect,
  showToast,
}: EnvironmentsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    environmentId: string;
  } | null>(null);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) {
      showToast?.('Environment name cannot be empty', 'error');
      return;
    }

    try {
      onCreate(newName.trim());
      setIsCreating(false);
      setNewName('');
      showToast?.('Environment created', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create environment';
      showToast?.(errorMessage, 'error');
    }
  }, [newName, onCreate, showToast]);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewName('');
  }, []);

  const handleDelete = useCallback((id: string) => {
    try {
      onDelete(id);
      if (selectedEnvironmentId === id) {
        onSelect(null);
      }
      showToast?.('Environment deleted', 'info');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete environment';
      showToast?.(errorMessage, 'error');
    }
  }, [selectedEnvironmentId, onDelete, onSelect, showToast]);

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewName('');
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, environmentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      environmentId,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDuplicate = useCallback(async (environmentId: string) => {
    const environment = environments.find(env => env.id === environmentId);
    if (!environment) return;

    const newName = window.prompt(`Enter a name for the copy of "${environment.name}":`, `${environment.name} Copy`);
    if (!newName || !newName.trim()) {
      return;
    }

    try {
      await onDuplicate(environmentId, newName.trim());
      handleCloseContextMenu();
    } catch (error) {
      // Error is already handled by parent component
    }
  }, [environments, onDuplicate, handleCloseContextMenu]);

  useEffect(() => {
    if (!contextMenu?.visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      setContextMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);


  return (
    <div className="environments-list">
      {environments.length === 0 && !isCreating ? (
        <div className="collections-empty">
          <p>No environments</p>
          <p className="collections-empty-hint">
            Create an environment to store variables
          </p>
        </div>
      ) : (
        <>
          {isCreating && (
            <div className="save-request-form">
              <input
                type="text"
                className="save-request-input"
                placeholder="Environment name (e.g., DEV, TST, PRD)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleCreate)}
                autoFocus
              />
              <div className="save-request-buttons">
                <button className="save-btn" onClick={handleCreate}>
                  Create
                </button>
                <button className="cancel-btn" onClick={handleCancelCreate}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {environments.map((environment) => (
            <EnvironmentItem
              key={environment.id}
              environment={environment}
              isActive={activeEnvironmentId === environment.id}
              isSelected={selectedEnvironmentId === environment.id}
              onSelect={() => onSelect(environment.id)}
              onDelete={() => handleDelete(environment.id)}
              onDuplicate={() => handleDuplicate(environment.id)}
              onSetActive={() => onSetActive(environment.id)}
              onContextMenu={(e) => handleContextMenu(e, environment.id)}
            />
          ))}
        </>
      )}
      {!isCreating && (
        <div className="environments-actions-footer">
          <button
            className="collections-action-btn"
            onClick={() => setIsCreating(true)}
            title="Create Environment"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </button>
        </div>
      )}
      {contextMenu && contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicate(contextMenu.environmentId);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Copy Environment</span>
          </div>
        </div>
      )}
    </div>
  );
}
