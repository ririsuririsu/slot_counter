import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { HokutoLog, ResetStatus, ModeDistribution } from '../../types';
import {
  YAKU_LABELS, INTERNAL_STATE_LABELS, TROPHY_LABELS, LAMP_COLOR_LABELS,
  TROPHY_SETTING_FLOOR, LAMP_A_INTERPRETATIONS, LAMP_B_INTERPRETATIONS, LAMP_C_INTERPRETATIONS,
  ZENCHO_CATEGORY_LABELS, SHUTTER_CHECKPOINTS, TENMEI_ZONES, MODE_LABELS,
  type LampInterpretation,
} from '../../data/hokutoDefinitions';
import { estimateModesForAllATs, calculateTengekiExpectedRate } from '../../utils/hokutoEstimation';
import type { EffectHintLog, FakeZenchoLog, LampState, HokutoMode } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { LogEditForm } from './InlineLogEntry';
import styles from './LogTimeline.module.css';

interface Props {
  logs: HokutoLog[];
  resetStatus: ResetStatus;
  onDeleteLog: (id: string) => void;
  editingLog: HokutoLog | null;
  onEditLog: (log: HokutoLog) => void;
  onUpdateLog: (log: HokutoLog) => void;
  onCancelEdit: () => void;
  onInfoLog: (log: HokutoLog) => void;
}

function formatModeEstimate(dist: ModeDistribution): { label: string; mode: HokutoMode } {
  const entries: [HokutoMode, number][] = [
    ['mode-a', dist.modeA], ['mode-b', dist.modeB], ['mode-c', dist.modeC], ['tengoku', dist.tengoku],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const [topMode, topProb] = entries[0];
  return { label: `${MODE_LABELS[topMode]} ${Math.round(topProb * 100)}%`, mode: topMode };
}

// 前兆・天破・演出はネスト（1段インデント）
const NESTED_TYPES = new Set(['fake-zencho', 'tenha', 'effect-hint']);

function findLampNote(interpretations: LampInterpretation[], lamp: LampState): string {
  const match = interpretations.find(
    (l) => l.color === lamp.color && l.pattern === lamp.pattern && !!l.upperWhiteFlow === !!lamp.upperWhiteFlow
  );
  return match?.note ?? '';
}

function getEffectHints(log: EffectHintLog): string[] {
  const hints: string[] = [];
  if (log.trophy) {
    const floor = TROPHY_SETTING_FLOOR[log.trophy];
    if (floor === 6) hints.push('設定6確定');
    else if (floor) hints.push(`設定${floor}以上確定`);
  }
  if (log.lampA) {
    const note = findLampNote(LAMP_A_INTERPRETATIONS, log.lampA);
    if (note && note !== 'デフォルト') hints.push(note);
  }
  if (log.lampB) {
    const note = findLampNote(LAMP_B_INTERPRETATIONS, log.lampB);
    if (note) hints.push(note);
  }
  if (log.lampC) {
    const note = findLampNote(LAMP_C_INTERPRETATIONS, log.lampC);
    if (note) hints.push(note);
  }
  return hints;
}

function getZenchoHint(log: FakeZenchoLog): string {
  if (log.zenchoCategory === 'shutter' || log.zenchoCategory === 'other') {
    const cp = SHUTTER_CHECKPOINTS.find((c) => log.abeshiCount >= c.min && log.abeshiCount <= c.max);
    return cp ? cp.note : '';
  }
  if (log.zenchoCategory === 'tenmei') {
    const zone = TENMEI_ZONES.find((z) => log.abeshiCount >= z.min && log.abeshiCount <= z.max);
    return zone?.note ?? '';
  }
  return '';
}

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <span className={styles.actions}>
      <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); onEdit(); }}>&#9998;</button>
      <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); onDelete(); }}>x</button>
    </span>
  );
}

function LogEntry({ log, onDelete, onEdit, onInfo, modeEstimate }: { log: HokutoLog; onDelete: () => void; onEdit: () => void; onInfo: () => void; modeEstimate?: ModeDistribution }) {
  const nested = NESTED_TYPES.has(log.type);
  const highlight = log.type === 'at-win' ? styles.entryAT : log.type === 'tengeki' ? styles.entryTengeki : '';
  const entryClass = `${styles.entry} ${nested ? styles.entryNested : ''} ${highlight}`;

  switch (log.type) {
    case 'at-win': {
      const triggerText = log.trigger === 'kitei-abeshi' ? '既定あべし' : `直撃(${YAKU_LABELS[log.triggerYaku || ''] || ''})`;
      const modeInfo = modeEstimate ? formatModeEstimate(modeEstimate) : null;
      return (
        <div className={entryClass} onClick={onInfo}>
          <span className={`${styles.badge} ${styles.badgeRed}`}>AT</span>
          <span className={styles.entryText}>
            <span className={styles.numGame}>{log.gameCount}</span>G / <span className={styles.numAbeshi}>{log.abeshiCount}</span>あべし / {triggerText}
            {modeInfo && <> / <span className={styles.hintInline}>{modeInfo.label}</span></>}
          </span>
          <ActionButtons onEdit={onEdit} onDelete={onDelete} />
        </div>
      );
    }

    case 'tenha': {
      const durationText = log.duration === 'infinite' ? '無限' : `${log.duration}G`;
      return (
        <div className={entryClass} onClick={onInfo}>
          <span className={`${styles.badge} ${styles.badgeBlue}`}>天破</span>
          <span className={styles.entryText}>
            <span className={styles.numGame}>{log.gameCount}</span>G / {durationText} / {YAKU_LABELS[log.trigger]} / {INTERNAL_STATE_LABELS[log.estimatedState]}
          </span>
          <ActionButtons onEdit={onEdit} onDelete={onDelete} />
        </div>
      );
    }

    case 'tengeki': {
      const resultText = log.result === 'success' ? '成功' : '失敗';
      const yakuSummary = log.games.map((y, i) => `${i}G:${YAKU_LABELS[y]}`).join(' ');
      const [pLow, pHigh] = calculateTengekiExpectedRate(log.games, log.prepRareHit);
      const pctLow = Math.round(pLow * 100);
      const pctHigh = Math.round(pHigh * 100);
      const pctText = pctLow === pctHigh ? `${pctLow}%` : `${pctLow}%～${pctHigh}%`;
      return (
        <div className={entryClass} onClick={onInfo}>
          <span className={`${styles.badge} ${styles.badgeGreen}`}>天撃</span>
          <span className={styles.entryText}>
            {resultText} / <span className={styles.hintInline}>{pctText}</span> / {yakuSummary}
          </span>
          <ActionButtons onEdit={onEdit} onDelete={onDelete} />
        </div>
      );
    }

    case 'fake-zencho': {
      const catLabel = ZENCHO_CATEGORY_LABELS[log.zenchoCategory] ?? '前兆';
      const hint = getZenchoHint(log);
      return (
        <div className={entryClass} onClick={onInfo}>
          <span className={`${styles.badge} ${styles.badgeYellow}`}>{catLabel}</span>
          <span className={styles.entryText}>
            <span className={styles.numAbeshi}>{log.abeshiCount}</span>あべし{hint && <> / <span className={styles.hintInline}>{hint}</span></>}
          </span>
          <ActionButtons onEdit={onEdit} onDelete={onDelete} />
        </div>
      );
    }

    case 'effect-hint': {
      const parts: string[] = [];
      if (log.trophy) parts.push(`トロフィー${TROPHY_LABELS[log.trophy]}`);
      const lampEntries: [string, typeof log.lampA][] = [['A', log.lampA], ['B', log.lampB], ['C', log.lampC]];
      for (const [pos, lamp] of lampEntries) {
        if (lamp) {
          let text = `ランプ${pos} ${LAMP_COLOR_LABELS[lamp.color]}`;
          if (lamp.pattern === 'blink') text += '点滅';
          if (lamp.upperWhiteFlow) text += '+上白流れ';
          parts.push(text);
        }
      }
      const hints = getEffectHints(log);
      const display = parts.join(' / ') || '(データなし)';
      return (
        <div className={entryClass} onClick={onInfo}>
          <span className={`${styles.badge} ${styles.badgePurple}`}>演出</span>
          <span className={styles.entryText}>
            {display}{hints.length > 0 && <> / <span className={styles.hintInline}>{hints.join(' / ')}</span></>}
          </span>
          <ActionButtons onEdit={onEdit} onDelete={onDelete} />
        </div>
      );
    }

    case 'densho': {
      const typeLabel = log.denshoType === 'short' ? 'ショート' : log.denshoType === 'middle' ? 'ミドル' : 'ロング';
      return (
        <div className={entryClass} onClick={onInfo}>
          <span className={`${styles.badge} ${styles.badgeGreen}`}>伝承</span>
          <span className={styles.entryText}>{typeLabel} / 終了後: {INTERNAL_STATE_LABELS[log.endState]}</span>
          <ActionButtons onEdit={onEdit} onDelete={onDelete} />
        </div>
      );
    }
  }
}

export function LogTimeline({ logs, resetStatus, onDeleteLog, editingLog, onEditLog, onUpdateLog, onCancelEdit, onInfoLog }: Props) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const editAreaRef = useRef<HTMLDivElement>(null);

  const atModeEstimates = useMemo(
    () => estimateModesForAllATs(logs, resetStatus),
    [logs, resetStatus]
  );

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (editAreaRef.current && !editAreaRef.current.contains(e.target as Node)) {
      onCancelEdit();
    }
  }, [onCancelEdit]);

  useEffect(() => {
    if (!editingLog) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingLog, handleClickOutside]);

  if (logs.length === 0) {
    return (
      <div className={styles.empty}>
        <p>ログがありません</p>
        <p className={styles.emptySub}>下のボタンからプレイ履歴を記録</p>
      </div>
    );
  }

  return (
    <div className={styles.timeline}>
      {logs.map((log) => (
        <div key={log.id}>
          <LogEntry
            log={log}
            onDelete={() => setDeleteTargetId(log.id)}
            onEdit={() => onEditLog(log)}
            onInfo={() => onInfoLog(log)}
            modeEstimate={log.type === 'at-win' ? atModeEstimates[log.id] : undefined}
          />
          {editingLog?.id === log.id && (
            <div className={styles.editArea} ref={editAreaRef}>
              <LogEditForm log={editingLog} onSave={onUpdateLog} onCancel={onCancelEdit} />
            </div>
          )}
        </div>
      ))}

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) onDeleteLog(deleteTargetId);
        }}
        title="ログの削除"
        message="このログを削除しますか？この操作は取り消せません。"
        confirmText="削除"
        cancelText="キャンセル"
        danger
      />
    </div>
  );
}
