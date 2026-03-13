import { useState, useCallback } from 'react';
import type {
  HokutoLog,
  ATWinLog,
  TenhaLog,
  FakeZenchoLog,
  EffectHintLog,
  TengekiLog,
  TenhaDuration,
  InternalState,
  TenhaTriggerYaku,
  ChokugekiYaku,
  TengekiYaku,
  TrophyColor,
  LampState,
  ZenchoCategory,
} from '../../types';
import {
  YAKU_LABELS,
  INTERNAL_STATE_LABELS,
  TROPHY_LABELS,
  LAMP_COLOR_LABELS,
  LAMP_POSITION_LABELS,
} from '../../data/hokutoDefinitions';
import { calculateTengekiExpectedRate } from '../../utils/hokutoEstimation';
import styles from './InlineLogEntry.module.css';

type FormType = HokutoLog['type'];

interface Props {
  onAddLog: (log: HokutoLog) => void;
}

const TYPE_OPTIONS: { value: FormType; label: string; activeClass: string }[] = [
  { value: 'fake-zencho', label: '前兆', activeClass: styles.typeBtnZencho },
  { value: 'tenha', label: '天破', activeClass: styles.typeBtnTenha },
  { value: 'at-win', label: 'AT', activeClass: styles.typeBtnATWin },
  { value: 'effect-hint', label: '演出', activeClass: styles.typeBtnEffect },
  { value: 'tengeki', label: '天撃', activeClass: styles.typeBtnDensho },
];

// --- カスタム数字パッド ---
function NumPad({ value, onChange }: { value: number; onChange: (v: number) => void; onSubmit?: () => void }) {
  const tap = useCallback((digit: number) => {
    const next = value * 10 + digit;
    if (next <= 99999) onChange(next);
  }, [value, onChange]);

  const backspace = useCallback(() => {
    onChange(Math.floor(value / 10));
  }, [value, onChange]);

  const clear = useCallback(() => {
    onChange(0);
  }, [onChange]);

  return (
    <div className={styles.numpad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <button key={d} className={styles.numKey} onClick={() => tap(d)}>{d}</button>
      ))}
      <button className={`${styles.numKey} ${styles.numKeyDanger}`} onClick={clear}>C</button>
      <button className={styles.numKey} onClick={() => tap(0)}>0</button>
      <button className={`${styles.numKey} ${styles.numKeyDanger}`} onClick={backspace}>&#9003;</button>
    </div>
  );
}

function NumField({ label, value, active, onFocus }: {
  label: string; value: number; onChange?: (v: number) => void;
  active: boolean; onFocus: () => void;
}) {
  return (
    <div className={styles.row} onClick={onFocus}>
      <span className={styles.label}>{label}</span>
      <div className={`${styles.numDisplay} ${active ? styles.numDisplayActive : ''}`}>
        {value || 0}
      </div>
    </div>
  );
}

// --- 編集フォーム（タイムライン内インライン表示用・種別タブ付き） ---
export function LogEditForm({ log, onSave, onCancel }: { log: HokutoLog; onSave: (log: HokutoLog) => void; onCancel: () => void }) {
  const [activeType, setActiveType] = useState<FormType>(log.type);

  const handleSubmit = (updated: HokutoLog) => {
    onSave({ ...updated, id: log.id, timestamp: log.timestamp });
  };

  // 種別が変わったら initial を渡さない（デフォルト値でリセット）
  const initialForType = (type: FormType) => (type === log.type ? log : undefined);

  return (
    <>
      <div className={styles.typeButtons}>
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.typeBtn} ${activeType === opt.value ? `${styles.typeBtnActive} ${opt.activeClass}` : ''}`}
            onClick={() => setActiveType(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {activeType === 'at-win' && <ATWinForm onSubmit={handleSubmit} onCancel={onCancel} initial={initialForType('at-win') as ATWinLog | undefined} />}
      {activeType === 'tenha' && <TenhaForm onSubmit={handleSubmit} onCancel={onCancel} initial={initialForType('tenha') as TenhaLog | undefined} />}
      {activeType === 'tengeki' && <TengekiForm onSubmit={handleSubmit} onCancel={onCancel} initial={initialForType('tengeki') as TengekiLog | undefined} />}
      {activeType === 'fake-zencho' && <FakeZenchoForm onSubmit={handleSubmit} onCancel={onCancel} initial={initialForType('fake-zencho') as FakeZenchoLog | undefined} />}
      {activeType === 'effect-hint' && <EffectHintForm onSubmit={handleSubmit} onCancel={onCancel} initial={initialForType('effect-hint') as EffectHintLog | undefined} />}
    </>
  );
}

// --- 新規追加用UI ---
export function InlineLogEntry({ onAddLog }: Props) {
  const [activeType, setActiveType] = useState<FormType | null>(null);

  const handleTypeClick = (type: FormType) => {
    setActiveType(activeType === type ? null : type);
  };

  const handleSubmit = (log: HokutoLog) => {
    onAddLog(log);
    setActiveType(null);
  };

  const handleCancel = () => setActiveType(null);

  return (
    <div className={styles.container}>
      <div className={styles.typeButtons}>
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.typeBtn} ${activeType === opt.value ? `${styles.typeBtnActive} ${opt.activeClass}` : ''}`}
            onClick={() => handleTypeClick(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {activeType === 'at-win' && <ATWinForm onSubmit={handleSubmit} onCancel={handleCancel} />}
      {activeType === 'tenha' && <TenhaForm onSubmit={handleSubmit} onCancel={handleCancel} />}
      {activeType === 'tengeki' && <TengekiForm onSubmit={handleSubmit} onCancel={handleCancel} />}
      {activeType === 'fake-zencho' && <FakeZenchoForm onSubmit={handleSubmit} onCancel={handleCancel} />}
      {activeType === 'effect-hint' && <EffectHintForm onSubmit={handleSubmit} onCancel={handleCancel} />}
    </div>
  );
}

// --- AT当選フォーム ---
function ATWinForm({ onSubmit, onCancel, initial }: { onSubmit: (log: ATWinLog) => void; onCancel: () => void; initial?: ATWinLog }) {
  const [gameCount, setGameCount] = useState(initial?.gameCount ?? 0);
  const [abeshiCount, setAbeshiCount] = useState(initial?.abeshiCount ?? 0);
  const [activeField, setActiveField] = useState<'game' | 'abeshi'>('game');
  const [trigger, setTrigger] = useState<'kitei-abeshi' | 'rare-chokugeki'>(initial?.trigger ?? 'kitei-abeshi');
  const [triggerYaku, setTriggerYaku] = useState<ChokugekiYaku>(initial?.triggerYaku ?? 'jaku-cherry');

  const handleSubmit = () => {
    onSubmit({
      type: 'at-win', id: '', timestamp: 0,
      gameCount, abeshiCount, trigger,
      triggerYaku: trigger === 'rare-chokugeki' ? triggerYaku : undefined,
    });
  };

  const currentValue = activeField === 'game' ? gameCount : abeshiCount;
  const currentSetter = activeField === 'game' ? setGameCount : setAbeshiCount;

  return (
    <div className={styles.formArea}>
      <NumField label="G数" value={gameCount} onChange={setGameCount} active={activeField === 'game'} onFocus={() => setActiveField('game')} />
      <NumField label="あべし" value={abeshiCount} onChange={setAbeshiCount} active={activeField === 'abeshi'} onFocus={() => setActiveField('abeshi')} />
      <div className={styles.row}>
        <span className={styles.label}>契機</span>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggle} ${trigger === 'kitei-abeshi' ? styles.toggleActive : ''}`} onClick={() => setTrigger('kitei-abeshi')}>規定あべし</button>
          <button className={`${styles.toggle} ${trigger === 'rare-chokugeki' ? styles.toggleActive : ''}`} onClick={() => setTrigger('rare-chokugeki')}>直撃</button>
        </div>
      </div>
      {trigger === 'rare-chokugeki' && (
        <div className={styles.row}>
          <span className={styles.label}>契機役</span>
          <select className={styles.select} value={triggerYaku} onChange={(e) => setTriggerYaku(e.target.value as ChokugekiYaku)}>
            {(['jaku-cherry', 'kyou-cherry', 'chance-me', 'suika', 'kakutei-cherry'] as ChokugekiYaku[]).map((y) => (
              <option key={y} value={y}>{YAKU_LABELS[y]}</option>
            ))}
          </select>
        </div>
      )}
      <NumPad value={currentValue} onChange={currentSetter} />
      <div className={styles.submitRow}>
        <button className={styles.cancelBtn} onClick={onCancel}>閉じる</button>
        <button className={styles.submitBtn} onClick={handleSubmit}>{initial ? '保存' : '追加'}</button>
      </div>
    </div>
  );
}

// --- 天破フォーム（天撃なし） ---
function TenhaForm({ onSubmit, onCancel, initial }: { onSubmit: (log: TenhaLog) => void; onCancel: () => void; initial?: TenhaLog }) {
  const [gameCount, setGameCount] = useState(initial?.gameCount ?? 0);
  const [trigger, setTrigger] = useState<TenhaTriggerYaku>(initial?.trigger ?? 'unknown');
  const [estimatedState, setEstimatedState] = useState<InternalState>(initial?.estimatedState ?? 'unknown');
  const [duration, setDuration] = useState<TenhaDuration>(initial?.duration ?? 7);

  const handleSubmit = () => {
    onSubmit({ type: 'tenha', id: '', timestamp: 0, gameCount, trigger, estimatedState, duration });
  };

  const triggerOptions: TenhaTriggerYaku[] = ['unknown', 'jaku-cherry', 'kyou-cherry', 'suika', 'chance-me', 'shobu-zoroi', 'kakutei-cherry'];
  const stateOptions: InternalState[] = ['unknown', 'low', 'normal', 'high', 'densho'];
  const durationOptions: { value: TenhaDuration; label: string }[] = [
    { value: 7, label: '7G' }, { value: 14, label: '14G' }, { value: 21, label: '21G' }, { value: 'infinite', label: '無限' },
  ];

  return (
    <div className={styles.formArea}>
      <NumField label="G数" value={gameCount} onChange={setGameCount} active onFocus={() => {}} />
      <div className={styles.row}>
        <span className={styles.label}>契機</span>
        <select className={styles.select} value={trigger} onChange={(e) => setTrigger(e.target.value as TenhaTriggerYaku)}>
          {triggerOptions.map((y) => (<option key={y} value={y}>{YAKU_LABELS[y]}</option>))}
        </select>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>内部状態</span>
        <select className={styles.select} value={estimatedState} onChange={(e) => setEstimatedState(e.target.value as InternalState)}>
          {stateOptions.map((s) => (<option key={s} value={s}>{INTERNAL_STATE_LABELS[s]}</option>))}
        </select>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>継続</span>
        <div className={styles.toggleGroup}>
          {durationOptions.map((d) => (
            <button key={String(d.value)} className={`${styles.toggle} ${duration === d.value ? styles.toggleActive : ''}`} onClick={() => setDuration(d.value)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <NumPad value={gameCount} onChange={setGameCount} />
      <div className={styles.submitRow}>
        <button className={styles.cancelBtn} onClick={onCancel}>閉じる</button>
        <button className={styles.submitBtn} onClick={handleSubmit}>{initial ? '保存' : '追加'}</button>
      </div>
    </div>
  );
}

// --- 天撃チャレンジフォーム（最後の天破ログにセット） ---
// 4G構成: 0G(突入時), 1G, 2G(バトル中), 3G(最終)

const TENGEKI_YAKU_OPTIONS: { value: TengekiYaku; label: string }[] = [
  { value: 'hazure', label: 'ハズレ' },
  { value: 'replay', label: 'リプレイ' },
  { value: 'bell', label: '右下がりベル' },
  { value: 'jaku-cherry', label: '弱チェリー' },
  { value: 'kyou-cherry', label: '強チェリー' },
  { value: 'suika', label: 'スイカ' },
  { value: 'chance-me', label: 'チャンス目' },
  { value: 'shobu-zoroi', label: '勝舞揃い' },
  { value: 'kakutei-cherry', label: '確定チェリー' },
];

const GAME_LABELS = ['0G', '1G', '2G', '3G'];

function TengekiForm({ onSubmit, onCancel, initial }: { onSubmit: (log: TengekiLog) => void; onCancel: () => void; initial?: TengekiLog }) {
  const [prepRareHit, setPrepRareHit] = useState(initial?.prepRareHit ?? false);
  const [games, setGames] = useState<[TengekiYaku, TengekiYaku, TengekiYaku, TengekiYaku]>(initial?.games ? [...initial.games] : ['hazure', 'hazure', 'hazure', 'hazure']);
  const [result, setResult] = useState<'success' | 'failure'>(initial?.result ?? 'failure');

  const setGameYaku = (idx: number, yaku: TengekiYaku) => {
    const next = [...games] as [TengekiYaku, TengekiYaku, TengekiYaku, TengekiYaku];
    next[idx] = yaku;
    setGames(next);
  };

  const handleSubmit = () => {
    onSubmit({ type: 'tengeki', id: '', timestamp: 0, prepRareHit, games, result });
  };

  const [rateLow, rateHigh] = calculateTengekiExpectedRate(games, prepRareHit);
  const pctLow = Math.round(rateLow * 100);
  const pctHigh = Math.round(rateHigh * 100);
  const barPct = Math.round(((rateLow + rateHigh) / 2) * 100);

  return (
    <div className={styles.formArea}>
      <div className={styles.row}>
        <span className={styles.label}>準備中</span>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggle} ${!prepRareHit ? styles.toggleActive : ''}`} onClick={() => setPrepRareHit(false)}>レア役なし</button>
          <button className={`${styles.toggle} ${prepRareHit ? styles.toggleActive : ''}`} onClick={() => setPrepRareHit(true)}>レア役あり</button>
        </div>
      </div>
      {GAME_LABELS.map((label, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.label}>{label}</span>
          <select className={styles.select} value={games[i]} title={label} onChange={(e) => setGameYaku(i, e.target.value as TengekiYaku)}>
            {TENGEKI_YAKU_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
      ))}
      <div className={styles.row}>
        <span className={styles.label}>結果</span>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggle} ${result === 'success' ? styles.toggleActive : ''}`} onClick={() => setResult('success')}>成功</button>
          <button className={`${styles.toggle} ${result === 'failure' ? styles.toggleActive : ''}`} onClick={() => setResult('failure')}>失敗</button>
        </div>
      </div>
      <div className={styles.expectedRate}>
        <span className={styles.expectedRateLabel}>成功期待度</span>
        <div className={styles.expectedRateBar}>
          <div
            className={`${styles.expectedRateFill} ${barPct >= 80 ? styles.expectedRateHigh : barPct >= 40 ? styles.expectedRateMid : styles.expectedRateLow}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        <span className={styles.expectedRateValue}>
          {pctLow === pctHigh ? `${pctLow}%` : `${pctLow}%～${pctHigh}%`}
        </span>
      </div>
      <div className={styles.submitRow}>
        <button className={styles.cancelBtn} onClick={onCancel}>閉じる</button>
        <button className={styles.submitBtn} onClick={handleSubmit}>{initial ? '保存' : '追加'}</button>
      </div>
    </div>
  );
}

// --- 前兆フォーム ---
const ZENCHO_OPTIONS: { value: ZenchoCategory; label: string }[] = [
  { value: 'shutter', label: 'シャッター' },
  { value: 'tenmei', label: '天命の刻' },
  { value: 'other', label: 'その他' },
];

function FakeZenchoForm({ onSubmit, onCancel, initial }: { onSubmit: (log: FakeZenchoLog) => void; onCancel: () => void; initial?: FakeZenchoLog }) {
  const [abeshiCount, setAbeshiCount] = useState(initial?.abeshiCount ?? 0);
  const [category, setCategory] = useState<ZenchoCategory>(initial?.zenchoCategory ?? 'other');

  const handleSubmit = () => {
    onSubmit({ type: 'fake-zencho', id: '', timestamp: 0, abeshiCount, zenchoCategory: category, estimatedMode: null });
  };

  return (
    <div className={styles.formArea}>
      <div className={styles.row}>
        <span className={styles.label}>種類</span>
        <div className={styles.toggleGroup}>
          {ZENCHO_OPTIONS.map((opt) => (
            <button key={opt.value} className={`${styles.toggle} ${category === opt.value ? styles.toggleActive : ''}`} onClick={() => setCategory(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <NumField label="あべし" value={abeshiCount} onChange={setAbeshiCount} active onFocus={() => {}} />
      <NumPad value={abeshiCount} onChange={setAbeshiCount} onSubmit={handleSubmit} />
      <div className={styles.submitRow}>
        <button className={styles.cancelBtn} onClick={onCancel}>閉じる</button>
        <button className={styles.submitBtn} onClick={handleSubmit}>{initial ? '保存' : '追加'}</button>
      </div>
    </div>
  );
}

// --- 演出示唆フォーム ---

type LampPosition = 'A' | 'B' | 'C';

interface LampOption {
  value: string; // エンコード値: "color:pattern" or "color:pattern:flow"
  label: string;
  color: LampState['color'];
  pattern: 'solid' | 'blink';
  upperWhiteFlow?: boolean;
}

function makeLampOption(color: LampState['color'], pattern: 'solid' | 'blink', flow?: boolean): LampOption {
  const colorLabel = LAMP_COLOR_LABELS[color];
  const patternLabel = pattern === 'blink' ? '点滅' : '点灯';
  const flowLabel = flow ? '+上白流れ' : '';
  return {
    value: `${color}:${pattern}${flow ? ':flow' : ''}`,
    label: `${colorLabel}${patternLabel}${flowLabel}`,
    color,
    pattern,
    upperWhiteFlow: flow,
  };
}

const LAMP_OPTIONS: Record<LampPosition, LampOption[]> = {
  A: [
    makeLampOption('white', 'solid'), makeLampOption('white', 'blink'),
    makeLampOption('cyan', 'solid'), makeLampOption('cyan', 'blink'),
    makeLampOption('cyan', 'solid', true), makeLampOption('cyan', 'blink', true),
    makeLampOption('yellow-green', 'solid'), makeLampOption('yellow-green', 'blink'),
    makeLampOption('gold', 'solid'), makeLampOption('gold', 'blink'),
    makeLampOption('purple', 'solid'), makeLampOption('purple', 'blink'),
  ],
  B: [
    makeLampOption('white', 'solid'), makeLampOption('white', 'blink'),
    makeLampOption('cyan', 'solid'), makeLampOption('cyan', 'blink'),
    makeLampOption('yellow-green', 'solid'), makeLampOption('yellow-green', 'blink'),
    makeLampOption('gold', 'solid'),
  ],
  C: [
    makeLampOption('cyan', 'solid'),
    makeLampOption('yellow-green', 'solid'),
    makeLampOption('gold', 'solid'),
  ],
};

function deriveInitialLamp(initial?: EffectHintLog): { pos: LampPosition | ''; value: string } {
  if (!initial) return { pos: '', value: '' };
  const entries: [LampPosition, typeof initial.lampA][] = [['A', initial.lampA], ['B', initial.lampB], ['C', initial.lampC]];
  for (const [pos, lamp] of entries) {
    if (lamp) {
      const flowSuffix = lamp.upperWhiteFlow ? ':flow' : '';
      return { pos, value: `${lamp.color}:${lamp.pattern}${flowSuffix}` };
    }
  }
  return { pos: '', value: '' };
}

function EffectHintForm({ onSubmit, onCancel, initial }: { onSubmit: (log: EffectHintLog) => void; onCancel: () => void; initial?: EffectHintLog }) {
  const initLamp = deriveInitialLamp(initial);
  const [trophy, setTrophy] = useState<TrophyColor | ''>(initial?.trophy ?? '');
  const [lampPos, setLampPos] = useState<LampPosition | ''>(initLamp.pos);
  const [lampValue, setLampValue] = useState(initLamp.value);

  const handleSubmit = () => {
    const log: EffectHintLog = { type: 'effect-hint', id: '', timestamp: 0 };
    if (trophy) log.trophy = trophy;
    if (lampPos && lampValue) {
      const options = LAMP_OPTIONS[lampPos];
      const opt = options.find((o) => o.value === lampValue);
      if (opt) {
        const state: LampState = {
          color: opt.color,
          pattern: opt.pattern,
          ...(opt.upperWhiteFlow ? { upperWhiteFlow: true } : {}),
        };
        if (lampPos === 'A') log.lampA = state;
        else if (lampPos === 'B') log.lampB = state;
        else log.lampC = state;
      }
    }
    onSubmit(log);
  };

  const trophyOptions: TrophyColor[] = ['bronze', 'silver', 'gold', 'kirin', 'rainbow'];

  return (
    <div className={styles.formArea}>
      <div className={styles.row}>
        <span className={styles.label}>トロフィー</span>
        <select className={styles.select} value={trophy} title="トロフィー" onChange={(e) => setTrophy(e.target.value as TrophyColor | '')}>
          <option value="">なし</option>
          {trophyOptions.map((t) => (<option key={t} value={t}>{TROPHY_LABELS[t]}</option>))}
        </select>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>ランプ</span>
        <div className={styles.toggleGroup}>
          {(['A', 'B', 'C'] as LampPosition[]).map((pos) => (
            <button key={pos} className={`${styles.toggle} ${lampPos === pos ? styles.toggleActive : ''}`} onClick={() => {
              setLampPos(lampPos === pos ? '' : pos);
              setLampValue('');
            }}>{LAMP_POSITION_LABELS[pos]}</button>
          ))}
        </div>
      </div>
      {lampPos && (
        <div className={styles.row}>
          <span className={styles.label}></span>
          <select className={styles.select} value={lampValue} title="ランプ種別" onChange={(e) => setLampValue(e.target.value)}>
            <option value="">なし</option>
            {LAMP_OPTIONS[lampPos].map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
      )}
      <div className={styles.submitRow}>
        <button className={styles.cancelBtn} onClick={onCancel}>閉じる</button>
        <button className={styles.submitBtn} onClick={handleSubmit}>{initial ? '保存' : '追加'}</button>
      </div>
    </div>
  );
}
