import type { KoyakuDefinition } from '../types';

// Apple Dark Mode対応カラー
// 各カテゴリに対応した暗めの背景色（テキストとのコントラストを確保）
const DARK_BLUE = 'rgba(10, 132, 255, 0.15)';     // 5枚役 - 青系
const DARK_YELLOW = 'rgba(255, 159, 10, 0.15)';   // 激走演出 - オレンジ系
const DARK_PURPLE = 'rgba(191, 90, 242, 0.15)';   // 終了時演出 - 紫系
const DARK_PINK = 'rgba(255, 69, 58, 0.15)';      // 特殊 - 赤系
const DARK_GREEN = 'rgba(48, 209, 88, 0.15)';     // 直撃 - 緑系

export const koyakuDefinitions: KoyakuDefinition[] = [
  // 5枚役（設定差あり）
  {
    id: 'riribe',
    name: '5枚役「リリベ」',
    category: '5枚役',
    backgroundColor: DARK_BLUE,
    order: 1,
  },
  {
    id: 'ribebe',
    name: '5枚役「リベべ」',
    category: '5枚役',
    backgroundColor: DARK_BLUE,
    order: 2,
  },
  {
    id: 'riribo',
    name: '5枚役「リリボ」',
    category: '5枚役',
    backgroundColor: DARK_BLUE,
    order: 3,
  },

  // 激走演出
  {
    id: 'gekiso_ochitsuke',
    name: '激走「落ち着け」',
    category: '激走演出',
    backgroundColor: DARK_YELLOW,
    order: 4,
  },
  {
    id: 'gekiso_kehai',
    name: '激走「この気配」',
    category: '激走演出',
    backgroundColor: DARK_YELLOW,
    order: 5,
  },
  {
    id: 'gekiso_otsukare',
    name: '激走「おつかれ」',
    category: '激走演出',
    backgroundColor: DARK_YELLOW,
    order: 6,
  },
  {
    id: 'gekiso_teiou',
    name: '激走「これが艇王」',
    category: '激走演出',
    backgroundColor: DARK_YELLOW,
    order: 7,
  },

  // 終了時演出
  {
    id: 'end_nashi',
    name: '終了時「なし」',
    category: '終了時演出',
    backgroundColor: DARK_PURPLE,
    order: 8,
  },
  {
    id: 'end_ao_medal',
    name: '終了時「青メダル」',
    category: '終了時演出',
    backgroundColor: DARK_PURPLE,
    order: 9,
  },
  {
    id: 'end_ki_medal',
    name: '終了時「黄メダル」',
    category: '終了時演出',
    backgroundColor: DARK_PURPLE,
    order: 10,
  },
  {
    id: 'end_kuro_medal',
    name: '終了時「黒メダル」',
    category: '終了時演出',
    backgroundColor: DARK_PURPLE,
    order: 11,
  },
  {
    id: 'end_dou_trophy',
    name: '終了時「銅トロ」',
    category: '終了時演出',
    backgroundColor: DARK_PURPLE,
    order: 12,
  },
  {
    id: 'end_kin_trophy',
    name: '終了時「金トロ」',
    category: '終了時演出',
    backgroundColor: DARK_PURPLE,
    order: 13,
  },
  {
    id: 'end_kerotto',
    name: '終了時「ケロット」',
    category: '終了時演出',
    backgroundColor: DARK_PURPLE,
    order: 14,
  },
  {
    id: 'end_niji_trophy',
    name: '終了時「虹トロ」',
    category: '終了時演出',
    backgroundColor: DARK_PURPLE,
    order: 15,
  },

  // 特殊
  {
    id: 'special_sokuyude',
    name: '特殊「即優出」',
    category: '特殊',
    backgroundColor: DARK_PINK,
    order: 16,
  },

  // 直撃
  {
    id: 'direct_jaku_cherry',
    name: '直撃「弱チェリー」',
    category: '直撃',
    backgroundColor: DARK_GREEN,
    order: 17,
  },
  {
    id: 'direct_boat',
    name: '直撃「ボート」',
    category: '直撃',
    backgroundColor: DARK_GREEN,
    order: 18,
  },
  {
    id: 'direct_jaku_chance',
    name: '直撃「弱チャンス目」',
    category: '直撃',
    backgroundColor: DARK_GREEN,
    order: 19,
  },
  {
    id: 'direct_kyou_chance',
    name: '直撃「強チャンス目」',
    category: '直撃',
    backgroundColor: DARK_GREEN,
    order: 20,
  },
  {
    id: 'direct_kyou_cherry',
    name: '直撃「強チェリー」',
    category: '直撃',
    backgroundColor: DARK_GREEN,
    order: 21,
  },
];

// 5枚役のIDリスト（設定差判別用）
export const fiveCardIds = ['riribe', 'ribebe', 'riribo'];

// カテゴリ順序
export const categoryOrder: Record<string, number> = {
  '5枚役': 1,
  '激走演出': 2,
  '終了時演出': 3,
  '特殊': 4,
  '直撃': 5,
};

// カテゴリでグループ化
export function getKoyakuByCategory() {
  const grouped = new Map<string, KoyakuDefinition[]>();

  for (const koyaku of koyakuDefinitions) {
    const list = grouped.get(koyaku.category) || [];
    list.push(koyaku);
    grouped.set(koyaku.category, list);
  }

  return grouped;
}

// 初期カウンター状態を生成
export function createInitialCounters(): Record<string, number> {
  const counters: Record<string, number> = {};
  for (const koyaku of koyakuDefinitions) {
    counters[koyaku.id] = 0;
  }
  return counters;
}
