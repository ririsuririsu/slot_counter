// ========================================
// スマスロ リコリス・リコイル 設定推測（純粋関数）
//
// この機種に内部モードの公表値は無い。設定1〜6の表が揃った要素を
// 互いに独立な軸として扱い、対数尤度を足して最後に1回だけ正規化する。
//
//   共通ベル        … 二項（通常G数あたり）
//   変換高確移行    … 二項（弱リコリス目＝独立した2カウンター / 150G＝グリッド）。帯が出る割合 0.9 を掛ける
//   直撃            … 二項（通常G数あたり）
//   天井短縮        … ラッシュ50終了後のサイクルごとのカテゴリ分布（右側打ち切りあり）
//   終了画面・トロフィー … 「濃厚」だけをハード制約にする
//
// プロローグ・エピソードボーナスと、終了画面の「示唆」は振り分けが非公開なので
// 集計表示だけにする（数値を捏造しない）。
//
// 詳細仕様は docs/lycoris-recoil-spec.md を参照。
// ========================================

import type {
  LycorisAnalysis,
  LycorisAxis,
  LycorisAxisId,
  LycorisCycle,
  LycorisEvent,
  LycorisHintTally,
  LycorisKoukakuResult,
  LycorisReferenceRate,
  LycorisSettingAnalysis,
  LycorisShortCeiling,
  LycorisStoredAtEvent,
} from '../types/lycoris';
import {
  LYCORIS_150_KOUKAKU_RATE,
  LYCORIS_AT_DENOM,
  LYCORIS_BAND_VISIBILITY,
  LYCORIS_BELL_DENOM,
  LYCORIS_CASUAL_VARIANTS,
  LYCORIS_CZ_DENOM,
  LYCORIS_DIRECT_DENOM,
  LYCORIS_EPISODES,
  LYCORIS_END_SCREENS,
  LYCORIS_GRID_COLUMNS,
  LYCORIS_PROLOGUES,
  LYCORIS_SHORT_CEILING_MARGIN,
  LYCORIS_SHORT_CEILING_RATE,
  LYCORIS_SHORT_CEILINGS,
  LYCORIS_TROPHIES,
  LYCORIS_WEAK_KOUKAKU_RATE,
  findLycorisEpisode,
  findLycorisPrologue,
  findLycorisTrophy,
  resolveLycorisEndScreen,
} from '../data/lycorisDefinitions';

const SETTING_KEYS = [
  'setting1',
  'setting2',
  'setting3',
  'setting4',
  'setting5',
  'setting6',
] as const;

const SETTING_COUNT = SETTING_KEYS.length;
const ALL_SETTINGS = [1, 2, 3, 4, 5, 6];

export function createEqualLycorisAnalysis(): LycorisSettingAnalysis {
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

function fromLogLikelihoods(logLikelihoods: number[]): LycorisSettingAnalysis {
  const finite = logLikelihoods.filter((l) => Number.isFinite(l));
  if (finite.length === 0) return createEqualLycorisAnalysis();

  const max = Math.max(...finite);
  const weights = logLikelihoods.map((l) => (Number.isFinite(l) ? Math.exp(l - max) : 0));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return createEqualLycorisAnalysis();

  const result = createEqualLycorisAnalysis();
  SETTING_KEYS.forEach((key, i) => {
    result[key] = (weights[i] / total) * 100;
  });
  return result;
}

const ZERO_LOG_LIKELIHOODS = (): number[] => new Array(SETTING_COUNT).fill(0);

/** 二項分布の対数尤度（組み合わせの定数項は設定によらないので省く） */
function binomialLogLikelihood(hit: number, total: number, p: number): number {
  return hit * Math.log(p) + (total - hit) * Math.log(1 - p);
}

// ========================================
// 1. サイクルの組み立て
// ========================================

function maxEntryGame(entries: { event: LycorisEvent }[]): number {
  return entries.reduce((max, { event }) => Math.max(max, event.game), 0);
}

type Entry = { event: LycorisEvent; eventIndex: number };

/** G数順に並べる。同じG数は記録順（後から過去の記録を足しても読める順にする） */
function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => a.event.game - b.event.game || a.eventIndex - b.eventIndex);
}

/**
 * 規定ゲーム数 game での高確抽選の記録。抽選は1サイクル1回なので、
 * 同じG数を二重に記録していたら最後に記録した方（訂正）を採る。
 */
function koukakuZoneEntry(entries: Entry[], game: number): { result: LycorisKoukakuResult; eventIndex: number } | null {
  let found: { result: LycorisKoukakuResult; eventIndex: number } | null = null;
  for (const { event, eventIndex } of entries) {
    if (event.type !== 'koukaku-zone' || event.game !== game) continue;
    if (!found || eventIndex > found.eventIndex) found = { result: event.result, eventIndex };
  }
  return found;
}

function isZoneCz(event: LycorisEvent): boolean {
  return event.type === 'cz' && event.trigger === 'zone';
}

/**
 * その列を「見ていない」扱いにするか。
 * - 到達Gより先
 * - 1行目で打ち始めGより手前（途中から座った台で、自分が見ていない枠）
 * - 0G列（AT終了直後の即前兆＝引き戻し）は、1行目には直前のATが無いので常に対象外。
 *   2行目以降も、まだ1Gも回していなければ未到達
 */
function isUnobserved(game: number, reachedGame: number, startGame: number, firstRow: boolean): boolean {
  if (game > reachedGame || game < startGame) return true;
  return game === 0 && (firstRow || reachedGame === 0);
}

/** 固定列のセルと、列に入らない記録（「他」列）に分ける */
function buildGrid(
  entries: Entry[],
  reachedGame: number,
  startGame: number,
  firstRow: boolean
): Pick<LycorisCycle, 'cells' | 'others'> {
  const cells = LYCORIS_GRID_COLUMNS.map((column) => {
    const unreached = isUnobserved(column.game, reachedGame, startGame, firstRow);
    if (column.kind === 'koukaku') {
      const found = koukakuZoneEntry(entries, column.game);
      return {
        game: column.game,
        kind: column.kind,
        czWon: false,
        koukaku: found?.result ?? null,
        eventIndex: found?.eventIndex ?? -1,
        unreached,
      };
    }
    const zoneCz = [...entries].reverse().find(({ event }) => isZoneCz(event) && event.game === column.game);
    return {
      game: column.game,
      kind: column.kind,
      czWon: zoneCz !== undefined,
      koukaku: null,
      eventIndex: zoneCz?.eventIndex ?? -1,
      unreached,
    };
  });
  const others = entries.filter(({ event }) => event.type !== 'koukaku-zone' && !isZoneCz(event));
  return { cells, others };
}

/**
 * イベント列をAT間サイクルに切り分ける。AT当選でサイクルが締まる。
 *
 * 到達Gは「締めた行はAT当選G、進行中の行は現在G（セルの「ここまで回した」で決まる）」を基本にし、
 * 記録済みのG数を下回らないよう引き上げる。グリッドの通過・未到達の判定に使う。
 * 1行目は打ち始めGより手前の列を「見ていない」扱いにする。
 * 共通ベル・直撃の分母はここからは導かない（手入力のトータルG数を使う）。
 */
export function buildLycorisCycles(
  events: LycorisEvent[],
  startGame: number,
  currentGame: number
): LycorisCycle[] {
  const cycles: LycorisCycle[] = [];
  let entries: Entry[] = [];
  let previousAt: LycorisStoredAtEvent | null = null;
  let rowStart = startGame;

  events.forEach((event, eventIndex) => {
    if (event.type !== 'at') {
      entries.push({ event, eventIndex });
      return;
    }
    const reachedGame = Math.max(event.game, maxEntryGame(entries));
    const sorted = sortEntries(entries);
    cycles.push({
      index: cycles.length + 1,
      startGame: rowStart,
      entries: sorted,
      ...buildGrid(sorted, reachedGame, rowStart, previousAt === null),
      at: event,
      atEventIndex: eventIndex,
      previousAt,
      reachedGame,
      insertIndex: eventIndex,
      active: false,
    });
    previousAt = event;
    entries = [];
    rowStart = 0;
  });

  const reachedGame = Math.max(currentGame, maxEntryGame(entries), rowStart);
  const sorted = sortEntries(entries);
  cycles.push({
    index: cycles.length + 1,
    startGame: rowStart,
    entries: sorted,
    ...buildGrid(sorted, reachedGame, rowStart, previousAt === null),
    at: null,
    atEventIndex: -1,
    previousAt,
    reachedGame,
    insertIndex: events.length,
    active: true,
  });

  return cycles;
}

// ========================================
// 2. 各軸
// ========================================

function makeAxis(
  id: LycorisAxisId,
  label: string,
  unit: LycorisAxis['unit'],
  hit: number,
  total: number,
  logLikelihoods: number[] | null,
  warning: string | null = null
): LycorisAxis {
  const usable = logLikelihoods !== null;
  const values = logLikelihoods ?? ZERO_LOG_LIKELIHOODS();
  return {
    id,
    label,
    hit,
    total,
    unit,
    logLikelihoods: values,
    posterior: fromLogLikelihoods(values),
    usable,
    warning,
  };
}

/** トータルG数あたりの二項の軸（ベル・直撃） */
function perGameAxis(
  id: LycorisAxisId,
  label: string,
  hit: number,
  games: number,
  denominators: number[]
): LycorisAxis {
  if (games <= 0) {
    return makeAxis(id, label, 'games', hit, games, null,
      hit > 0 ? 'トータルG数を入れると計算できます' : null);
  }
  if (hit > games) {
    return makeAxis(id, label, 'games', hit, games, null,
      '回数がトータルG数を超えています。トータルG数を見直してください');
  }
  return makeAxis(id, label, 'games', hit, games,
    denominators.map((d) => binomialLogLikelihood(hit, games, 1 / d)));
}

/**
 * 変換高確移行の軸。観測できるのは帯なので、移行率に帯が出る割合を掛けた値で尤度を取る。
 * 判別不能（すでに高確中・前兆中）の記録は分母に入れない。
 */
function koukakuAxis(
  id: LycorisAxisId,
  label: string,
  moved: number,
  total: number,
  rates: number[],
  warning: string | null
): LycorisAxis {
  if (total <= 0) return makeAxis(id, label, 'events', moved, total, null, warning);
  return makeAxis(id, label, 'events', moved, total,
    rates.map((r) => binomialLogLikelihood(moved, total, LYCORIS_BAND_VISIBILITY * r)), warning);
}

/**
 * 弱リコリス目の変換高確移行。2つの独立したカウンター（弱リコ目＝分母、→高確＝分子）から取る。
 * 帯は煽りのあとに出るので、引いた時点と帯が出た時点で別々に押す運用（モンハンライズ軸1と同じ）。
 * 分子が分母を超えるのは数え間違いなので、推定に使わず警告する。
 */
function weakKoukakuAxis(weak: number, moved: number): LycorisAxis {
  const label = '変換高確移行（弱リコリス目）';
  if (moved > weak) {
    return makeAxis('koukakuWeak', label, 'events', moved, weak, null,
      '「→高確」が「弱リコ目」の回数を超えています。数え間違いがないか見直してください');
  }
  return koukakuAxis('koukakuWeak', label, moved, weak, LYCORIS_WEAK_KOUKAKU_RATE, null);
}

function koukakuResultAt(cycle: LycorisCycle, game: number): LycorisKoukakuResult | null {
  return cycle.cells.find((c) => c.kind === 'koukaku' && c.game === game)?.koukaku ?? null;
}

/**
 * 150G の変換高確移行。**1行目も使う**（ユーザー指定 2026-10-30）。
 * 朝一は表示G数と内部G数がずれうる（設定変更でランダム加算・据え置きなら前日の続き）が、
 * 打ち手はG数の見当を付けられるので、記録された150Gの結果をそのまま信用する。
 * 1行目の打ち始めGより手前の150Gは見ていない枠なので、グリッドがそもそも記録させない。
 */
function koukaku150Axis(cycles: LycorisCycle[]): LycorisAxis {
  let moved = 0;
  let total = 0;
  for (const cycle of cycles) {
    const result = koukakuResultAt(cycle, 150);
    if (result === null || result === 'unknown') continue;
    total++;
    if (result === 'moved') moved++;
  }
  return koukakuAxis('koukaku150', '変換高確移行（150G）', moved, total, LYCORIS_150_KOUKAKU_RATE, null);
}

/** そのサイクルで最後にCZへ入ったG（契機は問わない。小役変換からのCZも含む） */
function lastCzGame(cycle: LycorisCycle): number | null {
  let last: number | null = null;
  for (const { event } of cycle.entries) {
    if (event.type === 'cz') last = last === null ? event.game : Math.max(last, event.game);
  }
  return last;
}

/** 天井短縮の1サイクル分の観測 */
export type LycorisShortObservation =
  | { kind: 'exact'; ceiling: LycorisShortCeiling | null }
  | { kind: 'censored'; below: number };

/**
 * ラッシュ50終了後のサイクルから、天井短縮について何が分かったかを返す。
 * 対象外（直前がラッシュ50終了でない・まだ何も分からない）なら null。
 *
 *   短縮告知を見た / 短縮天井で当たった → 短縮天井が確定（exact）
 *   AT間天井（850G）まで行った         → 短縮なしが確定（exact・null）
 *   CZ成功・直撃でATに入った           → それより手前の短縮天井は無かった（censored）
 *
 * CZ成功の打ち切り位置は**AT当選Gではなく、そのCZに入ったG**にする（記録が無ければAT当選G）。
 * さらに否定するのは c + 余裕（LYCORIS_SHORT_CEILING_MARGIN）< 打ち切りG の短縮天井だけ。
 * 短縮天井の「+α」の範囲で入ったCZは、その短縮天井の成功濃厚CZだった可能性があるため
 * （ゾーン・CZ間天井と短縮天井のG数は重なっている）。
 * 進行中の行は、告知が無ければ何も使わない（前兆中の可能性があり、どこまで否定できるか決められない）。
 */
export function shortCeilingObservation(cycle: LycorisCycle): LycorisShortObservation | null {
  if (cycle.previousAt?.outcome !== 'rush50-end') return null;

  const notice = cycle.entries.find((e) => e.event.type === 'short-notice')?.event;
  if (notice?.type === 'short-notice') return { kind: 'exact', ceiling: notice.ceiling };

  const at = cycle.at;
  if (!at) return null;
  switch (at.route) {
    case 'short-ceiling':
      return at.shortCeiling !== null ? { kind: 'exact', ceiling: at.shortCeiling } : null;
    case 'at-ceiling':
      return { kind: 'exact', ceiling: null };
    case 'cz':
      return { kind: 'censored', below: lastCzGame(cycle) ?? at.game };
    case 'direct':
      return { kind: 'censored', below: at.game };
  }
}

function shortProbability(ceiling: LycorisShortCeiling | null, settingIndex: number): number {
  if (ceiling !== null) return LYCORIS_SHORT_CEILING_RATE[ceiling][settingIndex];
  const shortened = LYCORIS_SHORT_CEILINGS.reduce(
    (sum, c) => sum + LYCORIS_SHORT_CEILING_RATE[c][settingIndex],
    0
  );
  return 1 - shortened;
}

function shortCeilingAxis(cycles: LycorisCycle[]): LycorisAxis {
  const logLikelihoods = ZERO_LOG_LIKELIHOODS();
  let observed = 0;
  let shortened = 0;

  for (const cycle of cycles) {
    const obs = shortCeilingObservation(cycle);
    if (!obs) continue;
    if (obs.kind === 'exact') {
      observed++;
      if (obs.ceiling !== null) shortened++;
      for (let s = 0; s < SETTING_COUNT; s++) {
        logLikelihoods[s] += Math.log(shortProbability(obs.ceiling, s));
      }
      continue;
    }
    const excluded = LYCORIS_SHORT_CEILINGS.filter((c) => c + LYCORIS_SHORT_CEILING_MARGIN < obs.below);
    // 250G+余裕より手前で当たったなら、どの短縮天井も否定できない＝情報なし
    if (excluded.length === 0) continue;
    observed++;
    for (let s = 0; s < SETTING_COUNT; s++) {
      const gone = excluded.reduce((sum, c) => sum + LYCORIS_SHORT_CEILING_RATE[c][s], 0);
      logLikelihoods[s] += Math.log(1 - gone);
    }
  }

  return makeAxis('shortCeiling', '天井短縮（ラッシュ50終了後）', 'cycles', shortened, observed,
    observed > 0 ? logLikelihoods : null);
}

// ========================================
// 3. 濃厚示唆による制約
// ========================================

/**
 * 終了画面・トロフィーの「濃厚」で許される設定の積集合。
 * 矛盾（積集合が空）した場合は制約を丸ごと捨てて conflict を立てる。
 * 押し間違いで全設定が0になり推定が無意味になるのを防ぐ。
 * なお現在のカタログは制約がすべて設定6を含むので、実データで矛盾は起きない（テストで固定）。
 */
export function excludedSettingsFromHints(cycles: LycorisCycle[]): {
  excluded: number[];
  conflict: boolean;
} {
  const constraints = cycles.flatMap((cycle) => {
    const at = cycle.at;
    if (!at) return [];
    return [
      at.endScreen ? resolveLycorisEndScreen(at.endScreen, at.rush, at.outcome)?.allowedSettings : null,
      at.trophy ? findLycorisTrophy(at.trophy)?.allowedSettings : null,
    ].filter((settings): settings is number[] => Array.isArray(settings));
  });
  if (constraints.length === 0) return { excluded: [], conflict: false };
  const allowed = constraints.reduce((acc, settings) => acc.filter((s) => settings.includes(s)), ALL_SETTINGS);
  if (allowed.length === 0) return { excluded: [], conflict: true };
  return { excluded: ALL_SETTINGS.filter((s) => !allowed.includes(s)), conflict: false };
}

// ========================================
// 4. 示唆の集計
// ========================================

/**
 * 示唆はすべて AT に付くので、AT で締めた行だけを見る。
 * サイクル番号は、その AT に当選したサイクル。
 */
export function summarizeLycorisHints(cycles: LycorisCycle[]): LycorisHintTally[] {
  // 関数内だけの集計用バッファ。呼ぶたびに配列を複製すると件数の二乗で遅くなるので、
  // ここでは push で積み、最後に新しいオブジェクトとして返す
  const tallies = new Map<string, { tally: Omit<LycorisHintTally, 'count' | 'cycles'>; cycles: number[] }>();
  const bump = (tally: Omit<LycorisHintTally, 'count' | 'cycles'>, cycle: number) => {
    const current = tallies.get(tally.key);
    if (current) current.cycles.push(cycle);
    else tallies.set(tally.key, { tally, cycles: [cycle] });
  };

  for (const cycle of cycles) {
    const at = cycle.at;
    if (!at) continue;
    if (at.prologue) {
      const info = findLycorisPrologue(at.prologue);
      if (info) bump({ category: 'prologue', key: `prologue:${info.id}`, label: info.label, hint: info.hint, strength: info.strength }, cycle.index);
    }
    // EP3 は同一ラッシュ（ラッシュ / ラッシュW それぞれ）の1回目の選択時だけ示唆が有効
    const seenRush = new Set<'rush' | 'w'>();
    for (const id of at.episodes) {
      const info = findLycorisEpisode(id);
      if (!info) continue;
      const first = !seenRush.has(info.rush);
      seenRush.add(info.rush);
      const valid = !info.firstOnly || first;
      bump({
        category: 'episode',
        key: valid ? `episode:${id}` : `episode:${id}:late`,
        label: valid ? info.label : `${info.label}（2回目以降）`,
        hint: valid ? info.hint : '2回目以降の選択は示唆なし',
        strength: valid ? info.strength : 'none',
      }, cycle.index);
    }
    if (at.endScreen) {
      const resolved = resolveLycorisEndScreen(at.endScreen, at.rush, at.outcome);
      if (resolved) bump({ category: 'endScreen', key: `end:${resolved.key}`, label: resolved.label, hint: resolved.hint, strength: resolved.strength }, cycle.index);
    }
    if (at.trophy) {
      const info = findLycorisTrophy(at.trophy);
      if (info) bump({ category: 'trophy', key: `trophy:${info.id}`, label: info.label, hint: info.hint, strength: info.strength }, cycle.index);
    }
  }

  // カタログ順（弱い示唆 → 強い示唆）に並べる。画面選択と同じ順で読める
  const order = [
    ...LYCORIS_PROLOGUES.map((p) => `prologue:${p.id}`),
    ...LYCORIS_EPISODES.flatMap((e) => [`episode:${e.id}`, `episode:${e.id}:late`]),
    ...LYCORIS_END_SCREENS.flatMap((s) => [`end:${s.id}`, ...LYCORIS_CASUAL_VARIANTS.map((v) => `end:${s.id}:${v}`)]),
    ...LYCORIS_TROPHIES.map((t) => `trophy:${t.id}`),
  ];
  return order.flatMap((key) => {
    const entry = tallies.get(key);
    return entry ? [{ ...entry.tally, count: entry.cycles.length, cycles: [...entry.cycles] }] : [];
  });
}

// ========================================
// 5. 参考値（事後確率には入れない）
// ========================================

function collectReference(cycles: LycorisCycle[], totalGames: number): LycorisReferenceRate[] {
  const atCount = cycles.filter((c) => c.at !== null).length;
  let czCount = 0;
  // 設定差の無い契機の帯出現率。帯が出る割合（0.9）の確認用
  let bandMoved = 0;
  let bandTotal = 0;

  const countBand = (result: LycorisKoukakuResult | null) => {
    if (result === null || result === 'unknown') return;
    bandTotal++;
    if (result === 'moved') bandMoved++;
  };

  for (const cycle of cycles) {
    czCount += cycle.entries.filter(({ event }) => event.type === 'cz').length;
    // 規定ゲーム数の抽選は1サイクル1回。二重記録は最後の1件だけ数える
    countBand(koukakuResultAt(cycle, 50));
    countBand(koukakuResultAt(cycle, 450));
  }

  return [
    {
      id: 'at',
      label: 'AT初当り',
      hit: atCount,
      total: totalGames,
      setting1: `1/${LYCORIS_AT_DENOM[0]}`,
      setting6: `1/${LYCORIS_AT_DENOM[5]}`,
    },
    {
      id: 'cz',
      label: 'CZ',
      hit: czCount,
      total: totalGames,
      setting1: `1/${LYCORIS_CZ_DENOM[0]}`,
      setting6: `1/${LYCORIS_CZ_DENOM[5]}`,
      note: '記録したCZ（変換・規定G・スタンプ等）のみ',
    },
    {
      id: 'band',
      label: '帯の出現率（設定差なしの契機）',
      hit: bandMoved,
      total: bandTotal,
      setting1: '約45%',
      setting6: '約45%',
      note: '50G・450G。移行率50%×帯が出る割合0.9',
    },
  ];
}

// ========================================
// 6. エントリポイント
// ========================================

export interface LycorisAnalysisInput {
  events: LycorisEvent[];
  bell: number;
  weakLycoris: number;
  weakLycorisKoukaku: number;
  /** 手入力のトータルG数（共通ベル・直撃の分母） */
  totalGames: number;
  startGame: number;
  currentGame: number;
}

export function calculateLycorisAnalysis(input: LycorisAnalysisInput): LycorisAnalysis {
  const cycles = buildLycorisCycles(input.events, input.startGame, input.currentGame);
  const { totalGames } = input;
  const directCount = cycles.filter((c) => c.at?.route === 'direct').length;

  const axes: LycorisAxis[] = [
    perGameAxis('bell', '共通ベル', input.bell, totalGames, LYCORIS_BELL_DENOM),
    weakKoukakuAxis(input.weakLycoris, input.weakLycorisKoukaku),
    koukaku150Axis(cycles),
    perGameAxis('direct', '直撃', directCount, totalGames, LYCORIS_DIRECT_DENOM),
    shortCeilingAxis(cycles),
  ];

  const { excluded: excludedSettings, conflict: settingConflict } = excludedSettingsFromHints(cycles);
  const logLikelihoods = Array.from({ length: SETTING_COUNT }, (_, s) =>
    excludedSettings.includes(s + 1)
      ? -Infinity
      : axes.reduce((sum, axis) => sum + (axis.usable ? axis.logLikelihoods[s] : 0), 0)
  );

  return {
    cycles,
    totalGames,
    setting: fromLogLikelihoods(logLikelihoods),
    axes,
    excludedSettings,
    settingConflict,
    hints: summarizeLycorisHints(cycles),
    reference: collectReference(cycles, totalGames),
  };
}
