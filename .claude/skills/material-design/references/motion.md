# Material Design 3 Motion

## Motion Principles

Material motion is meaningful, focused, and expressive.

## Duration Tokens

```css
:root {
  /* Short durations */
  --md-sys-motion-duration-short1: 50ms;
  --md-sys-motion-duration-short2: 100ms;
  --md-sys-motion-duration-short3: 150ms;
  --md-sys-motion-duration-short4: 200ms;

  /* Medium durations */
  --md-sys-motion-duration-medium1: 250ms;
  --md-sys-motion-duration-medium2: 300ms;
  --md-sys-motion-duration-medium3: 350ms;
  --md-sys-motion-duration-medium4: 400ms;

  /* Long durations */
  --md-sys-motion-duration-long1: 450ms;
  --md-sys-motion-duration-long2: 500ms;
  --md-sys-motion-duration-long3: 550ms;
  --md-sys-motion-duration-long4: 600ms;
}
```

## Easing Functions

```css
:root {
  /* Standard easing */
  --md-sys-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --md-sys-motion-easing-standard-decelerate: cubic-bezier(0, 0, 0, 1);
  --md-sys-motion-easing-standard-accelerate: cubic-bezier(0.3, 0, 1, 1);

  /* Emphasized easing */
  --md-sys-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
  --md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);

  /* Linear */
  --md-sys-motion-easing-linear: cubic-bezier(0, 0, 1, 1);
}
```

## Common Animations

### Button State

```css
.md-button {
  transition:
    background-color var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard),
    box-shadow var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
```

### Dialog Enter/Exit

```css
.md-dialog {
  transform: scale(0.8);
  opacity: 0;
  transition:
    transform var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized-decelerate),
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.md-dialog.open {
  transform: scale(1);
  opacity: 1;
}
```

### Menu

```css
.md-menu {
  transform-origin: top;
  transform: scaleY(0);
  opacity: 0;
  transition:
    transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard-decelerate),
    opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}

.md-menu.open {
  transform: scaleY(1);
  opacity: 1;
}
```

### Snackbar

```css
.md-snackbar {
  transform: translateY(100%);
  transition:
    transform var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard-decelerate);
}

.md-snackbar.show {
  transform: translateY(0);
}
```

### Switch Toggle

```css
.md-switch::after {
  transition:
    transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    width var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard);
}
```

## Page Transitions

### Shared Axis (Horizontal)

```css
.page-enter {
  transform: translateX(30px);
  opacity: 0;
}

.page-enter-active {
  transform: translateX(0);
  opacity: 1;
  transition:
    transform var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-emphasized-decelerate),
    opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.page-exit-active {
  transform: translateX(-30px);
  opacity: 0;
  transition:
    transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-emphasized-accelerate),
    opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard);
}
```

### Fade Through

```css
.fade-through-exit-active {
  opacity: 0;
  transition: opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard-accelerate);
}

.fade-through-enter {
  opacity: 0;
  transform: scale(0.92);
}

.fade-through-enter-active {
  opacity: 1;
  transform: scale(1);
  transition:
    opacity var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard-decelerate),
    transform var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard-decelerate);
  transition-delay: var(--md-sys-motion-duration-short3);
}
```

## Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Performance Tips

1. Use `transform` and `opacity` (GPU accelerated)
2. Avoid animating `width`, `height`, `margin`, `padding`
3. Use `will-change` sparingly
