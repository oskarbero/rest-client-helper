import React from 'react';
import { CollectionNode } from '../../../core/types';
import { PathGroup, groupRequestsByPath } from '../../../core/path-grouping';

interface PathGroupedViewProps {
  collection: CollectionNode;
  currentRequestId: string | null;
  expandedGroups: Set<string>;
  onSelect: (node: CollectionNode) => void;
  onToggleExpand: (groupId: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onStartRename: (id: string, name: string) => void;
  onFinishRename: () => void;
  editingId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  getMethodColor: (method: string) => string;
  formatDate: (dateStr: string) => string;
  onContextMenu: (e: React.MouseEvent, node: CollectionNode) => void;
  hasUnsavedChanges?: boolean;
}

interface PathGroupItemProps {
  group: PathGroup;
  level: number;
  currentRequestId: string | null;
  expandedGroups: Set<string>;
  onSelect: (node: CollectionNode) => void;
  onToggleExpand: (groupId: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onStartRename: (id: string, name: string) => void;
  onFinishRename: () => void;
  editingId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  getMethodColor: (method: string) => string;
  formatDate: (dateStr: string) => string;
  onContextMenu: (e: React.MouseEvent, node: CollectionNode) => void;
  hasUnsavedChanges?: boolean;
}

function PathGroupItem({
  group,
  level,
  currentRequestId,
  expandedGroups,
  onSelect,
  onToggleExpand,
  onDelete,
  onRename,
  onStartRename,
  onFinishRename,
  editingId,
  editName,
  setEditName,
  getMethodColor,
  formatDate,
  onContextMenu,
  hasUnsavedChanges = false,
}: PathGroupItemProps) {
  const isExpanded = expandedGroups.has(group.fullPath);
  const hasContent = (group.requests.length > 0) || (group.groups.size > 0);
  const indent = level * 16;

  const handleGroupClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (hasContent) {
      onToggleExpand(group.fullPath);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFinishRename();
    } else if (e.key === 'Escape') {
      onFinishRename();
    }
  };

  // Don't render empty root group
  if (!group.name && group.groups.size === 0 && group.requests.length === 0) {
    return null;
  }

  // If this is the root group and it only has one domain group, skip rendering root
  // But only if that group looks like a domain (contains a dot)
  if (!group.name && group.groups.size === 1 && group.requests.length === 0) {
    const domainGroup = Array.from(group.groups.values())[0];
    // Only skip root if it's actually a domain (contains dot), not a path segment
    if (domainGroup.name.includes('.')) {
      return (
        <PathGroupItem
          group={domainGroup}
          level={0}
          currentRequestId={currentRequestId}
          expandedGroups={expandedGroups}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          onDelete={onDelete}
          onRename={onRename}
          onStartRename={onStartRename}
          onFinishRename={onFinishRename}
          editingId={editingId}
          editName={editName}
          setEditName={setEditName}
          getMethodColor={getMethodColor}
          formatDate={formatDate}
          onContextMenu={onContextMenu}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      );
    }
  }
  
  // If root group has path groups directly (no domain), render them
  // Auto-expand root if it has groups or requests
  if (!group.name && (group.groups.size > 0 || group.requests.length > 0)) {
    // Render children directly without showing root
    return (
      <div>
        {group.requests.map((request) => {
          const isEditing = editingId === request.id;
          const isActive = currentRequestId === request.id;

          return (
            <div
              key={request.id}
              className={`collection-item ${isActive ? 'active' : ''}`}
              style={{ paddingLeft: `${indent}px` }}
              onClick={() => !isEditing && onSelect(request)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(e, request);
              }}
            >
              {isEditing ? (
                <input
                  type="text"
                  className="rename-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={onFinishRename}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <>
                  <div className="collection-item-header">
                    {request.request && (
                      <span className={`collection-method ${getMethodColor(request.request.method)}`}>
                        {request.request.method}
                      </span>
                    )}
                    <span className="collection-name" title={request.name}>
                      {request.name}
                    </span>
                    {isActive && hasUnsavedChanges && (
                      <span className="collection-item-unsaved-indicator" title="Unsaved changes">
                        •
                      </span>
                    )}
                  </div>
                  {request.request && (
                    <div className="collection-item-url" title={request.request.url}>
                      {request.request.url || 'No URL'}
                    </div>
                  )}
                  <div className="collection-item-footer">
                    <span className="collection-date">{formatDate(request.updatedAt)}</span>
                    <div className="collection-item-actions">
                      <button
                        className="item-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onStartRename(request.id, request.name);
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        title="Rename"
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
                          e.preventDefault();
                          if (window.confirm(`Delete "${request.name}"? This cannot be undone.`)) {
                            onDelete(request.id);
                          }
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
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
                </>
              )}
            </div>
          );
        })}
        
        {/* Render nested groups */}
        {Array.from(group.groups.values()).map((subGroup) => (
          <PathGroupItem
            key={subGroup.fullPath}
            group={subGroup}
            level={level}
            currentRequestId={currentRequestId}
            expandedGroups={expandedGroups}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
            onDelete={onDelete}
            onRename={onRename}
            onStartRename={onStartRename}
            onFinishRename={onFinishRename}
            editingId={editingId}
            editName={editName}
            setEditName={setEditName}
            getMethodColor={getMethodColor}
            formatDate={formatDate}
            onContextMenu={onContextMenu}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {group.name && (
        <div
          className={`collection-item ${hasContent ? 'collection-group' : ''}`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={handleGroupClick}
        >
          <div className="collection-item-header">
            {hasContent && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="collection-expand-indicator"
                style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  opacity: 0.6,
                  pointerEvents: 'none',
                  marginRight: '4px',
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ marginRight: '4px', opacity: 0.7 }}
            >
              {/* Path/route icon - represents API path segments */}
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="8" cy="6" r="1" fill="currentColor" />
              <circle cx="8" cy="12" r="1" fill="currentColor" />
              <circle cx="8" cy="18" r="1" fill="currentColor" />
            </svg>
            <span className="collection-name" title={group.fullPath}>
              {/* Add "/" prefix for path segments, but not for domains (which contain dots) or special groups */}
              {group.name.includes('.') || group.name === 'Uncategorized' ? group.name : `/${group.name}`}
            </span>
            {group.isVariable && (
              <span style={{ marginLeft: '8px', opacity: 0.6, fontSize: '0.85em' }}>
                (variable)
              </span>
            )}
          </div>
        </div>
      )}

      {(isExpanded || !group.name) && (
        <div className="collection-children-group">
          {/* Render requests in this group */}
          {group.requests.map((request) => {
            const isEditing = editingId === request.id;
            const isActive = currentRequestId === request.id;

            return (
              <div
                key={request.id}
                className={`collection-item ${isActive ? 'active' : ''}`}
                style={{ paddingLeft: `${indent + 16}px` }}
                onClick={() => !isEditing && onSelect(request)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e, request);
                }}
              >
                {isEditing ? (
                  <input
                    type="text"
                    className="rename-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={onFinishRename}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <>
                    <div className="collection-item-header">
                      {request.request && (
                        <span className={`collection-method ${getMethodColor(request.request.method)}`}>
                          {request.request.method}
                        </span>
                      )}
                      <span className="collection-name" title={request.name}>
                        {request.name}
                      </span>
                      {isActive && hasUnsavedChanges && (
                        <span className="collection-item-unsaved-indicator" title="Unsaved changes">
                          •
                        </span>
                      )}
                    </div>
                    {request.request && (
                      <div className="collection-item-url" title={request.request.url}>
                        {request.request.url || 'No URL'}
                      </div>
                    )}
                    <div className="collection-item-footer">
                      <span className="collection-date">{formatDate(request.updatedAt)}</span>
                      <div className="collection-item-actions">
                        <button
                          className="item-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onStartRename(request.id, request.name);
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                          }}
                          title="Rename"
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
                            e.preventDefault();
                            if (window.confirm(`Delete "${request.name}"? This cannot be undone.`)) {
                              onDelete(request.id);
                            }
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
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
                  </>
                )}
              </div>
            );
          })}

          {/* Render nested groups */}
          {Array.from(group.groups.values()).map((subGroup) => (
            <PathGroupItem
              key={subGroup.fullPath}
              group={subGroup}
              level={level + (group.name ? 1 : 0)}
              currentRequestId={currentRequestId}
              expandedGroups={expandedGroups}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onDelete={onDelete}
              onRename={onRename}
              onStartRename={onStartRename}
              onFinishRename={onFinishRename}
              editingId={editingId}
              editName={editName}
              setEditName={setEditName}
              getMethodColor={getMethodColor}
              formatDate={formatDate}
              onContextMenu={onContextMenu}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PathGroupedView({
  collection,
  currentRequestId,
  expandedGroups,
  onSelect,
  onToggleExpand,
  onDelete,
  onRename,
  onStartRename,
  onFinishRename,
  editingId,
  editName,
  setEditName,
  getMethodColor,
  formatDate,
  onContextMenu,
  hasUnsavedChanges = false,
}: PathGroupedViewProps) {
  // Only process requests, not sub-collections
  // For now, we'll only show requests from this collection
  // Sub-collections would need to be handled differently
  const requests = collection.children?.filter(child => child.type === 'request') || [];

  if (requests.length === 0) {
    return (
      <div className="collections-empty">
        <p>No requests in this collection</p>
        <p className="collections-empty-hint">
          Save a request to see it here
        </p>
      </div>
    );
  }

  // Get baseUrl from collection settings
  const baseUrl = collection.settings?.baseUrl;
  const pathGroup = groupRequestsByPath(requests, baseUrl);

  return (
    <div className="collections-list">
      <PathGroupItem
        group={pathGroup}
        level={0}
        currentRequestId={currentRequestId}
        expandedGroups={expandedGroups}
        onSelect={onSelect}
        onToggleExpand={onToggleExpand}
        onDelete={onDelete}
        onRename={onRename}
        onStartRename={onStartRename}
        onFinishRename={onFinishRename}
        editingId={editingId}
        editName={editName}
        setEditName={setEditName}
        getMethodColor={getMethodColor}
        formatDate={formatDate}
        onContextMenu={onContextMenu}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </div>
  );
}
