// ========================================
// 北斗の拳 転生の章2 — 型定義
// ========================================

// --- セッション ---

export type ResetStatus = 'reset' | 'suekae' | 'unknown';

export interface HokutoSession {
  resetStatus: ResetStatus;
  startedAt: number;
}

// --- ログ（判別共用体） ---

export type HokutoLog =
  | ATWinLog
  | TenhaLog
  | TengekiLog
  | FakeZenchoLog
  | EffectHintLog
  | DenshoModeLog;

// 1. AT当選ログ

export interface ATWinLog {
  type: 'at-win';
  id: string;
  timestamp: number;
  gameCount: number;
  abeshiCount: number;
  trigger: 'kitei-abeshi' | 'rare-chokugeki';
  triggerYaku?: ChokugekiYaku;
}

export type ChokugekiYaku =
  | 'jaku-cherry'
  | 'kyou-cherry'
  | 'chance-me'
  | 'suika'
  | 'kakutei-cherry';

// 2. 天破の刻ログ

export interface TenhaLog {
  type: 'tenha';
  id: string;
  timestamp: number;
  gameCount: number;
  trigger: TenhaTriggerYaku;
  estimatedState: InternalState;
  duration: TenhaDuration;
}

export type TenhaDuration = 7 | 14 | 21 | 'infinite';

export type TenhaTriggerYaku =
  | 'jaku-cherry'
  | 'kyou-cherry'
  | 'suika'
  | 'chance-me'
  | 'shobu-zoroi'
  | 'kakutei-cherry';

export type InternalState = 'low' | 'normal' | 'high' | 'densho';

// 3. 天撃チャレンジログ（独立）

export interface TengekiLog {
  type: 'tengeki';
  id: string;
  timestamp: number;
  prepRareHit: boolean; // 準備中レア役
  games: [TengekiYaku, TengekiYaku, TengekiYaku, TengekiYaku]; // 0G, 1G, 2G, 3G
  result: 'success' | 'failure';
}

export type TengekiYaku =
  | 'hazure'
  | 'replay'
  | 'bell'
  | 'jaku-cherry'
  | 'kyou-cherry'
  | 'suika'
  | 'chance-me'
  | 'shobu-zoroi'
  | 'kakutei-cherry';

// 3. 前兆ログ

export type ZenchoCategory = 'shutter' | 'tenmei' | 'other';

export interface FakeZenchoLog {
  type: 'fake-zencho';
  id: string;
  timestamp: number;
  abeshiCount: number;
  zenchoCategory: ZenchoCategory;
  estimatedMode: HokutoMode | null;
}

export type HokutoMode = 'mode-a' | 'mode-b' | 'mode-c' | 'tengoku';

// 4. 演出示唆ログ

export interface EffectHintLog {
  type: 'effect-hint';
  id: string;
  timestamp: number;
  lampA?: LampState;
  lampB?: LampState;
  lampC?: LampState;
  trophy?: TrophyColor;
  pedestalColor?: 'normal' | 'gold';
  ledColor?: 'normal' | 'white-fast' | 'rainbow';
}

export interface LampState {
  color: 'white' | 'cyan' | 'gold' | 'purple' | 'yellow-green';
  pattern: 'solid' | 'blink';
  upperWhiteFlow?: boolean; // 上白流れ（上部サイドランプ水色のみ）
}

export type TrophyColor = 'bronze' | 'silver' | 'gold' | 'kirin' | 'rainbow';

// 5. 伝承モードログ

export interface DenshoModeLog {
  type: 'densho';
  id: string;
  timestamp: number;
  denshoType: 'short' | 'middle' | 'long';
  endState: 'low' | 'normal' | 'high';
}

// --- 推定結果 ---

export interface HokutoSettingAnalysis {
  setting1: number;
  setting2: number;
  setting3: number;
  setting4: number;
  setting5: number;
  setting6: number;
}

export interface ModeDistribution {
  modeA: number;
  modeB: number;
  modeC: number;
  tengoku: number;
}

// --- 天撃統計 ---

export interface TengekiStats {
  hazureTotal: number;
  hazureSuccess: number;
  overallTotal: number;
  overallSuccess: number;
}
