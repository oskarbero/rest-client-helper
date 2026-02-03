import React, { useMemo } from 'react';
import { AuthConfig, AuthType, CollectionSettings, Environment } from '@core';
import { VariableInput } from '../common/VariableInput';

interface AuthTabProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
  collectionSettings?: CollectionSettings;
  activeEnvironment?: Environment | null;
}

const authTypes: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
];

export function AuthTab({ auth, onChange, collectionSettings, activeEnvironment }: AuthTabProps) {

  // Check if we're using inherited values
  const isInherited = useMemo(() => {
    return auth.type === 'none' && !auth.disableInherit && collectionSettings?.auth && collectionSettings.auth.type !== 'none';
  }, [auth, collectionSettings]);

  const handleTypeChange = (type: AuthType) => {
    // When switching to any auth type, disable inheritance if currently inheriting
    if (type === 'none') {
      // When switching to 'none', set disableInherit to true (explicit no auth)
      onChange({
        ...auth,
        type: 'none',
        disableInherit: true,
      });
    } else {
      // When switching to a specific auth type, disable inheritance and use request's own fields
      onChange({
        ...auth,
        type,
        disableInherit: true, // Disable inheritance when selecting a specific auth type
      });
    }
  };

  const handleInheritanceToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Enable inheritance: set type to 'none' and disableInherit to false
      onChange({
        ...auth,
        type: 'none',
        disableInherit: false,
      });
    } else {
      // Disable inheritance: set disableInherit to true
      onChange({
        ...auth,
        type: auth.type === 'none' ? 'none' : auth.type, // Keep current type or 'none'
        disableInherit: true,
      });
    }
  };

  const getAuthTypeLabel = (type: AuthType): string => {
    const typeMap: Record<AuthType, string> = {
      'none': 'No Auth',
      'basic': 'Basic Auth',
      'bearer': 'Bearer Token',
      'api-key': 'API Key',
    };
    return typeMap[type] || 'Unknown';
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
    // If inherited, don't show any form
    if (isInherited) {
      return null;
    }

    // Request-specific auth forms (not inherited)
    const authType = auth.type;

    switch (authType) {
      case 'basic':
        return (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Username</label>
              <VariableInput
                value={auth.basic?.username || ''}
                onChange={(value) => handleBasicChange('username', value)}
                placeholder="Enter username or {{username}}"
                activeEnvironment={activeEnvironment ?? null}
                className="auth-input"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <VariableInput
                value={auth.basic?.password || ''}
                onChange={(value) => handleBasicChange('password', value)}
                placeholder="Enter password or {{password}}"
                activeEnvironment={activeEnvironment ?? null}
                className="auth-input"
              />
            </div>
            <div className="auth-info">
              The username and password will be Base64 encoded and sent in the{' '}
              <code>Authorization</code> header. You can use variables like <code>{'{{username}}'}</code> or <code>{'{{password}}'}</code>.
            </div>
          </div>
        );

      case 'bearer':
        return (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Token</label>
              <VariableInput
                value={auth.bearer?.token || ''}
                onChange={(value) => handleBearerChange(value)}
                placeholder="Enter token or {{token}}"
                activeEnvironment={activeEnvironment ?? null}
                className="auth-input"
              />
            </div>
            <div className="auth-info">
              The token will be sent in the <code>Authorization</code> header as{' '}
              <code>Bearer &lt;token&gt;</code>. You can use variables like <code>{'{{token}}'}</code> or <code>{'{{apiKey}}'}</code>.
            </div>
          </div>
        );

      case 'api-key':
        return (
          <div className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Key</label>
              <VariableInput
                value={auth.apiKey?.key || ''}
                onChange={(value) => handleApiKeyChange('key', value)}
                placeholder="e.g., X-API-Key, api_key or {{apiKeyName}}"
                activeEnvironment={activeEnvironment ?? null}
                className="auth-input"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Value</label>
              <VariableInput
                value={auth.apiKey?.value || ''}
                onChange={(value) => handleApiKeyChange('value', value)}
                placeholder="Enter API key value or {{apiKey}}"
                activeEnvironment={activeEnvironment ?? null}
                className="auth-input"
              />
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
              {auth.apiKey?.addTo === 'query' ? 'query parameter' : 'custom header'}. You can use variables like <code>{'{{apiKey}}'}</code> for the key name or value.
            </div>
          </div>
        );

      case 'none':
      default:
        return (
          <div className="auth-form">
            <div className="auth-info">
              This request does not use any authorization.
            </div>
          </div>
        );
    }
  };

  // Determine which button should be active
  const getActiveButton = () => {
    // When inherited, show the inherited auth type's button as active for visual reference
    if (isInherited && collectionSettings?.auth) {
      return collectionSettings.auth.type;
    }
    if (auth.type === 'none' && auth.disableInherit) {
      return 'none';
    }
    return auth.type;
  };

  const activeButton = getActiveButton();

  return (
    <div className="auth-tab">
      {collectionSettings?.auth && collectionSettings.auth.type !== 'none' && (
        <div className="auth-inheritance-indicator">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              checked={!auth.disableInherit}
              onChange={handleInheritanceToggle}
            />
            <span>Inherited from collection</span>
          </label>
          {!auth.disableInherit && (
            <span className="auth-inherited-type-text">
              ({getAuthTypeLabel(collectionSettings.auth.type)})
            </span>
          )}
        </div>
      )}
      <div className="auth-type-selector">
        {authTypes.map((type) => (
          <button
            key={type.value}
            className={`auth-type-button ${activeButton === type.value ? 'active' : ''}`}
            onClick={() => handleTypeChange(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>
      {!isInherited && renderAuthForm()}
    </div>
  );
}
