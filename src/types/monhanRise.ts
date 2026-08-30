// ========================================
// スマスロ モンスターハンターライズ 型定義
// 詳細仕様は docs/monhan-rise-spec.md を参照
// ========================================

// --- 軸1: ライズゾーン ---

/**
 * カウンター状態
 * キー: 'weakRare'（通常時の弱レア役 成立数） | 'rizeZone'（うちライズゾーン当選数）
 */
export interface MonhanRiseCounterState {
  [counterId: string]: number;
}

// --- 軸2: アイルーだるま落とし ---

/** 規定リプレイ回数（機種仕様: 40/80/120/160/200） */
export type DarumaReplayCount = 40 | 80 | 120 | 160 | 200;

/** 打ち切り時に到達済みだった区切り（未当選のまま有利区間が切れた場合） */
export type DarumaReachedCount = 0 | 40 | 80 | 120 | 160;

// --- 軸3: ポイントモード ---

/** ポイントモード（観測不可・推定対象） */
export type PointMode = 'A' | 'B' | 'C' | 'D';

/** 規定カムラポイント（機種仕様: 100〜600） */
export type RequiredPoint = 100 | 200 | 300 | 400 | 500 | 600;

// --- 軸4: クエストテーブル ---

/** クエストテーブル（観測不可・推定対象） */
export type QuestTable = 'A' | 'B' | 'heavenPrep' | 'heaven';

/**
 * AT当選の契機。
 * 'quest'  … そのサイクル最後のクエストで当選（クエストテーブルが当たった）
 * 'cz'     … CZ成功で当選（クエストテーブルは当たっていない＝右側打ち切り）
 * 'direct' … レア役からの直撃（同上）
 */
export type AtWinRoute = 'quest' | 'cz' | 'direct';

// --- イベント（軸2〜4 + リセット） ---

// リセットはAT回ごとの二値（リセットスタート回 / 通常回）としてグリッドのAT欄で入力する。

/** アイルーだるま落とし当選 */
export interface MonhanRiseDarumaHitEvent {
  type: 'daruma-hit';
  id: string;
  timestamp: number;
  count: DarumaReplayCount;
}

/** だるま落とし未当選のまま有利区間が切れた（右側打ち切り） */
export interface MonhanRiseDarumaCensorEvent {
  type: 'daruma-censor';
  id: string;
  timestamp: number;
  /** ここまでは未当選が確定している区切り */
  reached: DarumaReachedCount;
}

/**
 * クエスト派生（規定pt到達）。
 * point が null は「クエストは発生したが規定ptが未入力」の状態。
 * セルを削除しても後続がずれないよう、削除は値を null にするだけで枠は残す。
 */
export interface MonhanRiseQuestEvent {
  type: 'quest';
  id: string;
  timestamp: number;
  point: RequiredPoint | null;
}

/**
 * AT当選。
 * 「何回目のクエストだったか」は直前の reset / at-hit 以降の quest 件数から導出するため
 * ここには持たせない（グリッド入力と二重管理にならないようにする）。
 */
export interface MonhanRiseAtHitEvent {
  type: 'at-hit';
  id: string;
  timestamp: number;
  route: AtWinRoute;
}

/**
 * ATサイクルの開始種別。既定（1回目=リセット / 2回目以降=通常）から
 * 変更したときだけ、その行の先頭に置かれる。
 */
export interface MonhanRiseCycleStartEvent {
  type: 'cycle-start';
  id: string;
  timestamp: number;
  /** true=リセットスタート回 / false=通常回 */
  reset: boolean;
}

export type MonhanRiseEvent =
  | MonhanRiseDarumaHitEvent
  | MonhanRiseDarumaCensorEvent
  | MonhanRiseQuestEvent
  | MonhanRiseAtHitEvent
  | MonhanRiseCycleStartEvent;

/**
 * イベントの入力値。id と timestamp はストア側で採番するため、
 * 呼び出し側（コンポーネント）は観測した内容だけを渡す。
 */
export type MonhanRiseEventInput =
  | Omit<MonhanRiseDarumaHitEvent, 'id' | 'timestamp'>
  | Omit<MonhanRiseDarumaCensorEvent, 'id' | 'timestamp'>
  | Omit<MonhanRiseQuestEvent, 'id' | 'timestamp'>
  | Omit<MonhanRiseAtHitEvent, 'id' | 'timestamp'>
  | Omit<MonhanRiseCycleStartEvent, 'id' | 'timestamp'>;

// --- 設定推測結果 ---

/** 設定判別結果（設定1〜6） */
export interface MonhanRiseSettingAnalysis {
  setting1: number;
  setting2: number;
  setting3: number;
  setting4: number;
  setting5: number;
  setting6: number;
}

/** グリッドのセル1つ（＝1回のクエスト） */
export interface MonhanRiseQuestCell {
  /** null は規定pt未入力（＝削除された枠） */
  point: RequiredPoint | null;
  /** events 配列上の添字。タップ編集で参照する */
  eventIndex: number;
  /**
   * 手前が未入力で、ここまでの並びが繋がっていない。
   *
   * 行の中は「すぐ手前のセルが空か」で判断する。
   * 行をまたぐ場合は「直前の行がまるごと空だったか」で判断する
   * （行の末尾が1つ空いているだけなら、その行に値は残っているので警告しない）。
   * クエストが0回の行（CZ・直撃で即当選）は履歴の欠落ではないので判定に使わない。
   * リセット回は並びが仕切り直しになるため常に false。
   */
  precededByGap: boolean;
}

/** クエスト履歴グリッドの1行（＝ AT当選までの1サイクル） */
export interface MonhanRiseQuestRow {
  /** 1始まりの通し番号 */
  index: number;
  /** そのサイクルで消化したクエスト（横方向） */
  cells: MonhanRiseQuestCell[];
  /** AT当選契機。null は AT未当選のまま終わった行（進行中 or リセットで打ち切り） */
  route: AtWinRoute | null;
  /** at-hit イベントの添字。route が null なら -1 */
  routeEventIndex: number;
  /** この行の末尾に追記するときの挿入先添字 */
  appendIndex: number;
  /** 現在入力中の行 */
  active: boolean;
  /** リセットスタート回か（既定: 1回目のみ true） */
  isReset: boolean;
  /** この行の cycle-start イベントの添字。既定のままなら -1 */
  cycleStartEventIndex: number;
  /** この行に属する最初のイベントの添字（cycle-start の挿入先） */
  rowStartIndex: number;
}

/** 軸ごとの推測結果と統合結果 */
export interface MonhanRiseAnalysisBreakdown {
  /** 軸1: 弱レア役からのライズゾーン当選率 */
  rize: MonhanRiseSettingAnalysis;
  /** 軸2: アイルーだるま落としの規定リプレイ回数 */
  daruma: MonhanRiseSettingAnalysis;
  /** 軸3: ポイントモード移行 */
  pointMode: MonhanRiseSettingAnalysis;
  /** 軸4: クエストテーブル移行 */
  questTable: MonhanRiseSettingAnalysis;
  /** 4軸統合 */
  combined: MonhanRiseSettingAnalysis;
}
