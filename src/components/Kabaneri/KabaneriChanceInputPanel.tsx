import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { KabaneriChanceCondition, KabaneriChanceInput, KabaneriChanceRole, KabaneriChanceType, KabaneriMachine } from '../../types';
import { useMachineStore } from '../../stores/machineStore';
import { Modal } from '../common/Modal';
import { KabaneriButton } from './KabaneriButton';
import { playHaptic } from '../../utils/haptic';
import { chanceDefinitions } from '../../data/kabaneriDefinitions';
import { CHANCE_ROLES, CHARACTER_LABELS, CZ_CHARACTERS, EMPTY_CZ_EVENTS, NORMAL_CONDITIONS, chancePoints, describeCzEvent } from '../../utils/kabaneriCz';
import styles from './KabaneriChanceInputPanel.module.css';
import formStyles from './KabaneriCzTracker.module.css';

const CHARACTERS: KabaneriChanceType[] = ['mumei', 'ikoma', 'kabane'];
type InputKind = 'high' | 'yes' | 'none' | 'lit';
const COLORS = { mumei: '#ff8a82', ikoma: '#86efac', kabane: '#7ab8ff' };

export function KabaneriChanceInputPanel({ machine, mode, orient, haptic, bellInput }: {
  machine: KabaneriMachine; mode: 'add' | 'sub'; orient: number; haptic: boolean; bellInput: ReactNode;
}) {
  const [compound, setCompound] = useState(false);
  const [selection, setSelection] = useState<Partial<Record<KabaneriChanceType, InputKind>>>({});
  const [advanced, setAdvanced] = useState(false);
  const [message, setMessage] = useState('1回の成立につき、ボタンは1つだけ');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const record = useMachineStore((s) => s.recordKabaneriChance);
  const remove = useMachineStore((s) => s.deleteKabaneriCzEvent);
  const decrementCounter = useMachineStore((s) => s.decrementKabaneriCounter);
  const decrementFlash = useMachineStore((s) => s.decrementKabaneriFlash);
  const events = machine.czEvents ?? EMPTY_CZ_EVENTS;
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of events) {
      if (event.type !== 'chance') continue;
      const key = `${event.role}:${event.conditions[event.role as KabaneriChanceType] ?? 'compound'}`;
      counts[key] = (counts[key] ?? 0) + 1;
      if (event.conditions[event.role as KabaneriChanceType] === 'normal' && !event.flashEligible && event.flash === 'unknown') {
        const litKey = `${event.role}:lit`;
        counts[litKey] = (counts[litKey] ?? 0) + 1;
      }
    }
    return counts;
  }, [events]);
  const undoEvent = events.find((event) => event.id === lastAddedId);
  const describeInput = (input: KabaneriChanceInput) => describeCzEvent({ ...input, id: '', timestamp: 0 });

  const submit = (input: KabaneriChanceInput) => {
    if (mode === 'sub') {
      if (input.flashEligible) {
        const role = input.role as KabaneriChanceType;
        const count = machine.counters[role] ?? 0;
        const flash = machine.counters[`${role}Flash`] ?? 0;
        if (input.flash === 'yes' ? flash === 0 : count <= flash) { setMessage('取り消せる記録がありません'); return false; }
        if (input.flash === 'yes') decrementFlash(role); else decrementCounter(role);
      } else {
        const members = CHANCE_ROLES.find((role) => role.id === input.role)!.members;
        const target = [...events].reverse().find((event) => event.type === 'chance' && event.role === input.role &&
          event.flashEligible === input.flashEligible &&
          (members.length !== 1 || input.conditions[members[0]] !== 'normal' || event.flash === input.flash) &&
          members.every((character) => event.conditions[character] === input.conditions[character]));
        if (!target) { setMessage('この役・高確状態の記録はありません'); return false; }
        remove(target.id);
      }
      setMessage(`${describeInput(input)}を1回取消`);
    } else {
      record(input);
      const updated = useMachineStore.getState().getCurrentMachine();
      if (updated?.machineType === 'kabaneri') setLastAddedId(updated.czEvents.at(-1)?.id ?? null);
      setMessage(`${describeInput(input)}を記録`);
    }
    if (haptic) playHaptic();
    return true;
  };

  const selectedCharacters = CHARACTERS.filter((character) => selection[character] !== undefined);
  const compoundRole = CHANCE_ROLES.find((role) => role.members.length >= 2 &&
    role.members.length === selectedCharacters.length && role.members.every((character) => selection[character] !== undefined));
  const compoundInput: KabaneriChanceInput | null = compoundRole ? {
    type: 'chance', role: compoundRole.id, flash: 'yes', flashEligible: false,
    conditions: { mumei: selection.mumei === 'high' ? 'high' : 'normal',
      ikoma: selection.ikoma === 'high' ? 'high' : 'normal', kabane: selection.kabane === 'high' ? 'high' : 'normal' },
  } : null;
  const toggleCompound = () => {
    setCompound(!compound);
    setSelection({});
    setMessage(compound ? '複合入力を解除しました' : 'まだ記録されません。2キャラ以上を選んでください');
  };

  return <section className={`${styles.container} ${compound ? styles.compoundActive : ''}`} aria-label="チャンス目入力">
    <div className={styles.heading}><h2>チャンス目入力</h2>
    <button type="button" role="switch" aria-checked={compound} aria-label="複合入力" className={styles.modeSwitch} onClick={toggleCompound}>
      <span>{compound ? '● 複合入力中' : '複合入力'}</span><strong>{compound ? 'ON' : 'OFF'}</strong><span className={styles.switchTrack} aria-hidden="true" />
    </button>
    </div>
    <div className={styles.singleRows}>
      {chanceDefinitions.map((definition) => {
        const character = definition.id;
        const count = machine.counters[character] ?? 0;
        const flash = machine.counters[`${character}Flash`] ?? 0;
        return <div key={character} className={styles.singleRow} style={{ '--accent': COLORS[character] } as CSSProperties}>
          <strong className={styles.character}>{definition.shortName}</strong>
          {(['high', 'lit', 'yes', 'none'] as const).map((kind) => {
            if (compound && (kind === 'yes' || kind === 'lit')) return <span key={kind} className={styles.buttonSpace} aria-hidden="true" />;
            const label = kind === 'none' ? (compound ? '通常' : '非発光') : kind === 'yes' ? '発光' : kind === 'lit' ? '発光中' : '高確（帯付き）';
            const amount = kind === 'none' ? Math.max(0, count - flash) : kind === 'yes' ? flash : eventCounts[`${character}:${kind}`] ?? 0;
            return <KabaneriButton key={kind} label={label} ariaLabel={`${definition.shortName} ${label}`} orient={orient}
              count={compound ? (selection[character] === kind ? '✓' : '＋') : amount} sub={compound ? (selection[character] === kind ? '選択中' : '選択') : ''}
              selected={compound ? selection[character] === kind : undefined}
              color={definition.nameColor} softColor={definition.nameColorSoft}
              mode={mode} fit haptic={false}
              onCount={() => {
                if (compound) {
                  setSelection((current) => ({ ...current, [character]: current[character] === kind ? undefined : kind }));
                  if (haptic) playHaptic();
                  return;
                }
                submit({ type: 'chance', role: character,
                conditions: { ...NORMAL_CONDITIONS, [character]: kind === 'high' ? 'high' : 'normal' },
                flash: kind === 'none' ? 'none' : kind === 'lit' ? 'unknown' : 'yes', flashEligible: kind === 'none' || kind === 'yes' });
              }} />;
          })}
        </div>;
      })}
    </div>
    <div className={styles.inputDock}>
    <div className={styles.bellInput}><h3>下段ベル</h3>{bellInput}</div>
    <div className={styles.actionArea}>
    {compound ? <div className={styles.composer}>
      <div className={styles.selectionSummary} aria-live="polite">
        <strong>{compoundRole?.label ?? `選択 ${selectedCharacters.length} / 2キャラ以上`}</strong>
        {compoundInput && <span>{CZ_CHARACTERS.filter((character) => selectedCharacters.includes(character)).map((character) => {
          const points = chancePoints(compoundInput, character);
          return `${CHARACTER_LABELS[character]} ${points === null ? '換算不明' : `${points}pt`}`;
        }).join(' ／ ')}（推定）</span>}
      </div>
      <button type="button" className={styles.saveCompound} disabled={!compoundInput} onClick={() => {
        if (compoundInput && submit(compoundInput)) { setCompound(false); setSelection({}); }
      }}>{mode === 'sub' ? '複合の記録を取消' : '複合を1回記録'}</button>
      <small>確定後は自動OFF</small>
    </div> : <div className={styles.singleActions}>
      <button type="button" className={styles.advancedButton} onClick={() => setAdvanced(true)}>超高確などの詳細入力</button>
    </div>}
    <div className={styles.undo}>
      <button type="button" disabled={!undoEvent} onClick={() => {
        if (undoEvent) { remove(undoEvent.id); setMessage('直前の入力を取り消しました'); setLastAddedId(null); }
      }}>直前を取消</button>
    </div>
    </div>
    </div>
    <div className={styles.feedback} role="status">{compound ? `${selectedCharacters.length}キャラ選択中・未確定` : message}</div>
    <details className={styles.help}><summary>入力方法・換算について</summary><p className={styles.hint}>「発光」は今回光ったとき、「発光中」はすでに光っていて判別できないとき。高確中は「高確（帯付き）」を優先。高確・発光中・複合は発光率に含めません。発光中の単独役はポイント換算不明です。複合入力では各キャラの高確・通常を選択し、まとめて記録します。超高確は詳細入力から記録してください。</p></details>
    {advanced && <Modal isOpen onClose={() => setAdvanced(false)} title="詳細入力">
      <ChanceForm onClose={() => setAdvanced(false)} onRecord={submit} mode={mode} />
    </Modal>}
  </section>;
}

function ChanceForm({ onClose, onRecord, mode }: { onClose: () => void; onRecord: (input: KabaneriChanceInput) => void; mode: 'add' | 'sub' }) {
  const [role, setRole] = useState<KabaneriChanceRole>('mumei');
  const [conditions, setConditions] = useState<KabaneriChanceInput['conditions']>({ ...NORMAL_CONDITIONS });
  const [flash, setFlash] = useState<KabaneriChanceInput['flash']>('unknown');
  const definition = CHANCE_ROLES.find((r) => r.id === role)!;
  const input: KabaneriChanceInput = { type: 'chance', role, conditions, flash, flashEligible: false };
  return (
    <form className={formStyles.form} onSubmit={(e) => { e.preventDefault(); onRecord(input); onClose(); }}>
      <label>成立したチャンス目
        <select value={role} onChange={(e) => setRole(e.target.value as KabaneriChanceRole)}>
          {CHANCE_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </label>
      <p className={formStyles.help}>成立した時点の各キャラの帯を選んでください。「ナビ高確」と「カバネリ高確」は別の状態です。</p>
      {definition.members.map((character) => (
        <label key={character}>{CHARACTER_LABELS[character]}の状態
          <select value={conditions[character]} onChange={(e) => setConditions({ ...conditions, [character]: e.target.value as KabaneriChanceCondition })}>
            <option value="normal">通常（帯なし）</option>
            <option value="high">カバネリ高確</option>
            <option value="super">超カバネリ高確</option>
          </select>
        </label>
      ))}
      {definition.members.length === 1 && conditions[definition.members[0]] === 'normal' && (
        <label>発光の確認
          <select value={flash} onChange={(e) => setFlash(e.target.value as KabaneriChanceInput['flash'])}>
            <option value="unknown">不明（発光中など）</option>
            <option value="none">非発光</option>
            <option value="yes">発光</option>
          </select>
        </label>
      )}
      <div className={formStyles.preview}>
        {CZ_CHARACTERS.filter((c) => definition.members.includes(c)).map((c) => (
          <span key={c}>{CHARACTER_LABELS[c]}：{chancePoints(input, c) === null ? '換算不明' : `＋${chancePoints(input, c)} pt（推定）`}</span>
        ))}
        {role === 'kabane' && <span>カバネは周期抽選用です。無名・生駒のCZポイントには加えません。</span>}
      </div>
      <p className={formStyles.help}>この追加記録は発光率の推測対象に含めません。超高確・オールスターのCZは、告知を確認して別途記録してください。</p>
      <button className={formStyles.primary} type="submit">{mode === 'sub' ? '該当する直近の記録を取消' : 'チャンス目を記録'}</button>
    </form>
  );
}
