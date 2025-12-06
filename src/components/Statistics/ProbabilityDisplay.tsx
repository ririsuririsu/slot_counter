import { useState } from 'react';
import { useMachineStore } from '../../stores/machineStore';
import { calculateProbabilityDenominator } from '../../utils/binomialDistribution';
import { GameInputModal } from '../GameInput/GameInputModal';
import styles from './ProbabilityDisplay.module.css';

export function ProbabilityDisplay() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const fiveCardTotal = useMachineStore((state) => state.getFiveCardTotal());
  const addHistoryEntry = useMachineStore((state) => state.addHistoryEntry);

  const totalGames = machine?.totalGames ?? 0;
  const denominator = calculateProbabilityDenominator(fiveCardTotal, totalGames);

  const formatProbability = () => {
    if (denominator === null) {
      return '-';
    }
    return `1/${denominator.toFixed(1)}`;
  };

  const handleRecordHistory = () => {
    if (totalGames > 0 && fiveCardTotal > 0) {
      addHistoryEntry();
    }
  };

  const canRecord = totalGames > 0 && fiveCardTotal > 0;

  return (
    <>
      <div className={styles.container}>
        <div className={styles.gameInput}>
          <span className={styles.label}>ゲーム数</span>
          <button
            className={styles.valueButton}
            onClick={() => setIsModalOpen(true)}
          >
            <span>{String(totalGames).padStart(4, '0')}</span>
            <span className={styles.editIcon}>✏️</span>
          </button>
        </div>
        <div className={styles.probability}>
          <span className={styles.probabilityLabel}>
            5枚役確率 ({fiveCardTotal}回)
          </span>
          <span
            className={`${styles.probabilityValue} ${
              denominator === null ? styles.noData : ''
            }`}
          >
            {formatProbability()}
          </span>
        </div>
        <button
          type="button"
          className={`${styles.recordButton} ${!canRecord ? styles.disabled : ''}`}
          onClick={handleRecordHistory}
          disabled={!canRecord}
        >
          履歴に記録
        </button>
      </div>
      <GameInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
