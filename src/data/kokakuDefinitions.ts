import type {
  KokakuAtRoute,
  KokakuCzType,
  KokakuEvent,
  KokakuMode,
  KokakuScreen,
  KokakuScreenContext,
  KokakuScreenEvent,
  KokakuScreenOccasion,
  KokakuZoneColor,
} from '../types/kokaku';

// ========================================
// スマスロ 攻殻機動隊 定義データ
// 出典: docs/kokaku-spec.md（数値表は一撃の解析ページ）
//
// このファイルと docs/kokaku-spec.md は必ず対で更新すること。
// ========================================

export const KOKAKU_MODES: readonly KokakuMode[] = [
  'reset',
  'normalA',
  'normalB',
  'normalC',
  'normalD',
] as const;

/** 遷移先になりうるモード。reset は設定変更時の開始状態専用 */
export const KOKAKU_DEST_MODES: readonly KokakuMode[] = [
  'normalA',
  'normalB',
  'normalC',
  'normalD',
] as const;

export const KOKAKU_MODE_LABEL: Record<KokakuMode, string> = {
  reset: 'リセット',
  normalA: '通常A',
  normalB: '通常B',
  normalC: '通常C',
  normalD: '通常D',
};

/** 低モード＝寒色、高モード＝暖色。グリッドと遷移表示で同じ色を使う */
export const KOKAKU_MODE_COLOR: Record<KokakuMode, string> = {
  reset: '#5ac8fa',
  normalA: '#8e8e93',
  normalB: '#30d158',
  normalC: '#ff9f0a',
  normalD: '#ff453a',
};

/** モード別CZ天井。ここを超えて未当選ならそのモードは尤度0 */
export const KOKAKU_CZ_CEILING: Record<KokakuMode, number> = {
  reset: 350,
  normalA: 550,
  normalB: 450,
  normalC: 250,
  normalD: 150,
};

// ========================================
// 殲滅ZONE当選期待度マップ
// ========================================

/** 殲滅ZONEの抽選がある規定ゲーム数（CZ天井のゲーム数を含む） */
export const KOKAKU_ZONE_GAMES = [50, 100, 150, 250, 300, 350, 450, 550] as const;

/** タチコマSAMゾーン。殲滅ZONEではないのでモード推測には使わない */
export const KOKAKU_TACHIKOMA_GAMES = [200, 400] as const;

/** グリッドの列。500Gはどのモードでも抽選が無いので置かない */
export const KOKAKU_GRID_GAMES = [50, 100, 150, 200, 250, 300, 350, 400, 450, 550] as const;

/**
 * モード別・規定ゲーム数別の殲滅ZONE当選期待度。
 *
 *   数値   … そのゲーム数で殲滅ZONEに当選する確率
 *   null   … 抽選なし（そのモードのそのゲーム数には殲滅ZONEが存在しない）
 *   未定義 … CZ天井を超えていて到達しえない
 *
 * CZ天井のゲーム数は KOKAKU_CZ_CEILING を参照。天井到達時は殲滅ZONEを経由して
 * CZ以上当選濃厚なので、確率ではなく確定として扱う。
 */
export const KOKAKU_ZONE_RATE: Record<KokakuMode, Partial<Record<number, number | null>>> = {
  reset: { 50: 0.5, 100: 0.25, 150: 0.5, 250: 0.5, 300: null },
  normalA: { 50: 0.25, 100: 0.5, 150: 0.013, 250: 0.5, 300: null, 350: 0.25, 450: 0.5 },
  normalB: { 50: 0.5, 100: 0.013, 150: 0.5, 250: 0.25, 300: 0.013, 350: 0.5 },
  normalC: { 50: 0.25, 100: 0.5, 150: 0.013 },
  normalD: { 50: 1.0, 100: 0.013 },
};

// ========================================
// モード移行率
// ========================================

/**
 * AT後の振り分け【全設定共通】。
 * 設定差が無いので、AT当選が続く展開では設定の情報がまったく増えない。
 */
export const KOKAKU_AT_TRANSITION: Record<KokakuMode, number> = {
  reset: 0,
  normalA: 0.125,
  normalB: 0.25,
  normalC: 0.125,
  normalD: 0.5,
};

/**
 * CZ後の振り分け【設定差あり】。配列の添字が設定1〜6（0始まり）。
 * **唯一、設定1〜6が完全に判明している設定差要素**。
 *
 * 設定1と2は通常C・通常Dが同値でA/Bが1.3ポイント違うだけ、
 * 設定3と4も通常C=通常D。隣接設定の判別には使えない。
 */
export const KOKAKU_CZ_TRANSITION: Record<KokakuMode, number[]> = {
  reset: [0, 0, 0, 0, 0, 0],
  normalA: [0.5, 0.487, 0.425, 0.375, 0.262, 0.2],
  normalB: [0.2, 0.213, 0.225, 0.225, 0.238, 0.25],
  normalC: [0.15, 0.15, 0.175, 0.2, 0.225, 0.25],
  normalD: [0.15, 0.15, 0.175, 0.2, 0.275, 0.3],
};

// ========================================
// 殲滅ZONEの色
// ========================================

export const KOKAKU_ZONE_COLORS: readonly KokakuZoneColor[] = [
  'white',
  'blue',
  'green',
  'red',
  'purple',
  'gold',
  'rainbow',
] as const;

export const KOKAKU_COLOR_LABEL: Record<KokakuZoneColor, string> = {
  white: '白',
  blue: '青',
  green: '緑',
  red: '赤',
  purple: '紫',
  gold: '金',
  rainbow: '虹',
};

export const KOKAKU_COLOR_STYLE: Record<KokakuZoneColor, string> = {
  white: '#d1d1d6',
  blue: '#0a84ff',
  green: '#30d158',
  red: '#ff453a',
  purple: '#bf5af2',
  gold: '#ffd60a',
  rainbow: 'linear-gradient(135deg,#ff453a,#ffd60a,#30d158,#0a84ff,#bf5af2)',
};

/** 色から白抜き文字が読めるか（白・金は暗い文字にする） */
export const KOKAKU_COLOR_DARK_TEXT: Record<KokakuZoneColor, boolean> = {
  white: true,
  blue: false,
  green: false,
  red: false,
  purple: false,
  gold: true,
  rainbow: false,
};

/**
 * 色別のCZ当選期待度（設定1 → 設定6）。単位は%。
 * **中間設定が不明なので事後確率には使わない**（実測値の並記のみ）。
 * 母確率が色ごとに違うため、将来実装するときも色を合算してはいけない。
 */
export const KOKAKU_COLOR_CZ_RATE: Partial<
  Record<KokakuZoneColor, { setting1: number; setting6: number }>
> = {
  blue: { setting1: 3.8, setting6: 9.6 },
  green: { setting1: 20.0, setting6: 30.4 },
  red: { setting1: 55.0, setting6: 61.7 },
};

// ========================================
// 終了画面・裏コマンド画面
// ========================================

export interface KokakuScreenInfo {
  id: KokakuScreen;
  label: string;
  /** どちらのカタログに属するか */
  context: KokakuScreenContext;
  /** 実機の枠色。画像を置いていないときのカードの見た目に使う */
  frame: 'default' | 'red' | 'purple' | 'gold';
  /** モード示唆。「濃厚」だけ制約として尤度に反映する */
  modeHint: string | null;
  /** 制約として許可するモード。null は制約なし（示唆のみ） */
  allowedModes: KokakuMode[] | null;
  /** 設定示唆の文言 */
  settingHint: string | null;
  /** 制約として許可する設定（1〜6）。null は制約なし */
  allowedSettings: number[] | null;
  /** デフォルト画面。集計で「デフォルト以外が何割出たか」を出すのに使う */
  defaultPattern?: boolean;
}

/**
 * ウインドウ（CZ終了時のPUSH押下 / AT終了 / 裏コマンド）で出る画面。
 *
 * 「濃厚」は振り分け数値が要らないのでハード制約として尤度に乗せる。
 * 「示唆」は振り分けが不明なので表示のみ（数値を捏造しない）。
 *
 * モード制約は normalA〜D に対してのみ効かせる。reset は設定変更時の
 * 特殊モードで、画面がそれを区別できるか不明なため常に許可する。
 */
export const KOKAKU_WINDOW_SCREENS: KokakuScreenInfo[] = [
  {
    id: 'motoko',
    label: '素子',
    context: 'window',
    frame: 'default',
    modeHint: '基本パターン',
    allowedModes: null,
    settingHint: null,
    allowedSettings: null,
    defaultPattern: true,
  },
  {
    id: 'motokoBattle',
    label: '素子（戦闘中）',
    context: 'window',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '高設定示唆（弱）',
    allowedSettings: null,
  },
  {
    id: 'togusa',
    label: 'トグサ',
    context: 'window',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '奇数設定示唆',
    allowedSettings: null,
  },
  {
    id: 'batou',
    label: 'バトー',
    context: 'window',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '偶数設定示唆',
    allowedSettings: null,
  },
  {
    id: 'poker',
    label: 'ポーカー',
    context: 'window',
    frame: 'default',
    modeHint: '高モード示唆',
    allowedModes: null,
    settingHint: null,
    allowedSettings: null,
  },
  {
    id: 'motokoBack',
    label: '素子（後姿）',
    context: 'window',
    frame: 'default',
    modeHint: 'モードB以上濃厚!?',
    allowedModes: ['reset', 'normalB', 'normalC', 'normalD'],
    settingHint: null,
    allowedSettings: null,
  },
  {
    id: 'koan9',
    label: '公安9課',
    context: 'window',
    frame: 'red',
    modeHint: 'モードC以上濃厚!?',
    allowedModes: ['reset', 'normalC', 'normalD'],
    settingHint: null,
    allowedSettings: null,
  },
  {
    id: 'cyberMotoko',
    label: '電脳素子',
    context: 'window',
    frame: 'purple',
    modeHint: 'モードC以上濃厚!?（強）',
    allowedModes: ['reset', 'normalC', 'normalD'],
    settingHint: null,
    allowedSettings: null,
  },
  {
    id: 'aoi',
    label: 'アオイ',
    context: 'window',
    frame: 'gold',
    modeHint: 'モードD濃厚!?',
    allowedModes: ['reset', 'normalD'],
    settingHint: '設定4以上濃厚!?',
    allowedSettings: [4, 5, 6],
  },
  {
    id: 'secondGig',
    label: '2ndGIG',
    context: 'window',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '白の境界（上位CZ）権利保有時の専用画面',
    allowedSettings: null,
  },
];

/**
 * CZ終了時にそのまま出る画面。**ウインドウとは別の一覧**。
 * 同名のキャラでも示唆が違う（トグサはウインドウ＝奇数示唆／CZ終了＝高設定示唆（弱））。
 * モード示唆は無く、すべて設定示唆。
 */
export const KOKAKU_CZ_END_SCREENS: KokakuScreenInfo[] = [
  {
    id: 'czSky',
    label: '青空',
    context: 'cz-end',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '基本パターン',
    allowedSettings: null,
    defaultPattern: true,
  },
  {
    id: 'czSkyLaughingMan',
    label: '青空＋笑い男マーク',
    context: 'cz-end',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    // 設定示唆ではなく復活の示唆。制約には使わない
    settingHint: '復活期待度 50%',
    allowedSettings: null,
  },
  {
    id: 'czSkyKoan9',
    label: '青空＋公安9課',
    context: 'cz-end',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '設定2以上濃厚!?',
    allowedSettings: [2, 3, 4, 5, 6],
  },
  {
    id: 'czOpeko',
    label: 'オペ子',
    context: 'cz-end',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '奇数設定示唆',
    allowedSettings: null,
  },
  {
    id: 'czTachikoma',
    label: 'タチコマ',
    context: 'cz-end',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '偶数設定示唆',
    allowedSettings: null,
  },
  {
    id: 'czTogusa',
    label: 'トグサ',
    context: 'cz-end',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '高設定示唆（弱）',
    allowedSettings: null,
  },
  {
    id: 'czIshikawa',
    label: 'イシカワ',
    context: 'cz-end',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '高設定示唆（強）／出現頻度 9.4〜18.8%',
    allowedSettings: null,
  },
  {
    id: 'czMotoko',
    label: '素子',
    context: 'cz-end',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    // 設定2・3だけを否定する飛び飛びの制約
    settingHint: '設定1・4・5・6濃厚!? ＋ 高設定示唆（強）',
    allowedSettings: [1, 4, 5, 6],
  },
  {
    id: 'czVacance',
    label: 'バカンス',
    context: 'cz-end',
    frame: 'default',
    modeHint: null,
    allowedModes: null,
    settingHint: '設定4以上濃厚!?',
    allowedSettings: [4, 5, 6],
  },
  {
    id: 'czAllStars',
    label: '全員集合',
    context: 'cz-end',
    frame: 'gold',
    modeHint: null,
    allowedModes: null,
    settingHint: '設定6濃厚!?',
    allowedSettings: [6],
  },
];

/** 全画面の統合カタログ（idからの逆引き用） */
export const KOKAKU_SCREENS: KokakuScreenInfo[] = [
  ...KOKAKU_WINDOW_SCREENS,
  ...KOKAKU_CZ_END_SCREENS,
];

export function findKokakuScreen(id: KokakuScreen): KokakuScreenInfo | undefined {
  return KOKAKU_SCREENS.find((s) => s.id === id);
}

export const KOKAKU_SCREEN_CATALOG: Record<KokakuScreenContext, KokakuScreenInfo[]> = {
  'cz-end': KOKAKU_CZ_END_SCREENS,
  window: KOKAKU_WINDOW_SCREENS,
};

export const KOKAKU_SCREEN_CONTEXT_LABEL: Record<KokakuScreenContext, string> = {
  'cz-end': 'CZ終了画面',
  window: 'ウインドウ',
};

/**
 * 出現場面。カタログの選択も兼ねるので、ユーザーはこれを1つ選ぶだけでよい。
 * `short` はグリッドのセルに出す1〜4文字のタグ。
 */
export const KOKAKU_SCREEN_OCCASIONS: {
  id: KokakuScreenOccasion;
  label: string;
  short: string;
  catalog: KokakuScreenContext;
  howto: string;
}[] = [
  {
    id: 'cz-end',
    label: 'CZ終了画面',
    short: 'CZ',
    catalog: 'cz-end',
    howto: 'CZ終了時にそのまま出現する画面。',
  },
  {
    id: 'cz-push',
    label: 'CZ終了＋PUSH',
    short: 'PUSH',
    catalog: 'window',
    howto: 'CZ終了時にPUSHボタンを押すと出るウインドウ。押さないと出ない。',
  },
  {
    id: 'at-end',
    label: 'AT終了',
    short: 'AT',
    catalog: 'window',
    howto: 'AT終了時にそのまま出現するウインドウ。',
  },
  {
    id: 'ura',
    label: '裏コマンド',
    short: '裏',
    catalog: 'window',
    howto:
      '通常時77G経過かつ全リール停止後に左ボタンを7回押下（リプレイ・レア役成立時／前兆中は無効）。リール右側のUIに出現。',
  },
];

/** 未知の値が保存データに残っていることがあるので undefined を返しうる */
export function findKokakuOccasion(id: KokakuScreenOccasion) {
  return KOKAKU_SCREEN_OCCASIONS.find((o) => o.id === id);
}

/**
 * 画面と場面から、表示に使える場面定義を必ず1つ返す。
 * 保存データの場面が壊れていても、その画面のカタログで成立する既定へ寄せる。
 */
export function resolveKokakuOccasion(screen: KokakuScreen, id: KokakuScreenOccasion) {
  const allowed = kokakuOccasionsForScreen(screen);
  const found = allowed.includes(id) ? findKokakuOccasion(id) : undefined;
  return found ?? findKokakuOccasion(allowed[0])!;
}

/** その場面で選べる画面の一覧 */
export function kokakuScreensForOccasion(id: KokakuScreenOccasion): KokakuScreenInfo[] {
  return KOKAKU_SCREEN_CATALOG[findKokakuOccasion(id)?.catalog ?? 'window'];
}

/** その画面がありうる場面（カタログから逆引き） */
export function kokakuOccasionsForScreen(id: KokakuScreen): KokakuScreenOccasion[] {
  const catalog = findKokakuScreen(id)?.context;
  return KOKAKU_SCREEN_OCCASIONS.filter((o) => o.catalog === catalog).map((o) => o.id);
}

/**
 * 画面キャプチャの置き場所。`public/kokaku-screens/<id>.webp` を置くと
 * ピッカーがサムネイルで表示する。無ければ枠色つきのカードにフォールバックする。
 *
 * 解析サイトの画像は著作物なので同梱していない。自分で撮ったものを置くこと。
 */
export function kokakuScreenImage(id: KokakuScreen): string {
  // vite.config.ts に base を置いていないので、public/ はルート直下で配信される。
  // import.meta.env を使わないのは、テストがこのファイルをCommonJSへ変換して読むため。
  return `/kokaku-screens/${id}.webp`;
}

// ========================================
// CZ・AT
// ========================================

export const KOKAKU_CZ_LABEL: Record<KokakuCzType, string> = {
  sam: 'S.A.M.',
  tachikoma: 'タチコマの家出',
};

export const KOKAKU_AT_ROUTE_LABEL: Record<KokakuAtRoute, string> = {
  cz: 'CZ成功',
  direct: '殲滅ZONE直撃',
  ceiling: 'AT間999G天井',
};

/** AT間天井。到達でAT当選 */
export const KOKAKU_AT_CEILING = 999;

// ========================================
// 参考値（事後確率には使わない）
// ========================================

/** 視覚HACK（S.A.M.視覚フラグ保有率）。分母はCZ失敗回数 */
export const KOKAKU_VISUAL_HACK_RATE = { setting1: 5.7, setting6: 10.6 };

/** タチコマCZ当選率（AT終了後の200G＆400G到達時の合算値） */
export const KOKAKU_TACHIKOMA_CZ_RATE = { setting1: 30.0, setting6: 48.3 };

/** 殲滅ZONE（白〜紫）からのAT直撃 */
export const KOKAKU_DIRECT_AT_RATE = { setting1: 1 / 10676.6, setting6: 1 / 4473.0 };

// ========================================
// 初期状態
// ========================================

/**
 * 古いローカル／クラウド記録を安全に読み込む。
 *
 * `screen` の occasion は画面のカタログと整合していなければならないので、
 * 合わない値は捨ててそのカタログの既定の場面に寄せる。
 * 旧形式で `context`（'cz-end' | 'window' | 'at-end' | 'ura-command'）を
 * 持っていた記録もここで読み替える。
 */
export function normalizeKokakuEvents(value: unknown): KokakuEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isValidKokakuEvent).map((event) =>
    event.type === 'screen'
      ? { ...event, occasion: normalizeOccasion(event) }
      : event
  );
}

const LEGACY_OCCASION: Record<string, KokakuScreenOccasion> = {
  'cz-end': 'cz-end',
  'at-end': 'at-end',
  'ura-command': 'ura',
  window: 'ura',
};

function normalizeOccasion(event: KokakuScreenEvent): KokakuScreenOccasion {
  const allowed = kokakuOccasionsForScreen(event.screen);
  const legacy = (event as unknown as { context?: string }).context;
  const candidate = event.occasion ?? (legacy ? LEGACY_OCCASION[legacy] : undefined);
  return candidate && allowed.includes(candidate) ? candidate : allowed[0];
}

function isValidKokakuEvent(value: unknown): value is KokakuEvent {
  // 外部（localStorage / クラウド）から来た未検証の値。形だけ見て通す
  const event = value as KokakuEvent & Record<string, never>;
  return ((): boolean => {
    if (!event || typeof event !== 'object') return false;
    if (typeof event.id !== 'string' || !Number.isFinite(event.timestamp)) return false;
    switch (event.type) {
      case 'cycle-start':
        return typeof event.reset === 'boolean';
      case 'zone':
        return (
          (KOKAKU_ZONE_GAMES as readonly number[]).includes(event.game) &&
          typeof event.czWon === 'boolean' &&
          (event.color === null || KOKAKU_ZONE_COLORS.includes(event.color))
        );
      case 'tachikoma-zone':
        return (
          (KOKAKU_TACHIKOMA_GAMES as readonly number[]).includes(event.game) &&
          typeof event.czWon === 'boolean'
        );
      case 'zone-point':
        return (
          typeof event.czWon === 'boolean' &&
          (event.color === null || KOKAKU_ZONE_COLORS.includes(event.color))
        );
      case 'screen':
        return KOKAKU_SCREENS.some((s) => s.id === event.screen);
      case 'cycle-end':
        return (
          (event.cz === null ||
            (typeof event.cz === 'object' &&
              (event.cz.czType === 'sam' || event.cz.czType === 'tachikoma') &&
              typeof event.cz.success === 'boolean')) &&
          (event.at === null || ['cz', 'direct', 'ceiling'].includes(event.at)) &&
          Number.isFinite(event.endGame)
        );
      default:
        return false;
    }
  })();
}
