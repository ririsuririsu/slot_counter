import type {
  KabaneriAnalysisTargets,
  KabaneriCounterState,
  KabaneriFlashAxis,
  KabaneriSettingAnalysis,
} from '../types/kabaneri';
import { logBinomialPMF } from './binomialDistribution';
import { bellProbabilities, chanceDefinitions, kabaneriFlashAxes, GEDAN_BELL_KEY } from '../data/kabaneriDefinitions';

const SETTING_KEYS = ['setting1', 'setting2', 'setting3', 'setting4', 'setting5', 'setting6'] as const;

/** 全設定均等の事前分布。画面では未計測をこの分布と区別する。 */
export function createEqualAnalysis(): KabaneriSettingAnalysis {
  return { setting1: 100 / 6, setting2: 100 / 6, setting3: 100 / 6, setting4: 100 / 6, setting5: 100 / 6, setting6: 100 / 6 };
}

function posterior(logs: number[]): KabaneriSettingAnalysis {
  const max = Math.max(...logs);
  if (!Number.isFinite(max)) return createEqualAnalysis();
  const weights = logs.map((value) => Math.exp(value - max));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const result = createEqualAnalysis();
  SETTING_KEYS.forEach((key, index) => { result[key] = weights[index] / total * 100; });
  return result;
}

function validObservation(k: number, n: number): boolean {
  return Number.isSafeInteger(n) && n > 0 && Number.isSafeInteger(k) && k >= 0 && k <= n;
}

function binomialLogs(k: number, n: number, probabilities: number[]): number[] {
  return probabilities.map((p) => logBinomialPMF(k, n, p));
}

/** 役別の不整合を合算で隠さない。無名・生駒とカバネは必ず別に集計する。 */
export function getKabaneriFlashObservation(counters: KabaneriCounterState, axis: KabaneriFlashAxis) {
  const definition = kabaneriFlashAxes.find((item) => item.id === axis)!;
  let chanceTotal = 0;
  let flashTotal = 0;
  let error = false;
  for (const id of definition.chanceIds) {
    const role = chanceDefinitions.find((item) => item.id === id)!;
    const count = counters[role.countKey] ?? 0;
    const flash = counters[role.flashKey] ?? 0;
    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(flash) || count < 0 || flash < 0 || flash > count) {
      error = true;
    }
    chanceTotal += count;
    flashTotal += flash;
  }
  return { chanceTotal, flashTotal, error };
}

interface FlashAxisResult {
  chanceTotal: number;
  flashTotal: number;
  error: boolean;
  analysis: KabaneriSettingAnalysis | null;
}

/** 選択した有効な軸の対数尤度を直接加算し、一度だけ正規化する。 */
export function calculateSelectedKabaneriAnalyses(
  counters: KabaneriCounterState,
  totalGames: number,
  targets: KabaneriAnalysisTargets
) {
  const selectedLogs: number[][] = [];
  const bellCount = counters[GEDAN_BELL_KEY] ?? 0;
  const bellError = !Number.isSafeInteger(totalGames) || totalGames < 0 ||
    !Number.isSafeInteger(bellCount) || bellCount < 0 || (totalGames > 0 && bellCount > totalGames);
  let bellAnalysis: KabaneriSettingAnalysis | null = null;
  if (targets.bell && !bellError && validObservation(bellCount, totalGames)) {
    const logs = binomialLogs(bellCount, totalGames, bellProbabilities.map((p) => 1 / p.denominator));
    selectedLogs.push(logs);
    bellAnalysis = posterior(logs);
  }

  const flashes = {} as Record<KabaneriFlashAxis, FlashAxisResult>;
  for (const axis of kabaneriFlashAxes) {
    const observation = getKabaneriFlashObservation(counters, axis.id);
    let analysis: KabaneriSettingAnalysis | null = null;
    if (targets[axis.id] && !observation.error && validObservation(observation.flashTotal, observation.chanceTotal)) {
      const logs = binomialLogs(observation.flashTotal, observation.chanceTotal, axis.rates.map((p) => p.rate));
      selectedLogs.push(logs);
      analysis = posterior(logs);
    }
    flashes[axis.id] = { ...observation, analysis };
  }

  const combined = selectedLogs.length > 0
    ? posterior(SETTING_KEYS.map((_, index) => selectedLogs.reduce((sum, logs) => sum + logs[index], 0)))
    : null;
  return { bellCount, bellError, bellAnalysis, flashes, combined };
}

export function calculateBellAnalysis(bellCount: number, totalGames: number): KabaneriSettingAnalysis {
  if (!validObservation(bellCount, totalGames)) return createEqualAnalysis();
  return posterior(binomialLogs(bellCount, totalGames, bellProbabilities.map((p) => 1 / p.denominator)));
}

/** 軸を明示して計算する。3役を混ぜた旧モデルは使用しない。 */
export function calculateFlashAnalysis(
  flashCount: number,
  chanceCount: number,
  axis: KabaneriFlashAxis
): KabaneriSettingAnalysis {
  if (!validObservation(flashCount, chanceCount)) return createEqualAnalysis();
  const definition = kabaneriFlashAxes.find((item) => item.id === axis)!;
  return posterior(binomialLogs(flashCount, chanceCount, definition.rates.map((p) => p.rate)));
}

export function calculateDenominator(count: number, totalGames: number): number | null {
  return count > 0 && totalGames > 0 ? totalGames / count : null;
}
