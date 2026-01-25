import React from 'react';
import { KeyValuePair } from '../../../core/types';
import { KeyValueEditor } from '../common/KeyValueEditor';

interface HeadersTabProps {
  headers: KeyValuePair[];
  onChange: (headers: KeyValuePair[]) => void;
}

export function HeadersTab({ headers, onChange }: HeadersTabProps) {
  return (
    <div className="headers-tab">
      <KeyValueEditor
        pairs={headers}
        onChange={onChange}
        keyPlaceholder="Header name"
        valuePlaceholder="Header value"
      />
    </div>
  );
}
