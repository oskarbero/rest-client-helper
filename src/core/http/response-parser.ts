/**
 * Response Parser - Formats and parses HTTP response bodies
 * Supports JSON and XML pretty-printing with syntax highlighting tokens
 */

export type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'tag' | 'attribute' | 'text';

export interface Token {
  type: TokenType;
  value: string;
}

/**
 * Detects the content type from headers or content inspection
 */
export function detectContentType(contentType: string, body: string): 'json' | 'xml' | 'html' | 'text' {
  const lowerContentType = contentType.toLowerCase();
  
  if (lowerContentType.includes('application/json') || lowerContentType.includes('+json')) {
    return 'json';
  }
  
  if (lowerContentType.includes('application/xml') || lowerContentType.includes('text/xml') || lowerContentType.includes('+xml')) {
    return 'xml';
  }
  
  if (lowerContentType.includes('text/html')) {
    return 'html';
  }
  
  // Try to detect by content if content-type is ambiguous
  const trimmed = body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(body);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }
  
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
    return 'xml';
  }
  
  return 'text';
}

/**
 * Pretty-prints JSON with proper indentation
 */
export function formatJson(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return json;
  }
}

/**
 * Pretty-prints XML with proper indentation
 */
export function formatXml(xml: string): string {
  try {
    let formatted = '';
    let indent = 0;
    const parts = xml.replace(/>\s*</g, '><').split(/(<[^>]+>)/);
    
    for (const part of parts) {
      if (!part.trim()) continue;
      
      // Closing tag
      if (part.match(/^<\/\w/)) {
        indent = Math.max(0, indent - 1);
      }
      
      formatted += '  '.repeat(indent) + part.trim() + '\n';
      
      // Opening tag (not self-closing and not closing)
      if (part.match(/^<\w[^>]*[^/]>$/)) {
        indent++;
      }
    }
    
    return formatted.trim();
  } catch {
    return xml;
  }
}

/**
 * Tokenizes JSON for syntax highlighting
 */
export function tokenizeJson(json: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  const skipWhitespace = () => {
    while (i < json.length && /\s/.test(json[i])) {
      tokens.push({ type: 'text', value: json[i] });
      i++;
    }
  };
  
  const readString = (): string => {
    let str = json[i]; // opening quote
    i++;
    while (i < json.length && json[i] !== '"') {
      if (json[i] === '\\' && i + 1 < json.length) {
        str += json[i] + json[i + 1];
        i += 2;
      } else {
        str += json[i];
        i++;
      }
    }
    if (i < json.length) {
      str += json[i]; // closing quote
      i++;
    }
    return str;
  };
  
  const readNumber = (): string => {
    let num = '';
    while (i < json.length && /[-+0-9.eE]/.test(json[i])) {
      num += json[i];
      i++;
    }
    return num;
  };
  
  const readWord = (): string => {
    let word = '';
    while (i < json.length && /[a-z]/.test(json[i])) {
      word += json[i];
      i++;
    }
    return word;
  };
  
  let expectKey = true; // Track if we expect a key next (after { or ,)
  
  while (i < json.length) {
    skipWhitespace();
    if (i >= json.length) break;
    
    const char = json[i];
    
    if (char === '"') {
      const str = readString();
      // Determine if this is a key or a value
      skipWhitespace();
      if (json[i] === ':') {
        tokens.push({ type: 'key', value: str });
      } else {
        tokens.push({ type: 'string', value: str });
      }
      expectKey = false;
    } else if (char === ':') {
      tokens.push({ type: 'punctuation', value: char });
      i++;
      expectKey = false;
    } else if (char === ',' || char === '{' || char === '[') {
      tokens.push({ type: 'punctuation', value: char });
      i++;
      expectKey = char === '{' || char === ',';
    } else if (char === '}' || char === ']') {
      tokens.push({ type: 'punctuation', value: char });
      i++;
      expectKey = false;
    } else if (/[-0-9]/.test(char)) {
      tokens.push({ type: 'number', value: readNumber() });
      expectKey = false;
    } else if (char === 't' || char === 'f') {
      const word = readWord();
      tokens.push({ type: 'boolean', value: word });
      expectKey = false;
    } else if (char === 'n') {
      const word = readWord();
      tokens.push({ type: 'null', value: word });
      expectKey = false;
    } else {
      tokens.push({ type: 'text', value: char });
      i++;
    }
  }
  
  return tokens;
}

/**
 * Formats response body based on content type
 */
export function formatResponseBody(body: string, contentType: string): string {
  const type = detectContentType(contentType, body);
  
  switch (type) {
    case 'json':
      return formatJson(body);
    case 'xml':
    case 'html':
      return formatXml(body);
    default:
      return body;
  }
}

/**
 * Returns tokens for syntax-highlighted display
 */
export function getHighlightedTokens(body: string, contentType: string): Token[] | null {
  const type = detectContentType(contentType, body);
  
  if (type === 'json') {
    try {
      const formatted = formatJson(body);
      return tokenizeJson(formatted);
    } catch {
      return null;
    }
  }
  
  // For now, only JSON has full tokenization
  // XML/HTML could be added later
  return null;
}
