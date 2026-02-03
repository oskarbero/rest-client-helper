import React from 'react';
import { RequestBody, BodyType } from '@core';

interface BodyTabProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
}

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'form-data', label: 'Form Data' },
];

export function BodyTab({ body, onChange }: BodyTabProps) {
  const handleTypeChange = (type: BodyType) => {
    onChange({ ...body, type });
  };

  const handleContentChange = (content: string) => {
    onChange({ ...body, content });
  };

  const formatJson = () => {
    if (body.type === 'json' && body.content) {
      try {
        const parsed = JSON.parse(body.content);
        const formatted = JSON.stringify(parsed, null, 2);
        onChange({ ...body, content: formatted });
      } catch {
        // Invalid JSON, don't format
      }
    }
  };

  return (
    <div className="body-tab">
      <div className="body-type-selector">
        {BODY_TYPES.map((type) => (
          <button
            key={type.value}
            className={`body-type-button ${body.type === type.value ? 'active' : ''}`}
            onClick={() => handleTypeChange(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      {body.type === 'none' ? (
        <div className="body-none-message">
          This request does not have a body
        </div>
      ) : body.type === 'form-data' ? (
        <div className="body-none-message">
          Form data editor coming soon
        </div>
      ) : (
        <div className="body-editor">
          <div className="body-editor-header">
            <span className="body-editor-label">
              {body.type === 'json' ? 'JSON' : 'Plain Text'}
            </span>
            {body.type === 'json' && (
              <button className="body-format-button" onClick={formatJson}>
                Format JSON
              </button>
            )}
          </div>
          <textarea
            className="body-textarea"
            placeholder={
              body.type === 'json'
                ? '{\n  "key": "value"\n}'
                : 'Enter request body...'
            }
            value={body.content}
            onChange={(e) => handleContentChange(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}
