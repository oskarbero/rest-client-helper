import React, { useState } from 'react';
import { SavedRequest, HttpRequest } from '../../../core/types';

interface CollectionsProps {
  requests: SavedRequest[];
  currentRequestId: string | null;
  onSelect: (request: SavedRequest) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onNew: () => void;
}

export function Collections({
  requests,
  currentRequestId,
  onSelect,
  onSave,
  onDelete,
  onRename,
  onNew,
}: CollectionsProps) {
  const [isNaming, setIsNaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSaveNew = () => {
    if (newName.trim()) {
      onSave(newName.trim());
      setNewName('');
      setIsNaming(false);
    }
  };

  const handleStartRename = (request: SavedRequest) => {
    setEditingId(request.id);
    setEditName(request.name);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      setIsNaming(false);
      setEditingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'method-get';
      case 'POST': return 'method-post';
      case 'PUT': return 'method-put';
      case 'PATCH': return 'method-patch';
      case 'DELETE': return 'method-delete';
      default: return '';
    }
  };

  return (
    <div className="collections-sidebar">
      <div className="collections-header">
        <h2 className="collections-title">Collections</h2>
        <div className="collections-actions">
          <button
            className="collections-action-btn"
            onClick={onNew}
            title="New Request"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </button>
          <button
            className="collections-action-btn"
            onClick={() => setIsNaming(true)}
            title="Save Current Request"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
          </button>
        </div>
      </div>

      {isNaming && (
        <div className="save-request-form">
          <input
            type="text"
            className="save-request-input"
            placeholder="Request name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleSaveNew)}
            autoFocus
          />
          <div className="save-request-buttons">
            <button className="save-btn" onClick={handleSaveNew}>Save</button>
            <button className="cancel-btn" onClick={() => setIsNaming(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="collections-list">
        {requests.length === 0 ? (
          <div className="collections-empty">
            <p>No saved requests</p>
            <p className="collections-empty-hint">
              Save your current request to access it later
            </p>
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className={`collection-item ${currentRequestId === req.id ? 'active' : ''}`}
              onClick={() => onSelect(req)}
            >
              {editingId === req.id ? (
                <input
                  type="text"
                  className="rename-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleFinishRename)}
                  onBlur={handleFinishRename}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <>
                  <div className="collection-item-header">
                    <span className={`collection-method ${getMethodColor(req.request.method)}`}>
                      {req.request.method}
                    </span>
                    <span className="collection-name" title={req.name}>
                      {req.name}
                    </span>
                  </div>
                  <div className="collection-item-url" title={req.request.url}>
                    {req.request.url || 'No URL'}
                  </div>
                  <div className="collection-item-footer">
                    <span className="collection-date">{formatDate(req.updatedAt)}</span>
                    <div className="collection-item-actions">
                      <button
                        className="item-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(req);
                        }}
                        title="Rename"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className="item-action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(req.id);
                        }}
                        title="Delete"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
