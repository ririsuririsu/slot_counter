import { useMemo } from 'react';
import type {
  MonhanRiseMachine,
  MonhanRiseSettingAnalysis as AnalysisResult,
} from '../../types';
import {
  RIZE_ZONE_KEY,
  WEAK_RARE_KEY,
} from '../../data/monhanRiseDefinitions';
import {
  calculateAllAnalyses,
  calculateRizeRate,
} from '../../utils/monhanRiseEstimation';
import styles from './MonhanRiseSettingAnalysis.module.css';

interface MonhanRiseSettingAnalysisProps {
  machine: MonhanRiseMachine;
}

const SETTING_ROWS: { key: keyof AnalysisResult; label: string; color: string }[] = [
  { key: 'setting1', label: '設定1', color: 'var(--color-setting-1)' },
  { key: 'setting2', label: '設定2', color: 'var(--color-setting-2)' },
  { key: 'setting3', label: '設定3', color: 'var(--color-setting-3)' },
  { key: 'setting4', label: '設定4', color: 'var(--color-setting-4)' },
  { key: 'setting5', label: '設定5', color: 'var(--color-setting-5)' },
  { key: 'setting6', label: '設定6', color: 'var(--color-setting-6)' },
];

const EQUAL_SHARE = 100 / SETTING_ROWS.length;

function SettingGrid({ analysis }: { analysis: AnalysisResult }) {
  const maxValue = Math.max(...SETTING_ROWS.map((s) => analysis[s.key]));
  return (
    <div className={styles.settingsGrid}>
      {SETTING_ROWS.map((setting) => {
        const value = analysis[setting.key];
        const isTop = value === maxValue && maxValue > EQUAL_SHARE + 0.05;
        return (
          <div key={setting.key} className={styles.settingItem}>
            <span className={styles.settingLabel} style={{ color: setting.color }}>
              {setting.label}
            </span>
            <span
              className={`${styles.settingValue} ${isTop ? styles.highProbability : ''}`}
            >
              {value.toFixed(1)}%
            </span>
            <span className={styles.bar}>
              <span
                className={styles.barFill}
                style={{
                  width: `${Math.min(100, value)}%`,
                  background: setting.color,
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MonhanRiseSettingAnalysis({
  machine,
}: MonhanRiseSettingAnalysisProps) {
  const weakRare = machine.counters[WEAK_RARE_KEY] ?? 0;
  const rizeZone = machine.counters[RIZE_ZONE_KEY] ?? 0;
  const events = machine.events;

  const analyses = useMemo(
    () => calculateAllAnalyses(weakRare, rizeZone, events),
    [weakRare, rizeZone, events]
  );

  const darumaCount = events.filter(
    (e) => e.type === 'daruma-hit' || e.type === 'daruma-censor'
  ).length;
  const questCount = events.filter((e) => e.type === 'quest').length;
  const atCount = events.filter((e) => e.type === 'at-hit').length;
  const rizeRate = calculateRizeRate(weakRare, rizeZone);

  return (
    <div className={styles.container}>
      <div className={styles.sectionLabel}>総合（4軸統合）</div>
      <SettingGrid analysis={analyses.combined} />

      <div className={styles.sectionLabel}>
        アイルーだるま落とし（{darumaCount}件）
      </div>
      <SettingGrid analysis={analyses.daruma} />

      <div className={styles.sectionLabel}>
        ポイントモード（クエスト {questCount}件）
      </div>
      <SettingGrid analysis={analyses.pointMode} />

      <div className={styles.sectionLabel}>
        クエストテーブル（AT {atCount}件）
      </div>
      <SettingGrid analysis={analyses.questTable} />

      <div className={styles.sectionLabel}>
        ライズゾーン（{rizeZone}/{weakRare}回
        {rizeRate !== null ? ` = ${rizeRate.toFixed(1)}%` : ''}）
      </div>
      <SettingGrid analysis={analyses.rize} />

      <p className={styles.note}>
        ※収束の速さは だるま落とし &gt; ポイントモード &gt; クエストテーブル &gt; ライズゾーン の順。
        ライズゾーンは設定1と6で当選率が34.2%↔39.3%しか変わらないため、
        分離するには弱レア役350回（≒12,500G）程度が必要。
      </p>
    </div>
  );
}
