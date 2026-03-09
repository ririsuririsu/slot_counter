import { useState } from 'react';
import type { ResetStatus } from '../../types';
import { RESET_STATUS_LABELS } from '../../data/hokutoDefinitions';
import styles from './StatusBar.module.css';

interface Props {
  totalGames: number;
  totalAbeshi: number;
  atCount: number;
  tenhaCount: number;
  resetStatus: ResetStatus;
  onChangeResetStatus: (status: ResetStatus) => void;
  onUpdateGameState: (games: number, abeshi: number) => void;
  onOpenAnalysis: () => void;
}

const RESET_OPTIONS: ResetStatus[] = ['reset', 'suekae', 'unknown'];

const BADGE_CLASS: Record<ResetStatus, string> = {
  reset: styles.resetBadgeReset,
  suekae: styles.resetBadgeSuekae,
  unknown: styles.resetBadgeUnknown,
};

function formatRate(count: number, games: number): string {
  if (games <= 0 || count <= 0) return '—';
  return `1/${(games / count).toFixed(0)}`;
}

export function StatusBar({
  totalGames,
  totalAbeshi,
  atCount,
  tenhaCount,
  resetStatus,
  onChangeResetStatus,
  onUpdateGameState,
  onOpenAnalysis,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editGames, setEditGames] = useState(totalGames);
  const [editAbeshi, setEditAbeshi] = useState(totalAbeshi);

  const openEdit = () => {
    setEditGames(totalGames);
    setEditAbeshi(totalAbeshi);
    setIsEditing(true);
  };

  const closeEdit = () => {
    onUpdateGameState(editGames, editAbeshi);
    setIsEditing(false);
  };

  const cycleReset = () => {
    const idx = RESET_OPTIONS.indexOf(resetStatus);
    onChangeResetStatus(RESET_OPTIONS[(idx + 1) % RESET_OPTIONS.length]);
  };

  return (
    <>
      <div className={styles.bar} onClick={openEdit}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalGames}</span>
          <span className={styles.statUnit}>G</span>
        </div>
        <div className={styles.separator} />
        <div className={styles.stat}>
          <span className={styles.statLabel}>AT</span>
          <span className={styles.statRate}>{formatRate(atCount, totalGames)}</span>
        </div>
        <div className={styles.separator} />
        <div className={styles.stat}>
          <span className={styles.statLabel}>天破</span>
          <span className={styles.statRate}>{formatRate(tenhaCount, totalGames)}</span>
        </div>
        <button
          className={`${styles.resetBadge} ${BADGE_CLASS[resetStatus]}`}
          onClick={(e) => { e.stopPropagation(); cycleReset(); }}
        >
          {RESET_STATUS_LABELS[resetStatus]}
        </button>
        <button
          className={styles.analysisBtn}
          onClick={(e) => { e.stopPropagation(); onOpenAnalysis(); }}
        >
          分析
        </button>
      </div>

      {isEditing && (
        <div className={styles.editOverlay} onClick={closeEdit}>
          <div className={styles.editCard} onClick={(e) => e.stopPropagation()}>
            <span className={styles.editTitle}>G数・あべし編集</span>
            <div className={styles.editField}>
              <label>総G数</label>
              <input
                type="number"
                value={editGames || ''}
                onChange={(e) => setEditGames(parseInt(e.target.value) || 0)}
                inputMode="numeric"
                autoFocus
              />
            </div>
            <div className={styles.editField}>
              <label>総あべし</label>
              <input
                type="number"
                value={editAbeshi || ''}
                onChange={(e) => setEditAbeshi(parseInt(e.target.value) || 0)}
                inputMode="numeric"
              />
            </div>
            <div className={styles.editField}>
              <label>朝一判定</label>
              <div className={styles.editToggleGroup}>
                {RESET_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={`${styles.editToggle} ${resetStatus === opt ? styles.active : ''}`}
                    onClick={() => onChangeResetStatus(opt)}
                  >
                    {RESET_STATUS_LABELS[opt]}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.editActions}>
              <button className={styles.editDone} onClick={closeEdit}>完了</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
