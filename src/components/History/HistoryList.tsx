import { useState } from 'react';
import { useMachineStore, isMonkeyTurnMachine } from '../../stores/machineStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import styles from './HistoryList.module.css';

export function HistoryList() {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const deleteHistoryEntry = useMachineStore((state) => state.deleteHistoryEntry);

  const history = (machine && isMonkeyTurnMachine(machine)) ? machine.history : [];

  if (history.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>履歴</h3>
        <p className={styles.empty}>履歴がありません</p>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatProbability = (probability: number | null) => {
    if (probability === null) return '-';
    return `1/${probability.toFixed(1)}`;
  };

  const getMaxSetting = (entry: typeof history[0]) => {
    const { settingAnalysis } = entry;
    const settings = [
      { key: '1', value: settingAnalysis.setting1 },
      { key: '2', value: settingAnalysis.setting2 },
      { key: '4', value: settingAnalysis.setting4 },
      { key: '5', value: settingAnalysis.setting5 },
      { key: '6', value: settingAnalysis.setting6 },
    ];
    const max = settings.reduce((prev, curr) =>
      curr.value > prev.value ? curr : prev
    );
    return { setting: max.key, probability: max.value };
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      deleteHistoryEntry(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <>
      <div className={styles.container}>
        <h3 className={styles.title}>履歴 ({history.length}件)</h3>
        <div className={styles.list}>
          {[...history].reverse().map((entry) => {
            const maxSetting = getMaxSetting(entry);
            return (
              <div key={entry.id} className={styles.entry}>
                <div className={styles.entryHeader}>
                  <span className={styles.time}>{formatTime(entry.timestamp)}</span>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(entry.id)}
                    aria-label="削除"
                  >
                    ×
                  </button>
                </div>
                <div className={styles.entryBody}>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>G数</span>
                    <span className={styles.statValue}>{entry.totalGames}</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>5枚役</span>
                    <span className={styles.statValue}>{entry.fiveCardTotal}回</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>確率</span>
                    <span className={styles.statValue}>
                      {formatProbability(entry.probability)}
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statLabel}>推定</span>
                    <span className={`${styles.statValue} ${styles.settingValue}`}>
                      設定{maxSetting.setting} ({maxSetting.probability.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="履歴の削除"
        message="この履歴を削除しますか？"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTargetId(null)}
        danger
      />
    </>
  );
}
