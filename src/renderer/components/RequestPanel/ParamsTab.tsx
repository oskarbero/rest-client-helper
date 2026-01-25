import React from 'react';
import { KeyValuePair } from '../../../core/types';
import { KeyValueEditor } from '../common/KeyValueEditor';

interface ParamsTabProps {
  params: KeyValuePair[];
  onChange: (params: KeyValuePair[]) => void;
}

export function ParamsTab({ params, onChange }: ParamsTabProps) {
  return (
    <div className="params-tab">
      <p className="tab-description">
        Query parameters will be appended to the URL as <code>?key=value&amp;key2=value2</code>
      </p>
      <KeyValueEditor
        pairs={params}
        onChange={onChange}
        keyPlaceholder="Parameter name"
        valuePlaceholder="Parameter value"
      />
    </div>
  );
}
