import { useState } from 'react';
import { useMachineStore, isKabaneriMachine } from '../../stores/machineStore';
import { GameInputModal } from '../GameInput/GameInputModal';
import { ChanceCounterRow } from './ChanceCounterRow';
import { BellCounterRow } from './BellCounterRow';
import { KabaneriSettingAnalysis } from './KabaneriSettingAnalysis';
import { chanceDefinitions } from '../../data/kabaneriDefinitions';
import styles from './KabaneriMain.module.css';

export function KabaneriMain() {
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const machine = useMachineStore((state) => state.getCurrentMachine());

  if (!machine || !isKabaneriMachine(machine)) return null;

  const chanceTotal = chanceDefinitions.reduce(
    (sum, def) => sum + (machine.counters[def.countKey] ?? 0),
    0
  );
  const flashTotal = chanceDefinitions.reduce(
    (sum, def) => sum + (machine.counters[def.flashKey] ?? 0),
    0
  );
  const flashRate = chanceTotal > 0 ? (flashTotal / chanceTotal) * 100 : null;

  return (
    <>
      <div className={styles.summaryCard}>
        <div className={styles.gameInput}>
          <span className={styles.label}>ゲーム数</span>
          <button
            className={styles.valueButton}
            onClick={() => setIsGameModalOpen(true)}
          >
            <span>{String(machine.totalGames).padStart(4, '0')}</span>
            <span className={styles.editIcon}>✏️</span>
          </button>
        </div>
        <div className={styles.summaryStat}>
          <span className={styles.label}>
            合算発光率 ({flashTotal}/{chanceTotal}回)
          </span>
          <span
            className={`${styles.statValue} ${flashRate === null ? styles.noData : ''}`}
          >
            {flashRate !== null ? `${flashRate.toFixed(1)}%` : '-'}
          </span>
        </div>
      </div>

      <KabaneriSettingAnalysis />

      <div className="section-header">チャンス目（発光カウント）</div>
      <p className={styles.hint}>
        発光時は「+発光」のみでOK（成立も自動で+1）。
        カバネリ高確中・発光中のチャンス目はカウント対象外。
      </p>
      {chanceDefinitions.map((def) => (
        <ChanceCounterRow key={def.id} definition={def} />
      ))}

      <div className="section-header">下段ベル</div>
      <BellCounterRow />

      <GameInputModal
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
      />
    </>
  );
}
