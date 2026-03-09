import { useState } from 'react';
import type {
  HokutoLog,
  ATWinLog,
  TenhaLog,
  FakeZenchoLog,
  EffectHintLog,
  DenshoModeLog,
  TengekiGameEntry,
  TenhaDuration,
  InternalState,
  TenhaTriggerYaku,
  ChokugekiYaku,
  TengekiYaku,
  HokutoMode,
  TrophyColor,
  LampState,
} from '../../types';
import {
  YAKU_LABELS,
  INTERNAL_STATE_LABELS,
  TROPHY_LABELS,
  LAMP_COLOR_LABELS,
  MODE_LABELS,
} from '../../data/hokutoDefinitions';
import { Modal } from '../common/Modal';
import styles from './AddLogModal.module.css';

interface Props {
  onClose: () => void;
  onAddLog: (log: HokutoLog) => void;
}

type LogType = HokutoLog['type'];

const LOG_TYPE_OPTIONS: { value: LogType; label: string }[] = [
  { value: 'at-win', label: 'AT当選' },
  { value: 'tenha', label: '天破の刻' },
  { value: 'fake-zencho', label: '前兆' },
  { value: 'effect-hint', label: '演出示唆' },
  { value: 'densho', label: '伝承モード' },
];

// --- 各ログタイプのフォーム ---

function ATWinForm({ onSubmit }: { onSubmit: (log: ATWinLog) => void }) {
  const [gameCount, setGameCount] = useState(0);
  const [abeshiCount, setAbeshiCount] = useState(0);
  const [trigger, setTrigger] = useState<'kitei-abeshi' | 'rare-chokugeki'>('kitei-abeshi');
  const [triggerYaku, setTriggerYaku] = useState<ChokugekiYaku>('jaku-cherry');

  const handleSubmit = () => {
    onSubmit({
      type: 'at-win',
      id: '',
      timestamp: 0,
      gameCount,
      abeshiCount,
      trigger,
      triggerYaku: trigger === 'rare-chokugeki' ? triggerYaku : undefined,
    });
  };

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label>G数</label>
        <input type="number" value={gameCount || ''} onChange={(e) => setGameCount(parseInt(e.target.value) || 0)} inputMode="numeric" />
      </div>
      <div className={styles.field}>
        <label>あべし数</label>
        <input type="number" value={abeshiCount || ''} onChange={(e) => setAbeshiCount(parseInt(e.target.value) || 0)} inputMode="numeric" />
      </div>
      <div className={styles.field}>
        <label>当選契機</label>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggle} ${trigger === 'kitei-abeshi' ? styles.active : ''}`} onClick={() => setTrigger('kitei-abeshi')}>規定あべし</button>
          <button className={`${styles.toggle} ${trigger === 'rare-chokugeki' ? styles.active : ''}`} onClick={() => setTrigger('rare-chokugeki')}>直撃</button>
        </div>
      </div>
      {trigger === 'rare-chokugeki' && (
        <div className={styles.field}>
          <label>契機役</label>
          <select value={triggerYaku} onChange={(e) => setTriggerYaku(e.target.value as ChokugekiYaku)}>
            {(['jaku-cherry', 'kyou-cherry', 'chance-me', 'suika', 'kakutei-cherry'] as ChokugekiYaku[]).map((y) => (
              <option key={y} value={y}>{YAKU_LABELS[y]}</option>
            ))}
          </select>
        </div>
      )}
      <button className={styles.submitBtn} onClick={handleSubmit}>追加</button>
    </div>
  );
}

function TenhaForm({ onSubmit }: { onSubmit: (log: TenhaLog) => void }) {
  const [gameCount, setGameCount] = useState(0);
  const [trigger, setTrigger] = useState<TenhaTriggerYaku>('jaku-cherry');
  const [estimatedState, setEstimatedState] = useState<InternalState>('low');
  const [duration, setDuration] = useState<TenhaDuration>(7);
  const [tengekiGames, setTengekiGames] = useState<TengekiGameEntry[]>([]);

  const addTengekiGame = () => {
    setTengekiGames((prev) => [
      ...prev,
      { gameNumber: prev.length + 1, yaku: 'hazure' as TengekiYaku, result: 'failure' as const },
    ]);
  };

  const updateTengekiGame = (index: number, field: keyof TengekiGameEntry, value: string) => {
    setTengekiGames((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  };

  const removeTengekiGame = (index: number) => {
    setTengekiGames((prev) => prev.filter((_, i) => i !== index).map((g, i) => ({ ...g, gameNumber: i + 1 })));
  };

  const handleSubmit = () => {
    onSubmit({
      type: 'tenha',
      id: '',
      timestamp: 0,
      gameCount,
      trigger,
      estimatedState,
      duration,
      tengekiGames,
    });
  };

  const triggerOptions: TenhaTriggerYaku[] = ['jaku-cherry', 'kyou-cherry', 'suika', 'chance-me', 'shobu-zoroi', 'kakutei-cherry'];
  const stateOptions: InternalState[] = ['low', 'normal', 'high', 'densho'];
  const durationOptions: { value: TenhaDuration; label: string }[] = [
    { value: 7, label: '7G' },
    { value: 14, label: '14G' },
    { value: 21, label: '21G' },
    { value: 'infinite', label: '無限' },
  ];
  const yakuOptions: TengekiYaku[] = ['hazure', 'replay', 'bell', 'jaku-cherry', 'kyou-cherry', 'suika', 'chance-me', 'shobu-zoroi', 'kakutei-cherry'];

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label>G数</label>
        <input type="number" value={gameCount || ''} onChange={(e) => setGameCount(parseInt(e.target.value) || 0)} inputMode="numeric" />
      </div>
      <div className={styles.field}>
        <label>当選契機</label>
        <select value={trigger} onChange={(e) => setTrigger(e.target.value as TenhaTriggerYaku)}>
          {triggerOptions.map((y) => (
            <option key={y} value={y}>{YAKU_LABELS[y]}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label>内部状態</label>
        <select value={estimatedState} onChange={(e) => setEstimatedState(e.target.value as InternalState)}>
          {stateOptions.map((s) => (
            <option key={s} value={s}>{INTERNAL_STATE_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label>継続G数</label>
        <div className={styles.toggleGroup}>
          {durationOptions.map((d) => (
            <button key={String(d.value)} className={`${styles.toggle} ${duration === d.value ? styles.active : ''}`} onClick={() => setDuration(d.value)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tengekiSection}>
        <div className={styles.tengekiHeader}>
          <label>天撃チャレンジ</label>
          <button className={styles.addGameBtn} onClick={addTengekiGame}>+ 1G追加</button>
        </div>
        {tengekiGames.map((game, i) => (
          <div key={i} className={styles.tengekiRow}>
            <span className={styles.tengekiNum}>{game.gameNumber}G</span>
            <select value={game.yaku} onChange={(e) => updateTengekiGame(i, 'yaku', e.target.value)}>
              {yakuOptions.map((y) => (
                <option key={y} value={y}>{YAKU_LABELS[y]}</option>
              ))}
            </select>
            <div className={styles.toggleGroup}>
              <button className={`${styles.toggleSmall} ${game.result === 'success' ? styles.activeGreen : ''}`} onClick={() => updateTengekiGame(i, 'result', 'success')}>成功</button>
              <button className={`${styles.toggleSmall} ${game.result === 'failure' ? styles.activeRed : ''}`} onClick={() => updateTengekiGame(i, 'result', 'failure')}>失敗</button>
            </div>
            <button className={styles.removeGameBtn} onClick={() => removeTengekiGame(i)}>x</button>
          </div>
        ))}
      </div>

      <button className={styles.submitBtn} onClick={handleSubmit}>追加</button>
    </div>
  );
}

function FakeZenchoForm({ onSubmit }: { onSubmit: (log: FakeZenchoLog) => void }) {
  const [abeshiCount, setAbeshiCount] = useState(0);
  const [zenchoType, setZenchoType] = useState<'real' | 'fake'>('fake');
  const [hasShutter, setHasShutter] = useState(false);
  const [estimatedMode, setEstimatedMode] = useState<HokutoMode | ''>('');

  const handleSubmit = () => {
    onSubmit({
      type: 'fake-zencho',
      id: '',
      timestamp: 0,
      abeshiCount,
      zenchoType,
      hasShutter,
      estimatedMode: estimatedMode || null,
    });
  };

  const modeOptions: HokutoMode[] = ['mode-a', 'mode-b', 'mode-c', 'tengoku'];

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label>発生あべし数</label>
        <input type="number" value={abeshiCount || ''} onChange={(e) => setAbeshiCount(parseInt(e.target.value) || 0)} inputMode="numeric" />
      </div>
      <div className={styles.field}>
        <label>前兆種別</label>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggle} ${zenchoType === 'fake' ? styles.active : ''}`} onClick={() => setZenchoType('fake')}>フェイク</button>
          <button className={`${styles.toggle} ${zenchoType === 'real' ? styles.active : ''}`} onClick={() => setZenchoType('real')}>本前兆</button>
        </div>
      </div>
      <div className={styles.field}>
        <label>シャッター</label>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggle} ${hasShutter ? styles.active : ''}`} onClick={() => setHasShutter(true)}>あり</button>
          <button className={`${styles.toggle} ${!hasShutter ? styles.active : ''}`} onClick={() => setHasShutter(false)}>なし</button>
        </div>
      </div>
      <div className={styles.field}>
        <label>推定モード</label>
        <select value={estimatedMode} onChange={(e) => setEstimatedMode(e.target.value as HokutoMode | '')}>
          <option value="">不明</option>
          {modeOptions.map((m) => (
            <option key={m} value={m}>{MODE_LABELS[m]}</option>
          ))}
        </select>
      </div>
      <button className={styles.submitBtn} onClick={handleSubmit}>追加</button>
    </div>
  );
}

function EffectHintForm({ onSubmit }: { onSubmit: (log: EffectHintLog) => void }) {
  const [trophy, setTrophy] = useState<TrophyColor | ''>('');
  const [lampBColor, setLampBColor] = useState('');
  const [lampBPattern, setLampBPattern] = useState<'solid' | 'blink'>('solid');

  const handleSubmit = () => {
    const log: EffectHintLog = {
      type: 'effect-hint',
      id: '',
      timestamp: 0,
    };
    if (trophy) log.trophy = trophy;
    if (lampBColor) {
      log.lampB = { color: lampBColor, pattern: lampBPattern } as LampState;
    }
    onSubmit(log);
  };

  const trophyOptions: TrophyColor[] = ['bronze', 'silver', 'gold', 'kirin', 'rainbow'];
  const colorOptions = ['white', 'cyan', 'gold', 'purple', 'yellow-green'];

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label>トロフィー</label>
        <select value={trophy} onChange={(e) => setTrophy(e.target.value as TrophyColor | '')}>
          <option value="">なし</option>
          {trophyOptions.map((t) => (
            <option key={t} value={t}>{TROPHY_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label>ランプB（設定示唆）</label>
        <select value={lampBColor} onChange={(e) => setLampBColor(e.target.value)}>
          <option value="">なし</option>
          {colorOptions.map((c) => (
            <option key={c} value={c}>{LAMP_COLOR_LABELS[c]}</option>
          ))}
        </select>
      </div>
      {lampBColor && (
        <div className={styles.field}>
          <label>パターン</label>
          <div className={styles.toggleGroup}>
            <button className={`${styles.toggle} ${lampBPattern === 'solid' ? styles.active : ''}`} onClick={() => setLampBPattern('solid')}>点灯</button>
            <button className={`${styles.toggle} ${lampBPattern === 'blink' ? styles.active : ''}`} onClick={() => setLampBPattern('blink')}>点滅</button>
          </div>
        </div>
      )}
      <button className={styles.submitBtn} onClick={handleSubmit}>追加</button>
    </div>
  );
}

function DenshoForm({ onSubmit }: { onSubmit: (log: DenshoModeLog) => void }) {
  const [denshoType, setDenshoType] = useState<'short' | 'middle' | 'long'>('short');
  const [endState, setEndState] = useState<'low' | 'normal' | 'high'>('low');

  const handleSubmit = () => {
    onSubmit({
      type: 'densho',
      id: '',
      timestamp: 0,
      denshoType,
      endState,
    });
  };

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label>タイプ</label>
        <div className={styles.toggleGroup}>
          {(['short', 'middle', 'long'] as const).map((t) => (
            <button key={t} className={`${styles.toggle} ${denshoType === t ? styles.active : ''}`} onClick={() => setDenshoType(t)}>
              {t === 'short' ? 'ショート' : t === 'middle' ? 'ミドル' : 'ロング'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.field}>
        <label>終了後の状態</label>
        <div className={styles.toggleGroup}>
          {(['low', 'normal', 'high'] as const).map((s) => (
            <button key={s} className={`${styles.toggle} ${endState === s ? styles.active : ''}`} onClick={() => setEndState(s)}>
              {INTERNAL_STATE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      <button className={styles.submitBtn} onClick={handleSubmit}>追加</button>
    </div>
  );
}

// --- メインモーダル ---

export function AddLogModal({ onClose, onAddLog }: Props) {
  const [selectedType, setSelectedType] = useState<LogType>('at-win');

  const handleSubmit = (log: HokutoLog) => {
    onAddLog(log);
  };

  return (
    <Modal isOpen onClose={onClose} title="ログを追加">
      <div className={styles.typeSelector}>
        {LOG_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.typeBtn} ${selectedType === opt.value ? styles.typeBtnActive : ''}`}
            onClick={() => setSelectedType(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {selectedType === 'at-win' && <ATWinForm onSubmit={handleSubmit} />}
      {selectedType === 'tenha' && <TenhaForm onSubmit={handleSubmit} />}
      {selectedType === 'fake-zencho' && <FakeZenchoForm onSubmit={handleSubmit} />}
      {selectedType === 'effect-hint' && <EffectHintForm onSubmit={handleSubmit} />}
      {selectedType === 'densho' && <DenshoForm onSubmit={handleSubmit} />}
    </Modal>
  );
}
