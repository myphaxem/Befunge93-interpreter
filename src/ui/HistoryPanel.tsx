import React, { useEffect, useMemo, useState } from 'react';
import {
  createEntry, createFolder, deleteEntry, deleteFolder, getEntry, getLastOpen,
  listEntries, listFolders, moveEntry, renameEntry, setLastOpen
} from '../runtime/ts/history';

type Props = {
  visible: boolean;
  onClose: () => void;
  currentCode: string;
  onLoadCode: (code: string) => void;
};

export default function HistoryPanel({ visible, onClose, currentCode, onLoadCode }: Props) {
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('');
  const [entries, setEntries] = useState<ReturnType<typeof listEntries>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // States for inline inputs
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveInputName, setSaveInputName] = useState('');
  const [saveInputFolder, setSaveInputFolder] = useState('');

  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderInputName, setFolderInputName] = useState('');

  const [showRenameInput, setShowRenameInput] = useState(false);
  const [renameInputValue, setRenameInputValue] = useState('');

  const [showMoveInput, setShowMoveInput] = useState(false);
  const [moveInputValue, setMoveInputValue] = useState('');

  const refresh = () => {
    setFolders(listFolders());
    setEntries(listEntries(activeFolder));
  };

  useEffect(() => {
    if (!visible) return;
    setFolders(listFolders());
    setEntries(listEntries(''));
    const last = getLastOpen();
    if (last) setSelectedId(last);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setEntries(listEntries(activeFolder));
  }, [activeFolder, visible]);

  const selected = useMemo(() => selectedId ? getEntry(selectedId) : undefined, [selectedId]);

  // UI ハンドラ
  const onSaveNew = () => {
    setShowSaveInput(true);
    setSaveInputName('snapshot');
    setSaveInputFolder(activeFolder || '');
  };

  const handleSaveSubmit = () => {
    if (!saveInputName.trim()) return;
    const e = createEntry({ name: saveInputName.trim(), folder: saveInputFolder.trim(), code: currentCode });
    setSelectedId(e.id);
    setLastOpen(e.id);
    refresh();
    setShowSaveInput(false);
    setSaveInputName('');
    setSaveInputFolder('');
  };

  const onRename = () => {
    if (!selected) return;
    setShowRenameInput(true);
    setRenameInputValue(selected.name);
  };

  const handleRenameSubmit = () => {
    if (!selected || !renameInputValue.trim()) return;
    renameEntry(selected.id, renameInputValue.trim());
    refresh();
    setShowRenameInput(false);
    setRenameInputValue('');
  };

  const onMove = () => {
    if (!selected) return;
    setShowMoveInput(true);
    setMoveInputValue(selected.folder);
  };

  const handleMoveSubmit = () => {
    if (!selected) return;
    moveEntry(selected.id, moveInputValue.trim());
    refresh();
    setShowMoveInput(false);
    setMoveInputValue('');
  };

  const onDelete = () => {
    if (!selected) return;
    if (!confirm(`「${selected.name}」を削除しますか？`)) return;
    deleteEntry(selected.id);
    setSelectedId(null);
    refresh();
  };

  const onCreateFolder = () => {
    setShowFolderInput(true);
    setFolderInputName('');
  };

  const handleFolderSubmit = () => {
    if (!folderInputName.trim()) return;
    createFolder(folderInputName.trim());
    setActiveFolder(folderInputName.trim());
    refresh();
    setShowFolderInput(false);
    setFolderInputName('');
  };

  const onDeleteFolder = () => {
    if (!activeFolder) return;
    if (!confirm(`フォルダ「${activeFolder}」を削除しますか？（空である必要があります）`)) return;
    try {
      deleteFolder(activeFolder);
      setActiveFolder('');
      refresh();
    } catch (e: any) {
      alert(e?.message ?? '削除できませんでした');
    }
  };

  const onLoad = () => {
    if (!selected) return;
    onLoadCode(selected.code);
    setLastOpen(selected.id);
    onClose();
  };

  if (!visible) return null;

  // 簡易モーダル（インラインスタイル）
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8
    }}>
      <div style={{
        width: 'min(960px, 100%)', height: 'min(640px, 100vh)', background: '#15181c',
        border: '1px solid #2a2f36', borderRadius: 12, display: 'grid',
        gridTemplateColumns: 'minmax(180px, 220px) 1fr', gridTemplateRows: 'auto 1fr auto', padding: 12, gap: 8,
        overflow: 'hidden'
      }}>
        <div style={{ gridColumn: '1 / span 2' }}>
          <strong>履歴</strong>
        </div>

        {/* 左：フォルダ */}
        <div style={{ overflow: 'auto', borderRight: '1px solid #222', paddingRight: 8 }}>
          <div className="row" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
            <button onClick={onCreateFolder} style={{ fontSize: 12, padding: '4px 8px' }}>＋</button>
            <button onClick={onDeleteFolder} disabled={!activeFolder} style={{ fontSize: 12, padding: '4px 8px' }}>－</button>
          </div>
          {showFolderInput && (
            <div style={{ marginBottom: 8, padding: 8, background: '#0f1216', borderRadius: 6 }}>
              <input
                type="text"
                value={folderInputName}
                onChange={e => setFolderInputName(e.target.value)}
                placeholder="フォルダ名"
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  background: '#15181c',
                  border: '1px solid #2a2f36',
                  borderRadius: 4,
                  color: '#eaeef2',
                  fontSize: 13,
                  marginBottom: 4
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleFolderSubmit();
                  if (e.key === 'Escape') setShowFolderInput(false);
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={handleFolderSubmit} style={{ fontSize: 11, padding: '2px 6px', flex: 1 }}>作成</button>
                <button onClick={() => setShowFolderInput(false)} style={{ fontSize: 11, padding: '2px 6px', flex: 1 }}>×</button>
              </div>
            </div>
          )}
          <div>
            <div
              className="mono"
              style={{
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                background: activeFolder === '' ? '#0f1216' : 'transparent',
                fontSize: 13,
                wordBreak: 'keep-all',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              onClick={() => setActiveFolder('')}
            >（ルート）</div>
            {folders.map(f => (
              <div key={f}
                   className="mono"
                   style={{
                     padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                     background: activeFolder === f ? '#0f1216' : 'transparent',
                     fontSize: 13,
                     wordBreak: 'break-word',
                     overflow: 'hidden',
                     textOverflow: 'ellipsis'
                   }}
                   onClick={() => setActiveFolder(f)}>{f}</div>
            ))}
          </div>
        </div>

        {/* 右上：操作ボタン */}
        <div style={{ overflow: 'auto' }}>
          <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
            <button onClick={onSaveNew} style={{ fontSize: 12, padding: '4px 8px' }}>＋保存</button>
            <button onClick={onRename} disabled={!selected} style={{ fontSize: 12, padding: '4px 8px' }}>名前変更</button>
            <button onClick={onMove} disabled={!selected} style={{ fontSize: 12, padding: '4px 8px' }}>移動</button>
            <button onClick={onDelete} disabled={!selected} style={{ fontSize: 12, padding: '4px 8px' }}>削除</button>
          </div>

          {/* Save Input Form */}
          {showSaveInput && (
            <div style={{ marginBottom: 8, padding: 8, background: '#0f1216', borderRadius: 6 }}>
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>保存名:</label>
                <input
                  type="text"
                  value={saveInputName}
                  onChange={e => setSaveInputName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    background: '#15181c',
                    border: '1px solid #2a2f36',
                    borderRadius: 4,
                    color: '#eaeef2',
                    fontSize: 13
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveSubmit();
                    if (e.key === 'Escape') setShowSaveInput(false);
                  }}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>フォルダ:</label>
                <input
                  type="text"
                  value={saveInputFolder}
                  onChange={e => setSaveInputFolder(e.target.value)}
                  placeholder="空でルート"
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    background: '#15181c',
                    border: '1px solid #2a2f36',
                    borderRadius: 4,
                    color: '#eaeef2',
                    fontSize: 13
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveSubmit();
                    if (e.key === 'Escape') setShowSaveInput(false);
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={handleSaveSubmit} style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}>保存</button>
                <button onClick={() => setShowSaveInput(false)} style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}>キャンセル</button>
              </div>
            </div>
          )}

          {/* Rename Input Form */}
          {showRenameInput && (
            <div style={{ marginBottom: 8, padding: 8, background: '#0f1216', borderRadius: 6 }}>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>新しい名前:</label>
              <input
                type="text"
                value={renameInputValue}
                onChange={e => setRenameInputValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  background: '#15181c',
                  border: '1px solid #2a2f36',
                  borderRadius: 4,
                  color: '#eaeef2',
                  fontSize: 13,
                  marginBottom: 4
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setShowRenameInput(false);
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={handleRenameSubmit} style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}>変更</button>
                <button onClick={() => setShowRenameInput(false)} style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}>キャンセル</button>
              </div>
            </div>
          )}

          {/* Move Input Form */}
          {showMoveInput && (
            <div style={{ marginBottom: 8, padding: 8, background: '#0f1216', borderRadius: 6 }}>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>移動先フォルダ:</label>
              <input
                type="text"
                value={moveInputValue}
                onChange={e => setMoveInputValue(e.target.value)}
                placeholder="空でルート"
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  background: '#15181c',
                  border: '1px solid #2a2f36',
                  borderRadius: 4,
                  color: '#eaeef2',
                  fontSize: 13,
                  marginBottom: 4
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleMoveSubmit();
                  if (e.key === 'Escape') setShowMoveInput(false);
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={handleMoveSubmit} style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}>移動</button>
                <button onClick={() => setShowMoveInput(false)} style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}>キャンセル</button>
              </div>
            </div>
          )}

        {/* 右下：一覧 */}
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #222' }}>
                  <th style={{ padding: '4px 6px', minWidth: 80 }}>名前</th>
                  <th style={{ padding: '4px 6px', minWidth: 60 }}>フォルダ</th>
                  <th style={{ padding: '4px 6px', minWidth: 100, whiteSpace: 'nowrap' }}>更新</th>
                  <th style={{ padding: '4px 6px', width: 70 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}
                      style={{ borderBottom: '1px solid #222', background: selectedId === e.id ? '#0f1216' : 'transparent' }}
                      onClick={() => setSelectedId(e.id)}>
                    <td style={{ padding: '4px 6px', wordBreak: 'break-word', fontFamily: 'var(--mono-font)' }}>{e.name}</td>
                    <td style={{ padding: '4px 6px', wordBreak: 'break-word', fontSize: 12 }}>{e.folder || '（ルート）'}</td>
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', fontSize: 11 }}>
                      {new Date(e.updatedAt).toLocaleString('ja-JP', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <button 
                        onClick={(ev) => { 
                          ev.stopPropagation(); 
                          onLoadCode(e.code); 
                          setLastOpen(e.id); 
                          onClose(); 
                        }}
                        style={{ fontSize: 11, padding: '3px 6px', width: '100%' }}
                      >
                        読込
                      </button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 12, color: '#9aa4af', textAlign: 'center', fontSize: 12 }}>このフォルダには保存がありません。</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* フッター */}
        <div style={{ gridColumn: '1 / span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#9aa4af' }}>保存はローカルに保持されます（Cookie にメタ情報を書き出します）。</div>
          <div>
            <button onClick={onClose} style={{ fontSize: 12, padding: '6px 12px' }}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
}
