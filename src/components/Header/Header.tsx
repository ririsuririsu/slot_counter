import { useState } from 'react';
import { useMachineStore, isMonkeyTurnMachine, isHokutoMachine } from '../../stores/machineStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { MachineType } from '../../types';
import styles from './Header.module.css';

const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  'monkey-turn-v': 'モンキーターンV',
  'hokuto-tensei2': '北斗の拳 転生の章2',
};

interface HeaderProps {
  onAddLog?: () => void;
  onOpenShutter?: () => void;
  onOpenTenha?: () => void;
}

export function Header({ onAddLog, onOpenShutter, onOpenTenha }: HeaderProps = {}) {
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
  const subtitle = currentMachine ? MACHINE_TYPE_LABELS[currentMachine.machineType] : '';
  const timestamp = currentMachine
    ? new Date(currentMachine.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

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
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>{title}</h1>
            <span className={styles.subtitle}>{subtitle} · {timestamp}</span>
          </div>
          {onOpenShutter && (
            <button className={styles.refBtn} onClick={onOpenShutter}>
              シャッター
            </button>
          )}
          {onOpenTenha && (
            <button className={styles.refBtn} onClick={onOpenTenha}>
              天破
            </button>
          )}
          {onAddLog && (
            <button className={styles.addLogBtn} onClick={onAddLog}>
              ＋ログ
            </button>
          )}
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
