import { useMemo } from 'react';
import type {
  LycorisAxis,
  LycorisAxisId,
  LycorisHintTally,
  LycorisMachine,
  LycorisSettingAnalysis as AnalysisResult,
} from '../../types';
import {
  LYCORIS_150_KOUKAKU_RATE,
  LYCORIS_BAND_VISIBILITY,
  LYCORIS_BELL_DENOM,
  LYCORIS_DIRECT_DENOM,
  LYCORIS_SHORT_CEILING_MARGIN,
  LYCORIS_SHORT_CEILING_RATE,
  LYCORIS_SHORT_CEILINGS,
  LYCORIS_SHORT_CEILING_TOTAL,
  LYCORIS_WEAK_KOUKAKU_RATE,
} from '../../data/lycorisDefinitions';
import { calculateLycorisAnalysis } from '../../utils/lycorisEstimation';
import styles from './LycorisSettingAnalysis.module.css';

const SETTING_ROWS: { key: keyof AnalysisResult; label: string; color: string }[] = [
  { key: 'setting1', label: '設定1', color: 'var(--color-setting-1)' },
  { key: 'setting2', label: '設定2', color: 'var(--color-setting-2)' },
  { key: 'setting3', label: '設定3', color: 'var(--color-setting-3)' },
  { key: 'setting4', label: '設定4', color: 'var(--color-setting-4)' },
  { key: 'setting5', label: '設定5', color: 'var(--color-setting-5)' },
  { key: 'setting6', label: '設定6', color: 'var(--color-setting-6)' },
];

const EQUAL_SHARE = 100 / SETTING_ROWS.length;

const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;

/** 各軸の基準値（設定1 → 設定6）。観測される値で出す（変換高確は帯が出る割合を掛けた値） */
const AXIS_REFERENCE: Record<LycorisAxisId, string> = {
  bell: `1/${LYCORIS_BELL_DENOM[0]}（設定1〜3）→ 1/${LYCORIS_BELL_DENOM[5]}`,
  koukakuWeak: `帯 ${pct(LYCORIS_BAND_VISIBILITY * LYCORIS_WEAK_KOUKAKU_RATE[0])} → ${pct(LYCORIS_BAND_VISIBILITY * LYCORIS_WEAK_KOUKAKU_RATE[5])}`,
  koukaku150: `帯 ${pct(LYCORIS_BAND_VISIBILITY * LYCORIS_150_KOUKAKU_RATE[0])}（設定1〜3）→ ${pct(LYCORIS_BAND_VISIBILITY * LYCORIS_150_KOUKAKU_RATE[5])}`,
  direct: `1/${LYCORIS_DIRECT_DENOM[0]} → 1/${LYCORIS_DIRECT_DENOM[5]}`,
  shortCeiling: `短縮 ${pct(LYCORIS_SHORT_CEILING_TOTAL[0])} → ${pct(LYCORIS_SHORT_CEILING_TOTAL[5])}`,
};

const HINT_CATEGORIES: { id: LycorisHintTally['category']; label: string }[] = [
  { id: 'prologue', label: 'プロローグ（初当り時）' },
  { id: 'episode', label: 'エピソードボーナス' },
  { id: 'endScreen', label: '終了画面' },
  { id: 'trophy', label: 'サミートロフィー' },
];

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

function observedText(axis: LycorisAxis): string {
  switch (axis.unit) {
    case 'games':
      return axis.hit > 0 && axis.total > 0
        ? `${axis.hit}回 / ${axis.total.toLocaleString()}G（1/${(axis.total / axis.hit).toFixed(1)}）`
        : `${axis.hit}回 / ${axis.total.toLocaleString()}G`;
    case 'events':
      return axis.total > 0 ? `帯 ${axis.hit}/${axis.total}（${pct(axis.hit / axis.total)}）` : '観測なし';
    case 'cycles':
      return axis.total > 0 ? `短縮確認 ${axis.hit}回 / 観測 ${axis.total}サイクル` : '観測なし';
  }
}

/** この軸だけで見たときの最有力設定。均等から動いていなければ null */
function leadingSetting(axis: LycorisAxis): string | null {
  if (!axis.usable) return null;
  const top = SETTING_ROWS.reduce((best, s) => (axis.posterior[s.key] > axis.posterior[best.key] ? s : best));
  const value = axis.posterior[top.key];
  return value > EQUAL_SHARE + 0.5 ? `${top.label} ${value.toFixed(0)}%` : null;
}

export function LycorisSettingAnalysis({ machine }: { machine: LycorisMachine }) {
  const { events, bell, weakLycoris, weakLycorisKoukaku, totalGames, startGame, currentGame } = machine;
  const analysis = useMemo(
    () => calculateLycorisAnalysis({ events, bell, weakLycoris, weakLycorisKoukaku, totalGames, startGame, currentGame }),
    [events, bell, weakLycoris, weakLycorisKoukaku, totalGames, startGame, currentGame]
  );

  return (
    <div className={styles.container}>
      <div className={styles.sectionLabel}>
        設定推測（トータル {analysis.totalGames.toLocaleString()}G・AT {analysis.cycles.filter((c) => c.at).length}回）
      </div>
      <SettingGrid analysis={analysis.setting} />

      {analysis.excludedSettings.length > 0 && (
        <p className={styles.excluded}>
          終了画面・トロフィーの「濃厚」により 設定{analysis.excludedSettings.join('・')} を除外しています。
        </p>
      )}
      {analysis.settingConflict && (
        <p className={styles.conflict}>
          ！記録した「濃厚」どうしが矛盾しています（重なる設定がありません）。
          制約を外して推定しています。終了画面・トロフィーの記録を見直してください。
        </p>
      )}

      <div className={styles.sectionLabel}>軸ごとの実測</div>
      <ul className={styles.axisList}>
        {analysis.axes.map((axis) => {
          const lead = leadingSetting(axis);
          return (
            <li key={axis.id} className={`${styles.axisRow} ${axis.usable ? '' : styles.axisIdle}`}>
              <span className={styles.axisHead}>
                <b>{axis.label}</b>
                {lead && <span className={styles.axisLead}>{lead}</span>}
              </span>
              <span className={styles.axisObserved}>{observedText(axis)}</span>
              <span className={styles.axisReference}>基準 {AXIS_REFERENCE[axis.id]}</span>
              {axis.warning && <span className={styles.axisWarning}>！{axis.warning}</span>}
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>
        ※5つの軸はどれも設定1〜6の表がある要素です。ただし変換高確は「約10%」から作った補正値0.9を掛けており、
        弱リコリス目の設定2はサイト間で食い違う値のうち一方（38.3%）を採っています。
        各軸の対数尤度を足して1回だけ正規化しています。ベルが情報の柱なので、通常時のベルはできるだけ数えてください。
      </p>
      <p className={styles.note}>
        ※変換高確は<b>帯が出る割合（{pct(LYCORIS_BAND_VISIBILITY, 0)}）を掛けた値</b>と比べています。
        移行しても約10%は煽りが失敗して帯が出ないためです。補正しないと設定6が設定4〜5に見えます。
        弱リコリス目は「弱リコ目」「→高確」の2つのカウンターから取ります（高確中に引いたものは数えない）。      </p>
      <p className={styles.note}>
        ※天井短縮はラッシュ50終了後のサイクルだけが対象です。短縮告知・短縮天井での当選は短縮天井が確定、
        CZ成功・直撃での当選は「そのG数より{LYCORIS_SHORT_CEILING_MARGIN}G以上手前の短縮天井は無かった」として使います
        （+αの範囲で入ったCZは短縮天井そのものだった可能性があるため。750Gは全設定共通）。
      </p>
      <p className={styles.note}>
        ※高設定/低設定がはっきり分かれるまで、設定6↔1でも通常時で1万G前後かかります。隣接設定の判別には使えません。
      </p>

      <div className={styles.sectionLabel}>出現した示唆</div>
      {analysis.hints.length === 0 ? (
        <p className={styles.empty}>AT当選の記録にプロローグ・エピソードボーナス・終了画面・トロフィーを入れると、ここに集まります。</p>
      ) : (
        HINT_CATEGORIES.map((category) => {
          const tallies = analysis.hints.filter((t) => t.category === category.id);
          if (tallies.length === 0) return null;
          return (
            <div key={category.id} className={styles.hintGroup}>
              <span className={styles.hintGroupLabel}>{category.label}</span>
              <ul className={styles.hintList}>
                {tallies.map((tally) => (
                  <li key={tally.key} className={`${styles.hintRow} ${styles[`strength_${tally.strength}`]}`}>
                    <span className={styles.hintHead}>
                      <b>{tally.label}</b>
                      <span className={styles.hintCount}>×{tally.count}</span>
                    </span>
                    <span className={tally.strength === 'constraint' ? styles.hintStrong : styles.hint}>{tally.hint}</span>
                    <span className={styles.hintWhere}>
                      {tally.cycles.map((cycle, i) => (
                        <span key={`${cycle}-${i}`} className={styles.hintChip}>{cycle}回</span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
      <p className={styles.note}>
        ※左の線が赤い行が「濃厚」で、推定の制約に反映済みです。それ以外（示唆・弱/強）は振り分けが非公開のため、
        事後確率には入れず回数だけ出しています。「◯回」はそのATに当選したサイクルです。
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
          {analysis.reference.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                {row.label}
                {row.note && <span className={styles.obsNote}>{row.note}</span>}
              </th>
              <td>
                {row.total > 0 && row.hit > 0
                  ? row.id === 'band'
                    ? `${pct(row.hit / row.total)}`
                    : `1/${(row.total / row.hit).toFixed(1)}`
                  : '—'}
                {row.total > 0 && (
                  <span className={styles.obsCount}>
                    {row.hit}/{row.total}
                  </span>
                )}
              </td>
              <td>{row.setting1}</td>
              <td>{row.setting6}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.note}>
        ※AT初当り・CZはATの大半がCZ経由のため互いに重なっていて、独立な軸として足すと情報を二重に数えます。
        帯の出現率は設定差の無い契機の実測で、45%から大きく外れるなら帯の見落としを疑ってください。
      </p>

      <details className={styles.details}>
        <summary>使用している表</summary>
        <table className={styles.modelTable}>
          <thead>
            <tr>
              <th scope="col">設定</th>
              <th scope="col">ベル</th>
              <th scope="col">弱リコ目</th>
              <th scope="col">150G</th>
              <th scope="col">直撃</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <th scope="row">{i + 1}</th>
                <td>1/{LYCORIS_BELL_DENOM[i]}</td>
                <td>{pct(LYCORIS_WEAK_KOUKAKU_RATE[i])}</td>
                <td>{pct(LYCORIS_150_KOUKAKU_RATE[i])}</td>
                <td>1/{LYCORIS_DIRECT_DENOM[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className={styles.modelTable}>
          <thead>
            <tr>
              <th scope="col">設定</th>
              {LYCORIS_SHORT_CEILINGS.map((c) => (
                <th key={c} scope="col">{c}G</th>
              ))}
              <th scope="col">合算</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <th scope="row">{i + 1}</th>
                {LYCORIS_SHORT_CEILINGS.map((c) => (
                  <td key={c}>{pct(LYCORIS_SHORT_CEILING_RATE[c][i])}</td>
                ))}
                <td>{pct(LYCORIS_SHORT_CEILING_TOTAL[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.note}>
          変換高確の移行率は公表値。推定では帯が出る割合 {LYCORIS_BAND_VISIBILITY} を掛けて使います。
          弱リコリス目の設定2はサイト間で食い違うため、なな徹の38.3%を採っています。
        </p>
      </details>
    </div>
  );
}
