import type { KabaneriSettingAnalysis } from '../types/kabaneri';
import { logBinomialPMF } from './binomialDistribution';
import { bellProbabilities, flashRates } from '../data/kabaneriDefinitions';

// ========================================
// カバネリ海門決戦 設定推測（ベイズ推定）
// ========================================

const SETTING_KEYS = [
  'setting1',
  'setting2',
  'setting3',
  'setting4',
  'setting5',
  'setting6',
] as const;

/** 全設定均等（データなし時の事前分布） */
export function createEqualAnalysis(): KabaneriSettingAnalysis {
  const equal = 100 / SETTING_KEYS.length;
  return {
    setting1: equal,
    setting2: equal,
    setting3: equal,
    setting4: equal,
    setting5: equal,
    setting6: equal,
  };
}

/**
 * 二項分布の尤度から事後確率（%）を計算する汎用関数
 * 事前確率は均等を仮定
 */
function posteriorFromBinomial(
  k: number,
  n: number,
  settingProbs: { setting: number; p: number }[]
): KabaneriSettingAnalysis {
  if (n <= 0 || k < 0 || k > n) {
    return createEqualAnalysis();
  }

  const logLikelihoods = settingProbs.map((sp) => logBinomialPMF(k, n, sp.p));
  const maxLogL = Math.max(...logLikelihoods);
  const likelihoods = logLikelihoods.map((l) => Math.exp(l - maxLogL));
  const total = likelihoods.reduce((sum, l) => sum + l, 0);

  if (total <= 0) return createEqualAnalysis();

  const result = createEqualAnalysis();
  settingProbs.forEach((sp, i) => {
    result[`setting${sp.setting}` as keyof KabaneriSettingAnalysis] =
      (likelihoods[i] / total) * 100;
  });
  return result;
}

/**
 * 下段ベル確率による設定推測
 * @param bellCount 下段ベル出現回数
 * @param totalGames 総ゲーム数
 */
export function calculateBellAnalysis(
  bellCount: number,
  totalGames: number
): KabaneriSettingAnalysis {
  return posteriorFromBinomial(
    bellCount,
    totalGames,
    bellProbabilities.map((bp) => ({
      setting: bp.setting,
      p: 1 / bp.denominator,
    }))
  );
}

/**
 * チャンス目アイコン発光率による設定推測（実戦値ベースの参考値）
 * @param flashCount 発光回数（3種チャンス目合算）
 * @param chanceCount チャンス目成立回数（3種合算）
 */
export function calculateFlashAnalysis(
  flashCount: number,
  chanceCount: number
): KabaneriSettingAnalysis {
  return posteriorFromBinomial(
    flashCount,
    chanceCount,
    flashRates.map((fr) => ({ setting: fr.setting, p: fr.rate }))
  );
}

/**
 * 複数の推測結果を統合（独立事象として尤度を掛け合わせて正規化）
 */
export function combineAnalyses(
  analyses: KabaneriSettingAnalysis[]
): KabaneriSettingAnalysis {
  if (analyses.length === 0) return createEqualAnalysis();

  const products = SETTING_KEYS.map((key) =>
    analyses.reduce((prod, a) => prod * a[key], 1)
  );
  const total = products.reduce((sum, p) => sum + p, 0);

  if (total <= 0) return createEqualAnalysis();

  const result = createEqualAnalysis();
  SETTING_KEYS.forEach((key, i) => {
    result[key] = (products[i] / total) * 100;
  });
  return result;
}

/**
 * 確率の分母を計算（1/X.X 表示用）
 */
export function calculateDenominator(
  count: number,
  totalGames: number
): number | null {
  if (count <= 0 || totalGames <= 0) return null;
  return totalGames / count;
}
