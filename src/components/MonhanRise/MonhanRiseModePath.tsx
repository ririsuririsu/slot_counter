import { useMemo } from 'react';
import type { MonhanRiseEvent, PointMode, QuestTable } from '../../types';
import {
  POINT_MODES,
  QUEST_CEILING,
  POINT_MODE_COLOR,
  POINT_MODE_LABEL,
  POINT_MODE_SHORT,
  QUEST_TABLES,
  QUEST_TABLE_COLOR,
  QUEST_TABLE_LABEL,
  QUEST_TABLE_SHORT,
} from '../../data/monhanRiseDefinitions';
import {
  calculateAllAnalyses,
  calculatePointModeTransition,
  calculateCumulativeQuestHit,
  calculateQuestHitExpectancy,
  calculateQuestTableTransition,
  toSettingWeights,
} from '../../utils/monhanRiseEstimation';
import type { ModeTransitionResult } from '../../utils/monhanRiseEstimation';
import styles from './MonhanRiseModePath.module.css';

interface MonhanRiseModePathProps {
  events: MonhanRiseEvent[];
  weakRare: number;
  rizeZone: number;
}

/** 現在のモードを出す設定（両端だけ出せば幅は掴める） */
const SHOWN_SETTINGS = [1, 6] as const;

/**
 * これを下回るステップは「まだ絞り込めていない」として薄く出す。
 * 状態は4つなので何も分からなければ25%。7割あれば十分に傾いていると見なす。
 */
const WEAK_CONFIDENCE = 0.7;

/** 期待度を出すクエスト回数（1〜7回目） */
const QUEST_NUMBERS = Array.from({ length: QUEST_CEILING }, (_, i) => i + 1);

/** 期待度の1行（その回 / 累計 で共用） */
function ExpectancyRow({
  setting,
  values,
  suffix,
}: {
  setting: number;
  values: (number | null)[];
  suffix: string;
}) {
  return (
    <div className={styles.expectancyRow}>
      <span className={styles.setting}>設定{setting}</span>
      {values.map((rate, i) => (
        <span
          key={i}
          className={`${styles.expectancyCell} ${
            rate === null ? styles.expectancyNone : ''
          }`}
          // 数字だけだと差が読みにくいので、濃さでも大小を出す
          style={rate !== null ? { opacity: 0.45 + rate * 0.55 } : undefined}
          title={
            rate === null
              ? `${i + 1}回目には到達しない`
              : `${i + 1}${suffix} ${(rate * 100).toFixed(1)}%`
          }
        >
          {rate === null ? '—' : `${(rate * 100).toFixed(0)}`}
        </span>
      ))}
    </div>
  );
}

interface TransitionBlockProps<S extends string> {
  title: string;
  states: readonly S[];
  result: ModeTransitionResult<S>;
  short: Record<S, string>;
  color: Record<S, string>;
  label: Record<S, string>;
}

function TransitionBlock<S extends string>({
  title,
  states,
  result,
  short,
  color,
  label,
}: TransitionBlockProps<S>) {
  return (
    <>
      <div className={styles.blockHead}>
        <span>{title}</span>
      </div>

      {/* 実機で起きたモードの並びは1本しかないので、遷移も1本だけ出す */}
      <div className={styles.chain}>
        {result.path.length === 0 ? (
          <span className={styles.empty}>データ待ち</span>
        ) : (
          result.path.map(({ state, confidence }, i) => (
            <span key={i} className={styles.step}>
              {i > 0 && <span className={styles.arrow}>›</span>}
              {/*
                確信度は前後すべての観測を使った事後確率。
                1回の観測では絞れなくても、後のモードが確定すると遡って上がる。
                薄いノードは、まだ絞り込めていないステップ。
              */}
              <span
                className={`${styles.node} ${
                  confidence < WEAK_CONFIDENCE ? styles.nodeWeak : ''
                }`}
                style={{ borderColor: color[state], color: color[state] }}
                title={`${label[state]} / 確度 ${(confidence * 100).toFixed(0)}%`}
              >
                {short[state]}
              </span>
            </span>
          ))
        )}
      </div>

      {/* 設定差が出るのは「次にどのモードへ行くか」なので、こちらを設定別に出す */}
      <div className={styles.currentHead}>次のモード</div>
      {result.currentBySetting.map(({ setting, distribution }) => (
        <div key={setting} className={styles.currentRow}>
          <span className={styles.setting}>設定{setting}</span>
          {/*
            積み上げバーにして分布を面積で見せる。
            拮抗しているとき（例: テーブルAと天国が34.5%/34.4%）に
            最有力だけを読み違えないようにするため。
          */}
          <div className={styles.bar}>
            {states.map((state) => {
              const percent = distribution[state] * 100;
              if (percent < 0.5) return null;
              return (
                <span
                  key={state}
                  className={styles.segment}
                  style={{ width: `${percent}%`, background: color[state] }}
                  title={`${label[state]} ${percent.toFixed(1)}%`}
                >
                  {/* 狭い区画に文字を入れると溢れるので、入る幅のときだけ出す */}
                  {percent >= 13 && (
                    <span className={styles.segmentLabel}>
                      {short[state]} {percent.toFixed(0)}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * ポイントモードとクエストテーブルの遷移。
 *
 * 遷移そのものは実機で起きた1本の並びなので、設定事後で重み付けして1本に統合する。
 * 設定によって変わるのは「次にどのモードへ行くか」なので、そちらだけ設定別に出す。
 */
export function MonhanRiseModePath({
  events,
  weakRare,
  rizeZone,
}: MonhanRiseModePathProps) {
  const settingWeights = useMemo(
    () => toSettingWeights(calculateAllAnalyses(weakRare, rizeZone, events).combined),
    [events, weakRare, rizeZone]
  );

  const pointResult = useMemo(
    () => calculatePointModeTransition(events, settingWeights, SHOWN_SETTINGS),
    [events, settingWeights]
  );

  const tableResult = useMemo(
    () => calculateQuestTableTransition(events, settingWeights, SHOWN_SETTINGS),
    [events, settingWeights]
  );

  return (
    <div className={styles.container}>
      <TransitionBlock<PointMode>
        title="ポイントモード遷移"
        states={POINT_MODES}
        result={pointResult}
        short={POINT_MODE_SHORT}
        color={POINT_MODE_COLOR}
        label={POINT_MODE_LABEL}
      />
      <TransitionBlock<QuestTable>
        title="クエストテーブル遷移"
        states={QUEST_TABLES}
        result={tableResult}
        short={QUEST_TABLE_SHORT}
        color={QUEST_TABLE_COLOR}
        label={QUEST_TABLE_LABEL}
      />

      {/*
        推定した次のテーブル分布から、次のATが何回目のクエストで当たるかを出す。
        クエストを外すたびにテーブルの事後が変わる（2回目に到達した時点で天国は消える）ので、
        各回数は「そこまで到達した前提」で条件付けし直した値。
      */}
      <div className={styles.blockHead}>
        <span>クエスト回数別 AT当選期待度</span>
      </div>
      <div className={styles.expectancy}>
        <div className={styles.expectancyRow}>
          <span className={styles.setting} />
          {QUEST_NUMBERS.map((k) => (
            <span key={k} className={styles.expectancyHead}>
              {k}
            </span>
          ))}
        </div>

        <div className={styles.currentHead}>その回で当選</div>
        {tableResult.currentBySetting.map(({ setting, distribution }) => (
          <ExpectancyRow
            key={setting}
            setting={setting}
            values={calculateQuestHitExpectancy(distribution)}
            suffix="回目で当選"
          />
        ))}

        <div className={styles.currentHead}>そこまでに当選（累計）</div>
        {tableResult.currentBySetting.map(({ setting, distribution }) => (
          <ExpectancyRow
            key={setting}
            setting={setting}
            values={calculateCumulativeQuestHit(distribution)}
            suffix="回目までに当選"
          />
        ))}
      </div>
    </div>
  );
}
