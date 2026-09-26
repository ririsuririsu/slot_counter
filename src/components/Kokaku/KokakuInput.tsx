import { useMemo, useState } from 'react';
import type {
  KokakuCycleEndEvent,
  KokakuCycleRow,
  KokakuCzType,
  KokakuMachine,
  KokakuScreen,
  KokakuScreenOccasion,
  KokakuZoneColor,
} from '../../types';
import { useMachineStore } from '../../stores/machineStore';
import { Modal } from '../common/Modal';
import { DrumPicker } from '../GameInput/DrumPicker';
import { KokakuZoneGrid, type KokakuCellPosition } from './KokakuZoneGrid';
import { KokakuScreenImage } from './KokakuScreenImage';
import {
  KOKAKU_COLOR_DARK_TEXT,
  KOKAKU_COLOR_LABEL,
  KOKAKU_COLOR_STYLE,
  KOKAKU_AT_CEILING,
  KOKAKU_CZ_LABEL,
  KOKAKU_MODE_COLOR,
  KOKAKU_MODE_LABEL,
  KOKAKU_MODES,
  KOKAKU_SCREEN_CONTEXT_LABEL,
  KOKAKU_SCREEN_OCCASIONS,
  KOKAKU_ZONE_COLORS,
  findKokakuOccasion,
  findKokakuScreen,
  resolveKokakuOccasion,
  kokakuScreensForOccasion,
  type KokakuScreenInfo,
} from '../../data/kokakuDefinitions';
import {
  calculateKokakuAnalysis,
  calculateKokakuModePosteriors,
  calculateZoneOutlook,
  findKokakuConflicts,
  toKokakuSettingWeights,
} from '../../utils/kokakuEstimation';
import styles from './KokakuInput.module.css';

type EndPreset = 'cz-win' | 'cz-lose' | 'cz-hack' | 'direct' | 'ceiling' | 'abandon';

const END_PRESETS: { id: EndPreset; label: string; needsCz: boolean }[] = [
  { id: 'cz-win', label: 'CZ成功 → AT', needsCz: true },
  { id: 'cz-lose', label: 'CZ失敗', needsCz: true },
  { id: 'cz-hack', label: 'CZ失敗 → 視覚HACK → AT', needsCz: true },
  { id: 'direct', label: '殲滅ZONE直撃 → AT', needsCz: false },
  { id: 'ceiling', label: 'AT間999G天井 → AT', needsCz: false },
  { id: 'abandon', label: '未当選のまま打ち切り', needsCz: false },
];

function presetToEnd(
  preset: EndPreset,
  czType: KokakuCzType,
  endGame: number
): Omit<KokakuCycleEndEvent, 'type'> {
  switch (preset) {
    case 'cz-win':
      return { cz: { czType, success: true, visualHack: null }, at: 'cz', endGame };
    case 'cz-lose':
      return { cz: { czType, success: false, visualHack: false }, at: null, endGame };
    case 'cz-hack':
      return { cz: { czType, success: false, visualHack: true }, at: 'cz', endGame };
    case 'direct':
      return { cz: null, at: 'direct', endGame };
    case 'ceiling':
      return { cz: null, at: 'ceiling', endGame };
    case 'abandon':
      return { cz: null, at: null, endGame };
  }
}

function endToPreset(end: KokakuCycleEndEvent): EndPreset {
  if (end.cz) {
    if (end.cz.success) return 'cz-win';
    return end.cz.visualHack ? 'cz-hack' : 'cz-lose';
  }
  if (end.at === 'direct') return 'direct';
  if (end.at === 'ceiling') return 'ceiling';
  return 'abandon';
}

/** 出現場面の選択。カタログ（CZ終了画面 / ウインドウ）の切り替えも兼ねる */
function OccasionPicker({
  value,
  onChange,
}: {
  value: KokakuScreenOccasion;
  onChange: (next: KokakuScreenOccasion) => void;
}) {
  return (
    <>
      <div className={styles.occasionRow}>
        {KOKAKU_SCREEN_OCCASIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`${styles.occasionBtn} ${value === o.id ? styles.contextSelected : ''}`}
            onClick={() => onChange(o.id)}
          >
            <span className={styles.contextName}>{o.label}</span>
            <span className={styles.contextSub}>
              {KOKAKU_SCREEN_CONTEXT_LABEL[o.catalog]}
            </span>
          </button>
        ))}
      </div>
      <p className={styles.hint}>{findKokakuOccasion(value)?.howto}</p>
    </>
  );
}

/**
 * 画面選択のカード。`public/kokaku-screens/<id>.webp` があればサムネイルで出し、
 * 無ければ枠色つきの文字カードにフォールバックする。
 *
 * 解析サイトのキャプチャは著作物なので同梱していない。
 * 読み込み失敗を onError で拾うだけなので、画像の有無を設定する必要はない。
 */
function ScreenCard({
  info,
  onSelect,
  selected = false,
}: {
  info: KokakuScreenInfo;
  onSelect: () => void;
  selected?: boolean;
}) {
  const hint = [info.modeHint, info.settingHint].filter(Boolean).join(' ／ ');

  return (
    <button
      type="button"
      className={`${styles.screenCard} ${styles[`frame_${info.frame}`]} ${
        selected ? styles.screenCardSelected : ''
      }`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className={styles.screenThumb}>
        <KokakuScreenImage
          screen={info.id}
          fallback={<span className={styles.screenThumbFallback}>{info.label}</span>}
        />
      </span>
      <span className={styles.screenName}>{info.label}</span>
      <span className={styles.screenHint}>{hint || '—'}</span>
    </button>
  );
}

function ColorPicker({
  value,
  onChange,
  allowNull = true,
}: {
  value: KokakuZoneColor | null;
  onChange: (color: KokakuZoneColor | null) => void;
  allowNull?: boolean;
}) {
  return (
    <div className={styles.colorRow}>
      {allowNull && (
        <button
          type="button"
          className={`${styles.colorBtn} ${value === null ? styles.colorSelected : ''}`}
          onClick={() => onChange(null)}
        >
          未入力
        </button>
      )}
      {KOKAKU_ZONE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`${styles.colorBtn} ${value === color ? styles.colorSelected : ''}`}
          style={{
            background: KOKAKU_COLOR_STYLE[color],
            color: KOKAKU_COLOR_DARK_TEXT[color] ? '#1c1c1e' : '#fff',
          }}
          onClick={() => onChange(color)}
        >
          {KOKAKU_COLOR_LABEL[color]}
        </button>
      ))}
    </div>
  );
}

export function KokakuInput({ machine }: { machine: KokakuMachine }) {
  const [selected, setSelected] = useState<KokakuCellPosition | null>(null);
  const [gameModalOpen, setGameModalOpen] = useState(false);
  const [screenPanelOpen, setScreenPanelOpen] = useState(false);
  const [occasion, setOccasion] = useState<KokakuScreenOccasion>('ura');

  const addEvent = useMachineStore((s) => s.addKokakuEvent);
  const insertEvent = useMachineStore((s) => s.insertKokakuEventAt);
  const updateEvent = useMachineStore((s) => s.updateKokakuEventAt);
  const deleteEvent = useMachineStore((s) => s.deleteKokakuEventAt);
  const updateCurrentGame = useMachineStore((s) => s.updateKokakuCurrentGame);

  const analysis = useMemo(
    () => calculateKokakuAnalysis(machine.events, machine.currentGame),
    [machine.events, machine.currentGame]
  );
  const rows = analysis.rows;
  const posteriors = useMemo(
    () => calculateKokakuModePosteriors(rows, toKokakuSettingWeights(analysis.setting)),
    [rows, analysis.setting]
  );
  const conflicts = useMemo(() => findKokakuConflicts(rows), [rows]);

  const activeRow = rows[rows.length - 1];
  const activePosterior = posteriors[posteriors.length - 1];
  const outlook = useMemo(
    () =>
      activePosterior
        ? calculateZoneOutlook(activePosterior.distribution, activeRow.reachedGame)
        : [],
    [activePosterior, activeRow.reachedGame]
  );

  const selectedRow = selected ? rows.find((r) => r.index === selected.row) ?? null : null;

  /**
   * その行が「このゲーム数まで回った」ことにする。
   * 進行中の行は currentGame、締めた行は cycle-end.endGame が到達Gの実体なので、
   * セルのタップはそのどちらかを書き換える。新しいイベント種別は増やさない。
   */
  const setReached = (row: KokakuCycleRow, game: number) => {
    if (row.active) {
      updateCurrentGame(game);
    } else if (row.end && row.endEventIndex >= 0) {
      updateEvent(row.endEventIndex, { ...row.end, endGame: game });
    }
  };

  const toggleReset = (row: KokakuCycleRow) => {
    const nextIsReset = !row.isReset;
    const defaultIsReset = row.index === 1;
    if (row.cycleStartEventIndex >= 0) {
      if (nextIsReset === defaultIsReset) {
        deleteEvent(row.cycleStartEventIndex);
      } else {
        updateEvent(row.cycleStartEventIndex, { type: 'cycle-start', reset: nextIsReset });
      }
      return;
    }
    if (nextIsReset === defaultIsReset) return;
    insertEvent(row.rowStartIndex, { type: 'cycle-start', reset: nextIsReset });
  };

  const recordScreen = (screen: KokakuScreen, row: KokakuCycleRow | null) => {
    const body = { type: 'screen' as const, occasion, screen };
    if (!row || row.active) addEvent(body);
    else insertEvent(row.appendIndex, body);
  };

  return (
    <div className={styles.container}>
      {/*
        ゲーム数カウンターを進める運用にはしない。到達Gはセルのタップから決まる。
        ここは derived な表示で、ずれたときだけ直接直せるようにしてある。
      */}
      <div className={styles.topBar}>
        <button type="button" className={styles.gameBtn} onClick={() => setGameModalOpen(true)}>
          <span className={styles.gameLabel}>
            {activeRow.index}回目の到達G
            <span className={styles.gameSub}>セルをタップすると伸びます</span>
          </span>
          <span className={styles.gameValue}>
            {String(activeRow.reachedGame).padStart(3, '0')}
            <span className={styles.editIcon}>✏️</span>
          </span>
        </button>
      </div>

      {activePosterior && (
        <div className={styles.outlook}>
          <div className={styles.outlookHead}>
            <span>推定モード</span>
            <span className={styles.modeBars}>
              {KOKAKU_MODES.filter((m) => activePosterior.distribution[m] > 0.005).map((m) => (
                <span
                  key={m}
                  className={styles.modeBar}
                  style={{
                    background: KOKAKU_MODE_COLOR[m],
                    flexGrow: activePosterior.distribution[m],
                  }}
                  title={`${KOKAKU_MODE_LABEL[m]} ${(activePosterior.distribution[m] * 100).toFixed(1)}%`}
                >
                  {activePosterior.distribution[m] > 0.12 && (
                    <>
                      {KOKAKU_MODE_LABEL[m].replace('通常', '')}
                      <br />
                      {(activePosterior.distribution[m] * 100).toFixed(0)}%
                    </>
                  )}
                </span>
              ))}
            </span>
          </div>
          <div className={styles.outlookRow}>
            {outlook.slice(0, 5).map((o) => (
              <span key={o.game} className={styles.outlookItem}>
                <b>{o.game}G</b>
                <span className={o.ceilingShare > 0.5 ? styles.outlookCeiling : undefined}>
                  {/* 1%未満を「0%」と丸めると死にゾーンと区別がつかない */}
                  {(o.rate * 100).toFixed(o.rate < 0.1 ? 1 : 0)}%
                </span>
              </span>
            ))}
            {outlook.length === 0 && <span className={styles.outlookEmpty}>天井まで到達済み</span>}
          </div>
          {activePosterior.prior && (
            <p className={styles.outlookNote}>まだ観測が無いため、移行率そのままの分布です。</p>
          )}
        </div>
      )}

      <KokakuZoneGrid
        rows={rows}
        posteriors={posteriors}
        selected={selected}
        conflicts={conflicts}
        onSelect={setSelected}
        onToggleReset={toggleReset}
      />

      {/*
        結果セルは横スクロールの右端にあり、スマホでは隠れる。
        実際に一番よく押すのは「進行中の行を締める」操作なので、表の下にも出す。
      */}
      <button
        type="button"
        className={styles.closeCycleBtn}
        onClick={() => setSelected({ row: activeRow.index, game: 'end' })}
      >
        {activeRow.index}回目のサイクルを締める（CZ結果・AT・打ち切り）
      </button>

      {conflicts.length > 0 && (
        <p className={styles.conflictNote}>
          ！{conflicts.join('・')}回目は画面の「濃厚」示唆とゾーンの観測が矛盾しています。
          制約を外して推定しています。入力を見直してください。
        </p>
      )}

      <div className={styles.screenSection}>
        <button
          type="button"
          className={styles.screenToggle}
          onClick={() => setScreenPanelOpen((v) => !v)}
        >
          裏コマンドの画面を記録（{activeRow.index}回目のモード示唆）
          {screenPanelOpen ? ' ▲' : ' ▼'}
        </button>
        {screenPanelOpen && (
          <div className={styles.screenPanel}>
            <OccasionPicker value={occasion} onChange={setOccasion} />
            <div className={styles.screenList}>
              {kokakuScreensForOccasion(occasion).map((info) => (
                <ScreenCard
                  key={info.id}
                  info={info}
                  onSelect={() => recordScreen(info.id, activeRow)}
                />
              ))}
            </div>
            <p className={styles.hint}>
              ここで記録した画面は<b>{activeRow.index}回目（進行中のサイクル）</b>のモード示唆として扱います。
              サイクル終了時に見た画面は<b>次のサイクル</b>の示唆なので、
              「サイクルを締める」の中から記録してください。
            </p>
            <p className={styles.hint}>
              「濃厚」だけをモード・設定の制約として推定に反映します。「示唆」は表示のみです。
              画像は <code>public/kokaku-screens/&lt;id&gt;.webp</code> を置くと差し替わります。
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={gameModalOpen} onClose={() => setGameModalOpen(false)} title="現在ゲーム数">
        <DrumPicker
          initialValue={machine.currentGame}
          onConfirm={(value) => {
            updateCurrentGame(value);
            setGameModalOpen(false);
          }}
          onCancel={() => setGameModalOpen(false)}
        />
      </Modal>

      {selected && selectedRow && (
        <CellModal
          row={selectedRow}
          nextRow={rows.find((r) => r.index === selectedRow.index + 1) ?? null}
          position={selected}
          currentGame={machine.currentGame}
          onClose={() => setSelected(null)}
          onAdd={addEvent}
          onInsert={insertEvent}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
          onSetReached={setReached}
        />
      )}
    </div>
  );
}

interface CellModalProps {
  row: KokakuCycleRow;
  /** 次のサイクル。終了時の画面はこちらのモード示唆になる */
  nextRow: KokakuCycleRow | null;
  position: KokakuCellPosition;
  currentGame: number;
  onClose: () => void;
  onAdd: ReturnType<typeof useMachineStore.getState>['addKokakuEvent'];
  onInsert: ReturnType<typeof useMachineStore.getState>['insertKokakuEventAt'];
  onUpdate: ReturnType<typeof useMachineStore.getState>['updateKokakuEventAt'];
  onDelete: ReturnType<typeof useMachineStore.getState>['deleteKokakuEventAt'];
  onSetReached: (row: KokakuCycleRow, game: number) => void;
}

function CellModal({
  row,
  nextRow,
  position,
  currentGame,
  onClose,
  onAdd,
  onInsert,
  onUpdate,
  onDelete,
  onSetReached,
}: CellModalProps) {
  const insertAt = (body: Parameters<CellModalProps['onAdd']>[0]) => {
    if (row.active) onAdd(body);
    else onInsert(row.appendIndex, body);
  };

  if (position.game === 'end') {
    return (
      <Modal isOpen onClose={onClose} title={`${row.index}回目のCZサイクル`}>
        <EndForm
          row={row}
          nextRow={nextRow}
          currentGame={currentGame}
          onClose={onClose}
          onSave={(body, endScreen, endOccasion) => {
            const screenBody = endScreen
              ? { type: 'screen' as const, occasion: endOccasion, screen: endScreen }
              : null;
            if (row.endEventIndex >= 0) {
              onUpdate(row.endEventIndex, body);
              // 終了時の画面は cycle-end の**直後**へ置く。
              // そうすると次の行に属し、次サイクルのモード示唆として効く。
              if (screenBody) onInsert(row.endEventIndex + 1, screenBody);
            } else {
              // 進行中の行を締める場合は、どちらも末尾追加でよい。
              // cycle-end のあとに積むので画面は自動的に次の行へ入る。
              onAdd(body);
              if (screenBody) onAdd(screenBody);
            }
            onClose();
          }}
          onDeleteEnd={() => {
            if (row.endEventIndex >= 0) onDelete(row.endEventIndex);
            onClose();
          }}
          onDeleteScreen={(index) => onDelete(index)}
        />
      </Modal>
    );
  }

  if (position.game === 'pt') {
    return (
      <Modal isOpen onClose={onClose} title={`${row.index}回目 殲滅ポイント契機`}>
        <PointForm
          row={row}
          onAdd={(body) => insertAt(body)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={onClose}
        />
      </Modal>
    );
  }

  const game = position.game;
  const cell = row.cells.find((c) => c.game === game)!;
  return (
    <Modal isOpen onClose={onClose} title={`${row.index}回目 ${game}G`}>
      <ZoneForm
        cell={cell}
        reachedGame={row.reachedGame}
        onSave={(body) => {
          if (cell.eventIndex >= 0) onUpdate(cell.eventIndex, body);
          else insertAt(body);
          onClose();
        }}
        onDelete={() => {
          if (cell.eventIndex >= 0) onDelete(cell.eventIndex);
          onClose();
        }}
        onSetReached={(value) => {
          onSetReached(row, value);
          onClose();
        }}
      />
    </Modal>
  );
}

function ZoneForm({
  cell,
  reachedGame,
  onSave,
  onDelete,
  onSetReached,
}: {
  cell: KokakuCycleRow['cells'][number];
  reachedGame: number;
  onSave: (body: Parameters<CellModalProps['onAdd']>[0]) => void;
  onDelete: () => void;
  onSetReached: (game: number) => void;
}) {
  const [color, setColor] = useState<KokakuZoneColor | null>(cell.color);
  const [czWon, setCzWon] = useState(cell.czWon);
  const isTachikoma = cell.kind === 'tachikoma';

  return (
    <div className={styles.form}>
      <p className={styles.hint}>
        {isTachikoma
          ? 'タチコマSAMゾーン。殲滅ZONEではないのでモード推測には使いません。'
          : cell.unreached
            ? 'ここは「まだ到達していない」扱いです。ゾーンが出たなら記録、出ずに通過しただけなら「ここまで通過」を押してください。'
            : 'ここは「通過したが非当選」として観測に入っています。'}
      </p>

      {/* セルのタップだけで到達Gを伸ばせるようにする（ゲーム数カウンターを回さない運用） */}
      {!cell.occurred && (
        <button
          type="button"
          className={cell.unreached ? styles.primary : styles.cancel}
          onClick={() => onSetReached(cell.game)}
        >
          {cell.unreached
            ? `${cell.game}Gまで通過（非当選）`
            : `到達Gをここまで戻す（現在 ${reachedGame}G）`}
        </button>
      )}

      {!isTachikoma && (
        <>
          <label className={styles.fieldLabel}>マスの色</label>
          <ColorPicker value={color} onChange={setColor} />
        </>
      )}

      <label className={styles.fieldLabel}>このゾーンからCZ当選</label>
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${!czWon ? styles.toggleSelected : ''}`}
          onClick={() => setCzWon(false)}
        >
          × 非当選
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${czWon ? styles.toggleSelected : ''}`}
          onClick={() => setCzWon(true)}
        >
          ◎ CZ当選
        </button>
      </div>

      <button
        type="button"
        className={styles.primary}
        onClick={() =>
          onSave(
            isTachikoma
              ? { type: 'tachikoma-zone', game: cell.game as 200 | 400, czWon }
              : { type: 'zone', game: cell.game, color, czWon }
          )
        }
      >
        {cell.occurred ? '更新' : '殲滅ZONE発生を記録'}
      </button>
      {cell.occurred && (
        <button type="button" className={styles.danger} onClick={onDelete}>
          この記録を削除（非当選に戻す）
        </button>
      )}
    </div>
  );
}

function PointForm({
  row,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: {
  row: KokakuCycleRow;
  onAdd: (body: Parameters<CellModalProps['onAdd']>[0]) => void;
  onUpdate: CellModalProps['onUpdate'];
  onDelete: CellModalProps['onDelete'];
  onClose: () => void;
}) {
  const [color, setColor] = useState<KokakuZoneColor | null>(null);
  const [czWon, setCzWon] = useState(false);

  return (
    <div className={styles.form}>
      <p className={styles.hint}>
        殲滅ポイント（撃破数）契機の殲滅ZONE。規定ゲーム数のゾーンではないので
        モード推測の尤度には入れません。色別のCZ当選率には数えます。
      </p>

      {row.pointCells.length > 0 && (
        <ul className={styles.recordList}>
          {row.pointCells.map((pc) => (
            <li key={pc.eventIndex}>
              <span>
                {pc.color ? KOKAKU_COLOR_LABEL[pc.color] : '色未入力'}
                {pc.czWon ? ' → CZ当選' : ' → 非当選'}
              </span>
              <button
                type="button"
                onClick={() => onUpdate(pc.eventIndex, {
                  type: 'zone-point',
                  color: pc.color,
                  czWon: !pc.czWon,
                })}
              >
                当否反転
              </button>
              <button type="button" onClick={() => onDelete(pc.eventIndex)}>
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className={styles.fieldLabel}>マスの色</label>
      <ColorPicker value={color} onChange={setColor} />

      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${!czWon ? styles.toggleSelected : ''}`}
          onClick={() => setCzWon(false)}
        >
          × 非当選
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${czWon ? styles.toggleSelected : ''}`}
          onClick={() => setCzWon(true)}
        >
          ◎ CZ当選
        </button>
      </div>

      <button
        type="button"
        className={styles.primary}
        onClick={() => {
          onAdd({ type: 'zone-point', color, czWon });
          onClose();
        }}
      >
        追加
      </button>
    </div>
  );
}

function EndForm({
  row,
  nextRow,
  currentGame,
  onSave,
  onDeleteEnd,
  onDeleteScreen,
  onClose,
}: {
  row: KokakuCycleRow;
  nextRow: KokakuCycleRow | null;
  currentGame: number;
  onSave: (
    body: Parameters<CellModalProps['onAdd']>[0],
    endScreen: KokakuScreen | null,
    endOccasion: KokakuScreenOccasion
  ) => void;
  onDeleteEnd: () => void;
  onDeleteScreen: (index: number) => void;
  onClose: () => void;
}) {
  const winningCell = row.cells.find((c) => c.occurred && c.czWon);
  const [preset, setPreset] = useState<EndPreset>(
    row.end ? endToPreset(row.end) : winningCell ? 'cz-win' : 'abandon'
  );
  const [czType, setCzType] = useState<KokakuCzType>(
    row.end?.cz?.czType ?? (winningCell?.kind === 'tachikoma' ? 'tachikoma' : 'sam')
  );
  const [endGame, setEndGame] = useState(
    row.end?.endGame ?? winningCell?.game ?? Math.max(currentGame, row.reachedGame)
  );
  const [endScreen, setEndScreen] = useState<KokakuScreen | null>(null);
  // CZ失敗で終わるならCZ終了画面、ATに入ったならAT終了のウインドウが既定
  const [endOccasion, setEndOccasion] = useState<KokakuScreenOccasion>(
    row.end?.at != null ? 'at-end' : 'cz-end'
  );

  const needsCz = END_PRESETS.find((p) => p.id === preset)?.needsCz ?? false;

  return (
    <div className={styles.form}>
      {row.screens.length > 0 && (
        <>
          <label className={styles.fieldLabel}>
            このサイクル中に見た画面
            <span className={styles.sub}>{row.index}回目のモード示唆として扱っています</span>
          </label>
          <ul className={styles.recordList}>
            {row.screens.map((s) => {
              const info = findKokakuScreen(s.screen);
              return (
                <li key={s.eventIndex}>
                  <span>
                    {resolveKokakuOccasion(s.screen, s.occasion).label}：{info?.label}
                    {info?.modeHint ? `（${info.modeHint}）` : ''}
                  </span>
                  <button type="button" onClick={() => onDeleteScreen(s.eventIndex)}>
                    削除
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <label className={styles.fieldLabel}>このサイクルの終わり方</label>
      <div className={styles.presetList}>
        {END_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.presetBtn} ${preset === p.id ? styles.presetSelected : ''}`}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {needsCz && (
        <>
          <label className={styles.fieldLabel}>CZの種別</label>
          <div className={styles.toggleRow}>
            {(['sam', 'tachikoma'] as KokakuCzType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.toggleBtn} ${czType === t ? styles.toggleSelected : ''}`}
                onClick={() => setCzType(t)}
              >
                {KOKAKU_CZ_LABEL[t]}
              </button>
            ))}
          </div>
        </>
      )}

      <label className={styles.fieldLabel}>
        終了時のゲーム数
        <span className={styles.sub}>
          未当選で打ち切った場合、このG数までの非当選が観測として効きます
        </span>
      </label>
      <input
        className={styles.numberInput}
        type="number"
        inputMode="numeric"
        min={0}
        max={KOKAKU_AT_CEILING}
        value={endGame}
        onChange={(e) => setEndGame(Math.max(0, Number(e.target.value) || 0))}
      />

      {/*
        モードはサイクル終了時に引き直されるので、終了時に出た画面／そのあとの裏コマンドは
        **次のサイクル**のモードを示唆している。イベントを cycle-end の直後へ置くことで
        次の行に属させ、制約もそちらに掛かるようにする。
      */}
      <label className={styles.fieldLabel}>
        終了時の画面
        <span className={styles.sub}>
          {row.index + 1}回目（次のサイクル）のモード示唆として記録します。
          終了時にモードが引き直されるためです
        </span>
      </label>

      {nextRow && nextRow.screens.length > 0 && (
        <ul className={styles.recordList}>
          {nextRow.screens.map((s) => {
            const info = findKokakuScreen(s.screen);
            return (
              <li key={s.eventIndex}>
                <span>
                  {resolveKokakuOccasion(s.screen, s.occasion).label}：{info?.label}
                  {info?.modeHint ? `（${info.modeHint}）` : ''}
                </span>
                <button type="button" onClick={() => onDeleteScreen(s.eventIndex)}>
                  削除
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <OccasionPicker
        value={endOccasion}
        onChange={(next) => {
          setEndOccasion(next);
          // カタログが変わると選択中の画面が一覧から消えるので解除する
          setEndScreen(null);
        }}
      />
      <div className={styles.screenList}>
        {kokakuScreensForOccasion(endOccasion).map((info) => (
          <ScreenCard
            key={info.id}
            info={info}
            selected={endScreen === info.id}
            onSelect={() => setEndScreen(endScreen === info.id ? null : info.id)}
          />
        ))}
      </div>

      <button
        type="button"
        className={styles.primary}
        onClick={() =>
          onSave(
            { type: 'cycle-end', ...presetToEnd(preset, czType, endGame) },
            endScreen,
            endOccasion
          )
        }
      >
        {row.end ? '更新' : 'このサイクルを締める'}
        {endScreen && `（＋${findKokakuScreen(endScreen)?.label}）`}
      </button>
      {row.end && (
        <button type="button" className={styles.danger} onClick={onDeleteEnd}>
          締めを取り消す（次の行と結合）
        </button>
      )}
      <button type="button" className={styles.cancel} onClick={onClose}>
        閉じる
      </button>
    </div>
  );
}
