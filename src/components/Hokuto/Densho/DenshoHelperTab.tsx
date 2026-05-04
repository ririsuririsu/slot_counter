import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMachineStore, isHokutoMachine } from '../../../stores/machineStore';
import {
  OBSERVABLE_YAKU_LABELS,
  PHASE_LABELS,
  CONFIDENCE_LABELS,
} from '../../../data/denshoConstants';
import { DENSHO_END_TRANSITION } from '../../../data/hokutoDefinitions';
import { confidenceBadgeOf } from '../../../types/densho';
import type {
  DenshoEvent,
  DenshoHelperState,
  ObservableYaku,
} from '../../../types/densho';
import {
  computeEventSnapshots,
  computeExtendedDist,
  computePendingTenhaProbability,
  deriveLiveSnapshot,
  rebuildHelperFromEvents,
} from '../../../utils/denshoEstimation';
import type { EventSnapshot } from '../../../utils/denshoEstimation';
import type { ExtendedStateDist } from '../../../types/densho';
import { Modal } from '../../common/Modal';
import styles from './DenshoHelperTab.module.css';

interface Props {
  /** 現在ゲーム数(イベント記録のデフォルト値) */
  currentGame: number;
  /** 現在ゲーム数を直接設定するコールバック */
  onSetCurrentGame: (g: number) => void;
}

export function DenshoHelperTab({ currentGame, onSetCurrentGame }: Props) {
  const machine = useMachineStore((s) => s.getCurrentMachine());
  const addDenshoEvent = useMachineStore((s) => s.addDenshoEvent);
  const undoLastDenshoEvent = useMachineStore((s) => s.undoLastDenshoEvent);
  const resetDenshoHelper = useMachineStore((s) => s.resetDenshoHelper);
  const deleteDenshoEventAt = useMachineStore((s) => s.deleteDenshoEventAt);

  const [inputOpen, setInputOpen] = useState(false);
  const [settingOpen, setSettingOpen] = useState(false);

  if (!machine || !isHokutoMachine(machine)) return null;
  const helper = machine.denshoHelper;

  // ストアの helper.* は古いロジックで適用された state が混在する可能性があるため、
  // 表示レイヤでは events から再構築した freshHelper を使う
  const freshHelper = useMemo(
    () => rebuildHelperFromEvents(helper.events),
    [helper.events],
  );

  const snapshots = useMemo(
    () => computeEventSnapshots(helper.events),
    [helper.events],
  );

  // 入力モーダル/サマリーで使う「現在のライブ状態」は freshHelper 経由
  const livePhase = snapshots.length > 0
    ? snapshots[snapshots.length - 1].phase
    : freshHelper.phase;

  const handleAddEvent = (event: DenshoEvent) => {
    addDenshoEvent(event);
    setInputOpen(false);
  };

  const handleStart = (
    kind: 'reset-start' | 'at-end' | 'tenha-end',
    game: number,
  ) => {
    addDenshoEvent({ type: kind, id: uuidv4(), game });
  };

  return (
    <div className={styles.container}>
      <SummaryHeader
        helper={freshHelper}
        snapshots={snapshots}
        currentGame={currentGame}
        onOpenSetting={() => setSettingOpen(true)}
      />

      <LogTimeline
        snapshots={snapshots}
        onDelete={deleteDenshoEventAt}
        onStart={handleStart}
        currentGame={currentGame}
      />

      <div className={styles.fabRow}>
        <button
          type="button"
          className={styles.undoBtn}
          onClick={undoLastDenshoEvent}
          disabled={helper.events.length === 0}
        >
          ← 直前取消
        </button>
        <button
          type="button"
          className={styles.fab}
          onClick={() => setInputOpen(true)}
        >
          ＋ イベント追加
        </button>
      </div>

      <Modal
        isOpen={inputOpen}
        onClose={() => setInputOpen(false)}
        title="イベント追加"
        alignTop
        draggable
      >
        <DenshoInputForm
          phase={livePhase}
          initialGame={currentGame}
          onSetCurrentGame={onSetCurrentGame}
          onSubmit={handleAddEvent}
          onResetAll={() => {
            if (confirm('伝承推測補助のデータを全リセットしますか?')) {
              resetDenshoHelper();
              setInputOpen(false);
            }
          }}
        />
      </Modal>

      <Modal
        isOpen={settingOpen}
        onClose={() => setSettingOpen(false)}
        title="設定推定"
        alignTop
      >
        <SettingPosteriorPanel helper={freshHelper} />
      </Modal>
    </div>
  );
}

// ========================================
// サマリーヘッダー(常時表示、コンパクト)
// ========================================

function SummaryHeader({
  helper,
  snapshots,
  currentGame,
  onOpenSetting,
}: {
  helper: DenshoHelperState;
  snapshots: EventSnapshot[];
  currentGame: number;
  onOpenSetting: () => void;
}) {
  // 最新スナップショットを基点に、currentGame までライブ進行を反映
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  // 入力済みイベント以降の経過G分の転落・タイムアウトを反映したライブ状態を導出
  const liveState = useMemo(
    () => deriveLiveSnapshot(helper, currentGame),
    [helper, currentGame],
  );
  const denProb = latest ? liveState.denProb : helper.denProb;
  const phase = liveState.phase;
  const denshoStayPct = Math.round(denProb * 100);

  // 天破前兆 = 直近16Gで未確定の天破抽選の累積確率
  const pendingTenhaProb = useMemo(
    () => computePendingTenhaProbability(liveState, currentGame),
    [liveState, currentGame],
  );
  const pendingTenhaPct = Math.round(pendingTenhaProb * 100);

  let phaseDetail = '';
  if (phase === 'after-densho') {
    const remaining = Math.max(0, 30 - (currentGame - helper.cycleStartGame));
    phaseDetail = `観測中(残り${remaining}G)`;
  } else if (phase === 'in-densho') {
    phaseDetail = `${currentGame - helper.cycleStartGame}G経過`;
  } else {
    phaseDetail = '待機中';
  }

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryRow}>
        <div className={`${styles.phaseBadge} ${styles[`phase_${phase}`]}`}>
          {PHASE_LABELS[phase]}
        </div>
        <span className={styles.phaseDetail}>{phaseDetail}</span>
      </div>
      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>伝承滞在</span>
        <strong className={styles.summaryValue}>{denshoStayPct}%</strong>
        {phase === 'in-densho' || phase === 'observing' || phase === 'after-densho' ? (
          <>
            <span className={styles.summaryLabelSub}>天破前兆</span>
            <strong className={styles.summaryValueSub}>{pendingTenhaPct}%</strong>
          </>
        ) : (
          <span className={styles.summarySpacer} />
        )}
        <button
          type="button"
          className={styles.openSettingBtn}
          onClick={onOpenSetting}
        >
          設定推定 ({helper.samples.length})
        </button>
      </div>
    </div>
  );
}

// ========================================
// ログタイムライン
// ========================================

function LogTimeline({
  snapshots,
  onDelete,
  onStart,
  currentGame,
}: {
  snapshots: EventSnapshot[];
  onDelete: (index: number) => void;
  onStart: (kind: 'reset-start' | 'at-end' | 'tenha-end', game: number) => void;
  currentGame: number;
}) {
  if (snapshots.length === 0) {
    return <StartPicker onStart={onStart} currentGame={currentGame} />;
  }
  // 最新を上に
  const reversed = [...snapshots].reverse();
  const firstIdx = snapshots.length - 1;
  return (
    <div className={styles.timeline}>
      {reversed.map((snap, i) => (
        <LogEntry
          key={snap.event.id}
          snap={snap}
          index={firstIdx - i}
          onDelete={() => onDelete(firstIdx - i)}
        />
      ))}
    </div>
  );
}

function StartPicker({
  onStart,
  currentGame,
}: {
  onStart: (kind: 'reset-start' | 'at-end' | 'tenha-end', game: number) => void;
  currentGame: number;
}) {
  return (
    <div className={styles.startPicker}>
      <p className={styles.startTitle}>開始時の状態を選択</p>
      <p className={styles.startHint}>
        現在 G: {currentGame}G で開始します
      </p>
      <div className={styles.startGrid}>
        <button
          type="button"
          className={`${styles.startBtn} ${styles.startReset}`}
          onClick={() => onStart('reset-start', currentGame)}
        >
          <span className={styles.startBtnLabel}>リセット</span>
          <span className={styles.startBtnSub}>朝一・設定変更</span>
          <span className={styles.startBtnDist}>低25 / 通25 / 高50</span>
        </button>
        <button
          type="button"
          className={`${styles.startBtn} ${styles.startAtEnd}`}
          onClick={() => onStart('at-end', currentGame)}
        >
          <span className={styles.startBtnLabel}>AT 終了</span>
          <span className={styles.startBtnSub}>AT直後</span>
          <span className={styles.startBtnDist}>低0 / 通41 / 高59</span>
        </button>
        <button
          type="button"
          className={`${styles.startBtn} ${styles.startTenhaEnd}`}
          onClick={() => onStart('tenha-end', currentGame)}
        >
          <span className={styles.startBtnLabel}>Tenha 当選</span>
          <span className={styles.startBtnSub}>伝承突入直後</span>
          <span className={styles.startBtnDist}>伝承100% (Lv不明)</span>
        </button>
      </div>
    </div>
  );
}

function LogEntry({
  snap,
  index: _index,
  onDelete,
}: {
  snap: EventSnapshot;
  index: number;
  onDelete: () => void;
}) {
  const { event, phase } = snap;
  const eventLabel = formatEventLabel(event);
  const eventColor = eventColorClass(event);

  // 6状態の拡張分布(設定1基準/設定6基準)
  const extS1 = computeExtendedDist(snap, 's1');
  const extS6 = computeExtendedDist(snap, 's6');

  return (
    <div className={styles.logEntry}>
      <span className={styles.logGame}>{event.game}G</span>
      <span className={`${styles.logEventLabel} ${styles[eventColor]}`}>
        {eventLabel}
      </span>

      {phase === 'idle' ? (
        <span className={styles.logIdleSpacer} />
      ) : (
        <ExtendedStateBars s1={extS1} s6={extS6} />
      )}

      <button
        type="button"
        className={styles.logDelete}
        onClick={() => {
          if (confirm('このイベントを削除しますか?')) onDelete();
        }}
        aria-label="削除"
      >
        ×
      </button>
    </div>
  );
}

/** バーの上に % 数値ラベルを表示するヘルパー */
function SegmentLabels({
  parts,
}: {
  parts: { value: number; className: string }[];
}) {
  return (
    <div className={styles.barLabels}>
      {parts.map((p, i) => (
        <span
          key={i}
          className={`${styles.barLabel} ${p.className}`}
          style={{ width: `${p.value * 100}%` }}
        >
          {p.value > 0.05 ? Math.round(p.value * 100) : ''}
        </span>
      ))}
    </div>
  );
}

/**
 * 6状態(低/通/高/伝承/天破/AT)の積層バー。設定1基準/設定6基準で2本表示。
 */
function ExtendedStateBars({
  s1,
  s6,
}: {
  s1: ExtendedStateDist;
  s6: ExtendedStateDist;
}) {
  return (
    <div className={styles.miniViz}>
      <ExtendedStateRow label="1" dist={s1} />
      <ExtendedStateRow label="6" dist={s6} />
    </div>
  );
}

function ExtendedStateRow({
  label,
  dist,
}: {
  label: string;
  dist: ExtendedStateDist;
}) {
  return (
    <div className={styles.stateRow}>
      <span className={styles.stateRowLabel}>{label}</span>
      <div className={styles.barColumn}>
        <SegmentLabels
          parts={[
            { value: dist.low, className: styles.lblLow },
            { value: dist.normal, className: styles.lblNormal },
            { value: dist.high, className: styles.lblHigh },
            { value: dist.densho, className: styles.lblDensho },
            { value: dist.tenha, className: styles.lblTenha },
            { value: dist.at, className: styles.lblAt },
          ]}
        />
        <div className={styles.stackedBar}>
          <div className={styles.segLow} style={{ width: `${dist.low * 100}%` }} />
          <div className={styles.segNormal} style={{ width: `${dist.normal * 100}%` }} />
          <div className={styles.segHigh} style={{ width: `${dist.high * 100}%` }} />
          <div className={styles.segDensho} style={{ width: `${dist.densho * 100}%` }} />
          <div className={styles.segTenha} style={{ width: `${dist.tenha * 100}%` }} />
          <div className={styles.segAt} style={{ width: `${dist.at * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function formatEventLabel(event: DenshoEvent): string {
  switch (event.type) {
    case 'yaku':
      return OBSERVABLE_YAKU_LABELS[event.yaku];
    case 'tenha-start':
    case 'tenha-end': {
      const dur = event.duration;
      if (dur === undefined) return 'Tenha 当選';
      if (dur === 'infinite') return 'Tenha 当選 ∞';
      return `Tenha 当選 ${dur}G`;
    }
    case 'high-confirm':
      return '高確以上 確定';
    case 'reset-start':
      return 'リセット';
    case 'at-end':
      return 'AT終了';
    case 'at-hit':
      return 'AT 当選';
    case 'check':
      return '状態確認';
  }
}

function eventColorClass(event: DenshoEvent): string {
  switch (event.type) {
    case 'tenha-start':
    case 'tenha-end':
      return 'eventTenha';
    case 'high-confirm':
      return 'eventHigh';
    case 'reset-start':
    case 'at-end':
      return 'eventStart';
    case 'at-hit':
      return 'eventAt';
    case 'check':
      return 'eventCheck';
    case 'yaku':
      if (event.yaku === 'bell') return 'eventBell';
      if (event.yaku === 'kyou-cherry') return 'eventStrong';
      return 'eventYaku';
  }
}

// ========================================
// 入力フォーム(モーダル内)
// ========================================

// チャンス目と勝舞揃いは Tenha 当選率/状態遷移とも同一のため、'chance-me' に統合。
// ボタンも 1 つだけ表示する。
const YAKU_BUTTONS: ObservableYaku[] = [
  'jaku-cherry',
  'kyou-cherry',
  'suika',
  'chance-me',
];

function DenshoInputForm({
  phase,
  initialGame,
  onSetCurrentGame,
  onSubmit,
  onResetAll,
}: {
  phase: DenshoHelperState['phase'];
  initialGame: number;
  onSetCurrentGame: (g: number) => void;
  onSubmit: (event: DenshoEvent) => void;
  onResetAll: () => void;
}) {
  const [g, setG] = useState(initialGame);

  const updateG = (newG: number) => {
    const v = Math.max(0, newG);
    setG(v);
    onSetCurrentGame(v);
  };

  const submit = (build: (game: number) => DenshoEvent) => {
    onSubmit(build(g));
  };

  const submitTenha = (duration: 7 | 14 | 21 | 'infinite') => {
    // Tenha 当選イベントを記録(event.game は Tenha 開始時)
    onSubmit({ type: 'tenha-end', id: uuidv4(), game: g, duration });
    // 継続G数分だけ表示Gを進める(無限は手動で管理)
    if (duration !== 'infinite') {
      onSetCurrentGame(g + duration);
    }
  };

  const submitAtHit = () => {
    // AT 当選イベントを記録
    onSubmit({ type: 'at-hit', id: uuidv4(), game: g });
    // 実機で AT 当選時は区間G数が 0 にリセットされるため、表示Gも 0 に戻す
    onSetCurrentGame(0);
  };

  // ベルは常時表示(伝承外でも観測記録として残せる)
  const showBell = true;
  // 高確以上確定: 通常時観測中(observing)/伝承後観測中(after-densho)で表示
  const showHighConfirm = phase === 'observing' || phase === 'after-densho';

  return (
    <div className={styles.inputForm}>
      {/* G数入力 */}
      <div className={styles.gInputRow}>
        <input
          aria-label="G数"
          type="number"
          inputMode="numeric"
          className={styles.gInput}
          value={g || ''}
          onChange={(e) => updateG(parseInt(e.target.value) || 0)}
          placeholder="0"
        />
        <span className={styles.gUnit}>G</span>
      </div>
      <div className={styles.gQuickRow}>
        <button type="button" className={styles.quickBtn} onClick={() => updateG(g + 1)}>+1</button>
        <button type="button" className={styles.quickBtn} onClick={() => updateG(g + 5)}>+5</button>
        <button type="button" className={styles.quickBtn} onClick={() => updateG(g + 10)}>+10</button>
        <button type="button" className={styles.quickBtn} onClick={() => updateG(g + 50)}>+50</button>
        <button type="button" className={`${styles.quickBtn} ${styles.quickMinus}`} onClick={() => updateG(g - 1)}>-1</button>
      </div>

      {/* レア役 */}
      <div className={styles.formSection}>
        <div className={styles.formLabel}>レア役</div>
        <div className={styles.yakuGrid}>
          {YAKU_BUTTONS.map((y) => (
            <button
              key={y}
              type="button"
              className={styles.yakuBtn}
              onClick={() => submit((game) => ({ type: 'yaku', id: uuidv4(), game, yaku: y }))}
            >
              {OBSERVABLE_YAKU_LABELS[y]}
            </button>
          ))}
          {showBell && (
            <button
              type="button"
              className={`${styles.yakuBtn} ${styles.bellBtn}`}
              onClick={() => submit((game) => ({ type: 'yaku', id: uuidv4(), game, yaku: 'bell' }))}
            >
              {OBSERVABLE_YAKU_LABELS.bell}
            </button>
          )}
          <button
            type="button"
            className={`${styles.yakuBtn} ${styles.checkBtn}`}
            onClick={() => submit((game) => ({ type: 'check', id: uuidv4(), game }))}
          >
            ハズレ
          </button>
        </div>
      </div>

      {/* サイクル */}
      <div className={styles.formSection}>
        <div className={styles.formLabel}>天破当選 (継続G数を選択)</div>
        <div className={styles.tenhaDurationGrid}>
          <button
            type="button"
            className={styles.tenhaDurationBtn}
            onClick={() => submitTenha(7)}
          >
            7G
          </button>
          <button
            type="button"
            className={styles.tenhaDurationBtn}
            onClick={() => submitTenha(14)}
          >
            14G
          </button>
          <button
            type="button"
            className={styles.tenhaDurationBtn}
            onClick={() => submitTenha(21)}
          >
            21G
          </button>
          <button
            type="button"
            className={`${styles.tenhaDurationBtn} ${styles.tenhaDurationInf}`}
            onClick={() => submitTenha('infinite')}
          >
            無限
          </button>
        </div>
      </div>

      {/* セッション開始 — リセットのみ。AT終了は AT当選 ボタンが兼務 */}
      <div className={styles.formSection}>
        <div className={styles.formLabel}>セッション開始</div>
        <button
          type="button"
          className={styles.startResetBtn}
          onClick={() => submit((game) => ({ type: 'reset-start', id: uuidv4(), game }))}
        >
          リセット
        </button>
      </div>

      {/* 観測 */}
      {showHighConfirm && (
        <div className={styles.formSection}>
          <div className={styles.formLabel}>観測</div>
          <button
            type="button"
            className={styles.highConfirmBtn}
            onClick={() => submit((game) => ({ type: 'high-confirm', id: uuidv4(), game }))}
          >
            高確以上 確定
          </button>
        </div>
      )}

      {/* AT 当選(1イベントで AT 終了も兼務。AT が終わって通常時に戻ったタイミングで押下) */}
      <div className={styles.formSection}>
        <div className={styles.formLabel}>AT 当選</div>
        <button
          type="button"
          className={styles.atHitBtn}
          onClick={submitAtHit}
        >
          AT 当選
        </button>
      </div>

      <div className={styles.formFooter}>
        <button type="button" className={styles.resetAllBtn} onClick={onResetAll}>
          全リセット
        </button>
      </div>
    </div>
  );
}

// ========================================
// 設定推定パネル(モーダル内)
// ========================================

function SettingPosteriorPanel({ helper }: { helper: DenshoHelperState }) {
  const samples = helper.samples.length;
  const badge = confidenceBadgeOf(samples);
  const max = Math.max(...helper.settingPosterior, 0.001);

  return (
    <div className={styles.settingPanel}>
      <div className={styles.confidenceRow}>
        <span className={styles.confidenceBadge}>
          {CONFIDENCE_LABELS[badge]}
        </span>
        <span className={styles.sampleCount}>サンプル: {samples}件</span>
      </div>

      {/* 内部状態(仮定別) */}
      <div className={styles.settingSection}>
        <div className={styles.settingSectionTitle}>現在の内部状態(仮定別)</div>
        <table className={styles.stateTable}>
          <thead>
            <tr>
              <th aria-label="状態">状態</th>
              <th>設定1基準</th>
              <th>設定6基準</th>
            </tr>
          </thead>
          <tbody>
            <StateRow label="低確" s1={helper.stateUnderS1.low} s6={helper.stateUnderS6.low} />
            <StateRow label="通常" s1={helper.stateUnderS1.normal} s6={helper.stateUnderS6.normal} />
            <StateRow label="高確" s1={helper.stateUnderS1.high} s6={helper.stateUnderS6.high} />
          </tbody>
        </table>
      </div>

      {/* 設定棒グラフ */}
      <div className={styles.settingSection}>
        <div className={styles.settingSectionTitle}>設定別事後確率</div>
        <div className={styles.settingChart}>
          {helper.settingPosterior.map((p, i) => {
            const pct = (p / max) * 100;
            return (
              <div key={i} className={styles.settingRow}>
                <span className={styles.settingLabel}>設定{i + 1}</span>
                <div className={styles.settingBarTrack}>
                  <div
                    className={styles.settingBarFill}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={styles.settingValue}>
                  {Math.round(p * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {samples === 0 && (
        <p className={styles.hint}>
          Tenha 終了 → 観測 → サンプル蓄積で精度UP
        </p>
      )}
      {samples > 0 && (
        <div className={styles.endTransitionRef}>
          <small>
            参考: 伝承終了時の高確移行率
            設定1: {(DENSHO_END_TRANSITION[1].high * 100).toFixed(1)}% /
            設定6: {(DENSHO_END_TRANSITION[6].high * 100).toFixed(1)}%
          </small>
        </div>
      )}
    </div>
  );
}

function StateRow({
  label,
  s1,
  s6,
}: {
  label: string;
  s1: number;
  s6: number;
}) {
  return (
    <tr>
      <td className={styles.stateLabel}>{label}</td>
      <td>
        <div className={styles.miniBarRow}>
          <div className={styles.miniBarTrack}>
            <div
              className={styles.miniBarFillS1}
              style={{ width: `${Math.round(s1 * 100)}%` }}
            />
          </div>
          <span className={styles.miniBarValue}>{Math.round(s1 * 100)}%</span>
        </div>
      </td>
      <td>
        <div className={styles.miniBarRow}>
          <div className={styles.miniBarTrack}>
            <div
              className={styles.miniBarFillS6}
              style={{ width: `${Math.round(s6 * 100)}%` }}
            />
          </div>
          <span className={styles.miniBarValue}>{Math.round(s6 * 100)}%</span>
        </div>
      </td>
    </tr>
  );
}
