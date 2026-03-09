import { memo } from 'react';
import type { KoyakuDefinition } from '../../types';
import { useMachineStore, isMonkeyTurnMachine } from '../../stores/machineStore';
import styles from './CounterRow.module.css';

interface CounterRowProps {
  koyaku: KoyakuDefinition;
}

export const CounterRow = memo(function CounterRow({ koyaku }: CounterRowProps) {
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const incrementCounter = useMachineStore((state) => state.incrementCounter);
  const decrementCounter = useMachineStore((state) => state.decrementCounter);

  const count = (machine && isMonkeyTurnMachine(machine)) ? (machine.counters[koyaku.id] ?? 0) : 0;

  const handleIncrement = () => {
    incrementCounter(koyaku.id);
  };

  const handleDecrement = () => {
    decrementCounter(koyaku.id);
  };

  return (
    <div
      className={styles.counterRow}
      style={{ backgroundColor: koyaku.backgroundColor }}
    >
      <span className={styles.name}>{koyaku.name}</span>
      <div className={styles.controls}>
        <button
          className={`${styles.countButton} ${styles.decrementButton}`}
          onClick={handleDecrement}
          aria-label={`${koyaku.name}を減らす`}
        >
          -1
        </button>
        <span className={styles.countValue}>{count}</span>
        <button
          className={`${styles.countButton} ${styles.incrementButton}`}
          onClick={handleIncrement}
          aria-label={`${koyaku.name}を増やす`}
        >
          +1
        </button>
      </div>
    </div>
  );
});
