import type { HokutoSession, HokutoLog } from './hokuto';

// Re-export all hokuto types
export * from './hokuto';

// ========================================
// 共通
// ========================================

export type MachineType = 'monkey-turn-v' | 'hokuto-tensei2';

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
}

// ========================================
// 判別共用体
// ========================================

export type Machine = MonkeyTurnMachine | HokutoMachine;

// 設定確率データ
export interface SettingProbability {
  setting: number;
  probability: number;
  denominator: number;
}
