// ========================================
// スマスロ 甲鉄城のカバネリ 海門決戦
// ========================================

// チャンス目種別
export type KabaneriChanceType = 'mumei' | 'ikoma' | 'kabane';

// カウンター状態
// キー: 'mumei' | 'mumeiFlash' | 'ikoma' | 'ikomaFlash'
//     | 'kabane' | 'kabaneFlash' | 'gedanBell'
export interface KabaneriCounterState {
  [counterId: string]: number;
}

/** 計測済みとして推測に採用する項目。カウント値とは独立に選択する。 */
export interface KabaneriAnalysisTargets {
  bell: boolean;
  mumeiIkoma: boolean;
  kabane: boolean;
}

export type KabaneriFlashAxis = 'mumeiIkoma' | 'kabane';

export type KabaneriCzCharacter = 'mumei' | 'ikoma';
export type KabaneriChanceRole = KabaneriChanceType | 'mumeiIkoma' | 'mumeiKabane' | 'ikomaKabane' | 'all';
export type KabaneriChanceCondition = 'normal' | 'high' | 'super';

export interface KabaneriChanceInput {
  type: 'chance';
  role: KabaneriChanceRole;
  conditions: Record<KabaneriChanceType, KabaneriChanceCondition>;
  flash: 'none' | 'yes' | 'unknown';
  /** 発光率カウント対象の非高確・非発光中単独役だけtrue。 */
  flashEligible: boolean;
}

export type KabaneriCzEventInput = KabaneriChanceInput | {
  type: 'cz';
  character: KabaneriCzCharacter;
  doran: boolean;
} | {
  type: 'start';
  /** nullは開始前の蓄積不明、0は区間リセット等で0から計測。 */
  initialPoints: Record<KabaneriCzCharacter, number | null>;
};

/** 配列順が遊技順。CZは指定した当選契機の直後に挿入する。 */
export type KabaneriCzEvent = KabaneriCzEventInput & {
  id: string;
  timestamp: number;
};

// 設定判別結果（設定1〜6）
export interface KabaneriSettingAnalysis {
  setting1: number;
  setting2: number;
  setting3: number;
  setting4: number;
  setting5: number;
  setting6: number;
}
