import React, { useState } from 'react';
import { AuthConfig, AuthType } from '../../../core/types';

interface AuthTabProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const authTypes: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
];

export function AuthTab({ auth, onChange }: AuthTabProps) {
  const [showBearerToken, setShowBearerToken] = useState(false);
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);

  const handleTypeChange = (type: AuthType) => {
    // Preserve existing config data when switching types
    onChange({
      ...auth,
      type,
    });
  };

  const handleBasicChange = (field: 'username' | 'password', value: string) => {
    onChange({
      ...auth,
      basic: {
        username: auth.basic?.username || '',
        password: auth.basic?.password || '',
        [field]: value,
      },
    });
  };

  const handleBearerChange = (token: string) => {
    onChange({
      ...auth,
      bearer: { token },
    });
  };

  const handleApiKeyChange = (field: 'key' | 'value' | 'addTo', value: string) => {
    onChange({
      ...auth,
      apiKey: {
        key: auth.apiKey?.key || '',
        value: auth.apiKey?.value || '',
        addTo: auth.apiKey?.addTo || 'header',
        [field]: value,
      },
    });
  };

  const renderAuthForm = () => {
    switch (auth.type) {
      case 'basic':
        return (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Username</label>
              <input
                type="text"
                className="auth-input"
                placeholder="Enter username"
                value={auth.basic?.username || ''}
                onChange={(e) => handleBasicChange('username', e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                type="password"
                className="auth-input"
                placeholder="Enter password"
                value={auth.basic?.password || ''}
                onChange={(e) => handleBasicChange('password', e.target.value)}
              />
            </div>
            <div className="auth-info">
              The username and password will be Base64 encoded and sent in the{' '}
              <code>Authorization</code> header.
            </div>
          </div>
        );

      case 'bearer':
        return (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Token</label>
              <div className="auth-input-with-toggle">
                <input
                  type={showBearerToken ? "text" : "password"}
                  className="auth-input"
                  placeholder="Enter token"
                  value={auth.bearer?.token || ''}
                  onChange={(e) => handleBearerChange(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-toggle-btn"
                  onClick={() => setShowBearerToken(!showBearerToken)}
                  title={showBearerToken ? "Hide token" : "Show token"}
                >
                  {showBearerToken ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="auth-info">
              The token will be sent in the <code>Authorization</code> header as{' '}
              <code>Bearer &lt;token&gt;</code>.
            </div>
          </div>
        );

      case 'api-key':
        return (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Key</label>
              <input
                type="text"
                className="auth-input"
                placeholder="e.g., X-API-Key, api_key"
                value={auth.apiKey?.key || ''}
                onChange={(e) => handleApiKeyChange('key', e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Value</label>
              <div className="auth-input-with-toggle">
                <input
                  type={showApiKeyValue ? "text" : "password"}
                  className="auth-input"
                  placeholder="Enter API key value"
                  value={auth.apiKey?.value || ''}
                  onChange={(e) => handleApiKeyChange('value', e.target.value)}
                />
                <button
                  type="button"
                  className="auth-toggle-btn"
                  onClick={() => setShowApiKeyValue(!showApiKeyValue)}
                  title={showApiKeyValue ? "Hide value" : "Show value"}
                >
                  {showApiKeyValue ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label">Add to</label>
              <div className="auth-radio-group">
                <label className="auth-radio-label">
                  <input
                    type="radio"
                    name="apiKeyAddTo"
                    value="header"
                    checked={auth.apiKey?.addTo !== 'query'}
                    onChange={() => handleApiKeyChange('addTo', 'header')}
                  />
                  Header
                </label>
                <label className="auth-radio-label">
                  <input
                    type="radio"
                    name="apiKeyAddTo"
                    value="query"
                    checked={auth.apiKey?.addTo === 'query'}
                    onChange={() => handleApiKeyChange('addTo', 'query')}
                  />
                  Query Params
                </label>
              </div>
            </div>
            <div className="auth-info">
              The API key will be added as a{' '}
              {auth.apiKey?.addTo === 'query' ? 'query parameter' : 'custom header'}.
            </div>
          </div>
        );

      case 'none':
      default:
        return (
          <div className="auth-none-message">
            This request does not use any authorization.
          </div>
        );
    }
  };

  return (
    <div className="auth-tab">
      <div className="auth-type-selector">
        {authTypes.map((type) => (
          <button
            key={type.value}
            className={`auth-type-button ${auth.type === type.value ? 'active' : ''}`}
            onClick={() => handleTypeChange(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>
      {renderAuthForm()}
    </div>
  );
}
