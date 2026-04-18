import { Modal } from '../common/Modal';
import { SHUTTER_CHECKPOINTS } from '../../data/hokutoDefinitions';
import styles from './ShutterModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  alignTop?: boolean;
}

export function ShutterModal({ isOpen, onClose, alignTop }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="シャッター判別ポイント" alignTop={alignTop}>
      <div className={styles.container}>
        <p className={styles.description}>
          シャッター演出が発生するG数帯。896以内のモード判別に使用。
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>G数</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            {SHUTTER_CHECKPOINTS.map((cp, i) => (
              <tr key={i}>
                <td className={styles.range}>{cp.min}〜{cp.max}G</td>
                <td>{cp.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
