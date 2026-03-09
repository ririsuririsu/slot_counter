import { useMemo } from 'react';
import type { HokutoLog, HokutoSettingAnalysis, ModeDistribution, TengekiStats, ResetStatus } from '../../types';
import type { HokutoMode } from '../../types';
import { filterLogsByType, estimateModesForAllATs } from '../../utils/hokutoEstimation';
import type { ATWinLog, TenhaLog } from '../../types';
import { MODE_LABELS } from '../../data/hokutoDefinitions';
import { Modal } from '../common/Modal';
import styles from './AnalysisModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  logs: HokutoLog[];
  totalGames: number;
  totalAbeshi: number;
  resetStatus: ResetStatus;
  settingAnalysis: HokutoSettingAnalysis;
  modeDistribution: ModeDistribution;
  tengekiStats: TengekiStats;
}

const SETTINGS = [
  { key: 'setting1' as const, label: '設定1' },
  { key: 'setting2' as const, label: '設定2' },
  { key: 'setting3' as const, label: '設定3' },
  { key: 'setting4' as const, label: '設定4' },
  { key: 'setting5' as const, label: '設定5' },
  { key: 'setting6' as const, label: '設定6' },
];

const MODES: { key: keyof ModeDistribution; mode: HokutoMode }[] = [
  { key: 'tengoku', mode: 'tengoku' },
  { key: 'modeC', mode: 'mode-c' },
  { key: 'modeB', mode: 'mode-b' },
  { key: 'modeA', mode: 'mode-a' },
];

function getTopMode(dist: ModeDistribution): HokutoMode {
  const entries: [HokutoMode, number][] = [
    ['mode-a', dist.modeA], ['mode-b', dist.modeB], ['mode-c', dist.modeC], ['tengoku', dist.tengoku],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function AnalysisModal({
  isOpen,
  onClose,
  logs,
  totalGames,
  resetStatus,
  settingAnalysis,
  modeDistribution,
  tengekiStats,
}: Props) {
  const atWinCount = filterLogsByType<ATWinLog>(logs, 'at-win').length;
  const tenhaCount = filterLogsByType<TenhaLog>(logs, 'tenha').length;

  const modeTally = useMemo(() => {
    const estimates = estimateModesForAllATs(logs, resetStatus);
    const tally: Record<HokutoMode, number> = { 'mode-a': 0, 'mode-b': 0, 'mode-c': 0, 'tengoku': 0 };
    for (const dist of Object.values(estimates)) {
      tally[getTopMode(dist)]++;
    }
    return tally;
  }, [logs, resetStatus]);
  const tallyTotal = Object.values(modeTally).reduce((a, b) => a + b, 0);
  const tallyMax = Math.max(...Object.values(modeTally));

  const atRate = totalGames > 0 && atWinCount > 0 ? (totalGames / atWinCount).toFixed(1) : '---';
  const tenhaRate = totalGames > 0 && tenhaCount > 0 ? (totalGames / tenhaCount).toFixed(1) : '---';
  const hazureRate = tengekiStats.hazureTotal > 0 ? ((tengekiStats.hazureSuccess / tengekiStats.hazureTotal) * 100).toFixed(1) : '---';
  const totalRate = tengekiStats.overallTotal > 0 ? ((tengekiStats.overallSuccess / tengekiStats.overallTotal) * 100).toFixed(1) : '---';

  const settingMax = Math.max(...SETTINGS.map((s) => settingAnalysis[s.key]));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="分析">
      <div className={styles.content}>
        {/* サマリー */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>実戦値</h4>
          <div className={styles.statGrid}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>AT初当たり</span>
              <span className={styles.statValue}>{atRate === '---' ? atRate : `1/${atRate}`}</span>
              <span className={styles.statSub}>{atWinCount}回</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>天破の刻</span>
              <span className={styles.statValue}>{tenhaRate === '---' ? tenhaRate : `1/${tenhaRate}`}</span>
              <span className={styles.statSub}>{tenhaCount}回</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>天撃ハズレ時</span>
              <span className={styles.statValue}>{hazureRate === '---' ? hazureRate : `${hazureRate}%`}</span>
              <span className={styles.statSub}>{tengekiStats.hazureSuccess}/{tengekiStats.hazureTotal}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>天撃トータル</span>
              <span className={styles.statValue}>{totalRate === '---' ? totalRate : `${totalRate}%`}</span>
              <span className={styles.statSub}>{tengekiStats.overallSuccess}/{tengekiStats.overallTotal}</span>
            </div>
          </div>
        </div>

        {/* 設定推定 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>設定推定</h4>
          <div className={styles.barList}>
            {SETTINGS.map(({ key, label }) => {
              const value = settingAnalysis[key];
              const width = settingMax > 0 ? (value / settingMax) * 100 : 0;
              const isHighest = value === settingMax && value > 0;
              return (
                <div key={key} className={styles.barRow}>
                  <span className={styles.barLabel}>{label}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${isHighest ? styles.barFillSettingHighest : styles.barFillSetting}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className={styles.barValue}>{value.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* モード集計 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>モード集計（AT {tallyTotal}回）</h4>
          {tallyTotal > 0 ? (
            <div className={styles.barList}>
              {MODES.map(({ mode }) => {
                const count = modeTally[mode];
                const pct = tallyTotal > 0 ? (count / tallyTotal) * 100 : 0;
                const width = tallyMax > 0 ? (count / tallyMax) * 100 : 0;
                const isHighest = count === tallyMax && count > 0;
                return (
                  <div key={mode} className={styles.barRow}>
                    <span className={styles.barLabel}>{MODE_LABELS[mode]}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={`${styles.barFill} ${isHighest ? styles.barFillModeHighest : styles.barFillMode}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className={styles.barValue}>
                      {count}<span className={styles.barCount}>回</span>
                      <span className={styles.barPct}>{pct.toFixed(0)}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.emptyText}>ATデータなし</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
