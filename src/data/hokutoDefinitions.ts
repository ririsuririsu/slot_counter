import type { HokutoMode } from '../types/hokuto';

// ========================================
// 北斗の拳 転生の章2 — 確率テーブル・定数定義
// ========================================

// 設定番号（北斗は1-6全設定あり）
export const HOKUTO_SETTINGS = [1, 2, 3, 4, 5, 6] as const;

// --- AT初当たり確率 ---

export const AT_HIT_RATES: Record<number, number> = {
  1: 1 / 366.0,
  2: 1 / 357.0,
  3: 1 / 336.3,
  4: 1 / 298.7,
  5: 1 / 283.2,
  6: 1 / 273.1,
};

// --- 天破の刻 実質出現率 ---

export const TENHA_RATES: Record<number, number> = {
  1: 1 / 100.2,
  2: 1 / 99.4,
  3: 1 / 97.1,
  4: 1 / 91.4,
  5: 1 / 85.8,
  6: 1 / 81.3,
};

// --- 天破の刻 当選契機別当選率（内部状態別） ---
// 値は当選率（分母表記用）。0 = 非当選

export interface TenhaTriggerRateEntry {
  trigger: string;
  low: number;
  normal: number;
  high: number;
}

export const TENHA_TRIGGER_RATES: TenhaTriggerRateEntry[] = [
  { trigger: 'jaku-cherry', low: 1 / 512.0, normal: 1 / 256.0, high: 1 / 128.0 },
  { trigger: 'kyou-cherry', low: 1 / 128.0, normal: 1 / 64.0,  high: 1 / 32.0 },
  { trigger: 'suika',       low: 1 / 256.0, normal: 1 / 128.0, high: 1 / 64.0 },
  { trigger: 'chance-me',   low: 1 / 256.0, normal: 1 / 128.0, high: 1 / 64.0 },
  { trigger: 'shobu-zoroi', low: 1,         normal: 1,         high: 1 },
  { trigger: 'kakutei-cherry', low: 1,      normal: 1,         high: 1 },
];

// --- 天撃チャレンジ ハズレ時成功率（0G目・3G目） ---

export const TENGEKI_HAZURE_RATES: Record<number, number> = {
  1: 0.047,
  2: 0.047,
  3: 0.051,
  4: 0.055,
  5: 0.094,
  6: 0.164,
};

// --- 天撃チャレンジ トータル成功率 ---

export const TENGEKI_TOTAL_RATES: Record<number, number> = {
  1: 0.506,
  2: 0.506,
  3: 0.512,
  4: 0.515,
  5: 0.549,
  6: 0.608,
};

// --- 天撃チャレンジ ゲーム位置別・役別成功率 ---
// 0G(突入時): レア役100%, リプ/ベル18%, ハズレ=設定差
// 1-2G(バトル中): レア役100%, リプ/ベル18%, ハズレ=抽選なし(0%)
// 3G(最終): レア役100%, リプ/ベル100%, ハズレ=設定差
// 準備中レア役=成功濃厚(100%)

export const TENGEKI_RARE_YAKU = new Set([
  'jaku-cherry', 'kyou-cherry', 'suika', 'chance-me', 'shobu-zoroi', 'kakutei-cherry',
]);

// 非レア役のゲーム位置別成功率（レア役は全位置100%）
// [0G, 1G, 2G, 3G]
export const TENGEKI_NON_RARE_RATES: Record<string, readonly [number, number, number, number]> = {
  'hazure':  [NaN, 0, 0, NaN],   // NaN = 設定差（TENGEKI_HAZURE_RATES参照）
  'replay':  [0.18, 0.18, 0.18, 1.0],
  'bell':    [0.18, 0.18, 0.18, 1.0],
};

// --- 伝承モード終了時の内部状態移行率 ---

export const DENSHO_END_TRANSITION: Record<
  number,
  { low: number; normal: number; high: number }
> = {
  1: { low: 0.719, normal: 0.250, high: 0.031 },
  2: { low: 0.711, normal: 0.254, high: 0.035 },
  3: { low: 0.703, normal: 0.258, high: 0.039 },
  4: { low: 0.500, normal: 0.422, high: 0.078 },
  5: { low: 0.438, normal: 0.469, high: 0.094 },
  6: { low: 0.391, normal: 0.500, high: 0.109 },
};

// --- モード移行率（設定変更時） ---

export const MODE_TRANSITION_RESET: Record<
  number,
  { modeA: number; modeB: number; modeC: number; tengoku: number }
> = {
  1: { modeA: 0.493, modeB: 0.220, modeC: 0.201, tengoku: 0.086 },
  2: { modeA: 0.480, modeB: 0.225, modeC: 0.205, tengoku: 0.090 },
  3: { modeA: 0.450, modeB: 0.240, modeC: 0.215, tengoku: 0.095 },
  4: { modeA: 0.380, modeB: 0.270, modeC: 0.240, tengoku: 0.110 },
  5: { modeA: 0.340, modeB: 0.290, modeC: 0.250, tengoku: 0.120 },
  6: { modeA: 0.310, modeB: 0.300, modeC: 0.260, tengoku: 0.130 },
};

// --- モード別規定あべし上限 ---

export const MODE_CEILINGS: Record<HokutoMode, number> = {
  'mode-a': 1536,
  'mode-b': 896,
  'mode-c': 576,
  'tengoku': 128,
};

export const MODE_CEILINGS_RESET: Record<HokutoMode, number> = {
  'mode-a': 1280,
  'mode-b': 896,
  'mode-c': 576,
  'tengoku': 128,
};

// --- 規定あべし振り分け（設定1基準） ---
// 各モードごとの振り分け率（0-1）。P(ゾーン | モード) として使用。

export interface AbeshiDistEntry {
  min: number;
  max: number;
  modeA: number;
  modeB: number;
  modeC: number;
  tengoku: number;
}

export const ABESHI_DIST_RESET: AbeshiDistEntry[] = [
  { min: 1, max: 64, modeA: 0.0026, modeB: 0.0029, modeC: 0.0003, tengoku: 0.1250 },
  { min: 65, max: 128, modeA: 0.0180, modeB: 0.0202, modeC: 0.0022, tengoku: 0.8750 },
  { min: 129, max: 192, modeA: 0.0036, modeB: 0.0045, modeC: 0.0040, tengoku: 0 },
  { min: 193, max: 256, modeA: 0.2626, modeB: 0.3272, modeC: 0.2877, tengoku: 0 },
  { min: 257, max: 320, modeA: 0.0015, modeB: 0.0090, modeC: 0.0045, tengoku: 0 },
  { min: 321, max: 384, modeA: 0.0088, modeB: 0.0541, modeC: 0.0269, tengoku: 0 },
  { min: 385, max: 448, modeA: 0.0015, modeB: 0.0003, modeC: 0.0140, tengoku: 0 },
  { min: 449, max: 512, modeA: 0.0015, modeB: 0.0003, modeC: 0.0140, tengoku: 0 },
  { min: 513, max: 576, modeA: 0.0671, modeB: 0.0121, modeC: 0.6463, tengoku: 0 },
  { min: 577, max: 640, modeA: 0.0010, modeB: 0.0089, modeC: 0, tengoku: 0 },
  { min: 641, max: 704, modeA: 0.0010, modeB: 0.0089, modeC: 0, tengoku: 0 },
  { min: 705, max: 768, modeA: 0.0119, modeB: 0.1068, modeC: 0, tengoku: 0 },
  { min: 769, max: 832, modeA: 0.0010, modeB: 0.0089, modeC: 0, tengoku: 0 },
  { min: 833, max: 896, modeA: 0.0485, modeB: 0.4360, modeC: 0, tengoku: 0 },
  { min: 897, max: 960, modeA: 0.0089, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 961, max: 1024, modeA: 0.0534, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1025, max: 1088, modeA: 0.0089, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1089, max: 1152, modeA: 0.0534, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1153, max: 1216, modeA: 0.0089, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1217, max: 1280, modeA: 0.4362, modeB: 0, modeC: 0, tengoku: 0 },
];

export const ABESHI_DIST_NORMAL: AbeshiDistEntry[] = [
  { min: 1, max: 64, modeA: 0.0020, modeB: 0.0021, modeC: 0.0003, tengoku: 0.1250 },
  { min: 65, max: 128, modeA: 0.0137, modeB: 0.0149, modeC: 0.0020, tengoku: 0.8750 },
  { min: 129, max: 192, modeA: 0.0031, modeB: 0.0037, modeC: 0.0040, tengoku: 0 },
  { min: 193, max: 256, modeA: 0.2194, modeB: 0.2659, modeC: 0.2881, tengoku: 0 },
  { min: 257, max: 320, modeA: 0.0012, modeB: 0.0073, modeC: 0.0045, tengoku: 0 },
  { min: 321, max: 384, modeA: 0.0073, modeB: 0.0441, modeC: 0.0270, tengoku: 0 },
  { min: 385, max: 448, modeA: 0.0012, modeB: 0.0002, modeC: 0.0141, tengoku: 0 },
  { min: 449, max: 512, modeA: 0.0012, modeB: 0.0002, modeC: 0.0138, tengoku: 0 },
  { min: 513, max: 576, modeA: 0.0560, modeB: 0.0098, modeC: 0.6464, tengoku: 0 },
  { min: 577, max: 640, modeA: 0.0011, modeB: 0.0099, modeC: 0, tengoku: 0 },
  { min: 641, max: 704, modeA: 0.0012, modeB: 0.0101, modeC: 0, tengoku: 0 },
  { min: 705, max: 768, modeA: 0.0140, modeB: 0.1223, modeC: 0, tengoku: 0 },
  { min: 769, max: 832, modeA: 0.0011, modeB: 0.0100, modeC: 0, tengoku: 0 },
  { min: 833, max: 896, modeA: 0.0571, modeB: 0.4993, modeC: 0, tengoku: 0 },
  { min: 897, max: 960, modeA: 0.0011, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 961, max: 1024, modeA: 0.0071, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1025, max: 1088, modeA: 0.0012, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1089, max: 1152, modeA: 0.0073, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1153, max: 1216, modeA: 0.0012, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1217, max: 1280, modeA: 0.1099, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1281, max: 1344, modeA: 0.0340, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1345, max: 1408, modeA: 0.1511, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1409, max: 1472, modeA: 0.2930, modeB: 0, modeC: 0, tengoku: 0 },
  { min: 1473, max: 1536, modeA: 0.0145, modeB: 0, modeC: 0, tengoku: 0 },
];

// --- モード別の主要ゾーン（規定あべし集中帯） ---

export interface AbeshiZone {
  min: number;
  max: number;
  modes: HokutoMode[];
  label: string;
}

export const ABESHI_ZONES: AbeshiZone[] = [
  { min: 65, max: 128, modes: ['tengoku'], label: '天国ゾーン' },
  { min: 193, max: 256, modes: ['mode-a', 'mode-b', 'mode-c', 'tengoku'], label: '全モード共通チャンス' },
  { min: 513, max: 576, modes: ['mode-c'], label: 'モードC濃厚' },
  { min: 833, max: 896, modes: ['mode-b'], label: 'モードB濃厚' },
  { min: 1409, max: 1472, modes: ['mode-a'], label: 'モードA深部' },
  { min: 1505, max: 1536, modes: ['mode-a'], label: 'モードA最深部' },
];

// --- シャッター判別ポイント ---

export interface ShutterCheckpoint {
  min: number;
  max: number;
  usableForJudge: boolean;
  note: string;
}

export const SHUTTER_CHECKPOINTS: ShutterCheckpoint[] = [
  { min: 37, max: 45, usableForJudge: true, note: '896以内' },
  { min: 166, max: 173, usableForJudge: true, note: '896以内' },
  { min: 288, max: 300, usableForJudge: true, note: '896以内' },
  { min: 421, max: 429, usableForJudge: true, note: '896以内' },
  { min: 489, max: 495, usableForJudge: true, note: '896以内' },
];

// --- フェイク前兆あべし帯 → モード判別 ---

export interface FakeZenchoZone {
  min: number;
  max: number;
  confirmedModes: HokutoMode[] | null; // null = 確定にならない
  note: string;
}

export const FAKE_ZENCHO_ZONES: FakeZenchoZone[] = [
  { min: 1, max: 64, confirmedModes: ['mode-b', 'mode-c', 'tengoku'], note: 'モードB以上確定' },
  { min: 129, max: 192, confirmedModes: ['mode-b', 'mode-c'], note: 'モードB or C確定' },
  { min: 257, max: 320, confirmedModes: ['mode-b', 'mode-c'], note: 'モードB or C確定' },
  { min: 321, max: 384, confirmedModes: null, note: '発生率約5倍 — 確定にならない' },
  { min: 385, max: 512, confirmedModes: ['mode-b', 'mode-c'], note: 'モードB or C確定' },
  { min: 705, max: 768, confirmedModes: null, note: 'モード不問' },
];

// --- ゾーン毎のフェイク前兆発生率 ---
// 各モードでの発生率ラベル: '—'=なし, '10%以下', '50%', '濃厚'=発生濃厚, '天井'

export type ZenchoRateLabel = '—' | '10%以下' | '50%' | '濃厚' | '天井';

export interface FakeZenchoRateEntry {
  min: number;
  max: number;
  modeA: ZenchoRateLabel;
  modeB: ZenchoRateLabel;
  modeC: ZenchoRateLabel;
  tengoku: ZenchoRateLabel;
}

export const FAKE_ZENCHO_RATES: FakeZenchoRateEntry[] = [
  { min: 1, max: 64, modeA: '—', modeB: '10%以下', modeC: '10%以下', tengoku: '10%以下' },
  { min: 65, max: 128, modeA: '50%', modeB: '50%', modeC: '50%', tengoku: '天井' },
  { min: 129, max: 192, modeA: '—', modeB: '10%以下', modeC: '10%以下', tengoku: '—' },
  { min: 193, max: 256, modeA: '濃厚', modeB: '濃厚', modeC: '濃厚', tengoku: '—' },
  { min: 257, max: 320, modeA: '—', modeB: '10%以下', modeC: '10%以下', tengoku: '—' },
  { min: 321, max: 384, modeA: '10%以下', modeB: '50%', modeC: '50%', tengoku: '—' },
  { min: 385, max: 448, modeA: '—', modeB: '10%以下', modeC: '10%以下', tengoku: '—' },
  { min: 449, max: 512, modeA: '—', modeB: '—', modeC: '10%以下', tengoku: '—' },
  { min: 513, max: 576, modeA: '濃厚', modeB: '濃厚', modeC: '天井', tengoku: '—' },
  { min: 577, max: 640, modeA: '10%以下', modeB: '10%以下', modeC: '—', tengoku: '—' },
  { min: 641, max: 704, modeA: '10%以下', modeB: '10%以下', modeC: '—', tengoku: '—' },
  { min: 705, max: 768, modeA: '10%以下', modeB: '50%', modeC: '—', tengoku: '—' },
  { min: 769, max: 832, modeA: '10%以下', modeB: '10%以下', modeC: '—', tengoku: '—' },
  { min: 833, max: 896, modeA: '濃厚', modeB: '天井', modeC: '—', tengoku: '—' },
  { min: 897, max: 960, modeA: '10%以下', modeB: '—', modeC: '—', tengoku: '—' },
  { min: 961, max: 1024, modeA: '10%以下', modeB: '—', modeC: '—', tengoku: '—' },
  { min: 1025, max: 1088, modeA: '10%以下', modeB: '—', modeC: '—', tengoku: '—' },
  { min: 1089, max: 1152, modeA: '10%以下', modeB: '—', modeC: '—', tengoku: '—' },
  { min: 1153, max: 1216, modeA: '10%以下', modeB: '—', modeC: '—', tengoku: '—' },
  { min: 1217, max: 1280, modeA: '濃厚', modeB: '—', modeC: '—', tengoku: '—' },
  { min: 1281, max: 1344, modeA: '50%', modeB: '—', modeC: '—', tengoku: '—' },
  { min: 1345, max: 1408, modeA: '濃厚', modeB: '—', modeC: '—', tengoku: '—' },
  { min: 1409, max: 1472, modeA: '濃厚', modeB: '—', modeC: '—', tengoku: '—' },
  { min: 1473, max: 1536, modeA: '天井', modeB: '—', modeC: '—', tengoku: '—' },
];

// --- 天命の刻 ゾーン別モード示唆 ---

export interface TenmeiZone {
  min: number;
  max: number;
  modes: HokutoMode[];
  note: string;
}

export const TENMEI_ZONES: TenmeiZone[] = [
  { min: 1, max: 64, modes: ['mode-b', 'mode-c', 'tengoku'], note: 'モードB以上確定' },
  { min: 65, max: 128, modes: ['mode-a', 'mode-b', 'mode-c', 'tengoku'], note: '天国天井ゾーン' },
  { min: 129, max: 192, modes: ['mode-b', 'mode-c'], note: 'モードB or C確定' },
  { min: 193, max: 256, modes: ['mode-a', 'mode-b', 'mode-c', 'tengoku'], note: '全モード発生濃厚' },
  { min: 257, max: 320, modes: ['mode-b', 'mode-c'], note: 'モードB or C確定' },
  { min: 321, max: 384, modes: ['mode-a', 'mode-b', 'mode-c', 'tengoku'], note: 'B/C率高め' },
  { min: 385, max: 448, modes: ['mode-b', 'mode-c'], note: 'モードB or C確定' },
  { min: 449, max: 512, modes: ['mode-b', 'mode-c'], note: 'モードB or C確定' },
  { min: 513, max: 576, modes: ['mode-a', 'mode-b', 'mode-c'], note: 'モードC天井ゾーン' },
  { min: 577, max: 832, modes: ['mode-a', 'mode-b'], note: 'モードA or B' },
  { min: 833, max: 896, modes: ['mode-a', 'mode-b'], note: 'モードB天井ゾーン' },
  { min: 897, max: 1216, modes: ['mode-a'], note: 'モードA確定' },
  { min: 1217, max: 1536, modes: ['mode-a'], note: 'モードA深部' },
];

// --- トロフィー → 設定下限 ---

export const TROPHY_SETTING_FLOOR: Record<string, number> = {
  bronze: 2,
  silver: 3,
  gold: 4,
  kirin: 5,
  rainbow: 6,
};

// --- ランプ → 示唆内容 ---

export interface LampInterpretation {
  color: string;
  pattern: 'solid' | 'blink';
  upperWhiteFlow?: boolean;
  settingFloor: number | null;
  note: string;
}

export const LAMP_A_INTERPRETATIONS: LampInterpretation[] = [
  { color: 'white', pattern: 'solid', settingFloor: null, note: '1280以内（弱）' },
  { color: 'white', pattern: 'blink', settingFloor: null, note: '1280以内（強）' },
  { color: 'cyan', pattern: 'solid', settingFloor: null, note: '896以内（弱）' },
  { color: 'cyan', pattern: 'blink', settingFloor: null, note: '576以内（弱）' },
  { color: 'cyan', pattern: 'solid', upperWhiteFlow: true, settingFloor: null, note: '896以内（強）' },
  { color: 'cyan', pattern: 'blink', upperWhiteFlow: true, settingFloor: null, note: '576以内（強）' },
  { color: 'yellow-green', pattern: 'solid', settingFloor: 2, note: 'B以上（否定で設定2↑）' },
  { color: 'yellow-green', pattern: 'blink', settingFloor: 2, note: 'C以上（否定で設定2↑）' },
  { color: 'gold', pattern: 'solid', settingFloor: 4, note: 'B以上（否定で設定4↑）' },
  { color: 'gold', pattern: 'blink', settingFloor: 4, note: 'C以上（否定で設定4↑）' },
  { color: 'purple', pattern: 'solid', settingFloor: 6, note: 'B以上（否定で設定6濃厚）' },
  { color: 'purple', pattern: 'blink', settingFloor: 6, note: 'C以上（否定で設定6濃厚）' },
];

export const LAMP_B_INTERPRETATIONS: LampInterpretation[] = [
  { color: 'white', pattern: 'solid', settingFloor: null, note: '設定2・4示唆' },
  { color: 'white', pattern: 'blink', settingFloor: null, note: '設定3・5示唆' },
  { color: 'cyan', pattern: 'solid', settingFloor: null, note: '高設定（弱）' },
  { color: 'cyan', pattern: 'blink', settingFloor: null, note: '高設定（強）' },
  { color: 'yellow-green', pattern: 'solid', settingFloor: 2, note: '設定2↑' },
  { color: 'yellow-green', pattern: 'blink', settingFloor: 4, note: '設定4↑' },
  { color: 'gold', pattern: 'solid', settingFloor: 6, note: '設定6濃厚' },
];

export const LAMP_C_INTERPRETATIONS: LampInterpretation[] = [
  { color: 'cyan', pattern: 'solid', settingFloor: null, note: '初当たり近（弱）' },
  { color: 'yellow-green', pattern: 'solid', settingFloor: null, note: '初当たり近（中）' },
  { color: 'gold', pattern: 'solid', settingFloor: null, note: '初当たり近（強）' },
];

// --- 日本語ラベル ---

export const YAKU_LABELS: Record<string, string> = {
  'unknown': '不明',
  'hazure': 'ハズレ',
  'replay': 'リプレイ',
  'bell': 'ベル',
  'jaku-cherry': '弱チェリー',
  'kyou-cherry': '強チェリー',
  'suika': 'スイカ',
  'chance-me': 'チャンス目',
  'shobu-zoroi': '勝舞揃い',
  'kakutei-cherry': '確定チェリー',
};

export const MODE_LABELS: Record<HokutoMode, string> = {
  'mode-a': 'モードA',
  'mode-b': 'モードB',
  'mode-c': 'モードC',
  'tengoku': '天国',
};

export const INTERNAL_STATE_LABELS: Record<string, string> = {
  'unknown': '不明',
  'low': '低確',
  'normal': '通常',
  'high': '高確',
  'densho': '伝承',
};

export const TROPHY_LABELS: Record<string, string> = {
  'bronze': '銅',
  'silver': '銀',
  'gold': '金',
  'kirin': 'キリン柄',
  'rainbow': '虹',
};

export const LAMP_POSITION_LABELS: Record<string, string> = {
  'A': 'サイド',
  'B': '中央',
  'C': '液晶',
};

export const LAMP_COLOR_LABELS: Record<string, string> = {
  'white': '白',
  'cyan': '水色',
  'gold': '金',
  'purple': '紫',
  'yellow-green': '黄緑',
};

export const ZENCHO_CATEGORY_LABELS: Record<string, string> = {
  'shutter': 'シャッター',
  'tenmei': '天命の刻',
  'other': 'その他前兆',
};

export const RESET_STATUS_LABELS: Record<string, string> = {
  'reset': 'リセット',
  'suekae': '据え置き',
  'unknown': '不明',
};
