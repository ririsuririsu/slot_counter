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

// 設定判別結果
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

// 台データ
export interface Machine {
  id: string;
  name: string;
  number?: string;
  createdAt: number;
  updatedAt: number;
  counters: CounterState;
  history: HistoryEntry[];
  totalGames: number;
}

// 設定確率データ
export interface SettingProbability {
  setting: number;
  probability: number;
  denominator: number;
}
