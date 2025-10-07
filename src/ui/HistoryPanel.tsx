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
    const name = prompt('保存名を入力してください', 'snapshot');
    if (!name) return;
    const folder = prompt('フォルダ名（空または新規作成可）', activeFolder || '');
    const e = createEntry({ name, folder: (folder ?? ''), code: currentCode });
    setSelectedId(e.id);
    setLastOpen(e.id);
    refresh();
  };

  const onRename = () => {
    if (!selected) return;
    const nn = prompt('新しい名前', selected.name);
    if (!nn) return;
    renameEntry(selected.id, nn);
    refresh();
  };

  const onMove = () => {
    if (!selected) return;
    const nf = prompt('移動先フォルダ（空でルート）', selected.folder);
    if (nf === null) return;
    moveEntry(selected.id, nf);
    refresh();
  };

  const onDelete = () => {
    if (!selected) return;
    if (!confirm(`「${selected.name}」を削除しますか？`)) return;
    deleteEntry(selected.id);
    setSelectedId(null);
    refresh();
  };

  const onCreateFolder = () => {
    const name = prompt('新規フォルダ名');
    if (!name) return;
    createFolder(name);
    setActiveFolder(name);
    refresh();
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
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        width: 'min(960px, 95vw)', height: 'min(640px, 90vh)', background: '#15181c',
        border: '1px solid #2a2f36', borderRadius: 12, display: 'grid',
        gridTemplateColumns: '220px 1fr', gridTemplateRows: 'auto 1fr auto', padding: 12, gap: 8
      }}>
        <div style={{ gridColumn: '1 / span 2' }}>
          <strong>履歴</strong>
        </div>

        {/* 左：フォルダ */}
        <div style={{ overflow: 'auto', borderRight: '1px solid #222', paddingRight: 8 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <button onClick={onCreateFolder}>＋ フォルダ</button>
            <button onClick={onDeleteFolder} disabled={!activeFolder}>－ フォルダ</button>
          </div>
          <div>
            <div
              className="mono"
              style={{
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                background: activeFolder === '' ? '#0f1216' : 'transparent'
              }}
              onClick={() => setActiveFolder('')}
            >（ルート）</div>
            {folders.map(f => (
              <div key={f}
                   className="mono"
                   style={{
                     padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                     background: activeFolder === f ? '#0f1216' : 'transparent'
                   }}
                   onClick={() => setActiveFolder(f)}>{f}</div>
            ))}
          </div>
        </div>

        {/* 右上：操作ボタン */}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button onClick={onSaveNew}>＋ 保存</button>
          <button onClick={onRename} disabled={!selected}>名前変更</button>
          <button onClick={onMove} disabled={!selected}>移動</button>
          <button onClick={onDelete} disabled={!selected}>削除</button>
        </div>

        {/* 右下：一覧 */}
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'ui-monospace, monospace' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #222' }}>
                <th style={{ padding: 6 }}>名前</th>
                <th style={{ padding: 6 }}>フォルダ</th>
                <th style={{ padding: 6, width: 140 }}>更新</th>
                <th style={{ padding: 6, width: 100 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}
                    style={{ borderBottom: '1px solid #222', background: selectedId === e.id ? '#0f1216' : 'transparent' }}
                    onClick={() => setSelectedId(e.id)}>
                  <td style={{ padding: 6 }}>{e.name}</td>
                  <td style={{ padding: 6 }}>{e.folder || '（ルート）'}</td>
                  <td style={{ padding: 6 }}>{new Date(e.updatedAt).toLocaleString()}</td>
                  <td style={{ padding: 6 }}>
                    <button onClick={() => { onLoadCode(e.code); setLastOpen(e.id); onClose(); }}>読み込む</button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 12, color: '#9aa4af' }}>このフォルダには保存がありません。</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* フッター */}
        <div style={{ gridColumn: '1 / span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#9aa4af' }}>保存はローカルに保持されます（Cookie にメタ情報を書き出します）。</div>
          <div>
            <button onClick={onClose}>閉じる</button>
          </div>
        </div>
      </div>
    </div>
  );
}
