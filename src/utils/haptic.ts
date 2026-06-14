// ============================================
// ハプティック（バイブ）ユーティリティ
//
// - Android Chrome 等: Web Vibration API (navigator.vibrate)
// - iOS Safari: Vibration API 非対応のため、非公式の裏技として
//   `<input type="checkbox" switch>` をユーザー操作中にトグルすると
//   iOS がシステムハプティックを鳴らす挙動を利用する（iOS 17.4+ Safari）。
//   端末/OSバージョン依存で確実ではない。
// ============================================

let iosSwitch: HTMLInputElement | null = null;

function ensureIosSwitch(): HTMLInputElement | null {
  if (typeof document === 'undefined') return null;
  if (iosSwitch && iosSwitch.isConnected) return iosSwitch;

  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  // 画面外に隠すが display:none にはしない（描画されていないと発火しないため）
  label.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);pointer-events:none;opacity:0;';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', ''); // Safari 専用: スイッチ表示にするとトグルでハプティック
  input.tabIndex = -1;

  label.appendChild(input);
  document.body.appendChild(label);
  iosSwitch = input;
  return input;
}

/**
 * 最小のハプティック（プルッ）を鳴らす。
 * ユーザー操作（タップ）のイベントハンドラ内から呼ぶこと。
 */
export function playHaptic(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(10);
    return;
  }
  // iOS フォールバック（非公式）
  try {
    const el = ensureIosSwitch();
    el?.click();
  } catch {
    /* 何もしない */
  }
}
