import { useState } from 'react';
import { useMachineStore } from '../../stores/machineStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { supabase } from '../../lib/supabase';
import type { MachineType } from '../../types';
import styles from './HomeScreen.module.css';

const MACHINE_TYPES: { type: MachineType; label: string; sub: string }[] = [
  { type: 'monkey-turn-v', label: 'モンキーターンV', sub: '小役カウンター' },
  { type: 'hokuto-tensei2', label: '北斗の拳 転生の章2', sub: 'ログ＆設定推測' },
];

export function HomeScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const machines = useMachineStore((state) => state.machines);
  const selectMachine = useMachineStore((state) => state.selectMachine);
  const addMachine = useMachineStore((state) => state.addMachine);
  const deleteMachine = useMachineStore((state) => state.deleteMachine);
  const syncToSupabase = useMachineStore((state) => state.syncToSupabase);
  const loadFromSupabase = useMachineStore((state) => state.loadFromSupabase);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      await syncToSupabase();
      setSyncMessage('アップロード完了');
    } catch {
      setSyncMessage('同期に失敗しました');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 2000);
    }
  };

  const handleLoad = async () => {
    setLoading(true);
    setSyncMessage(null);
    try {
      const success = await loadFromSupabase();
      setSyncMessage(success ? 'データ読み込み完了' : '読み込みに失敗しました');
    } catch {
      setSyncMessage('読み込みに失敗しました');
    } finally {
      setLoading(false);
      setTimeout(() => setSyncMessage(null), 2000);
    }
  };

  const handleAdd = (type: MachineType) => {
    addMachine(type);
    setShowAdd(false);
  };

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>スロットカウンター</h1>
      <p className={styles.subtitle}>台を選択してください</p>

      <div className={styles.list}>
        {machines.map((m) => {
          const typeInfo = MACHINE_TYPES.find((t) => t.type === m.machineType);
          return (
            <button
              key={m.id}
              className={styles.card}
              onClick={() => selectMachine(m.id)}
            >
              <div className={styles.cardInfo}>
                <span className={styles.cardName}>{m.name}</span>
                <span className={styles.cardType}>{typeInfo?.label}</span>
              </div>
              <button
                className={styles.cardDelete}
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(m.id); }}
              >
                ×
              </button>
            </button>
          );
        })}
      </div>

      {!showAdd ? (
        <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
          + 新規台追加
        </button>
      ) : (
        <div className={styles.addPanel}>
          <p className={styles.addTitle}>機種を選択</p>
          {MACHINE_TYPES.map((mt) => (
            <button
              key={mt.type}
              className={styles.addItem}
              onClick={() => handleAdd(mt.type)}
            >
              <span className={styles.addItemLabel}>{mt.label}</span>
              <span className={styles.addItemSub}>{mt.sub}</span>
            </button>
          ))}
          <button className={styles.addCancel} onClick={() => setShowAdd(false)}>
            キャンセル
          </button>
        </div>
      )}
      {supabase && (
        <div className={styles.syncSection}>
          <div className={styles.syncButtons}>
            <button
              className={styles.syncBtn}
              onClick={handleSync}
              disabled={syncing || loading}
            >
              {syncing ? '送信中...' : 'クラウドに保存'}
            </button>
            <button
              className={styles.loadBtn}
              onClick={handleLoad}
              disabled={syncing || loading}
            >
              {loading ? '読込中...' : 'クラウドから復元'}
            </button>
          </div>
          {syncMessage && (
            <p className={styles.syncMessage}>{syncMessage}</p>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMachine(deleteTarget);
        }}
        title="台の削除"
        message={`「${machines.find((m) => m.id === deleteTarget)?.name ?? ''}」を削除しますか？データは全て失われます。`}
        confirmText="削除"
        cancelText="キャンセル"
        danger
      />
    </div>
  );
}
