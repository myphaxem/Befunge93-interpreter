import React, { useEffect, useRef } from 'react';

// Befunge-93 grid constraints
const MAX_COLS = 80;
const MAX_ROWS = 25;

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

  // Helper function to check if a position is within bounds
  const isWithinBounds = (line: number, col: number): boolean => {
    return line < MAX_ROWS && col < MAX_COLS;
  };

  // Helper function to get cursor line and column
  const getCursorPosition = (value: string, cursorPos: number): { line: number; col: number } => {
    const beforeCursor = value.substring(0, cursorPos);
    const lines = beforeCursor.split('\n');
    return {
      line: lines.length - 1,
      col: lines[lines.length - 1]!.length
    };
  };

  // Helper function to validate and constrain value to 80×25
  const constrainValue = (value: string): string => {
    const lines = value.split('\n');
    // Limit to MAX_ROWS lines
    const constrainedLines = lines.slice(0, MAX_ROWS);
    // Limit each line to MAX_COLS characters
    return constrainedLines.map(line => line.substring(0, MAX_COLS)).join('\n');
  };

  // Handle tab key to insert space instead of tab character
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Check if we're within bounds
      const cursorPos = getCursorPosition(value, start);
      if (!isWithinBounds(cursorPos.line, cursorPos.col + 1)) {
        return; // Ignore if would exceed bounds
      }
      
      // Insert a single space at cursor position
      const newValue = value.substring(0, start) + ' ' + value.substring(end);
      const constrained = constrainValue(newValue);
      onChange(constrained);
      
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
      const lines = value.split('\n');
      const currentLineIdx = beforeCursor.split('\n').length - 1;
      const currentLine = lines[currentLineIdx] || '';
      
      // Check if we can add another line
      if (currentLineIdx >= MAX_ROWS - 1) {
        return; // Ignore if would exceed max rows
      }
      
      // Calculate cursor position on current line
      const lastNewlinePos = beforeCursor.lastIndexOf('\n');
      const currentColumn = lastNewlinePos === -1 ? start : start - lastNewlinePos - 1;
      
      // For consecutive newlines (empty lines), maintain the column from the previous newline
      // Otherwise, use currentColumn
      const spacesToAdd = currentLine.trim() === '' && currentColumn > 0 ? currentColumn : Math.max(0, currentColumn);
      const padding = ' '.repeat(Math.min(spacesToAdd, MAX_COLS)); // Constrain padding to max cols
      const newValue = value.substring(0, start) + '\n' + padding + value.substring(end);
      const constrained = constrainValue(newValue);
      onChange(constrained);
      
      // Set cursor position after newline and padding
      setTimeout(() => {
        const newPos = start + 1 + Math.min(spacesToAdd, MAX_COLS);
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
        // Need padding if line doesn't exist or is shorter than target column
        if (targetLineIdx >= lines.length || lines[targetLineIdx]!.length < targetColumn) {
          needsPadding = true;
        }
      } else if (e.key === 'ArrowRight') {
        targetLineIdx = currentLineIdx;
        targetColumn = currentColumn + 1;
        if (lines[targetLineIdx]!.length < targetColumn) {
          needsPadding = true;
        }
      }

      // Check if target position is within bounds
      if (!isWithinBounds(targetLineIdx, targetColumn)) {
        e.preventDefault();
        return; // Ignore if would exceed bounds
      }

      if (needsPadding) {
        e.preventDefault();
        
        // Pad the target line with spaces
        const newLines = [...lines];
        const targetLine = newLines[targetLineIdx] || '';
        const spacesNeeded = targetColumn - targetLine.length;
        newLines[targetLineIdx] = targetLine + ' '.repeat(spacesNeeded);
        
        const newValue = newLines.join('\n');
        const constrained = constrainValue(newValue);
        onChange(constrained);
        
        // Calculate new cursor position
        let newPos = 0;
        for (let i = 0; i < targetLineIdx; i++) {
          newPos += Math.min(newLines[i]!.length, MAX_COLS) + 1; // +1 for newline
        }
        newPos += Math.min(targetColumn, MAX_COLS);
        
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
    // Constrain to 80x25 grid
    const constrained = constrainValue(normalized);
    onChange(constrained);
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
      wrap="off"
    />
  );
}
