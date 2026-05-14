// ========================================
// 伝承推測補助ツール — 推定ロジック(純粋関数)
// ========================================
//
// 全関数イミュータブル。State の更新は spread で新オブジェクトを返す。
// 詳細仕様は docs/densho-helper-spec.md を参照。

import { DENSHO_END_TRANSITION } from '../data/hokutoDefinitions';
import {
  COMMON_YAKU_TENHA_RATE_PER_GAME_DENSHO,
  DENSHO_LEVEL_PRIOR,
  DENSHO_PROB_THRESHOLD,
  EARLY_REHIT_TRIGGER_GAMES,
  HAZURE_REPLAY_RATIO_APPROX,
  LOW_TRANSITION_S1,
  LOW_TRANSITION_S6,
  NORMAL_TO_HIGH_RATE_BY_YAKU,
  OBSERVATION_WINDOW_GAMES,
  STATE_DECAY_RATE_PER_GAME,
  STATE_PRIOR_AT_DENSHO_END_S1,
  STATE_PRIOR_AT_DENSHO_END_S6,
  STATE_PRIOR_AT_END,
  STATE_PRIOR_RESET,
  SURVIVAL_PER_FALL_TRIGGER,
  TENHA_LOOKBACK_GAMES,
  TENHA_RATE_DENSHO_BY_YAKU,
  TENHA_RATE_NON_DENSHO_BY_YAKU,
  TENHA_RATE_S1,
  TENHA_RATE_S6,
  ZENCHO_MEDIAN_GAMES,
} from '../data/denshoConstants';
import type {
  DenshoEvent,
  DenshoHelperState,
  DenshoLevelDist,
  ExtendedStateDist,
  InternalStateDist,
  ObservableYaku,
  PendingYakuMiss,
  SampleEvidence,
  StateSample,
  TriggerAttribution,
  YakuObservedEvent,
} from '../types/densho';
/* YakuObservedEvent is imported for type narrowing in attributeTrigger */

// ========================================
// 1. ヘルパー
// ========================================

const SETTING_POSTERIOR_UNIFORM = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6] as const;

export function createInitialDenshoHelperState(): DenshoHelperState {
  return {
    phase: 'idle',
    cycleStartGame: 0,
    lastEventGame: 0,
    denProb: 0,
    levelDist: { ...DENSHO_LEVEL_PRIOR },
    stateUnderS1: { ...STATE_PRIOR_AT_DENSHO_END_S1 },
    stateUnderS6: { ...STATE_PRIOR_AT_DENSHO_END_S6 },
    events: [],
    pendingMisses: [],
    samples: [],
    settingPosterior: [...SETTING_POSTERIOR_UNIFORM] as DenshoHelperState['settingPosterior'],
  };
}

/**
 * Pending miss の resolve(16G タイムアウト経過分を miss bayes として確定適用)。
 * `currentGame` 以降に次イベントが来た時点で呼ばれる。
 */
function resolvePendingMisses(
  state: DenshoHelperState,
  currentGame: number,
): DenshoHelperState {
  const pending = state.pendingMisses ?? [];
  const expired: PendingYakuMiss[] = [];
  const remaining: PendingYakuMiss[] = [];
  for (const p of pending) {
    if (p.confirmAt <= currentGame) {
      expired.push(p);
    } else {
      remaining.push(p);
    }
  }
  if (expired.length === 0) return { ...state, pendingMisses: pending };
  let working: DenshoHelperState = { ...state, pendingMisses: remaining };
  for (const p of expired) {
    working = applyConfirmedMiss(working, p.yaku);
  }
  return working;
}

/** 役 miss が 16G タイムアウトで確定したときの bayes 更新 */
function applyConfirmedMiss(
  state: DenshoHelperState,
  yaku: ObservableYaku,
): DenshoHelperState {
  switch (state.phase) {
    case 'in-densho': {
      const lr = likelihoodRatioForMiss(yaku);
      return { ...state, denProb: updateDenProbByLR(state.denProb, lr) };
    }
    case 'observing':
    case 'after-densho':
      // observing/after-densho では役発生時に applyYakuStateTransition で
      // no-Tenha 条件下の状態更新を即時適用済み。16G タイムアウトでは何も追加しない
      // (二重カウント防止)。
      return state;
    default:
      return state;
  }
}

function normalizeLevel(d: DenshoLevelDist): DenshoLevelDist {
  const total = d.short + d.middle + d.long;
  if (total <= 0) return { ...DENSHO_LEVEL_PRIOR };
  return { short: d.short / total, middle: d.middle / total, long: d.long / total };
}

function normalizeState(d: InternalStateDist): InternalStateDist {
  const total = d.low + d.normal + d.high;
  if (total <= 0) return { low: 1 / 3, normal: 1 / 3, high: 1 / 3 };
  return { low: d.low / total, normal: d.normal / total, high: d.high / total };
}

/** 期待生存率(レベル分布で重み付け) */
function expectedSurvival(levelDist: DenshoLevelDist): number {
  return (
    levelDist.short * SURVIVAL_PER_FALL_TRIGGER.short +
    levelDist.middle * SURVIVAL_PER_FALL_TRIGGER.middle +
    levelDist.long * SURVIVAL_PER_FALL_TRIGGER.long
  );
}

/** ハズレ・リプレイ1回あたりレベル分布を更新(生き残り重み) */
function updateLevelDistByOneFallTrigger(prior: DenshoLevelDist): DenshoLevelDist {
  return normalizeLevel({
    short: prior.short * SURVIVAL_PER_FALL_TRIGGER.short,
    middle: prior.middle * SURVIVAL_PER_FALL_TRIGGER.middle,
    long: prior.long * SURVIVAL_PER_FALL_TRIGGER.long,
  });
}

// ========================================
// 2. 16G ルックバック → trigger 帰属
// ========================================

/**
 * Tenha 突入時、直近 lookback ゲーム以内の **未確定の役観測** から trigger を確率配分。
 * 戻り値の attribution は合計1に正規化済。
 *
 * 重要: 候補は `pendingMisses` を使用する(state.events ではない)。
 * 過去の Tenha で既に attribution 適用済の役は pending から削除されているため、
 * これにより複数 Tenha で同じ役を二重カウントするバグを防ぐ。
 */
export function attributeTriggerFromPending(
  pendingMisses: ReadonlyArray<PendingYakuMiss>,
  tenhaStartGame: number,
  lookback: number = TENHA_LOOKBACK_GAMES,
): TriggerAttribution[] {
  const windowStart = tenhaStartGame - lookback;
  const pendingInWindow = pendingMisses.filter(
    (p) => p.game >= windowStart && p.game < tenhaStartGame,
  );

  const candidates: { eventId: string; yaku?: ObservableYaku; weight: number }[] = [];

  // 観測されたレア役・ベル(未確定 pending のみ)
  for (const p of pendingInWindow) {
    candidates.push({
      eventId: p.yakuEventId,
      yaku: p.yaku,
      weight: TENHA_RATE_DENSHO_BY_YAKU[p.yaku],
    });
  }

  // 共通役(集約)— 16G窓のうち pending 役以外のG分
  const knownGames = pendingInWindow.length;
  const unknownGames = Math.max(0, lookback - knownGames);
  const commonWeight =
    1 - Math.pow(1 - COMMON_YAKU_TENHA_RATE_PER_GAME_DENSHO, unknownGames);
  candidates.push({
    eventId: 'common',
    weight: commonWeight,
  });

  const total = candidates.reduce((s, c) => s + c.weight, 0);
  if (total <= 0) {
    return [{ eventId: 'common', attribution: 1 }];
  }
  return candidates.map((c) => ({
    eventId: c.eventId,
    yaku: c.yaku,
    attribution: c.weight / total,
  }));
}

/** @deprecated state.events ベースの旧API。 attributeTriggerFromPending を使うこと */
export function attributeTrigger(
  events: ReadonlyArray<DenshoEvent>,
  tenhaStartGame: number,
  lookback: number = TENHA_LOOKBACK_GAMES,
): TriggerAttribution[] {
  const windowStart = tenhaStartGame - lookback;
  const yakuEventsInWindow = events.filter(
    (e): e is YakuObservedEvent =>
      e.type === 'yaku' && e.game >= windowStart && e.game < tenhaStartGame,
  );
  const candidates: { eventId: string; yaku?: ObservableYaku; weight: number }[] = [];
  for (const event of yakuEventsInWindow) {
    candidates.push({
      eventId: event.id,
      yaku: event.yaku,
      weight: TENHA_RATE_DENSHO_BY_YAKU[event.yaku],
    });
  }
  const knownGames = yakuEventsInWindow.length;
  const unknownGames = Math.max(0, lookback - knownGames);
  const commonWeight =
    1 - Math.pow(1 - COMMON_YAKU_TENHA_RATE_PER_GAME_DENSHO, unknownGames);
  candidates.push({ eventId: 'common', weight: commonWeight });
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  if (total <= 0) return [{ eventId: 'common', attribution: 1 }];
  return candidates.map((c) => ({
    eventId: c.eventId,
    yaku: c.yaku,
    attribution: c.weight / total,
  }));
}

// ========================================
// 3. 伝承確率 P(densho) のベイズ更新
// ========================================

/**
 * 役非当選イベント(16G窓を経過してもTenhaが来なかった役)の尤度比。
 * LR = P(役観測&非当選 | densho) / P(役観測&非当選 | ¬densho)
 */
function likelihoodRatioForMiss(yaku: ObservableYaku): number {
  const pHit_d = TENHA_RATE_DENSHO_BY_YAKU[yaku];
  const pHit_nd = TENHA_RATE_NON_DENSHO_BY_YAKU[yaku];
  const pMiss_d = 1 - pHit_d;
  const pMiss_nd = 1 - pHit_nd;
  return pMiss_d / Math.max(pMiss_nd, 1e-9);
}

/**
 * Tenha 突入時、観測中のレア役の attribution が hit となる尤度比(部分hit)。
 * attribution = a の場合: LR_partial = a * (LR_hit) + (1 - a) * (LR_miss)
 * 簡易化のため hit の絶対比を使う。
 */
function likelihoodRatioForHit(yaku: ObservableYaku): number {
  const pHit_d = TENHA_RATE_DENSHO_BY_YAKU[yaku];
  const pHit_nd = TENHA_RATE_NON_DENSHO_BY_YAKU[yaku];
  if (pHit_nd <= 0) return Number.POSITIVE_INFINITY;
  return pHit_d / pHit_nd;
}

/** P(densho) を尤度比でベイズ更新(クリップあり) */
function updateDenProbByLR(prior: number, lr: number): number {
  if (!Number.isFinite(lr)) {
    // LR = ∞ なら densho に強くシフト(クリップ)
    return Math.min(0.999, prior * 100 + 0.5);
  }
  const denom = lr * prior + (1 - prior);
  if (denom <= 0) return 0;
  const next = (lr * prior) / denom;
  return Math.max(0, Math.min(1, next));
}

// ========================================
// 4. 内部状態(設定別)のベイズ更新
// ========================================

/**
 * 状態×役×設定 別の Tenha 当選率テーブルを引く。
 * 設定1基準('s1') / 設定6基準('s6') を切り替えて使用する。
 */
type SettingHypothesis = 's1' | 's6';

function tenhaRateByStateAndYaku(
  state: keyof InternalStateDist,
  yaku: ObservableYaku,
  setting: SettingHypothesis,
): number {
  const table = setting === 's1' ? TENHA_RATE_S1 : TENHA_RATE_S6;
  return table[state][yaku];
}

/**
 * after-densho/observing フェーズ中、レア役/ベル成立時の状態事後更新。
 * Tenha 当選なら「天破当選」尤度、Tenha 突入が来なければ「非当選」尤度を適用。
 *
 * 設定仮説(s1/s6)別に当選率テーブルを使うため、観測を重ねるほど
 * 設定1基準/設定6基準の事後分布が乖離していく。
 */
export function updateStateByYakuObservation(
  prior: InternalStateDist,
  yaku: ObservableYaku,
  hit: boolean,
  setting: SettingHypothesis,
): InternalStateDist {
  const pLow = tenhaRateByStateAndYaku('low', yaku, setting);
  const pNormal = tenhaRateByStateAndYaku('normal', yaku, setting);
  const pHigh = tenhaRateByStateAndYaku('high', yaku, setting);
  const lLow = hit ? pLow : 1 - pLow;
  const lNormal = hit ? pNormal : 1 - pNormal;
  const lHigh = hit ? pHigh : 1 - pHigh;
  return normalizeState({
    low: prior.low * lLow,
    normal: prior.normal * lNormal,
    high: prior.high * lHigh,
  });
}

// ========================================
// 5. 設定事後確率
// ========================================

function settingLikelihoodFromSample(
  sample: StateSample,
  setting: number,
): number {
  const trans = DENSHO_END_TRANSITION[setting];
  switch (sample.observedEvidence) {
    case 'high-confirmed':
      return trans.high;
    case 'tenha-rehit-early':
      return trans.high * 0.8 + trans.normal * 0.2;
    case 'tenha-rehit':
      return trans.normal * 0.6 + trans.high * 0.3 + trans.low * 0.1;
    case 'no-reaction-30g':
      return trans.low * 0.7 + trans.normal * 0.3;
  }
}

/** サンプル列から設定事後確率を再計算 */
export function recalcSettingPosterior(
  samples: ReadonlyArray<StateSample>,
): readonly [number, number, number, number, number, number] {
  if (samples.length === 0) {
    return [...SETTING_POSTERIOR_UNIFORM] as const;
  }
  const raw: number[] = [1, 1, 1, 1, 1, 1];
  for (const sample of samples) {
    for (let s = 1; s <= 6; s++) {
      raw[s - 1] *= settingLikelihoodFromSample(sample, s);
    }
  }
  const total = raw.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return [...SETTING_POSTERIOR_UNIFORM] as const;
  }
  const normalized = raw.map((v) => v / total) as number[];
  return [
    normalized[0],
    normalized[1],
    normalized[2],
    normalized[3],
    normalized[4],
    normalized[5],
  ] as const;
}

// ========================================
// 6. イベント適用 — 全推定の起点
// ========================================

/**
 * 既存の DenshoHelperState にイベントを1件追加して新State を返す純粋関数。
 *
 * 内部処理:
 * 1. 直前イベントから今回イベントまでの未観測ゲームを推定 → ハズレ・リプレイの転落更新
 * 2. イベント種別ごとの処理(yaku / tenha-start / tenha-end / high-confirm)
 * 3. P(densho) が閾値割れすれば自動 phase 遷移
 * 4. 観測ウィンドウ満了(after-densho 30G) → サンプル化 + 新サイクル準備
 */
export function applyEvent(
  prev: DenshoHelperState,
  event: DenshoEvent,
): DenshoHelperState {
  // (0) 16G タイムアウト経過した pending miss を確定適用
  let working = resolvePendingMisses(prev, event.game);

  // gap 計算用の到達G。
  // - 役/天破/AT当選/リセット等: event.game(イベント自体の役/Tenha でその G の decay 抽選はスキップ)
  // - check (状態確認): event.game + 1(状態確認G自体もハズレ等で decay 抽選が走るため +1G 分含める)
  const decayToGame = event.type === 'check' ? event.game + 1 : event.game;

  // (1a) in-densho の経過G分の転落更新(伝承からの脱出)
  if (working.phase === 'in-densho' && decayToGame > working.lastEventGame) {
    working = applyFallTriggersForGap(working, decayToGame);
  }
  // (1b) observing/after-densho の経過G分の状態転落(高→通→低)
  if (
    (working.phase === 'observing' || working.phase === 'after-densho') &&
    decayToGame > working.lastEventGame
  ) {
    working = applyStateDecayForGap(working, decayToGame);
  }

  // (2) イベント種別の処理
  switch (event.type) {
    case 'yaku':
      working = applyYakuEvent(working, event);
      break;
    case 'tenha-start':
    case 'tenha-end': {
      // 「Tenha 当選」として統合処理: attribution補正 + 伝承中突入
      const dur = event.duration && event.duration !== 'infinite' ? event.duration : 0;
      working = applyTenhaHit(working, event.game, dur);
      break;
    }
    case 'high-confirm':
      working = applyHighConfirm(working, event.game);
      break;
    case 'reset-start':
      working = applySessionStart(working, event.game, 'reset');
      break;
    case 'at-end':
      working = applySessionStart(working, event.game, 'at-end');
      break;
    case 'at-hit':
      working = applyAtHit(working, event.game);
      break;
    case 'check':
      // 状態確認のみ。state は変化させない(fall triggers と pending miss 解決は既に適用済)
      break;
  }

  // (3) phase 自動遷移(in-densho → after-densho)
  if (working.phase === 'in-densho' && working.denProb < DENSHO_PROB_THRESHOLD) {
    working = transitionToAfterDensho(working, event.game);
  }

  // (4) 観測ウィンドウ満了チェック(after-densho)
  if (
    working.phase === 'after-densho' &&
    event.game - working.cycleStartGame >= OBSERVATION_WINDOW_GAMES
  ) {
    working = closeObservationWindow(working, event.game, 'no-reaction-30g');
  }

  // 共通: イベント記録 + lastEventGame 更新
  // Tenha 当選イベントは duration 分だけ次回の gap 計算をスキップする
  // (Tenha 中は 伝承の転落抽選が走らないため)
  let nextLastEventGame = event.game;
  if ((event.type === 'tenha-start' || event.type === 'tenha-end') && event.duration && event.duration !== 'infinite') {
    nextLastEventGame = event.game + event.duration - 1;
  }
  if (event.type === 'at-hit') {
    // AT 当選後はカウンターが 0 にリセットされ、以降のイベントは post-AT G(小さい値)で来る。
    // gap 計算が正しく機能するように lastEventGame を 0 にリセット。
    nextLastEventGame = 0;
  }
  return {
    ...working,
    events: [...working.events, event],
    lastEventGame: nextLastEventGame,
  };
}

/**
 * 通常時(低/通/高)の状態転落抽選を gap 分適用する。
 * observing/after-densho フェーズでのみ呼ばれる。
 *
 * Markov 連鎖:
 *   high → normal: STATE_DECAY_RATE_PER_GAME (≈ 2.2%)
 *   normal → low: STATE_DECAY_RATE_PER_GAME
 *   low → low: 維持
 */
function decayStateOneStep(prior: InternalStateDist): InternalStateDist {
  const r = STATE_DECAY_RATE_PER_GAME;
  return {
    low: prior.low + prior.normal * r,
    normal: prior.normal * (1 - r) + prior.high * r,
    high: prior.high * (1 - r),
  };
}

/**
 * 経過G分の繰り返し処理の上限(CPU 予算保護)。
 * 数学的には 200G 程度で state 分布も denProb も steady-state に収束するため、
 * これ以上の繰り返しは結果を変えずに CPU を消費するだけ。
 * 不正な大 gap (例: 古いデータの mis-migration や G の人為的誤入力) からも保護する。
 */
const GAP_ITERATION_CAP = 500;

function applyStateDecayForGap(
  state: DenshoHelperState,
  toGame: number,
): DenshoHelperState {
  if (state.phase !== 'observing' && state.phase !== 'after-densho') return state;
  const rawGap = Math.max(0, toGame - state.lastEventGame - 1);
  const gap = Math.min(rawGap, GAP_ITERATION_CAP);
  if (gap <= 0) return state;
  let s1 = state.stateUnderS1;
  let s6 = state.stateUnderS6;
  for (let i = 0; i < gap; i++) {
    s1 = decayStateOneStep(s1);
    s6 = decayStateOneStep(s6);
  }
  return { ...state, stateUnderS1: s1, stateUnderS6: s6 };
}

/** 未観測ゲーム間の転落抽選を期待値で適用 */
function applyFallTriggersForGap(
  state: DenshoHelperState,
  toGame: number,
): DenshoHelperState {
  const rawGap = Math.max(0, toGame - state.lastEventGame - 1);
  const gap = Math.min(rawGap, GAP_ITERATION_CAP);
  if (gap <= 0) return state;
  // 推定ハズレ・リプレイ回数
  const k = Math.round(gap * HAZURE_REPLAY_RATIO_APPROX);
  if (k <= 0) return state;
  // P(densho) を k回の生存で更新
  let denProb = state.denProb;
  let levelDist = state.levelDist;
  for (let i = 0; i < k; i++) {
    denProb *= expectedSurvival(levelDist);
    levelDist = updateLevelDistByOneFallTrigger(levelDist);
  }
  return { ...state, denProb, levelDist };
}

/**
 * 役観測時の状態遷移(setting別、no-Tenha 条件下の合成更新)。
 *
 * 役発生時には Tenha 抽選 + 状態遷移抽選が走る。Tenha が来なかった場合の
 * 状態遷移を、Tenha が来なかったベイズ尤度と統合して一発で適用する:
 *
 *   P_post(s') ∝ Σ_s P_pre(s) × (1 - hitRate[s]) × P(s → s' | yaku, no Tenha)
 *
 * 状態遷移ルール(no-Tenha 条件、レア役):
 *   - 低 → 低/通/高: LOW_TRANSITION_X[yaku] (設定別)
 *   - 通 → 通/高: NORMAL_TO_HIGH_RATE_BY_YAKU[yaku] が高への移行率(全設定共通)、残りは通維持
 *   - 高 → 高: 維持(レア役での降格は無し)
 *
 * 設定1基準 / 設定6基準で異なる遷移を適用するため、観測を重ねるほど
 * 状態事後分布が乖離していく。
 */
function applyYakuStateTransition(
  prior: InternalStateDist,
  yaku: ObservableYaku,
  setting: SettingHypothesis,
): InternalStateDist {
  const ratesTable = setting === 's1' ? TENHA_RATE_S1 : TENHA_RATE_S6;
  const hitRateLow = ratesTable.low[yaku];
  const hitRateNormal = ratesTable.normal[yaku];
  const hitRateHigh = ratesTable.high[yaku];
  const lowTrans = setting === 's1' ? LOW_TRANSITION_S1[yaku] : LOW_TRANSITION_S6[yaku];
  const normalToHigh = NORMAL_TO_HIGH_RATE_BY_YAKU[yaku];

  const lowMass = prior.low * (1 - hitRateLow);
  const normalMass = prior.normal * (1 - hitRateNormal);
  const highMass = prior.high * (1 - hitRateHigh);

  const toLow = lowMass * lowTrans.toLow;
  const toNormal = lowMass * lowTrans.toNormal + normalMass * (1 - normalToHigh);
  const toHigh = lowMass * lowTrans.toHigh + normalMass * normalToHigh + highMass;

  return normalizeState({ low: toLow, normal: toNormal, high: toHigh });
}

/**
 * 役観測の処理。
 *
 * 戦略:
 *  - Tenha 当選有無は 16G 後まで判らないので pendingMisses に保留する
 *    (denProb の即座 collapse を防ぐため)。
 *  - 一方、observing / after-densho の状態事後 (low/normal/high) は、
 *    no-Tenha 条件下の遷移を即時適用する。設定別の LOW_TRANSITION /
 *    NORMAL_TO_HIGH の差で S1 / S6 の状態が乖離する。
 *  - 16G 以内に Tenha が来れば applyTenhaHit で in-densho に遷移し、
 *    遷移時に state 自体は次サイクル開始時に上書きされるため、
 *    pre-Tenha の暫定更新は問題にならない。
 */
function applyYakuEvent(
  state: DenshoHelperState,
  event: YakuObservedEvent,
): DenshoHelperState {
  if (state.phase === 'idle') return state;
  const newPending: PendingYakuMiss = {
    yakuEventId: event.id,
    yaku: event.yaku,
    game: event.game,
    confirmAt: event.game + TENHA_LOOKBACK_GAMES,
  };
  let working: DenshoHelperState = {
    ...state,
    pendingMisses: [...(state.pendingMisses ?? []), newPending],
  };
  if (state.phase === 'observing' || state.phase === 'after-densho') {
    working = {
      ...working,
      stateUnderS1: applyYakuStateTransition(state.stateUnderS1, event.yaku, 's1'),
      stateUnderS6: applyYakuStateTransition(state.stateUnderS6, event.yaku, 's6'),
    };
  }
  return working;
}

/**
 * Tenha 当選イベント(Tenha突入/終了を統合)。
 * - observing/after-densho からの当選: 直近16G 役の attribution 補正を適用
 * - after-densho からの当選: 観測ウィンドウをサンプル化(再当選)
 * - 全フェーズ共通: 伝承確定の状態(in-densho, denProb=1.0)に遷移
 * - duration: Tenha 継続G数。伝承サイクル開始 G は game + duration として扱う。
 *
 * 16G 以内の pendingMisses は attribution に吸収されるため、attribution 適用後にクリア。
 */
function applyTenhaHit(
  state: DenshoHelperState,
  game: number,
  duration: number,
): DenshoHelperState {
  // observing/after-densho では state.pendingMisses(16G窓内の役を含む)を使って
  // attribution を実行し denProb を更新。クリアは attribution 後に行う。
  let working: DenshoHelperState = state;
  if (state.phase === 'observing' || state.phase === 'after-densho') {
    working = applyTenhaTriggerAttribution(state, game);
  }
  // 16G 以内の pending は Tenha に吸収済としてクリア(16G超の pending は既に
  // resolvePendingMisses で確定済なので、ここに残るのは基本空)
  const remainingPending = (working.pendingMisses ?? []).filter(
    (p) => game - p.game >= TENHA_LOOKBACK_GAMES,
  );
  const cleared: DenshoHelperState = { ...working, pendingMisses: remainingPending };

  if (state.phase === 'after-densho') {
    const triggerGame = Math.max(cleared.cycleStartGame, game - ZENCHO_MEDIAN_GAMES);
    const elapsedAtTrigger = triggerGame - cleared.cycleStartGame;
    const evidence: SampleEvidence =
      elapsedAtTrigger <= EARLY_REHIT_TRIGGER_GAMES
        ? 'tenha-rehit-early'
        : 'tenha-rehit';
    const closed = closeObservationWindow(cleared, game, evidence);
    return enterDenshoFromTenha(closed, game, duration);
  }
  return enterDenshoFromTenha(cleared, game, duration);
}

/**
 * Tenha 突入時、直近16G の役入力から attribution を計算して denProb を更新する。
 *
 * 状態事後 (low/normal/high) は applyYakuEvent で no-Tenha 条件下の遷移を
 * 既に即時適用済み。Tenha が来た場合は applyTenhaHit で phase が in-densho に
 * 切り替わり、次サイクル開始時に state 自体が STATE_PRIOR_AT_DENSHO_END で
 * 上書きされるため、ここでは state を再更新しない。
 *
 * denProb のみ、attribution 比 a の合成尤度で bayes 更新する。
 */
function applyTenhaTriggerAttribution(
  state: DenshoHelperState,
  tenhaStartGame: number,
): DenshoHelperState {
  const attributions = attributeTriggerFromPending(state.pendingMisses ?? [], tenhaStartGame);
  let denProb = state.denProb;

  for (const attr of attributions) {
    if (attr.eventId === 'common' || !attr.yaku) continue;
    if (attr.attribution <= 0) continue;
    if (state.phase === 'in-densho' || state.phase === 'observing' || state.phase === 'after-densho') {
      const hitDensho = TENHA_RATE_DENSHO_BY_YAKU[attr.yaku];
      const hitNonDensho = TENHA_RATE_NON_DENSHO_BY_YAKU[attr.yaku];
      const likelihoodDensho = attr.attribution * hitDensho + (1 - attr.attribution) * (1 - hitDensho);
      const likelihoodNonDensho = attr.attribution * hitNonDensho + (1 - attr.attribution) * (1 - hitNonDensho);
      const lr = likelihoodDensho / Math.max(likelihoodNonDensho, 1e-9);
      denProb = updateDenProbByLR(denProb, lr);
    }
  }
  return { ...state, denProb };
}

/**
 * Tenha 当選後の伝承モード突入処理。
 * Tenha 当選 = 伝承確定なので denProb = 1.0、レベル分布は初期事前分布。
 * 伝承サイクルは Tenha 終了後(game + duration)から開始するものとして扱う。
 */
function enterDenshoFromTenha(
  state: DenshoHelperState,
  game: number,
  duration: number,
): DenshoHelperState {
  return {
    ...state,
    phase: 'in-densho',
    cycleStartGame: game + duration,
    denProb: 1.0,
    levelDist: { ...DENSHO_LEVEL_PRIOR },
  };
}

function applyHighConfirm(
  state: DenshoHelperState,
  game: number,
): DenshoHelperState {
  // after-densho: 観測ウィンドウをサンプル化(設定推定の証拠として 'high-confirmed' を記録)
  if (state.phase === 'after-densho') {
    return closeObservationWindow(state, game, 'high-confirmed');
  }
  // observing: 状態事後を高確 100% に collapse(設定推定への寄与は無し)
  if (state.phase === 'observing') {
    const high: InternalStateDist = { low: 0, normal: 0, high: 1 };
    return {
      ...state,
      stateUnderS1: high,
      stateUnderS6: high,
    };
  }
  // in-densho/idle 中に押された場合は無視
  return state;
}

/**
 * セッション開始(リセット直後 or AT終了直後)。
 * 通常時観測モードに入り、状態事前分布を該当の値で初期化する。
 * これらは伝承モード経由ではないため設定推定サンプルには寄与しない。
 */
function applySessionStart(
  state: DenshoHelperState,
  game: number,
  kind: 'reset' | 'at-end',
): DenshoHelperState {
  const prior = kind === 'reset' ? STATE_PRIOR_RESET : STATE_PRIOR_AT_END;
  return {
    ...state,
    phase: 'observing',
    cycleStartGame: game,
    denProb: 0,
    levelDist: { ...DENSHO_LEVEL_PRIOR },
    stateUnderS1: { ...prior },
    stateUnderS6: { ...prior },
    pendingMisses: [], // 新セッションでは前サイクルの pending をクリア
  };
}

/**
 * AT 当選 = AT 終了として 1 イベントで統合処理。
 *
 * 運用想定: AT が終わって 通常時 に戻ったタイミングで押下。
 * 仕様(hokuto-tensei2-spec.md):
 *   AT 終了時の状態振り分け(全設定共通)= 低 0% / 通 40.6% / 高 59.4%
 *
 * - 状態を AT 終了事前分布で初期化
 * - phase は 通常時観測モード(observing)
 * - G は別途 UI 側で 0 にリセット(submitAtHit)
 * - pendingMisses は前サイクルから持ち越さないようクリア
 */
function applyAtHit(
  state: DenshoHelperState,
  game: number,
): DenshoHelperState {
  return {
    ...state,
    phase: 'observing',
    cycleStartGame: game,
    denProb: 0,
    levelDist: { ...DENSHO_LEVEL_PRIOR },
    stateUnderS1: { ...STATE_PRIOR_AT_END },
    stateUnderS6: { ...STATE_PRIOR_AT_END },
    pendingMisses: [],
  };
}

function transitionToAfterDensho(
  state: DenshoHelperState,
  game: number,
): DenshoHelperState {
  return {
    ...state,
    phase: 'after-densho',
    cycleStartGame: game,
    stateUnderS1: { ...STATE_PRIOR_AT_DENSHO_END_S1 },
    stateUnderS6: { ...STATE_PRIOR_AT_DENSHO_END_S6 },
  };
}

function closeObservationWindow(
  state: DenshoHelperState,
  game: number,
  evidence: SampleEvidence,
): DenshoHelperState {
  const sample: StateSample = {
    id: `sample-${game}-${Date.now()}`,
    cycleEndGame: game,
    recordedAt: Date.now(),
    observedEvidence: evidence,
  };
  const samples = [...state.samples, sample];
  return {
    ...state,
    phase: 'idle',
    samples,
    settingPosterior: recalcSettingPosterior(samples),
    pendingMisses: [], // サイクル終了で前サイクルの pending をクリア
  };
}

// ========================================
// 7. 公開API: イベント追加(Undo 用に旧stateも返す)
// ========================================

export interface ApplyEventResult {
  next: DenshoHelperState;
  prev: DenshoHelperState;
}

export function applyEventWithUndo(
  prev: DenshoHelperState,
  event: DenshoEvent,
): ApplyEventResult {
  return { prev, next: applyEvent(prev, event) };
}

/** 直近1件のイベントを取り消す(events 末尾から削除して全再計算) */
export function undoLastEvent(state: DenshoHelperState): DenshoHelperState {
  if (state.events.length === 0) return state;
  const remaining = state.events.slice(0, -1);
  let rebuilt = createInitialDenshoHelperState();
  for (const e of remaining) {
    rebuilt = applyEvent(rebuilt, e);
  }
  return rebuilt;
}

/**
 * 各イベント直後の状態スナップショットを計算する。
 * ログタイムラインで「そのイベント時点での内部状態推定」を表示するために使用。
 *
 * pre/post の使い分け:
 *   - preEvent*: 経過Gの転落抽選を反映した、イベント固有処理を行う"前"の状態
 *   - その他: イベント適用後の最終状態
 */
export interface EventSnapshot {
  event: DenshoEvent;
  /** イベント固有処理"前"のフェーズ(prospective バー判定に使用) */
  preEventPhase: DenshoHelperState['phase'];
  /** イベント固有処理"前"の denProb (転落抽選反映済) */
  preEventDenProb: number;
  /** イベント固有処理"前"の設定1基準状態 */
  preEventStateUnderS1: InternalStateDist;
  /** イベント固有処理"前"の設定6基準状態 */
  preEventStateUnderS6: InternalStateDist;
  /** このイベント適用直後の denProb */
  denProb: number;
  /** このイベント適用直後のフェーズ */
  phase: DenshoHelperState['phase'];
  /** 設定1基準の状態分布 */
  stateUnderS1: InternalStateDist;
  /** 設定6基準の状態分布 */
  stateUnderS6: InternalStateDist;
  /** 伝承レベル分布 */
  levelDist: DenshoLevelDist;
}

export function computeEventSnapshots(
  events: ReadonlyArray<DenshoEvent>,
): EventSnapshot[] {
  let state = createInitialDenshoHelperState();
  const snapshots: EventSnapshot[] = [];
  for (const event of events) {
    // Pre-event state: イベント固有処理"前"だが、pending miss resolve と転落抽選は反映済
    // gap 計算は applyEvent と同じ規則: check のみ event.game + 1 まで decay
    const decayToGame = event.type === 'check' ? event.game + 1 : event.game;
    let preEvent = resolvePendingMisses(state, event.game);
    if (preEvent.phase === 'in-densho' && decayToGame > preEvent.lastEventGame) {
      preEvent = applyFallTriggersForGap(preEvent, decayToGame);
    }
    if (
      (preEvent.phase === 'observing' || preEvent.phase === 'after-densho') &&
      decayToGame > preEvent.lastEventGame
    ) {
      preEvent = applyStateDecayForGap(preEvent, decayToGame);
    }
    state = applyEvent(state, event);
    snapshots.push({
      event,
      preEventPhase: preEvent.phase,
      preEventDenProb: preEvent.denProb,
      preEventStateUnderS1: preEvent.stateUnderS1,
      preEventStateUnderS6: preEvent.stateUnderS6,
      denProb: state.denProb,
      phase: state.phase,
      stateUnderS1: state.stateUnderS1,
      stateUnderS6: state.stateUnderS6,
      levelDist: state.levelDist,
    });
  }
  return snapshots;
}

/**
 * イベントスナップショットから 6状態分布(低/通/高/伝承/天破/AT)を計算。
 * 設定仮説 ('s1' | 's6') 別に算出。
 *
 * 役観測時はプロスペクティブ表示:
 *   「この役を引いた結果、各状態に分岐する確率」を可視化する。
 *   - 天破 segment: 役で Tenha 当選する確率 (役×状態の Tenha率を加重平均)
 *   - 伝承 segment: 伝承中で Tenha 当選しなかった確率
 *   - 低/通/高 segment: 伝承外で Tenha 当選しなかった確率(状態別事後確率を使う)
 */
export function computeExtendedDist(
  snap: EventSnapshot,
  setting: 's1' | 's6',
): ExtendedStateDist {
  const event = snap.event;
  // Tenha 当選イベント: 天破 100%
  if (event.type === 'tenha-start' || event.type === 'tenha-end') {
    return { low: 0, normal: 0, high: 0, densho: 0, tenha: 1, at: 0 };
  }
  // AT 当選イベント: AT 100%(行のみで表示。次イベントからは observing として扱う)
  if (event.type === 'at-hit') {
    return { low: 0, normal: 0, high: 0, densho: 0, tenha: 0, at: 1 };
  }
  // 役イベント: プロスペクティブ表示
  if (event.type === 'yaku') {
    return computeProspectiveDistForYaku(snap, event.yaku, setting);
  }
  // それ以外(リセット/AT終了など): イベント適用後の状態を表示
  // 伝承中: P(伝承) = denProb、残りを伝承終了時の状態振り分けで配分
  if (snap.phase === 'in-densho') {
    const rem = 1 - snap.denProb;
    const transition = setting === 's1'
      ? STATE_PRIOR_AT_DENSHO_END_S1
      : STATE_PRIOR_AT_DENSHO_END_S6;
    return {
      low: rem * transition.low,
      normal: rem * transition.normal,
      high: rem * transition.high,
      densho: snap.denProb,
      tenha: 0,
      at: 0,
    };
  }
  // observing/after-densho/idle: 観測中の状態事後分布
  const state = setting === 's1' ? snap.stateUnderS1 : snap.stateUnderS6;
  return {
    low: state.low,
    normal: state.normal,
    high: state.high,
    densho: 0,
    tenha: 0,
    at: 0,
  };
}

/**
 * 役イベントの「プロスペクティブ」分布:
 *   役を引く直前の状態から、各 outcome への分岐確率を計算。
 *
 * 状態遷移の流れ(Tenha 非当選条件下):
 *   - 低確 + 役 → 低/通/高 (LOW_TRANSITION_X)。例: 強チェ → 0%低/75%通/25%高
 *   - 通常 + 役 → 高 への移行率を NORMAL_TO_HIGH_RATE で適用。残りは通常維持
 *   - 高確 + 役 → 高確維持(レア役での降格はないと仮定)
 *   - 伝承 + 役 → 伝承維持
 */
function computeProspectiveDistForYaku(
  snap: EventSnapshot,
  yaku: ObservableYaku,
  setting: 's1' | 's6',
): ExtendedStateDist {
  // pre-event 状態(転落抽選反映済、役 bayes 更新前)
  const preDenProb = snap.preEventDenProb;
  const preState = setting === 's1' ? snap.preEventStateUnderS1 : snap.preEventStateUnderS6;

  // 状態別 Tenha 当選率
  const denshoRate = TENHA_RATE_DENSHO_BY_YAKU[yaku];
  const ratesTable = setting === 's1' ? TENHA_RATE_S1 : TENHA_RATE_S6;
  const hitRateLow = ratesTable.low[yaku];
  const hitRateNormal = ratesTable.normal[yaku];
  const hitRateHigh = ratesTable.high[yaku];

  // 状態遷移テーブル(Tenha 非当選条件)
  const lowTrans = setting === 's1' ? LOW_TRANSITION_S1[yaku] : LOW_TRANSITION_S6[yaku];
  const normalToHigh = NORMAL_TO_HIGH_RATE_BY_YAKU[yaku];

  // 役直前の各状態確率(preEventPhase で判定: イベント固有処理"前"の状態)
  // post-event の auto-transition で phase が変わっても、prospective は preEvent 時点で評価する
  const isInDensho = snap.preEventPhase === 'in-densho';
  let preLow: number, preNormal: number, preHigh: number, preDensho: number;
  if (isInDensho) {
    const rem = 1 - preDenProb;
    const transition = setting === 's1'
      ? STATE_PRIOR_AT_DENSHO_END_S1
      : STATE_PRIOR_AT_DENSHO_END_S6;
    preLow = rem * transition.low;
    preNormal = rem * transition.normal;
    preHigh = rem * transition.high;
    preDensho = preDenProb;
  } else {
    preLow = preState.low;
    preNormal = preState.normal;
    preHigh = preState.high;
    preDensho = 0;
  }

  // Tenha 当選: 各状態の Tenha 当選率を加重和
  const tenhaHit =
    preLow * hitRateLow +
    preNormal * hitRateNormal +
    preHigh * hitRateHigh +
    preDensho * denshoRate;

  // 各 pre-state からの寄与(Tenha 非当選条件下の状態遷移)
  // 低 → 低/通/高 (LOW_TRANSITION)
  const lowNoTenha = preLow * (1 - hitRateLow);
  const fromLow_toLow = lowNoTenha * lowTrans.toLow;
  const fromLow_toNormal = lowNoTenha * lowTrans.toNormal;
  const fromLow_toHigh = lowNoTenha * lowTrans.toHigh;

  // 通常 → 通常維持/高
  const normalNoTenha = preNormal * (1 - hitRateNormal);
  const fromNormal_toNormal = normalNoTenha * (1 - normalToHigh);
  const fromNormal_toHigh = normalNoTenha * normalToHigh;

  // 高確 → 高確維持(レア役での降格は無し)
  const fromHigh_toHigh = preHigh * (1 - hitRateHigh);

  // 伝承 → 伝承維持(役自体での転落は無し、転落は ハズレ/リプレイ で別途)
  const fromDensho_toDensho = preDensho * (1 - denshoRate);

  return {
    low: fromLow_toLow,
    normal: fromLow_toNormal + fromNormal_toNormal,
    high: fromLow_toHigh + fromNormal_toHigh + fromHigh_toHigh,
    densho: fromDensho_toDensho,
    tenha: tenhaHit,
    at: 0,
  };
}

/**
 * 現在ゲーム時点での「ライブ状態」を導出する。
 * - resolvePendingMisses で 16G タイムアウト分を確定
 * - applyFallTriggersForGap で経過G分の転落抽選を反映
 *
 * computeEventSnapshots が events で履歴をシミュレートするのに対し、こちらは
 * 「最後の入力イベント以降、currentGame まで時間が進んだ場合」の状態。
 */
export function deriveLiveSnapshot(
  helper: DenshoHelperState,
  currentGame: number,
): DenshoHelperState {
  // currentGame 自体も(役非報告なら)ハズレ等で decay/fall trigger 抽選が走るので +1 まで進める
  const decayToGame = currentGame + 1;
  let working = resolvePendingMisses(helper, currentGame);
  if (working.phase === 'in-densho' && decayToGame > working.lastEventGame) {
    working = applyFallTriggersForGap(working, decayToGame);
  }
  if (
    (working.phase === 'observing' || working.phase === 'after-densho') &&
    decayToGame > working.lastEventGame
  ) {
    working = applyStateDecayForGap(working, decayToGame);
  }
  return working;
}

/**
 * helper.events から helper state を一から再構築する。
 * 古いコードで適用された state が store に残っている場合の整合性確保用。
 * 表示レイヤで `helper` を直接使うかわりにこちらを通すことで、最新の applyEvent ロジックが反映される。
 */
export function rebuildHelperFromEvents(events: ReadonlyArray<DenshoEvent>): DenshoHelperState {
  let state = createInitialDenshoHelperState();
  for (const e of events) {
    state = applyEvent(state, e);
  }
  return state;
}

/**
 * 「天破前兆」確率: 直近 16G 以内に天破抽選が起きていて、これから天破当選が表面化する累積確率。
 *
 * 前兆G数を [1..16G] 一様分布と仮定し、各 pending 抽選に対して
 *   "残り前兆窓 / 16" の比率で寄与を減衰させる。
 *
 * 例: 47G で天破当選しても、現在62G なら経過15G。残り前兆は 1G 分のみで
 *     「未だ前兆中である」確率は 1/16。
 *
 * フェーズ別:
 *   - in-densho: 役別の伝承中天破当選率 + 未観測Gの per-game 6.5%(各G毎に残り窓重み)
 *   - observing / after-densho: 役別×状態別の天破当選率を S1/S6 で期待値化、平均を返す
 *   - idle / in-at: 0%
 */
export function computePendingTenhaProbability(
  helper: DenshoHelperState,
  currentGame: number,
): number {
  if (helper.phase === 'idle' || helper.phase === 'in-at') return 0;

  const window = TENHA_LOOKBACK_GAMES; // 16
  const earliestG = currentGame - window;

  // 16G窓内の pending yaku を抽出
  const pendingInWindow = (helper.pendingMisses ?? []).filter(
    (p) => p.game > earliestG && p.game <= currentGame,
  );

  /** 経過G に応じた残り前兆窓比 (= triggered yet but not revealed の確率) */
  const remainingFraction = (game: number): number => {
    const elapsed = currentGame - game;
    return Math.max(0, (window - elapsed) / window);
  };

  if (helper.phase === 'in-densho') {
    // 伝承中: 役別の伝承中天破当選率 × 残り前兆比
    let noTriggerProduct = 1;
    for (const p of pendingInWindow) {
      // 現サイクル開始前(=前フェーズ)の役は寄与しない
      if (p.game < helper.cycleStartGame) continue;
      const weighted = TENHA_RATE_DENSHO_BY_YAKU[p.yaku] * remainingFraction(p.game);
      noTriggerProduct *= 1 - weighted;
    }
    // 未観測G(役観測G・Tenha 期間以外)を1Gずつ走査して、各Gの残り前兆比を反映。
    // 共通役の伝承中天破抽選 (6.5%/G) は in-densho 中のみ走るため、
    // 現伝承サイクル開始 (cycleStartGame) 以降のゲームに限定する。
    const yakuG = new Set(
      helper.events.filter((e) => e.type === 'yaku').map((e) => e.game),
    );
    const tenhaDurationG = new Set<number>();
    for (const e of helper.events) {
      if (
        (e.type === 'tenha-end' || e.type === 'tenha-start') &&
        e.duration &&
        e.duration !== 'infinite'
      ) {
        for (let g = e.game; g <= e.game + e.duration - 1; g++) tenhaDurationG.add(g);
      }
    }
    const startG = Math.max(earliestG + 1, helper.cycleStartGame);
    for (let g = startG; g <= currentGame; g++) {
      if (yakuG.has(g) || tenhaDurationG.has(g)) continue;
      const weighted = COMMON_YAKU_TENHA_RATE_PER_GAME_DENSHO * remainingFraction(g);
      noTriggerProduct *= 1 - weighted;
    }
    return helper.denProb * (1 - noTriggerProduct);
  }

  // observing / after-densho: 役×状態の天破当選率を、現在の状態分布で期待値化
  // 各 pending 役は "残り前兆窓比" で重み付け
  const computeForSetting = (
    setting: SettingHypothesis,
    stateDist: InternalStateDist,
  ): number => {
    const ratesTable = setting === 's1' ? TENHA_RATE_S1 : TENHA_RATE_S6;
    let noTriggerProduct = 1;
    for (const p of pendingInWindow) {
      const rate =
        stateDist.low * ratesTable.low[p.yaku] +
        stateDist.normal * ratesTable.normal[p.yaku] +
        stateDist.high * ratesTable.high[p.yaku];
      const weighted = rate * remainingFraction(p.game);
      noTriggerProduct *= 1 - weighted;
    }
    return 1 - noTriggerProduct;
  };
  const probS1 = computeForSetting('s1', helper.stateUnderS1);
  const probS6 = computeForSetting('s6', helper.stateUnderS6);
  return (probS1 + probS6) / 2;
}

/** 1イベント削除して再構築 */
export function deleteEventAt(
  state: DenshoHelperState,
  index: number,
): DenshoHelperState {
  if (index < 0 || index >= state.events.length) return state;
  const remaining = state.events.filter((_, i) => i !== index);
  let rebuilt = createInitialDenshoHelperState();
  for (const e of remaining) {
    rebuilt = applyEvent(rebuilt, e);
  }
  return rebuilt;
}

// ========================================
// 8. LR / attribution の export(Phase 2 以降のテスト用)
// ========================================

export const _internals = {
  likelihoodRatioForHit,
  likelihoodRatioForMiss,
  updateDenProbByLR,
  expectedSurvival,
  updateLevelDistByOneFallTrigger,
  normalizeLevel,
  normalizeState,
  tenhaRateByStateAndYaku: (state: keyof InternalStateDist, yaku: ObservableYaku) =>
    tenhaRateByStateAndYaku(state, yaku, 's1'),
  settingLikelihoodFromSample,
};
