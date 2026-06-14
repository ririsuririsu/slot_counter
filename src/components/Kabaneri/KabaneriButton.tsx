import { useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import { playHaptic } from '../../utils/haptic';
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
  /** バイブ有効 */
  haptic?: boolean;
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
  haptic = true,
  onCount,
}: KabaneriButtonProps) {
  const wrapRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef(0);
  // タップ判定: 押下位置と「まだタップとして有効か」を保持
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const armedRef = useRef(false);

  const rawId = useId();
  const pathId = `arc-${rawId.replace(/[:]/g, '')}`;
  const r = labelRadius;
  const arcPath = `M ${50 - r} 50 A ${r} ${r} 0 0 1 ${50 + r} 50`;

  // 指の移動がこの距離(px)を超えたらスクロール扱いでカウントしない
  const MOVE_THRESHOLD = 10;

  const fireCount = () => {
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
    if (haptic) playHaptic(); // 最小の「プルッ」（iOSは裏技フォールバック）
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    armedRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!armedRef.current || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
      // スクロールと判断 → このジェスチャではカウントしない
      armedRef.current = false;
    }
  };

  const handlePointerUp = () => {
    if (!armedRef.current) return;
    armedRef.current = false;
    fireCount();
  };

  const handlePointerCancel = () => {
    armedRef.current = false;
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
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
