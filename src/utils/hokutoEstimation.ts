import type {
  HokutoLog,
  ATWinLog,
  TenhaLog,
  TengekiLog,
  FakeZenchoLog,
  EffectHintLog,
  DenshoModeLog,
  HokutoSettingAnalysis,
  ModeDistribution,
  TengekiStats,
  ResetStatus,
  HokutoMode,
} from '../types/hokuto';
import {
  HOKUTO_SETTINGS,
  AT_HIT_RATES,
  TENHA_RATES,
  TENGEKI_HAZURE_RATES,
  DENSHO_END_TRANSITION,
  MODE_TRANSITION_RESET,
  SHUTTER_CHECKPOINTS,
  TENMEI_ZONES,
  TROPHY_SETTING_FLOOR,
  LAMP_B_INTERPRETATIONS,
  ABESHI_DIST_RESET,
  ABESHI_DIST_NORMAL,
  MODE_CEILINGS,
  TENGEKI_RARE_YAKU,
  TENGEKI_NON_RARE_RATES,
} from '../data/hokutoDefinitions';

// ========================================
// ログフィルタ
// ========================================

export function filterLogsByType<T extends HokutoLog>(
  logs: HokutoLog[],
  type: T['type']
): T[] {
  return logs.filter((l) => l.type === type) as T[];
}

// ========================================
// 天撃統計
// ========================================

export function calculateTengekiStats(logs: HokutoLog[]): TengekiStats {
  const tengekiLogs = filterLogsByType<TengekiLog>(logs, 'tengeki');

  let hazureTotal = 0;
  let hazureSuccess = 0;
  let overallTotal = 0;
  let overallSuccess = 0;

  for (const t of tengekiLogs) {
    overallTotal++;
    if (t.result === 'success') overallSuccess++;

    // 0Gと3Gのハズレに設定差がある
    for (const idx of [0, 3]) {
      if (t.games[idx] === 'hazure') {
        hazureTotal++;
        if (t.result === 'success') hazureSuccess++;
      }
    }
  }

  return { hazureTotal, hazureSuccess, overallTotal, overallSuccess };
}

/**
 * 天撃チャレンジの入賞状況から成功期待度を算出する。
 *
 * ゲーム位置ごとに役別の成功率が異なる:
 * - 0G: レア役100%, リプ/ベル18%, ハズレ=設定差
 * - 1-2G: レア役100%, リプ/ベル18%, ハズレ=0%
 * - 3G: レア役100%, リプ/ベル100%, ハズレ=設定差
 * - 準備中レア役=成功濃厚(100%)
 *
 * 返り値: [設定1の期待度, 設定6の期待度]
 */
export function calculateTengekiExpectedRate(
  games: readonly string[],
  prepRareHit: boolean
): [number, number] {
  if (prepRareHit) return [1, 1];

  // 設定1と設定6で計算
  const results: [number, number] = [0, 0];
  const settingsToCalc = [1, 6] as const;

  for (let si = 0; si < 2; si++) {
    const setting = settingsToCalc[si];
    let failProb = 1;

    for (let gi = 0; gi < games.length; gi++) {
      const yaku = games[gi];
      let rate: number;

      if (TENGEKI_RARE_YAKU.has(yaku)) {
        rate = 1.0;
      } else {
        const posRates = TENGEKI_NON_RARE_RATES[yaku];
        if (!posRates) {
          rate = 0;
        } else {
          rate = posRates[gi] ?? 0;
          // NaN = 設定差（ハズレの0G/3G）
          if (Number.isNaN(rate)) {
            rate = TENGEKI_HAZURE_RATES[setting];
          }
        }
      }

      failProb *= (1 - rate);
    }

    results[si] = 1 - failProb;
  }

  return results;
}

// ========================================
// 設定推定（ベイズ推定）
// ========================================

/**
 * 二項分布の対数尤度
 */
function logBinomialLikelihood(
  successes: number,
  trials: number,
  rate: number
): number {
  if (trials <= 0) return 0; // データなし → 尤度1（中立）
  if (rate <= 0) return successes === 0 ? 0 : -Infinity;
  if (rate >= 1) return successes === trials ? 0 : -Infinity;

  return (
    successes * Math.log(rate) + (trials - successes) * Math.log(1 - rate)
  );
}

/**
 * 多項分布の対数尤度（伝承モード終了後の状態移行）
 */
function logMultinomialLikelihood(
  counts: { low: number; normal: number; high: number },
  probs: { low: number; normal: number; high: number }
): number {
  const total = counts.low + counts.normal + counts.high;
  if (total <= 0) return 0;

  let logL = 0;
  if (counts.low > 0) logL += counts.low * Math.log(probs.low);
  if (counts.normal > 0) logL += counts.normal * Math.log(probs.normal);
  if (counts.high > 0) logL += counts.high * Math.log(probs.high);
  return logL;
}

/**
 * 演出確定系から設定下限を取得
 */
export function getConfirmedSettingFloor(logs: HokutoLog[]): number {
  let floor = 1;
  const effectLogs = filterLogsByType<EffectHintLog>(logs, 'effect-hint');

  for (const log of effectLogs) {
    // トロフィー
    if (log.trophy && TROPHY_SETTING_FLOOR[log.trophy]) {
      floor = Math.max(floor, TROPHY_SETTING_FLOOR[log.trophy]);
    }

    // 上部中央ランプ（B箇所）
    if (log.lampB) {
      const match = LAMP_B_INTERPRETATIONS.find(
        (l) => l.color === log.lampB!.color && l.pattern === log.lampB!.pattern
      );
      if (match?.settingFloor) {
        floor = Math.max(floor, match.settingFloor);
      }
    }
  }

  return floor;
}

/**
 * 各設定の事後確率を計算（ベイズ推定）
 *
 * 複数の独立した証拠源の対数尤度を合算し、正規化する。
 */
export function calculateHokutoSettingProbabilities(
  logs: HokutoLog[],
  totalGames: number
): HokutoSettingAnalysis {
  const uniform = 100 / HOKUTO_SETTINGS.length;
  const defaultResult: HokutoSettingAnalysis = {
    setting1: uniform,
    setting2: uniform,
    setting3: uniform,
    setting4: uniform,
    setting5: uniform,
    setting6: uniform,
  };

  if (totalGames <= 0) return defaultResult;

  // ログからデータ集計
  const atWinLogs = filterLogsByType<ATWinLog>(logs, 'at-win');
  const tenhaLogs = filterLogsByType<TenhaLog>(logs, 'tenha');
  const denshoLogs = filterLogsByType<DenshoModeLog>(logs, 'densho');
  const tengekiStats = calculateTengekiStats(logs);
  const settingFloor = getConfirmedSettingFloor(logs);

  // 伝承モード終了後の状態カウント
  const denshoEndCounts = { low: 0, normal: 0, high: 0 };
  for (const d of denshoLogs) {
    denshoEndCounts[d.endState]++;
  }

  // 各設定の対数尤度を計算
  const logLikelihoods: Record<number, number> = {};

  for (const setting of HOKUTO_SETTINGS) {
    // 設定下限チェック（確定演出で排除された設定は -Infinity）
    if (setting < settingFloor) {
      logLikelihoods[setting] = -Infinity;
      continue;
    }

    let logL = 0;

    // 1. AT初当たり確率
    logL += logBinomialLikelihood(
      atWinLogs.length,
      totalGames,
      AT_HIT_RATES[setting]
    );

    // 2. 天破出現率
    logL += logBinomialLikelihood(
      tenhaLogs.length,
      totalGames,
      TENHA_RATES[setting]
    );

    // 3. 天撃ハズレ時成功率（最大設定差）
    logL += logBinomialLikelihood(
      tengekiStats.hazureSuccess,
      tengekiStats.hazureTotal,
      TENGEKI_HAZURE_RATES[setting]
    );

    // 4. 伝承モード終了後の状態移行
    logL += logMultinomialLikelihood(
      denshoEndCounts,
      DENSHO_END_TRANSITION[setting]
    );

    logLikelihoods[setting] = logL;
  }

  // 対数尤度の最大値で安定化 + 正規化
  const validLogLs = Object.values(logLikelihoods).filter((v) => v > -Infinity);
  if (validLogLs.length === 0) return defaultResult;

  const maxLogL = Math.max(...validLogLs);
  let totalLikelihood = 0;
  const likelihoods: Record<number, number> = {};

  for (const setting of HOKUTO_SETTINGS) {
    if (logLikelihoods[setting] === -Infinity) {
      likelihoods[setting] = 0;
    } else {
      likelihoods[setting] = Math.exp(logLikelihoods[setting] - maxLogL);
    }
    totalLikelihood += likelihoods[setting];
  }

  if (totalLikelihood <= 0) return defaultResult;

  return {
    setting1: (likelihoods[1] / totalLikelihood) * 100,
    setting2: (likelihoods[2] / totalLikelihood) * 100,
    setting3: (likelihoods[3] / totalLikelihood) * 100,
    setting4: (likelihoods[4] / totalLikelihood) * 100,
    setting5: (likelihoods[5] / totalLikelihood) * 100,
    setting6: (likelihoods[6] / totalLikelihood) * 100,
  };
}

// ========================================
// モード推定
// ========================================

/**
 * シャッター判別・フェイク前兆・ランプ示唆からモード確率分布を推定
 */
export function estimateCurrentMode(
  logs: HokutoLog[],
  resetStatus: ResetStatus
): ModeDistribution {
  // 事前確率: リセット時はモード移行率テーブル（設定不明なので設定3相当）、
  // 据え置き/不明時は均等分布
  let dist: ModeDistribution;

  if (resetStatus === 'reset') {
    const rates = MODE_TRANSITION_RESET[3];
    dist = {
      modeA: rates.modeA,
      modeB: rates.modeB,
      modeC: rates.modeC,
      tengoku: rates.tengoku,
    };
  } else {
    dist = { modeA: 0.25, modeB: 0.25, modeC: 0.25, tengoku: 0.25 };
  }

  const zenchoLogs = filterLogsByType<FakeZenchoLog>(logs, 'fake-zencho');
  const effectLogs = filterLogsByType<EffectHintLog>(logs, 'effect-hint');

  // シャッター・その他前兆判別（同じロジック）
  for (const log of zenchoLogs) {
    if (log.zenchoCategory !== 'shutter' && log.zenchoCategory !== 'other') continue;
    const checkpoint = SHUTTER_CHECKPOINTS.find(
      (cp) => cp.usableForJudge && log.abeshiCount >= cp.min && log.abeshiCount <= cp.max
    );

    if (checkpoint) {
      // 896以内（モードA深部の可能性を大幅減少）
      dist.modeA *= 0.1;
    }
  }

  // 天命の刻によるモード判別
  for (const log of zenchoLogs) {
    if (log.zenchoCategory !== 'tenmei') continue;

    const zone = TENMEI_ZONES.find(
      (z) => log.abeshiCount >= z.min && log.abeshiCount <= z.max
    );

    if (zone) {
      const modes: HokutoMode[] = ['mode-a', 'mode-b', 'mode-c', 'tengoku'];
      for (const mode of modes) {
        if (!zone.modes.includes(mode)) {
          dist[mode === 'mode-a' ? 'modeA' : mode === 'mode-b' ? 'modeB' : mode === 'mode-c' ? 'modeC' : 'tengoku'] = 0;
        }
      }
    }
  }

  // サブ液晶ランプ（C箇所）による示唆 — 早い初当たり示唆
  for (const log of effectLogs) {
    if (!log.lampC) continue;
    if (log.lampC.color === 'cyan') {
      // 早い初当たり示唆（弱）
      dist.modeA *= 0.3;
    }
    if (log.lampC.color === 'yellow-green' || log.lampC.color === 'gold') {
      // 早い初当たり示唆（中/強）
      dist.modeA *= 0.05;
    }
  }

  // 正規化
  const total = dist.modeA + dist.modeB + dist.modeC + dist.tengoku;
  if (total <= 0) {
    return { modeA: 0.25, modeB: 0.25, modeC: 0.25, tengoku: 0.25 };
  }

  return {
    modeA: dist.modeA / total,
    modeB: dist.modeB / total,
    modeC: dist.modeC / total,
    tengoku: dist.tengoku / total,
  };
}

// ========================================
// AT当選時のモード推定
// ========================================

/**
 * AT当選あべし数と、そのAT前の前兆・演出ログからモードを推定する。
 *
 * 1. 事前確率: リセット状況に応じたモード移行率
 * 2. 尤度: 振り分けテーブルから P(あべしゾーン | モード)
 * 3. 前兆・ランプ示唆で絞り込み
 */
export function estimateModeForATWin(
  abeshiCount: number,
  resetStatus: ResetStatus,
  logsBeforeAT: HokutoLog[]
): ModeDistribution {
  // 1. 事前確率
  let dist: ModeDistribution;
  if (resetStatus === 'reset') {
    const rates = MODE_TRANSITION_RESET[3];
    dist = { modeA: rates.modeA, modeB: rates.modeB, modeC: rates.modeC, tengoku: rates.tengoku };
  } else {
    dist = { modeA: 0.25, modeB: 0.25, modeC: 0.25, tengoku: 0.25 };
  }

  // 2. モード天井で不可能なモードを排除（通常天井=絶対上限を使用）
  if (abeshiCount > MODE_CEILINGS['tengoku']) dist.tengoku = 0;
  if (abeshiCount > MODE_CEILINGS['mode-c']) dist.modeC = 0;
  if (abeshiCount > MODE_CEILINGS['mode-b']) dist.modeB = 0;
  if (abeshiCount > MODE_CEILINGS['mode-a']) dist.modeA = 0;

  // 3. 振り分けテーブルから尤度を掛ける
  const table = resetStatus === 'reset' ? ABESHI_DIST_RESET : ABESHI_DIST_NORMAL;
  const zone = table.find((z) => abeshiCount >= z.min && abeshiCount <= z.max);

  if (zone) {
    dist.modeA *= zone.modeA;
    dist.modeB *= zone.modeB;
    dist.modeC *= zone.modeC;
    dist.tengoku *= zone.tengoku;
  }

  // 4. 前兆・シャッター・ランプ示唆で絞り込み
  const zenchoLogs = filterLogsByType<FakeZenchoLog>(logsBeforeAT, 'fake-zencho');
  const effectLogs = filterLogsByType<EffectHintLog>(logsBeforeAT, 'effect-hint');

  for (const log of zenchoLogs) {
    if (log.zenchoCategory === 'shutter' || log.zenchoCategory === 'other') {
      const cp = SHUTTER_CHECKPOINTS.find(
        (c) => c.usableForJudge && log.abeshiCount >= c.min && log.abeshiCount <= c.max
      );
      if (cp) dist.modeA *= 0.1;
    }
    if (log.zenchoCategory === 'tenmei') {
      const tz = TENMEI_ZONES.find((z) => log.abeshiCount >= z.min && log.abeshiCount <= z.max);
      if (tz) {
        const modes: HokutoMode[] = ['mode-a', 'mode-b', 'mode-c', 'tengoku'];
        for (const mode of modes) {
          if (!tz.modes.includes(mode)) {
            dist[mode === 'mode-a' ? 'modeA' : mode === 'mode-b' ? 'modeB' : mode === 'mode-c' ? 'modeC' : 'tengoku'] = 0;
          }
        }
      }
    }
  }

  for (const log of effectLogs) {
    if (log.lampC?.color === 'cyan') dist.modeA *= 0.3;
    if (log.lampC?.color === 'yellow-green' || log.lampC?.color === 'gold') dist.modeA *= 0.05;
  }

  // 天井による排除はヒントより優先（最終事実）
  // ヒントで排除されても天井的に唯一可能なモードがあれば復元
  const possible = {
    modeA: abeshiCount <= MODE_CEILINGS['mode-a'],
    modeB: abeshiCount <= MODE_CEILINGS['mode-b'],
    modeC: abeshiCount <= MODE_CEILINGS['mode-c'],
    tengoku: abeshiCount <= MODE_CEILINGS['tengoku'],
  };
  if (!possible.tengoku) dist.tengoku = 0;
  if (!possible.modeC) dist.modeC = 0;
  if (!possible.modeB) dist.modeB = 0;
  if (!possible.modeA) dist.modeA = 0;

  // 正規化
  let total = dist.modeA + dist.modeB + dist.modeC + dist.tengoku;

  // 全モード0の場合、天井的に可能なモードで均等分布
  if (total <= 0) {
    const count = [possible.modeA, possible.modeB, possible.modeC, possible.tengoku].filter(Boolean).length;
    if (count === 0) return { modeA: 0.25, modeB: 0.25, modeC: 0.25, tengoku: 0.25 };
    const p = 1 / count;
    dist = {
      modeA: possible.modeA ? p : 0,
      modeB: possible.modeB ? p : 0,
      modeC: possible.modeC ? p : 0,
      tengoku: possible.tengoku ? p : 0,
    };
    total = 1;
  }

  return {
    modeA: dist.modeA / total,
    modeB: dist.modeB / total,
    modeC: dist.modeC / total,
    tengoku: dist.tengoku / total,
  };
}

/**
 * 全ログから各AT当選のモード推定を計算する。
 * 返り値はATログのidをキーとしたModeDistributionの辞書。
 */
export function estimateModesForAllATs(
  logs: HokutoLog[],
  resetStatus: ResetStatus
): Record<string, ModeDistribution> {
  const result: Record<string, ModeDistribution> = {};
  let lastATIndex = -1;
  let atOrdinal = 0;

  for (let i = 0; i < logs.length; i++) {
    if (logs[i].type !== 'at-win') continue;
    const atLog = logs[i] as ATWinLog;

    // リセット状態は1回目のATまでのみ有効、以降は通常扱い
    const effectiveReset = atOrdinal === 0 ? resetStatus : 'unknown';

    const logsBeforeAT = logs.slice(lastATIndex + 1, i);
    // あべし未入力時はG数をフォールバック
    const effectiveAbeshi = atLog.abeshiCount > 0 ? atLog.abeshiCount : atLog.gameCount;
    result[atLog.id] = estimateModeForATWin(effectiveAbeshi, effectiveReset, logsBeforeAT);
    lastATIndex = i;
    atOrdinal++;
  }

  return result;
}
