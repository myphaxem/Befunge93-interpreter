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
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      // Insert a single space at cursor position
      const newValue = value.substring(0, start) + ' ' + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after the inserted space
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
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
