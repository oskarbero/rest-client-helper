import React from 'react';
import { KeyValuePair } from '../../../core/types';

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
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
            <input
              type="text"
              className="kv-input kv-key"
              placeholder={keyPlaceholder}
              value={pair.key}
              onChange={(e) => handleChange(index, 'key', e.target.value)}
            />
            <input
              type="text"
              className="kv-input kv-value"
              placeholder={valuePlaceholder}
              value={pair.value}
              onChange={(e) => handleChange(index, 'value', e.target.value)}
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
