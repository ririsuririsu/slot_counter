import { Modal } from './Modal';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'はい',
  cancelText = 'キャンセル',
  danger = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button
          className={`btn btn-outline ${styles.actionButton}`}
          onClick={onClose}
        >
          {cancelText}
        </button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'} ${styles.actionButton}`}
          onClick={handleConfirm}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
