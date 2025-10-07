import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { registerBefungeLanguage } from './befunge-language';

// Worker の解決（Vite でバンドル）
// @ts-ignore
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  }
};

export default function Editor({ code, onChange, readOnly = false }: { code: string; onChange: (v: string) => void; readOnly?: boolean; }) {
  const ref = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const id = registerBefungeLanguage();
    const ed = monaco.editor.create(ref.current, {
      value: code,
      language: id,
      theme: 'vs-dark',
      automaticLayout: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: false },
      readOnly: readOnly,

      // 4つのスペースがタブ扱いされるのを抑止（インデント推測無効 / 常にスペース）
      detectIndentation: false,
      insertSpaces: true,
      tabSize: 1,            // タブ=1桁相当として扱い（押下時に1スペース）
      useTabStops: false,    // タブストップによる自動補正をオフ
      renderWhitespace: 'all',
      trimAutoWhitespace: false
    });
    editorRef.current = ed;

    // 入力中に物理タブが入った場合も即時スペース1つに置換
    const model = ed.getModel();
    let isUpdatingFromCode = false; // flag to prevent infinite loop
    
    const disposableKey = ed.onKeyDown((e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        ed.executeEdits('soft-tab', [{
          range: ed.getSelection()!,
          text: ' ',
          forceMoveMarkers: true
        }]);
      }
    });

    const sub = ed.onDidChangeModelContent(() => {
      if (isUpdatingFromCode) return; // prevent infinite loop
      
      // モデルに混入した \t をスペース1つに正規化
      if (model) {
        const val = model.getValue();
        if (val.includes('\t')) {
          const fixed = val.replace(/\t/g, ' ');
          if (fixed !== val) {
            isUpdatingFromCode = true;
            model.setValue(fixed);
            isUpdatingFromCode = false;
          }
        }
      }
      onChange(ed.getValue());
    });

    return () => { sub.dispose(); disposableKey.dispose(); ed.dispose(); };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const currentReadOnly = editorRef.current.getOptions().get(monaco.editor.EditorOption.readOnly);
      if (currentReadOnly !== readOnly) {
        editorRef.current.updateOptions({ readOnly });
      }
    }
  }, [readOnly]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== code) {
      editorRef.current.setValue(code);
    }
  }, [code]);

  return <div className="editor" style={{ width: '100%', height: '100%' }} ref={ref} />;
}
