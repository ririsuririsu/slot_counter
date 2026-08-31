import type { MonhanRiseQuestRow } from '../../types';
import {
  AT_ROUTE_INFO,
  POINT_COLOR,
  QUEST_CEILING,
} from '../../data/monhanRiseDefinitions';
import styles from './MonhanRiseQuestGrid.module.css';

/** グリッド上の位置。col は0始まり */
export interface QuestCellPosition {
  row: number;
  col: number;
}

interface MonhanRiseQuestGridProps {
  rows: MonhanRiseQuestRow[];
  selected: QuestCellPosition | null;
  /** 先出しされた次行の番号。-1 なら無し */
  pendingRowIndex: number;
  onSelect: (position: QuestCellPosition) => void;
  /** AT欄をタップして「リセット回 / 通常回」を切り替える */
  onToggleReset: (row: MonhanRiseQuestRow) => void;
}

const COLUMNS = Array.from({ length: QUEST_CEILING }, (_, i) => i);

/**
 * 縦＝AT当選ごとのサイクル / 横＝そのサイクル内のクエスト回数（最大7回目＝AT間天井）。
 * セルは各クエストの規定pt。クエスト以外での当選（CZ成功・直撃）は
 * 最後のクエストの次の列に契機セルとして置く。
 * セルをタップすると編集パネルが開く。
 */
export function MonhanRiseQuestGrid({
  rows,
  selected,
  pendingRowIndex,
  onSelect,
  onToggleReset,
}: MonhanRiseQuestGridProps) {
  return (
    <div className={styles.scroller}>
      <table className={styles.grid}>
        <thead>
          <tr>
            <th className={styles.corner} scope="col">
              AT
            </th>
            {COLUMNS.map((i) => (
              <th key={i} className={styles.colHead} scope="col">
                {i + 1}回目
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const routeInfo = row.route ? AT_ROUTE_INFO[row.route] : null;
            // CZ成功・直撃はクエスト当選ではないので独立したセルとして描く
            const routeColumn =
              row.route && row.route !== 'quest' && row.cells.length < QUEST_CEILING
                ? row.cells.length
                : -1;

            return (
              <tr
                key={row.index}
                className={
                  row.active
                    ? styles.activeRow
                    : row.index === pendingRowIndex
                      ? styles.pendingRow
                      : undefined
                }
              >
                <th className={styles.rowHeadCell} scope="row">
                  {/*
                    先出し行はまだイベントを1つも持たないため、
                    cycle-start の置き場所が無く、切り替えると手前の行に効いてしまう。
                    最初のセルを入力して行が確定してから切り替えられるようにする。
                  */}
                  <button
                    type="button"
                    className={`${styles.rowHead} ${row.isReset ? styles.rowHeadReset : ''}`}
                    disabled={row.index === pendingRowIndex}
                    onClick={() => onToggleReset(row)}
                    aria-pressed={row.isReset}
                    aria-label={`${row.index}回目 ${row.isReset ? 'リセット回' : '通常回'}（切り替え）`}
                  >
                    <span className={styles.rowNum}>{row.index}回</span>
                    <span className={styles.rowKind}>
                      {row.isReset ? 'リセット' : '通常'}
                    </span>
                  </button>
                </th>
                {COLUMNS.map((col) => {
                  const cell = row.cells[col];
                  const isRouteCell = col === routeColumn;
                  // 入力済みセルと「次に埋まる1マス」だけ編集できる
                  const editable =
                    cell !== undefined || isRouteCell || col === row.cells.length;
                  const isSelected =
                    selected?.row === row.index && selected?.col === col;

                  // 手前のクエストが未入力だと、この値までの並びが繋がらない
                  const brokenChain = cell?.precededByGap ?? false;

                  const content = cell ? (
                    // 削除しても枠は残す（後続がずれないように）。空のまま再入力できる
                    cell.point === null ? null : (
                      <span
                        className={`${styles.chip} ${
                          brokenChain ? styles.chipBroken : ''
                        }`}
                        style={{ background: POINT_COLOR[cell.point] }}
                        title={brokenChain ? '手前のクエストが未入力' : undefined}
                      >
                        {brokenChain && <span className={styles.warnMark}>！</span>}
                        {cell.point}pt
                      </span>
                    )
                  ) : isRouteCell && routeInfo ? (
                    <span
                      className={styles.chip}
                      style={{ background: routeInfo.color }}
                    >
                      {routeInfo.label}
                    </span>
                  ) : null;

                  if (!editable) {
                    return <td key={col} className={styles.cellEmpty} />;
                  }

                  return (
                    <td key={col} className={styles.cell}>
                      <button
                        type="button"
                        className={`${styles.cellBtn} ${
                          content ? '' : styles.cellBtnEmpty
                        } ${isSelected ? styles.cellSelected : ''}`}
                        onClick={() => onSelect({ row: row.index, col })}
                        aria-label={`${row.index}回 ${col + 1}回目`}
                      >
                        {content ?? <span className={styles.plus}>＋</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
