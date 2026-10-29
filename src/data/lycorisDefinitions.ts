import type {
  LycorisAtRoute,
  LycorisCzTrigger,
  LycorisCzZoneGame,
  LycorisEndScreen,
  LycorisEpisode,
  LycorisEvent,
  LycorisHintStrength,
  LycorisKoukakuGame,
  LycorisKoukakuResult,
  LycorisPrologue,
  LycorisRush,
  LycorisRushOutcome,
  LycorisShortCeiling,
  LycorisTrophy,
} from '../types/lycoris';

// ========================================
// スマスロ リコリス・リコイル 定義データ
// 出典: docs/lycoris-recoil-spec.md（数値表は一撃・なな徹の解析ページ）
//
// このファイルと docs/lycoris-recoil-spec.md は必ず対で更新すること。
// 配列の添字は設定1〜6（0始まり）。
// ========================================

/** サブ液晶のG数として受け付ける上限。AT間天井850G+αを収める */
export const LYCORIS_MAX_GAME = 999;

// ========================================
// 事後確率に入れる軸
// ========================================

/**
 * 共通ベル（通常時・右下がり）の分母。
 * 設定2・3は一撃が「データなし」だが、なな徹・ちょんぼりすた・スロベースの3サイトが
 * 「設定1〜3は同値」と明記しているのでそれを採る。
 */
export const LYCORIS_BELL_DENOM = [95.8, 95.8, 95.8, 87.6, 83.2, 79.1];

/** ラッシュ直撃（CZ非経由・天井以外）の分母 */
export const LYCORIS_DIRECT_DENOM = [22429.5, 19006.5, 15454.1, 10809.3, 7809.6, 6263.7];

/**
 * 弱リコリス目成立時の変換高確移行率。
 * **設定2はサイト間で食い違う**（なな徹 38.3% / ちょんぼりすた 39.1% / 一撃 記載なし）。
 * なな徹の2ページが一致しているので 38.3% を採る。設定1〜3の分離にはほぼ効かない。
 */
export const LYCORIS_WEAK_KOUKAKU_RATE = [0.383, 0.383, 0.391, 0.41, 0.43, 0.449];

/** 150G到達時の変換高確移行率。設定1〜3は同値 */
export const LYCORIS_150_KOUKAKU_RATE = [0.5, 0.5, 0.5, 0.547, 0.586, 0.625];

/**
 * 変換高確に移行したとき帯が出る割合。
 * 出典は「高確移行時の約10%は煽りが失敗し帯が表示されない」（一撃）。
 * 打ち手が観測できるのは帯なので、観測される移行率は 0.9 × 公表値になる。
 * これを掛けないと設定6の実測が設定4〜5に見える。
 */
export const LYCORIS_BAND_VISIBILITY = 0.9;

/**
 * ラッシュ50終了時の天井短縮の振り分け。合算しなかった残りが「短縮なし（850G）」。
 * 750Gは全設定共通 7.4%。設定2の250G/600G/750Gは一撃が「データなし」で、なな徹の値を採る。
 */
export const LYCORIS_SHORT_CEILING_RATE: Record<LycorisShortCeiling, number[]> = {
  250: [0.008, 0.008, 0.012, 0.02, 0.027, 0.035],
  400: [0.023, 0.027, 0.031, 0.051, 0.07, 0.078],
  600: [0.012, 0.012, 0.016, 0.023, 0.031, 0.047],
  750: [0.074, 0.074, 0.074, 0.074, 0.074, 0.074],
};

/** 公表されている短縮合算。内訳の和と丸め誤差の範囲で一致することをテストで確かめる */
export const LYCORIS_SHORT_CEILING_TOTAL = [0.117, 0.121, 0.133, 0.168, 0.203, 0.234];

export const LYCORIS_SHORT_CEILINGS: readonly LycorisShortCeiling[] = [250, 400, 600, 750];

/**
 * 短縮天井の「+α」（前兆とCZ消化）の余裕G数。**公表値ではなく保守側に取った値**。
 *
 * CZ成功・直撃でATに入った行は「そのG数より手前の短縮天井は無かった」として使うが、
 * 短縮250Gの前兆を経て262Gに入ったCZは短縮250Gそのものだった可能性がある。
 * CZ間天井600G+αも短縮600Gと位置が重なる。そこで c + 余裕 < 打ち切りG のときだけ c を否定する。
 * 大きくするほど情報を捨てるが、高設定側の短縮を誤って否定する（低設定に偏る）ことはなくなる。
 */
export const LYCORIS_SHORT_CEILING_MARGIN = 50;

// ========================================
// 参考値（事後確率には入れない）
// ========================================

export const LYCORIS_AT_DENOM = [328.8, 323.4, 312.1, 288.3, 271.6, 256.7];
export const LYCORIS_CZ_DENOM = [198.7, 196.9, 191.3, 183.3, 175.9, 169.4];

// ========================================
// 規定ゲーム数
// ========================================

export const LYCORIS_KOUKAKU_GAMES: readonly LycorisKoukakuGame[] = [50, 150, 450];
export const LYCORIS_CZ_ZONE_GAMES: readonly LycorisCzZoneGame[] = [0, 100, 250, 400, 600, 750];

/**
 * グリッドの固定列（攻殻機動隊と同じく、横＝規定ゲーム数）。G数順に並べる。
 * CZ列は通過して空なら「CZなし」、高確列は押した結果だけを使う。
 */
export const LYCORIS_GRID_COLUMNS: readonly ({ game: LycorisCzZoneGame; kind: 'cz' } | { game: LycorisKoukakuGame; kind: 'koukaku' })[] = [
  { game: 0, kind: 'cz' },
  { game: 50, kind: 'koukaku' },
  { game: 100, kind: 'cz' },
  { game: 150, kind: 'koukaku' },
  { game: 250, kind: 'cz' },
  { game: 400, kind: 'cz' },
  { game: 450, kind: 'koukaku' },
  { game: 600, kind: 'cz' },
  { game: 750, kind: 'cz' },
];

/** 規定ゲーム数ごとの変換高確移行率（表示用）。150Gだけ設定差がある */
export const LYCORIS_KOUKAKU_GAME_NOTE: Record<LycorisKoukakuGame, string> = {
  50: '50.0%（設定差なし）',
  150: '50.0〜62.5%（設定差あり）',
  450: '50%（設定差なし）',
};

export const LYCORIS_CZ_ZONE_NOTE: Record<LycorisCzZoneGame, string> = {
  0: '即前兆（引き戻し）',
  100: '期待度◎',
  250: '期待度◎',
  400: '10.9〜25.4%',
  600: '期待度◎',
  750: '期待度○',
};

// ========================================
// ラベル
// ========================================

export const LYCORIS_KOUKAKU_LABEL: Record<LycorisKoukakuResult, string> = {
  moved: '帯あり（移行）',
  stay: '帯なし',
  unknown: '判別不能',
};

/** 一覧に出す短い表記。結果待ち（null）は呼び出し側で別に出す */
export const LYCORIS_KOUKAKU_SHORT: Record<LycorisKoukakuResult, string> = {
  moved: '高確○',
  stay: '高確×',
  unknown: '高確?',
};

export const LYCORIS_CZ_TRIGGER_LABEL: Record<LycorisCzTrigger, string> = {
  zone: '規定G数',
  convert: '小役変換',
  stamp: 'スタンプ',
  'cz-ceiling': 'CZ間天井',
  other: 'その他・不明',
};

export const LYCORIS_AT_ROUTE_LABEL: Record<LycorisAtRoute, string> = {
  cz: 'CZ成功',
  direct: '直撃',
  'at-ceiling': 'AT間天井（850G）',
  'short-ceiling': '短縮天井',
};

export const LYCORIS_RUSH_LABEL: Record<LycorisRush, string> = {
  chisato: '千束ラッシュ',
  takina: 'たきなラッシュ',
};

export const LYCORIS_OUTCOME_LABEL: Record<LycorisRushOutcome, string> = {
  'rush20-end': 'ラッシュ20で駆け抜け',
  'rush50-end': 'ラッシュ50終了',
  'upper-cz-fail': '上位CZ失敗',
  'rush-w-end': 'ラッシュW終了',
};

/**
 * 直前のATの終わり方から決まる、次のサイクルの天井。
 * ラッシュWの後に天井短縮が抽選されるかは公表されていないので通常の天井として出す。
 */
export const LYCORIS_CEILING_AFTER: Record<LycorisRushOutcome, string> = {
  'rush20-end': 'AT間600G / CZ間250G（短縮濃厚）',
  'rush50-end': 'AT間850G / CZ間600G（短縮の可能性 11.7〜23.4%）',
  'upper-cz-fail': 'AT間250G（成功濃厚CZ）',
  'rush-w-end': 'AT間850G / CZ間600G',
};

// ========================================
// 示唆カタログ
// ========================================

export interface LycorisHintInfo<Id extends string> {
  id: Id;
  label: string;
  /** 映像で判別するもの（プロローグはタイトルが表示されない） */
  scene?: string;
  hint: string;
  strength: LycorisHintStrength;
  /** 「濃厚」のときに許可する設定。null は制約なし（示唆のみ） */
  allowedSettings: number[] | null;
}

/** 初当り時のプロローグ。**タイトルは表示されず映像で判定する** */
export const LYCORIS_PROLOGUES: LycorisHintInfo<LycorisPrologue>[] = [
  { id: 'ep1', label: 'EP1 Time will tell ①', scene: '真島が車内で通話', hint: '基本パターン', strength: 'default', allowedSettings: null },
  { id: 'ep2', label: 'EP2 The more the merrier', scene: 'ロボ太とウォールナットが電脳空間で会話', hint: '基本パターン', strength: 'default', allowedSettings: null },
  { id: 'ep3', label: 'EP3 Repay evil with evil', scene: '真島がモニターをハッキングして演説', hint: '高設定示唆（弱）', strength: 'weak', allowedSettings: null },
  { id: 'ep4', label: 'EP4 Time will tell ②', scene: '真島がビルの屋上で通話', hint: '高設定示唆（強）', strength: 'strong', allowedSettings: null },
];

/**
 * AT中のエピソードボーナス。EP3 は**同一ラッシュ内の1回目の選択時だけ**示唆が有効。
 * ラッシュとラッシュWで一覧が違う。
 */
export const LYCORIS_EPISODES: (LycorisHintInfo<LycorisEpisode> & { rush: 'rush' | 'w'; firstOnly: boolean })[] = [
  { id: 'rush-ep1', rush: 'rush', label: 'Easy does it', hint: '基本パターン', strength: 'default', allowedSettings: null, firstOnly: false },
  { id: 'rush-ep2', rush: 'rush', label: 'Nothing seek, nothing find', hint: '基本パターン', strength: 'default', allowedSettings: null, firstOnly: false },
  { id: 'rush-ep3', rush: 'rush', label: 'Opposites attract', hint: '高設定示唆（弱）', strength: 'weak', allowedSettings: null, firstOnly: true },
  { id: 'rush-ep4', rush: 'rush', label: 'Recoil of Lycoris -side 千束＆真島-', hint: '高設定示唆（強）', strength: 'strong', allowedSettings: null, firstOnly: false },
  { id: 'w-ep1', rush: 'w', label: 'More haste, less speed', hint: '基本パターン', strength: 'default', allowedSettings: null, firstOnly: false },
  { id: 'w-ep2', rush: 'w', label: 'So far, so good', hint: '基本パターン', strength: 'default', allowedSettings: null, firstOnly: false },
  { id: 'w-ep3', rush: 'w', label: 'Recoil of Lycoris -side リコリコ-', hint: '高設定示唆（弱）', strength: 'weak', allowedSettings: null, firstOnly: true },
  { id: 'w-ep4', rush: 'w', label: 'Recoil of Lycoris -side ハワイ-', hint: '高設定示唆（強）', strength: 'strong', allowedSettings: null, firstOnly: false },
];

const SETTING_4_UP = [4, 5, 6];

/**
 * ラッシュ終了画面。私服は**どのラッシュが終わったか**で意味が変わるので、
 * 制約は resolveLycorisEndScreen で決める（ここの allowedSettings は私服以外の分）。
 */
export const LYCORIS_END_SCREENS: LycorisHintInfo<LycorisEndScreen>[] = [
  { id: 'takinaUniform', label: 'たきな（リコリス制服）', hint: 'たきなラッシュ終了時の基本', strength: 'default', allowedSettings: null },
  { id: 'chisatoUniform', label: '千束（リコリス制服）', hint: '千束ラッシュ終了時の基本', strength: 'default', allowedSettings: null },
  { id: 'takinaCasual', label: 'たきな（私服）', hint: '高設定示唆（弱）／千束ラッシュ終了時なら設定4以上濃厚', strength: 'weak', allowedSettings: null },
  { id: 'chisatoCasual', label: '千束（私服）', hint: '高設定示唆（弱）／たきなラッシュ終了時なら設定4以上濃厚', strength: 'weak', allowedSettings: null },
  { id: 'dressCode', label: '千束＆たきな（ドレスコード）', hint: '高設定示唆（強）', strength: 'strong', allowedSettings: null },
  { id: 'oshiage', label: '押上の風景', hint: '設定2以上濃厚', strength: 'constraint', allowedSettings: [2, 3, 4, 5, 6] },
  { id: 'robota', label: 'ロボ太', hint: '設定4以上濃厚', strength: 'constraint', allowedSettings: SETTING_4_UP },
  { id: 'hawaii', label: 'ハワイ', hint: '設定6濃厚', strength: 'constraint', allowedSettings: [6] },
];

/** サミートロフィー。AT・上位AT終了画面で出現する。すべて「濃厚」 */
export const LYCORIS_TROPHIES: LycorisHintInfo<LycorisTrophy>[] = [
  { id: 'bronze', label: '銅', hint: '設定2以上濃厚', strength: 'constraint', allowedSettings: [2, 3, 4, 5, 6] },
  { id: 'silver', label: '銀', hint: '設定3以上濃厚', strength: 'constraint', allowedSettings: [3, 4, 5, 6] },
  { id: 'gold', label: '金', hint: '設定4以上濃厚', strength: 'constraint', allowedSettings: SETTING_4_UP },
  { id: 'kirin', label: 'キリン柄', hint: '設定5以上濃厚', strength: 'constraint', allowedSettings: [5, 6] },
  { id: 'rainbow', label: '虹', hint: '設定6濃厚', strength: 'constraint', allowedSettings: [6] },
];

export const LYCORIS_TROPHY_COLOR: Record<LycorisTrophy, string> = {
  bronze: '#c77d3a',
  silver: '#c7c7cc',
  gold: '#ffd60a',
  kirin: 'repeating-linear-gradient(45deg,#ffd60a 0 6px,#8a5a00 6px 10px)',
  rainbow: 'linear-gradient(135deg,#ff453a,#ffd60a,#30d158,#0a84ff,#bf5af2)',
};

export function findLycorisPrologue(id: LycorisPrologue) {
  return LYCORIS_PROLOGUES.find((p) => p.id === id);
}

export function findLycorisEpisode(id: LycorisEpisode) {
  return LYCORIS_EPISODES.find((e) => e.id === id);
}

export function findLycorisEndScreen(id: LycorisEndScreen) {
  return LYCORIS_END_SCREENS.find((s) => s.id === id);
}

export function findLycorisTrophy(id: LycorisTrophy) {
  return LYCORIS_TROPHIES.find((t) => t.id === id);
}

/** 解決済みの終了画面の示唆。私服はラッシュ種別で行を分ける */
export interface LycorisResolvedHint {
  key: string;
  label: string;
  hint: string;
  strength: LycorisHintStrength;
  allowedSettings: number[] | null;
}

/** 私服が「設定4以上濃厚」になる組み合わせ（キャラと終わったラッシュが逆） */
const CASUAL_MISMATCH: Partial<Record<LycorisEndScreen, LycorisRush>> = {
  takinaCasual: 'chisato',
  chisatoCasual: 'takina',
};

/** 私服の解決結果の種類。集計の行のキーと並び順に使う */
export const LYCORIS_CASUAL_VARIANTS = ['unknown', 'same', 'w', 'mismatch'] as const;

/** 私服の画面で、終わり方を踏まえたら弱示唆／濃厚／判定不能のどれか（私服以外は null） */
export function lycorisCasualVariant(
  screen: LycorisEndScreen,
  rush: LycorisRush | null,
  outcome: LycorisRushOutcome | null
): (typeof LYCORIS_CASUAL_VARIANTS)[number] | null {
  const mismatchRush = CASUAL_MISMATCH[screen];
  if (mismatchRush === undefined) return null;
  // ラッシュW終了はラッシュ種別によらず弱示唆。種別が未入力でも判定できる
  if (outcome === 'rush-w-end') return 'w';
  if (rush === null || outcome === null) return 'unknown';
  return rush === mismatchRush ? 'mismatch' : 'same';
}

/**
 * 終了画面の示唆を、そのATのラッシュ種別と終わり方から決める。
 *
 * 私服が設定4以上濃厚になるのは「キャラと終わったラッシュが逆」のときだけ。
 * ラッシュWの終了時は私服でも弱示唆に留まる（一撃）。
 * ラッシュ種別か終わり方が未入力なら判定できないので、弱示唆として扱い制約にしない。
 * 集計で別の行になるよう、キーは解決結果ごとに分ける。
 */
export function resolveLycorisEndScreen(
  screen: LycorisEndScreen,
  rush: LycorisRush | null,
  outcome: LycorisRushOutcome | null
): LycorisResolvedHint | null {
  const info = findLycorisEndScreen(screen);
  if (!info) return null;
  const variant = lycorisCasualVariant(screen, rush, outcome);
  switch (variant) {
    case null:
      return {
        key: screen,
        label: info.label,
        hint: info.hint,
        strength: info.strength,
        allowedSettings: info.allowedSettings,
      };
    case 'unknown':
      return {
        key: `${screen}:unknown`,
        label: `${info.label}（ラッシュ種別・終わり方が未入力）`,
        hint: 'ラッシュ種別と終わり方を入れると判定できます',
        strength: 'weak',
        allowedSettings: null,
      };
    case 'w':
      return {
        key: `${screen}:w`,
        label: `${info.label}（ラッシュW終了）`,
        hint: '高設定示唆（弱）',
        strength: 'weak',
        allowedSettings: null,
      };
    case 'mismatch':
    case 'same':
      return {
        key: `${screen}:${variant}`,
        label: `${info.label}（${rush ? LYCORIS_RUSH_LABEL[rush] : ''}終了）`,
        hint: variant === 'mismatch' ? '設定4以上濃厚' : '高設定示唆（弱）',
        strength: variant === 'mismatch' ? 'constraint' : 'weak',
        allowedSettings: variant === 'mismatch' ? SETTING_4_UP : null,
      };
  }
}

// ========================================
// 保存データの読み込み
// ========================================

/** 非負の整数に寄せる。外から来た壊れた値は 0 にする */
export function normalizeLycorisCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * サブ液晶のG数として 0〜上限の整数に寄せる。
 * 上限を超えた値をそのまま通すと、入力フォームの既定Gが上限超えになり、
 * 保存時の検証で黙って弾かれて「記録を押しても何も起きない」状態になる。
 */
export function normalizeLycorisGame(value: unknown): number {
  return Math.min(LYCORIS_MAX_GAME, normalizeLycorisCount(value));
}

function isGame(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= LYCORIS_MAX_GAME;
}

function oneOf<T>(list: readonly T[], value: unknown): value is T {
  return list.includes(value as T);
}

function orNull<T>(list: readonly T[], value: unknown): T | null {
  return oneOf(list, value) ? value : null;
}

const KOUKAKU_RESULTS: readonly LycorisKoukakuResult[] = ['moved', 'stay', 'unknown'];
const CZ_TRIGGERS: readonly LycorisCzTrigger[] = ['zone', 'convert', 'stamp', 'cz-ceiling', 'other'];
const AT_ROUTES: readonly LycorisAtRoute[] = ['cz', 'direct', 'at-ceiling', 'short-ceiling'];
const RUSHES: readonly LycorisRush[] = ['chisato', 'takina'];
const OUTCOMES: readonly LycorisRushOutcome[] = ['rush20-end', 'rush50-end', 'upper-cz-fail', 'rush-w-end'];
const PROLOGUE_IDS = LYCORIS_PROLOGUES.map((p) => p.id);
const EPISODE_IDS = LYCORIS_EPISODES.map((e) => e.id);
const END_SCREEN_IDS = LYCORIS_END_SCREENS.map((s) => s.id);
const TROPHY_IDS = LYCORIS_TROPHIES.map((t) => t.id);

/**
 * 古いローカル／クラウド記録を安全に読み込む。
 *
 * 形の合わないイベントは落とす。ただし AT は落とすとサイクルが結合してしまうので、
 * 必須（game・route）さえ揃っていれば、任意の項目の壊れた値を null に寄せて残す。
 */
export function normalizeLycorisEvents(value: unknown): LycorisEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): LycorisEvent[] => {
    if (!raw || typeof raw !== 'object') return [];
    // 外部（localStorage / クラウド）から来た未検証の値
    const e = raw as Record<string, unknown>;
    if (typeof e.id !== 'string' || !Number.isFinite(e.timestamp) || !isGame(e.game)) return [];
    const base = { id: e.id, timestamp: e.timestamp as number, game: e.game };
    switch (e.type) {
      case 'koukaku-zone':
        if (!oneOf(LYCORIS_KOUKAKU_GAMES, e.game) || !oneOf(KOUKAKU_RESULTS, e.result)) return [];
        return [{ ...base, type: 'koukaku-zone', game: e.game, result: e.result }];
      case 'cz':
        if (!oneOf(CZ_TRIGGERS, e.trigger)) return [];
        // 規定G数契機なら、G数は規定ゲーム数のどれかでなければならない
        if (e.trigger === 'zone' && !oneOf(LYCORIS_CZ_ZONE_GAMES, e.game)) return [];
        return [{ ...base, type: 'cz', trigger: e.trigger }];
      case 'short-notice':
        if (!oneOf(LYCORIS_SHORT_CEILINGS, e.ceiling)) return [];
        return [{ ...base, type: 'short-notice', ceiling: e.ceiling }];
      case 'at':
        if (!oneOf(AT_ROUTES, e.route)) return [];
        return [{
          ...base,
          type: 'at',
          route: e.route,
          shortCeiling: orNull(LYCORIS_SHORT_CEILINGS, e.shortCeiling),
          prologue: orNull(PROLOGUE_IDS, e.prologue),
          rush: orNull(RUSHES, e.rush),
          outcome: orNull(OUTCOMES, e.outcome),
          episodes: Array.isArray(e.episodes) ? e.episodes.filter((id): id is LycorisEpisode => oneOf(EPISODE_IDS, id)) : [],
          endScreen: orNull(END_SCREEN_IDS, e.endScreen),
          trophy: orNull(TROPHY_IDS, e.trophy),
        }];
      default:
        return [];
    }
  });
}

/**
 * 保存済みの台（localStorage）を読み込むときの補正。STORE_VERSION の移行から呼ぶ。
 * 機種固有の項目だけを直し、共通項目（id・name 等）はそのまま残す。
 */
export function normalizeLycorisMachineFields(machine: Record<string, unknown>): Record<string, unknown> {
  return {
    ...machine,
    bell: normalizeLycorisCount(machine.bell),
    weakLycoris: normalizeLycorisCount(machine.weakLycoris),
    weakLycorisKoukaku: normalizeLycorisCount(machine.weakLycorisKoukaku),
    startGame: normalizeLycorisGame(machine.startGame),
    currentGame: normalizeLycorisGame(machine.currentGame),
    events: normalizeLycorisEvents(machine.events),
  };
}
