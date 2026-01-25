import React, { useState } from 'react';
import { HttpRequest, KeyValuePair } from '../../../core/types';
import { HeadersTab } from './HeadersTab';

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
        return (
          <div className="tab-placeholder">
            Query Params tab coming in Milestone 3
          </div>
        );
      case 'body':
        return (
          <div className="tab-placeholder">
            Body tab coming in Milestone 4
          </div>
        );
      case 'auth':
        return (
          <div className="tab-placeholder">
            Auth tab coming in Milestone 5
          </div>
        );
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
