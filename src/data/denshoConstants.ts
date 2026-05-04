// ========================================
// 伝承推測補助ツール — 推定用定数
// ========================================
//
// 数値の根拠は docs/densho-helper-research.md 参照。
// 既存の hokutoDefinitions.ts と重複しない、本ツール専用の定数のみここに集約。

import type {
  DenshoLevelDist,
  InternalStateDist,
  ObservableYaku,
} from '../types/densho';

// --- 伝承中の役別 Tenha 当選率(全設定共通) ---

/** 観測可能な役の伝承中 Tenha 当選率(0..1) */
export const TENHA_RATE_DENSHO_BY_YAKU: Record<ObservableYaku, number> = {
  'jaku-cherry': 0.250,
  'kyou-cherry': 1.000,
  suika: 0.336,
  'chance-me': 0.750,
  'shobu-zoroi': 0.750,
  bell: 0.156,
};

/** 共通役(ハズレ・リプレイ・ベル)の合算 Tenha 抽選率/G */
// 伝承中: ハズレ(1/1.4)*5.5% + リプレイ(1/8.7)*5.5% + ベル(1/8.2)*15.6% ≈ 6.5%/G
export const COMMON_YAKU_TENHA_RATE_PER_GAME_DENSHO = 0.065;

// --- 通常時(伝承外)の役別 Tenha 当選率の参考値 ---
//
// 伝承確率のベイズ更新で「¬densho 仮説」の尤度を計算するために使う。
// 実機は状態(低/通/高)で異なるが、ここでは保守的に低確基準で固定。
// 実際の denProb 計算では十分機能する近似。

/** 低確基準: 観測可能な役の Tenha 当選率(0..1) */
export const TENHA_RATE_NON_DENSHO_BY_YAKU: Record<ObservableYaku, number> = {
  'jaku-cherry': 0.008,   // 設定1低確
  'kyou-cherry': 0.250,   // 全設定共通
  suika: 0.008,           // 設定1低確
  'chance-me': 0.020,     // 設定1低確
  'shobu-zoroi': 0.020,   // 設定1低確
  bell: 0.000,            // 通常時ベルは抽選なし
};

// --- 状態(低/通/高) × 役 × 設定 別の Tenha 当選率 ---
//
// 伝承推測補助ツールでは設定1基準/設定6基準の2系統で状態事後を計算するため、
// 各仮定下の Tenha 当選率テーブルを定義する。
// 出典: hokutoDefinitions.ts の TENHA_RATE_LOW/NORMAL/HIGH より。

type StateTenhaRates = Record<ObservableYaku, number>;

interface StateLevelRates {
  low: StateTenhaRates;
  normal: StateTenhaRates;
  high: StateTenhaRates;
}

/** 設定1: 低確/通常/高確の役別 Tenha 当選率 */
export const TENHA_RATE_S1: StateLevelRates = {
  low: {
    'jaku-cherry': 0.008,
    'kyou-cherry': 0.250,
    suika: 0.008,
    'chance-me': 0.020,
    'shobu-zoroi': 0.020,
    bell: 0.000,
  },
  normal: {
    'jaku-cherry': 0.008,
    'kyou-cherry': 0.250,
    suika: 0.008,
    'chance-me': 0.102,
    'shobu-zoroi': 0.102,
    bell: 0.000,
  },
  high: {
    'jaku-cherry': 0.664,
    'kyou-cherry': 1.000,
    suika: 0.313,
    'chance-me': 0.664,
    'shobu-zoroi': 0.664,
    bell: 0.000,
  },
};

// --- 役による状態遷移率(Tenha 非当選条件下) ---
//
// 出典: hokutoDefinitions.ts の LOW_TRANSITION_X / NORMAL_TO_HIGH_RATES より、
// 設定1/設定6 と 観測可能な役のみを抜粋。値の合計は Tenha 非当選時の状態遷移を表すので 1.0。

interface StateTransition {
  toLow: number;
  toNormal: number;
  toHigh: number;
}

/** 低確 + 役 → 状態遷移(Tenha 非当選条件) - 設定1基準 */
export const LOW_TRANSITION_S1: Record<ObservableYaku, StateTransition> = {
  'jaku-cherry': { toLow: 0.531, toNormal: 0.461, toHigh: 0.008 },
  'kyou-cherry': { toLow: 0.000, toNormal: 0.750, toHigh: 0.250 },
  suika:         { toLow: 0.328, toNormal: 0.656, toHigh: 0.016 },
  'chance-me':   { toLow: 0.281, toNormal: 0.500, toHigh: 0.219 },
  'shobu-zoroi': { toLow: 0.281, toNormal: 0.500, toHigh: 0.219 },
  bell:          { toLow: 1.000, toNormal: 0.000, toHigh: 0.000 },
};

/** 低確 + 役 → 状態遷移 - 設定6基準 */
export const LOW_TRANSITION_S6: Record<ObservableYaku, StateTransition> = {
  'jaku-cherry': { toLow: 0.328, toNormal: 0.625, toHigh: 0.047 },
  'kyou-cherry': { toLow: 0.000, toNormal: 0.750, toHigh: 0.250 },
  suika:         { toLow: 0.109, toNormal: 0.813, toHigh: 0.078 },
  'chance-me':   { toLow: 0.125, toNormal: 0.500, toHigh: 0.375 },
  'shobu-zoroi': { toLow: 0.125, toNormal: 0.500, toHigh: 0.375 },
  bell:          { toLow: 1.000, toNormal: 0.000, toHigh: 0.000 },
};

/** 通常 + 役 → 高確移行率(Tenha 非当選条件、全設定共通)。残りは通常で維持。 */
export const NORMAL_TO_HIGH_RATE_BY_YAKU: Record<ObservableYaku, number> = {
  'jaku-cherry': 0.469,
  'kyou-cherry': 1.000,
  suika:         0.664,
  'chance-me':   0.719,
  'shobu-zoroi': 0.719,
  bell:          0.000,
};

/** 設定6: 低確/通常/高確の役別 Tenha 当選率 */
export const TENHA_RATE_S6: StateLevelRates = {
  low: {
    'jaku-cherry': 0.047,
    'kyou-cherry': 0.250,
    suika: 0.047,
    'chance-me': 0.063,
    'shobu-zoroi': 0.063,
    bell: 0.000,
  },
  normal: {
    'jaku-cherry': 0.047,
    'kyou-cherry': 0.250,
    suika: 0.047,
    'chance-me': 0.188,
    'shobu-zoroi': 0.188,
    bell: 0.000,
  },
  high: {
    'jaku-cherry': 0.664,
    'kyou-cherry': 1.000,
    suika: 0.313,
    'chance-me': 0.664,
    'shobu-zoroi': 0.664,
    bell: 0.000,
  },
};

// --- 伝承レベル ---

/** Tenha 終了直後の伝承レベル事前分布 */
export const DENSHO_LEVEL_PRIOR: DenshoLevelDist = {
  short: 0.984,
  middle: 0.012,
  long: 0.004,
};

/** ハズレ・リプレイ1回あたりの非転落率(=継続率) */
export const SURVIVAL_PER_FALL_TRIGGER: DenshoLevelDist = {
  short: 0.672,   // 1 - 32.8%
  middle: 0.953,  // 1 - 4.7%
  long: 0.988,    // 1 - 1.2%
};

/**
 * 通常時(低/通/高)の状態転落率(1G あたり、ハズレ・リプレイ・右下がりベル経由の合算)。
 *
 * 仕様: 各役で 2.3% 転落抽選。各役の成立確率と組み合わせると平均 ≈ 2.2%/G。
 *   - ハズレ (1/1.4) × 2.3% = 1.64%
 *   - リプレイ (1/8.7) × 2.3% = 0.26%
 *   - 右下がりベル (1/8.2) × 2.3% = 0.28%
 *   合計 ≈ 2.18% /G
 *
 * 状態遷移は 1 段階下へ:
 *   - 高 → 通(2.2%/G)、残りは高 維持
 *   - 通 → 低(2.2%/G)、残りは通 維持
 *   - 低 → 低 維持(これ以上下がらない)
 */
export const STATE_DECAY_RATE_PER_GAME = 0.022;

// --- フェーズ遷移閾値 ---

/** P(densho) がこれを下回ると after-densho フェーズへ自動遷移 */
export const DENSHO_PROB_THRESHOLD = 0.15;

// --- 観測ウィンドウ ---

/** Tenha 突入時のルックバック窓(G) */
export const TENHA_LOOKBACK_GAMES = 16;

/** 観測ウィンドウ最大長(G) */
export const OBSERVATION_WINDOW_GAMES = 30;

/** 早期 Tenha 再当選の閾値(推定 trigger ≤ NG なら 'tenha-rehit-early') */
export const EARLY_REHIT_TRIGGER_GAMES = 10;

/** Tenha 可視 G から差し引く前兆中央値(推定 trigger 計算用) */
export const ZENCHO_MEDIAN_GAMES = 8;

// --- ハズレ・リプレイ補完 ---

/** ベル等の入力済イベントを除いた未知ゲームのうち、ハズレ・リプレイの割合の近似 */
// 1/1.4 + 1/8.7 ≈ 0.829。残り(ベル/レア役)を除いた相対比でも実用上 0.94 で近似可。
export const HAZURE_REPLAY_RATIO_APPROX = 0.94;

// --- 内部状態の事前分布(伝承終了直後) ---

/**
 * 伝承終了直後の状態事前分布(設定1基準)。
 * 既存の DENSHO_END_TRANSITION[1] と一致させてあるが、
 * 伝承推測補助ツールでは設定1/設定6 の2系統だけ使用するため別名でエクスポート。
 */
export const STATE_PRIOR_AT_DENSHO_END_S1: InternalStateDist = {
  low: 0.719,
  normal: 0.250,
  high: 0.031,
};

export const STATE_PRIOR_AT_DENSHO_END_S6: InternalStateDist = {
  low: 0.391,
  normal: 0.500,
  high: 0.109,
};

/** 設定変更(リセット)時の状態振り分け - 全設定共通 */
export const STATE_PRIOR_RESET: InternalStateDist = {
  low: 0.25,
  normal: 0.25,
  high: 0.50,
};

/** AT 終了時の状態振り分け - 全設定共通 */
export const STATE_PRIOR_AT_END: InternalStateDist = {
  low: 0,
  normal: 0.406,
  high: 0.594,
};

// --- ラベル ---

export const OBSERVABLE_YAKU_LABELS: Record<ObservableYaku, string> = {
  'jaku-cherry': '弱チェリー',
  'kyou-cherry': '強チェリー',
  suika: 'スイカ',
  // チャンス目と勝舞揃いは同等扱いのため統合表記
  'chance-me': 'チャンス目/勝舞',
  'shobu-zoroi': '勝舞揃い',
  bell: 'ベル',
};

export const PHASE_LABELS = {
  idle: 'サイクル待機中',
  observing: '通常時観測中',
  'in-densho': '伝承モード推定中',
  'after-densho': '観測中',
  'in-at': 'AT 中',
} as const;

export const CONFIDENCE_LABELS = {
  insufficient: 'データ不足',
  reference: '参考',
  judgeable: '判断可',
  'high-trust': '高信頼',
} as const;
