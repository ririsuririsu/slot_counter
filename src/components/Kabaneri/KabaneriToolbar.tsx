import type { CSSProperties } from 'react';
import styles from './KabaneriToolbar.module.css';

export type CountMode = 'add' | 'sub';

interface KabaneriToolbarProps {
  mode: CountMode;
  orient: number;
  onModeChange: (mode: CountMode) => void;
  onRotate: () => void;
}

export function KabaneriToolbar({ mode, orient, onModeChange, onRotate }: KabaneriToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.modeToggle}>
        <button
          type="button"
          className={`${styles.seg} ${mode === 'add' ? styles.segAddActive : ''}`}
          onClick={() => onModeChange('add')}
          aria-label="加算モード"
          aria-pressed={mode === 'add'}
        >
          ＋
        </button>
        <button
          type="button"
          className={`${styles.seg} ${mode === 'sub' ? styles.segSubActive : ''}`}
          onClick={() => onModeChange('sub')}
          aria-label="減算モード"
          aria-pressed={mode === 'sub'}
        >
          －
        </button>
      </div>
      <button
        type="button"
        className={styles.rotateBtn}
        style={{ '--orient': `${orient}deg` } as CSSProperties}
        onClick={onRotate}
        aria-label="表示を90度回転"
      >
        ⟳
      </button>
    </div>
  );
}
