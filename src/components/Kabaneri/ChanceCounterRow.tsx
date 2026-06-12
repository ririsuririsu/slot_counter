import { memo } from 'react';
import type { KabaneriChanceDefinition } from '../../data/kabaneriDefinitions';
import { useMachineStore, isKabaneriMachine } from '../../stores/machineStore';
import styles from './KabaneriCounters.module.css';

interface ChanceCounterRowProps {
  definition: KabaneriChanceDefinition;
}

export const ChanceCounterRow = memo(function ChanceCounterRow({
  definition,
}: ChanceCounterRowProps) {
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const incrementCounter = useMachineStore((state) => state.incrementKabaneriCounter);
  const decrementCounter = useMachineStore((state) => state.decrementKabaneriCounter);
  const incrementFlash = useMachineStore((state) => state.incrementKabaneriFlash);
  const decrementFlash = useMachineStore((state) => state.decrementKabaneriFlash);

  const isKabaneri = machine && isKabaneriMachine(machine);
  const count = isKabaneri ? machine.counters[definition.countKey] ?? 0 : 0;
  const flash = isKabaneri ? machine.counters[definition.flashKey] ?? 0 : 0;
  const rate = count > 0 ? (flash / count) * 100 : null;

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span className={styles.name} style={{ color: definition.nameColor }}>
          {definition.name}
        </span>
        <span className={`${styles.rate} ${rate !== null ? styles.rateActive : ''}`}>
          発光率 {rate !== null ? `${rate.toFixed(1)}%` : '-'}
        </span>
      </div>
      <div className={styles.controls}>
        <div className={styles.group}>
          <button
            className={styles.minusBtn}
            onClick={() => decrementCounter(definition.countKey)}
            aria-label={`${definition.name}の成立を減らす`}
          >
            -
          </button>
          <div className={styles.valueBlock}>
            <span className={styles.valueLabel}>成立</span>
            <span className={styles.value}>{count}</span>
          </div>
          <button
            className={styles.plusBtn}
            onClick={() => incrementCounter(definition.countKey)}
            aria-label={`${definition.name}の成立を増やす`}
          >
            +成立
          </button>
        </div>
        <div className={styles.group}>
          <button
            className={styles.minusBtn}
            onClick={() => decrementFlash(definition.id)}
            aria-label={`${definition.name}の発光を減らす`}
          >
            -
          </button>
          <div className={styles.valueBlock}>
            <span className={styles.valueLabel}>発光</span>
            <span className={styles.valueFlash}>{flash}</span>
          </div>
          <button
            className={`${styles.plusBtn} ${styles.flashPlus}`}
            onClick={() => incrementFlash(definition.id)}
            aria-label={`${definition.name}の発光を増やす`}
          >
            +発光
          </button>
        </div>
      </div>
    </div>
  );
});
