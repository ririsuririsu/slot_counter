import { useMemo, useState } from 'react';
import type {
  AtWinRoute,
  DarumaReplayCount,
  MonhanRiseMachine,
  MonhanRiseQuestCell,
  MonhanRiseQuestRow,
  MonhanRiseSettingAnalysis,
  RequiredPoint,
} from '../../types';
import { useMachineStore } from '../../stores/machineStore';
import { playHaptic } from '../../utils/haptic';
import {
  AT_ROUTE_INFO,
  DARUMA_COUNTS,
  POINT_COLOR,
  QUEST_CEILING,
  REQUIRED_POINTS,
  RIZE_ZONE_KEY,
  WEAK_RARE_KEY,
} from '../../data/monhanRiseDefinitions';
import {
  buildQuestGrid,
  calculateAllAnalyses,
  calculateRizeRate,
  combineAnalyses,
  getTopSetting,
} from '../../utils/monhanRiseEstimation';
import { MonhanRiseQuestGrid } from './MonhanRiseQuestGrid';
import type { QuestCellPosition } from './MonhanRiseQuestGrid';
import { MonhanRiseCountButton } from './MonhanRiseCountButton';
import { MonhanRiseModePath } from './MonhanRiseModePath';
import styles from './MonhanRiseInput.module.css';

/** カウンターボタンのアクセント色 */
const RIZE_ACCENT = '#ff9f0a';
const WEAK_RARE_ACCENT = '#64d2ff';
const DARUMA_ACCENT = '#64d2ff';

interface MonhanRiseInputProps {
  machine: MonhanRiseMachine;
}

/** グリッドのモーダルで選べる当選契機（クエスト当選は行送りで暗黙に決まる） */
const MODAL_ROUTES: AtWinRoute[] = ['cz', 'direct'];

/** 見出しに出す「その軸だけで見た推測設定」 */
function TopSettingBadge({ analysis }: { analysis: MonhanRiseSettingAnalysis }) {
  const top = getTopSetting(analysis);
  if (!top) return <span className={styles.headHint}>データ待ち</span>;
  return (
    <span className={styles.headHint}>
      推測 <strong className={styles.headSetting}>設定{top.setting}</strong>{' '}
      {top.probability.toFixed(0)}%
    </span>
  );
}

/** 選択中セルに対して何ができるか */
interface CellEditor {
  row: MonhanRiseQuestRow;
  col: number;
  cell: MonhanRiseQuestCell | null;
  /** quest=入力済みクエスト / route=CZ・直撃セル / empty=次に埋まる空きマス */
  kind: 'quest' | 'route' | 'empty';
  /** 削除対象の events 添字。削除できない場合は -1 */
  deleteIndex: number;
  /** 削除ボタンを押せるか（空きマスには消すものが無い） */
  canDelete: boolean;
  /** 先出しされた次行。ここに入力すると現在行がクエスト当選で締まる */
  isPending: boolean;
}

export function MonhanRiseInput({ machine }: MonhanRiseInputProps) {
  const [selected, setSelected] = useState<QuestCellPosition | null>(null);

  const incrementWeakRare = useMachineStore((s) => s.incrementMonhanRiseWeakRare);
  const decrementWeakRare = useMachineStore((s) => s.decrementMonhanRiseWeakRare);
  const incrementRize = useMachineStore((s) => s.incrementMonhanRiseRize);
  const decrementRize = useMachineStore((s) => s.decrementMonhanRiseRize);
  const addEvent = useMachineStore((s) => s.addMonhanRiseEvent);
  const insertEventAt = useMachineStore((s) => s.insertMonhanRiseEventAt);
  const updateEventAt = useMachineStore((s) => s.updateMonhanRiseEventAt);
  const deleteEventAt = useMachineStore((s) => s.deleteMonhanRiseEventAt);
  const undoLast = useMachineStore((s) => s.undoLastMonhanRiseEvent);

  const weakRare = machine.counters[WEAK_RARE_KEY] ?? 0;
  const rizeZone = machine.counters[RIZE_ZONE_KEY] ?? 0;
  const rizeRate = calculateRizeRate(weakRare, rizeZone);
  // 2つのボタンが独立したので、押し忘れると分子が分母を超えうる
  const rizeCountInvalid = rizeZone > weakRare;

  const analyses = useMemo(
    () => calculateAllAnalyses(weakRare, rizeZone, machine.events),
    [weakRare, rizeZone, machine.events]
  );
  // クエスト履歴グリッドは軸3(ポイントモード)と軸4(クエストテーブル)の両方を兼ねる
  const questAnalysis = useMemo(
    () => combineAnalyses([analyses.pointMode, analyses.questTable]),
    [analyses]
  );

  // 規定リプレイ回数ごとの記録数（ボタン内に出す）
  const darumaTally = useMemo(
    () =>
      machine.events.reduce<Record<number, number>>(
        (acc, e) =>
          e.type === 'daruma-hit'
            ? { ...acc, [e.count]: (acc[e.count] ?? 0) + 1 }
            : acc,
        {}
      ),
    [machine.events]
  );

  const baseRows = useMemo(
    () => buildQuestGrid(machine.events),
    [machine.events]
  );

  // 削除で空いたまま埋め直されていないセル（グリッド上は「！」）
  const missingPointCount = useMemo(
    () =>
      baseRows.reduce(
        (sum, row) => sum + row.cells.filter((c) => c.point === null).length,
        0
      ),
    [baseRows]
  );

  /**
   * 現在行にクエストが入っていれば「次の行」を1行だけ先出しする。
   * そこに入力した時点で、現在行は最後のクエストで当選したものとして締める。
   * 参考画像どおり、クエスト当選の行には契機セルを置かない運用に合わせている。
   */
  const pendingRowIndex = useMemo(() => {
    const active = baseRows[baseRows.length - 1];
    return active.cells.length > 0 ? active.index + 1 : -1;
  }, [baseRows]);

  const rows = useMemo(() => {
    if (pendingRowIndex < 0) return baseRows;
    return [
      ...baseRows,
      {
        index: pendingRowIndex,
        cells: [],
        route: null,
        routeEventIndex: -1,
        appendIndex: machine.events.length,
        active: false,
        isReset: false,
        cycleStartEventIndex: -1,
        rowStartIndex: machine.events.length,
      },
    ];
  }, [baseRows, pendingRowIndex, machine.events.length]);

  // 選択セルから「何が編集できるか」を決める
  const editor = useMemo((): CellEditor | null => {
    if (!selected) return null;
    const row = rows.find((r) => r.index === selected.row);
    if (!row) return null;

    const { col } = selected;
    const cell = row.cells[col];
    const isPending = row.index === pendingRowIndex;

    if (cell) {
      return {
        row,
        col,
        cell,
        kind: 'quest',
        deleteIndex: cell.eventIndex,
        // 値が既に空なら消すものが無い
        canDelete: cell.point !== null,
        isPending,
      };
    }

    const isRouteCell =
      col === row.cells.length &&
      row.route !== null &&
      row.route !== 'quest' &&
      row.cells.length < QUEST_CEILING;

    if (isRouteCell) {
      return {
        row,
        col,
        cell: null,
        kind: 'route',
        deleteIndex: row.routeEventIndex,
        canDelete: true,
        isPending,
      };
    }

    if (col !== row.cells.length) return null;

    return {
      row,
      col,
      cell: null,
      kind: 'empty',
      deleteIndex: -1,
      canDelete: false,
      isPending,
    };
  }, [selected, rows, pendingRowIndex]);

  const tap = (action: () => void) => () => {
    playHaptic();
    action();
  };

  /** 先出し行に入力する前に、現在行をクエスト当選で締める */
  const closeActiveRowIfPending = (target: CellEditor) => {
    if (target.isPending) addEvent({ type: 'at-hit', route: 'quest' });
  };

  const setQuestPoint = (target: CellEditor, point: RequiredPoint) => {
    if (target.kind === 'quest' && target.cell) {
      updateEventAt(target.cell.eventIndex, { type: 'quest', point });
    } else if (target.isPending) {
      closeActiveRowIfPending(target);
      addEvent({ type: 'quest', point });
    } else {
      if (target.row.cells.length >= QUEST_CEILING) return;
      insertEventAt(target.row.appendIndex, { type: 'quest', point });
    }
    setSelected(null);
  };

  // どのセルから選んでも「この行のAT当選契機」を設定する
  const setRoute = (target: CellEditor, route: AtWinRoute) => {
    if (target.isPending) {
      closeActiveRowIfPending(target);
      addEvent({ type: 'at-hit', route });
    } else if (target.row.routeEventIndex >= 0) {
      updateEventAt(target.row.routeEventIndex, { type: 'at-hit', route });
    } else {
      insertEventAt(target.row.appendIndex, { type: 'at-hit', route });
    }
    setSelected(null);
  };

  /**
   * クエストの削除は値を消すだけで枠は残す（後続のクエストがずれないように）。
   * AT当選契機のセルだけはイベントごと消す＝当選そのものの取り消し。
   */
  const removeAt = (target: CellEditor) => {
    if (target.kind === 'quest' && target.cell) {
      updateEventAt(target.cell.eventIndex, { type: 'quest', point: null });
    } else if (target.deleteIndex >= 0) {
      deleteEventAt(target.deleteIndex);
    }
    setSelected(null);
  };

  const addDarumaHit = (count: DarumaReplayCount) =>
    addEvent({ type: 'daruma-hit', count });

  /**
   * AT欄のタップで「リセット回 / 通常回」を切り替える。
   * 既定（1回目=リセット / 以降=通常）から外れたときだけ cycle-start を持たせ、
   * 既定に戻ったらイベントごと捨てて余計な記録を残さない。
   */
  const toggleReset = (row: MonhanRiseQuestRow) => {
    playHaptic();
    const next = !row.isReset;
    const isDefault = next === (row.index === 1);

    if (row.cycleStartEventIndex >= 0) {
      if (isDefault) {
        deleteEventAt(row.cycleStartEventIndex);
      } else {
        updateEventAt(row.cycleStartEventIndex, {
          type: 'cycle-start',
          reset: next,
        });
      }
      return;
    }
    if (!isDefault) {
      insertEventAt(row.rowStartIndex, { type: 'cycle-start', reset: next });
    }
  };

  return (
    <div className={styles.container}>
      {/* --- 軸1: ライズゾーン --- */}
      <div className={`section-header ${styles.sectionHead}`}>
        <span>ライズゾーン</span>
        <span className={styles.headMeta}>
          <span className={styles.headRate}>
            {rizeRate !== null ? `${rizeRate.toFixed(1)}%` : '—'}
          </span>
          <TopSettingBadge analysis={analyses.rize} />
        </span>
      </div>
      {rizeCountInvalid && (
        <p className={styles.warn}>
          ライズゾーン({rizeZone})が弱レア役({weakRare})を超えている。
          当選時に「弱レア役」を押し忘れている可能性がある（この状態では軸1の推測を行わない）。
        </p>
      )}
      <div className={styles.bigButtons}>
        <MonhanRiseCountButton
          count={rizeZone}
          label="ライズゾーン当選"
          accent={RIZE_ACCENT}
          filled
          onPress={incrementRize}
        />
        <MonhanRiseCountButton
          count={weakRare}
          label="弱レア役"
          accent={WEAK_RARE_ACCENT}
          onPress={incrementWeakRare}
        />
      </div>
      <div className={styles.undoRow}>
        <button
          type="button"
          className={styles.undoBtn}
          onClick={tap(decrementRize)}
        >
          − ライズゾーン
        </button>
        <button
          type="button"
          className={styles.undoBtn}
          onClick={tap(decrementWeakRare)}
        >
          − 弱レア役
        </button>
      </div>

      {/* --- 軸3/軸4: クエスト履歴グリッド --- */}
      <div className={`section-header ${styles.sectionHead}`}>
        <span>クエスト履歴</span>
        <TopSettingBadge analysis={questAnalysis} />
      </div>
      <MonhanRiseQuestGrid
        rows={rows}
        selected={selected}
        pendingRowIndex={pendingRowIndex}
        onSelect={(position) => {
          playHaptic();
          setSelected((prev) =>
            prev && prev.row === position.row && prev.col === position.col
              ? null
              : position
          );
        }}
        onToggleReset={toggleReset}
      />


      {editor && (
        <div className={styles.editor}>
          <div className={styles.editorHead}>
            <span className={styles.editorTitle}>
              {editor.row.index}回 / {editor.col + 1}回目
            </span>
            <button
              type="button"
              className={styles.editorClose}
              onClick={() => setSelected(null)}
            >
              閉じる
            </button>
          </div>

          {editor.isPending && (
            <p className={styles.editorNote}>
              ここに入力すると、{editor.row.index - 1}回目は
              {baseRows[baseRows.length - 1].cells.length}
              回目のクエストで当選として締められる。
            </p>
          )}

          <div className={styles.pillGrid}>
            {REQUIRED_POINTS.map((point) => (
              <button
                key={point}
                type="button"
                className={`${styles.pill} ${
                  editor.cell?.point === point ? styles.pillActive : ''
                }`}
                style={{ borderColor: POINT_COLOR[point] }}
                onClick={tap(() => setQuestPoint(editor, point))}
              >
                {point}pt
              </button>
            ))}
          </div>

          <div className={styles.routeGrid}>
            {MODAL_ROUTES.map((route) => {
              const info = AT_ROUTE_INFO[route];
              return (
                <button
                  key={route}
                  type="button"
                  className={`${styles.routeBtn} ${
                    editor.row.route === route ? styles.routeBtnActive : ''
                  }`}
                  style={{ borderColor: info.color, color: info.color }}
                  onClick={tap(() => setRoute(editor, route))}
                >
                  {info.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.deleteBtn}
            disabled={!editor.canDelete}
            onClick={tap(() => removeAt(editor))}
          >
            {editor.kind === 'route' ? 'AT当選を取り消す' : '削除'}
          </button>

          {editor.kind === 'empty' &&
            !editor.isPending &&
            editor.row.cells.length >= QUEST_CEILING && (
              <p className={styles.editorNote}>
                {QUEST_CEILING}回目はAT間クエスト天井のため、これ以上は追加できない。
              </p>
            )}
        </div>
      )}

      {missingPointCount > 0 && (
        <p className={styles.warn}>
          ！ 規定pt未入力のクエストが{missingPointCount}件ある（！付きのセルは手前が未入力）。
          クエスト回数には数えるが、ポイントモードの推測には使わない。
        </p>
      )}

      <MonhanRiseModePath
        events={machine.events}
        weakRare={weakRare}
        rizeZone={rizeZone}
      />

      {/* --- 軸2: アイルーだるま落とし --- */}
      <div className={`section-header ${styles.sectionHead}`}>
        <span>アイルーだるま落とし</span>
        <TopSettingBadge analysis={analyses.daruma} />
      </div>
      <div className={styles.tallyGrid}>
        {DARUMA_COUNTS.map((count) => (
          <MonhanRiseCountButton
            key={count}
            count={darumaTally[count] ?? 0}
            label={`${count}回`}
            size="small"
            accent={DARUMA_ACCENT}
            onPress={() => addDarumaHit(count)}
          />
        ))}
      </div>

      <button type="button" className={styles.undoAllBtn} onClick={tap(undoLast)}>
        直前の記録を取り消す
      </button>
    </div>
  );
}
