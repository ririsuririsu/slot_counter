import { Modal } from '../common/Modal';
import { StatisticsChart } from './StatisticsChart';
import { HistoryList } from './HistoryList';
import styles from './HistoryModal.module.css';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="グラフ・履歴">
      <div className={styles.content}>
        <StatisticsChart />
        <HistoryList />
      </div>
    </Modal>
  );
}
