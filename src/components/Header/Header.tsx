import { useState } from 'react';
import { useMachineStore, isMonkeyTurnMachine, isHokutoMachine } from '../../stores/machineStore';
import type { MachineType } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import styles from './Header.module.css';

const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  'monkey-turn-v': 'モンキーターンV',
  'hokuto-tensei2': '北斗転生2',
};

export function Header() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const machines = useMachineStore((state) => state.machines);
  const currentMachineId = useMachineStore((state) => state.currentMachineId);
  const currentMachine = useMachineStore((state) => state.getCurrentMachine());
  const selectMachine = useMachineStore((state) => state.selectMachine);
  const addMachine = useMachineStore((state) => state.addMachine);
  const resetCurrentMachine = useMachineStore((state) => state.resetCurrentMachine);
  const resetHokutoMachine = useMachineStore((state) => state.resetHokutoMachine);

  const handleMachineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'new') {
      setIsAddMenuOpen(true);
      // selectを元に戻す
      if (currentMachineId) {
        e.target.value = currentMachineId;
      }
    } else {
      selectMachine(value);
    }
  };

  const handleAddMachine = (type: MachineType) => {
    addMachine(type);
    setIsAddMenuOpen(false);
  };

  const handleReset = () => {
    if (currentMachine && isHokutoMachine(currentMachine)) {
      resetHokutoMachine();
    } else {
      resetCurrentMachine();
    }
  };

  const title = currentMachine
    ? MACHINE_TYPE_LABELS[currentMachine.machineType]
    : 'スロットカウンター';

  const resetMessage =
    currentMachine && isMonkeyTurnMachine(currentMachine)
      ? '全てのカウンターと履歴をリセットしますか？この操作は取り消せません。'
      : '全てのログとセッション情報をリセットしますか？この操作は取り消せません。';

  return (
    <>
      <header className={styles.header}>
        <div className={styles.content}>
          <h1 className={styles.title}>{title}</h1>
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
              リセット
            </button>
          </div>
        </div>
      </header>

      {/* 機種選択メニュー */}
      {isAddMenuOpen && (
        <div className={styles.addMenuOverlay} onClick={() => setIsAddMenuOpen(false)}>
          <div className={styles.addMenu} onClick={(e) => e.stopPropagation()}>
            <p className={styles.addMenuTitle}>機種を選択</p>
            <button
              className={styles.addMenuItem}
              onClick={() => handleAddMachine('monkey-turn-v')}
            >
              モンキーターンV
            </button>
            <button
              className={styles.addMenuItem}
              onClick={() => handleAddMachine('hokuto-tensei2')}
            >
              北斗の拳 転生の章2
            </button>
            <button
              className={styles.addMenuCancel}
              onClick={() => setIsAddMenuOpen(false)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

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
