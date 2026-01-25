import React, { useState } from 'react';
import { HttpRequest, KeyValuePair, RequestBody, AuthConfig } from '../../../core/types';
import { HeadersTab } from './HeadersTab';
import { ParamsTab } from './ParamsTab';
import { BodyTab } from './BodyTab';
import { AuthTab } from './AuthTab';

type TabId = 'params' | 'headers' | 'body' | 'auth';

interface RequestTabsProps {
  request: HttpRequest;
  onRequestChange: (request: HttpRequest) => void;
}

interface TabConfig {
  id: TabId;
  label: string;
  badge?: number;
}

export function RequestTabs({ request, onRequestChange }: RequestTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('headers');

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
    onRequestChange({ ...request, auth });
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
        return <HeadersTab headers={request.headers} onChange={handleHeadersChange} />;
      case 'params':
        return <ParamsTab params={request.queryParams} onChange={handleParamsChange} />;
      case 'body':
        return <BodyTab body={request.body} onChange={handleBodyChange} />;
      case 'auth':
        return <AuthTab auth={request.auth} onChange={handleAuthChange} />;
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
