import React from 'react';
import { KeyValuePair, Environment } from '@core';
import { VariableInput } from './VariableInput';

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  activeEnvironment?: Environment | null;
}

export function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  activeEnvironment = null,
}: KeyValueEditorProps) {
  const handleChange = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], [field]: value };
    onChange(newPairs);
  };

  const handleAdd = () => {
    onChange([...pairs, { key: '', value: '', enabled: true }]);
  };

  const handleRemove = (index: number) => {
    const newPairs = pairs.filter((_, i) => i !== index);
    onChange(newPairs);
  };

  return (
    <div className="key-value-editor">
      <div className="kv-header">
        <span className="kv-col-checkbox"></span>
        <span className="kv-col-key">{keyPlaceholder}</span>
        <span className="kv-col-value">{valuePlaceholder}</span>
        <span className="kv-col-actions"></span>
      </div>
      <div className="kv-rows">
        {pairs.map((pair, index) => (
          <div key={index} className={`kv-row ${!pair.enabled ? 'disabled' : ''}`}>
            <input
              type="checkbox"
              className="kv-checkbox"
              checked={pair.enabled}
              onChange={(e) => handleChange(index, 'enabled', e.target.checked)}
            />
            <VariableInput
              value={pair.key}
              onChange={(value) => handleChange(index, 'key', value)}
              placeholder={keyPlaceholder}
              activeEnvironment={activeEnvironment}
              className="kv-input kv-key"
            />
            <VariableInput
              value={pair.value}
              onChange={(value) => handleChange(index, 'value', value)}
              placeholder={valuePlaceholder}
              activeEnvironment={activeEnvironment}
              className="kv-input kv-value"
            />
            <button
              className="kv-remove"
              onClick={() => handleRemove(index)}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="kv-add" onClick={handleAdd}>
        + Add
      </button>
    </div>
  );
}
