import type { ModeDistribution } from '../../types';
import { MODE_LABELS } from '../../data/hokutoDefinitions';
import type { HokutoMode } from '../../types';
import styles from './ModeEstimation.module.css';

interface Props {
  distribution: ModeDistribution;
}

const MODES: { key: keyof ModeDistribution; mode: HokutoMode }[] = [
  { key: 'tengoku', mode: 'tengoku' },
  { key: 'modeC', mode: 'mode-c' },
  { key: 'modeB', mode: 'mode-b' },
  { key: 'modeA', mode: 'mode-a' },
];

export function ModeEstimation({ distribution }: Props) {
  const maxValue = Math.max(...MODES.map((m) => distribution[m.key]));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>モード推定</h3>
      <div className={styles.barList}>
        {MODES.map(({ key, mode }) => {
          const value = distribution[key];
          const pct = value * 100;
          const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const isHighest = value === maxValue && value > 0;
          return (
            <div key={key} className={styles.barRow}>
              <span className={styles.barLabel}>{MODE_LABELS[mode]}</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${isHighest ? styles.barHighest : ''}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className={styles.barValue}>{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
