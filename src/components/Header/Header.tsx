import { useState } from 'react';
import { useMachineStore, isMonkeyTurnMachine, isHokutoMachine, isKabaneriMachine, isMonhanRiseMachine, isKokakuMachine } from '../../stores/machineStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { MachineType } from '../../types';
import styles from './Header.module.css';

const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  'monkey-turn-v': 'モンキーターンV',
  'hokuto-tensei2': '北斗の拳 転生の章2',
  'kabaneri': 'カバネリ海門決戦',
  'monhan-rise': 'モンハンライズ',
  'kokaku': '攻殻機動隊',
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
  const resetKabaneriMachine = useMachineStore((state) => state.resetKabaneriMachine);
  const resetMonhanRiseMachine = useMachineStore((state) => state.resetMonhanRiseMachine);
  const resetKokakuMachine = useMachineStore((state) => state.resetKokakuMachine);

  const handleBack = () => {
    selectMachine('');
  };

  const handleReset = () => {
    if (currentMachine && isHokutoMachine(currentMachine)) {
      resetHokutoMachine();
    } else if (currentMachine && isKabaneriMachine(currentMachine)) {
      resetKabaneriMachine();
    } else if (currentMachine && isMonhanRiseMachine(currentMachine)) {
      resetMonhanRiseMachine();
    } else if (currentMachine && isKokakuMachine(currentMachine)) {
      resetKokakuMachine();
    } else {
      resetCurrentMachine();
    }
  };

  const title = currentMachine?.name ?? 'スロットカウンター';
  const subtitle = currentMachine ? MACHINE_TYPE_LABELS[currentMachine.machineType] : '';
  const timestamp = currentMachine
    ? new Date(currentMachine.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';
  const keepsPreviousRecord = currentMachine ? isKabaneriMachine(currentMachine) : false;

  const resetMessage =
    keepsPreviousRecord
      ? '現在の記録を残し、同じ台の新しい記録を開始します。これまでの記録はホームから確認でき、クラウド接続時は両方保存します。'
      : currentMachine &&
    (isMonkeyTurnMachine(currentMachine) ||
      isKabaneriMachine(currentMachine) ||
      isMonhanRiseMachine(currentMachine) ||
      isKokakuMachine(currentMachine))
      ? '全てのカウンターと履歴をリセットしますか？この操作は取り消せません。'
      : '全てのログとセッション情報をリセットしますか？この操作は取り消せません。';

  return (
    <>
      <header className={`${styles.header} ${currentMachine?.machineType === 'kabaneri' ? styles.kabaneriHeader : ''}`}>
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
            {keepsPreviousRecord ? '新規記録' : 'リセット'}
          </button>
        </div>
      </header>

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleReset}
        title={keepsPreviousRecord ? '新しい記録を開始' : 'リセット確認'}
        message={resetMessage}
        confirmText={keepsPreviousRecord ? '開始' : 'リセット'}
        cancelText="キャンセル"
        danger={!keepsPreviousRecord}
      />
    </>
  );
}
