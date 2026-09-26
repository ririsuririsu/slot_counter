import type { HokutoSession, HokutoLog } from './hokuto';
import type { DenshoHelperState } from './densho';
import type { KabaneriCounterState, KabaneriCzEvent } from './kabaneri';
import type { MonhanRiseCounterState, MonhanRiseEvent } from './monhanRise';
import type { KokakuEvent } from './kokaku';

// Re-export all hokuto types
export * from './hokuto';
export * from './densho';
export * from './kabaneri';
export * from './monhanRise';
export * from './kokaku';

// ========================================
// 共通
// ========================================

export type MachineType =
  | 'monkey-turn-v'
  | 'hokuto-tensei2'
  | 'kabaneri'
  | 'monhan-rise'
  | 'kokaku';

interface BaseMachine {
  id: string;
  machineType: MachineType;
  name: string;
  number?: string;
  createdAt: number;
  updatedAt: number;
}

// ========================================
// モンキーターンV
// ========================================

// 小役カテゴリ
export type KoyakuCategory =
  | '5枚役'
  | '激走演出'
  | '終了時演出'
  | '特殊'
  | '直撃';

// 小役定義
export interface KoyakuDefinition {
  id: string;
  name: string;
  category: KoyakuCategory;
  backgroundColor: string;
  order: number;
}

// カウンター状態
export interface CounterState {
  [koyakuId: string]: number;
}

// 設定判別結果（モンキーターンV用: 設定3なし）
export interface SettingAnalysis {
  setting1: number;
  setting2: number;
  setting4: number;
  setting5: number;
  setting6: number;
}

// 履歴エントリ
export interface HistoryEntry {
  id: string;
  timestamp: number;
  totalGames: number;
  fiveCardTotal: number;
  probability: number | null;
  settingAnalysis: SettingAnalysis;
}

export interface MonkeyTurnMachine extends BaseMachine {
  machineType: 'monkey-turn-v';
  counters: CounterState;
  history: HistoryEntry[];
  totalGames: number;
}

// ========================================
// 北斗の拳 転生の章2
// ========================================

export interface HokutoMachine extends BaseMachine {
  machineType: 'hokuto-tensei2';
  session: HokutoSession;
  logs: HokutoLog[];
  totalGames: number;
  totalAbeshi: number;
  extraGames: number;
  /**
   * 伝承推測補助ツール(並列タブ)の状態。既存の logs とは独立。
   * 詳細仕様は docs/densho-helper-spec.md を参照。
   */
  denshoHelper: DenshoHelperState;
  /**
   * 伝承推測補助タブ専用の現在G。詳細ログタブの totalGames/extraGames とは独立に管理。
   */
  denshoCurrentGame: number;
}

// ========================================
// スマスロ 甲鉄城のカバネリ 海門決戦
// ========================================

export interface KabaneriMachine extends BaseMachine {
  machineType: 'kabaneri';
  counters: KabaneriCounterState;
  totalGames: number;
  czEvents: KabaneriCzEvent[];
}

// ========================================
// スマスロ モンスターハンターライズ
// ========================================

export interface MonhanRiseMachine extends BaseMachine {
  machineType: 'monhan-rise';
  /** 軸1: 'weakRare'(通常時の弱レア役) / 'rizeZone'(ライズゾーン当選) */
  counters: MonhanRiseCounterState;
  /**
   * 軸2〜4 の観測イベント列。順序が意味を持つ(軸3/軸4 は隠れマルコフ)ため、
   * 'reset' イベントで有利区間ごとに系列を区切る。
   * 詳細仕様は docs/monhan-rise-spec.md を参照。
   */
  events: MonhanRiseEvent[];
}

// ========================================
// スマスロ 攻殻機動隊
// ========================================

export interface KokakuMachine extends BaseMachine {
  machineType: 'kokaku';
  /**
   * 殲滅ZONE・CZ・AT・終了画面の観測イベント列。
   * 順序が意味を持つ（サイクルの区切りとモード抽選テーブルの切り替え）ため配列のまま保持する。
   * サイクル回数・ゾーン回数は events から導出し、フィールドには持たない。
   * 詳細仕様は docs/kokaku-spec.md を参照。
   */
  events: KokakuEvent[];
  /**
   * 液晶の現在ゲーム数。進行中サイクルで「どの列まで到達したか」を決めるのに必須。
   * モンハンライズと違い、この機種はゲーム数が主観測になる。
   */
  currentGame: number;
}

// ========================================
// 判別共用体
// ========================================

export type Machine =
  | MonkeyTurnMachine
  | HokutoMachine
  | KabaneriMachine
  | MonhanRiseMachine
  | KokakuMachine;

// 設定確率データ
export interface SettingProbability {
  setting: number;
  probability: number;
  denominator: number;
}
