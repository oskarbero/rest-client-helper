import React, { useState, useMemo } from 'react';
import { AuthConfig, AuthType, CollectionSettings, Environment } from '../../../core/types';
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

  // Calculate effective auth config: use request auth if not 'none', otherwise use collection auth
  // But only if disableInherit is not true
  const effectiveAuth = useMemo(() => {
    if (auth.type !== 'none') {
      return auth;
    }
    // If disableInherit is true, don't inherit
    if (auth.disableInherit) {
      return auth;
    }
    // Otherwise, inherit from collection if available
    if (collectionSettings?.auth && collectionSettings.auth.type !== 'none') {
      return collectionSettings.auth;
    }
    return auth;
  }, [auth, collectionSettings]);

  // Check if we're using inherited values
  const isInherited = useMemo(() => {
    return auth.type === 'none' && !auth.disableInherit && collectionSettings?.auth && collectionSettings.auth.type !== 'none';
  }, [auth, collectionSettings]);

  const handleTypeChange = (type: AuthType) => {
    // When changing type, if we were inheriting, we need to copy the inherited values
    if (isInherited && type !== 'none' && collectionSettings?.auth) {
      // Copy inherited auth config but change the type
      onChange({
        ...collectionSettings.auth,
        type,
        disableInherit: undefined, // Clear disableInherit when switching away from 'none'
      });
    } else if (type === 'none') {
      // When switching to 'none', preserve disableInherit if it was set, otherwise default to false (inherit)
      onChange({
        ...auth,
        type: 'none',
        disableInherit: auth.disableInherit || false,
      });
    } else {
      // Preserve existing config data when switching types, but clear disableInherit
      onChange({
        ...auth,
        type,
        disableInherit: undefined,
      });
    }
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
    const displayAuth = effectiveAuth;
    const authType = displayAuth.type;

    switch (authType) {
      case 'basic':
        return (
          <div className="auth-form">
            {isInherited && (
              <div className="auth-inherited-notice">
                <span className="auth-inherited-badge">Inherited from collection</span>
              </div>
            )}
            <div className="auth-field">
              <label className="auth-label">Username</label>
              <VariableInput
                value={displayAuth.basic?.username || ''}
                onChange={(value) => {
                  // When user edits, copy inherited values and override
                  if (isInherited) {
                    onChange({
                      ...collectionSettings!.auth!,
                      basic: {
                        ...collectionSettings!.auth!.basic!,
                        username: value,
                      },
                    });
                  } else {
                    handleBasicChange('username', value);
                  }
                }}
                placeholder="Enter username or {{username}}"
                activeEnvironment={activeEnvironment ?? null}
                className={`auth-input ${isInherited ? 'auth-input-inherited' : ''}`}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <VariableInput
                value={displayAuth.basic?.password || ''}
                onChange={(value) => {
                  // When user edits, copy inherited values and override
                  if (isInherited) {
                    onChange({
                      ...collectionSettings!.auth!,
                      basic: {
                        ...collectionSettings!.auth!.basic!,
                        password: value,
                      },
                    });
                  } else {
                    handleBasicChange('password', value);
                  }
                }}
                placeholder="Enter password or {{password}}"
                activeEnvironment={activeEnvironment ?? null}
                className={`auth-input ${isInherited ? 'auth-input-inherited' : ''}`}
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
            {isInherited && (
              <div className="auth-inherited-notice">
                <span className="auth-inherited-badge">Inherited from collection</span>
              </div>
            )}
            <div className="auth-field">
              <label className="auth-label">Token</label>
              <VariableInput
                value={displayAuth.bearer?.token || ''}
                onChange={(value) => {
                  // When user edits, copy inherited values and override
                  if (isInherited) {
                    onChange({
                      ...collectionSettings!.auth!,
                      bearer: {
                        token: value,
                      },
                    });
                  } else {
                    handleBearerChange(value);
                  }
                }}
                placeholder="Enter token or {{token}}"
                activeEnvironment={activeEnvironment ?? null}
                className={`auth-input ${isInherited ? 'auth-input-inherited' : ''}`}
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
            {isInherited && (
              <div className="auth-inherited-notice">
                <span className="auth-inherited-badge">Inherited from collection</span>
              </div>
            )}
            <div className="auth-field">
              <label className="auth-label">Key</label>
              <VariableInput
                value={displayAuth.apiKey?.key || ''}
                onChange={(value) => {
                  // When user edits, copy inherited values and override
                  if (isInherited) {
                    onChange({
                      ...collectionSettings!.auth!,
                      apiKey: {
                        ...collectionSettings!.auth!.apiKey!,
                        key: value,
                      },
                    });
                  } else {
                    handleApiKeyChange('key', value);
                  }
                }}
                placeholder="e.g., X-API-Key, api_key or {{apiKeyName}}"
                activeEnvironment={activeEnvironment ?? null}
                className={`auth-input ${isInherited ? 'auth-input-inherited' : ''}`}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Value</label>
              <VariableInput
                value={displayAuth.apiKey?.value || ''}
                onChange={(value) => {
                  // When user edits, copy inherited values and override
                  if (isInherited) {
                    onChange({
                      ...collectionSettings!.auth!,
                      apiKey: {
                        ...collectionSettings!.auth!.apiKey!,
                        value: value,
                      },
                    });
                  } else {
                    handleApiKeyChange('value', value);
                  }
                }}
                placeholder="Enter API key value or {{apiKey}}"
                activeEnvironment={activeEnvironment ?? null}
                className={`auth-input ${isInherited ? 'auth-input-inherited' : ''}`}
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
                    checked={displayAuth.apiKey?.addTo !== 'query'}
                    onChange={() => {
                      if (isInherited) {
                        onChange({
                          ...collectionSettings!.auth!,
                          apiKey: {
                            ...collectionSettings!.auth!.apiKey!,
                            addTo: 'header',
                          },
                        });
                      } else {
                        handleApiKeyChange('addTo', 'header');
                      }
                    }}
                  />
                  Header
                </label>
                <label className="auth-radio-label">
                  <input
                    type="radio"
                    name="apiKeyAddTo"
                    value="query"
                    checked={displayAuth.apiKey?.addTo === 'query'}
                    onChange={() => {
                      if (isInherited) {
                        onChange({
                          ...collectionSettings!.auth!,
                          apiKey: {
                            ...collectionSettings!.auth!.apiKey!,
                            addTo: 'query',
                          },
                        });
                      } else {
                        handleApiKeyChange('addTo', 'query');
                      }
                    }}
                  />
                  Query Params
                </label>
              </div>
            </div>
            <div className="auth-info">
              The API key will be added as a{' '}
              {displayAuth.apiKey?.addTo === 'query' ? 'query parameter' : 'custom header'}. You can use variables like <code>{'{{apiKey}}'}</code> for the key name or value.
            </div>
          </div>
        );

      case 'none':
      default:
        return (
          <div className="auth-form">
            {isInherited && collectionSettings?.auth && (
              <div className="auth-inherited-notice">
                <span className="auth-inherited-badge">Inherited from collection</span>
              </div>
            )}
            <div className="auth-field">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={auth.disableInherit || false}
                  onChange={(e) => {
                    onChange({
                      ...auth,
                      type: 'none',
                      disableInherit: e.target.checked,
                    });
                  }}
                />
                <span>Disable inherit</span>
              </label>
            </div>
            <div className="auth-info">
              {auth.disableInherit ? (
                <>
                  This request does not use any authorization and will not inherit from collection settings.
                </>
              ) : collectionSettings?.auth && collectionSettings.auth.type !== 'none' ? (
                <>
                  This request will inherit authentication from the collection settings.
                </>
              ) : (
                <>
                  This request does not use any authorization.
                </>
              )}
            </div>
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
            className={`auth-type-button ${effectiveAuth.type === type.value ? 'active' : ''}`}
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
