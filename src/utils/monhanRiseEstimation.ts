// ========================================
// モンハンライズ 設定推測ロジック（純粋関数）
//
// 4軸それぞれの対数尤度を独立に求め、最後に加算して正規化する。
//  軸1 ライズゾーン    … 二項分布
//  軸2 だるま落とし    … 多項分布 + 右側打ち切り
//  軸3 ポイントモード  … 隠れマルコフ（モードA/B/C/D）
//  軸4 クエストテーブル… 隠れマルコフ（テーブルA/B/天国準備/天国）
//
// 詳細仕様は docs/monhan-rise-spec.md を参照。
// ========================================

import type {
  AtWinRoute,
  MonhanRiseAnalysisBreakdown,
  MonhanRiseEvent,
  MonhanRiseQuestCell,
  MonhanRiseQuestEvent,
  MonhanRiseQuestRow,
  MonhanRiseSettingAnalysis,
  PointMode,
  QuestTable,
} from '../types/monhanRise';
import {
  DARUMA_COUNTS,
  DARUMA_REPLAY_DIST,
  MORNING_HEAVEN_PREP_OR_ABOVE_RATE,
  MORNING_HEAVEN_SPLIT,
  MORNING_POINT_MODES,
  POINT_DIST_BY_MODE,
  POINT_MODES,
  POINT_MODE_TRANSITION,
  QUEST_CEILING,
  QUEST_HIT_RATE,
  QUEST_TABLES,
  QUEST_TABLE_TRANSITION,
  REQUIRED_POINTS,
  RIZE_RATE_FROM_WEAK_RARE,
  toAtWinRoute,
} from '../data/monhanRiseDefinitions';
import { logBinomialPMF } from './binomialDistribution';

const SETTING_KEYS = [
  'setting1',
  'setting2',
  'setting3',
  'setting4',
  'setting5',
  'setting6',
] as const;

const SETTING_COUNT = SETTING_KEYS.length;

/** 尤度0を避けるための下限（観測が理論上0%のテーブルに当たった場合の保険） */
const MIN_LIKELIHOOD = 1e-12;

// ========================================
// 1. 共通ヘルパー
// ========================================

/** 全設定均等（データなし時の事前分布） */
function createEqualAnalysis(): MonhanRiseSettingAnalysis {
  const equal = 100 / SETTING_COUNT;
  return {
    setting1: equal,
    setting2: equal,
    setting3: equal,
    setting4: equal,
    setting5: equal,
    setting6: equal,
  };
}

/** 設定ごとの対数尤度を事後確率(%)へ変換する（事前分布は均等を仮定） */
function fromLogLikelihoods(logLikelihoods: number[]): MonhanRiseSettingAnalysis {
  const finite = logLikelihoods.filter((l) => Number.isFinite(l));
  if (finite.length === 0) return createEqualAnalysis();

  const max = Math.max(...finite);
  const weights = logLikelihoods.map((l) =>
    Number.isFinite(l) ? Math.exp(l - max) : 0
  );
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return createEqualAnalysis();

  const result = createEqualAnalysis();
  SETTING_KEYS.forEach((key, i) => {
    result[key] = (weights[i] / total) * 100;
  });
  return result;
}

/** 合計が1になるよう正規化（出典表の丸め誤差を吸収する） */
function normalize(values: number[]): number[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => 0);
  return values.map((v) => v / total);
}

/** 遷移行列の定常分布をべき乗法で求める */
function stationaryDistribution<S extends string>(
  states: readonly S[],
  transition: (from: S) => Record<S, number>
): Record<S, number> {
  let dist = {} as Record<S, number>;
  states.forEach((s) => {
    dist[s] = 1 / states.length;
  });

  for (let iter = 0; iter < 300; iter++) {
    const next = {} as Record<S, number>;
    states.forEach((s) => {
      next[s] = 0;
    });
    states.forEach((from) => {
      const row = transition(from);
      states.forEach((to) => {
        next[to] += dist[from] * (row[to] ?? 0);
      });
    });
    const total = states.reduce((sum, s) => sum + next[s], 0);
    if (total <= 0) return dist;
    states.forEach((s) => {
      next[s] /= total;
    });
    dist = next;
  }
  return dist;
}

// ========================================
// 2. イベント列のセグメント分割
// ========================================

/**
 * リセットスタート回ごとの区切り。
 * 軸2〜4 はいずれもリセットで初期化されるため、リセット回の先頭で系列を分ける。
 *
 * 各ATサイクル（行）がリセット回かどうかは
 *   その行の cycle-start イベント ?? (1行目かどうか)
 * で決まる。既定では1回目だけがリセット回。
 */
interface MonhanRiseSegment {
  isReset: boolean;
  events: MonhanRiseEvent[];
}

/** 行がリセット回かどうか（既定は1行目のみ） */
function resolveIsReset(
  rowIndex: number,
  override: boolean | null
): boolean {
  return override ?? rowIndex === 1;
}

function splitSegments(events: MonhanRiseEvent[]): MonhanRiseSegment[] {
  const segments: MonhanRiseSegment[] = [];
  let rowIndex = 1;
  let override: boolean | null = null;
  let rowOpen = false;

  // 行の中身が出てくるまで開始を遅らせる（cycle-start は行の先頭に置かれるため）
  const openRow = () => {
    if (rowOpen) return;
    const isReset = resolveIsReset(rowIndex, override);
    if (segments.length === 0 || isReset) {
      segments.push({ isReset, events: [] });
    }
    rowOpen = true;
  };

  for (const event of events) {
    if (event.type === 'cycle-start') {
      override = event.reset;
      continue;
    }
    openRow();
    segments[segments.length - 1].events.push(event);
    if (event.type === 'at-hit') {
      rowIndex++;
      rowOpen = false;
      override = null;
    }
  }

  return segments.filter((s) => s.events.length > 0);
}

// ========================================
// 3. 軸1: ライズゾーン当選率（二項分布）
// ========================================

function rizeLogLikelihoods(weakRare: number, rizeZone: number): number[] {
  if (weakRare <= 0 || rizeZone < 0 || rizeZone > weakRare) {
    return new Array(SETTING_COUNT).fill(0);
  }
  return RIZE_RATE_FROM_WEAK_RARE.map((p) =>
    logBinomialPMF(rizeZone, weakRare, p)
  );
}

/**
 * 通常時の弱レア役からのライズゾーン当選率による設定推測。
 * @param weakRare 通常時の弱レア役 成立数（高確/超高確中も含めて全カウント）
 * @param rizeZone うちライズゾーンに当選した数
 */
// ========================================
// 4. 軸2: だるま落とし 規定リプレイ回数（多項分布 + 右側打ち切り）
// ========================================

function darumaLogLikelihoods(segments: MonhanRiseSegment[]): number[] {
  const logLikelihoods = new Array(SETTING_COUNT).fill(0);
  // 出典表の丸め誤差を吸収した分布。イベントごとに作り直す必要はない
  const distributions = DARUMA_REPLAY_DIST.map(normalize);

  for (const segment of segments) {
    const darumaEvents = segment.events.filter(
      (e) => e.type === 'daruma-hit' || e.type === 'daruma-censor'
    );

    darumaEvents.forEach((event, index) => {
      // 朝一は内部リプレイ回数がランダム加算されるため1件目は規定回数がズレている
      if (segment.isReset && index === 0) return;

      // 記録されていない規定回数（壊れたデータ）は丸ごと無視する
      if (event.type === 'daruma-hit' && DARUMA_COUNTS.indexOf(event.count) < 0) {
        return;
      }

      for (let s = 0; s < SETTING_COUNT; s++) {
        const dist = distributions[s];

        if (event.type === 'daruma-hit') {
          const i = DARUMA_COUNTS.indexOf(event.count);
          logLikelihoods[s] += Math.log(Math.max(dist[i], MIN_LIKELIHOOD));
        } else {
          // 打ち切り: 到達済みの区切りを超える規定回数だった確率
          const survival = DARUMA_COUNTS.reduce(
            (sum, count, i) => (count > event.reached ? sum + dist[i] : sum),
            0
          );
          logLikelihoods[s] += Math.log(Math.max(survival, MIN_LIKELIHOOD));
        }
      }
    });
  }

  return logLikelihoods;
}

// ========================================
// 5. 隠れマルコフの共通 forward algorithm
// ========================================

interface HmmSpec<S extends string, E> {
  states: readonly S[];
  /** 系列開始時の状態分布 */
  initial: (isReset: boolean) => Record<S, number>;
  /** 状態 s が観測 e を出す確率 */
  emission: (state: S, event: E) => number;
  /** 状態 s から次状態への分布 */
  transition: (state: S) => Record<S, number>;
  /** true を返した観測は尤度に含めない（遷移だけ進める） */
  skipEmission?: (event: E, index: number, isReset: boolean) => boolean;
}

/** スケーリング付き forward algorithm。系列の対数尤度を返す */
function forwardLogLikelihood<S extends string, E>(
  spec: HmmSpec<S, E>,
  isReset: boolean,
  observations: E[]
): number {
  if (observations.length === 0) return 0;

  const { states } = spec;
  let alpha = spec.initial(isReset);
  let logLikelihood = 0;

  observations.forEach((event, index) => {
    const skip = spec.skipEmission?.(event, index, isReset) ?? false;

    if (!skip) {
      const scored = {} as Record<S, number>;
      states.forEach((s) => {
        scored[s] = alpha[s] * spec.emission(s, event);
      });
      const total = states.reduce((sum, s) => sum + scored[s], 0);
      if (total > 0) {
        logLikelihood += Math.log(total);
        states.forEach((s) => {
          scored[s] /= total;
        });
        alpha = scored;
      } else {
        // どの状態からも説明できない観測（壊れたデータ）。尤度は下限で打ち止め、
        // 状態分布は据え置く。ここで打ち切らずに遷移は必ず進めること。
        // 進めないと以降の観測が1つ手前の状態と突き合わされて系列がずれる。
        logLikelihood += Math.log(MIN_LIKELIHOOD);
      }
    }

    // 観測のあと次の状態へ遷移する
    const next = {} as Record<S, number>;
    states.forEach((s) => {
      next[s] = 0;
    });
    states.forEach((from) => {
      const row = spec.transition(from);
      states.forEach((to) => {
        next[to] += alpha[from] * (row[to] ?? 0);
      });
    });
    const nextTotal = states.reduce((sum, s) => sum + next[s], 0);
    if (nextTotal > 0) {
      states.forEach((s) => {
        next[s] /= nextTotal;
      });
      alpha = next;
    }
  });

  return logLikelihood;
}

// ========================================
// 6. 軸3: ポイントモード（HMM）
// ========================================

function pointModeInitial(
  settingIndex: number,
  isReset: boolean
): Record<PointMode, number> {
  const base = stationaryDistribution(
    POINT_MODES,
    (from) => POINT_MODE_TRANSITION[from][settingIndex]
  );

  // 設定変更時はモードB以上濃厚
  if (isReset) {
    const restricted = {} as Record<PointMode, number>;
    POINT_MODES.forEach((m) => {
      restricted[m] = MORNING_POINT_MODES.includes(m) ? base[m] : 0;
    });
    const total = POINT_MODES.reduce((sum, m) => sum + restricted[m], 0);
    if (total > 0) {
      POINT_MODES.forEach((m) => {
        restricted[m] /= total;
      });
      return restricted;
    }
  }
  return base;
}

/** 軸3のHMM定義（尤度計算とモード系列の推定で共用する） */
function pointModeSpec(
  settingIndex: number
): HmmSpec<PointMode, MonhanRiseQuestEvent> {
  return {
    states: POINT_MODES,
    initial: (isReset) => pointModeInitial(settingIndex, isReset),
    emission: (mode, event) => {
      const i = event.point === null ? -1 : REQUIRED_POINTS.indexOf(event.point);
      return i < 0 ? 0 : POINT_DIST_BY_MODE[mode][i];
    },
    transition: (mode) => POINT_MODE_TRANSITION[mode][settingIndex],
    skipEmission: (event, index, isReset) =>
      // 規定pt未入力のクエストは、モードの遷移だけ進めて尤度には入れない
      event.point === null ||
      // リセット回は内部カムラポイントがランダム加算されるため1件目はズレている
      (isReset && index === 0),
  };
}

/** そのセグメントで観測に使うクエスト列 */
function segmentQuests(segment: MonhanRiseSegment): MonhanRiseQuestEvent[] {
  return segment.events.filter((e) => e.type === 'quest');
}

function pointModeLogLikelihoods(segments: MonhanRiseSegment[]): number[] {
  return Array.from({ length: SETTING_COUNT }, (_, s) =>
    segments.reduce((sum, segment) => {
      const quests = segmentQuests(segment);
      if (quests.length === 0) return sum;
      return (
        sum +
        forwardLogLikelihood(pointModeSpec(s), segment.isReset, quests)
      );
    }, 0)
  );
}

// ========================================
// 7. 軸4: クエストテーブル（HMM）
// ========================================

function questTableInitial(
  settingIndex: number,
  isReset: boolean
): Record<QuestTable, number> {
  const base = stationaryDistribution(
    QUEST_TABLES,
    (from) => QUEST_TABLE_TRANSITION[from][settingIndex]
  );

  // 設定変更時は75%以上で天国準備以上
  if (isReset) {
    const lowerMass = base.A + base.B;
    if (lowerMass > 0) {
      const lowerRate = 1 - MORNING_HEAVEN_PREP_OR_ABOVE_RATE;
      return {
        // 下位2つは定常分布の比で25%を分ける
        A: (base.A / lowerMass) * lowerRate,
        B: (base.B / lowerMass) * lowerRate,
        // 上位2つは定常比を使わない（MORNING_HEAVEN_SPLIT のコメント参照）
        heavenPrep:
          MORNING_HEAVEN_SPLIT.heavenPrep * MORNING_HEAVEN_PREP_OR_ABOVE_RATE,
        heaven: MORNING_HEAVEN_SPLIT.heaven * MORNING_HEAVEN_PREP_OR_ABOVE_RATE,
      };
    }
  }
  return base;
}

/** テーブル T で k 回目のクエストに初めて当選する確率 */
function questHitLikelihood(table: QuestTable, questCount: number): number {
  const rates = QUEST_HIT_RATE[table];
  if (questCount < 1 || questCount > rates.length) return 0;

  let likelihood = rates[questCount - 1];
  for (let i = 0; i < questCount - 1; i++) {
    likelihood *= 1 - rates[i];
  }
  return likelihood;
}

/** テーブル T で k 回のクエストを全て外す確率（CZ・直撃で当選した場合の打ち切り） */
function questSurvivalLikelihood(table: QuestTable, questCount: number): number {
  const rates = QUEST_HIT_RATE[table];
  let survival = 1;
  for (let i = 0; i < Math.min(questCount, rates.length); i++) {
    survival *= 1 - rates[i];
  }
  return survival;
}

/** 1回のAT当選＝1観測。クエスト回数はイベント列から導出する */
interface AtObservation {
  questCount: number;
  route: AtWinRoute;
}

/**
 * AT当選ごとの観測を組み立てる。
 * quest イベントを数え、at-hit で締めて次のサイクルに移る。
 */
function collectAtObservations(segment: MonhanRiseSegment): AtObservation[] {
  const observations: AtObservation[] = [];
  let questCount = 0;

  for (const event of segment.events) {
    if (event.type === 'quest') {
      questCount++;
    } else if (event.type === 'at-hit') {
      observations.push({ questCount, route: toAtWinRoute(event.route) });
      questCount = 0;
    }
  }

  return observations;
}

/**
 * route:'quest' なのにクエストが1件も無い観測は入力ミス。
 * 取り除くとATが1回起きた事実（＝テーブルの移行）まで消えて系列がずれるため、
 * 観測としては残し、出力確率の評価だけ飛ばす。
 */
function isInvalidAtObservation(observation: AtObservation): boolean {
  return observation.route === 'quest' && observation.questCount < 1;
}

function atObservationLikelihood(
  table: QuestTable,
  observation: AtObservation
): number {
  // クエストで当選 → そのクエストでテーブルが当たった
  if (observation.route === 'quest') {
    return questHitLikelihood(table, observation.questCount);
  }
  // CZ成功・直撃 → そのサイクルのクエストは全て非当選のまま終わった（右側打ち切り）
  return questSurvivalLikelihood(table, observation.questCount);
}

/** 軸4のHMM定義（尤度計算とテーブル系列の推定で共用する） */
function questTableSpec(settingIndex: number): HmmSpec<QuestTable, AtObservation> {
  return {
    states: QUEST_TABLES,
    initial: (isReset) => questTableInitial(settingIndex, isReset),
    emission: atObservationLikelihood,
    transition: (table) => QUEST_TABLE_TRANSITION[table][settingIndex],
    // 内部ptのランダム加算はクエスト「回数」には影響しないため朝一も除外しない
    skipEmission: isInvalidAtObservation,
  };
}

function questTableLogLikelihoods(segments: MonhanRiseSegment[]): number[] {
  return Array.from({ length: SETTING_COUNT }, (_, s) =>
    segments.reduce((sum, segment) => {
      const observations = collectAtObservations(segment);
      if (observations.length === 0) return sum;
      return (
        sum +
        forwardLogLikelihood(questTableSpec(s), segment.isReset, observations)
      );
    }, 0)
  );
}

// ========================================
// 8. モード／テーブルの遷移推定（表示用）
// ========================================

/** 遷移の1ステップ */
export interface ModeTransitionStep<S extends string> {
  state: S;
  /**
   * そのステップの確信度。**前後すべての観測**を使った事後確率(forward-backward)。
   * 1回の観測だけでは絞り込めなくても、後のモードが確定すると遡って上がる。
   */
  confidence: number;
}

/** 遷移の流れ（1本）と、設定ごとの「今いるモード」 */
export interface ModeTransitionResult<S extends string> {
  /** 観測ごとの最尤状態。設定事後で重み付けした1本の系列 */
  path: ModeTransitionStep<S>[];
  /** 設定ごとの現在（最後の観測のあと遷移した先）の分布 */
  currentBySetting: {
    setting: number;
    distribution: Record<S, number>;
    top: S;
  }[];
}

/**
 * Viterbi で最尤の状態系列を求める。
 *
 * 各時点の事後周辺分布（forward）の argmax を並べると、
 * B→A のような遷移確率0の並びが出てしまうことがある。
 * 表示する「遷移の流れ」は実際に起こりうる並びである必要があるため、
 * 系列全体で最尤なパスを選ぶ Viterbi を使う。
 */
function viterbiPath<S extends string, E>(
  spec: HmmSpec<S, E>,
  isReset: boolean,
  observations: E[]
): S[] {
  const { states } = spec;
  if (observations.length === 0) return [];

  const logOf = (v: number) => Math.log(Math.max(v, MIN_LIKELIHOOD));

  const emissionLog = (state: S, event: E, index: number) =>
    spec.skipEmission?.(event, index, isReset) ? 0 : logOf(spec.emission(state, event));

  const initial = spec.initial(isReset);
  let delta = {} as Record<S, number>;
  states.forEach((s) => {
    delta[s] = logOf(initial[s]) + emissionLog(s, observations[0], 0);
  });

  const backPointers: Record<S, S>[] = [];

  for (let t = 1; t < observations.length; t++) {
    const next = {} as Record<S, number>;
    const from = {} as Record<S, S>;
    states.forEach((to) => {
      let best = -Infinity;
      let bestFrom = states[0];
      states.forEach((prev) => {
        const score = delta[prev] + logOf(spec.transition(prev)[to] ?? 0);
        if (score > best) {
          best = score;
          bestFrom = prev;
        }
      });
      next[to] = best + emissionLog(to, observations[t], t);
      from[to] = bestFrom;
    });
    backPointers.push(from);
    delta = next;
  }

  let last = states[0];
  states.forEach((s) => {
    if (delta[s] > delta[last]) last = s;
  });

  const path: S[] = [last];
  for (let t = backPointers.length - 1; t >= 0; t--) {
    path.unshift(backPointers[t][path[0]]);
  }
  return path;
}

/** 分布を合計1に整える（潰れていたら均等に戻す） */
function normalizeStateDist<S extends string>(
  states: readonly S[],
  dist: Record<S, number>
): Record<S, number> {
  const total = states.reduce((sum, s) => sum + dist[s], 0);
  const out = {} as Record<S, number>;
  states.forEach((s) => {
    out[s] = total > 0 ? dist[s] / total : 1 / states.length;
  });
  return out;
}

/**
 * forward-backward による各時点の事後分布（スムージング）。
 *
 * forward だけだと「その時点までの観測」しか使えない。
 * 実際には後のモードが確定すると手前のモードも絞り込める
 * （例: 2件目が100pt でモードD確定なら、C→D が100%である1件目はC濃厚）。
 * 前後すべての観測を使って各ステップの確信度を出すためにこれを使う。
 */
function smoothedMarginals<S extends string, E>(
  spec: HmmSpec<S, E>,
  isReset: boolean,
  observations: E[]
): Record<S, number>[] {
  const { states } = spec;
  const size = observations.length;
  if (size === 0) return [];

  const emit = (state: S, event: E, index: number) =>
    spec.skipEmission?.(event, index, isReset) ? 1 : spec.emission(state, event);

  // forward
  const alphas: Record<S, number>[] = [];
  const first = {} as Record<S, number>;
  const initial = spec.initial(isReset);
  states.forEach((st) => {
    first[st] = initial[st] * emit(st, observations[0], 0);
  });
  alphas.push(normalizeStateDist(states, first));

  for (let t = 1; t < size; t++) {
    const next = {} as Record<S, number>;
    states.forEach((st) => {
      next[st] = 0;
    });
    states.forEach((from) => {
      const row = spec.transition(from);
      states.forEach((to) => {
        next[to] += alphas[t - 1][from] * (row[to] ?? 0);
      });
    });
    states.forEach((st) => {
      next[st] *= emit(st, observations[t], t);
    });
    alphas.push(normalizeStateDist(states, next));
  }

  // backward
  const betas: Record<S, number>[] = new Array(size);
  const last = {} as Record<S, number>;
  states.forEach((st) => {
    last[st] = 1;
  });
  betas[size - 1] = last;

  for (let t = size - 2; t >= 0; t--) {
    const prev = {} as Record<S, number>;
    states.forEach((st) => {
      prev[st] = 0;
    });
    states.forEach((from) => {
      const row = spec.transition(from);
      states.forEach((to) => {
        prev[from] +=
          (row[to] ?? 0) * emit(to, observations[t + 1], t + 1) * betas[t + 1][to];
      });
    });
    betas[t] = normalizeStateDist(states, prev);
  }

  return alphas.map((alpha, t) => {
    const gamma = {} as Record<S, number>;
    states.forEach((st) => {
      gamma[st] = alpha[st] * betas[t][st];
    });
    return normalizeStateDist(states, gamma);
  });
}

/** 観測を消化したあとの「次の状態」の分布（＝今いるモード） */
function currentStateDistribution<S extends string, E>(
  spec: HmmSpec<S, E>,
  isReset: boolean,
  observations: E[]
): Record<S, number> {
  const { states } = spec;
  let alpha = spec.initial(isReset);

  observations.forEach((event, index) => {
    if (!spec.skipEmission?.(event, index, isReset)) {
      const scored = {} as Record<S, number>;
      states.forEach((s) => {
        scored[s] = alpha[s] * spec.emission(s, event);
      });
      const total = states.reduce((sum, s) => sum + scored[s], 0);
      if (total > 0) {
        states.forEach((s) => {
          scored[s] /= total;
        });
        alpha = scored;
      }
    }
    // 観測のあと次の状態へ遷移する
    const next = {} as Record<S, number>;
    states.forEach((s) => {
      next[s] = 0;
    });
    states.forEach((prev) => {
      const row = spec.transition(prev);
      states.forEach((to) => {
        next[to] += alpha[prev] * (row[to] ?? 0);
      });
    });
    const total = states.reduce((sum, s) => sum + next[s], 0);
    if (total > 0) {
      states.forEach((s) => {
        next[s] /= total;
      });
      alpha = next;
    }
  });

  return alpha;
}

/**
 * 設定事後で重み付けした平均のHMM。
 *
 * 実機で起きたモードの並びは1本しかないので、遷移の表示も1本に統合する。
 * 出力確率（規定ptの振り分け・クエスト回数別の当選率）は設定に依らないため、
 * 設定差は遷移行列と初期分布だけに現れる。そこを設定事後で平均する。
 *
 * 系列全体を厳密に周辺化すると設定について和を取ることになり動的計画法に乗らないため、
 * 遷移を平均する近似を使っている（設定1と設定6で系列が食い違うのは
 * ポイントモードで約1割、クエストテーブルで約4割のケース）。
 */
function averagedSpec<S extends string, E>(
  perSetting: (settingIndex: number) => HmmSpec<S, E>,
  settingWeights: number[]
): HmmSpec<S, E> {
  const weights = normalize(settingWeights);
  const specs = weights.map((_, s) => perSetting(s));
  const base = specs[0];

  const average = (pick: (spec: HmmSpec<S, E>) => Record<S, number>) => {
    const out = {} as Record<S, number>;
    base.states.forEach((st) => {
      out[st] = 0;
    });
    specs.forEach((spec, s) => {
      const dist = pick(spec);
      base.states.forEach((st) => {
        out[st] += weights[s] * (dist[st] ?? 0);
      });
    });
    return out;
  };

  return {
    states: base.states,
    initial: (isReset) => average((spec) => spec.initial(isReset)),
    // 出力確率は設定非依存なので、どの設定のものを使っても同じ
    emission: base.emission,
    transition: (state) => average((spec) => spec.transition(state)),
    skipEmission: base.skipEmission,
  };
}

function buildTransitionResult<S extends string, E>(
  perSetting: (settingIndex: number) => HmmSpec<S, E>,
  segments: { isReset: boolean; observations: E[] }[],
  settingWeights: number[],
  shownSettings: readonly number[]
): ModeTransitionResult<S> {
  const withData = segments.filter((seg) => seg.observations.length > 0);
  const averaged = averagedSpec(perSetting, settingWeights);

  // 表示する並びは Viterbi（起こりうる系列）、確信度は forward-backward の事後確率
  const path = withData.flatMap((seg) => {
    const states = viterbiPath(averaged, seg.isReset, seg.observations);
    const marginals = smoothedMarginals(averaged, seg.isReset, seg.observations);
    return states.map((state, i) => ({
      state,
      confidence: marginals[i]?.[state] ?? 0,
    }));
  });

  const last = withData[withData.length - 1];

  const currentBySetting = shownSettings.map((setting) => {
    const spec = perSetting(setting - 1);
    const distribution = last
      ? currentStateDistribution(spec, last.isReset, last.observations)
      : // 観測が無ければリセット直後の事前分布をそのまま出す
        spec.initial(true);

    let top = spec.states[0];
    spec.states.forEach((s) => {
      if (distribution[s] > distribution[top]) top = s;
    });
    return { setting, distribution, top };
  });

  return { path, currentBySetting };
}

/** ポイントモードの遷移（1本）と、設定ごとの現在地 */
export function calculatePointModeTransition(
  events: MonhanRiseEvent[],
  settingWeights: number[],
  shownSettings: readonly number[]
): ModeTransitionResult<PointMode> {
  return buildTransitionResult(
    pointModeSpec,
    splitSegments(events).map((seg) => ({
      isReset: seg.isReset,
      observations: segmentQuests(seg),
    })),
    settingWeights,
    shownSettings
  );
}

/** クエストテーブルの遷移（1本）と、設定ごとの現在地 */
export function calculateQuestTableTransition(
  events: MonhanRiseEvent[],
  settingWeights: number[],
  shownSettings: readonly number[]
): ModeTransitionResult<QuestTable> {
  return buildTransitionResult(
    questTableSpec,
    splitSegments(events).map((seg) => ({
      isReset: seg.isReset,
      observations: collectAtObservations(seg),
    })),
    settingWeights,
    shownSettings
  );
}

/**
 * 現在のテーブル分布から、「n回目のクエストに到達したとき、そのクエストで当選する確率」を返す。
 *
 * 単純に分布と当選率を掛けるだけでは足りない。クエストを外すたびにテーブルの事後が変わるため
 * （2回目に到達した時点で天国は消える。天国は1回目に100%当選するので外しようがない）、
 * 各回数について「そこまで到達した」で条件付けし直してから期待度を取る。
 *
 * null はその回数に到達しえないことを示す（例: 天国が確定しているときの2回目以降）。
 */
export function calculateQuestHitExpectancy(
  tableDistribution: Record<QuestTable, number>
): (number | null)[] {
  return Array.from({ length: QUEST_CEILING }, (_, index) => {
    let reachTotal = 0;
    let hitTotal = 0;

    QUEST_TABLES.forEach((table) => {
      const rates = QUEST_HIT_RATE[table];
      // そのテーブルで index 回目まで外し続けて到達する確率
      let reach = tableDistribution[table];
      for (let k = 0; k < index; k++) reach *= 1 - rates[k];
      reachTotal += reach;
      hitTotal += reach * rates[index];
    });

    return reachTotal > 1e-9 ? hitTotal / reachTotal : null;
  });
}

/**
 * 現在のテーブル分布から、「n回目までに当選している確率」（累計）を返す。
 *
 * 各回の期待度とは別物なので分けて出す。
 * こちらはサイクル開始時点からの無条件の確率で、
 * 全テーブルが7回目に100%当選するため7回目は必ず100%になる。
 */
export function calculateCumulativeQuestHit(
  tableDistribution: Record<QuestTable, number>
): number[] {
  return Array.from({ length: QUEST_CEILING }, (_, index) => {
    let notHitYet = 0;
    QUEST_TABLES.forEach((table) => {
      const rates = QUEST_HIT_RATE[table];
      let survive = tableDistribution[table];
      for (let k = 0; k <= index; k++) survive *= 1 - rates[k];
      notHitYet += survive;
    });
    return 1 - notHitYet;
  });
}

/** 設定推測の結果を重みベクトルへ（遷移の平均に使う） */
export function toSettingWeights(analysis: MonhanRiseSettingAnalysis): number[] {
  return SETTING_KEYS.map((key) => analysis[key]);
}

// ========================================
// 9. 統合
// ========================================

/** 複数の推測結果を統合（独立事象として尤度を掛け合わせて正規化） */
export function combineAnalyses(
  analyses: MonhanRiseSettingAnalysis[]
): MonhanRiseSettingAnalysis {
  if (analyses.length === 0) return createEqualAnalysis();

  const logSums = SETTING_KEYS.map((key) =>
    analyses.reduce(
      (sum, a) => sum + Math.log(Math.max(a[key], MIN_LIKELIHOOD)),
      0
    )
  );
  return fromLogLikelihoods(logSums);
}

/**
 * 4軸すべての推測結果と統合結果をまとめて返す。
 * 統合は各軸の対数尤度を直接加算するため、軸ごとに正規化してから掛け合わせるより誤差が小さい。
 */
export function calculateAllAnalyses(
  weakRare: number,
  rizeZone: number,
  events: MonhanRiseEvent[]
): MonhanRiseAnalysisBreakdown {
  const segments = splitSegments(events);

  const rizeLog = rizeLogLikelihoods(weakRare, rizeZone);
  const darumaLog = darumaLogLikelihoods(segments);
  const pointModeLog = pointModeLogLikelihoods(segments);
  const questTableLog = questTableLogLikelihoods(segments);

  const combinedLog = Array.from(
    { length: SETTING_COUNT },
    (_, s) => rizeLog[s] + darumaLog[s] + pointModeLog[s] + questTableLog[s]
  );

  return {
    rize: fromLogLikelihoods(rizeLog),
    daruma: fromLogLikelihoods(darumaLog),
    pointMode: fromLogLikelihoods(pointModeLog),
    questTable: fromLogLikelihoods(questTableLog),
    combined: fromLogLikelihoods(combinedLog),
  };
}

// ========================================
// 9. クエスト履歴グリッド
// ========================================

/**
 * イベント列を「縦＝AT当選サイクル / 横＝クエスト回数」のグリッドに組み直す。
 * 表示用だが、推定が読む questCount と同じ導出規則を使うため
 * 画面の見た目と尤度計算が食い違わない。
 */
export function buildQuestGrid(
  events: MonhanRiseEvent[]
): MonhanRiseQuestRow[] {
  const rows: MonhanRiseQuestRow[] = [];
  let cells: MonhanRiseQuestCell[] = [];
  let override: boolean | null = null;
  let cycleStartEventIndex = -1;
  let rowStartIndex = 0;

  const pushRow = (
    route: AtWinRoute | null,
    routeEventIndex: number,
    appendIndex: number
  ) => {
    const index = rows.length + 1;
    rows.push({
      index,
      cells,
      route,
      routeEventIndex,
      appendIndex,
      active: false,
      isReset: resolveIsReset(index, override),
      cycleStartEventIndex,
      rowStartIndex,
    });
    // クエストが1回も無い行（CZ・直撃で即当選）は欠落ではないので判定に使わない
    if (cells.length > 0) {
      previousRowHadAnyValue = cells.some((c) => c.point !== null);
    }
    cells = [];
    override = null;
    cycleStartEventIndex = -1;
    rowStartIndex = appendIndex + 1;
  };

  /**
   * 直前の「クエストがあった行」に値が1つでもあったか。null は比較対象なし。
   * クエストが0回の行（CZ・直撃で即当選）は履歴の欠落ではないので更新しない。
   */
  let previousRowHadAnyValue: boolean | null = null;

  events.forEach((event, eventIndex) => {
    if (event.type === 'quest') {
      // 行の1件目に入る前にリセット回かどうかが確定する（cycle-start は行頭に置かれる）
      const isRowHead = cells.length === 0;
      const isResetRow = isRowHead && resolveIsReset(rows.length + 1, override);

      let precededByGap: boolean;
      if (isRowHead) {
        // 行をまたぐ場合は「直前の行がまるごと空だったか」で判断する。
        // 行の末尾が1つ空いているだけなら、その行には値が残っているので警告しない。
        // リセット回は並びが仕切り直しになるため常に false。
        precededByGap = !isResetRow && previousRowHadAnyValue === false;
      } else {
        // 行の中は、すぐ手前のセルが空かどうか
        precededByGap = cells[cells.length - 1].point === null;
      }

      if (isResetRow) previousRowHadAnyValue = null;
      cells = [...cells, { point: event.point, eventIndex, precededByGap }];
    } else if (event.type === 'at-hit') {
      // 行末への追記は at-hit の直前に挿し込む
      pushRow(toAtWinRoute(event.route), eventIndex, eventIndex);
    } else if (event.type === 'cycle-start') {
      override = event.reset;
      cycleStartEventIndex = eventIndex;
    }
  });

  // 進行中の行は常に末尾に1行置く
  const index = rows.length + 1;
  rows.push({
    index,
    cells,
    route: null,
    routeEventIndex: -1,
    appendIndex: events.length,
    active: true,
    isReset: resolveIsReset(index, override),
    cycleStartEventIndex,
    rowStartIndex,
  });

  return rows;
}

// ========================================
// 10. 表示用ヘルパー
// ========================================

/** その軸だけで見た最有力設定 */
export interface TopSetting {
  /** 1〜6 */
  setting: number;
  /** 事後確率(%) */
  probability: number;
}

/**
 * 事後分布の最頻値を返す（見出しの「近似の推測設定」用）。
 * データが無く均等分布のままなら null。
 */
export function getTopSetting(
  analysis: MonhanRiseSettingAnalysis
): TopSetting | null {
  const values = SETTING_KEYS.map((key, i) => ({
    setting: i + 1,
    probability: analysis[key],
  }));
  const max = Math.max(...values.map((v) => v.probability));
  const min = Math.min(...values.map((v) => v.probability));

  // 全設定が同じ＝観測なし
  if (max - min < 0.01) return null;

  return values.find((v) => v.probability === max) ?? null;
}

/** 弱レア役からのライズゾーン当選率(%) */
export function calculateRizeRate(
  weakRare: number,
  rizeZone: number
): number | null {
  if (weakRare <= 0) return null;
  return (rizeZone / weakRare) * 100;
}
