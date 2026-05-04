// ========================================
// 北斗の拳 転生の章2 — 伝承推測補助ツール 型定義
// ========================================
//
// 既存の Hokuto 詳細ログ実装(`HokutoLog` 群)とは独立した並列ツール。
// `HokutoMachine.denshoHelper` に格納される。
// 詳細仕様は docs/densho-helper-spec.md を参照。

// --- 入力イベント ---

/** 観測可能な役(ユーザーが目視で気付ける範囲) */
export type ObservableYaku =
  | 'jaku-cherry'
  | 'kyou-cherry'
  | 'suika'
  | 'chance-me'
  | 'shobu-zoroi'
  | 'bell';

export interface YakuObservedEvent {
  type: 'yaku';
  id: string;
  game: number;
  yaku: ObservableYaku;
}

/** 天破の刻 継続G数(機種仕様: 7G / 14G / 21G / 無限) */
export type DenshoTenhaDuration = 7 | 14 | 21 | 'infinite';

export interface TenhaStartEvent {
  type: 'tenha-start';
  id: string;
  game: number;
  duration?: DenshoTenhaDuration;
}

export interface TenhaEndEvent {
  type: 'tenha-end';
  id: string;
  game: number;
  duration?: DenshoTenhaDuration;
}

export interface HighConfirmEvent {
  type: 'high-confirm';
  id: string;
  game: number;
}

/** AT 当選イベント */
export interface AtHitEvent {
  type: 'at-hit';
  id: string;
  game: number;
}

/** 状態確認イベント(ハズレ): レア役を引いていない時点での状態を記録するためのチェックポイント */
export interface CheckEvent {
  type: 'check';
  id: string;
  game: number;
}

/** セッション開始: リセット直後 */
export interface ResetStartEvent {
  type: 'reset-start';
  id: string;
  game: number;
}

/** セッション開始: AT 終了直後 */
export interface AtEndEvent {
  type: 'at-end';
  id: string;
  game: number;
}

export type DenshoEvent =
  | YakuObservedEvent
  | TenhaStartEvent
  | TenhaEndEvent
  | HighConfirmEvent
  | ResetStartEvent
  | AtEndEvent
  | AtHitEvent
  | CheckEvent;

/** 6状態の拡張分布(低/通/高/伝承/天破/AT) — 合計 1.0 */
export interface ExtendedStateDist {
  low: number;
  normal: number;
  high: number;
  densho: number;
  tenha: number;
  at: number;
}

// --- フェーズ ---

/** 現サイクルのフェーズ */
export type DenshoPhase =
  | 'idle'          // 待機中(開始イベント未登録)
  | 'observing'     // 通常観測中(リセット直後/AT終了直後 — 伝承外)
  | 'in-densho'     // 伝承モード推定中
  | 'after-densho'  // 観測中(伝承後、最大30G)
  | 'in-at';        // AT 中(AT当選後、AT終了イベントが来るまで)

// --- 推定状態 ---

/** 伝承レベル分布 */
export interface DenshoLevelDist {
  short: number;
  middle: number;
  long: number;
}

/** 内部状態(低/通/高)の確率分布 */
export interface InternalStateDist {
  low: number;
  normal: number;
  high: number;
}

// --- サンプル(設定推定用) ---

/** 観測ウィンドウ終了時の証拠種別 */
export type SampleEvidence =
  | 'high-confirmed'      // 高確以上ボタンが押された
  | 'tenha-rehit-early'   // 観測中に Tenha 当選(推定 trigger ≤10G)
  | 'tenha-rehit'         // 観測中に Tenha 当選(推定 trigger 11〜30G)
  | 'no-reaction-30g';    // 観測30G経過、特に反応なし

export interface StateSample {
  id: string;
  cycleEndGame: number;
  recordedAt: number;
  observedEvidence: SampleEvidence;
}

// --- 遅延 miss 管理(16G 前兆窓) ---

/**
 * 役観測の miss bayes 更新を 16G 後まで保留するためのレコード。
 * Tenha が 16G 以内に来れば attribution で吸収(クリア)。
 * 16G 経過しても Tenha が来なければ miss 確定で bayes 更新を適用。
 */
export interface PendingYakuMiss {
  yakuEventId: string;
  yaku: ObservableYaku;
  game: number;
  /** この G 以降に次イベントが来た時点で miss 確定 */
  confirmAt: number;
}

// --- ストア状態 ---

export interface DenshoHelperState {
  phase: DenshoPhase;
  cycleStartGame: number;
  lastEventGame: number;

  /** 現サイクルの伝承滞在確率 P(densho) */
  denProb: number;
  /** 現サイクルの伝承レベル分布 */
  levelDist: DenshoLevelDist;

  /** 設定1仮定下の状態事後確率(現サイクル) */
  stateUnderS1: InternalStateDist;
  /** 設定6仮定下の状態事後確率(現サイクル) */
  stateUnderS6: InternalStateDist;

  /** 入力イベント履歴(現サイクル + 過去) */
  events: DenshoEvent[];

  /** 16G 前兆窓内で miss 確定待ちの役観測 */
  pendingMisses: PendingYakuMiss[];

  /** 蓄積サンプル(全サイクル分、設定推定の根拠) */
  samples: StateSample[];

  /** 設定1〜6 の事後確率(長さ6、各要素は 0..1) */
  settingPosterior: readonly [number, number, number, number, number, number];
}

// --- Trigger 帰属(16G ルックバック) ---

export interface TriggerAttribution {
  /** イベントID または 'common' */
  eventId: string;
  /** 紐付くイベントの役(common の場合は undefined) */
  yaku?: ObservableYaku;
  /** attribution 確率(0..1、合計1に正規化済) */
  attribution: number;
}

// --- Helpers ---

/** 信頼度バッジの段階 */
export type ConfidenceBadge =
  | 'insufficient'
  | 'reference'
  | 'judgeable'
  | 'high-trust';

export function confidenceBadgeOf(sampleCount: number): ConfidenceBadge {
  if (sampleCount < 5) return 'insufficient';
  if (sampleCount < 10) return 'reference';
  if (sampleCount < 15) return 'judgeable';
  return 'high-trust';
}
