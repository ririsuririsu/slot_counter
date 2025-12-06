import type { SettingProbability } from '../types';

// モンキーターンV 5枚役確率データ
// 設定3は存在しない
export const settingProbabilities: SettingProbability[] = [
  { setting: 1, probability: 1 / 38, denominator: 38 },
  { setting: 2, probability: 1 / 35, denominator: 35 },
  { setting: 4, probability: 1 / 30, denominator: 30 },
  { setting: 5, probability: 1 / 26, denominator: 26 },
  { setting: 6, probability: 1 / 24, denominator: 24 },
];

// 設定番号から確率を取得
export function getProbabilityForSetting(setting: number): number {
  const found = settingProbabilities.find((sp) => sp.setting === setting);
  return found?.probability ?? 0;
}

// 設定番号から分母を取得
export function getDenominatorForSetting(setting: number): number {
  const found = settingProbabilities.find((sp) => sp.setting === setting);
  return found?.denominator ?? 0;
}

// 有効な設定番号リスト
export const validSettings = [1, 2, 4, 5, 6];
