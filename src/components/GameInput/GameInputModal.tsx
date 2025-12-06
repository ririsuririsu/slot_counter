import { Modal } from '../common/Modal';
import { DrumPicker } from './DrumPicker';
import { useMachineStore } from '../../stores/machineStore';

interface GameInputModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameInputModal({ isOpen, onClose }: GameInputModalProps) {
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const updateTotalGames = useMachineStore((state) => state.updateTotalGames);

  const handleConfirm = (value: number) => {
    updateTotalGames(value);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ゲーム数入力">
      <DrumPicker
        initialValue={machine?.totalGames ?? 0}
        onConfirm={handleConfirm}
        onCancel={onClose}
      />
    </Modal>
  );
}
