import { useMemo } from 'react';
import type { KabaneriSettingAnalysis as AnalysisResult } from '../../types/kabaneri';
import { useMachineStore, isKabaneriMachine } from '../../stores/machineStore';
import { DEFAULT_KABANERI_ANALYSIS_TARGETS, kabaneriFlashAxes, normalizeKabaneriAnalysisTargets } from '../../data/kabaneriDefinitions';
import { calculateSelectedKabaneriAnalyses } from '../../utils/kabaneriEstimation';
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
  const savedTargets = useMachineStore((state) =>
    (machine ? state.kabaneriAnalysisTargets[machine.id] : undefined) ?? DEFAULT_KABANERI_ANALYSIS_TARGETS
  );
  const targets = useMemo(() => normalizeKabaneriAnalysisTargets(savedTargets), [savedTargets]);
  const setTarget = useMachineStore((state) => state.setKabaneriAnalysisTarget);

  const counters = machine && isKabaneriMachine(machine) ? machine.counters : null;
  const totalGames = machine && isKabaneriMachine(machine) ? machine.totalGames : 0;

  const { bellAnalysis, combined, bellCount, bellError, flashes } =
    useMemo(() => calculateSelectedKabaneriAnalyses(counters ?? {}, totalGames, targets),
      [counters, totalGames, targets]);

  return (
    <div className={styles.container}>
      <fieldset className={styles.targets}>
        <legend>推測に使う項目</legend>
        <label className={styles.target}>
          <input type="checkbox" checked={targets.bell} onChange={(e) => setTarget('bell', e.target.checked)} />
          下段ベル
        </label>
        {kabaneriFlashAxes.map((axis) => (
          <label key={axis.id} className={styles.target}>
            <input type="checkbox" checked={targets[axis.id]} onChange={(e) => setTarget(axis.id, e.target.checked)} />
            {axis.label}の発光率（暫定）
          </label>
        ))}
        <p className={styles.note}>計測した項目だけ選択してください。オフにしてもカウントは残ります。選択は台ごとにこの端末へ保存します。</p>
      </fieldset>
      <div className={styles.sectionLabel}>総合</div>
      {combined ? <SettingGrid analysis={combined} /> : (
        <p className={styles.empty}>推測に使う項目を選び、計測データを入力してください。</p>
      )}

      <div className={styles.sectionLabel}>
        下段ベル（{bellCount}回 / {totalGames}G）
      </div>
      {bellAnalysis ? <SettingGrid analysis={bellAnalysis} /> : (
        <p className={styles.empty}>{!targets.bell ? '推測に使用しない' : bellError ? 'ベル回数とゲーム数を確認してください。' : 'ゲーム数を入力してください。'}</p>
      )}
      {targets.bell && <p className={styles.hint}>ゲーム数は下段ベルを数えた区間の総ゲーム数に合わせてください。0回も計測結果として扱います。</p>}

      {kabaneriFlashAxes.map((axis) => {
        const result = flashes[axis.id];
        const rate = result.chanceTotal > 0 ? (result.flashTotal / result.chanceTotal * 100).toFixed(1) : null;
        return (
          <div key={axis.id}>
            <div className={styles.sectionLabel}>
              {axis.label}の発光率（{result.flashTotal}/{result.chanceTotal}回{rate !== null ? ` = ${rate}%` : ''}）
            </div>
            {result.analysis ? <SettingGrid analysis={result.analysis} /> : (
              <p className={styles.empty}>{!targets[axis.id] ? '推測に使用しない' : result.error ? '成立数と発光数を確認してください。' : '対象のチャンス目を記録してください。'}</p>
            )}
          </div>
        );
      })}

      <p className={styles.note}>
        ※発光率は暫定モデルです。設定1→6の基準は無名＋生駒8→20%、カバネ23→31.3%。
        推定低設定の実戦値を設定1に仮置きし、設定2〜5は直線で補間しています。
        解析値ではなく、近い設定同士を細かく判別する根拠にはできません。
        非高確・非発光中の単独チャンス目のみカウント対象。
      </p>
      <details className={styles.modelDetails}>
        <summary>暫定モデルの設定別発光率</summary>
        <table className={styles.modelTable}>
          <thead><tr><th scope="col">設定</th><th scope="col">無名＋生駒</th><th scope="col">カバネ</th></tr></thead>
          <tbody>{SETTING_ROWS.map((setting, index) => (
            <tr key={setting.key}>
              <th scope="row">{setting.label}</th>
              {kabaneriFlashAxes.map((axis) => <td key={axis.id}>{(axis.rates[index].rate * 100).toFixed(axis.id === 'kabane' ? 2 : 1)}%</td>)}
            </tr>
          ))}</tbody>
        </table>
      </details>
    </div>
  );
}
