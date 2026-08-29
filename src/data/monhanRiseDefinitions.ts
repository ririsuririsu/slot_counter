import type {
  AtWinRoute,
  DarumaReachedCount,
  DarumaReplayCount,
  MonhanRiseCounterState,
  PointMode,
  QuestTable,
  RequiredPoint,
} from '../types/monhanRise';

// ========================================
// スマスロ モンスターハンターライズ 定義データ
// 出典: docs/monhan-rise-spec.md を参照（数値を変える場合は必ず両方を更新すること）
//
// 全テーブルの添字は「設定1〜6」に対応する 0〜5。
// ========================================

/** 設定の並び（表示・ループ用） */
export const SETTINGS = [1, 2, 3, 4, 5, 6] as const;

// ========================================
// 小役確率（全設定共通・設定差なし）
// ========================================

export interface KoyakuInfo {
  name: string;
  denominator: number;
}

export const koyakuTable: KoyakuInfo[] = [
  { name: 'ハズレ3枚役', denominator: 6.5 },
  { name: 'リプレイ', denominator: 7.3 },
  { name: '3枚ベル', denominator: 8.1 },
  { name: '弱チャンス目', denominator: 99.9 },
  { name: 'スイカ', denominator: 105.3 },
  { name: '弱チェリー', denominator: 114.9 },
  { name: '強チェリー', denominator: 532.8 },
  { name: '強チャンス目', denominator: 585.1 },
];

/** 弱レア役合算（弱チャンス目 + スイカ + 弱チェリー）= 1/35.45 */
export const WEAK_RARE_RATE = 1 / 99.9 + 1 / 105.3 + 1 / 114.9;

/** 強レア役合算（強チェリー + 強チャンス目）= 1/278.86 */
export const STRONG_RARE_RATE = 1 / 532.8 + 1 / 585.1;

// ========================================
// 軸1: ライズゾーン
// ========================================

/** カウンターキー */
export const WEAK_RARE_KEY = 'weakRare';
export const RIZE_ZONE_KEY = 'rizeZone';

/**
 * 通常時の弱レア役1回あたりのライズゾーン当選率（内部状態を周辺化した値）。
 *
 * 実質出現率 = WEAK_RARE_RATE × p + STRONG_RARE_RATE × 1.0 から逆算している。
 * 内部状態(通常/高確/超高確)は観測できないため本実装では推定しない。
 * 通常時の弱レア役は状態を問わず全てカウントすることが前提。
 */
export const RIZE_RATE_FROM_WEAK_RARE = [
  0.342, 0.344, 0.359, 0.367, 0.387, 0.393,
];

/** ライズゾーン実質出現率の分母（参考表示用） */
export const RIZE_ZONE_DENOMINATOR = [75.6, 75.2, 72.9, 71.8, 68.9, 68.2];

// ========================================
// 軸2: アイルーだるま落とし 規定リプレイ回数
// ========================================

/** 規定リプレイ回数の候補 */
export const DARUMA_COUNTS: DarumaReplayCount[] = [40, 80, 120, 160, 200];

/** 打ち切り時に選べる「到達済みの区切り」 */
export const DARUMA_REACHED_OPTIONS: DarumaReachedCount[] = [0, 40, 80, 120, 160];

/**
 * 規定リプレイ回数の振り分け [設定index][DARUMA_COUNTS index]
 * 出典表の丸め誤差で合計が 1.000 にならない行があるため、使用側で正規化する。
 */
export const DARUMA_REPLAY_DIST: number[][] = [
  [0.125, 0.125, 0.25, 0.25, 0.25], // 設定1
  [0.133, 0.133, 0.242, 0.246, 0.246], // 設定2
  [0.156, 0.156, 0.219, 0.234, 0.234], // 設定3
  [0.195, 0.195, 0.203, 0.203, 0.203], // 設定4
  [0.219, 0.219, 0.195, 0.184, 0.184], // 設定5
  [0.227, 0.227, 0.188, 0.18, 0.18], // 設定6
];

// ========================================
// 軸3: ポイントモード
// ========================================

/** 規定カムラポイントの候補 */
export const REQUIRED_POINTS: RequiredPoint[] = [100, 200, 300, 400, 500, 600];

/** 規定ptごとのセル色（クエスト履歴グリッド用） */
export const POINT_COLOR: Record<RequiredPoint, string> = {
  100: '#ff453a',
  200: '#30d158',
  300: '#bf5af2',
  400: '#64d2ff',
  500: '#c9a227',
  600: '#0a84ff',
};

/** AT当選契機のラベルと色 */
export const AT_ROUTE_INFO: Record<AtWinRoute, { label: string; color: string }> = {
  quest: { label: 'クエスト', color: '#ff9f0a' },
  cz: { label: 'CZ成功', color: '#5e5ce6' },
  direct: { label: '直撃', color: '#ff375f' },
};

/**
 * 保存データ由来の当選契機を安全に読む。
 *
 * at-hit は当初 questCount を持ち route が無かった。マイグレーションで補完しているが、
 * route が欠けたデータを読み込んでも落ちないよう、読み出し側でも正規化する
 * （route 未定義は「クエストで当選」だった旧仕様に対応する）。
 */
export function toAtWinRoute(value: unknown): AtWinRoute {
  return value === 'cz' || value === 'direct' ? value : 'quest';
}

export const POINT_MODES: PointMode[] = ['A', 'B', 'C', 'D'];

export const POINT_MODE_LABEL: Record<PointMode, string> = {
  A: 'モードA',
  B: 'モードB',
  C: 'モードC',
  D: 'モードD',
};

/** 遷移の流れを並べて表示するときの短縮名 */
export const POINT_MODE_SHORT: Record<PointMode, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
};

/**
 * モード別の規定pt振り分け（設定差なし）。添字は REQUIRED_POINTS に対応。
 * これが軸3で唯一観測できる量。
 */
export const POINT_DIST_BY_MODE: Record<PointMode, number[]> = {
  //     100     200     300     400     500     600
  A: [0.008, 0.301, 0.004, 0.301, 0.004, 0.382],
  B: [0.008, 0.004, 0.434, 0.004, 0.55, 0],
  C: [0.008, 0.289, 0.063, 0.289, 0.063, 0.288],
  D: [1, 0, 0, 0, 0, 0],
};

type ModeDist = Record<PointMode, number>;

const modeDist = (a: number, b: number, c: number, d: number): ModeDist => ({
  A: a,
  B: b,
  C: c,
  D: d,
});

/**
 * ポイントモードの移行抽選（クエスト派生ごと）。
 * POINT_MODE_TRANSITION[滞在モード][設定index] → 次モードの分布
 */
export const POINT_MODE_TRANSITION: Record<PointMode, ModeDist[]> = {
  A: [
    modeDist(0.5, 0.406, 0.063, 0.031),
    modeDist(0.488, 0.407, 0.07, 0.035),
    modeDist(0.477, 0.406, 0.078, 0.039),
    modeDist(0.406, 0.406, 0.141, 0.047),
    modeDist(0.359, 0.406, 0.18, 0.055),
    modeDist(0.343, 0.406, 0.188, 0.063),
  ],
  // モードBからモードAへの転落はなし
  B: [
    modeDist(0, 0.5, 0.437, 0.063),
    modeDist(0, 0.496, 0.438, 0.066),
    modeDist(0, 0.492, 0.438, 0.07),
    modeDist(0, 0.477, 0.438, 0.085),
    modeDist(0, 0.445, 0.438, 0.117),
    modeDist(0, 0.438, 0.438, 0.124),
  ],
  // モードCは全設定100%でモードDへ
  C: [
    modeDist(0, 0, 0, 1),
    modeDist(0, 0, 0, 1),
    modeDist(0, 0, 0, 1),
    modeDist(0, 0, 0, 1),
    modeDist(0, 0, 0, 1),
    modeDist(0, 0, 0, 1),
  ],
  D: [
    modeDist(0.5, 0.344, 0.031, 0.125),
    modeDist(0.465, 0.344, 0.035, 0.156),
    modeDist(0.43, 0.344, 0.039, 0.187),
    modeDist(0.359, 0.344, 0.047, 0.25),
    modeDist(0.32, 0.344, 0.055, 0.281),
    modeDist(0.304, 0.344, 0.063, 0.289),
  ],
};

// ========================================
// 軸4: クエストテーブル
// ========================================

export const QUEST_TABLES: QuestTable[] = ['A', 'B', 'heavenPrep', 'heaven'];

export const QUEST_TABLE_LABEL: Record<QuestTable, string> = {
  A: 'テーブルA',
  B: 'テーブルB',
  heavenPrep: '天国準備',
  heaven: '天国',
};

/** 遷移の流れを並べて表示するときの短縮名 */
export const QUEST_TABLE_SHORT: Record<QuestTable, string> = {
  A: 'A',
  B: 'B',
  heavenPrep: '準備',
  heaven: '天国',
};

/**
 * ポイントモードの色。**そのモードが最も選びやすい規定ptの色に合わせる。**
 * グリッド（履歴）とモード遷移で同じ色が同じ意味を指すようにするため、
 * POINT_COLOR から引いている。変更するときは POINT_DIST_BY_MODE の最頻値を確認すること。
 *
 *   A … 600pt(38.2%) が最頻
 *   B … 500pt(55.0%) が最頻
 *   C … 200/400/600pt がほぼ均等(28.9/28.9/28.8%)。A と色が被らないよう 200pt を採る
 *   D … 100pt(100%)
 */
export const POINT_MODE_COLOR: Record<PointMode, string> = {
  A: POINT_COLOR[600],
  B: POINT_COLOR[500],
  C: POINT_COLOR[200],
  D: POINT_COLOR[100],
};

/**
 * クエストテーブルの色。
 * テーブルは規定ptと対応しないため、pt の色とは重ならない無彩色〜橙のランプにして
 * 「pt/モードの色ではない」と一目で分かるようにする。天国に近いほど暖色。
 */
export const QUEST_TABLE_COLOR: Record<QuestTable, string> = {
  A: '#8e8e93',
  B: '#aeaeb2',
  heavenPrep: '#ffb340',
  heaven: '#ff9f0a',
};

/** AT間クエスト回数天井（この回数で全テーブル100%当選） */
export const QUEST_CEILING = 7;

/**
 * クエスト回数別のAT当選率。添字0 = 1回目 … 添字6 = 7回目。
 * 7回目が全テーブル100%なのはAT間クエスト回数天井のため。
 */
export const QUEST_HIT_RATE: Record<QuestTable, number[]> = {
  //           1回目   2回目   3回目   4回目   5回目   6回目  7回目
  A: [0.004, 0.301, 0.098, 0.449, 0.098, 0.301, 1],
  B: [0.004, 0.098, 0.5, 0.098, 0.5, 0.098, 1],
  heavenPrep: [0.004, 0.25, 0.5, 0.75, 0.5, 0.75, 1],
  heaven: [1, 1, 1, 1, 1, 1, 1],
};

type TableDist = Record<QuestTable, number>;

const tableDist = (
  a: number,
  b: number,
  prep: number,
  heaven: number
): TableDist => ({ A: a, B: b, heavenPrep: prep, heaven });

/**
 * クエストテーブルの移行抽選（AT当選ごと）。
 * QUEST_TABLE_TRANSITION[滞在テーブル][設定index] → 次テーブルの分布
 * 天国に到達するまで下位テーブルへは転落しない。
 */
export const QUEST_TABLE_TRANSITION: Record<QuestTable, TableDist[]> = {
  A: [
    tableDist(0.5, 0.227, 0.07, 0.203),
    tableDist(0.488, 0.23, 0.074, 0.208),
    tableDist(0.477, 0.234, 0.078, 0.211),
    tableDist(0.34, 0.238, 0.188, 0.234),
    tableDist(0.274, 0.242, 0.242, 0.242),
    tableDist(0.25, 0.25, 0.25, 0.25),
  ],
  B: [
    tableDist(0, 0.5, 0.25, 0.25),
    tableDist(0, 0.492, 0.254, 0.254),
    tableDist(0, 0.484, 0.258, 0.258),
    tableDist(0, 0.39, 0.305, 0.305),
    tableDist(0, 0.352, 0.324, 0.324),
    tableDist(0, 0.336, 0.332, 0.332),
  ],
  heavenPrep: [
    tableDist(0, 0, 0.25, 0.75),
    tableDist(0, 0, 0.246, 0.754),
    tableDist(0, 0, 0.242, 0.758),
    tableDist(0, 0, 0.223, 0.777),
    tableDist(0, 0, 0.207, 0.793),
    tableDist(0, 0, 0.199, 0.801),
  ],
  heaven: [
    tableDist(0.5, 0.063, 0.063, 0.374),
    tableDist(0.492, 0.067, 0.067, 0.374),
    tableDist(0.484, 0.071, 0.071, 0.374),
    tableDist(0.368, 0.094, 0.164, 0.374),
    tableDist(0.317, 0.118, 0.191, 0.374),
    tableDist(0.301, 0.125, 0.2, 0.374),
  ],
};

// ========================================
// 設定変更時（朝一）の優遇
// ========================================

/** 設定変更時はポイントモードB以上濃厚 */
export const MORNING_POINT_MODES: PointMode[] = ['B', 'C', 'D'];

/** 設定変更時は75%以上で天国準備以上 */
export const MORNING_HEAVEN_PREP_OR_ABOVE_RATE = 0.75;

/**
 * その75%を天国準備と天国へどう配分するか。
 *
 * 出典は「75%以上で天国準備以上」としか書いておらず、内訳が不明。
 * 定常分布で割ると天国が54.7%になるが、それは
 * 「設定変更後の半数以上が1回目のクエストでAT当選」を意味する強すぎる仮定になる。
 * 定常分布は打っている最中の分布であって、リセット時の選択比率ではない。
 * 根拠が無い以上どちらかに寄せられないため、上位2テーブルへ均等に割る。
 */
export const MORNING_HEAVEN_SPLIT: Record<'heavenPrep' | 'heaven', number> = {
  heavenPrep: 0.5,
  heaven: 0.5,
};

// ========================================
// 参考: AT確率・出玉率
// ========================================

export const AT_DENOMINATOR = [309.5, 301.4, 290.8, 256.4, 237.1, 230.8];
export const PAYOUT_RATE = [97.9, 98.8, 100.3, 105.4, 110.1, 114.3];

/** ゲーム数天井 */
export const GAME_CEILING = 999;

// ========================================
// ファクトリ
// ========================================

export function createInitialMonhanRiseCounters(): MonhanRiseCounterState {
  return {
    [WEAK_RARE_KEY]: 0,
    [RIZE_ZONE_KEY]: 0,
  };
}
