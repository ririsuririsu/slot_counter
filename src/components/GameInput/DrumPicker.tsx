import { useState, useCallback } from 'react';
import styles from './DrumPicker.module.css';

interface DrumPickerProps {
  initialValue: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

export function DrumPicker({ initialValue, onConfirm, onCancel }: DrumPickerProps) {
  // 4桁の各桁を管理
  const [digits, setDigits] = useState(() => {
    const str = String(initialValue).padStart(4, '0');
    return [
      parseInt(str[0]),
      parseInt(str[1]),
      parseInt(str[2]),
      parseInt(str[3]),
    ];
  });

  const incrementDigit = useCallback((index: number) => {
    setDigits((prev) => {
      const newDigits = [...prev];
      newDigits[index] = (newDigits[index] + 1) % 10;
      return newDigits;
    });
  }, []);

  const decrementDigit = useCallback((index: number) => {
    setDigits((prev) => {
      const newDigits = [...prev];
      newDigits[index] = (newDigits[index] - 1 + 10) % 10;
      return newDigits;
    });
  }, []);

  const handleConfirm = () => {
    const value = digits[0] * 1000 + digits[1] * 100 + digits[2] * 10 + digits[3];
    onConfirm(value);
  };

  return (
    <div>
      <div className={styles.container}>
        {digits.map((digit, index) => (
          <div key={index} className={styles.digitColumn}>
            <button
              className={styles.arrowButton}
              onClick={() => incrementDigit(index)}
              aria-label={`${index + 1}桁目を増やす`}
            >
              ▲
            </button>
            <div className={styles.digitDisplay}>{digit}</div>
            <button
              className={styles.arrowButton}
              onClick={() => decrementDigit(index)}
              aria-label={`${index + 1}桁目を減らす`}
            >
              ▼
            </button>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <button
          className={`btn btn-outline ${styles.updateButton}`}
          onClick={onCancel}
        >
          キャンセル
        </button>
        <button
          className={`btn btn-primary ${styles.updateButton}`}
          onClick={handleConfirm}
        >
          更新
        </button>
      </div>
    </div>
  );
}
