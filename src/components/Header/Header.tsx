import { useState } from 'react';
import { useMachineStore } from '../../stores/machineStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import styles from './Header.module.css';

export function Header() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const machines = useMachineStore((state) => state.machines);
  const currentMachineId = useMachineStore((state) => state.currentMachineId);
  const selectMachine = useMachineStore((state) => state.selectMachine);
  const addMachine = useMachineStore((state) => state.addMachine);
  const resetCurrentMachine = useMachineStore((state) => state.resetCurrentMachine);

  const handleMachineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'new') {
      addMachine();
    } else {
      selectMachine(value);
    }
  };

  const handleReset = () => {
    resetCurrentMachine();
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.content}>
          <h1 className={styles.title}>モンキーターンV</h1>
          <div className={styles.machineSelector}>
            <select
              className={styles.machineSelect}
              value={currentMachineId || ''}
              onChange={handleMachineChange}
            >
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
              <option value="new">+ 新規台追加</option>
            </select>
            <button
              className={styles.resetButton}
              onClick={() => setIsResetDialogOpen(true)}
            >
              🔄 リセット
            </button>
          </div>
        </div>
      </header>
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleReset}
        title="リセット確認"
        message="全てのカウンターと履歴をリセットしますか？この操作は取り消せません。"
        confirmText="リセット"
        cancelText="キャンセル"
        danger
      />
    </>
  );
}
