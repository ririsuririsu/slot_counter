import type { LycorisCycle, LycorisEvent, LycorisStoredAtEvent } from '../../types';
import {
  LYCORIS_AT_ROUTE_LABEL,
  LYCORIS_CZ_TRIGGER_LABEL,
  LYCORIS_GRID_COLUMNS,
  LYCORIS_OUTCOME_LABEL,
  LYCORIS_RUSH_LABEL,
  findLycorisEndScreen,
  findLycorisTrophy,
} from '../../data/lycorisDefinitions';
import styles from './LycorisZoneGrid.module.css';

/** グリッド上の位置。col は列のゲーム数、'other' は他列、'at' はAT列 */
export interface LycorisCellPosition {
  row: number;
  col: number | 'other' | 'at';
}

interface LycorisZoneGridProps {
  cycles: LycorisCycle[];
  selected: LycorisCellPosition | null;
  onSelect: (position: LycorisCellPosition) => void;
  onEditStart: () => void;
}

const COLUMN_NOTE: Record<number, string> = {
  0: '引戻し',
  50: '高確',
  150: '高確★',
  450: '高確',
};

function describeOther(event: LycorisEvent): string {
  if (event.type === 'short-notice') return `短縮${event.ceiling}`;
  if (event.type === 'cz') return `${LYCORIS_CZ_TRIGGER_LABEL[event.trigger]}CZ`;
  return '';
}

function describeAt(at: LycorisStoredAtEvent): { win: string; end: string | null } {
  const route = at.route === 'short-ceiling' && at.shortCeiling !== null
    ? `短縮${at.shortCeiling}`
    : LYCORIS_AT_ROUTE_LABEL[at.route];
  const end = [
    at.rush ? LYCORIS_RUSH_LABEL[at.rush].replace('ラッシュ', '') : null,
    at.outcome ? LYCORIS_OUTCOME_LABEL[at.outcome].replace('ラッシュ', 'R') : null,
    at.endScreen ? findLycorisEndScreen(at.endScreen)?.label.replace(/（.*）/, '') : null,
    at.trophy ? `${findLycorisTrophy(at.trophy)?.label}トロ` : null,
  ].filter(Boolean);
  return { win: `${at.game}G ${route}`, end: end.length > 0 ? end.join(' ') : null };
}

/**
 * 縦＝AT間サイクル／横＝規定ゲーム数の固定列（攻殻機動隊と同じ作り）。
 *
 * CZ列は「通過したのに空」がそのままCZなしの観測になる。
 * 高確列（50/150/450G）は帯を見落としやすいので、空は「未入力」として扱い推定に入れない。
 * 列が固定なので、セルを消しても後続の位置はずれない。
 */
export function LycorisZoneGrid({ cycles, selected, onSelect, onEditStart }: LycorisZoneGridProps) {
  const isSelected = (row: number, col: LycorisCellPosition['col']) =>
    selected?.row === row && selected?.col === col;

  return (
    <div className={styles.scroller}>
      <table className={styles.grid}>
        <thead>
          <tr>
            <th className={styles.corner} scope="col">AT間</th>
            {LYCORIS_GRID_COLUMNS.map((column) => (
              <th
                key={column.game}
                scope="col"
                className={`${styles.colHead} ${column.kind === 'koukaku' ? styles.colKoukaku : ''} ${
                  column.game === 150 ? styles.colKey : ''
                }`}
              >
                <span className={styles.colGame}>{column.game}G</span>
                <span className={styles.colNote}>{COLUMN_NOTE[column.game] ?? 'CZ'}</span>
              </th>
            ))}
            <th className={styles.colHead} scope="col">
              <span className={styles.colGame}>他</span>
              <span className={styles.colNote}>CZ・短縮</span>
            </th>
            <th className={styles.colHeadWide} scope="col">
              <span className={styles.colGame}>AT</span>
              <span className={styles.colNote}>当選・終了</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cycles.map((cycle) => {
            const at = cycle.at ? describeAt(cycle.at) : null;
            return (
              <tr key={cycle.index} className={cycle.active ? styles.activeRow : undefined}>
                <th className={styles.rowHeadCell} scope="row">
                  {cycle.index === 1 ? (
                    <button
                      type="button"
                      className={styles.rowHead}
                      onClick={onEditStart}
                      aria-label={`1回目 打ち始め ${cycle.startGame}G（変更）`}
                    >
                      <span className={styles.rowNum}>1回</span>
                      <span className={styles.rowSub}>{cycle.startGame > 0 ? `${cycle.startGame}G〜` : '開始✏️'}</span>
                    </button>
                  ) : (
                    <span className={styles.rowHead}>
                      <span className={styles.rowNum}>{cycle.index}回</span>
                    </span>
                  )}
                </th>

                {cycle.cells.map((cell) => {
                  let content: React.ReactNode;
                  let tone = '';
                  if (cell.kind === 'cz') {
                    if (cell.czWon) {
                      content = <span className={`${styles.chip} ${styles.chipCz}`}>◎CZ</span>;
                    } else {
                      content = <span className={cell.unreached ? styles.dash : styles.miss}>{cell.unreached ? '—' : '・'}</span>;
                      tone = cell.unreached ? styles.cellBtnUnreached : styles.cellBtnMiss;
                    }
                  } else if (cell.koukaku !== null) {
                    const label = { moved: '帯○', stay: '帯×', unknown: '？' }[cell.koukaku];
                    content = (
                      <span className={`${styles.chip} ${cell.koukaku === 'moved' ? styles.chipMoved : styles.chipStay}`}>
                        {label}
                      </span>
                    );
                  } else {
                    // 高確列の空は「未入力」。通過済みなら入力を促す
                    content = <span className={cell.unreached ? styles.dash : styles.todo}>{cell.unreached ? '—' : '未'}</span>;
                    tone = cell.unreached ? styles.cellBtnUnreached : styles.cellBtnTodo;
                  }
                  return (
                    <td key={cell.game} className={styles.cell}>
                      <button
                        type="button"
                        className={`${styles.cellBtn} ${tone} ${isSelected(cycle.index, cell.game) ? styles.cellSelected : ''}`}
                        onClick={() => onSelect({ row: cycle.index, col: cell.game })}
                        aria-label={`${cycle.index}回 ${cell.game}G`}
                      >
                        {content}
                      </button>
                    </td>
                  );
                })}

                <td className={styles.cell}>
                  <button
                    type="button"
                    className={`${styles.cellBtn} ${cycle.others.length === 0 ? styles.cellBtnMiss : ''} ${
                      isSelected(cycle.index, 'other') ? styles.cellSelected : ''
                    }`}
                    onClick={() => onSelect({ row: cycle.index, col: 'other' })}
                    aria-label={`${cycle.index}回 規定G数以外のCZ・短縮告知`}
                  >
                    {cycle.others.length === 0 ? (
                      <span className={styles.miss}>＋</span>
                    ) : (
                      <span className={styles.otherChips}>
                        {cycle.others.map(({ event, eventIndex }) => (
                          <span key={eventIndex} className={styles.otherChip}>
                            {event.game}G {describeOther(event)}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </td>

                <td className={styles.cellWide}>
                  <button
                    type="button"
                    className={`${styles.atBtn} ${cycle.active ? '' : styles.atBtnClosed} ${
                      isSelected(cycle.index, 'at') ? styles.cellSelected : ''
                    }`}
                    onClick={() => onSelect({ row: cycle.index, col: 'at' })}
                    aria-label={`${cycle.index}回 AT`}
                  >
                    {at ? (
                      <>
                        <span className={styles.atWin}>{at.win}</span>
                        <span className={at.end ? styles.atEnd : styles.atPending}>{at.end ?? '終了情報 未入力'}</span>
                      </>
                    ) : (
                      <span className={styles.atWin}>進行中 {cycle.reachedGame}G</span>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
