import { useState } from 'react';
import type { ReactNode } from 'react';
import type { KokakuScreen } from '../../types';
import { kokakuScreenImage } from '../../data/kokakuDefinitions';

/**
 * 画面キャプチャ。`public/kokaku-screens/<id>.webp` が無ければ `fallback` を出す。
 *
 * 画像の有無を設定で持たず、読み込み失敗を onError で拾うだけにしている。
 * グリッドのセル・入力カード・集計の3箇所で使うので、この判定はここに集約する。
 */
export function KokakuScreenImage({
  screen,
  alt = '',
  fallback = null,
}: {
  screen: KokakuScreen;
  alt?: string;
  fallback?: ReactNode;
}) {
  const [hasImage, setHasImage] = useState(true);

  if (!hasImage) return <>{fallback}</>;

  return (
    <img
      src={kokakuScreenImage(screen)}
      alt={alt}
      loading="lazy"
      onError={() => setHasImage(false)}
    />
  );
}
