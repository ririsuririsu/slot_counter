// ========================================
// スマスロ 攻殻機動隊 型定義
// 詳細仕様は docs/kokaku-spec.md を参照
// ========================================

/**
 * 殲滅モード（観測不可・推定対象）。
 * reset は設定変更時の開始状態専用で、遷移先には**ならない**。
 */
export type KokakuMode = 'reset' | 'normalA' | 'normalB' | 'normalC' | 'normalD';

/** 殲滅ZONEのマスの色。CZ当選期待度が変わる（設定差あり） */
export type KokakuZoneColor =
  | 'white'
  | 'blue'
  | 'green'
  | 'red'
  | 'purple'
  | 'gold'
  | 'rainbow';

/** CZの種別 */
export type KokakuCzType = 'sam' | 'tachikoma';

/**
 * AT突入経路。
 * 'cz'      … CZ成功（視覚HACKでの救済を含む）
 * 'direct'  … 殲滅ZONEからのAT直撃
 * 'ceiling' … AT間999G天井
 */
export type KokakuAtRoute = 'cz' | 'direct' | 'ceiling';

/**
 * 画面カタログ（どの一覧の画面か）。画面IDから決まる。
 *
 * 'cz-end' … CZ終了時にそのまま出る画面（青空・オペ子など）
 * 'window' … ウインドウ。CZ終了時のPUSH押下／AT終了／裏コマンドで出る一覧（素子・アオイなど）
 */
export type KokakuScreenContext = 'cz-end' | 'window';

/**
 * **どの場面で見たか**。カタログとは別軸で、ユーザーが選ぶ。
 * ウインドウは3通りの出し方があり、どれで見たのかが記録の裏取りに要る。
 *
 * 'cz-end'  … CZ終了画面（そのまま）
 * 'cz-push' … CZ終了時にPUSHを押して出したウインドウ
 * 'at-end'  … AT終了時のウインドウ
 * 'ura'     … 裏コマンドで出したウインドウ
 */
export type KokakuScreenOccasion = 'cz-end' | 'cz-push' | 'at-end' | 'ura';

/**
 * 画面の種類。CZ終了画面とウインドウで**同名のキャラでも示唆が違う**ため、
 * 同じidにまとめず `cz` 接頭辞で系統を分けている
 * （例: ウインドウのトグサ＝奇数示唆 / CZ終了のトグサ＝高設定示唆（弱））。
 */
export type KokakuScreen =
  // ウインドウ（CZ終了PUSH / AT終了 / 裏コマンド）
  | 'motoko'
  | 'motokoBattle'
  | 'togusa'
  | 'batou'
  | 'poker'
  | 'motokoBack'
  | 'koan9'
  | 'cyberMotoko'
  | 'aoi'
  | 'secondGig'
  // CZ終了画面
  | 'czSky'
  | 'czSkyLaughingMan'
  | 'czSkyKoan9'
  | 'czOpeko'
  | 'czTachikoma'
  | 'czTogusa'
  | 'czIshikawa'
  | 'czMotoko'
  | 'czVacance'
  | 'czAllStars';

// --- イベント ---

/**
 * CZサイクルの開始種別。既定（1回目=リセット回 / 2回目以降=通常回）から
 * 変更したときだけ、その行の先頭に置かれる。
 */
export interface KokakuCycleStartEvent {
  type: 'cycle-start';
  /** true=設定変更後の最初のサイクル（モード=リセット確定） */
  reset: boolean;
}

/**
 * 規定ゲーム数契機の殲滅ZONE。game は KOKAKU_ZONE_GAMES のいずれか。
 * **モード推測の主観測**。色はモードと無関係なので尤度には使わない。
 */
export interface KokakuZoneEvent {
  type: 'zone';
  game: number;
  /** null は色が未入力（削除された枠）。モード尤度には影響しない */
  color: KokakuZoneColor | null;
  /** このゾーンからCZに当選したか */
  czWon: boolean;
}

/**
 * タチコマSAMゾーン（200G / 400G）。殲滅ZONEではないので
 * **モード推測の尤度には入れない**。CZ「タチコマの家出」の抽選ゾーン。
 */
export interface KokakuTachikomaZoneEvent {
  type: 'tachikoma-zone';
  game: 200 | 400;
  czWon: boolean;
}

/**
 * 殲滅ポイント（撃破数）契機の殲滅ZONE。規定ゲーム数ゾーンではないため
 * **モード推測の尤度には入れない**。
 */
export interface KokakuZonePointEvent {
  type: 'zone-point';
  color: KokakuZoneColor | null;
  czWon: boolean;
}

/**
 * 終了画面／裏コマンド画面。裏コマンド（通常時77G経過＋全リール停止後に
 * 左ボタン7回押下）で任意のタイミングに出せるため、サイクル途中にも置ける。
 */
export interface KokakuScreenEvent {
  type: 'screen';
  /** どの場面で見たか。カタログは screen から引けるのでここには持たない */
  occasion: KokakuScreenOccasion;
  screen: KokakuScreen;
}

/**
 * CZサイクルの終端。1サイクル＝1モード滞在区間なので、
 * このイベントが次のサイクルのモード抽選テーブルを決める。
 *
 *   at !== null                        → AT後の振り分け（全設定共通）
 *   at === null かつ cz?.success===false → CZ後の振り分け（設定差あり）
 *   cz === null かつ at === null        → 打ち切り。系列はここで切れる
 */
export interface KokakuCycleEndEvent {
  type: 'cycle-end';
  /** CZに入ったならその種別と結果。入らずに終わったら null */
  cz: {
    czType: KokakuCzType;
    /** CZ自体の結果（視覚HACKでの救済は含めない） */
    success: boolean;
    /** CZ失敗時のみ意味を持つ。true=視覚HACKで成功へ書き換わった */
    visualHack: boolean | null;
  } | null;
  /** ATに入ったならその経路 */
  at: KokakuAtRoute | null;
  /**
   * このサイクルを終えた時点の通常時ゲーム数。
   * CZ当選ゾーンがあればそのゲーム数と一致する。
   * 未当選のまま打ち切った場合は右側打ち切りの観測として効く。
   */
  endGame: number;
}

export type KokakuEventBody =
  | KokakuCycleStartEvent
  | KokakuZoneEvent
  | KokakuTachikomaZoneEvent
  | KokakuZonePointEvent
  | KokakuScreenEvent
  | KokakuCycleEndEvent;

/** 配列順が遊技順。id と timestamp はストア側で採番する */
export type KokakuEvent = KokakuEventBody & {
  id: string;
  timestamp: number;
};

/** コンポーネントから渡す入力値（id / timestamp はストアが付ける） */
export type KokakuEventInput = KokakuEventBody;

// --- 推定結果 ---

/** 設定判別結果（設定1〜6） */
export interface KokakuSettingAnalysis {
  setting1: number;
  setting2: number;
  setting3: number;
  setting4: number;
  setting5: number;
  setting6: number;
}

/** グリッドのセル1つ（＝ある規定ゲーム数の枠） */
export interface KokakuZoneCell {
  /** 列のゲーム数 */
  game: number;
  /** 'zone'（殲滅ZONE）/ 'tachikoma'（タチコマSAMゾーン） */
  kind: 'zone' | 'tachikoma';
  /** 殲滅ZONEが発生したか。false は「通過したが非発生」 */
  occurred: boolean;
  /** 発生時の色。タチコマ・未入力は null */
  color: KokakuZoneColor | null;
  /** このゾーンからCZに当選したか */
  czWon: boolean;
  /** events 配列上の添字。未発生なら -1 */
  eventIndex: number;
  /** まだそのゲーム数に到達していない（入力不可） */
  unreached: boolean;
}

/** 殲滅ポイント契機のゾーン（グリッド右端のpt列） */
export interface KokakuPointCell {
  color: KokakuZoneColor | null;
  czWon: boolean;
  eventIndex: number;
}

/** 殲滅ZONE履歴グリッドの1行（＝1 CZサイクル＝1モード滞在区間） */
export interface KokakuCycleRow {
  /** 1始まりの通し番号 */
  index: number;
  /** 規定ゲーム数ごとの枠（列固定） */
  cells: KokakuZoneCell[];
  /** 殲滅ポイント契機のゾーン */
  pointCells: KokakuPointCell[];
  /** この行のモードを示唆する画面。前サイクルの終了時に見たものもここに入る */
  screens: { screen: KokakuScreen; occasion: KokakuScreenOccasion; eventIndex: number }[];
  /** 行の終わり方。null は進行中 */
  end: KokakuCycleEndEvent | null;
  /** cycle-end イベントの添字。進行中なら -1 */
  endEventIndex: number;
  /** この行の末尾に追記するときの挿入先添字 */
  appendIndex: number;
  /** そのサイクルで到達したゲーム数 */
  reachedGame: number;
  /** 現在入力中の行 */
  active: boolean;
  /** リセット回か（既定: 1回目のみ true） */
  isReset: boolean;
  /** この行の cycle-start イベントの添字。既定のままなら -1 */
  cycleStartEventIndex: number;
  /** この行に属する最初のイベントの添字（cycle-start の挿入先） */
  rowStartIndex: number;
}

/** 参考表示する実測値（設定推測の事後確率には入れない軸） */
export interface KokakuObservedRate {
  id: string;
  label: string;
  /** 分子 */
  hit: number;
  /** 分母。0 なら未計測 */
  total: number;
  /** 設定1の基準値（%）。null は基準値なし */
  setting1: number | null;
  /** 設定6の基準値（%） */
  setting6: number | null;
  note?: string;
}

/** モード推測・設定推測の結果まとめ */
export interface KokakuAnalysis {
  /** CZ後のモード移行率による設定事後分布（唯一の設定推測軸） */
  setting: KokakuSettingAnalysis;
  /** 設定示唆で除外された設定（アオイ金枠＝設定4以上濃厚 など） */
  excludedSettings: number[];
  /** 記録した設定示唆どうしが矛盾している（積集合が空）。制約を外して推定している */
  settingConflict: boolean;
  /** 表示用の実測値 */
  observed: KokakuObservedRate[];
  /** 尤度に使えたCZ失敗の回数（設定推測のサンプル数） */
  czFailCount: number;
}
