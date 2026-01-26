import React, { useState, useEffect } from 'react';
import { HttpRequest, KeyValuePair, RequestBody, AuthConfig, CollectionSettings, Environment } from '../../../core/types';
import { generateAuthHeaders } from '../../../core/auth-handler';
import { HeadersTab } from './HeadersTab';
import { ParamsTab } from './ParamsTab';
import { BodyTab } from './BodyTab';
import { AuthTab } from './AuthTab';

type TabId = 'params' | 'headers' | 'body' | 'auth';

interface RequestTabsProps {
  request: HttpRequest;
  onRequestChange: (request: HttpRequest) => void;
  collectionSettings?: CollectionSettings;
  activeEnvironment?: Environment | null;
}

interface TabConfig {
  id: TabId;
  label: string;
  badge?: number;
}

export function RequestTabs({ request, onRequestChange, collectionSettings, activeEnvironment }: RequestTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('headers');

  // Sync auth headers when auth config changes (e.g., when loading a saved request with auth)
  // Only add headers if they're completely missing - don't re-add if user manually removed them
  // Also handles inherited auth from collection settings
  useEffect(() => {
    // Calculate effective auth: use request auth if not 'none', otherwise use collection auth if available
    let effectiveAuth: AuthConfig = request.auth;
    if (request.auth.type === 'none' && !request.auth.disableInherit && collectionSettings?.auth && collectionSettings.auth.type !== 'none') {
      effectiveAuth = collectionSettings.auth;
    }

    const authHeaders = generateAuthHeaders(effectiveAuth);
    if (Object.keys(authHeaders).length === 0) {
      return; // No auth headers to add
    }

    // Check if any auth headers are missing
    const missingHeaders: Array<{ key: string; value: string }> = [];
    for (const [key, value] of Object.entries(authHeaders)) {
      const lowerKey = key.toLowerCase();
      const exists = request.headers.some(h => h.key.toLowerCase() === lowerKey);
      if (!exists) {
        missingHeaders.push({ key, value });
      }
    }

    // Only add missing headers (don't update existing ones or re-enable disabled ones)
    if (missingHeaders.length > 0) {
      let headers = [...request.headers];
      
      for (const { key, value } of missingHeaders) {
        // Add new header at the beginning (after Content-Type if it exists)
        const contentTypeIndex = headers.findIndex(
          h => h.key.toLowerCase() === 'content-type'
        );
        const insertIndex = contentTypeIndex >= 0 ? contentTypeIndex + 1 : 0;
        headers.splice(insertIndex, 0, {
          key,
          value,
          enabled: true,
        });
      }
      
      onRequestChange({ ...request, headers });
    }
  }, [
    request.auth.type, 
    request.auth.basic?.username, 
    request.auth.basic?.password, 
    request.auth.bearer?.token, 
    request.auth.apiKey?.key, 
    request.auth.apiKey?.value, 
    request.auth.apiKey?.addTo,
    request.auth.disableInherit,
    collectionSettings?.auth?.type,
    collectionSettings?.auth?.basic?.username,
    collectionSettings?.auth?.basic?.password,
    collectionSettings?.auth?.bearer?.token,
    collectionSettings?.auth?.apiKey?.key,
    collectionSettings?.auth?.apiKey?.value,
    collectionSettings?.auth?.apiKey?.addTo,
  ]);

  const handleHeadersChange = (headers: KeyValuePair[]) => {
    onRequestChange({ ...request, headers });
  };

  const handleParamsChange = (queryParams: KeyValuePair[]) => {
    onRequestChange({ ...request, queryParams });
  };

  const handleBodyChange = (body: RequestBody) => {
    let headers = [...request.headers];
    
    // Find existing Content-Type header index
    const contentTypeIndex = headers.findIndex(
      h => h.key.toLowerCase() === 'content-type'
    );

    // Determine the appropriate Content-Type based on body type
    const getContentType = (type: string): string | null => {
      switch (type) {
        case 'json': return 'application/json';
        case 'text': return 'text/plain';
        case 'form-data': return 'multipart/form-data';
        default: return null;
      }
    };

    const newContentType = getContentType(body.type);

    if (newContentType) {
      if (contentTypeIndex >= 0) {
        // Update existing Content-Type header
        headers[contentTypeIndex] = {
          ...headers[contentTypeIndex],
          value: newContentType,
          enabled: true,
        };
      } else {
        // Add new Content-Type header
        headers = [
          { key: 'Content-Type', value: newContentType, enabled: true },
          ...headers,
        ];
      }
    } else if (body.type === 'none' && contentTypeIndex >= 0) {
      // Optionally disable Content-Type when body is none
      headers[contentTypeIndex] = {
        ...headers[contentTypeIndex],
        enabled: false,
      };
    }

    onRequestChange({ ...request, body, headers });
  };

  const handleAuthChange = (auth: AuthConfig) => {
    let headers = [...request.headers];
    
    // Generate auth headers from the new auth config
    const authHeaders = generateAuthHeaders(auth);
    
    // Get old effective auth to know what headers to remove when switching auth types
    // Calculate old effective auth (considering inheritance)
    let oldEffectiveAuth: AuthConfig = request.auth;
    if (request.auth.type === 'none' && !request.auth.disableInherit && collectionSettings?.auth && collectionSettings.auth.type !== 'none') {
      oldEffectiveAuth = collectionSettings.auth;
    }
    const oldAuthHeaders = generateAuthHeaders(oldEffectiveAuth);
    const oldAuthHeaderKeys = new Set(Object.keys(oldAuthHeaders).map(k => k.toLowerCase()));
    const newAuthHeaderKeys = new Set(Object.keys(authHeaders).map(k => k.toLowerCase()));
    
    // Track which headers to remove
    const headersToRemove: number[] = [];
    
    // Remove old auth headers that are no longer needed
    for (const oldKey of oldAuthHeaderKeys) {
      if (!newAuthHeaderKeys.has(oldKey)) {
        // This header was in old auth but not in new auth - remove it
        const headerIndex = headers.findIndex(
          h => h.key.toLowerCase() === oldKey
        );
        if (headerIndex >= 0) {
          headersToRemove.push(headerIndex);
        }
      }
    }
    
    // Calculate new effective auth to determine what headers should be present
    let newEffectiveAuth: AuthConfig = auth;
    if (auth.type === 'none' && !auth.disableInherit && collectionSettings?.auth && collectionSettings.auth.type !== 'none') {
      newEffectiveAuth = collectionSettings.auth;
    }
    const newEffectiveAuthHeaders = generateAuthHeaders(newEffectiveAuth);
    
    // If the user explicitly set auth to 'none' with inheritance disabled, or if no auth headers should be present, remove all auth headers
    if ((auth.type === 'none' && auth.disableInherit) || Object.keys(newEffectiveAuthHeaders).length === 0) {
      // Remove Authorization header if it exists
      const authorizationIndex = headers.findIndex(
        h => h.key.toLowerCase() === 'authorization'
      );
      if (authorizationIndex >= 0 && !headersToRemove.includes(authorizationIndex)) {
        headersToRemove.push(authorizationIndex);
      }
      // Also remove any API key headers that might have been from old auth
      for (let i = headers.length - 1; i >= 0; i--) {
        const header = headers[i];
        // Check if this header was from old auth (compare with old effective auth headers)
        if (oldAuthHeaderKeys.has(header.key.toLowerCase()) && !headersToRemove.includes(i)) {
          headersToRemove.push(i);
        }
      }
    } else {
      // Update or add new auth headers (use effective auth headers, not just the auth parameter)
      for (const [key, value] of Object.entries(newEffectiveAuthHeaders)) {
        const lowerKey = key.toLowerCase();
        const existingIndex = headers.findIndex(
          h => h.key.toLowerCase() === lowerKey
        );
        
        if (existingIndex >= 0) {
          // Update existing header
          headers[existingIndex] = {
            ...headers[existingIndex],
            key, // Preserve original casing from auth config
            value,
            enabled: true,
          };
        } else {
          // Add new header at the beginning (after Content-Type if it exists)
          const contentTypeIndex = headers.findIndex(
            h => h.key.toLowerCase() === 'content-type'
          );
          const insertIndex = contentTypeIndex >= 0 ? contentTypeIndex + 1 : 0;
          headers.splice(insertIndex, 0, {
            key,
            value,
            enabled: true,
          });
        }
      }
    }
    
    // Remove headers that need to be removed (in reverse order to maintain indices)
    headersToRemove.sort((a, b) => b - a);
    for (const index of headersToRemove) {
      headers.splice(index, 1);
    }
    
    onRequestChange({ ...request, auth, headers });
  };

  // Count enabled items for badges
  const enabledHeadersCount = request.headers.filter(h => h.enabled && h.key).length;
  const enabledParamsCount = request.queryParams.filter(p => p.enabled && p.key).length;

  const tabs: TabConfig[] = [
    { id: 'params', label: 'Params', badge: enabledParamsCount || undefined },
    { id: 'headers', label: 'Headers', badge: enabledHeadersCount || undefined },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'headers':
        return <HeadersTab headers={request.headers} onChange={handleHeadersChange} activeEnvironment={activeEnvironment} />;
      case 'params':
        return <ParamsTab params={request.queryParams} onChange={handleParamsChange} activeEnvironment={activeEnvironment} />;
      case 'body':
        return <BodyTab body={request.body} onChange={handleBodyChange} />;
      case 'auth':
        return <AuthTab auth={request.auth} onChange={handleAuthChange} collectionSettings={collectionSettings} activeEnvironment={activeEnvironment} />;
      default:
        return null;
    }
  };

  return (
    <div className="request-tabs">
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
