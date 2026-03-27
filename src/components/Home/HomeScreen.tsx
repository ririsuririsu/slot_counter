import { useState } from 'react';
import { useMachineStore } from '../../stores/machineStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { supabase } from '../../lib/supabase';
import type { Machine, MachineType, MonkeyTurnMachine, HokutoMachine } from '../../types';
import { fiveCardIds } from '../../data/koyakuDefinitions';
import styles from './HomeScreen.module.css';

const MACHINE_TYPES: { type: MachineType; label: string; sub: string }[] = [
  { type: 'monkey-turn-v', label: 'モンキーターンV', sub: '小役カウンター' },
  { type: 'hokuto-tensei2', label: '北斗の拳 転生の章2', sub: 'ログ＆設定推測' },
];

const TYPE_COLORS: Record<MachineType, string> = {
  'monkey-turn-v': 'var(--apple-blue)',
  'hokuto-tensei2': 'var(--apple-red)',
};

function getMachineSummary(m: Machine): string {
  if (m.machineType === 'monkey-turn-v') {
    const mt = m as MonkeyTurnMachine;
    const total5 = fiveCardIds.reduce((sum, id) => sum + (mt.counters[id] ?? 0), 0);
    if (mt.totalGames > 0 && total5 > 0) {
      return `${mt.totalGames}G / 5枚役 1/${(mt.totalGames / total5).toFixed(1)}`;
    }
    if (mt.totalGames > 0) return `${mt.totalGames}G`;
    return 'データなし';
  }
  const hk = m as HokutoMachine;
  const atCount = hk.logs.filter((l) => l.type === 'at-win').length;
  const tenhaCount = hk.logs.filter((l) => l.type === 'tenha').length;
  if (atCount > 0 || tenhaCount > 0) {
    return `AT ${atCount}回 / 天破 ${tenhaCount}回`;
  }
  if (hk.logs.length > 0) return `ログ ${hk.logs.length}件`;
  return 'データなし';
}

function formatUpdatedAt(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'たった今';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分前`;
  const date = new Date(ts);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `今日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function isToday(ts: number): boolean {
  const date = new Date(ts);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

export function HomeScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pastCollapsed, setPastCollapsed] = useState(true);
  const machines = useMachineStore((state) => state.machines);
  const selectMachine = useMachineStore((state) => state.selectMachine);
  const addMachine = useMachineStore((state) => state.addMachine);
  const deleteMachine = useMachineStore((state) => state.deleteMachine);
  const updateMachineName = useMachineStore((state) => state.updateMachineName);
  const updateMachineNumber = useMachineStore((state) => state.updateMachineNumber);
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

  const startEdit = (m: Machine) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditNumber(m.number ?? '');
  };

  const saveEdit = () => {
    if (editingId) {
      updateMachineName(editingId, editName || '台');
      updateMachineNumber(editingId, editNumber);
      setEditingId(null);
    }
  };

  const sorted = [...machines].sort((a, b) => b.updatedAt - a.updatedAt);
  const todayMachines = sorted.filter((m) => isToday(m.updatedAt));
  const pastMachines = sorted.filter((m) => !isToday(m.updatedAt));

  const renderCard = (m: Machine) => {
    const typeInfo = MACHINE_TYPES.find((t) => t.type === m.machineType);
    const accentColor = TYPE_COLORS[m.machineType];
    const isEditing = editingId === m.id;

    if (isEditing) {
      return (
        <div key={m.id} className={styles.card} style={{ borderLeftColor: accentColor }}>
          <div className={styles.cardInfo}>
            <div className={styles.editRow}>
              <input
                className={styles.editInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="台名"
                autoFocus
              />
              <input
                className={styles.editInputSmall}
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                placeholder="#番号"
              />
            </div>
            <div className={styles.editActions}>
              <button className={styles.editSave} onClick={saveEdit}>保存</button>
              <button className={styles.editCancel} onClick={() => setEditingId(null)}>取消</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={m.id}
        className={styles.card}
        style={{ borderLeftColor: accentColor }}
        onClick={() => selectMachine(m.id)}
      >
        <div className={styles.cardInfo}>
          <div className={styles.cardHeader}>
            <span className={styles.cardName}>
              {m.name}
              {m.number && <span className={styles.cardNumber}>#{m.number}</span>}
            </span>
            <span className={styles.cardTypeBadge} style={{ color: accentColor }}>
              {typeInfo?.label}
            </span>
          </div>
          <span className={styles.cardSummary}>{getMachineSummary(m)}</span>
          <span className={styles.cardTime}>{formatUpdatedAt(m.updatedAt)}</span>
        </div>
        <div className={styles.cardActions}>
          <button
            className={styles.cardEdit}
            onClick={(e) => { e.stopPropagation(); startEdit(m); }}
          >
            &#9998;
          </button>
          <button
            className={styles.cardDelete}
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(m.id); }}
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>スロットカウンター</h1>
      <p className={styles.subtitle}>台を選択してください</p>

      {/* 新規台追加（上部に配置） */}
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

      {/* 今日の台 */}
      {todayMachines.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>今日の台</h2>
          <div className={styles.list}>
            {todayMachines.map(renderCard)}
          </div>
        </div>
      )}

      {/* 過去の台（アコーディオン） */}
      {pastMachines.length > 0 && (
        <div className={styles.section}>
          <button
            className={styles.accordionToggle}
            onClick={() => setPastCollapsed((prev) => !prev)}
          >
            <span>過去の台（{pastMachines.length}件）</span>
            <span className={`${styles.chevron} ${pastCollapsed ? '' : styles.chevronOpen}`}>›</span>
          </button>
          {!pastCollapsed && (
            <div className={styles.list}>
              {pastMachines.map(renderCard)}
            </div>
          )}
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
