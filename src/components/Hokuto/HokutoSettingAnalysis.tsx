import type { HokutoSettingAnalysis as Analysis } from '../../types';
import styles from './HokutoSettingAnalysis.module.css';

interface Props {
  analysis: Analysis;
}

const SETTINGS = [
  { key: 'setting1' as const, label: '設定1' },
  { key: 'setting2' as const, label: '設定2' },
  { key: 'setting3' as const, label: '設定3' },
  { key: 'setting4' as const, label: '設定4' },
  { key: 'setting5' as const, label: '設定5' },
  { key: 'setting6' as const, label: '設定6' },
];

export function HokutoSettingAnalysis({ analysis }: Props) {
  const maxValue = Math.max(...SETTINGS.map((s) => analysis[s.key]));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>設定推定</h3>
      <div className={styles.barList}>
        {SETTINGS.map(({ key, label }) => {
          const value = analysis[key];
          const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const isHighest = value === maxValue && value > 0;
          return (
            <div key={key} className={styles.barRow}>
              <span className={styles.barLabel}>{label}</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${isHighest ? styles.barHighest : ''}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className={styles.barValue}>{value.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
