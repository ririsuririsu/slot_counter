import { useState } from 'react';
import { useMachineStore, isMonkeyTurnMachine, isHokutoMachine } from '../../stores/machineStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import styles from './Header.module.css';

export function Header() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const currentMachine = useMachineStore((state) => state.getCurrentMachine());
  const selectMachine = useMachineStore((state) => state.selectMachine);
  const resetCurrentMachine = useMachineStore((state) => state.resetCurrentMachine);
  const resetHokutoMachine = useMachineStore((state) => state.resetHokutoMachine);

  const handleBack = () => {
    selectMachine('');
  };

  const handleReset = () => {
    if (currentMachine && isHokutoMachine(currentMachine)) {
      resetHokutoMachine();
    } else {
      resetCurrentMachine();
    }
  };

  const title = currentMachine?.name ?? 'スロットカウンター';

  const resetMessage =
    currentMachine && isMonkeyTurnMachine(currentMachine)
      ? '全てのカウンターと履歴をリセットしますか？この操作は取り消せません。'
      : '全てのログとセッション情報をリセットしますか？この操作は取り消せません。';

  return (
    <>
      <header className={styles.header}>
        <div className={styles.content}>
          <button className={styles.backBtn} onClick={handleBack}>
            ‹
          </button>
          <h1 className={styles.title}>{title}</h1>
          <button
            className={styles.resetButton}
            onClick={() => setIsResetDialogOpen(true)}
          >
            リセット
          </button>
        </div>
      </header>

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleReset}
        title="リセット確認"
        message={resetMessage}
        confirmText="リセット"
        cancelText="キャンセル"
        danger
      />
    </>
  );
}
