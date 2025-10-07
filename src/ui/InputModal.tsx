import React, { useEffect, useRef, useState } from 'react';

type Props = {
  visible: boolean;
  onClose: () => void;
  inputQueue: string;
  onSave: (value: string) => void;
};

export default function InputModal({ visible, onClose, inputQueue, onSave }: Props) {
  const [value, setValue] = useState(inputQueue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (visible) {
      setValue(inputQueue);
      // Focus textarea when modal opens
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [visible, inputQueue]);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(720px, 90vw)',
          height: 'min(480px, 80vh)',
          background: '#15181c',
          border: '1px solid #2a2f36',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong style={{ fontSize: 16 }}>標準入力 (stdin)</strong>
          <button onClick={onClose} style={{ padding: '4px 12px' }}>×</button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: '#9aa4af' }}>
            スペース区切りの整数、または文字列（改行も含む）を入力してください。
            <br />
            例: <code style={{ background: '#0f1216', padding: '2px 6px', borderRadius: 4 }}>65 10 ABC</code> → [65, 10, 65, 66, 67]
            <br />
            例: <code style={{ background: '#0f1216', padding: '2px 6px', borderRadius: 4 }}>Hello{'\n'}World</code> → [72, 101, 108, 108, 111, 10, 87, 111, 114, 108, 100]
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 14,
              padding: 12,
              background: '#0f1216',
              border: '1px solid #2a2f36',
              borderRadius: 8,
              color: '#e8eaed',
              resize: 'none',
              outline: 'none',
            }}
            placeholder="例: 65 10 ABC&#10;または&#10;Hello&#10;World"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#9aa4af' }}>
            ショートカット: Ctrl+Enter で保存 / Esc でキャンセル
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}>キャンセル</button>
            <button className="primary" onClick={handleSave}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
