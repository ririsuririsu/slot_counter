// ========================================
// スマスロ 攻殻機動隊 モード推測・設定推測（純粋関数）
//
// 観測は「どの規定ゲーム数の殲滅ZONEに当選し、どこを素通りしたか」の列。
// モードはサイクルごとに引き直され、次のモードは**直前のモードに依存しない**
// （出典の移行率表が移行先だけの1次元であるため）。
// したがって各サイクルのモードは独立試行で、前向き・後ろ向きの伝播は不要。
//
//   設定 s の対数尤度 = Σ_cycle log( Σ_mode prior(mode) × emission(mode, 観測) )
//
// prior は直前のサイクルの終わり方で決まる。
//   AT後    → 全設定共通（＝設定の情報が増えない）
//   CZ失敗後 → 設定差あり（＝唯一の設定推測軸）
//   リセット回 → モード=リセット 確定
//
// 詳細仕様は docs/kokaku-spec.md を参照。
// ========================================

import type {
  KokakuAnalysis,
  KokakuCycleEndEvent,
  KokakuCycleRow,
  KokakuEvent,
  KokakuMode,
  KokakuObservedRate,
  KokakuPointCell,
  KokakuScreen,
  KokakuScreenOccasion,
  KokakuSettingAnalysis,
  KokakuZoneCell,
  KokakuZoneColor,
} from '../types/kokaku';
import {
  KOKAKU_AT_TRANSITION,
  KOKAKU_DEST_MODES,
  KOKAKU_COLOR_CZ_RATE,
  KOKAKU_COLOR_LABEL,
  KOKAKU_CZ_CEILING,
  KOKAKU_CZ_TRANSITION,
  KOKAKU_GRID_GAMES,
  KOKAKU_MODES,
  KOKAKU_SCREENS,
  KOKAKU_TACHIKOMA_CZ_RATE,
  KOKAKU_TACHIKOMA_GAMES,
  KOKAKU_VISUAL_HACK_RATE,
  KOKAKU_ZONE_COLORS,
  KOKAKU_ZONE_RATE,
} from '../data/kokakuDefinitions';

const SETTING_KEYS = [
  'setting1',
  'setting2',
  'setting3',
  'setting4',
  'setting5',
  'setting6',
] as const;

const SETTING_COUNT = SETTING_KEYS.length;

/** 壊れた観測で系列全体を潰さないための下限 */
const MIN_LIKELIHOOD = 1e-12;

export function createEqualKokakuAnalysis(): KokakuSettingAnalysis {
  const equal = 100 / SETTING_COUNT;
  return {
    setting1: equal,
    setting2: equal,
    setting3: equal,
    setting4: equal,
    setting5: equal,
    setting6: equal,
  };
}

function fromLogLikelihoods(logLikelihoods: number[]): KokakuSettingAnalysis {
  const finite = logLikelihoods.filter((l) => Number.isFinite(l));
  if (finite.length === 0) return createEqualKokakuAnalysis();

  const max = Math.max(...finite);
  const weights = logLikelihoods.map((l) => (Number.isFinite(l) ? Math.exp(l - max) : 0));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return createEqualKokakuAnalysis();

  const result = createEqualKokakuAnalysis();
  SETTING_KEYS.forEach((key, i) => {
    result[key] = (weights[i] / total) * 100;
  });
  return result;
}

// ========================================
// 1. グリッドの組み立て
// ========================================

/** 行がリセット回かどうか（既定は1行目のみ） */
export function resolveKokakuIsReset(rowIndex: number, override: boolean | null): boolean {
  return override ?? rowIndex === 1;
}

function isTachikomaGame(game: number): boolean {
  return (KOKAKU_TACHIKOMA_GAMES as readonly number[]).includes(game);
}

interface RowDraft {
  zoneEvents: { game: number; color: KokakuZoneColor | null; czWon: boolean; eventIndex: number }[];
  pointCells: KokakuPointCell[];
  screens: { screen: KokakuScreen; occasion: KokakuScreenOccasion; eventIndex: number }[];
}

function emptyDraft(): RowDraft {
  return { zoneEvents: [], pointCells: [], screens: [] };
}

/**
 * サイクルの到達ゲーム数。
 * 終了済みなら記録された endGame、進行中なら現在Gを使う。
 * どちらの場合も、記録済みゾーンのゲーム数を下回らないよう引き上げる
 * （現在Gの更新忘れで入力済みのゾーンが「未到達」に化けるのを防ぐ）。
 */
function resolveReachedGame(
  draft: RowDraft,
  end: KokakuCycleEndEvent | null,
  currentGame: number
): number {
  const recorded = draft.zoneEvents.reduce((max, z) => Math.max(max, z.game), 0);
  const base = end ? end.endGame : currentGame;
  return Math.max(recorded, Number.isFinite(base) ? base : 0);
}

function buildCells(draft: RowDraft, reachedGame: number): KokakuZoneCell[] {
  return KOKAKU_GRID_GAMES.map((game) => {
    const found = draft.zoneEvents.find((z) => z.game === game);
    return {
      game,
      kind: isTachikomaGame(game) ? ('tachikoma' as const) : ('zone' as const),
      occurred: found !== undefined,
      color: found?.color ?? null,
      czWon: found?.czWon ?? false,
      eventIndex: found?.eventIndex ?? -1,
      unreached: game > reachedGame,
    };
  });
}

/**
 * イベント列を「縦＝CZサイクル / 横＝規定ゲーム数の固定列」のグリッドに組み直す。
 * 列が固定なので、セルを消しても後続の位置がずれない
 * （モンハンライズのクエストグリッドで必要だった「削除しても枠は残す」規則が不要）。
 */
export function buildKokakuGrid(events: KokakuEvent[], currentGame: number): KokakuCycleRow[] {
  const rows: KokakuCycleRow[] = [];
  let draft = emptyDraft();
  let override: boolean | null = null;
  let cycleStartEventIndex = -1;
  let rowStartIndex = 0;

  events.forEach((event, eventIndex) => {
    switch (event.type) {
      case 'cycle-start':
        override = event.reset;
        cycleStartEventIndex = eventIndex;
        break;
      case 'zone':
      case 'tachikoma-zone':
        draft.zoneEvents.push({
          game: event.game,
          color: event.type === 'zone' ? event.color : null,
          czWon: event.czWon,
          eventIndex,
        });
        break;
      case 'zone-point':
        draft.pointCells.push({ color: event.color, czWon: event.czWon, eventIndex });
        break;
      case 'screen':
        draft.screens.push({ screen: event.screen, occasion: event.occasion, eventIndex });
        break;
      case 'cycle-end': {
        const index = rows.length + 1;
        const reachedGame = resolveReachedGame(draft, event, currentGame);
        rows.push({
          index,
          cells: buildCells(draft, reachedGame),
          pointCells: draft.pointCells,
          screens: draft.screens,
          end: event,
          endEventIndex: eventIndex,
          appendIndex: eventIndex,
          reachedGame,
          active: false,
          isReset: resolveKokakuIsReset(index, override),
          cycleStartEventIndex,
          rowStartIndex,
        });
        draft = emptyDraft();
        override = null;
        cycleStartEventIndex = -1;
        rowStartIndex = eventIndex + 1;
        break;
      }
    }
  });

  // 進行中の行は常に末尾に1行置く
  const index = rows.length + 1;
  const reachedGame = resolveReachedGame(draft, null, currentGame);
  rows.push({
    index,
    cells: buildCells(draft, reachedGame),
    pointCells: draft.pointCells,
    screens: draft.screens,
    end: null,
    endEventIndex: -1,
    appendIndex: events.length,
    reachedGame,
    active: true,
    isReset: resolveKokakuIsReset(index, override),
    cycleStartEventIndex,
    rowStartIndex,
  });

  return rows;
}

// ========================================
// 2. 出力確率（emission）
// ========================================

/** 画面示唆から、その行で許されるモードを絞り込む（「濃厚」のみ制約にする） */
export function allowedModesFromScreens(row: KokakuCycleRow): KokakuMode[] | null {
  let allowed: KokakuMode[] | null = null;
  for (const record of row.screens) {
    const info = KOKAKU_SCREENS.find((s) => s.id === record.screen);
    if (!info?.allowedModes) continue;
    allowed = allowed
      ? allowed.filter((m) => info.allowedModes!.includes(m))
      : [...info.allowedModes];
  }
  return allowed;
}

/**
 * モード m がこの行の観測を出す確率。
 *
 * - 到達Gがそのモードの天井を超えていたら 0（天井到達でCZ以上濃厚なので続くはずがない）
 * - 天井のゲーム数自体は確定なので尤度に入れない
 * - タチコマSAMゾーン（200G/400G）は殲滅ZONEではないので除外
 * - 「抽選なし」のゲーム数で殲滅ZONEが発生していたら矛盾（0）
 *
 * 1サイクル内の複数マスを掛け合わせるのは近似。実機は「モード決定時に
 * 最深部まで消化した場合の当選回数」を先に決めており当否は独立ではない。
 * 同時分布が非公開なので周辺確率の積で代用している（docs/kokaku-spec.md §3-3）。
 */
export function cycleEmission(mode: KokakuMode, row: KokakuCycleRow, useScreens = true): number {
  const ceiling = KOKAKU_CZ_CEILING[mode];
  if (row.reachedGame > ceiling) return 0;

  if (useScreens) {
    const allowed = allowedModesFromScreens(row);
    if (allowed && !allowed.includes(mode)) return 0;
  }

  let likelihood = 1;
  for (const cell of row.cells) {
    if (cell.kind !== 'zone') continue;
    if (cell.unreached) continue;
    if (cell.game > ceiling) return 0;
    // 天井のゲーム数は「殲滅ZONEを経由してCZ以上濃厚」＝確定なので尤度に入れない
    if (cell.game === ceiling) continue;

    const rate = KOKAKU_ZONE_RATE[mode][cell.game];
    if (rate === null || rate === undefined) {
      // 抽選なしのゲーム数で発生していたら説明できない
      if (cell.occurred) return 0;
      continue;
    }
    likelihood *= cell.occurred ? rate : 1 - rate;
  }
  return likelihood;
}

// ========================================
// 3. モードの事前分布（サイクルごと）
// ========================================

function zeroModeDist(): Record<KokakuMode, number> {
  return { reset: 0, normalA: 0, normalB: 0, normalC: 0, normalD: 0 };
}

function czModeDist(settingIndex: number): Record<KokakuMode, number> {
  const dist = zeroModeDist();
  KOKAKU_MODES.forEach((m) => {
    dist[m] = KOKAKU_CZ_TRANSITION[m][settingIndex] ?? 0;
  });
  return dist;
}

function atModeDist(): Record<KokakuMode, number> {
  const dist = zeroModeDist();
  KOKAKU_MODES.forEach((m) => {
    dist[m] = KOKAKU_AT_TRANSITION[m];
  });
  return dist;
}

/**
 * 直前のサイクルの終わり方から、このサイクルのモード事前分布を決める。
 *
 * 先頭のサイクル（直前が分からない＝途中から拾った台）は**均等**にする。
 * 移行率表そのもの（CZ後）を使うと設定差のある分布になり、
 * 「どう始まったか分からない」という仮定だけで設定の事後が動いてしまう。
 * CZ後の通常Aは設定1と6で2.5倍違うので、1行の未知の始まりが
 * 実測4〜5サイクル分の重みを持ってしまう。それは観測ではなく仮定なので避ける。
 */
function priorForCycle(
  row: KokakuCycleRow,
  previousEnd: KokakuCycleEndEvent | null,
  settingIndex: number
): Record<KokakuMode, number> {
  if (row.isReset) {
    const dist = zeroModeDist();
    dist.reset = 1;
    return dist;
  }
  if (previousEnd === null) {
    const dist = zeroModeDist();
    KOKAKU_DEST_MODES.forEach((m) => {
      dist[m] = 1 / KOKAKU_DEST_MODES.length;
    });
    return dist;
  }
  if (previousEnd.at != null) return atModeDist();
  return czModeDist(settingIndex);
}

/** その行で取りうるモード。リセット回はリセット固定、それ以外は通常A〜D */
function possibleModes(row: KokakuCycleRow): readonly KokakuMode[] {
  return row.isReset ? (['reset'] as const) : KOKAKU_DEST_MODES;
}

/** 前のサイクルの終わり方が、次のサイクルへ繋がるか（打ち切りなら切れる） */
function continuesToNext(end: KokakuCycleEndEvent | null): boolean {
  return end !== null && (end.at !== null || end.cz !== null);
}

// ========================================
// 4. 設定推測
// ========================================

interface CycleContext {
  row: KokakuCycleRow;
  /** 直前のサイクルの終わり方。系列が切れていたら null */
  previousEnd: KokakuCycleEndEvent | null;
}

function buildContexts(rows: KokakuCycleRow[]): CycleContext[] {
  const contexts: CycleContext[] = [];
  let previousEnd: KokakuCycleEndEvent | null = null;

  for (const row of rows) {
    contexts.push({ row, previousEnd });
    previousEnd = continuesToNext(row.end) ? row.end : null;
  }
  return contexts;
}

/**
 * 観測が1つも無い行は尤度に寄与させない（空行で分布が動くのを防ぐ）。
 *
 * 到達G 0 で早期リターンしてはいけない。始まったばかりの行でも
 * 画面の「濃厚」示唆だけは観測として効くため（裏コマンドは77G以降なので
 * ゾーンより先に示唆が入ることが普通にある）。
 * ゾーン側は到達G 0 なら全セルが未到達になるので、この判定だけで足りる。
 */
function hasObservation(row: KokakuCycleRow): boolean {
  return (
    allowedModesFromScreens(row) !== null ||
    row.cells.some((c) => c.kind === 'zone' && !c.unreached)
  );
}

function settingLogLikelihood(contexts: CycleContext[], settingIndex: number): number {
  let total = 0;
  for (const { row, previousEnd } of contexts) {
    if (!hasObservation(row)) continue;
    const prior = priorForCycle(row, previousEnd, settingIndex);
    const sum = KOKAKU_MODES.reduce(
      (acc, m) => acc + prior[m] * cycleEmission(m, row),
      0
    );
    total += Math.log(Math.max(sum, MIN_LIKELIHOOD));
  }
  return total;
}

/**
 * 画面示唆（アオイ金枠＝設定4以上濃厚、全員集合＝設定6濃厚 など）で否定された設定。
 *
 * 複数の示唆は積集合を取る。矛盾（積集合が空）した場合は制約を丸ごと捨てて
 * `conflict` を立てる。押し間違いで全設定が0になり推定が無意味になるのを防ぐ。
 */
export function excludedSettingsFromScreens(rows: KokakuCycleRow[]): {
  excluded: number[];
  conflict: boolean;
} {
  let allowed: number[] | null = null;
  for (const row of rows) {
    for (const record of row.screens) {
      const info = KOKAKU_SCREENS.find((s) => s.id === record.screen);
      if (!info?.allowedSettings) continue;
      allowed = allowed
        ? allowed.filter((s) => info.allowedSettings!.includes(s))
        : [...info.allowedSettings];
    }
  }
  if (!allowed) return { excluded: [], conflict: false };
  if (allowed.length === 0) return { excluded: [], conflict: true };
  return { excluded: [1, 2, 3, 4, 5, 6].filter((s) => !allowed!.includes(s)), conflict: false };
}

/**
 * 画面の「濃厚」制約が観測と矛盾している行。
 * 制約なしなら説明できるのに、制約を入れると全モードが尤度0になる行を返す。
 * 入力ミスで推定が全滅するのを避けるため、UIで警告して制約を外せるようにする。
 *
 * 判定はその行で取りうるモードだけで行う。通常回でリセットモードは選ばれないので、
 * リセットが生き残っているだけの行を「矛盾なし」と誤判定しないようにする。
 */
export function findKokakuConflicts(rows: KokakuCycleRow[]): number[] {
  return rows
    .filter((row) => {
      if (allowedModesFromScreens(row) === null) return false;
      const modes = possibleModes(row);
      const withScreens = modes.some((m) => cycleEmission(m, row, true) > 0);
      const withoutScreens = modes.some((m) => cycleEmission(m, row, false) > 0);
      return withoutScreens && !withScreens;
    })
    .map((row) => row.index);
}

// ========================================
// 5. モードの事後分布
// ========================================

export interface KokakuModePosterior {
  /** 行番号 */
  index: number;
  distribution: Record<KokakuMode, number>;
  top: KokakuMode;
  /** 最有力モードの確率。低いほど絞れていない */
  confidence: number;
  /** 観測が無く事前分布のままか */
  prior: boolean;
}

function normalizeDist(dist: Record<KokakuMode, number>): Record<KokakuMode, number> {
  const total = KOKAKU_MODES.reduce((sum, m) => sum + dist[m], 0);
  const out = zeroModeDist();
  if (total <= 0) {
    KOKAKU_MODES.forEach((m) => {
      out[m] = 1 / KOKAKU_MODES.length;
    });
    return out;
  }
  KOKAKU_MODES.forEach((m) => {
    out[m] = dist[m] / total;
  });
  return out;
}

export function toKokakuSettingWeights(analysis: KokakuSettingAnalysis): number[] {
  const weights = SETTING_KEYS.map((key) => Math.max(0, analysis[key]));
  const total = weights.reduce((sum, w) => sum + w, 0);
  return total > 0 ? weights.map((w) => w / total) : weights.map(() => 1 / SETTING_COUNT);
}

/**
 * 各サイクルのモード事後分布。
 * モードはサイクル間で独立なので、後の観測が手前のモードを絞り込むことはない
 * （モンハンライズのような forward-backward は要らない）。
 * 設定については事後分布で重み付け平均し、1本の系列として見せる。
 */
export function calculateKokakuModePosteriors(
  rows: KokakuCycleRow[],
  settingWeights: number[]
): KokakuModePosterior[] {
  const contexts = buildContexts(rows);

  return contexts.map(({ row, previousEnd }) => {
    const observed = hasObservation(row);
    const blended = zeroModeDist();

    settingWeights.forEach((weight, settingIndex) => {
      if (weight <= 0) return;
      const prior = priorForCycle(row, previousEnd, settingIndex);
      const scored = zeroModeDist();
      let sum = 0;
      KOKAKU_MODES.forEach((m) => {
        scored[m] = prior[m] * (observed ? cycleEmission(m, row) : 1);
        sum += scored[m];
      });
      if (sum <= 0) {
        // 制約が矛盾している行。制約を外した分布で代用する
        KOKAKU_MODES.forEach((m) => {
          scored[m] = prior[m] * cycleEmission(m, row, false);
          sum += scored[m];
        });
      }
      if (sum <= 0) return;
      KOKAKU_MODES.forEach((m) => {
        blended[m] += (weight * scored[m]) / sum;
      });
    });

    const distribution = normalizeDist(blended);
    let top: KokakuMode = KOKAKU_MODES[0];
    KOKAKU_MODES.forEach((m) => {
      if (distribution[m] > distribution[top]) top = m;
    });

    return {
      index: row.index,
      distribution,
      top,
      confidence: distribution[top],
      prior: !observed,
    };
  });
}

// ========================================
// 5-2. 出現した画面の集計
// ========================================

export interface KokakuScreenAppearance {
  /** 示唆が掛かっているサイクル番号 */
  cycle: number;
  occasion: KokakuScreenOccasion;
  eventIndex: number;
}

export interface KokakuScreenTally {
  screen: KokakuScreen;
  count: number;
  appearances: KokakuScreenAppearance[];
}

export interface KokakuScreenSummary {
  tallies: KokakuScreenTally[];
  /** 記録した画面の総数 */
  total: number;
  /** うちデフォルト画面（素子・青空）以外の数 */
  nonDefault: number;
}

/**
 * 出現した画面を種類ごとに数える。
 * 並びはカタログ順（弱い示唆→強い示唆）なので、画面選択と同じ順で読める。
 *
 * `cycle` は**示唆が掛かっているサイクル**。終了時に見た画面は次のサイクルに
 * 属するので、見たタイミングそのものとは1つずれることがある（仕様 §7-4）。
 */
export function summarizeKokakuScreens(rows: KokakuCycleRow[]): KokakuScreenSummary {
  const byScreen = new Map<KokakuScreen, KokakuScreenAppearance[]>();

  for (const row of rows) {
    for (const record of row.screens) {
      const list = byScreen.get(record.screen) ?? [];
      list.push({ cycle: row.index, occasion: record.occasion, eventIndex: record.eventIndex });
      byScreen.set(record.screen, list);
    }
  }

  const tallies = KOKAKU_SCREENS.flatMap((info) => {
    const appearances = byScreen.get(info.id);
    return appearances ? [{ screen: info.id, count: appearances.length, appearances }] : [];
  });

  const total = tallies.reduce((sum, t) => sum + t.count, 0);
  const nonDefault = tallies.reduce(
    (sum, t) =>
      sum + (KOKAKU_SCREENS.find((s) => s.id === t.screen)?.defaultPattern ? 0 : t.count),
    0
  );

  return { tallies, total, nonDefault };
}

// ========================================
// 6. 参考値（事後確率には入れない実測値）
// ========================================

function collectObservedRates(rows: KokakuCycleRow[]): KokakuObservedRate[] {
  const rates: KokakuObservedRate[] = [];

  // 視覚HACK: 分母はCZ失敗回数
  let hackTotal = 0;
  let hackHit = 0;
  for (const row of rows) {
    const cz = row.end?.cz;
    if (!cz || cz.success || cz.visualHack === null) continue;
    hackTotal++;
    if (cz.visualHack) hackHit++;
  }
  rates.push({
    id: 'visualHack',
    label: '視覚HACK（CZ失敗時）',
    hit: hackHit,
    total: hackTotal,
    setting1: KOKAKU_VISUAL_HACK_RATE.setting1,
    setting6: KOKAKU_VISUAL_HACK_RATE.setting6,
    note: 'S.A.M.視覚フラグ保有率',
  });

  // タチコマSAMゾーン（200G / 400G）
  let tachiTotal = 0;
  let tachiHit = 0;
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.kind !== 'tachikoma' || !cell.occurred) continue;
      tachiTotal++;
      if (cell.czWon) tachiHit++;
    }
  }
  rates.push({
    id: 'tachikoma',
    label: 'タチコマCZ（200G/400G）',
    hit: tachiHit,
    total: tachiTotal,
    setting1: KOKAKU_TACHIKOMA_CZ_RATE.setting1,
    setting6: KOKAKU_TACHIKOMA_CZ_RATE.setting6,
    note: '出典はAT終了後の合算値',
  });

  // 色別のCZ当選率。母確率が違うので色を合算しない
  const colorTotals = new Map<KokakuZoneColor, { hit: number; total: number }>();
  const bump = (color: KokakuZoneColor | null, czWon: boolean) => {
    if (!color) return;
    const current = colorTotals.get(color) ?? { hit: 0, total: 0 };
    colorTotals.set(color, { hit: current.hit + (czWon ? 1 : 0), total: current.total + 1 });
  };
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.kind === 'zone' && cell.occurred) bump(cell.color, cell.czWon);
    }
    for (const cell of row.pointCells) bump(cell.color, cell.czWon);
  }
  for (const color of KOKAKU_ZONE_COLORS) {
    const stat = colorTotals.get(color);
    if (!stat) continue;
    const reference = KOKAKU_COLOR_CZ_RATE[color];
    rates.push({
      id: `color-${color}`,
      label: `${KOKAKU_COLOR_LABEL[color]}からのCZ当選`,
      hit: stat.hit,
      total: stat.total,
      setting1: reference?.setting1 ?? null,
      setting6: reference?.setting6 ?? null,
    });
  }

  return rates;
}

// ========================================
// 7. エントリポイント
// ========================================

export function calculateKokakuAnalysis(
  events: KokakuEvent[],
  currentGame: number
): KokakuAnalysis & { rows: KokakuCycleRow[] } {
  const rows = buildKokakuGrid(events, currentGame);
  const contexts = buildContexts(rows);

  const { excluded: excludedSettings, conflict: settingConflict } =
    excludedSettingsFromScreens(rows);
  const logLikelihoods = Array.from({ length: SETTING_COUNT }, (_, s) =>
    excludedSettings.includes(s + 1)
      ? -Infinity
      : settingLogLikelihood(contexts, s)
  );

  // CZ失敗で終わったサイクルの「次の行」だけが設定差のある観測になる
  const czFailCount = contexts.filter(
    ({ row, previousEnd }) =>
      previousEnd !== null &&
      previousEnd.at === null &&
      previousEnd.cz !== null &&
      !row.isReset &&
      hasObservation(row)
  ).length;

  return {
    rows,
    setting: fromLogLikelihoods(logLikelihoods),
    excludedSettings,
    settingConflict,
    observed: collectObservedRates(rows),
    czFailCount,
  };
}

/** 現在Gからの「次ゾーンまで」を、モード事後分布で重み付けした期待当選率つきで返す */
export interface KokakuZoneOutlook {
  game: number;
  /** そのゲーム数で殲滅ZONEに当選する確率（モード事後で重み付け） */
  rate: number;
  /** そのゲーム数がCZ天井になるモードの合計確率 */
  ceilingShare: number;
}

export function calculateZoneOutlook(
  distribution: Record<KokakuMode, number>,
  currentGame: number
): KokakuZoneOutlook[] {
  const games = KOKAKU_GRID_GAMES.filter((g) => g > currentGame && !isTachikomaGame(g));
  return games.flatMap((game) => {
    let rate = 0;
    let ceilingShare = 0;
    let reachable = 0;
    KOKAKU_MODES.forEach((mode) => {
      const weight = distribution[mode];
      if (weight <= 0) return;
      const ceiling = KOKAKU_CZ_CEILING[mode];
      if (game > ceiling) return;
      reachable += weight;
      if (game === ceiling) {
        rate += weight;
        ceilingShare += weight;
        return;
      }
      const value = KOKAKU_ZONE_RATE[mode][game];
      if (value) rate += weight * value;
    });
    // 到達しえないゲーム数と、どのモードでも抽選が無いゲーム数（300G/500G）は出さない。
    // 「0%」を並べても次ゾーンの見通しにならないため。
    if (reachable <= 0 || rate <= 0) return [];
    return [{ game, rate: rate / reachable, ceilingShare: ceilingShare / reachable }];
  });
}
