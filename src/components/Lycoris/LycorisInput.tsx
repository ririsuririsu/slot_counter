import { useMemo, useState } from 'react';
import type {
  LycorisAtEvent,
  LycorisAtRoute,
  LycorisCycle,
  LycorisCzTrigger,
  LycorisEndScreen,
  LycorisEpisode,
  LycorisEventInput,
  LycorisGridCell,
  LycorisKoukakuResult,
  LycorisMachine,
  LycorisPrologue,
  LycorisRush,
  LycorisRushOutcome,
  LycorisShortCeiling,
  LycorisTrophy,
} from '../../types';
import { useMachineStore, type LycorisCounterKey } from '../../stores/machineStore';
import { Modal } from '../common/Modal';
import { DrumPicker } from '../GameInput/DrumPicker';
import { MonhanRiseCountButton } from '../MonhanRise/MonhanRiseCountButton';
import { LycorisZoneGrid, type LycorisCellPosition } from './LycorisZoneGrid';
import {
  LYCORIS_AT_ROUTE_LABEL,
  LYCORIS_CEILING_AFTER,
  LYCORIS_CZ_TRIGGER_LABEL,
  LYCORIS_CZ_ZONE_NOTE,
  LYCORIS_END_SCREENS,
  LYCORIS_EPISODES,
  LYCORIS_KOUKAKU_GAME_NOTE,
  LYCORIS_KOUKAKU_LABEL,
  LYCORIS_MAX_GAME,
  LYCORIS_OUTCOME_LABEL,
  LYCORIS_PROLOGUES,
  LYCORIS_RUSH_LABEL,
  LYCORIS_SHORT_CEILINGS,
  LYCORIS_TROPHIES,
  LYCORIS_TROPHY_COLOR,
  findLycorisEpisode,
  lycorisCasualVariant,
} from '../../data/lycorisDefinitions';
import { calculateLycorisAnalysis } from '../../utils/lycorisEstimation';
import styles from './LycorisInput.module.css';

const KOUKAKU_RESULTS: LycorisKoukakuResult[] = ['moved', 'stay', 'unknown'];
/** 「他」列で選べるCZ契機。規定G数のCZはグリッドのセルで入れる */
const OTHER_CZ_TRIGGERS: LycorisCzTrigger[] = ['convert', 'stamp', 'cz-ceiling', 'other'];
const AT_ROUTES: LycorisAtRoute[] = ['cz', 'direct', 'at-ceiling', 'short-ceiling'];
const RUSHES: LycorisRush[] = ['chisato', 'takina'];
const OUTCOMES: LycorisRushOutcome[] = ['rush20-end', 'rush50-end', 'upper-cz-fail', 'rush-w-end'];

/**
 * 3つの独立したカウンター。弱リコ目と→高確は互いに触らない。
 * 帯は煽りのあと、次のレア役を引いたあとに出ることもあるので、別々のタイミングで押す。
 */
const COUNTERS: { key: LycorisCounterKey; label: string; accent: string; note: string }[] = [
  { key: 'bell', label: '共通ベル', accent: '#ffd60a', note: '右下がり・通常時のみ' },
  { key: 'weakLycoris', label: '弱リコ目', accent: '#64d2ff', note: '高確中に引いたものは数えない' },
  { key: 'weakLycorisKoukaku', label: '→高確', accent: '#30d158', note: '弱リコ目のあと帯が出たら' },
];

function clampGame(value: number): number {
  return Number.isFinite(value) ? Math.min(LYCORIS_MAX_GAME, Math.max(0, Math.floor(value))) : 0;
}

const rate = (hit: number, total: number) => (hit > 0 && total > 0 ? `1/${(total / hit).toFixed(1)}` : '—');
const percent = (hit: number, total: number) => (total > 0 ? `${((hit / total) * 100).toFixed(1)}%` : '—');

// ========================================
// 本体
// ========================================

export function LycorisInput({ machine }: { machine: LycorisMachine }) {
  const [selected, setSelected] = useState<LycorisCellPosition | null>(null);
  const [gameModal, setGameModal] = useState<'current' | 'start' | null>(null);

  const increment = useMachineStore((s) => s.incrementLycorisCounter);
  const decrement = useMachineStore((s) => s.decrementLycorisCounter);
  const updateCurrentGame = useMachineStore((s) => s.updateLycorisCurrentGame);
  const updateStartGame = useMachineStore((s) => s.updateLycorisStartGame);
  const addEvent = useMachineStore((s) => s.addLycorisEvent);
  const insertEvent = useMachineStore((s) => s.insertLycorisEventAt);
  const updateEvent = useMachineStore((s) => s.updateLycorisEventAt);
  const deleteEvent = useMachineStore((s) => s.deleteLycorisEventAt);

  const { events, bell, weakLycoris, weakLycorisKoukaku, startGame, currentGame } = machine;
  const analysis = useMemo(
    () => calculateLycorisAnalysis({ events, bell, weakLycoris, weakLycorisKoukaku, startGame, currentGame }),
    [events, bell, weakLycoris, weakLycorisKoukaku, startGame, currentGame]
  );
  const cycles = analysis.cycles;
  const activeCycle = cycles[cycles.length - 1];
  const selectedCycle = selected ? cycles.find((c) => c.index === selected.row) ?? null : null;
  const previous = activeCycle.previousAt;
  const pendingAtEnd = previous && previous.outcome === null ? cycles[cycles.length - 2] : null;

  const counterSub: Record<LycorisCounterKey, string> = {
    bell: rate(bell, analysis.normalGames),
    weakLycoris: `通常 ${analysis.normalGames.toLocaleString()}G`,
    weakLycorisKoukaku: `帯 ${percent(weakLycorisKoukaku, weakLycoris)}`,
  };

  /** その行に記録を足す。進行中なら末尾、締めた行ならその AT の直前 */
  const insertInto = (cycle: LycorisCycle, body: LycorisEventInput) => {
    if (cycle.active) addEvent(body);
    else insertEvent(cycle.insertIndex, body);
  };

  return (
    <div className={styles.container}>
      {/* ベルが情報の柱。3つとも独立したカウンターで、押下フィードバックはボタンの外に出す */}
      <section className={styles.counterSection}>
        {COUNTERS.map((c) => (
          <div key={c.key} className={styles.counterCol}>
            <MonhanRiseCountButton
              count={machine[c.key]}
              label={c.label}
              accent={c.accent}
              onPress={() => increment(c.key)}
            />
            <span className={styles.counterRate}>{counterSub[c.key]}</span>
            <span className={styles.counterNote}>{c.note}</span>
            <button
              type="button"
              className={styles.minusBtn}
              onClick={() => decrement(c.key)}
              disabled={machine[c.key] <= 0}
            >
              −1
            </button>
          </div>
        ))}
      </section>
      {weakLycorisKoukaku > weakLycoris && (
        <p className={styles.warn}>「→高確」が「弱リコ目」の回数を超えています。数え間違いがないか見直してください。</p>
      )}

      <button type="button" className={styles.gameBtn} onClick={() => setGameModal('current')}>
        <span className={styles.gameLabel}>
          {activeCycle.index}回目のサブ液晶G（AT間）
          <span className={styles.gameSub}>セルを押すと伸びます。CZ失敗ではリセットされません</span>
        </span>
        <span className={styles.gameValue}>
          {String(activeCycle.reachedGame).padStart(3, '0')}
          <span className={styles.editIcon}>✏️</span>
        </span>
      </button>

      <p className={styles.ceilingNote}>
        {previous
          ? `前回: ${previous.outcome ? `${LYCORIS_OUTCOME_LABEL[previous.outcome]} → ${LYCORIS_CEILING_AFTER[previous.outcome]}` : 'AT終了情報が未入力'}`
          : '1行目は直前のATを見ていないので、150Gと天井短縮の軸に入りません（行見出しで打ち始めGを入力）'}
      </p>

      {pendingAtEnd?.at && (
        <button
          type="button"
          className={styles.pendingBanner}
          onClick={() => setSelected({ row: pendingAtEnd.index, col: 'at' })}
        >
          {pendingAtEnd.index}回目のATの終了情報（ラッシュ・終了画面・トロフィー）が未入力です。タップして入力
        </button>
      )}

      <LycorisZoneGrid
        cycles={cycles}
        selected={selected}
        onSelect={setSelected}
        onEditStart={() => setGameModal('start')}
      />

      {/* AT列は横スクロールの右端で隠れるので、いちばん押す「AT当選」は表の下にも置く */}
      <button
        type="button"
        className={styles.atCloseBtn}
        onClick={() => setSelected({ row: activeCycle.index, col: 'at' })}
      >
        {activeCycle.index}回目 AT当選（サイクルを締める）
      </button>
      <p className={styles.hint}>
        CZ列（0〜750G）は通過して空なら「CZなし」として扱います。高確列（50・150・450G）は帯の結果を押したものだけを使います。
        規定G数以外のCZ（小役変換・スタンプ等）と短縮告知は「他」列に入れてください。
      </p>

      <Modal
        isOpen={gameModal !== null}
        onClose={() => setGameModal(null)}
        title={gameModal === 'start' ? '打ち始めのサブ液晶G' : '現在のサブ液晶G'}
      >
        {gameModal !== null && (
          <DrumPicker
            initialValue={gameModal === 'start' ? startGame : activeCycle.reachedGame}
            onConfirm={(value) => {
              if (gameModal === 'start') updateStartGame(value);
              else updateCurrentGame(value);
              setGameModal(null);
            }}
            onCancel={() => setGameModal(null)}
          />
        )}
      </Modal>

      {selected && selectedCycle && (
        <CellModal
          key={`${selected.row}-${selected.col}`}
          cycle={selectedCycle}
          col={selected.col}
          onClose={() => setSelected(null)}
          onInsert={(body) => insertInto(selectedCycle, body)}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
          onSetReached={updateCurrentGame}
        />
      )}
    </div>
  );
}

// ========================================
// セルのモーダル
// ========================================

interface CellModalProps {
  cycle: LycorisCycle;
  col: LycorisCellPosition['col'];
  onClose: () => void;
  onInsert: (body: LycorisEventInput) => void;
  onUpdate: (index: number, body: LycorisEventInput) => void;
  onDelete: (index: number) => void;
  /** 進行中の行の到達G（＝現在G）を書き換える */
  onSetReached: (game: number) => void;
}

function CellModal({ cycle, col, onClose, onInsert, onUpdate, onDelete, onSetReached }: CellModalProps) {
  const done = (fn: () => void) => () => {
    fn();
    onClose();
  };

  if (col === 'at') {
    return (
      <Modal isOpen onClose={onClose} title={`${cycle.index}回目 AT`}>
        <AtForm
          initial={cycle.at}
          defaultGame={cycle.reachedGame}
          onSave={(body) => {
            if (cycle.at) onUpdate(cycle.atEventIndex, body);
            else onInsert(body);
            onClose();
          }}
          onDelete={cycle.at ? done(() => onDelete(cycle.atEventIndex)) : null}
        />
      </Modal>
    );
  }

  if (col === 'other') {
    return (
      <Modal isOpen onClose={onClose} title={`${cycle.index}回目 規定G数以外のCZ・短縮告知`}>
        <OthersForm
          cycle={cycle}
          onAdd={(body) => {
            onInsert(body);
            onClose();
          }}
          onDelete={onDelete}
        />
      </Modal>
    );
  }

  const cell = cycle.cells.find((c) => c.game === col);
  if (!cell) return null;
  return (
    <Modal isOpen onClose={onClose} title={`${cycle.index}回目 ${cell.game}G`}>
      {cell.kind === 'cz' ? (
        <CzCellForm
          cell={cell}
          cycle={cycle}
          onRecord={done(() => onInsert({ type: 'cz', game: cell.game, trigger: 'zone' }))}
          onDelete={done(() => onDelete(cell.eventIndex))}
          onSetReached={done(() => onSetReached(cell.game))}
        />
      ) : (
        <KoukakuCellForm
          cell={cell}
          firstCycle={cycle.previousAt === null}
          onSave={(result) => {
            const body = { type: 'koukaku-zone' as const, game: cell.game as 50 | 150 | 450, result };
            if (cell.eventIndex >= 0) onUpdate(cell.eventIndex, body);
            else onInsert(body);
            onClose();
          }}
          onDelete={cell.eventIndex >= 0 ? done(() => onDelete(cell.eventIndex)) : null}
        />
      )}
    </Modal>
  );
}

function CzCellForm({
  cell,
  cycle,
  onRecord,
  onDelete,
  onSetReached,
}: {
  cell: LycorisGridCell;
  cycle: LycorisCycle;
  onRecord: () => void;
  onDelete: () => void;
  onSetReached: () => void;
}) {
  return (
    <div className={styles.form}>
      <p className={styles.hint}>
        {cell.game}Gの規定ゲーム数ゾーン（{LYCORIS_CZ_ZONE_NOTE[cell.game as keyof typeof LYCORIS_CZ_ZONE_NOTE]}）。
        {cell.czWon
          ? 'このゾーンからCZ当選を記録済みです。'
          : cell.unreached
            ? 'まだ未到達です。'
            : '通過済みで「CZなし」として扱っています。'}
      </p>
      {!cell.czWon && (
        <button type="button" className={styles.primary} onClick={onRecord}>
          ◎ このゾーンからCZ当選
        </button>
      )}
      {/* 到達Gを動かせるのは進行中の行だけ。締めた行はAT当選Gで決まっている */}
      {!cell.czWon && cycle.active && (
        <button type="button" className={styles.secondary} onClick={onSetReached}>
          {cell.unreached
            ? `${cell.game}Gまで回した（CZなし）`
            : `到達Gを${cell.game}Gに戻す（ここより後を未到達に）`}
        </button>
      )}
      {cell.unreached && cycle.active && !cell.czWon && (
        <p className={styles.hint}>※手前の規定G数も、まとめて「通過・CZなし」になります。</p>
      )}
      {cell.czWon && (
        <button type="button" className={styles.danger} onClick={onDelete}>
          この記録を削除（CZなしに戻す）
        </button>
      )}
      <p className={styles.hint}>CZの成否はAT列（CZ成功→AT）で表します。</p>
    </div>
  );
}

function KoukakuCellForm({
  cell,
  firstCycle,
  onSave,
  onDelete,
}: {
  cell: LycorisGridCell;
  firstCycle: boolean;
  onSave: (result: LycorisKoukakuResult) => void;
  onDelete: (() => void) | null;
}) {
  return (
    <div className={styles.form}>
      <p className={styles.hint}>
        {cell.game}Gの変換高確の抽選（{LYCORIS_KOUKAKU_GAME_NOTE[cell.game as keyof typeof LYCORIS_KOUKAKU_GAME_NOTE]}）。
        帯（液晶左下）が出たかを押してください。すでに高確中・前兆中なら「判別不能」。
        {cell.game === 150 ? ' 150Gだけ設定差があり、設定推測に入ります。' : ' 設定差はなく、帯の見え方の確認に使います。'}
      </p>
      {firstCycle && cell.game === 150 && (
        <p className={styles.warn}>
          1行目の150Gは推定に入りません。朝一は表示G数と内部G数がずれる（設定変更でランダム加算・据え置きなら前日の続き）ためです。
        </p>
      )}
      <div className={styles.resultRow}>
        {KOUKAKU_RESULTS.map((result) => (
          <button
            key={result}
            type="button"
            className={`${styles.resultBtn} ${cell.koukaku === result ? styles.chipSelected : ''}`}
            onClick={() => onSave(result)}
          >
            {LYCORIS_KOUKAKU_LABEL[result]}
          </button>
        ))}
      </div>
      <DeleteButton onDelete={onDelete} label="この記録を削除（未入力に戻す）" />
    </div>
  );
}

function OthersForm({
  cycle,
  onAdd,
  onDelete,
}: {
  cycle: LycorisCycle;
  onAdd: (body: LycorisEventInput) => void;
  onDelete: (index: number) => void;
}) {
  const [game, setGame] = useState(cycle.reachedGame);
  const [trigger, setTrigger] = useState<LycorisCzTrigger>('convert');
  const [ceiling, setCeiling] = useState<LycorisShortCeiling>(
    LYCORIS_SHORT_CEILINGS.find((c) => c > cycle.reachedGame) ?? 750
  );

  return (
    <div className={styles.form}>
      {cycle.others.length > 0 && (
        <ul className={styles.recordList}>
          {cycle.others.map(({ event, eventIndex }) => (
            <li key={eventIndex}>
              <span>
                {event.game}G{' '}
                {event.type === 'cz'
                  ? `CZ当選（${LYCORIS_CZ_TRIGGER_LABEL[event.trigger]}）`
                  : event.type === 'short-notice'
                    ? `短縮告知 ${event.ceiling}G`
                    : ''}
              </span>
              <button type="button" onClick={() => onDelete(eventIndex)}>削除</button>
            </li>
          ))}
        </ul>
      )}

      <GameField value={game} onChange={setGame} />

      <h3 className={styles.formSection}>CZ当選</h3>
      <Chips options={OTHER_CZ_TRIGGERS} value={trigger} label={(t) => LYCORIS_CZ_TRIGGER_LABEL[t]} onChange={setTrigger} />
      <button type="button" className={styles.primary} onClick={() => onAdd({ type: 'cz', game, trigger })}>
        {game}G CZ当選（{LYCORIS_CZ_TRIGGER_LABEL[trigger]}）を記録
      </button>

      <h3 className={styles.formSection}>短縮告知</h3>
      <p className={styles.hint}>
        スタンプ前兆失敗時などに出る短縮告知（アイコン 青＜緑＜赤 の順で浅い天井）。告知後はサブ液晶に短縮天井までのG数が出ます。
        ラッシュ50終了後のサイクルなら天井短縮の軸に入ります。
      </p>
      <Chips options={LYCORIS_SHORT_CEILINGS} value={ceiling} label={(c) => `${c}G`} onChange={setCeiling} />
      <button
        type="button"
        className={styles.secondary}
        onClick={() => onAdd({ type: 'short-notice', game, ceiling })}
      >
        短縮告知（{ceiling}G）を記録
      </button>
    </div>
  );
}

// --- 部品 ---

function GameField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className={styles.fieldLabel}>
      サブ液晶のG数（AT間）
      <input
        className={styles.numberInput}
        type="number"
        inputMode="numeric"
        min={0}
        max={LYCORIS_MAX_GAME}
        value={value}
        onChange={(e) => onChange(clampGame(Number(e.target.value)))}
      />
    </label>
  );
}

function Chips<T extends string | number>({
  options,
  value,
  label,
  onChange,
}: {
  options: readonly T[];
  value: T | null;
  label: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <div className={styles.chipRow}>
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          className={`${styles.chip} ${value === option ? styles.chipSelected : ''}`}
          onClick={() => onChange(option)}
        >
          {label(option)}
        </button>
      ))}
    </div>
  );
}

function DeleteButton({ onDelete, label = 'この記録を削除' }: { onDelete: (() => void) | null; label?: string }) {
  if (!onDelete) return null;
  return (
    <button type="button" className={styles.danger} onClick={onDelete}>
      {label}
    </button>
  );
}

// --- AT ---

function AtForm({
  initial,
  defaultGame,
  onSave,
  onDelete,
}: {
  initial: LycorisAtEvent | null;
  defaultGame: number;
  onSave: (body: LycorisAtEvent) => void;
  onDelete: (() => void) | null;
}) {
  const [game, setGame] = useState(initial?.game ?? defaultGame);
  const [route, setRoute] = useState<LycorisAtRoute>(initial?.route ?? 'cz');
  const [shortCeiling, setShortCeiling] = useState<LycorisShortCeiling | null>(initial?.shortCeiling ?? null);
  const [prologue, setPrologue] = useState<LycorisPrologue | null>(initial?.prologue ?? null);
  const [rush, setRush] = useState<LycorisRush | null>(initial?.rush ?? null);
  const [outcome, setOutcome] = useState<LycorisRushOutcome | null>(initial?.outcome ?? null);
  const [episodes, setEpisodes] = useState<LycorisEpisode[]>(initial?.episodes ?? []);
  const [endScreen, setEndScreen] = useState<LycorisEndScreen | null>(initial?.endScreen ?? null);
  const [trophy, setTrophy] = useState<LycorisTrophy | null>(initial?.trophy ?? null);

  const needsCeiling = route === 'short-ceiling' && shortCeiling === null;
  const toggle = <T,>(current: T | null, next: T): T | null => (current === next ? null : next);

  return (
    <div className={styles.form}>
      <h3 className={styles.formSection}>当選</h3>
      <GameField value={game} onChange={setGame} />
      <span className={styles.fieldLabel}>
        経路
        <span className={styles.sub}>直撃＝CZを経由しない当選（天井は除く）。設定推測に入ります。</span>
      </span>
      <Chips options={AT_ROUTES} value={route} label={(r) => LYCORIS_AT_ROUTE_LABEL[r]} onChange={setRoute} />
      {route === 'short-ceiling' && (
        <>
          <span className={styles.fieldLabel}>どの短縮天井で当たったか</span>
          <Chips options={LYCORIS_SHORT_CEILINGS} value={shortCeiling} label={(c) => `${c}G`} onChange={setShortCeiling} />
        </>
      )}

      <span className={styles.fieldLabel}>
        プロローグ
        <span className={styles.sub}>タイトルは出ないので映像で選んでください</span>
      </span>
      <div className={styles.optionList}>
        {LYCORIS_PROLOGUES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.optionBtn} ${styles[`strength_${p.strength}`]} ${prologue === p.id ? styles.chipSelected : ''}`}
            onClick={() => setPrologue(toggle(prologue, p.id))}
          >
            <b>{p.scene}</b>
            <small>{p.label} ／ {p.hint}</small>
          </button>
        ))}
      </div>

      <h3 className={styles.formSection}>
        終了 <span className={styles.sub}>AT終了後に、この行のAT列をタップして入力できます</span>
      </h3>
      <span className={styles.fieldLabel}>ラッシュ種別</span>
      <Chips options={RUSHES} value={rush} label={(r) => LYCORIS_RUSH_LABEL[r]} onChange={(r) => setRush(toggle(rush, r))} />
      <span className={styles.fieldLabel}>
        終わり方
        <span className={styles.sub}>次のサイクルの天井と、天井短縮の軸（ラッシュ50終了のみ）に使います</span>
      </span>
      <Chips options={OUTCOMES} value={outcome} label={(o) => LYCORIS_OUTCOME_LABEL[o]} onChange={(o) => setOutcome(toggle(outcome, o))} />

      <span className={styles.fieldLabel}>
        エピソードボーナス（選んだ順）
        <span className={styles.sub}>EP3は同じラッシュ内の1回目だけ示唆が有効です</span>
      </span>
      {episodes.length > 0 && (
        <ol className={styles.episodeList}>
          {episodes.map((id, i) => (
            <li key={`${id}-${i}`}>
              <span>{findLycorisEpisode(id)?.rush === 'w' ? 'W ' : ''}{findLycorisEpisode(id)?.label}</span>
              <button type="button" onClick={() => setEpisodes(episodes.filter((_, j) => j !== i))}>削除</button>
            </li>
          ))}
        </ol>
      )}
      <div className={styles.episodeGrid}>
        {(['rush', 'w'] as const).map((kind) => (
          <div key={kind} className={styles.chipRow}>
            <span className={styles.episodeHead}>{kind === 'rush' ? 'ラッシュ' : 'ラッシュW'}</span>
            {LYCORIS_EPISODES.filter((e) => e.rush === kind).map((e) => (
              <button
                key={e.id}
                type="button"
                className={`${styles.chip} ${styles[`strength_${e.strength}`]}`}
                title={`${e.label} ／ ${e.hint}`}
                onClick={() => setEpisodes([...episodes, e.id])}
              >
                {e.id.replace(/^(rush|w)-/, '').toUpperCase()}
              </button>
            ))}
          </div>
        ))}
      </div>

      <span className={styles.fieldLabel}>終了画面</span>
      <div className={styles.optionList}>
        {LYCORIS_END_SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.optionBtn} ${styles[`strength_${s.strength}`]} ${endScreen === s.id ? styles.chipSelected : ''}`}
            onClick={() => setEndScreen(toggle(endScreen, s.id))}
          >
            <b>{s.label}</b>
            <small>{s.hint}</small>
          </button>
        ))}
      </div>
      {endScreen !== null && lycorisCasualVariant(endScreen, rush, outcome) === 'unknown' && (
        <p className={styles.warn}>私服はラッシュ種別と終わり方で意味が変わります（逆のキャラなら設定4以上濃厚）。両方入れてください。</p>
      )}

      <span className={styles.fieldLabel}>サミートロフィー</span>
      <div className={styles.chipRow}>
        {LYCORIS_TROPHIES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.chip} ${trophy === t.id ? styles.chipSelected : ''}`}
            onClick={() => setTrophy(toggle(trophy, t.id))}
          >
            <span className={styles.trophyDot} style={{ background: LYCORIS_TROPHY_COLOR[t.id] }} />
            {t.label}
            <small>{t.hint}</small>
          </button>
        ))}
      </div>

      {needsCeiling && <p className={styles.warn}>どの短縮天井で当たったかを選んでください。</p>}
      <button
        type="button"
        className={styles.primary}
        disabled={needsCeiling}
        onClick={() =>
          onSave({
            type: 'at',
            game,
            route,
            shortCeiling: route === 'short-ceiling' ? shortCeiling : null,
            prologue,
            rush,
            outcome,
            episodes,
            endScreen,
            trophy,
          })
        }
      >
        {initial ? '更新' : 'AT当選を記録（サイクルを締める）'}
      </button>
      <DeleteButton onDelete={onDelete} label="このATを取り消す（前後のサイクルを結合）" />
    </div>
  );
}
