import React from 'react';
import { KeyValuePair, Environment } from '@core';
import { KeyValueEditor } from '../common/KeyValueEditor';

interface HeadersTabProps {
  headers: KeyValuePair[];
  onChange: (headers: KeyValuePair[]) => void;
  activeEnvironment?: Environment | null;
}

export function HeadersTab({ headers, onChange, activeEnvironment }: HeadersTabProps) {
  return (
    <div className="headers-tab">
      <KeyValueEditor
        pairs={headers}
        onChange={onChange}
        keyPlaceholder="Header name"
        valuePlaceholder="Header value"
        activeEnvironment={activeEnvironment}
      />
    </div>
  );
}
