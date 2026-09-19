import type { KabaneriAnalysisTargets, KabaneriChanceType, KabaneriCounterState, KabaneriFlashAxis } from '../types/kabaneri';

// 未計測の0回を観測として使わない。採用はユーザーが明示的に選択する。
export const DEFAULT_KABANERI_ANALYSIS_TARGETS: KabaneriAnalysisTargets = {
  bell: false,
  mumeiIkoma: false,
  kabane: false,
};

/** 旧flash選択は両軸へ引き継ぐ。新形式の明示的な選択を優先する。 */
export function normalizeKabaneriAnalysisTargets(value: unknown): KabaneriAnalysisTargets {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    bell: source.bell === true,
    mumeiIkoma: typeof source.mumeiIkoma === 'boolean' ? source.mumeiIkoma : source.flash === true,
    kabane: typeof source.kabane === 'boolean' ? source.kabane : source.flash === true,
  };
}

// ========================================
// スマスロ 甲鉄城のカバネリ 海門決戦 定義データ
// 出典: docs/kabaneri-unato-spec.md を参照
// ========================================

// チャンス目定義
export interface KabaneriChanceDefinition {
  id: KabaneriChanceType;
  name: string;
  shortName: string;
  /** 項目名の文字色（ネオン） */
  nameColor: string;
  /** ラベル/グローのソフト色 */
  nameColorSoft: string;
  /** counters の成立カウントキー */
  countKey: string;
  /** counters の発光カウントキー */
  flashKey: string;
  /** 成立確率の分母（参考表示用、設定差なし） */
  denominator: number;
}

export const chanceDefinitions: KabaneriChanceDefinition[] = [
  {
    id: 'mumei',
    name: '無名チャンス目',
    shortName: '無名',
    nameColor: '#ff453a',
    nameColorSoft: '#ff8a82',
    countKey: 'mumei',
    flashKey: 'mumeiFlash',
    denominator: 38.9,
  },
  {
    id: 'ikoma',
    name: '生駒チャンス目',
    shortName: '生駒',
    nameColor: '#30d158',
    nameColorSoft: '#86efac',
    countKey: 'ikoma',
    flashKey: 'ikomaFlash',
    denominator: 44.5,
  },
  {
    id: 'kabane',
    name: 'カバネチャンス目',
    shortName: 'カバネ',
    nameColor: '#0a84ff',
    nameColorSoft: '#7ab8ff',
    countKey: 'kabane',
    flashKey: 'kabaneFlash',
    denominator: 77.7,
  },
];

// 下段ベルのカウンターキー・色
export const GEDAN_BELL_KEY = 'gedanBell';
export const BELL_COLOR = '#ffd60a';
export const BELL_COLOR_SOFT = '#ffe87a';

// 下段ベル確率（解析値、通常時・AT中問わず）
export const bellProbabilities: { setting: number; denominator: number }[] = [
  { setting: 1, denominator: 121.1 },
  { setting: 2, denominator: 114.4 },
  { setting: 3, denominator: 112.8 },
  { setting: 4, denominator: 106.2 },
  { setting: 5, denominator: 104.2 },
  { setting: 6, denominator: 99.1 },
];

// ユーザー採用の暫定モデル。推定低設定の観測値を設定1の基準に仮置きし、
// 設定2〜5は線形補間する。解析値・実測された設定別確率ではない。
// 採用仕様: docs/kabaneri-flash-research.md §4
// カウント条件: カバネリ高確以外かつ非発光中の単独チャンス目のみ。
export const mumeiIkomaFlashRates = [
  { setting: 1, rate: 0.08 },
  { setting: 2, rate: 0.104 },
  { setting: 3, rate: 0.128 },
  { setting: 4, rate: 0.152 },
  { setting: 5, rate: 0.176 },
  { setting: 6, rate: 0.20 },
];

export const kabaneFlashRates = [
  { setting: 1, rate: 0.23 },
  { setting: 2, rate: 0.2466 },
  { setting: 3, rate: 0.2632 },
  { setting: 4, rate: 0.2798 },
  { setting: 5, rate: 0.2964 },
  { setting: 6, rate: 0.313 },
];

export const kabaneriFlashAxes: {
  id: KabaneriFlashAxis;
  label: string;
  chanceIds: KabaneriChanceType[];
  rates: { setting: number; rate: number }[];
}[] = [
  { id: 'mumeiIkoma', label: '無名＋生駒', chanceIds: ['mumei', 'ikoma'], rates: mumeiIkomaFlashRates },
  { id: 'kabane', label: 'カバネ', chanceIds: ['kabane'], rates: kabaneFlashRates },
];

// 有効な設定番号リスト
export const kabaneriValidSettings = [1, 2, 3, 4, 5, 6];

// 初期カウンター状態
export function createInitialKabaneriCounters(): KabaneriCounterState {
  const counters: KabaneriCounterState = { [GEDAN_BELL_KEY]: 0 };
  for (const def of chanceDefinitions) {
    counters[def.countKey] = 0;
    counters[def.flashKey] = 0;
  }
  return counters;
}
