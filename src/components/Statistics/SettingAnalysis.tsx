import { useMemo } from 'react';
import { useMachineStore } from '../../stores/machineStore';
import { calculateSettingProbabilities } from '../../utils/binomialDistribution';
import styles from './SettingAnalysis.module.css';

export function SettingAnalysis() {
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const fiveCardTotal = useMachineStore((state) => state.getFiveCardTotal());

  const totalGames = machine?.totalGames ?? 0;

  const analysis = useMemo(() => {
    return calculateSettingProbabilities(fiveCardTotal, totalGames);
  }, [fiveCardTotal, totalGames]);

  const settings = [
    { key: 'setting1', label: '設定1', value: analysis.setting1, className: styles.setting1 },
    { key: 'setting2', label: '設定2', value: analysis.setting2, className: styles.setting2 },
    { key: 'setting4', label: '設定4', value: analysis.setting4, className: styles.setting4 },
    { key: 'setting5', label: '設定5', value: analysis.setting5, className: styles.setting5 },
    { key: 'setting6', label: '設定6', value: analysis.setting6, className: styles.setting6 },
  ];

  const maxValue = Math.max(...settings.map((s) => s.value));

  return (
    <div className={styles.container}>
      <div className={styles.title}>設定判別（二項分布）</div>
      <div className={styles.settingsGrid}>
        {settings.map((setting) => (
          <div key={setting.key} className={styles.settingItem}>
            <span className={`${styles.settingLabel} ${setting.className}`}>
              {setting.label}
            </span>
            <span
              className={`${styles.settingValue} ${
                setting.value === maxValue && maxValue > 0
                  ? styles.highProbability
                  : ''
              }`}
            >
              {setting.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
