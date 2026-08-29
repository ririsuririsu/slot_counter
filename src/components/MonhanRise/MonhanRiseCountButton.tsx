import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { playHaptic } from '../../utils/haptic';
import styles from './MonhanRiseCountButton.module.css';

interface MonhanRiseCountButtonProps {
  count: number;
  label: string;
  /** large=ライズゾーン/弱レア役, small=だるま落としの規定回数 */
  size?: 'large' | 'small';
  /** リング・浮き上がり表示の色 */
  accent: string;
  /** 塗りつぶし（強調）表示にする */
  filled?: boolean;
  onPress: () => void;
}

/** 指の移動がこの距離(px)を超えたらスクロール扱いでカウントしない */
const MOVE_THRESHOLD = 10;

/**
 * カウンター用ボタン。カバネリのボタンと同じ作りで、
 *  - スクロール中の誤反応を防ぐタップ判定（onClick ではなく pointer イベント）
 *  - 押下時のハプティック
 * を持つ。
 *
 * 押下フィードバックはボタンの**外側**に出す。指でボタン面が隠れても、
 * 外周に広がるリングと上に浮き上がる「+1」で反応が確認できる。
 */
export function MonhanRiseCountButton({
  count,
  label,
  size = 'large',
  accent,
  filled = false,
  onPress,
}: MonhanRiseCountButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const armedRef = useRef(false);

  const fire = () => {
    // 連打でもアニメーションを毎回頭から流す（一度外して reflow を挟む）
    const el = btnRef.current;
    if (el) {
      el.classList.remove(styles.pressed);
      void el.offsetWidth;
      el.classList.add(styles.pressed);
    }
    onPress();
    playHaptic();
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
    fire();
  };

  const handlePointerCancel = () => {
    armedRef.current = false;
  };

  // いちばん長いアニメーション（浮き上がり）の完了で状態を戻す
  const handleFloatAnimationEnd = () => {
    btnRef.current?.classList.remove(styles.pressed);
  };

  return (
    <button
      ref={btnRef}
      type="button"
      className={`${styles.btn} ${styles[size]} ${filled ? styles.filled : ''}`}
      style={{ '--accent': accent } as CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      aria-label={`${label} ${count}`}
    >
      <span className={styles.ring} aria-hidden="true" />
      <span
        className={styles.float}
        aria-hidden="true"
        onAnimationEnd={handleFloatAnimationEnd}
      >
        +1
      </span>
      <span className={styles.body}>
        <span className={styles.count}>{count}</span>
        <span className={styles.label}>{label}</span>
      </span>
    </button>
  );
}
