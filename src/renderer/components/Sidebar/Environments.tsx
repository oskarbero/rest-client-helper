import React, { useState, useCallback, useEffect } from 'react';
import { Environment, EnvironmentVariable } from '../../../core/types';

interface EnvironmentsProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  onCreate: (name: string) => void;
  onUpdate: (id: string, name: string, variables: EnvironmentVariable[]) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string | null) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface EnvironmentItemProps {
  environment: Environment;
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  editVariables: EnvironmentVariable[];
  onSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onSetActive: () => void;
  onNameChange: (name: string) => void;
  onVariablesChange: (variables: EnvironmentVariable[]) => void;
}

function EnvironmentItem({
  environment,
  isActive,
  isEditing,
  editName,
  editVariables,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onSetActive,
  onNameChange,
  onVariablesChange,
}: EnvironmentItemProps) {
  const handleVariableChange = (index: number, field: 'key' | 'value', value: string) => {
    const newVariables = [...editVariables];
    newVariables[index] = { ...newVariables[index], [field]: value };
    onVariablesChange(newVariables);
  };

  const handleAddVariable = () => {
    onVariablesChange([...editVariables, { key: '', value: '' }]);
  };

  const handleRemoveVariable = (index: number) => {
    const newVariables = editVariables.filter((_, i) => i !== index);
    onVariablesChange(newVariables);
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <div className="environment-item editing">
        <div className="environment-item-header">
          <input
            type="text"
            className="environment-name-input"
            value={editName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, onSaveEdit)}
            placeholder="Environment name"
            autoFocus
          />
          <div className="environment-item-actions">
            <button
              className="item-action-btn"
              onClick={onSaveEdit}
              title="Save"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>
            <button
              className="item-action-btn"
              onClick={onCancelEdit}
              title="Cancel"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="environment-variables-editor">
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

  return (
    <div
      className={`environment-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
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
            className="item-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            title="Edit"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
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
  onCreate,
  onUpdate,
  onDelete,
  onSetActive,
  showToast,
}: EnvironmentsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editVariables, setEditVariables] = useState<EnvironmentVariable[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleStartEdit = useCallback((environment: Environment) => {
    setEditingId(environment.id);
    setEditName(environment.name);
    setEditVariables([...environment.variables]);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName('');
    setEditVariables([]);
    setIsCreating(false);
    setNewName('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    
    if (!editName.trim()) {
      showToast?.('Environment name cannot be empty', 'error');
      return;
    }

    try {
      onUpdate(editingId, editName.trim(), editVariables);
      setEditingId(null);
      setEditName('');
      setEditVariables([]);
      showToast?.('Environment updated', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update environment';
      showToast?.(errorMessage, 'error');
    }
  }, [editingId, editName, editVariables, onUpdate, showToast]);

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

  const handleDelete = useCallback((id: string) => {
    try {
      onDelete(id);
      if (editingId === id) {
        handleCancelEdit();
      }
      showToast?.('Environment deleted', 'info');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete environment';
      showToast?.(errorMessage, 'error');
    }
  }, [editingId, onDelete, showToast, handleCancelEdit]);

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

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
                <button className="cancel-btn" onClick={handleCancelEdit}>
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
              isEditing={editingId === environment.id}
              editName={editName}
              editVariables={editVariables}
              onSelect={() => {
                // Only start editing if not already editing and not clicking on action buttons
                if (editingId !== environment.id && !isCreating) {
                  handleStartEdit(environment);
                }
              }}
              onStartEdit={() => handleStartEdit(environment)}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onDelete={() => handleDelete(environment.id)}
              onSetActive={() => onSetActive(environment.id)}
              onNameChange={setEditName}
              onVariablesChange={setEditVariables}
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
    </div>
  );
}
