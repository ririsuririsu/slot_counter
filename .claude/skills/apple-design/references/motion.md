# Motion & Animation

Appleデザインにおけるアニメーションは、意味があり、控えめで、自然な動きを追求します。

## Core Principles

### 1. 意図を持つ (Purposeful)

- すべてのアニメーションには理由がある
- 状態変化をユーザーに伝える
- 空間的な関係性を示す

### 2. 控えめに (Subtle)

- 派手すぎないアニメーション
- コンテンツを邪魔しない
- 過度な使用を避ける

### 3. 自然に (Natural)

- 物理法則に従う
- 急な動きを避ける
- 慣性を感じさせる

## Timing Functions

### Standard Easing

```css
:root {
  /* System curves */
  --ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-in: cubic-bezier(0.42, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.58, 1);
  --ease-in-out: cubic-bezier(0.42, 0, 0.58, 1);

  /* Apple-specific curves */
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Easing Usage Guide

| カーブ | 用途 |
|--------|------|
| ease-out | 要素の出現、モーダル表示 |
| ease-in | 要素の退出、フェードアウト |
| ease-in-out | 状態変更、トグル |
| ease-spring | ボタンのバウンス、ポップアップ |

## Duration Scale

```css
:root {
  /* Instant - immediate feedback */
  --duration-instant: 0.05s;

  /* Fast - micro-interactions */
  --duration-fast: 0.1s;

  /* Normal - default transitions */
  --duration-normal: 0.2s;

  /* Moderate - state changes */
  --duration-moderate: 0.3s;

  /* Slow - complex animations */
  --duration-slow: 0.4s;

  /* Slower - page transitions */
  --duration-slower: 0.5s;
}
```

### Duration Guidelines

| アクション | 推奨時間 |
|------------|----------|
| ホバー効果 | 0.1-0.15s |
| ボタン押下 | 0.1s |
| カラー変更 | 0.2s |
| サイズ変更 | 0.2-0.3s |
| モーダル表示 | 0.3s |
| ページ遷移 | 0.4-0.5s |

## Common Animations

### Fade In/Out

```css
/* Fade in */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

/* Fade out */
@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.fade-out {
  animation: fadeOut var(--duration-normal) var(--ease-in);
}
```

### Slide In

```css
/* Slide in from bottom */
@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.slide-in-up {
  animation: slideInUp var(--duration-moderate) var(--ease-out);
}

/* Slide in from right */
@keyframes slideInRight {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Slide in from left */
@keyframes slideInLeft {
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

### Scale

```css
/* Scale up */
@keyframes scaleUp {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.scale-up {
  animation: scaleUp var(--duration-moderate) var(--ease-spring);
}

/* Pop in (with bounce) */
@keyframes popIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  70% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.pop-in {
  animation: popIn var(--duration-slow) var(--ease-spring);
}
```

## Interaction States

### Button Press

```css
.button {
  transition:
    transform var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.button:hover {
  transform: scale(1.02);
}

.button:active {
  transform: scale(0.98);
}
```

### Card Hover

```css
.card {
  transition:
    transform var(--duration-moderate) var(--ease-out),
    box-shadow var(--duration-moderate) var(--ease-out);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

### Link Underline

```css
.link {
  position: relative;
  text-decoration: none;
}

.link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 1px;
  background: currentColor;
  transition: width var(--duration-normal) var(--ease-out);
}

.link:hover::after {
  width: 100%;
}
```

### Input Focus

```css
.input {
  transition:
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.input:focus {
  border-color: var(--apple-blue);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}
```

## Component Animations

### Modal

```css
/* Overlay */
.modal-overlay {
  opacity: 0;
  transition: opacity var(--duration-moderate) var(--ease-out);
}

.modal-overlay.active {
  opacity: 1;
}

/* Modal content */
.modal-content {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
  transition:
    transform var(--duration-moderate) var(--ease-spring),
    opacity var(--duration-moderate) var(--ease-out);
}

.modal-overlay.active .modal-content {
  transform: scale(1) translateY(0);
  opacity: 1;
}
```

### Dropdown

```css
.dropdown-menu {
  transform-origin: top;
  transform: scaleY(0.95);
  opacity: 0;
  visibility: hidden;
  transition:
    transform var(--duration-normal) var(--ease-out),
    opacity var(--duration-normal) var(--ease-out),
    visibility 0s linear var(--duration-normal);
}

.dropdown.active .dropdown-menu {
  transform: scaleY(1);
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}
```

### Toast

```css
.toast {
  transform: translateY(100%);
  opacity: 0;
  transition:
    transform var(--duration-moderate) var(--ease-spring),
    opacity var(--duration-moderate) var(--ease-out);
}

.toast.active {
  transform: translateY(0);
  opacity: 1;
}
```

### Action Sheet

```css
.action-sheet {
  transform: translateY(100%);
  transition: transform var(--duration-moderate) var(--ease-out);
}

.action-sheet.active {
  transform: translateY(0);
}
```

### Tab Content

```css
.tab-panel {
  opacity: 0;
  transform: translateX(10px);
  transition:
    opacity var(--duration-normal) var(--ease-out),
    transform var(--duration-normal) var(--ease-out);
}

.tab-panel.active {
  opacity: 1;
  transform: translateX(0);
}
```

## Page Transitions

### Fade Transition

```css
.page-transition-fade {
  opacity: 0;
  transition: opacity var(--duration-slower) var(--ease-out);
}

.page-transition-fade.active {
  opacity: 1;
}
```

### Slide Transition

```css
.page-enter {
  transform: translateX(100%);
}

.page-enter-active {
  transform: translateX(0);
  transition: transform var(--duration-slow) var(--ease-out);
}

.page-exit {
  transform: translateX(0);
}

.page-exit-active {
  transform: translateX(-100%);
  transition: transform var(--duration-slow) var(--ease-in);
}
```

## Scroll Animations

### Reveal on Scroll

```css
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity var(--duration-slow) var(--ease-out),
    transform var(--duration-slow) var(--ease-out);
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Staggered reveal */
.reveal:nth-child(1) { transition-delay: 0s; }
.reveal:nth-child(2) { transition-delay: 0.1s; }
.reveal:nth-child(3) { transition-delay: 0.2s; }
.reveal:nth-child(4) { transition-delay: 0.3s; }
```

### Parallax Effect

```css
.parallax-container {
  overflow: hidden;
}

.parallax-element {
  will-change: transform;
  transition: transform 0.1s linear;
}
```

## Loading States

### Spinner

```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 0.8s linear infinite;
}
```

### Pulse

```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: pulse 2s ease-in-out infinite;
}
```

### Shimmer (Skeleton)

```css
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--fill-tertiary) 25%,
    var(--fill-secondary) 50%,
    var(--fill-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Progress

```css
@keyframes progress {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

.progress-bar {
  animation: progress 2s ease-out forwards;
}
```

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Performance Tips

### Use GPU Acceleration

```css
/* Good - GPU accelerated */
.animated {
  transform: translateX(100px);
  opacity: 0.5;
}

/* Avoid - triggers layout */
.animated {
  left: 100px;
  width: 200px;
}
```

### will-change

```css
/* Use sparingly */
.will-animate {
  will-change: transform, opacity;
}

/* Remove after animation */
.will-animate.done {
  will-change: auto;
}
```

### Composite Properties

| Good (GPU) | Bad (CPU) |
|------------|-----------|
| transform | top, left, right, bottom |
| opacity | width, height |
| | margin, padding |
| | border-width |

## Best Practices

### DO

- アニメーションには意味を持たせる
- transform と opacity を優先する
- prefers-reduced-motion を尊重する
- 短い duration を使用する（0.1-0.4s）
- ease-out を出現に、ease-in を退出に使用

### DON'T

- すべての要素をアニメーションさせない
- 長すぎるアニメーションを避ける
- バウンスを多用しない
- レイアウトプロパティをアニメーションしない
- will-change を乱用しない
