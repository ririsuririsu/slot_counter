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

// 設定判別結果（設定1〜6）
export interface KabaneriSettingAnalysis {
  setting1: number;
  setting2: number;
  setting3: number;
  setting4: number;
  setting5: number;
  setting6: number;
}
