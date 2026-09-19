import { useState } from 'react';
import { useMachineStore, isKabaneriMachine } from '../../stores/machineStore';
import { GameInputModal } from '../GameInput/GameInputModal';
import { KabaneriButton } from './KabaneriButton';
import { KabaneriToolbar, type CountMode } from './KabaneriToolbar';
import { KabaneriSettingAnalysis } from './KabaneriSettingAnalysis';
import { KabaneriCzTracker } from './KabaneriCzTracker';
import { KabaneriChanceInputPanel } from './KabaneriChanceInputPanel';
import {
  GEDAN_BELL_KEY,
  BELL_COLOR,
  BELL_COLOR_SOFT,
} from '../../data/kabaneriDefinitions';
import styles from './KabaneriMain.module.css';

export function KabaneriMain() {
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [mode, setMode] = useState<CountMode>('add');
  const [orient, setOrient] = useState(0);
  const [haptic, setHaptic] = useState(true);

  const machine = useMachineStore((state) => state.getCurrentMachine());
  const incrementCounter = useMachineStore((state) => state.incrementKabaneriCounter);
  const decrementCounter = useMachineStore((state) => state.decrementKabaneriCounter);

  if (!machine || !isKabaneriMachine(machine)) return null;

  const { counters, totalGames } = machine;

  // 出現率（1/x.x）
  const fmtInverse = (count: number): string =>
    count > 0 && totalGames > 0 ? `1/${(totalGames / count).toFixed(1)}` : '—';
  const handleRotate = () => setOrient((o) => (o + 90) % 360);

  return (
    <>
      {mode === 'sub' && <div className={styles.subFrame} aria-hidden="true" />}

      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.gameInput}
          onClick={() => setIsGameModalOpen(true)}
        >
          <span className={styles.gameLabel}>ゲーム数</span>
          <span className={styles.gameValue}>
            {String(totalGames).padStart(4, '0')}
            <span className={styles.editIcon}>✏️</span>
          </span>
        </button>
        <KabaneriToolbar
          mode={mode}
          orient={orient}
          haptic={haptic}
          onModeChange={setMode}
          onRotate={handleRotate}
          onHapticToggle={() => setHaptic((h) => !h)}
        />
      </div>

      <KabaneriChanceInputPanel key={`chance-${machine.id}`} machine={machine} mode={mode} orient={orient} haptic={haptic} bellInput={
        <KabaneriButton
          label="下段ベル"
          count={counters[GEDAN_BELL_KEY] ?? 0}
          sub={fmtInverse(counters[GEDAN_BELL_KEY] ?? 0)}
          color={BELL_COLOR}
          softColor={BELL_COLOR_SOFT}
          mode={mode}
          orient={orient}
          haptic={haptic}
          onCount={(dir) =>
            dir > 0
              ? incrementCounter(GEDAN_BELL_KEY)
              : decrementCounter(GEDAN_BELL_KEY)
          }
        />
      } />

      <KabaneriCzTracker key={`cz-${machine.id}`} machine={machine} />

      <div className="section-header">設定推測</div>
      <KabaneriSettingAnalysis />

      <GameInputModal
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
      />
    </>
  );
}
