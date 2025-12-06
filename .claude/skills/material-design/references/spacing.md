# Material Design 3 Spacing & Layout

## Spacing Scale

Material Design uses a 4dp base unit for all spacing.

### Spacing Tokens

```css
:root {
  --md-sys-spacing-0: 0px;
  --md-sys-spacing-1: 4px;
  --md-sys-spacing-2: 8px;
  --md-sys-spacing-3: 12px;
  --md-sys-spacing-4: 16px;
  --md-sys-spacing-5: 20px;
  --md-sys-spacing-6: 24px;
  --md-sys-spacing-7: 28px;
  --md-sys-spacing-8: 32px;
  --md-sys-spacing-9: 36px;
  --md-sys-spacing-10: 40px;
  --md-sys-spacing-11: 44px;
  --md-sys-spacing-12: 48px;
  --md-sys-spacing-14: 56px;
  --md-sys-spacing-16: 64px;
  --md-sys-spacing-20: 80px;
  --md-sys-spacing-24: 96px;
}
```

### Common Spacing Uses

| Token | Value | Use Case |
|-------|-------|----------|
| spacing-1 | 4px | Compact spacing, icon gaps |
| spacing-2 | 8px | Element gaps within components |
| spacing-3 | 12px | Small component padding |
| spacing-4 | 16px | Standard component padding |
| spacing-6 | 24px | Section padding, card padding |
| spacing-8 | 32px | Large section spacing |
| spacing-12 | 48px | Major section divisions |

## Layout Grid

### Columns

Material Design uses a 12-column grid system.

```css
.md-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
  padding: 0 16px;
}

/* Span utilities */
.md-col-1 { grid-column: span 1; }
.md-col-2 { grid-column: span 2; }
.md-col-3 { grid-column: span 3; }
.md-col-4 { grid-column: span 4; }
.md-col-6 { grid-column: span 6; }
.md-col-8 { grid-column: span 8; }
.md-col-12 { grid-column: span 12; }
```

### Breakpoints

```css
/* Compact (mobile) */
@media (max-width: 599px) {
  .md-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 0 16px;
  }
}

/* Medium (tablet) */
@media (min-width: 600px) and (max-width: 839px) {
  .md-grid {
    grid-template-columns: repeat(8, 1fr);
    gap: 16px;
    padding: 0 24px;
  }
}

/* Expanded (desktop) */
@media (min-width: 840px) {
  .md-grid {
    grid-template-columns: repeat(12, 1fr);
    gap: 24px;
    padding: 0 24px;
  }
}
```

### Window Size Classes

| Class | Width | Columns | Margins | Gutters |
|-------|-------|---------|---------|---------|
| Compact | 0-599dp | 4 | 16dp | 8dp |
| Medium | 600-839dp | 8 | 24dp | 16dp |
| Expanded | 840+ dp | 12 | 24dp | 24dp |

## Container Sizes

```css
/* Max width containers */
.md-container-small {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 16px;
}

.md-container-medium {
  max-width: 840px;
  margin: 0 auto;
  padding: 0 24px;
}

.md-container-large {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
```

## Component Spacing

### Cards

```css
.md-card {
  padding: 16px;
}

.md-card-media {
  margin: -16px -16px 16px -16px;
  border-radius: 12px 12px 0 0;
}

.md-card-title {
  margin-bottom: 8px;
}

.md-card-content {
  margin-bottom: 16px;
}

.md-card-actions {
  margin: -8px;
  padding: 8px;
}
```

### Lists

```css
.md-list {
  padding: 8px 0;
}

.md-list-item {
  padding: 8px 16px;
  min-height: 56px;
}

.md-list-item-icon {
  margin-right: 16px;
}

.md-list-item-text {
  margin-right: 16px;
}
```

### Dialogs

```css
.md-dialog {
  padding: 24px;
  min-width: 280px;
  max-width: 560px;
}

.md-dialog-title {
  margin-bottom: 16px;
}

.md-dialog-content {
  margin-bottom: 24px;
}

.md-dialog-actions {
  gap: 8px;
}
```

### App Bars

```css
.md-top-app-bar {
  height: 64px;
  padding: 0 4px;
}

.md-top-app-bar-title {
  margin-left: 16px;
}

.md-bottom-app-bar {
  height: 80px;
  padding: 12px 16px;
}
```

### Navigation

```css
.md-navigation-rail {
  width: 80px;
  padding: 12px 0;
}

.md-navigation-drawer {
  width: 360px;
  padding: 12px;
}

.md-navigation-bar {
  height: 80px;
}
```

## Touch Targets

Minimum touch target sizes for accessibility:

```css
/* Minimum 48x48dp touch target */
.md-touch-target {
  position: relative;
  min-width: 48px;
  min-height: 48px;
}

/* For smaller visual elements */
.md-touch-target::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
}
```

### Recommended Touch Targets

| Component | Touch Target |
|-----------|-------------|
| Icon Button | 48x48dp |
| Checkbox | 48x48dp |
| Radio Button | 48x48dp |
| Switch | 48x48dp |
| Button | 48dp height |

## Density

Material Design supports different density levels:

```css
/* Default density */
.md-density-default {
  --md-button-height: 40px;
  --md-list-item-height: 56px;
  --md-text-field-height: 56px;
}

/* Comfortable density (-1) */
.md-density-comfortable {
  --md-button-height: 36px;
  --md-list-item-height: 52px;
  --md-text-field-height: 52px;
}

/* Compact density (-2) */
.md-density-compact {
  --md-button-height: 32px;
  --md-list-item-height: 48px;
  --md-text-field-height: 48px;
}

/* Dense density (-3) */
.md-density-dense {
  --md-button-height: 28px;
  --md-list-item-height: 44px;
  --md-text-field-height: 44px;
}
```

## Responsive Patterns

### Adaptive Layout

```css
/* Mobile-first responsive layout */
.md-layout {
  display: flex;
  flex-direction: column;
}

/* Tablet and up: side navigation */
@media (min-width: 600px) {
  .md-layout {
    flex-direction: row;
  }

  .md-layout-nav {
    width: 80px;
    flex-shrink: 0;
  }

  .md-layout-content {
    flex: 1;
  }
}

/* Desktop: expanded navigation */
@media (min-width: 1200px) {
  .md-layout-nav {
    width: 360px;
  }
}
```

### Content Reflow

```css
/* Stack on mobile, side-by-side on desktop */
.md-content-pair {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 840px) {
  .md-content-pair {
    flex-direction: row;
    gap: 24px;
  }

  .md-content-pair > * {
    flex: 1;
  }
}
```
