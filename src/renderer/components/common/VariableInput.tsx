import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Environment, EnvironmentVariable } from '../../../core/types';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  activeEnvironment: Environment | null;
  onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

interface TextSegment {
  type: 'text' | 'variable';
  content: string;
  variableName?: string;
  isRecognized?: boolean;
  variableValue?: string;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  variableName: string;
  variableValue: string;
}

interface AutocompleteState {
  show: boolean;
  x: number;
  y: number;
  query: string;
  selectedIndex: number;
  matches: string[];
  variableStart: number;
  variableEnd: number;
}

/**
 * Parse text to identify {{variable}} patterns
 */
function parseText(text: string): TextSegment[] {
  if (!text) return [];
  
  const segments: TextSegment[] = [];
  const regex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }
    
    // Add the variable segment
    const variableName = match[1].trim();
    segments.push({
      type: 'variable',
      content: match[0],
      variableName,
    });
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }
  
  return segments.length > 0 ? segments : [{ type: 'text', content: text }];
}

/**
 * Create a lookup map from environment variables
 */
function createVariableMap(variables: EnvironmentVariable[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const variable of variables) {
    if (variable.key) {
      map.set(variable.key, variable.value || '');
    }
  }
  return map;
}

/**
 * Enrich segments with variable recognition
 */
function enrichSegments(
  segments: TextSegment[],
  variableMap: Map<string, string>
): TextSegment[] {
  return segments.map(segment => {
    if (segment.type === 'variable' && segment.variableName) {
      const value = variableMap.get(segment.variableName);
      if (value !== undefined) {
        return {
          ...segment,
          isRecognized: true,
          variableValue: value,
        };
      }
    }
    return segment;
  });
}

/**
 * Detect if cursor is in a variable context (between {{ and }})
 */
function detectVariableContext(
  container: HTMLElement,
  text: string,
  cursorOffset: number
): { inContext: boolean; query: string; start: number; end: number } {
  if (!text || cursorOffset < 0 || cursorOffset > text.length) {
    return { inContext: false, query: '', start: 0, end: 0 };
  }

  // Find the nearest {{ before or at cursor
  let openIndex = -1;
  for (let i = Math.min(cursorOffset, text.length - 1); i >= 1; i--) {
    if (text[i - 1] === '{' && text[i] === '{') {
      openIndex = i - 1;
      break;
    }
  }

  if (openIndex === -1) {
    return { inContext: false, query: '', start: 0, end: 0 };
  }

  // Find the nearest }} after the opening {{
  let closeIndex = -1;
  for (let i = openIndex + 2; i < text.length - 1; i++) {
    if (text[i] === '}' && text[i + 1] === '}') {
      closeIndex = i;
      break;
    }
  }

  // Check if cursor is between {{ and }} (or before }} if it exists)
  // Cursor can be at openIndex+2 (right after {{) or anywhere before closeIndex+1
  const cursorInContext = closeIndex === -1 || cursorOffset <= closeIndex + 1;
  
  if (!cursorInContext || cursorOffset < openIndex + 2) {
    return { inContext: false, query: '', start: 0, end: 0 };
  }

  // Extract the query (text between {{ and cursor, but not including }} if it exists)
  const queryStart = openIndex + 2;
  const queryEnd = closeIndex !== -1 
    ? Math.min(cursorOffset, closeIndex) 
    : cursorOffset;
  const query = text.substring(queryStart, queryEnd);

  return {
    inContext: true,
    query,
    start: openIndex,
    end: closeIndex !== -1 ? closeIndex + 2 : text.length,
  };
}

/**
 * Get matching variable keys based on query
 */
function getMatchingVariables(query: string, variableKeys: string[]): string[] {
  if (!variableKeys || variableKeys.length === 0) {
    return [];
  }

  if (!query) {
    return variableKeys;
  }

  const lowerQuery = query.toLowerCase();
  return variableKeys.filter(key => 
    key.toLowerCase().startsWith(lowerQuery)
  );
}

export function VariableInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  activeEnvironment,
  onFocus,
  onBlur,
  onKeyDown,
}: VariableInputProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    variableName: '',
    variableValue: '',
  });
  const [isFocused, setIsFocused] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({
    show: false,
    x: 0,
    y: 0,
    query: '',
    selectedIndex: 0,
    matches: [],
    variableStart: 0,
    variableEnd: 0,
  });

  // Create variable lookup map
  const variableMap = useMemo(() => {
    if (!activeEnvironment || !activeEnvironment.variables) {
      return new Map<string, string>();
    }
    return createVariableMap(activeEnvironment.variables);
  }, [activeEnvironment]);

  // Get list of variable keys for autocomplete
  const variableKeys = useMemo(() => {
    if (!activeEnvironment || !activeEnvironment.variables) {
      return [];
    }
    return activeEnvironment.variables
      .filter(v => v.key)
      .map(v => v.key);
  }, [activeEnvironment]);

  // Parse and enrich text segments
  const segments = useMemo(() => {
    const parsed = parseText(value);
    return enrichSegments(parsed, variableMap);
  }, [value, variableMap]);

  // Render content into contentEditable
  const renderContent = useCallback(() => {
    if (!contentEditableRef.current) return;

    const container = contentEditableRef.current;
    const currentText = container.textContent || '';
    
    // Don't re-render if user is actively typing (text matches)
    if (isFocused && currentText === value) {
      return;
    }

    // Save cursor position if focused
    const selection = window.getSelection();
    let cursorPosition = 0;
    if (selection && selection.rangeCount > 0 && container.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(container);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      cursorPosition = preCaretRange.toString().length;
    }

    container.innerHTML = '';

    segments.forEach((segment) => {
      if (segment.type === 'text') {
        const textNode = document.createTextNode(segment.content);
        container.appendChild(textNode);
      } else if (segment.type === 'variable') {
        const span = document.createElement('span');
        span.textContent = segment.content;
        
        if (segment.isRecognized) {
          span.className = 'variable-input-link';
          span.setAttribute('data-variable-name', segment.variableName || '');
          span.setAttribute('data-variable-value', segment.variableValue || '');
          span.style.cursor = 'pointer';
          
          // Add hover event listeners
          const handleMouseEnter = () => {
            const rect = span.getBoundingClientRect();
            setTooltip({
              show: true,
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
              variableName: segment.variableName || '',
              variableValue: segment.variableValue || '',
            });
          };
          
          const handleMouseLeave = () => {
            setTooltip(prev => ({ ...prev, show: false }));
          };
          
          span.addEventListener('mouseenter', handleMouseEnter);
          span.addEventListener('mouseleave', handleMouseLeave);
          
          // Store handlers for cleanup
          (span as any)._mouseEnter = handleMouseEnter;
          (span as any)._mouseLeave = handleMouseLeave;
        } else {
          span.className = 'variable-input-highlight';
        }
        
        container.appendChild(span);
      }
    });

    // Restore cursor position if focused
    if (isFocused && cursorPosition > 0) {
      try {
        const range = document.createRange();
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let currentPos = 0;
        let textNode: Node | null = null;
        
        while ((textNode = walker.nextNode())) {
          const nodeLength = textNode.textContent?.length || 0;
          if (currentPos + nodeLength >= cursorPosition) {
            range.setStart(textNode, cursorPosition - currentPos);
            range.setEnd(textNode, cursorPosition - currentPos);
            selection?.removeAllRanges();
            selection?.addRange(range);
            break;
          }
          currentPos += nodeLength;
        }
      } catch (e) {
        // Ignore cursor restoration errors
      }
    }
  }, [segments, isFocused, value]);

  // Update contentEditable content when value or segments change
  useEffect(() => {
    if (contentEditableRef.current) {
      renderContent();
    }
  }, [renderContent]);

  // Get cursor position in text
  const getCursorPosition = useCallback((): number => {
    if (!contentEditableRef.current) return 0;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    const container = contentEditableRef.current;
    
    if (!container.contains(range.commonAncestorContainer)) {
      return container.textContent?.length || 0;
    }
    
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(container);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  }, []);

  // Get cursor position for autocomplete positioning
  const getCursorRect = useCallback((): DOMRect | null => {
    if (!contentEditableRef.current) return null;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const container = contentEditableRef.current;
    
    if (!container.contains(range.commonAncestorContainer)) {
      return container.getBoundingClientRect();
    }
    
    const rect = range.getBoundingClientRect();
    return rect;
  }, []);

  // Handle input events
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || '';
    onChange(text);
    
      // Check for variable context after a short delay to allow DOM to update
      setTimeout(() => {
        if (!contentEditableRef.current || !isFocused) {
          setAutocomplete(prev => ({ ...prev, show: false }));
          return;
        }
        
        // Don't show autocomplete if no active environment or no variables
        if (!activeEnvironment || !activeEnvironment.variables || variableKeys.length === 0) {
          setAutocomplete(prev => ({ ...prev, show: false }));
          return;
        }
        
        const cursorPos = getCursorPosition();
        const context = detectVariableContext(contentEditableRef.current, text, cursorPos);
        
        // Check if we're in a variable context
        if (context.inContext) {
          const matches = getMatchingVariables(context.query, variableKeys);
          const cursorRect = getCursorRect();
          
          if (matches.length > 0 && cursorRect) {
            setAutocomplete({
              show: true,
              x: cursorRect.left,
              y: cursorRect.bottom,
              query: context.query,
              selectedIndex: 0,
              matches,
              variableStart: context.start,
              variableEnd: context.end,
            });
          } else {
            setAutocomplete(prev => ({ ...prev, show: false }));
          }
        } else {
          setAutocomplete(prev => ({ ...prev, show: false }));
        }
      }, 0);
  }, [onChange, isFocused, activeEnvironment, variableKeys, getCursorPosition, getCursorRect]);

  // Handle focus
  const handleFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  // Insert variable into text
  const insertVariable = useCallback((variableKey: string) => {
    if (!contentEditableRef.current) return;
    
    const text = contentEditableRef.current.textContent || '';
    const { variableStart, variableEnd } = autocomplete;
    
    // Replace the variable context with {{variableKey}}
    const before = text.substring(0, variableStart);
    const after = text.substring(variableEnd);
    const newText = `${before}{{${variableKey}}}${after}`;
    
    onChange(newText);
    
    // Close autocomplete
    setAutocomplete(prev => ({ ...prev, show: false }));
    
    // Set cursor after the inserted variable
    setTimeout(() => {
      if (!contentEditableRef.current) return;
      
      const newCursorPos = before.length + `{{${variableKey}}}`.length;
      const selection = window.getSelection();
      if (!selection) return;
      
      const range = document.createRange();
      const walker = document.createTreeWalker(
        contentEditableRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let currentPos = 0;
      let textNode: Node | null = null;
      
      while ((textNode = walker.nextNode())) {
        const nodeLength = textNode.textContent?.length || 0;
        if (currentPos + nodeLength >= newCursorPos) {
          range.setStart(textNode, newCursorPos - currentPos);
          range.setEnd(textNode, newCursorPos - currentPos);
          selection.removeAllRanges();
          selection.addRange(range);
          break;
        }
        currentPos += nodeLength;
      }
    }, 0);
  }, [autocomplete, onChange]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle autocomplete navigation
    if (autocomplete.show && autocomplete.matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.matches.length,
        }));
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete(prev => ({
          ...prev,
          selectedIndex: prev.selectedIndex === 0 
            ? prev.matches.length - 1 
            : prev.selectedIndex - 1,
        }));
        return;
      }
      
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selectedKey = autocomplete.matches[autocomplete.selectedIndex];
        if (selectedKey) {
          insertVariable(selectedKey);
        }
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, show: false }));
        return;
      }
      
      // Close autocomplete on arrow left/right
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setAutocomplete(prev => ({ ...prev, show: false }));
      }
    }
    
    // Call original onKeyDown handler
    onKeyDown?.(e);
  }, [autocomplete, insertVariable, onKeyDown]);

  // Handle blur
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(false);
    // Close autocomplete on blur (with delay to allow click events)
    setTimeout(() => {
      setAutocomplete(prev => ({ ...prev, show: false }));
      if (contentEditableRef.current) {
        renderContent();
      }
    }, 150);
    onBlur?.(e);
  }, [onBlur, renderContent]);

  // Position tooltip
  useEffect(() => {
    if (tooltip.show && tooltipRef.current) {
      const tooltipEl = tooltipRef.current;
      const rect = tooltipEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = tooltip.x;
      let y = tooltip.y - rect.height - 4;
      
      // Adjust if tooltip goes off screen
      if (x + rect.width / 2 > viewportWidth) {
        x = viewportWidth - rect.width / 2 - 8;
      }
      if (x - rect.width / 2 < 0) {
        x = rect.width / 2 + 8;
      }
      if (y < 0) {
        y = tooltip.y + 20;
      }
      
      tooltipEl.style.left = `${x}px`;
      tooltipEl.style.top = `${y}px`;
      tooltipEl.style.transform = 'translateX(-50%)';
    }
  }, [tooltip]);

  // Position autocomplete
  useEffect(() => {
    if (autocomplete.show && autocompleteRef.current) {
      const autocompleteEl = autocompleteRef.current;
      const rect = autocompleteEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = autocomplete.x;
      let y = autocomplete.y + 4;
      
      // Adjust if autocomplete goes off screen
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 8;
      }
      if (x < 8) {
        x = 8;
      }
      if (y + rect.height > viewportHeight) {
        y = autocomplete.y - rect.height - 4;
      }
      if (y < 8) {
        y = 8;
      }
      
      autocompleteEl.style.left = `${x}px`;
      autocompleteEl.style.top = `${y}px`;
    }
  }, [autocomplete]);

  return (
    <div className={`variable-input-wrapper ${className}`}>
      <div
        ref={contentEditableRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`variable-input ${disabled ? 'disabled' : ''}`}
        suppressContentEditableWarning
      />
      {!value && !isFocused && placeholder && (
        <div className="variable-input-placeholder">{placeholder}</div>
      )}
      {tooltip.show && (
        <div
          ref={tooltipRef}
          className="variable-input-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 8}px`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        >
          <div className="variable-input-tooltip-value">{tooltip.variableValue}</div>
        </div>
      )}
      {autocomplete.show && autocomplete.matches.length > 0 && (
        <div
          ref={autocompleteRef}
          className="variable-input-autocomplete"
          style={{
            position: 'fixed',
            left: `${autocomplete.x}px`,
            top: `${autocomplete.y + 4}px`,
            zIndex: 10001,
          }}
        >
          {autocomplete.matches.map((match, index) => (
            <div
              key={match}
              className={`variable-input-autocomplete-item ${
                index === autocomplete.selectedIndex ? 'selected' : ''
              }`}
              onMouseEnter={() => setAutocomplete(prev => ({ ...prev, selectedIndex: index }))}
              onMouseDown={(e) => {
                e.preventDefault();
                insertVariable(match);
              }}
            >
              {match}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
