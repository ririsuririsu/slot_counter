import type { CSSProperties } from 'react';
import type { KokakuCycleRow, KokakuMode, KokakuScreen, KokakuScreenOccasion } from '../../types';
import {
  KOKAKU_COLOR_DARK_TEXT,
  KOKAKU_COLOR_LABEL,
  KOKAKU_COLOR_STYLE,
  KOKAKU_CZ_CEILING,
  KOKAKU_GRID_GAMES,
  KOKAKU_MODE_COLOR,
  KOKAKU_MODE_LABEL,
  KOKAKU_AT_ROUTE_LABEL,
  KOKAKU_ZONE_RATE,
  findKokakuScreen,
  resolveKokakuOccasion,
} from '../../data/kokakuDefinitions';
import { KokakuScreenImage } from './KokakuScreenImage';
import type { KokakuModePosterior } from '../../utils/kokakuEstimation';
import styles from './KokakuZoneGrid.module.css';

/** グリッド上の位置。game は列のゲーム数、'pt' は殲滅ポイント列 */
export interface KokakuCellPosition {
  row: number;
  game: number | 'pt' | 'end';
}

interface KokakuZoneGridProps {
  rows: KokakuCycleRow[];
  posteriors: KokakuModePosterior[];
  selected: KokakuCellPosition | null;
  conflicts: number[];
  onSelect: (position: KokakuCellPosition) => void;
  onToggleReset: (row: KokakuCycleRow) => void;
}

/** そのゲーム数がCZ天井になるモード（列見出しの補足に出す） */
const CEILING_MODES = KOKAKU_GRID_GAMES.map((game) =>
  (Object.keys(KOKAKU_CZ_CEILING) as KokakuMode[]).filter(
    (mode) => KOKAKU_CZ_CEILING[mode] === game
  )
);

function isTachikoma(game: number): boolean {
  return game === 200 || game === 400;
}

/** どのモードでも抽選が無いゲーム数（300Gは通常Bだけ1.3%あるので対象外） */
function isDeadGame(game: number): boolean {
  if (isTachikoma(game)) return false;
  return (Object.keys(KOKAKU_ZONE_RATE) as KokakuMode[]).every((mode) => {
    const rate = KOKAKU_ZONE_RATE[mode][game];
    return (rate === null || rate === undefined) && KOKAKU_CZ_CEILING[mode] !== game;
  });
}

/**
 * 縦＝CZサイクル（＝1モード滞在区間）／横＝規定ゲーム数の固定列。
 *
 * 列を固定しているので「通過したのに空のセル」がそのまま非当選の観測になる。
 * n個目を列にするとこれが表現できない（docs/kokaku-spec.md §7-1）。
 * 列が動かないため、セルを消しても後続の位置はずれない。
 */
export function KokakuZoneGrid({
  rows,
  posteriors,
  selected,
  conflicts,
  onSelect,
  onToggleReset,
}: KokakuZoneGridProps) {
  return (
    <div className={styles.scroller}>
      <table className={styles.grid}>
        <thead>
          <tr>
            <th className={styles.corner} scope="col">
              CZ
            </th>
            {KOKAKU_GRID_GAMES.map((game, i) => (
              <th
                key={game}
                className={`${styles.colHead} ${isTachikoma(game) ? styles.colTachikoma : ''} ${
                  isDeadGame(game) ? styles.colDead : ''
                }`}
                scope="col"
              >
                <span className={styles.colGame}>{game}G</span>
                {isTachikoma(game) ? (
                  <span className={styles.colNote}>タチコマ</span>
                ) : CEILING_MODES[i].length > 0 ? (
                  <span className={styles.colCeiling}>
                    {CEILING_MODES[i].map((m) => KOKAKU_MODE_LABEL[m].replace('通常', '')).join('/')}天井
                  </span>
                ) : (
                  <span className={styles.colNote}>&nbsp;</span>
                )}
              </th>
            ))}
            <th className={styles.colHead} scope="col">
              <span className={styles.colGame}>pt</span>
              <span className={styles.colNote}>撃破契機</span>
            </th>
            <th className={styles.colHeadWide} scope="col">
              <span className={styles.colGame}>結果</span>
              <span className={styles.colNote}>推定モード</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const posterior = posteriors.find((p) => p.index === row.index);
            const hasConflict = conflicts.includes(row.index);

            return (
              <tr key={row.index} className={row.active ? styles.activeRow : undefined}>
                <th className={styles.rowHeadCell} scope="row">
                  <button
                    type="button"
                    className={`${styles.rowHead} ${row.isReset ? styles.rowHeadReset : ''}`}
                    onClick={() => onToggleReset(row)}
                    aria-pressed={row.isReset}
                    aria-label={`${row.index}回目 ${row.isReset ? 'リセット回' : '通常回'}（切り替え）`}
                  >
                    <span className={styles.rowNum}>{row.index}回</span>
                    <span className={styles.rowKind}>{row.isReset ? 'リセット' : '通常'}</span>
                  </button>
                </th>

                {row.cells.map((cell) => {
                  const isSelected =
                    selected?.row === row.index && selected?.game === cell.game;

                  // どのモードでも抽選が無いゲーム数（現仕様では発生しない）
                  if (isDeadGame(cell.game)) {
                    return (
                      <td key={cell.game} className={styles.cellDead} aria-label="抽選なし">
                        <span className={styles.dash}>–</span>
                      </td>
                    );
                  }

                  // 未到達のセルもタップできる。ここを押して到達Gを決める運用なので、
                  // ゲーム数カウンターを進めなくても入力が完結する。
                  const color = cell.color;
                  const chipStyle: CSSProperties = color
                    ? {
                        background: KOKAKU_COLOR_STYLE[color],
                        color: KOKAKU_COLOR_DARK_TEXT[color] ? '#1c1c1e' : '#fff',
                      }
                    : {};

                  return (
                    <td key={cell.game} className={styles.cell}>
                      <button
                        type="button"
                        className={`${styles.cellBtn} ${isSelected ? styles.cellSelected : ''} ${
                          cell.occurred
                            ? ''
                            : cell.unreached
                              ? styles.cellBtnUnreached
                              : styles.cellBtnMiss
                        }`}
                        onClick={() => onSelect({ row: row.index, game: cell.game })}
                        aria-label={`${row.index}回 ${cell.game}G ${
                          cell.occurred ? '殲滅ZONE発生' : cell.unreached ? '未到達' : '非当選'
                        }`}
                      >
                        {cell.occurred ? (
                          <span className={styles.chip} style={chipStyle}>
                            {cell.kind === 'tachikoma'
                              ? 'タチ'
                              : color
                                ? KOKAKU_COLOR_LABEL[color]
                                : '？'}
                            {cell.czWon && <span className={styles.won}>◎</span>}
                          </span>
                        ) : (
                          <span className={cell.unreached ? styles.dash : styles.miss}>
                            {cell.unreached ? '—' : '・'}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}

                <td className={styles.cell}>
                  <button
                    type="button"
                    className={`${styles.cellBtn} ${
                      selected?.row === row.index && selected?.game === 'pt'
                        ? styles.cellSelected
                        : ''
                    } ${row.pointCells.length === 0 ? styles.cellBtnMiss : ''}`}
                    onClick={() => onSelect({ row: row.index, game: 'pt' })}
                    aria-label={`${row.index}回 殲滅ポイント契機のゾーン`}
                  >
                    {row.pointCells.length === 0 ? (
                      <span className={styles.miss}>＋</span>
                    ) : (
                      <span className={styles.ptChips}>
                        {row.pointCells.map((pc, i) => (
                          <span
                            key={i}
                            className={styles.ptChip}
                            style={
                              pc.color
                                ? {
                                    background: KOKAKU_COLOR_STYLE[pc.color],
                                    color: KOKAKU_COLOR_DARK_TEXT[pc.color] ? '#1c1c1e' : '#fff',
                                  }
                                : {}
                            }
                          >
                            {pc.color ? KOKAKU_COLOR_LABEL[pc.color] : '？'}
                            {pc.czWon && '◎'}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </td>

                <td className={styles.cellWide}>
                  <button
                    type="button"
                    className={`${styles.endBtn} ${
                      selected?.row === row.index && selected?.game === 'end'
                        ? styles.cellSelected
                        : ''
                    }`}
                    onClick={() => onSelect({ row: row.index, game: 'end' })}
                    aria-label={`${row.index}回 サイクルの結果`}
                  >
                    <span className={styles.endLabel}>
                      {describeEnd(row)}
                      {hasConflict && <span className={styles.conflict}>！</span>}
                    </span>
                    {/*
                      この行のモードを示唆する画面。前サイクルの終了時に見たものも
                      ここに入るので、「どの場面で出た画面か」をタグで併記する。
                    */}
                    {row.screens.length > 0 && (
                      <span className={styles.screenThumbs}>
                        {row.screens.map((s) => (
                          <ScreenThumb
                            key={`${s.screen}-${s.eventIndex}`}
                            screen={s.screen}
                            occasion={s.occasion}
                          />
                        ))}
                      </span>
                    )}
                    {posterior && (
                      <span
                        className={styles.modeChip}
                        style={{ background: KOKAKU_MODE_COLOR[posterior.top] }}
                      >
                        {KOKAKU_MODE_LABEL[posterior.top]}{' '}
                        {(posterior.confidence * 100).toFixed(0)}%
                      </span>
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

/**
 * セル内の小さなサムネイル。左下に出現場面のタグ（CZ / PUSH / AT / 裏）を重ねる。
 * 画像が無い環境では枠色のスウォッチにフォールバックする。
 */
function ScreenThumb({
  screen,
  occasion,
}: {
  screen: KokakuScreen;
  occasion: KokakuScreenOccasion;
}) {
  const info = findKokakuScreen(screen);
  const place = resolveKokakuOccasion(screen, occasion);
  const hint = [info?.modeHint, info?.settingHint].filter(Boolean).join(' ／ ');

  return (
    <span
      className={`${styles.screenThumb} ${styles[`thumbFrame_${info?.frame ?? 'default'}`]}`}
      title={`${place.label}：${info?.label}${hint ? `（${hint}）` : ''}`}
    >
      <KokakuScreenImage
        screen={screen}
        alt={info?.label ?? ''}
        fallback={<span className={styles.thumbFallback} />}
      />
      <span className={styles.thumbTag}>{place.short}</span>
    </span>
  );
}

function describeEnd(row: KokakuCycleRow): string {
  if (!row.end) return `進行中 ${row.reachedGame}G`;
  const parts: string[] = [];
  if (row.end.cz) {
    parts.push(row.end.cz.success ? 'CZ成功' : 'CZ失敗');
    if (!row.end.cz.success && row.end.cz.visualHack) parts.push('視覚HACK');
  }
  if (row.end.at) {
    // CZ経由は直前の「CZ成功」で分かるので AT とだけ書く。
    // 直撃・999G天井は経路が分からないと読めないので明示する。
    parts.push(row.end.at === 'cz' ? 'AT' : `AT(${KOKAKU_AT_ROUTE_LABEL[row.end.at]})`);
  }
  if (parts.length === 0) parts.push(`打ち切り ${row.end.endGame}G`);
  return parts.join('→');
}
