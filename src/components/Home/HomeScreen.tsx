import { useState } from 'react';
import { useMachineStore } from '../../stores/machineStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { MachineType } from '../../types';
import styles from './HomeScreen.module.css';

const MACHINE_TYPES: { type: MachineType; label: string; sub: string }[] = [
  { type: 'monkey-turn-v', label: 'モンキーターンV', sub: '小役カウンター' },
  { type: 'hokuto-tensei2', label: '北斗の拳 転生の章2', sub: 'ログ＆設定推測' },
];

export function HomeScreen() {
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const machines = useMachineStore((state) => state.machines);
  const selectMachine = useMachineStore((state) => state.selectMachine);
  const addMachine = useMachineStore((state) => state.addMachine);
  const deleteMachine = useMachineStore((state) => state.deleteMachine);

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
