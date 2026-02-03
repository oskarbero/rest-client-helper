import React, { useEffect, useRef } from 'react';
import { CollectionNode } from '@core';

export type ContextMenuAction = 
  | 'add-request' 
  | 'add-collection' 
  | 'settings'
  | 'sync-to-remote'
  | 'pull-from-remote'
  | 'rename' 
  | 'delete' 
  | 'move-to'
  | 'expand-all'
  | 'collapse-all';

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  node: CollectionNode | null;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
  onMoveToCollection?: (collectionId: string) => void;
  availableCollections?: CollectionNode[];
}

export function ContextMenu({
  visible,
  x,
  y,
  node,
  onAction,
  onClose,
  onMoveToCollection,
  availableCollections = [],
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add listeners after a short delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible || !node) {
    return null;
  }

  const isCollection = node.type === 'collection';
  const isRequest = node.type === 'request';
  const hasChildren = isCollection && node.children && node.children.length > 0;

  // Filter out the current node and its descendants from available collections for move-to
  const getMoveToCollections = (): CollectionNode[] => {
    if (!isRequest) return [];
    
    const filterNode = (nodes: CollectionNode[]): CollectionNode[] => {
      return nodes.filter(n => {
        // Don't include the node itself or its parent
        if (n.id === node.id) return false;
        return true;
      }).map(n => ({
        ...n,
        children: n.children ? filterNode(n.children) : undefined,
      }));
    };
    
    return filterNode(availableCollections);
  };

  const moveToCollections = getMoveToCollections();

  const handleItemClick = (action: ContextMenuAction, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    onAction(action);
  };

  const handleMoveToClick = (collectionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onMoveToCollection) {
      onMoveToCollection(collectionId);
    }
    onClose();
  };

  // Calculate position to keep menu within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
    zIndex: 1000,
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {isCollection && (
        <>
          <div
            className="context-menu-item"
            role="menuitem"
            onClick={(e) => handleItemClick('add-request', e)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>Add Request</span>
          </div>
          <div
            className="context-menu-item"
            role="menuitem"
            onClick={(e) => handleItemClick('add-collection', e)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <span>Add Collection</span>
          </div>
          <div className="context-menu-separator" />
          <div
            className="context-menu-item"
            role="menuitem"
            onClick={(e) => handleItemClick('settings', e)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
            </svg>
            <span>Settings</span>
          </div>
          {node.settings?.gitRemote?.url && (
            <>
              <div
                className="context-menu-item"
                role="menuitem"
                onClick={(e) => handleItemClick('sync-to-remote', e)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 8l4 4-4 4" />
                  <path d="M3 12h18" />
                </svg>
                <span>Push to Remote</span>
              </div>
              {node.settings?.gitRemote?.syncFileName && (
                <div
                  className="context-menu-item"
                  role="menuitem"
                  onClick={(e) => handleItemClick('pull-from-remote', e)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 8l-4 4 4 4" />
                    <path d="M21 12H3" />
                  </svg>
                  <span>Pull from Remote</span>
                </div>
              )}
            </>
          )}
          <div className="context-menu-separator" />
        </>
      )}

      {isRequest && (
        <>
          {moveToCollections.length > 0 && (
            <>
              <div className="context-menu-item context-menu-submenu" role="menuitem" aria-haspopup="true">
                <span>Move to...</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <div className="context-menu-submenu-items" role="menu">
                  {moveToCollections.map((collection) => (
                    <div
                      key={collection.id}
                      className="context-menu-item"
                      role="menuitem"
                      onClick={(e) => handleMoveToClick(collection.id, e)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>{collection.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="context-menu-separator" />
            </>
          )}
        </>
      )}

      <div
        className="context-menu-item"
        role="menuitem"
        onClick={(e) => handleItemClick('rename', e)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span>Rename</span>
      </div>

      <div
        className="context-menu-item context-menu-item-danger"
        role="menuitem"
        onClick={(e) => handleItemClick('delete', e)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <span>Delete</span>
      </div>

      {isCollection && hasChildren && (
        <>
          <div className="context-menu-separator" />
          <div
            className="context-menu-item"
            role="menuitem"
            onClick={(e) => handleItemClick('expand-all', e)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>Expand All</span>
          </div>
          <div
            className="context-menu-item"
            role="menuitem"
            onClick={(e) => handleItemClick('collapse-all', e)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Collapse All</span>
          </div>
        </>
      )}
    </div>
  );
}
