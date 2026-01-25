import React from 'react';

interface ResponseHeadersProps {
  headers: Record<string, string>;
}

export function ResponseHeaders({ headers }: ResponseHeadersProps) {
  const headerEntries = Object.entries(headers);

  if (headerEntries.length === 0) {
    return (
      <div className="response-headers-empty">
        No response headers
      </div>
    );
  }

  return (
    <div className="response-headers">
      <table className="headers-table">
        <thead>
          <tr>
            <th className="header-name-col">Name</th>
            <th className="header-value-col">Value</th>
          </tr>
        </thead>
        <tbody>
          {headerEntries.map(([name, value]) => (
            <tr key={name}>
              <td className="header-name">{name}</td>
              <td className="header-value">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
