import type { SettingAnalysis } from '../types';
import { settingProbabilities } from '../data/settingProbabilities';

/**
 * 対数ガンマ関数（Stirlingの近似）
 * 大きな数値でのオーバーフローを避けるために使用
 */
function logGamma(n: number): number {
  if (n <= 0) return 0;
  if (n < 12) {
    // 小さい値は直接計算
    let result = 0;
    for (let i = 2; i < n; i++) {
      result += Math.log(i);
    }
    return result;
  }
  // Stirlingの近似
  return (
    (n - 0.5) * Math.log(n) -
    n +
    0.5 * Math.log(2 * Math.PI) +
    1 / (12 * n) -
    1 / (360 * n * n * n)
  );
}

/**
 * 二項係数の対数: log(nCk)
 */
function logBinomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/**
 * 二項分布の確率質量関数（対数）
 * P(X = k) = nCk * p^k * (1-p)^(n-k)
 * log P(X = k) = log(nCk) + k*log(p) + (n-k)*log(1-p)
 */
function logBinomialPMF(k: number, n: number, p: number): number {
  if (p <= 0) return k === 0 ? 0 : -Infinity;
  if (p >= 1) return k === n ? 0 : -Infinity;

  const logCoef = logBinomialCoefficient(n, k);
  const logSuccess = k * Math.log(p);
  const logFailure = (n - k) * Math.log(1 - p);

  return logCoef + logSuccess + logFailure;
}

/**
 * 各設定の事後確率を計算（ベイズ推定）
 * @param fiveCardCount 5枚役の合計出現回数
 * @param totalGames 総ゲーム数
 * @returns 各設定の確率（%、合計100%に正規化）
 */
export function calculateSettingProbabilities(
  fiveCardCount: number,
  totalGames: number
): SettingAnalysis {
  if (totalGames <= 0 || fiveCardCount < 0) {
    return {
      setting1: 20,
      setting2: 20,
      setting4: 20,
      setting5: 20,
      setting6: 20,
    };
  }

  // 各設定の尤度（対数）を計算
  const logLikelihoods: Record<number, number> = {};

  for (const sp of settingProbabilities) {
    const logP = logBinomialPMF(fiveCardCount, totalGames, sp.probability);
    logLikelihoods[sp.setting] = logP;
  }

  // 対数尤度の最大値を引いて数値安定化
  const maxLogL = Math.max(...Object.values(logLikelihoods));
  const likelihoods: Record<number, number> = {};
  let totalLikelihood = 0;

  for (const sp of settingProbabilities) {
    const likelihood = Math.exp(logLikelihoods[sp.setting] - maxLogL);
    likelihoods[sp.setting] = likelihood;
    totalLikelihood += likelihood;
  }

  // 事前確率は均等（各設定20%）と仮定し、正規化
  const result: SettingAnalysis = {
    setting1: 0,
    setting2: 0,
    setting4: 0,
    setting5: 0,
    setting6: 0,
  };

  if (totalLikelihood > 0) {
    result.setting1 = (likelihoods[1] / totalLikelihood) * 100;
    result.setting2 = (likelihoods[2] / totalLikelihood) * 100;
    result.setting4 = (likelihoods[4] / totalLikelihood) * 100;
    result.setting5 = (likelihoods[5] / totalLikelihood) * 100;
    result.setting6 = (likelihoods[6] / totalLikelihood) * 100;
  }

  return result;
}

/**
 * 5枚役確率を計算（1/X.X形式用）
 * @param fiveCardCount 5枚役の合計出現回数
 * @param totalGames 総ゲーム数
 * @returns 分母（null = 計算不可）
 */
export function calculateProbabilityDenominator(
  fiveCardCount: number,
  totalGames: number
): number | null {
  if (fiveCardCount <= 0) return null;
  if (totalGames <= 0) return null;
  return totalGames / fiveCardCount;
}
