import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { KabaneriCzCharacter, KabaneriCzEvent, KabaneriMachine } from '../../types';
import { useMachineStore } from '../../stores/machineStore';
import { Modal } from '../common/Modal';
import {
  CHARACTER_LABELS, CZ_CHARACTERS, EMPTY_CZ_EVENTS, czTriggerCandidates, describeCzEvent, summarizeKabaneriCz,
} from '../../utils/kabaneriCz';
import styles from './KabaneriCzTracker.module.css';

const COLORS = { mumei: '#ff8a82', ikoma: '#86efac', kabane: '#7ab8ff' };
const pointText = (points: number, unknownCount: number) => `${points} pt${unknownCount ? ' ＋不明' : ''}`;

function CzForm({ events, character, onClose }: { events: KabaneriCzEvent[]; character: KabaneriCzCharacter; onClose: () => void }) {
  const [trigger, setTrigger] = useState('');
  const [doran, setDoran] = useState(false);
  const record = useMachineStore((s) => s.recordKabaneriCz);
  const candidates = czTriggerCandidates(events, character);
  const positions = new Map(events.map((event, index) => [event.id, index + 1]));
  const end = trigger ? events.findIndex((e) => e.id === trigger) + 1 : events.length;
  const cycle = summarizeKabaneriCz(events.slice(0, end)).current[character];
  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); record(character, trigger || null, doran); onClose(); }}>
      <label>今回のCZに含める記録
        <select value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          <option value="">現在まで（当選契機が不明の場合）</option>
          {[...candidates].reverse().map((event) => <option key={event.id} value={event.id}>#{positions.get(event.id)} {describeCzEvent(event)} まで</option>)}
        </select>
      </label>
      <p className={styles.help}>本前兆中に引いた分を次回に残すには、当選契機になったチャンス目を選びます。不明の場合は告知時までの概算です。</p>
      <div className={styles.preview}>
        <strong>今回：{pointText(cycle.points, cycle.unknownCount)}</strong>
        <span>{cycle.chanceCount}回の成立記録{!cycle.complete ? '・開始前の蓄積不明' : ''}</span>
      </div>
      <label className={styles.checkbox}><input type="checkbox" checked={doran} onChange={(e) => setDoran(e.target.checked)} />このCZが銅藍CZへ昇格</label>
      <p className={styles.help}>無名と生駒は別々に記録します。一方のCZを記録しても、もう一方のポイントは残ります。</p>
      <button className={styles.primary} type="submit">CZ当選を保存</button>
    </form>
  );
}

export function KabaneriCzTracker({ machine }: { machine: KabaneriMachine }) {
  const events = machine.czEvents ?? EMPTY_CZ_EVENTS;
  const summary = useMemo(() => summarizeKabaneriCz(events), [events]);
  const positions = useMemo(() => new Map(events.map((event, index) => [event.id, index + 1])), [events]);
  const [dialog, setDialog] = useState<'start' | KabaneriCzCharacter | null>(null);
  const [fromZero, setFromZero] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const start = useMachineStore((s) => s.startKabaneriCzTracking);
  const remove = useMachineStore((s) => s.deleteKabaneriCzEvent);
  const deleting = events.find((e) => e.id === deleteId);

  return (
    <section className={styles.container} aria-label="CZポイント記録">
      <div className={styles.heading}><span>CZポイント</span><span className={styles.badge}>推定</span></div>
      <div className={styles.cards}>
        {CZ_CHARACTERS.map((character) => {
          const cycle = summary.current[character];
          const results = summary.history.filter((r) => r.character === character);
          const valid = results.filter((r) => r.complete && r.unknownCount === 0 && r.chanceCount > 0);
          const average = valid.length ? valid.reduce((s, r) => s + r.points, 0) / valid.length : null;
          return (
            <article key={character} className={styles.card} style={{ '--accent': COLORS[character] } as CSSProperties} aria-label={`${CHARACTER_LABELS[character]}のCZポイント`}>
              <div className={styles.cardHeading}><strong>{CHARACTER_LABELS[character]}</strong><span>CZ {results.length}回</span></div>
              <span className={styles.caption}>現在の換算蓄積</span>
              <div className={styles.points}>{cycle.points}<small> pt</small></div>
              <div className={styles.uncertainty}>{cycle.unknownCount > 0 && `＋換算不明 ${cycle.unknownCount}件`}{!cycle.complete && <span>開始前の蓄積不明</span>}</div>
              <span className={styles.caption}>平均 {average === null ? '—' : `${average.toFixed(1)} pt`} / CZ（{valid.length}件）</span>
              <button type="button" className={styles.czButton} onClick={() => setDialog(character)}>{CHARACTER_LABELS[character]}CZを記録</button>
            </article>
          );
        })}
      </div>

      <details className={styles.details}>
        <summary>CZ当選履歴（{summary.history.length}件）</summary>
        {summary.history.length === 0 ? <p className={styles.help}>CZを記録すると、当選までの換算ポイントが表示されます。</p> : (
          <div className={styles.tableWrap}><table>
            <thead><tr><th>回</th><th>CZ</th><th>換算pt</th><th>集計</th></tr></thead>
            <tbody>{summary.history.map((r, i) => <tr key={r.id}>
              <td>{i + 1}</td><td>{CHARACTER_LABELS[r.character]}{r.doran && '→銅藍'}</td>
              <td>{pointText(r.points, r.unknownCount)}</td><td>{!r.chanceCount ? '記録なし' : r.complete && !r.unknownCount ? '全区間' : !r.complete ? '途中から' : '不明あり'}</td>
            </tr>)}</tbody>
          </table></div>
        )}
        <p className={styles.help}>平均は開始点が分かり、成立記録があり、換算不明のない完了区間だけで計算します。現在進行中の分は含めません。</p>
      </details>
      <details className={styles.details}>
        <summary>成立役・操作履歴（{events.length}件）</summary>
        <p className={styles.help}>遊技順に集計しています。削除すると、発光率カウント・CZ履歴・現在ポイントも再計算されます。CZは選んだ当選契機の直後に表示されます。</p>
        <ol className={styles.eventList}>
          {[...events].reverse().slice(0, showAll ? undefined : 30).map((event) => (
            <li key={event.id}><span><small>#{positions.get(event.id)}</small> {describeCzEvent(event)}</span>
              <button type="button" aria-label={`記録 ${positions.get(event.id)} を削除`} onClick={() => setDeleteId(event.id)}>削除</button>
            </li>
          ))}
        </ol>
        {!showAll && events.length > 30 && <button className={styles.addButton} type="button" onClick={() => setShowAll(true)}>すべて表示</button>}
      </details>
      <details className={styles.details}>
        <summary>換算ルール・集計開始位置</summary>
        <p className={styles.help}>内部ポイントや残りポイントを断定する値ではありません。今作の詳細振り分けは未確定のため、前作を参考にした暫定換算です。150ptで自動リセットする処理は行いません。</p>
        <div className={styles.tableWrap}><table><thead><tr><th>無名・生駒の役</th><th>通常</th><th>高確</th></tr></thead>
          <tbody><tr><td>単独・非発光</td><td>1 pt</td><td>15 pt</td></tr><tr><td>単独・発光</td><td>15 pt</td><td>15 pt</td></tr><tr><td>複合</td><td>15 pt</td><td>30 pt</td></tr></tbody>
        </table></div>
        <p className={styles.help}>複合は成立した各キャラの高確状態で別々に換算。超高確・オールスター・発光不明は数値を推定できない記録として扱います。ST終了だけではCZポイントをリセットしません。</p>
        <button className={styles.addButton} type="button" onClick={() => setDialog('start')}>ここから集計を開始</button>
      </details>

      {dialog !== null && <Modal isOpen onClose={() => setDialog(null)} title={dialog === 'start' ? '集計開始位置を記録' : `${CHARACTER_LABELS[dialog]}CZ当選`}>
        {dialog === 'start' ? (
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); start(fromZero); setDialog(null); }}>
            <p className={styles.help}>無名・生駒の現在の集計を区切ります。カウントと過去の履歴は残ります。</p>
            <label>開始時の状態<select value={fromZero ? 'zero' : 'unknown'} onChange={(e) => setFromZero(e.target.value === 'zero')}>
              <option value="unknown">途中から（開始前の蓄積は不明）</option><option value="zero">0ptから（区間リセット確認時など）</option>
            </select></label>
            <button className={styles.primary} type="submit">開始位置を保存</button>
          </form>
        ) : <CzForm events={events} character={dialog} onClose={() => setDialog(null)} />}
      </Modal>}
      {deleting && <Modal isOpen onClose={() => setDeleteId(null)} title="記録を削除">
        <div className={styles.form}><p>{describeCzEvent(deleting)}</p><p className={styles.help}>この記録を除いてポイントを再計算します。</p>
          <button className={styles.primary} type="button" onClick={() => { remove(deleting.id); setDeleteId(null); }}>この記録を削除</button>
        </div>
      </Modal>}
    </section>
  );
}
