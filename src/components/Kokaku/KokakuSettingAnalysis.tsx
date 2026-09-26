import { useMemo } from 'react';
import type { KokakuMachine, KokakuSettingAnalysis as AnalysisResult } from '../../types';
import {
  KOKAKU_CZ_TRANSITION,
  KOKAKU_MODES,
  KOKAKU_MODE_COLOR,
  KOKAKU_MODE_LABEL,
  KOKAKU_SCREEN_CONTEXT_LABEL,
  findKokakuScreen,
  resolveKokakuOccasion,
} from '../../data/kokakuDefinitions';
import { KokakuScreenImage } from './KokakuScreenImage';
import {
  calculateKokakuAnalysis,
  calculateKokakuModePosteriors,
  summarizeKokakuScreens,
  toKokakuSettingWeights,
} from '../../utils/kokakuEstimation';
import styles from './KokakuSettingAnalysis.module.css';

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
            <span className={`${styles.settingValue} ${isTop ? styles.highProbability : ''}`}>
              {value.toFixed(1)}%
            </span>
            <span className={styles.bar}>
              <span
                className={styles.barFill}
                style={{ width: `${Math.min(100, value)}%`, background: setting.color }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function KokakuSettingAnalysis({ machine }: { machine: KokakuMachine }) {
  const analysis = useMemo(
    () => calculateKokakuAnalysis(machine.events, machine.currentGame),
    [machine.events, machine.currentGame]
  );
  const posteriors = useMemo(
    () => calculateKokakuModePosteriors(analysis.rows, toKokakuSettingWeights(analysis.setting)),
    [analysis.rows, analysis.setting]
  );
  const screens = useMemo(() => summarizeKokakuScreens(analysis.rows), [analysis.rows]);
  // 1/10676〜1/4473 の低頻度なので率では見ない。引けた回数だけ出す
  const directAtCount = analysis.rows.filter((r) => r.end?.at === 'direct').length;

  return (
    <div className={styles.container}>
      <div className={styles.sectionLabel}>
        設定推測（CZ後のモード移行率・サンプル {analysis.czFailCount}件）
      </div>
      <SettingGrid analysis={analysis.setting} />

      {analysis.excludedSettings.length > 0 && (
        <p className={styles.excluded}>
          画面の「濃厚」示唆により 設定{analysis.excludedSettings.join('・')} を除外しています。
        </p>
      )}

      {analysis.settingConflict && (
        <p className={styles.conflict}>
          ！記録した設定示唆どうしが矛盾しています（重なる設定がありません）。
          制約を外して推定しています。画面の記録を見直してください。
        </p>
      )}

      <p className={styles.note}>
        ※事後確率に使っているのは <b>CZ後のモード移行率</b> だけです（設定1〜6が判明している唯一の要素）。
        設定差があるのはCZ失敗の後だけで、AT終了後の振り分けは全設定共通のため、
        AT当選が続く展開では設定の情報が増えません。
      </p>
      <p className={styles.note}>
        ※この軸は<b>高設定/低設定の二分にしか使えません</b>。設定1と2は通常C・通常Dが同値、
        設定3と4も通常C＝通常Dで、隣接設定はほぼ分離できません
        （設定6↔1はCZ失敗22回程度で分かれますが、設定5↔6は400回以上必要）。
      </p>

      <div className={styles.sectionLabel}>殲滅モードの履歴</div>
      {posteriors.length <= 1 && posteriors[0]?.prior ? (
        <p className={styles.empty}>殲滅ZONEを記録すると、サイクルごとの推定モードが出ます。</p>
      ) : (
        <div className={styles.modeList}>
          {posteriors.map((p) => (
            <div key={p.index} className={styles.modeRow}>
              <span className={styles.modeIndex}>{p.index}回</span>
              <span className={styles.modeBars}>
                {KOKAKU_MODES.filter((m) => p.distribution[m] > 0.005).map((m) => (
                  <span
                    key={m}
                    className={styles.modeBar}
                    style={{ background: KOKAKU_MODE_COLOR[m], flexGrow: p.distribution[m] }}
                    title={`${KOKAKU_MODE_LABEL[m]} ${(p.distribution[m] * 100).toFixed(1)}%`}
                  >
                    {p.distribution[m] > 0.15 && KOKAKU_MODE_LABEL[m].replace('通常', '')}
                  </span>
                ))}
              </span>
              {p.prior && <span className={styles.priorTag}>観測なし</span>}
            </div>
          ))}
        </div>
      )}
      <p className={styles.note}>
        ※モードはサイクルごとに引き直され、次のモードは直前のモードに依存しません
        （移行率表が移行先だけの1次元のため）。後のサイクルの観測が手前のモードを
        絞り込むことはないので、各行は独立して読んでください。
      </p>

      <div className={styles.sectionLabel}>
        出現した示唆（{screens.total}件
        {screens.total > 0 && `・うちデフォルト以外 ${screens.nonDefault}件`}）
      </div>
      {screens.tallies.length === 0 ? (
        <p className={styles.empty}>
          終了画面・裏コマンドを記録すると、出た画面がここに集まります。
        </p>
      ) : (
        <ul className={styles.screenTally}>
          {screens.tallies.map((tally) => {
            const info = findKokakuScreen(tally.screen)!;
            const constrains = info.allowedModes !== null || info.allowedSettings !== null;
            return (
              <li
                key={tally.screen}
                className={`${styles.tallyRow} ${styles[`tallyFrame_${info.frame}`]}`}
              >
                <span className={styles.tallyThumb}>
                  <KokakuScreenImage
                    screen={tally.screen}
                    alt={info.label}
                    fallback={<span className={styles.tallyFallback}>{info.label}</span>}
                  />
                </span>
                <span className={styles.tallyBody}>
                  <span className={styles.tallyHead}>
                    <b>{info.label}</b>
                    <span className={styles.tallyCount}>×{tally.count}</span>
                    <span className={styles.tallyCatalog}>
                      {KOKAKU_SCREEN_CONTEXT_LABEL[info.context]}
                    </span>
                  </span>
                  <span className={constrains ? styles.tallyHintStrong : styles.tallyHint}>
                    {[info.modeHint, info.settingHint].filter(Boolean).join(' ／ ') || '—'}
                  </span>
                  <span className={styles.tallyWhere}>
                    {tally.appearances.map((a) => (
                      <span key={a.eventIndex} className={styles.tallyChip}>
                        {a.cycle}回
                        <small>{resolveKokakuOccasion(tally.screen, a.occasion).short}</small>
                      </span>
                    ))}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className={styles.note}>
        ※「◯回」は<b>示唆が掛かっているサイクル</b>です。終了時に見た画面は
        次のサイクルのモードを示唆するので、見たタイミングとは1つずれます。
        小さいタグは出現場面（CZ＝CZ終了画面 / PUSH＝CZ終了+PUSH / AT＝AT終了 / 裏＝裏コマンド）。
      </p>
      <p className={styles.note}>
        ※枠が色つき（赤・紫・金）の行が「濃厚」で、推定の制約に反映済みです。
        それ以外は示唆のみで、振り分けが非公開のため事後確率には入れていません。
      </p>

      <div className={styles.sectionLabel}>参考：実測値（事後確率には入れていない）</div>
      <table className={styles.observedTable}>
        <thead>
          <tr>
            <th scope="col">要素</th>
            <th scope="col">実測</th>
            <th scope="col">設定1</th>
            <th scope="col">設定6</th>
          </tr>
        </thead>
        <tbody>
          {analysis.observed.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                {row.label}
                {row.note && <span className={styles.obsNote}>{row.note}</span>}
              </th>
              <td>
                {row.total > 0 ? (
                  <>
                    {((row.hit / row.total) * 100).toFixed(1)}%
                    <span className={styles.obsCount}>
                      {row.hit}/{row.total}
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td>{row.setting1 !== null ? `${row.setting1}%` : '—'}</td>
              <td>{row.setting6 !== null ? `${row.setting6}%` : '—'}</td>
            </tr>
          ))}
          {analysis.observed.length === 0 && (
            <tr>
              <td colSpan={4} className={styles.empty}>
                まだ記録がありません。
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {directAtCount > 0 && (
        <p className={styles.note}>
          ※殲滅ZONEからのAT直撃 <b>{directAtCount}回</b>
          （設定1 1/10676.6 ↔ 設定6 1/4473.0）。2倍差はありますが絶対値が小さく、
          引けなければ情報になりません。率ではなく回数で見てください。
        </p>
      )}
      <p className={styles.note}>
        ※これらは<b>設定1と設定6の両端しか公開されていない</b>ため、事後確率には入れていません。
        中間設定を補間した表を作って%を出すと、実測に見えない根拠が独り歩きします。
        色は母確率が違うので合算せず、色ごとに分けて集計しています。
      </p>

      <details className={styles.details}>
        <summary>CZ後のモード移行率（使用している表）</summary>
        <table className={styles.modelTable}>
          <thead>
            <tr>
              <th scope="col">設定</th>
              <th scope="col">通常A</th>
              <th scope="col">通常B</th>
              <th scope="col">通常C</th>
              <th scope="col">通常D</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <th scope="row">設定{i + 1}</th>
                <td>{(KOKAKU_CZ_TRANSITION.normalA[i] * 100).toFixed(1)}%</td>
                <td>{(KOKAKU_CZ_TRANSITION.normalB[i] * 100).toFixed(1)}%</td>
                <td>{(KOKAKU_CZ_TRANSITION.normalC[i] * 100).toFixed(1)}%</td>
                <td>{(KOKAKU_CZ_TRANSITION.normalD[i] * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.note}>AT終了後は全設定共通で 通常A 12.5% / 通常B 25.0% / 通常C 12.5% / 通常D 50.0%。</p>
      </details>
    </div>
  );
}
