// ========================================
// スマスロ リコリス・リコイル 型定義
// 詳細仕様は docs/lycoris-recoil-spec.md を参照
// ========================================

/**
 * 変換高確への移行の観測。移行は液晶左下の帯で分かる。
 * 'moved'   … 帯が出た（移行）
 * 'stay'    … 帯が出なかった
 * 'unknown' … すでに高確中・前兆中などで判別できない（尤度に入れない）
 */
export type LycorisKoukakuResult = 'moved' | 'stay' | 'unknown';

/**
 * 変換高確の抽選がある規定ゲーム数（AT間）。グリッドの列にするもの。
 * 150G だけ設定差があり、50G・450G（どちらも50%）は帯の見え方の確認に使う。
 * 300G は移行濃厚、650G は 25% で設定差なしなので列に置かない。
 */
export type LycorisKoukakuGame = 50 | 150 | 450;

/** CZの抽選がある規定ゲーム数（AT間）。0G は AT 終了直後の即前兆 */
export type LycorisCzZoneGame = 0 | 100 | 250 | 400 | 600 | 750;

/**
 * CZ当選契機。
 * 'zone'       … 規定ゲーム数（game が LycorisCzZoneGame のいずれか）
 * 'convert'    … 小役変換
 * 'stamp'      … スタンプ12個
 * 'cz-ceiling' … CZ間天井
 * 'other'      … 不明・その他
 */
export type LycorisCzTrigger = 'zone' | 'convert' | 'stamp' | 'cz-ceiling' | 'other';

/**
 * AT突入経路。
 * 'cz'            … CZ成功
 * 'direct'        … 直撃（CZ非経由・天井以外）
 * 'at-ceiling'    … AT間天井（850G）
 * 'short-ceiling' … 短縮天井（250/400/600/750G）
 */
export type LycorisAtRoute = 'cz' | 'direct' | 'at-ceiling' | 'short-ceiling';

/** 短縮天井のゲーム数 */
export type LycorisShortCeiling = 250 | 400 | 600 | 750;

/** ラッシュの種類。私服の終了画面の意味がこれで変わる */
export type LycorisRush = 'chisato' | 'takina';

/**
 * ATの終わり方。次のサイクルの天井と、天井短縮の軸に入るかを決める。
 * 'rush20-end'    … ラッシュ20で駆け抜け（短縮濃厚・設定不問）
 * 'rush50-end'    … ラッシュ50終了（ここで天井短縮が抽選される＝軸に入る）
 * 'upper-cz-fail' … 上位CZ失敗（AT間250G）
 * 'rush-w-end'    … ラッシュW終了
 */
export type LycorisRushOutcome = 'rush20-end' | 'rush50-end' | 'upper-cz-fail' | 'rush-w-end';

/** 初当り時のプロローグ */
export type LycorisPrologue = 'ep1' | 'ep2' | 'ep3' | 'ep4';

/**
 * AT中のエピソードボーナス。ラッシュとラッシュWで一覧が違うので接頭辞で分ける。
 * EP3 の示唆は**同一ラッシュ内の1回目の選択時だけ**有効。
 */
export type LycorisEpisode =
  | 'rush-ep1'
  | 'rush-ep2'
  | 'rush-ep3'
  | 'rush-ep4'
  | 'w-ep1'
  | 'w-ep2'
  | 'w-ep3'
  | 'w-ep4';

/** ラッシュ終了画面 */
export type LycorisEndScreen =
  | 'takinaUniform'
  | 'chisatoUniform'
  | 'takinaCasual'
  | 'chisatoCasual'
  | 'dressCode'
  | 'oshiage'
  | 'robota'
  | 'hawaii';

/** サミートロフィー */
export type LycorisTrophy = 'bronze' | 'silver' | 'gold' | 'kirin' | 'rainbow';

// --- イベント ---
// game はすべてサブ液晶のAT間ゲーム数。CZ失敗ではリセットされず、AT当選でサイクルが切れる。

/** 規定ゲーム数での変換高確移行の抽選 */
export interface LycorisKoukakuZoneEvent {
  type: 'koukaku-zone';
  game: LycorisKoukakuGame;
  result: LycorisKoukakuResult;
}

/** CZ当選（推定の軸には入らない。参考表示と天井短縮の打ち切り位置に使う） */
export interface LycorisCzEvent {
  type: 'cz';
  game: number;
  trigger: LycorisCzTrigger;
}

/** 短縮告知（スタンプ前兆失敗時など）。告知後はサブ液晶に短縮天井までのG数が出る */
export interface LycorisShortNoticeEvent {
  type: 'short-notice';
  game: number;
  ceiling: LycorisShortCeiling;
}

/**
 * AT当選。**このイベントでサイクルが締まる**（次のサイクルは0Gから）。
 * 当選時に分かるのは game / route / prologue まで。残りはAT終了後に追記する。
 * 経路は解釈せず生のまま持つ。どの軸に入れるかは推定側が決める。
 */
export interface LycorisAtEvent {
  type: 'at';
  /** AT当選時のサブ液晶G。通常G数の合計はここから出る */
  game: number;
  route: LycorisAtRoute;
  /** route='short-ceiling' のときの短縮天井。それ以外は null */
  shortCeiling: LycorisShortCeiling | null;
  prologue: LycorisPrologue | null;
  rush: LycorisRush | null;
  /** null はAT中（終了情報が未入力） */
  outcome: LycorisRushOutcome | null;
  /** 選択した順。EP3 の有効判定に順序を使う */
  episodes: LycorisEpisode[];
  endScreen: LycorisEndScreen | null;
  trophy: LycorisTrophy | null;
}

export type LycorisEventBody =
  | LycorisKoukakuZoneEvent
  | LycorisCzEvent
  | LycorisShortNoticeEvent
  | LycorisAtEvent;

/** 配列順が記録順。id と timestamp はストア側で採番する */
export type LycorisEvent = LycorisEventBody & {
  id: string;
  timestamp: number;
};

/** コンポーネントから渡す入力値（id / timestamp はストアが付ける） */
export type LycorisEventInput = LycorisEventBody;

/** 保存済みの AT（id・時刻つき）。サイクルの締めと示唆の持ち主 */
export type LycorisStoredAtEvent = Extract<LycorisEvent, { type: 'at' }>;

// --- 推定結果 ---

/** 設定判別結果（設定1〜6） */
export interface LycorisSettingAnalysis {
  setting1: number;
  setting2: number;
  setting3: number;
  setting4: number;
  setting5: number;
  setting6: number;
}

/**
 * グリッドのセル（＝ある規定ゲーム数の枠）。
 * CZ列は「通過したのに空」がそのままCZなしの観測になる（攻殻機動隊と同じ）。
 * 高確列は帯を見落としやすいので、押した結果だけを使い、空は「未入力」として扱う。
 */
export interface LycorisGridCell {
  game: number;
  kind: 'cz' | 'koukaku';
  /** CZ列: このG数のゾーンからCZ当選を記録したか */
  czWon: boolean;
  /** 高確列: 帯の結果。null は未入力 */
  koukaku: LycorisKoukakuResult | null;
  /** 対応する記録の添字。無ければ -1 */
  eventIndex: number;
  /** まだそのゲーム数に到達していない */
  unreached: boolean;
}

/** 1サイクル（AT間）。AT当選で締まる */
export interface LycorisCycle {
  /** 1始まりの通し番号 */
  index: number;
  /** 観測を始めたG。1行目は打ち始めのG、2行目以降は0 */
  startGame: number;
  /** AT以外の記録。G数順（同じGは記録順） */
  entries: { event: LycorisEvent; eventIndex: number }[];
  /** 規定ゲーム数の固定列 */
  cells: LycorisGridCell[];
  /** 固定列に入らない記録（規定G数以外のCZ・短縮告知）。グリッドの「他」列に出す */
  others: { event: LycorisEvent; eventIndex: number }[];
  /** このサイクルを締めたAT。null は進行中 */
  at: LycorisStoredAtEvent | null;
  /** at の添字。進行中なら -1 */
  atEventIndex: number;
  /** 直前のAT。1行目は null（前回の終わり方が分からない） */
  previousAt: LycorisStoredAtEvent | null;
  /** そのサイクルで到達したG。記録済みのG数を下回らない */
  reachedGame: number;
  /** この行の通常G数（到達G − 開始G） */
  normalGames: number;
  /** この行に記録を足すときの挿入先 */
  insertIndex: number;
  active: boolean;
}

export type LycorisAxisId =
  | 'bell'
  | 'koukakuWeak'
  | 'koukaku150'
  | 'direct'
  | 'shortCeiling';

/** 事後確率に入れる1軸 */
export interface LycorisAxis {
  id: LycorisAxisId;
  label: string;
  /** 分子（ベル回数・移行回数・直撃回数・短縮を確認した回数） */
  hit: number;
  /** 分母（通常G・観測回数・対象サイクル数） */
  total: number;
  /** 分母の単位 */
  unit: 'games' | 'events' | 'cycles';
  /** 設定1〜6の対数尤度（定数項は省略） */
  logLikelihoods: number[];
  /** この軸だけで見た事後確率 */
  posterior: LycorisSettingAnalysis;
  /** 観測が無い・入力が矛盾しているなどで推定に使っていない */
  usable: boolean;
  warning: string | null;
}

/** 示唆の強さ。'constraint' は濃厚で、推定の制約に入っている */
export type LycorisHintStrength = 'default' | 'weak' | 'strong' | 'constraint' | 'none';

export interface LycorisHintTally {
  category: 'prologue' | 'episode' | 'endScreen' | 'trophy';
  /** 同じ画面でも示唆が変わるもの（私服）は別の行にする */
  key: string;
  label: string;
  hint: string;
  strength: LycorisHintStrength;
  count: number;
  /** 出現したサイクル番号 */
  cycles: number[];
}

/** 参考表示する実測値（事後確率には入れない） */
export interface LycorisReferenceRate {
  id: string;
  label: string;
  hit: number;
  total: number;
  /** 表示用の基準値（例: '1/328.8'） */
  setting1: string;
  setting6: string;
  note?: string;
}

export interface LycorisAnalysis {
  cycles: LycorisCycle[];
  /** 通常G数の合計 */
  normalGames: number;
  setting: LycorisSettingAnalysis;
  axes: LycorisAxis[];
  /** 終了画面・トロフィーの「濃厚」で除外した設定 */
  excludedSettings: number[];
  /** 濃厚どうしが矛盾した（積集合が空）。制約を外して推定している */
  settingConflict: boolean;
  hints: LycorisHintTally[];
  reference: LycorisReferenceRate[];
}
