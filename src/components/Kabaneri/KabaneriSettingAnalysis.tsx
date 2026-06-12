import { useMemo } from 'react';
import type { KabaneriSettingAnalysis as AnalysisResult } from '../../types/kabaneri';
import { useMachineStore, isKabaneriMachine } from '../../stores/machineStore';
import { chanceDefinitions, GEDAN_BELL_KEY } from '../../data/kabaneriDefinitions';
import {
  calculateBellAnalysis,
  calculateFlashAnalysis,
  combineAnalyses,
} from '../../utils/kabaneriEstimation';
import styles from './KabaneriSettingAnalysis.module.css';

const SETTING_ROWS: { key: keyof AnalysisResult; label: string; className: string }[] = [
  { key: 'setting1', label: '設定1', className: 'setting1' },
  { key: 'setting2', label: '設定2', className: 'setting2' },
  { key: 'setting3', label: '設定3', className: 'setting3' },
  { key: 'setting4', label: '設定4', className: 'setting4' },
  { key: 'setting5', label: '設定5', className: 'setting5' },
  { key: 'setting6', label: '設定6', className: 'setting6' },
];

function SettingGrid({ analysis }: { analysis: AnalysisResult }) {
  const maxValue = Math.max(...SETTING_ROWS.map((s) => analysis[s.key]));
  return (
    <div className={styles.settingsGrid}>
      {SETTING_ROWS.map((setting) => (
        <div key={setting.key} className={styles.settingItem}>
          <span className={`${styles.settingLabel} ${styles[setting.className]}`}>
            {setting.label}
          </span>
          <span
            className={`${styles.settingValue} ${
              analysis[setting.key] === maxValue && maxValue > 100 / 6 + 0.05
                ? styles.highProbability
                : ''
            }`}
          >
            {analysis[setting.key].toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function KabaneriSettingAnalysis() {
  const machine = useMachineStore((state) => state.getCurrentMachine());

  const counters = machine && isKabaneriMachine(machine) ? machine.counters : null;
  const totalGames = machine && isKabaneriMachine(machine) ? machine.totalGames : 0;

  const { bellAnalysis, flashAnalysis, combined, chanceTotal, flashTotal, bellCount } =
    useMemo(() => {
      const chance = chanceDefinitions.reduce(
        (sum, def) => sum + (counters?.[def.countKey] ?? 0),
        0
      );
      const flash = chanceDefinitions.reduce(
        (sum, def) => sum + (counters?.[def.flashKey] ?? 0),
        0
      );
      const bell = counters?.[GEDAN_BELL_KEY] ?? 0;
      const bellResult = calculateBellAnalysis(bell, totalGames);
      const flashResult = calculateFlashAnalysis(flash, chance);
      return {
        bellAnalysis: bellResult,
        flashAnalysis: flashResult,
        combined: combineAnalyses([bellResult, flashResult]),
        chanceTotal: chance,
        flashTotal: flash,
        bellCount: bell,
      };
    }, [counters, totalGames]);

  const flashRate = chanceTotal > 0 ? (flashTotal / chanceTotal) * 100 : null;

  return (
    <div className={styles.container}>
      <div className={styles.sectionLabel}>総合</div>
      <SettingGrid analysis={combined} />

      <div className={styles.sectionLabel}>
        下段ベル（{bellCount}回 / {totalGames}G）
      </div>
      <SettingGrid analysis={bellAnalysis} />

      <div className={styles.sectionLabel}>
        チャンス目発光率（{flashTotal}/{chanceTotal}回
        {flashRate !== null ? ` = ${flashRate.toFixed(1)}%` : ''}）
      </div>
      <SettingGrid analysis={flashAnalysis} />

      <p className={styles.note}>
        ※発光率の設定別数値は公式未発表のため実戦値ベースの参考値（設定1:約10%〜設定6:約17%）。
        非高確・非発光中の単独チャンス目のみカウント対象。
      </p>
    </div>
  );
}
