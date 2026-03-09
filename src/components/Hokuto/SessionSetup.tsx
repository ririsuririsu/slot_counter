import type { ResetStatus } from '../../types';
import { RESET_STATUS_LABELS } from '../../data/hokutoDefinitions';
import styles from './SessionSetup.module.css';

interface Props {
  resetStatus: ResetStatus;
  onChangeResetStatus: (status: ResetStatus) => void;
  totalGames: number;
  totalAbeshi: number;
  onUpdateGameState: (games: number, abeshi: number) => void;
}

const RESET_OPTIONS: ResetStatus[] = ['reset', 'suekae', 'unknown'];

export function SessionSetup({
  resetStatus,
  onChangeResetStatus,
  totalGames,
  totalAbeshi,
  onUpdateGameState,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <label className={styles.label}>朝一判定</label>
        <div className={styles.toggleGroup}>
          {RESET_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`${styles.toggleButton} ${resetStatus === opt ? styles.active : ''}`}
              onClick={() => onChangeResetStatus(opt)}
            >
              {RESET_STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>総G数</label>
          <input
            type="number"
            className={styles.numberInput}
            value={totalGames || ''}
            onChange={(e) =>
              onUpdateGameState(parseInt(e.target.value) || 0, totalAbeshi)
            }
            placeholder="0"
            min={0}
            inputMode="numeric"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>総あべし</label>
          <input
            type="number"
            className={styles.numberInput}
            value={totalAbeshi || ''}
            onChange={(e) =>
              onUpdateGameState(totalGames, parseInt(e.target.value) || 0)
            }
            placeholder="0"
            min={0}
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
}
