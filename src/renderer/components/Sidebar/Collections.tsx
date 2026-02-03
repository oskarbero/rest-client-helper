import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CollectionNode, RecentRequest, Environment, EnvironmentVariable } from '../../../core/types';
import { ContextMenu, ContextMenuAction } from './ContextMenu';
import { Environments } from './Environments';
import { PathGroupedView } from './PathGroupedView';

type SidebarTab = 'recent' | 'environments' | 'collections';
type ViewMode = 'tree' | 'path-grouped';

interface CollectionsProps {
  collectionsTree: CollectionNode[];
  recentRequests: RecentRequest[];
  currentRequestId: string | null;
  expandedNodes: Set<string>;
  onSelect: (node: CollectionNode) => void;
  onSelectRecent: (request: RecentRequest) => void;
  onSave: (name: string, parentId?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onNew: () => void;
  onClearRecent: () => void;
  onCreateCollection: (name: string, parentId?: string) => void;
  onToggleExpand: (id: string) => void;
  onMoveNode: (id: string, newParentId?: string) => void;
  triggerSaveForm?: boolean;
  onSaveFormTriggered?: () => void;
  hasUnsavedChanges?: boolean;
  // Environment props
  environments?: Environment[];
  activeEnvironmentId?: string | null;
  selectedEnvironmentId?: string | null;
  onCreateEnvironment?: (name: string) => void;
  onUpdateEnvironment?: (id: string, name: string, variables: EnvironmentVariable[]) => void;
  onDeleteEnvironment?: (id: string) => void;
  onDuplicateEnvironment?: (sourceId: string, newName: string) => void;
  onSetActiveEnvironment?: (id: string | null) => void;
  onTabChange?: (tab: 'recent' | 'environments' | 'collections') => void;
  onEnvironmentSelect?: (id: string | null) => void;
  onOpenCollectionSettings?: (collectionId: string) => void;
  onSyncToRemote?: (collectionId: string) => void;
  onPullFromRemote?: (collectionId: string) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onImportOpenAPI3?: () => void;
  onImportPostman?: () => void;
  onExportOpenAPI3?: (collectionIds?: string[]) => void;
}

interface CollectionNodeItemProps {
  node: CollectionNode;
  level: number;
  currentRequestId: string | null;
  expandedNodes: Set<string>;
  editingId: string | null;
  editName: string;
  activeId: string | null;
  dragOverId: string | null;
  onSelect: (node: CollectionNode) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onStartRename: (id: string, name: string) => void;
  onFinishRename: () => void;
  onToggleExpand: (id: string) => void;
  onCreateCollection: (parentId: string) => void;
  onSaveRequest: (parentId: string) => void;
  onContextMenu: (e: React.MouseEvent, node: CollectionNode) => void;
  setEditName: (name: string) => void;
  getMethodColor: (method: string) => string;
  formatDate: (dateStr: string) => string;
  getAllCollections: () => CollectionNode[];
  isNaming: boolean;
  isNamingCollection: boolean;
  parentIdForSave: string | undefined;
  parentIdForCollection: string | undefined;
  renderCreateForm: () => React.ReactNode;
  hasUnsavedChanges?: boolean;
}

function CollectionNodeItem({
  node,
  level,
  currentRequestId,
  expandedNodes,
  editingId,
  editName,
  activeId,
  dragOverId,
  onSelect,
  onDelete,
  onRename,
  onStartRename,
  onFinishRename,
  onToggleExpand,
  onCreateCollection,
  onSaveRequest,
  onContextMenu,
  setEditName,
  getMethodColor,
  formatDate,
  getAllCollections,
  isNaming,
  isNamingCollection,
  parentIdForSave,
  parentIdForCollection,
  renderCreateForm,
  hasUnsavedChanges = false,
}: CollectionNodeItemProps) {
  const isExpanded = expandedNodes.has(node.id);
  const isEditing = editingId === node.id;
  const isRequest = node.type === 'request';
  const isCollection = node.type === 'collection';
  const hasChildren = isCollection && node.children && node.children.length > 0;
  const indent = level * 16;
  const isDragging = activeId === node.id;
  const isDragOver = dragOverId === node.id;

  // Make both requests and collections draggable
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging: isDraggingThis } = useDraggable({
    id: node.id,
    disabled: isEditing,
    data: {
      type: node.type,
      node,
    },
  });

  // Make collections droppable
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: node.id,
    disabled: !isCollection,
    data: {
      type: node.type,
      node,
    },
  });

  const dragStyle = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFinishRename();
    } else if (e.key === 'Escape') {
      onFinishRename();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  // Handle click - prevent drag from interfering
  const handleClick = (e: React.MouseEvent) => {
    // Don't select if clicking on buttons or drag handle
    if ((e.target as HTMLElement).closest('button, .drag-handle')) {
      return;
    }
    if (!isEditing) {
      if (isRequest) {
        onSelect(node);
      } else if (isCollection && hasChildren) {
        // Toggle expand state for collections
        onToggleExpand(node.id);
      }
    }
  };

  // Combine refs - all nodes are draggable, collections are also droppable
  const setRefs = useCallback((element: HTMLDivElement | null) => {
    setDraggableRef(element);
    if (isCollection) {
      setDroppableRef(element);
    }
  }, [isCollection, setDraggableRef, setDroppableRef]);

  const itemClasses = [
    'collection-item',
    currentRequestId === node.id && isRequest ? 'active' : '',
    isDragging ? 'dragging' : '',
    isDragOver || (isCollection && isOver) ? 'drag-over' : '',
    isRequest && isDraggingThis ? 'dragging-this' : '',
  ].filter(Boolean).join(' ');

  return (
    <div>
      <div
        ref={setRefs}
        className={itemClasses}
        style={{ 
          paddingLeft: `${indent}px`,
          ...dragStyle,
          opacity: isDraggingThis ? 0.5 : 1,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        {...attributes}
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
              <div
                className="drag-handle"
                {...listeners}
                style={{ cursor: 'grab', display: 'inline-flex', alignItems: 'center', marginRight: '4px' }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.4"
                >
                  <circle cx="9" cy="12" r="1" />
                  <circle cx="9" cy="5" r="1" />
                  <circle cx="9" cy="19" r="1" />
                  <circle cx="15" cy="12" r="1" />
                  <circle cx="15" cy="5" r="1" />
                  <circle cx="15" cy="19" r="1" />
                </svg>
              </div>
              {isCollection && hasChildren && (
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
                  }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
              {isRequest && node.request && (
                <span className={`collection-method ${getMethodColor(node.request.method)}`}>
                  {node.request.method}
                </span>
              )}
              {isCollection && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginRight: '4px' }}
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              )}
              <span className="collection-name" title={node.name}>
                {node.name}
              </span>
              {isRequest && currentRequestId === node.id && hasUnsavedChanges && (
                <span className="collection-item-unsaved-indicator" title="Unsaved changes">
                  •
                </span>
              )}
            </div>
            {isRequest && node.request && (
              <div className="collection-item-url" title={node.request.url}>
                {node.request.url || 'No URL'}
              </div>
            )}
            <div className="collection-item-footer">
              <span className="collection-date">{formatDate(node.updatedAt)}</span>
              <div className="collection-item-actions">
                {isCollection && (
                  <>
                    <button
                      className="item-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onCreateCollection(node.id);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      title="New Collection"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        <line x1="12" y1="11" x2="12" y2="17" />
                        <line x1="9" y1="14" x2="15" y2="14" />
                      </svg>
                    </button>
                    <button
                      className="item-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onSaveRequest(node.id);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      title="Save Request Here"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  className="item-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onStartRename(node.id, node.name);
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
                    if (window.confirm(`Delete "${node.name}"? This cannot be undone.`)) {
                      onDelete(node.id);
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
      {isCollection && ((isNaming && parentIdForSave === node.id) || (isNamingCollection && parentIdForCollection === node.id)) && (
        <div className="save-request-form-wrapper" style={{ paddingLeft: `${indent + 16}px` }} onClick={(e) => e.stopPropagation()}>
          {renderCreateForm()}
        </div>
      )}
      {isCollection && isExpanded && node.children && (
        <div className="collection-children-group">
          {node.children.map((child) => (
            <CollectionNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              currentRequestId={currentRequestId}
              expandedNodes={expandedNodes}
              editingId={editingId}
              editName={editName}
              activeId={activeId}
              dragOverId={dragOverId}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onStartRename={onStartRename}
              onFinishRename={onFinishRename}
              onToggleExpand={onToggleExpand}
              onCreateCollection={onCreateCollection}
              onSaveRequest={onSaveRequest}
              onContextMenu={onContextMenu}
              setEditName={setEditName}
              getMethodColor={getMethodColor}
              formatDate={formatDate}
              getAllCollections={getAllCollections}
              isNaming={isNaming}
              isNamingCollection={isNamingCollection}
              parentIdForSave={parentIdForSave}
              parentIdForCollection={parentIdForCollection}
              renderCreateForm={renderCreateForm}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Collections({
  collectionsTree,
  recentRequests,
  currentRequestId,
  expandedNodes,
  onSelect,
  onSelectRecent,
  onSave,
  onDelete,
  onRename,
  onNew,
  onClearRecent,
  onCreateCollection,
  onToggleExpand,
  onMoveNode,
  triggerSaveForm = false,
  onSaveFormTriggered,
  hasUnsavedChanges = false,
  environments = [],
  activeEnvironmentId = null,
  selectedEnvironmentId = null,
  onCreateEnvironment,
  onUpdateEnvironment,
  onDeleteEnvironment,
  onDuplicateEnvironment,
  onSetActiveEnvironment,
  onTabChange,
  onEnvironmentSelect,
  onOpenCollectionSettings,
  onSyncToRemote,
  onPullFromRemote,
  showToast,
  onImportOpenAPI3,
  onImportPostman,
  onExportOpenAPI3,
}: CollectionsProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('collections');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedGroups, setExpandedGroups] = useState<Map<string, Set<string>>>(new Map());
  
  // Notify parent when tab changes
  useEffect(() => {
    onTabChange?.(activeTab);
    
    // Auto-select active environment when environments tab opens
    if (activeTab === 'environments' && activeEnvironmentId && !selectedEnvironmentId) {
      onEnvironmentSelect?.(activeEnvironmentId);
    }
  }, [activeTab, activeEnvironmentId, selectedEnvironmentId, onTabChange, onEnvironmentSelect]);
  
  const handleToggleGroup = useCallback((collectionId: string, groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Map(prev);
      const collectionGroups = next.get(collectionId) || new Set<string>();
      const updatedGroups = new Set(collectionGroups);
      
      if (updatedGroups.has(groupId)) {
        updatedGroups.delete(groupId);
      } else {
        updatedGroups.add(groupId);
      }
      
      next.set(collectionId, updatedGroups);
      return next;
    });
  }, []);
  
  const getExpandedGroupsForCollection = useCallback((collectionId: string): Set<string> => {
    return expandedGroups.get(collectionId) || new Set();
  }, [expandedGroups]);
  
  const [isNaming, setIsNaming] = useState(false);
  const [isNamingCollection, setIsNamingCollection] = useState(false);
  const [newName, setNewName] = useState('');
  const [parentIdForSave, setParentIdForSave] = useState<string | undefined>(undefined);
  const [parentIdForCollection, setParentIdForCollection] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Handle external trigger to show save form
  useEffect(() => {
    if (triggerSaveForm) {
      setIsNaming(true);
      setParentIdForSave(undefined);
      if (onSaveFormTriggered) {
        onSaveFormTriggered();
      }
    }
  }, [triggerSaveForm, onSaveFormTriggered]);
  
  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<CollectionNode | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: CollectionNode | null;
  } | null>(null);

  const handleSaveNew = useCallback(() => {
    if (newName.trim()) {
      onSave(newName.trim(), parentIdForSave);
      setNewName('');
      setIsNaming(false);
      setParentIdForSave(undefined);
    }
  }, [newName, parentIdForSave, onSave]);

  const handleCreateCollection = useCallback(() => {
    if (newName.trim()) {
      onCreateCollection(newName.trim(), parentIdForCollection);
      setNewName('');
      setIsNamingCollection(false);
      setParentIdForCollection(undefined);
    }
  }, [newName, parentIdForCollection, onCreateCollection]);

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelCreate = useCallback(() => {
    setIsNaming(false);
    setIsNamingCollection(false);
    setNewName('');
    setParentIdForSave(undefined);
    setParentIdForCollection(undefined);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      handleCancelCreate();
      setEditingId(null);
    }
  }, [handleCancelCreate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(dateStr);
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

  const getStatusColor = (status: number) => {
    if (status === 0) return 'status-error';
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 300 && status < 400) return 'status-redirect';
    if (status >= 400 && status < 500) return 'status-client-error';
    return 'status-server-error';
  };

  const countTotalItems = (nodes: CollectionNode[]): number => {
    let count = 0;
    for (const node of nodes) {
      count++;
      if (node.children) {
        count += countTotalItems(node.children);
      }
    }
    return count;
  };

  // Get all collections for context menu
  const getAllCollections = useCallback((): CollectionNode[] => {
    const collect = (nodes: CollectionNode[]): CollectionNode[] => {
      const result: CollectionNode[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.children) {
          result.push(...collect(node.children));
        }
      }
      return result;
    };
    return collect(collectionsTree);
  }, [collectionsTree]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const allNodes = getAllCollections();
    const node = allNodes.find(n => n.id === event.active.id);
    setDraggedNode(node || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      setDragOverId(over.id as string);
    } else {
      setDragOverId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDragOverId(null);
    setDraggedNode(null);

    if (!over || active.id === over.id) {
      return;
    }

    const allNodes = getAllCollections();
    const dragged = allNodes.find(n => n.id === active.id);
    const target = allNodes.find(n => n.id === over.id);

    if (!dragged || !target) {
      return;
    }

    // Validation: can't move collection into itself or descendants
    if (dragged.type === 'collection') {
      const isDescendant = (checkId: string, checkNode: CollectionNode): boolean => {
        if (checkNode.id === checkId) return true;
        if (checkNode.children) {
          return checkNode.children.some((child) => isDescendant(checkId, child));
        }
        return false;
      };

      if (isDescendant(over.id as string, dragged)) {
        return; // Invalid move
      }
    }

    // Only allow dropping into collections (both requests and collections can be dropped into collections)
    if (target.type === 'collection') {
      onMoveNode(active.id as string, over.id as string);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDragOverId(null);
    setDraggedNode(null);
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, node: CollectionNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const handleContextMenuAction = (action: ContextMenuAction) => {
    if (!contextMenu || !contextMenu.node) return;

    const node = contextMenu.node;

    switch (action) {
      case 'add-request':
        if (node.type === 'collection') {
          if (!expandedNodes.has(node.id)) {
            onToggleExpand(node.id);
          }
          setParentIdForSave(node.id);
          setIsNaming(true);
        }
        break;
      case 'add-collection':
        if (node.type === 'collection') {
          if (!expandedNodes.has(node.id)) {
            onToggleExpand(node.id);
          }
          setParentIdForCollection(node.id);
          setIsNamingCollection(true);
        }
        break;
      case 'rename':
        setEditingId(node.id);
        setEditName(node.name);
        break;
      case 'delete':
        if (window.confirm(`Delete "${node.name}"? This cannot be undone.`)) {
          onDelete(node.id);
        }
        break;
      case 'expand-all':
        if (node.type === 'collection' && node.children) {
          const expandAll = (n: CollectionNode) => {
            if (n.type === 'collection') {
              if (!expandedNodes.has(n.id)) {
                onToggleExpand(n.id);
              }
              if (n.children) {
                n.children.forEach(expandAll);
              }
            }
          };
          expandAll(node);
        }
        break;
      case 'collapse-all':
        if (node.type === 'collection' && node.children) {
          const collapseAll = (n: CollectionNode) => {
            if (n.type === 'collection') {
              if (n.children) {
                n.children.forEach(collapseAll);
              }
              if (expandedNodes.has(n.id)) {
                onToggleExpand(n.id);
              }
            }
          };
          collapseAll(node);
        }
        break;
      case 'settings':
        if (node.type === 'collection') {
          onOpenCollectionSettings?.(node.id);
        }
        break;
      case 'sync-to-remote':
        if (node.type === 'collection' && node.settings?.gitRemote?.url) {
          onSyncToRemote?.(node.id);
        }
        break;
      case 'pull-from-remote':
        if (node.type === 'collection' && node.settings?.gitRemote?.syncFileName) {
          // Confirm before overwriting
          if (window.confirm('This will overwrite your local collection with the version from the remote repository. Continue?')) {
            onPullFromRemote?.(node.id);
          }
        }
        break;
    }

    setContextMenu(null);
  };

  const handleContextMenuMoveTo = (collectionId: string) => {
    if (!contextMenu || !contextMenu.node) return;
    onMoveNode(contextMenu.node.id, collectionId);
    setContextMenu(null);
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const renderRecentRequests = () => (
    <div className="collections-list">
      {recentRequests.length === 0 ? (
        <div className="collections-empty">
          <p>No recent requests</p>
          <p className="collections-empty-hint">
            Send a request to see it here
          </p>
        </div>
      ) : (
        <>
          <div className="recent-header">
            <button
              className="clear-recent-btn"
              onClick={onClearRecent}
              title="Clear history"
            >
              Clear All
            </button>
          </div>
          {recentRequests.map((recent) => (
            <div
              key={recent.id}
              className="collection-item recent-item"
              onClick={() => onSelectRecent(recent)}
            >
              <div className="collection-item-header">
                <span className={`collection-method ${getMethodColor(recent.request.method)}`}>
                  {recent.request.method}
                </span>
                {recent.response && (
                  <span className={`recent-status ${getStatusColor(recent.response.status)}`}>
                    {recent.response.status || 'ERR'}
                  </span>
                )}
              </div>
              <div className="collection-item-url" title={recent.request.url}>
                {recent.request.url || 'No URL'}
              </div>
              <div className="collection-item-footer">
                <span className="collection-date">{formatRelativeTime(recent.timestamp)}</span>
                {recent.response && (
                  <span className="recent-duration">{recent.response.duration}ms</span>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  const renderCreateForm = useCallback(() => (
    <div className="save-request-form">
      <input
        type="text"
        className="save-request-input"
        placeholder={isNamingCollection ? "Collection name..." : "Request name..."}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, isNamingCollection ? handleCreateCollection : handleSaveNew)}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        autoFocus
      />
      <div className="save-request-buttons">
        <button className="save-btn" onClick={isNamingCollection ? handleCreateCollection : handleSaveNew}>
          {isNamingCollection ? 'Create' : 'Save'}
        </button>
        <button className="cancel-btn" onClick={handleCancelCreate}>
          Cancel
        </button>
      </div>
    </div>
  ), [isNamingCollection, newName, handleCancelCreate, handleCreateCollection, handleSaveNew, handleKeyDown]);

  const isRootLevelCreate = (isNaming || isNamingCollection) && parentIdForSave === undefined && parentIdForCollection === undefined;

  const renderCollections = () => {
    if (viewMode === 'path-grouped') {
      return (
        <>
          {isRootLevelCreate && renderCreateForm()}
          <div className="collections-list">
            {collectionsTree.length === 0 ? (
              <div className="collections-empty">
                <p>No collections</p>
                <p className="collections-empty-hint">
                  Create a collection or save your current request
                </p>
              </div>
            ) : (
              collectionsTree.map((collection) => {
                if (collection.type !== 'collection') {
                  return null;
                }
                
                const isExpanded = expandedNodes.has(collection.id);
                
                return (
                  <div key={collection.id}>
                    {/* Collection header */}
                    <div
                      className={`collection-item ${isExpanded ? 'active' : ''}`}
                      onClick={() => onToggleExpand(collection.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleContextMenu(e, collection);
                      }}
                    >
                      <div className="collection-item-header">
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
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ marginRight: '4px' }}
                        >
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="collection-name" title={collection.name}>
                          {collection.name}
                        </span>
                      </div>
                    </div>
                    
                    {/* Path-grouped view for collection's requests */}
                    {isExpanded && (
                      <div style={{ paddingLeft: '16px' }}>
                        <PathGroupedView
                          collection={collection}
                          currentRequestId={currentRequestId}
                          expandedGroups={getExpandedGroupsForCollection(collection.id)}
                          onSelect={onSelect}
                          onToggleExpand={(groupId) => handleToggleGroup(collection.id, groupId)}
                          onDelete={onDelete}
                          onRename={onRename}
                          onStartRename={handleStartRename}
                          onFinishRename={handleFinishRename}
                          editingId={editingId}
                          editName={editName}
                          setEditName={setEditName}
                          getMethodColor={getMethodColor}
                          formatDate={formatDate}
                          onContextMenu={handleContextMenu}
                          hasUnsavedChanges={hasUnsavedChanges}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      );
    }

    // Tree view (default)
    return (
      <>
        {isRootLevelCreate && renderCreateForm()}

        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="collections-list">
            {collectionsTree.length === 0 ? (
              <div className="collections-empty">
                <p>No collections</p>
                <p className="collections-empty-hint">
                  Create a collection or save your current request
                </p>
              </div>
            ) : (
              collectionsTree.map((node) => (
                <CollectionNodeItem
                  key={node.id}
                  node={node}
                  level={0}
                  currentRequestId={currentRequestId}
                  expandedNodes={expandedNodes}
                  editingId={editingId}
                  editName={editName}
                  activeId={activeId}
                  dragOverId={dragOverId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onRename={onRename}
                  onStartRename={handleStartRename}
                  onFinishRename={handleFinishRename}
                  onToggleExpand={onToggleExpand}
                  onCreateCollection={(parentId) => {
                    setParentIdForCollection(parentId);
                    setIsNamingCollection(true);
                  }}
                  onSaveRequest={(parentId) => {
                    setParentIdForSave(parentId);
                    setIsNaming(true);
                  }}
                  onContextMenu={handleContextMenu}
                  setEditName={setEditName}
                  getMethodColor={getMethodColor}
                  formatDate={formatDate}
                  getAllCollections={getAllCollections}
                  isNaming={isNaming}
                  isNamingCollection={isNamingCollection}
                  parentIdForSave={parentIdForSave}
                  parentIdForCollection={parentIdForCollection}
                  renderCreateForm={renderCreateForm}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              ))
            )}
          </div>
          <DragOverlay>
            {draggedNode ? (
              <div className="collection-item dragging-overlay">
                <div className="collection-item-header">
                  {draggedNode.type === 'request' && draggedNode.request && (
                    <span className={`collection-method ${getMethodColor(draggedNode.request.method)}`}>
                      {draggedNode.request.method}
                    </span>
                  )}
                  {draggedNode.type === 'collection' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  )}
                  <span className="collection-name">{draggedNode.name}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </>
    );
  };

  return (
    <div className="collections-sidebar">
      <div className="collections-header">
        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recent
            {recentRequests.length > 0 && (
              <span className="sidebar-tab-badge">{recentRequests.length}</span>
            )}
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'collections' ? 'active' : ''}`}
            onClick={() => setActiveTab('collections')}
          >
            Collections
            {collectionsTree.length > 0 && (
              <span className="sidebar-tab-badge">{countTotalItems(collectionsTree)}</span>
            )}
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'environments' ? 'active' : ''}`}
            onClick={() => setActiveTab('environments')}
          >
            Env
            {activeEnvironmentId && (
              <span className="sidebar-tab-badge" title="Active environment">●</span>
            )}
          </button>
        </div>
        <div className="collections-actions">
          <button
            className="collections-action-btn"
            onClick={onNew}
            title="New Request"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </button>
          {activeTab === 'collections' && (
            <>
              <button
                className="collections-action-btn"
                onClick={() => setIsNamingCollection(true)}
                title="Create Collection"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </button>
              <button
                className="collections-action-btn"
                onClick={() => setIsNaming(true)}
                title="Save Current Request"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </button>
              <button
                className="collections-action-btn"
                onClick={() => onImportOpenAPI3?.()}
                title="Import OpenAPI 3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button
                className="collections-action-btn"
                onClick={() => onImportPostman?.()}
                title="Import Postman Collection"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button
                className="collections-action-btn"
                onClick={() => onExportOpenAPI3?.()}
                title="Export Collection to OpenAPI 3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </button>
              <button
                className={`collections-action-btn ${viewMode === 'path-grouped' ? 'active' : ''}`}
                onClick={() => setViewMode(viewMode === 'tree' ? 'path-grouped' : 'tree')}
                title={viewMode === 'tree' ? 'Switch to Path Grouped View' : 'Switch to Tree View'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {viewMode === 'tree' ? (
                    // Path/folder icon for path-grouped view
                    <>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      <line x1="9" y1="9" x2="15" y2="9" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="15" y2="17" />
                    </>
                  ) : (
                    // Tree/list icon for tree view
                    <>
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'recent' ? renderRecentRequests() : 
       activeTab === 'environments' ? (
         <Environments
           environments={environments}
           activeEnvironmentId={activeEnvironmentId || null}
           selectedEnvironmentId={selectedEnvironmentId || null}
           onCreate={onCreateEnvironment || (() => {})}
           onUpdate={onUpdateEnvironment || (() => {})}
           onDelete={onDeleteEnvironment || (() => {})}
           onDuplicate={onDuplicateEnvironment || (() => {})}
           onSetActive={onSetActiveEnvironment || (() => {})}
           onSelect={onEnvironmentSelect || (() => {})}
           showToast={showToast}
         />
       ) : renderCollections()}

      <ContextMenu
        visible={contextMenu?.visible || false}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        node={contextMenu?.node || null}
        onAction={handleContextMenuAction}
        onClose={handleCloseContextMenu}
        onMoveToCollection={handleContextMenuMoveTo}
        availableCollections={getAllCollections()}
      />
    </div>
  );
}
