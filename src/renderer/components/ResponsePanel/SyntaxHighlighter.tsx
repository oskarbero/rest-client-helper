import React from 'react';
import { Token, tokenizeJson, detectContentType, formatJson, formatXml } from '../../../core/response-parser';

interface SyntaxHighlighterProps {
  content: string;
  contentType: string;
}

export function SyntaxHighlighter({ content, contentType }: SyntaxHighlighterProps) {
  const type = detectContentType(contentType, content);
  
  if (type === 'json') {
    try {
      const formatted = formatJson(content);
      const tokens = tokenizeJson(formatted);
      return <JsonHighlight tokens={tokens} />;
    } catch {
      return <pre className="response-pre">{content}</pre>;
    }
  }
  
  if (type === 'xml' || type === 'html') {
    const formatted = formatXml(content);
    return <XmlHighlight content={formatted} />;
  }
  
  return <pre className="response-pre">{content}</pre>;
}

function JsonHighlight({ tokens }: { tokens: Token[] }) {
  return (
    <pre className="response-pre syntax-json">
      {tokens.map((token, i) => (
        <span key={i} className={`token-${token.type}`}>
          {token.value}
        </span>
      ))}
    </pre>
  );
}

function XmlHighlight({ content }: { content: string }) {
  // Simple XML highlighting using regex
  const highlighted = content.split(/(<[^>]+>)/g).map((part, i) => {
    if (part.startsWith('</')) {
      // Closing tag
      return (
        <span key={i} className="token-tag">{part}</span>
      );
    } else if (part.startsWith('<?')) {
      // XML declaration
      return (
        <span key={i} className="token-punctuation">{part}</span>
      );
    } else if (part.startsWith('<')) {
      // Opening tag - highlight attributes
      const match = part.match(/^(<\w+)(.*?)(\/?>)$/s);
      if (match) {
        const [, tagStart, attrs, tagEnd] = match;
        return (
          <span key={i}>
            <span className="token-tag">{tagStart}</span>
            <span className="token-attribute">{attrs}</span>
            <span className="token-tag">{tagEnd}</span>
          </span>
        );
      }
      return <span key={i} className="token-tag">{part}</span>;
    }
    // Text content
    return <span key={i}>{part}</span>;
  });
  
  return (
    <pre className="response-pre syntax-xml">
      {highlighted}
    </pre>
  );
}
