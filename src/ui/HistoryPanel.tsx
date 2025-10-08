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

  // UI state for inline forms
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [showRenameForm, setShowRenameForm] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [showCreateFolderForm, setShowCreateFolderForm] = useState(false);

  // Form values
  const [saveName, setSaveName] = useState('snapshot');
  const [saveFolder, setSaveFolder] = useState('');
  const [renameName, setRenameName] = useState('');
  const [moveFolder, setMoveFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

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
    setSaveFolder(activeFolder || '');
    setShowSaveForm(true);
  };

  const handleSaveSubmit = () => {
    if (!saveName.trim()) return;
    const e = createEntry({ name: saveName.trim(), folder: saveFolder.trim(), code: currentCode });
    setSelectedId(e.id);
    setLastOpen(e.id);
    refresh();
    setShowSaveForm(false);
    setSaveName('snapshot');
    setSaveFolder('');
  };

  const onRename = () => {
    if (!selected) return;
    setRenameName(selected.name);
    setShowRenameForm(true);
  };

  const handleRenameSubmit = () => {
    if (!selected || !renameName.trim()) return;
    renameEntry(selected.id, renameName.trim());
    refresh();
    setShowRenameForm(false);
  };

  const onMove = () => {
    if (!selected) return;
    setMoveFolder(selected.folder);
    setShowMoveForm(true);
  };

  const handleMoveSubmit = () => {
    if (!selected) return;
    moveEntry(selected.id, moveFolder.trim());
    refresh();
    setShowMoveForm(false);
  };

  const onDelete = () => {
    if (!selected) return;
    if (!confirm(`「${selected.name}」を削除しますか？`)) return;
    deleteEntry(selected.id);
    setSelectedId(null);
    refresh();
  };

  const onCreateFolder = () => {
    setShowCreateFolderForm(true);
  };

  const handleCreateFolderSubmit = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim());
    setActiveFolder(newFolderName.trim());
    refresh();
    setShowCreateFolderForm(false);
    setNewFolderName('');
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
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '10px'
    }}>
      <div style={{
        width: 'min(960px, 95vw)', height: 'min(640px, 90vh)', background: '#15181c',
        border: '1px solid #2a2f36', borderRadius: 12, display: 'grid',
        gridTemplateColumns: 'minmax(180px, 220px) 1fr', gridTemplateRows: 'auto 1fr auto', padding: 12, gap: 8,
        overflow: 'hidden'
      }}>
        <div style={{ gridColumn: '1 / span 2' }}>
          <strong>履歴</strong>
        </div>

        {/* 左：フォルダ */}
        <div style={{ overflow: 'auto', borderRight: '1px solid #222', paddingRight: 8 }}>
          <div className="row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
            <button onClick={onCreateFolder}>＋</button>
            <button onClick={onDeleteFolder} disabled={!activeFolder}>－</button>
          </div>
          
          {/* Create folder form */}
          {showCreateFolderForm && (
            <div style={{ marginBottom: 8, padding: 8, background: '#0f1216', borderRadius: 6 }}>
              <div style={{ marginBottom: 4, fontSize: 12, color: '#9aa4af' }}>新規フォルダ名:</div>
              <input 
                type="text" 
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolderSubmit()}
                placeholder="フォルダ名"
                style={{ width: '100%', marginBottom: 4 }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={handleCreateFolderSubmit} style={{ flex: 1, padding: '4px 8px', fontSize: 12 }}>作成</button>
                <button onClick={() => { setShowCreateFolderForm(false); setNewFolderName(''); }} style={{ flex: 1, padding: '4px 8px', fontSize: 12 }}>キャンセル</button>
              </div>
            </div>
          )}

          <div>
            <div
              className="mono"
              style={{
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                background: activeFolder === '' ? '#0f1216' : 'transparent',
                wordBreak: 'break-word'
              }}
              onClick={() => setActiveFolder('')}
            >（ルート）</div>
            {folders.map(f => (
              <div key={f}
                   className="mono"
                   style={{
                     padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                     background: activeFolder === f ? '#0f1216' : 'transparent',
                     wordBreak: 'break-word'
                   }}
                   onClick={() => setActiveFolder(f)}>{f}</div>
            ))}
          </div>
        </div>

        {/* 右上：操作ボタン */}
        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap', gap: 4 }}>
          <button onClick={onSaveNew} style={{ fontSize: 13, padding: '4px 8px' }}>＋ 保存</button>
          <button onClick={onRename} disabled={!selected} style={{ fontSize: 13, padding: '4px 8px' }}>名前変更</button>
          <button onClick={onMove} disabled={!selected} style={{ fontSize: 13, padding: '4px 8px' }}>移動</button>
          <button onClick={onDelete} disabled={!selected} style={{ fontSize: 13, padding: '4px 8px' }}>削除</button>
        </div>

        {/* 右下：一覧 */}
        <div style={{ overflow: 'auto' }}>
          {/* Save form */}
          {showSaveForm && (
            <div style={{ marginBottom: 12, padding: 10, background: '#0f1216', borderRadius: 8, border: '1px solid #2a2f36' }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>新規保存</div>
              <div style={{ marginBottom: 6 }}>
                <label style={{ display: 'block', marginBottom: 2, fontSize: 12, color: '#9aa4af' }}>保存名:</label>
                <input 
                  type="text" 
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSubmit()}
                  placeholder="例: hello_world"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 2, fontSize: 12, color: '#9aa4af' }}>フォルダ:</label>
                <input 
                  type="text" 
                  value={saveFolder}
                  onChange={e => setSaveFolder(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSubmit()}
                  placeholder="空欄でルート"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleSaveSubmit} style={{ flex: 1 }}>保存</button>
                <button onClick={() => { setShowSaveForm(false); setSaveName('snapshot'); setSaveFolder(''); }} style={{ flex: 1 }}>キャンセル</button>
              </div>
            </div>
          )}

          {/* Rename form */}
          {showRenameForm && selected && (
            <div style={{ marginBottom: 12, padding: 10, background: '#0f1216', borderRadius: 8, border: '1px solid #2a2f36' }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>名前変更</div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 2, fontSize: 12, color: '#9aa4af' }}>新しい名前:</label>
                <input 
                  type="text" 
                  value={renameName}
                  onChange={e => setRenameName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleRenameSubmit} style={{ flex: 1 }}>変更</button>
                <button onClick={() => setShowRenameForm(false)} style={{ flex: 1 }}>キャンセル</button>
              </div>
            </div>
          )}

          {/* Move form */}
          {showMoveForm && selected && (
            <div style={{ marginBottom: 12, padding: 10, background: '#0f1216', borderRadius: 8, border: '1px solid #2a2f36' }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>移動</div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 2, fontSize: 12, color: '#9aa4af' }}>移動先フォルダ:</label>
                <input 
                  type="text" 
                  value={moveFolder}
                  onChange={e => setMoveFolder(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleMoveSubmit()}
                  placeholder="空欄でルート"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleMoveSubmit} style={{ flex: 1 }}>移動</button>
                <button onClick={() => setShowMoveForm(false)} style={{ flex: 1 }}>キャンセル</button>
              </div>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #222' }}>
                <th style={{ padding: '6px 4px', wordBreak: 'break-word' }}>名前</th>
                <th style={{ padding: '6px 4px', wordBreak: 'break-word' }}>フォルダ</th>
                <th style={{ padding: '6px 4px', width: '140px', wordBreak: 'break-word' }}>更新</th>
                <th style={{ padding: '6px 4px', width: '80px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}
                    style={{ borderBottom: '1px solid #222', background: selectedId === e.id ? '#0f1216' : 'transparent', cursor: 'pointer' }}
                    onClick={() => setSelectedId(e.id)}>
                  <td style={{ padding: '6px 4px', wordBreak: 'break-word' }}>{e.name}</td>
                  <td style={{ padding: '6px 4px', wordBreak: 'break-word' }}>{e.folder || '（ルート）'}</td>
                  <td style={{ padding: '6px 4px', fontSize: 11, wordBreak: 'break-word' }}>{new Date(e.updatedAt).toLocaleString()}</td>
                  <td style={{ padding: '6px 4px' }}>
                    <button onClick={(ev) => { ev.stopPropagation(); onLoadCode(e.code); setLastOpen(e.id); onClose(); }} style={{ fontSize: 11, padding: '3px 6px' }}>読込</button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 12, color: '#9aa4af', textAlign: 'center' }}>このフォルダには保存がありません。</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* フッター */}
        <div style={{ gridColumn: '1 / span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#9aa4af' }}>保存はローカルに保持されます（Cookie にメタ情報を書き出します）。</div>
          <div>
            <button onClick={onClose}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
}
