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

  // Create variable lookup map
  const variableMap = useMemo(() => {
    if (!activeEnvironment || !activeEnvironment.variables) {
      return new Map<string, string>();
    }
    return createVariableMap(activeEnvironment.variables);
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

  // Handle input events
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || '';
    onChange(text);
  }, [onChange]);

  // Handle focus
  const handleFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  // Handle blur
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(false);
    // Re-render on blur to ensure proper formatting
    setTimeout(() => {
      if (contentEditableRef.current) {
        renderContent();
      }
    }, 0);
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

  return (
    <div className={`variable-input-wrapper ${className}`}>
      <div
        ref={contentEditableRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
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
    </div>
  );
}
