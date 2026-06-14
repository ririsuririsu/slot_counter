import { useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import styles from './KabaneriButton.module.css';

const ROT_STEP = 675; // 1タップあたりの大外枠回転量(deg)

interface KabaneriButtonProps {
  label: string;
  count: number;
  /** 数字の下に出す確率/発光率テキスト */
  sub: string;
  color: string;
  softColor: string;
  /** ラベルの円弧半径(viewBox単位, 小=中心寄り/大=外周寄り) */
  labelRadius?: number;
  mode: 'add' | 'sub';
  /** 表示物の回転角(deg) */
  orient: number;
  onCount: (dir: 1 | -1) => void;
}

export function KabaneriButton({
  label,
  count,
  sub,
  color,
  softColor,
  labelRadius = 34,
  mode,
  orient,
  onCount,
}: KabaneriButtonProps) {
  const wrapRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef(0);

  const rawId = useId();
  const pathId = `arc-${rawId.replace(/[:]/g, '')}`;
  const r = labelRadius;
  const arcPath = `M ${50 - r} 50 A ${r} ${r} 0 0 1 ${50 + r} 50`;

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const dir: 1 | -1 = mode === 'sub' ? -1 : 1;

    // 大外枠の回転を蓄積（加算=時計回り / 減算=反時計回り）
    rotRef.current += ROT_STEP * dir;
    ringRef.current?.style.setProperty('--rot', `${rotRef.current}deg`);

    // 点滅 + ポップを毎回再生
    const w = wrapRef.current;
    if (w) {
      w.classList.remove(styles.pressed);
      void w.offsetWidth;
      w.classList.add(styles.pressed);
    }

    onCount(dir);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(mode === 'sub' ? [10, 30, 10] : 15);
    }
  };

  const handleAnimationEnd = () => {
    wrapRef.current?.classList.remove(styles.pressed);
  };

  const wrapStyle = {
    '--neon': color,
    '--neon-soft': softColor,
    '--orient': `${orient}deg`,
  } as CSSProperties;

  return (
    <button
      ref={wrapRef}
      type="button"
      className={styles.wrap}
      style={wrapStyle}
      onPointerDown={handlePointerDown}
      onAnimationEnd={handleAnimationEnd}
      aria-label={label}
    >
      <div className={styles.ringOuter} ref={ringRef} />
      <div className={styles.ringInner} />
      <div className={styles.content}>
        <svg className={styles.labelArc} viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <path id={pathId} d={arcPath} fill="none" />
          </defs>
          <text>
            <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
              {label}
            </textPath>
          </text>
        </svg>
        <div className={styles.core}>
          <span className={styles.count}>{count}</span>
          <span className={styles.prob}>{sub}</span>
        </div>
      </div>
    </button>
  );
}
