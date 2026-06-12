import { memo } from 'react';
import { useMachineStore, isKabaneriMachine } from '../../stores/machineStore';
import { GEDAN_BELL_KEY } from '../../data/kabaneriDefinitions';
import { calculateDenominator } from '../../utils/kabaneriEstimation';
import styles from './KabaneriCounters.module.css';

export const BellCounterRow = memo(function BellCounterRow() {
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const incrementCounter = useMachineStore((state) => state.incrementKabaneriCounter);
  const decrementCounter = useMachineStore((state) => state.decrementKabaneriCounter);

  const isKabaneri = machine && isKabaneriMachine(machine);
  const count = isKabaneri ? machine.counters[GEDAN_BELL_KEY] ?? 0 : 0;
  const totalGames = isKabaneri ? machine.totalGames : 0;
  const denominator = calculateDenominator(count, totalGames);

  return (
    <div className={styles.bellRow}>
      <div className={styles.bellInfo}>
        <span className={`${styles.name} ${styles.bellName}`}>下段ベル</span>
        <span className={`${styles.rate} ${denominator !== null ? styles.rateActive : ''}`}>
          {denominator !== null ? `1/${denominator.toFixed(1)}` : '確率 -'}
        </span>
      </div>
      <div className={styles.bellControls}>
        <button
          className={styles.minusBtn}
          onClick={() => decrementCounter(GEDAN_BELL_KEY)}
          aria-label="下段ベルを減らす"
        >
          -
        </button>
        <span className={styles.bellValue}>{count}</span>
        <button
          className={styles.bellPlusBtn}
          onClick={() => incrementCounter(GEDAN_BELL_KEY)}
          aria-label="下段ベルを増やす"
        >
          +
        </button>
      </div>
    </div>
  );
});
