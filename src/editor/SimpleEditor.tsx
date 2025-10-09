import React, { useEffect, useRef } from 'react';

export default function SimpleEditor({ 
  code, 
  onChange, 
  readOnly = false 
}: { 
  code: string; 
  onChange: (v: string) => void; 
  readOnly?: boolean; 
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle tab key to insert space instead of tab character
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Insert a single space at cursor position
      const newValue = value.substring(0, start) + ' ' + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after the inserted space
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
      return;
    }

    // Handle Enter key - auto-pad to match previous cursor column
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Find current line and column position
      const beforeCursor = value.substring(0, start);
      const lastNewlinePos = beforeCursor.lastIndexOf('\n');
      const currentColumn = lastNewlinePos === -1 ? start : start - lastNewlinePos - 1;
      
      // Insert newline + spaces to match column (currentColumn - 1, but at least 0)
      const spacesToAdd = Math.max(0, currentColumn - 1);
      const padding = ' '.repeat(spacesToAdd);
      const newValue = value.substring(0, start) + '\n' + padding + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after newline and padding
      setTimeout(() => {
        const newPos = start + 1 + spacesToAdd;
        textarea.selectionStart = textarea.selectionEnd = newPos;
      }, 0);
      return;
    }

    // Handle arrow keys - auto-pad spaces for cursor movement
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      // Don't handle if there's a selection
      if (start !== end) return;

      const lines = value.split('\n');
      const beforeCursor = value.substring(0, start);
      const linesBefore = beforeCursor.split('\n');
      const currentLineIdx = linesBefore.length - 1;
      const currentColumn = linesBefore[currentLineIdx]!.length;

      let needsPadding = false;
      let targetLineIdx = currentLineIdx;
      let targetColumn = currentColumn;

      if (e.key === 'ArrowUp') {
        targetLineIdx = currentLineIdx - 1;
        targetColumn = currentColumn;
        if (targetLineIdx >= 0 && lines[targetLineIdx]!.length < targetColumn) {
          needsPadding = true;
        }
      } else if (e.key === 'ArrowDown') {
        targetLineIdx = currentLineIdx + 1;
        targetColumn = currentColumn;
        if (targetLineIdx < lines.length && lines[targetLineIdx]!.length < targetColumn) {
          needsPadding = true;
        }
      } else if (e.key === 'ArrowRight') {
        targetLineIdx = currentLineIdx;
        targetColumn = currentColumn + 1;
        if (lines[targetLineIdx]!.length < targetColumn) {
          needsPadding = true;
        }
      }

      if (needsPadding) {
        e.preventDefault();
        
        // Pad the target line with spaces
        const newLines = [...lines];
        const targetLine = newLines[targetLineIdx] || '';
        const spacesNeeded = targetColumn - targetLine.length;
        newLines[targetLineIdx] = targetLine + ' '.repeat(spacesNeeded);
        
        const newValue = newLines.join('\n');
        onChange(newValue);
        
        // Calculate new cursor position
        let newPos = 0;
        for (let i = 0; i < targetLineIdx; i++) {
          newPos += newLines[i]!.length + 1; // +1 for newline
        }
        newPos += targetColumn;
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newPos;
        }, 0);
      }
    }
  };

  // Handle text change and convert any tabs to spaces
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Replace any tab characters with single space
    const normalized = value.replace(/\t/g, ' ');
    onChange(normalized);
  };

  // Update textarea value when code prop changes
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== code) {
      const cursorPos = textareaRef.current.selectionStart;
      textareaRef.current.value = code;
      // Restore cursor position if possible
      if (cursorPos <= code.length) {
        textareaRef.current.selectionStart = cursorPos;
        textareaRef.current.selectionEnd = cursorPos;
      }
    }
  }, [code]);

  return (
    <textarea
      ref={textareaRef}
      className="simple-editor"
      value={code}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      readOnly={readOnly}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
    />
  );
}
