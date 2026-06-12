import type { KabaneriChanceType, KabaneriCounterState } from '../types/kabaneri';

// ========================================
// スマスロ 甲鉄城のカバネリ 海門決戦 定義データ
// 出典: docs/kabaneri-unato-spec.md を参照
// ========================================

// チャンス目定義
export interface KabaneriChanceDefinition {
  id: KabaneriChanceType;
  name: string;
  shortName: string;
  backgroundColor: string;
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
    backgroundColor: 'var(--color-5card)',
    countKey: 'mumei',
    flashKey: 'mumeiFlash',
    denominator: 38.9,
  },
  {
    id: 'ikoma',
    name: '生駒チャンス目',
    shortName: '生駒',
    backgroundColor: 'var(--color-gekiso)',
    countKey: 'ikoma',
    flashKey: 'ikomaFlash',
    denominator: 44.5,
  },
  {
    id: 'kabane',
    name: 'カバネチャンス目',
    shortName: 'カバネ',
    backgroundColor: 'var(--color-special)',
    countKey: 'kabane',
    flashKey: 'kabaneFlash',
    denominator: 77.7,
  },
];

// 下段ベルのカウンターキー
export const GEDAN_BELL_KEY = 'gedanBell';

// 下段ベル確率（解析値、通常時・AT中問わず）
export const bellProbabilities: { setting: number; denominator: number }[] = [
  { setting: 1, denominator: 121.1 },
  { setting: 2, denominator: 114.4 },
  { setting: 3, denominator: 112.8 },
  { setting: 4, denominator: 106.2 },
  { setting: 5, denominator: 104.2 },
  { setting: 6, denominator: 99.1 },
];

// チャンス目成立時のアイコン発光率（実戦値ベースの参考値）
// 公式解析値は未公表。設定1約10%・設定6約17%という実戦データを基に
// 中間設定を補間した参考値であり、推測結果は目安として扱うこと。
// カウント条件: カバネリ高確以外かつ非発光中の単独チャンス目のみ。
export const flashRates: { setting: number; rate: number }[] = [
  { setting: 1, rate: 0.10 },
  { setting: 2, rate: 0.11 },
  { setting: 3, rate: 0.12 },
  { setting: 4, rate: 0.135 },
  { setting: 5, rate: 0.15 },
  { setting: 6, rate: 0.17 },
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
