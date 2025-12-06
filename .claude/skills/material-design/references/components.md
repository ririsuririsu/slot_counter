# Material Design 3 Components

## Buttons

### Filled Button

Primary action, highest emphasis.

```css
.md-filled-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 24px;
  gap: 8px;
  border: none;
  border-radius: 20px;
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.md-filled-button:hover {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3),
              0 1px 3px 1px rgba(0, 0, 0, 0.15);
}

.md-filled-button:focus {
  outline: none;
}

.md-filled-button:active {
  box-shadow: none;
}

.md-filled-button:disabled {
  background: rgba(var(--md-sys-color-on-surface-rgb), 0.12);
  color: rgba(var(--md-sys-color-on-surface-rgb), 0.38);
  cursor: not-allowed;
}
```

### Tonal Button

Secondary action, medium emphasis.

```css
.md-tonal-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 24px;
  gap: 8px;
  border: none;
  border-radius: 20px;
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  cursor: pointer;
}
```

### Outlined Button

Medium emphasis, secondary action.

```css
.md-outlined-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 24px;
  gap: 8px;
  background: transparent;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: 20px;
  color: var(--md-sys-color-primary);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  cursor: pointer;
}
```

### Text Button

Lowest emphasis, for less important actions.

```css
.md-text-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 12px;
  gap: 8px;
  background: transparent;
  border: none;
  border-radius: 20px;
  color: var(--md-sys-color-primary);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  cursor: pointer;
}
```

### Icon Button

```css
.md-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
}

.md-icon-button:hover {
  background: rgba(var(--md-sys-color-on-surface-variant-rgb), 0.08);
}
```

## FAB (Floating Action Button)

### Standard FAB

```css
.md-fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: none;
  border-radius: 16px;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2),
              0 6px 10px 0 rgba(0, 0, 0, 0.14),
              0 1px 18px 0 rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.md-fab:hover {
  box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
              0 8px 10px 1px rgba(0, 0, 0, 0.14),
              0 3px 14px 2px rgba(0, 0, 0, 0.12);
}
```

### Small FAB

```css
.md-fab-small {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}
```

### Large FAB

```css
.md-fab-large {
  width: 96px;
  height: 96px;
  border-radius: 28px;
}
```

### Extended FAB

```css
.md-fab-extended {
  width: auto;
  height: 56px;
  padding: 0 16px;
  gap: 8px;
  border-radius: 16px;
}

.md-fab-extended .md-fab-label {
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
}
```

## Cards

### Elevated Card

```css
.md-card-elevated {
  background: var(--md-sys-color-surface);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3),
              0 1px 3px 1px rgba(0, 0, 0, 0.15);
}
```

### Filled Card

```css
.md-card-filled {
  background: var(--md-sys-color-surface-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 16px;
}
```

### Outlined Card

```css
.md-card-outlined {
  background: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 16px;
}
```

## Text Fields

### Filled Text Field

```css
.md-text-field-filled {
  position: relative;
  height: 56px;
  border-radius: 4px 4px 0 0;
  background: var(--md-sys-color-surface-variant);
}

.md-text-field-filled input {
  width: 100%;
  height: 100%;
  padding: 20px 16px 6px;
  border: none;
  border-bottom: 1px solid var(--md-sys-color-on-surface-variant);
  background: transparent;
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
  color: var(--md-sys-color-on-surface);
}

.md-text-field-filled input:focus {
  outline: none;
  border-bottom: 2px solid var(--md-sys-color-primary);
}

.md-text-field-filled label {
  position: absolute;
  left: 16px;
  top: 16px;
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
  color: var(--md-sys-color-on-surface-variant);
  transition: all 0.2s ease;
  pointer-events: none;
}

.md-text-field-filled input:focus + label,
.md-text-field-filled input:not(:placeholder-shown) + label {
  top: 8px;
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-primary);
}
```

### Outlined Text Field

```css
.md-text-field-outlined {
  position: relative;
  height: 56px;
}

.md-text-field-outlined input {
  width: 100%;
  height: 100%;
  padding: 16px;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: 4px;
  background: transparent;
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
  color: var(--md-sys-color-on-surface);
}

.md-text-field-outlined input:focus {
  outline: none;
  border: 2px solid var(--md-sys-color-primary);
}

.md-text-field-outlined label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  padding: 0 4px;
  background: var(--md-sys-color-surface);
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
  color: var(--md-sys-color-on-surface-variant);
  transition: all 0.2s ease;
  pointer-events: none;
}

.md-text-field-outlined input:focus + label,
.md-text-field-outlined input:not(:placeholder-shown) + label {
  top: 0;
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-primary);
}
```

## Switches

```css
.md-switch {
  position: relative;
  width: 52px;
  height: 32px;
  background: var(--md-sys-color-surface-variant);
  border: 2px solid var(--md-sys-color-outline);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.md-switch::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 6px;
  width: 16px;
  height: 16px;
  background: var(--md-sys-color-outline);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.md-switch.selected {
  background: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
}

.md-switch.selected::after {
  left: 26px;
  width: 24px;
  height: 24px;
  top: 2px;
  background: var(--md-sys-color-on-primary);
}
```

## Checkboxes

```css
.md-checkbox {
  position: relative;
  width: 18px;
  height: 18px;
  border: 2px solid var(--md-sys-color-on-surface-variant);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.md-checkbox.checked {
  background: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
}

.md-checkbox.checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: solid var(--md-sys-color-on-primary);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
```

## Radio Buttons

```css
.md-radio {
  position: relative;
  width: 20px;
  height: 20px;
  border: 2px solid var(--md-sys-color-on-surface-variant);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.md-radio.selected {
  border-color: var(--md-sys-color-primary);
}

.md-radio.selected::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: var(--md-sys-color-primary);
  border-radius: 50%;
}
```

## Chips

### Assist Chip

```css
.md-chip-assist {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 16px;
  gap: 8px;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: 8px;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  cursor: pointer;
}
```

### Filter Chip

```css
.md-chip-filter {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 16px;
  gap: 8px;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: 8px;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  cursor: pointer;
}

.md-chip-filter.selected {
  background: var(--md-sys-color-secondary-container);
  border-color: transparent;
  color: var(--md-sys-color-on-secondary-container);
}
```

### Input Chip

```css
.md-chip-input {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  gap: 8px;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: 8px;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
}
```

## Dialogs

```css
.md-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 280px;
  max-width: 560px;
  background: var(--md-sys-color-surface);
  border-radius: 28px;
  padding: 24px;
  box-shadow: 0 8px 10px -6px rgba(0, 0, 0, 0.2),
              0 16px 24px 2px rgba(0, 0, 0, 0.14),
              0 6px 30px 5px rgba(0, 0, 0, 0.12);
}

.md-dialog-title {
  font-family: var(--md-sys-typescale-headline-small-font);
  font-size: var(--md-sys-typescale-headline-small-size);
  color: var(--md-sys-color-on-surface);
  margin-bottom: 16px;
}

.md-dialog-content {
  font-family: var(--md-sys-typescale-body-medium-font);
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface-variant);
  margin-bottom: 24px;
}

.md-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.md-dialog-scrim {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.32);
}
```

## Navigation

### Navigation Bar (Bottom)

```css
.md-navigation-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 80px;
  background: var(--md-sys-color-surface);
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.3);
}

.md-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0;
  min-width: 48px;
  cursor: pointer;
}

.md-nav-item .icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 32px;
  border-radius: 16px;
}

.md-nav-item.active .icon {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.md-nav-item .label {
  font-family: var(--md-sys-typescale-label-medium-font);
  font-size: var(--md-sys-typescale-label-medium-size);
  font-weight: var(--md-sys-typescale-label-medium-weight);
}
```

### Navigation Rail

```css
.md-navigation-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
  padding: 12px 0;
  gap: 12px;
  background: var(--md-sys-color-surface);
}

.md-rail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  cursor: pointer;
}

.md-rail-item .icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 32px;
  border-radius: 16px;
}

.md-rail-item.active .icon {
  background: var(--md-sys-color-secondary-container);
}

.md-rail-item .label {
  font-family: var(--md-sys-typescale-label-medium-font);
  font-size: var(--md-sys-typescale-label-medium-size);
}
```

### Navigation Drawer

```css
.md-navigation-drawer {
  width: 360px;
  height: 100%;
  background: var(--md-sys-color-surface);
  padding: 12px;
}

.md-drawer-item {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 24px 0 16px;
  gap: 12px;
  border-radius: 28px;
  cursor: pointer;
}

.md-drawer-item.active {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.md-drawer-item .label {
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
}
```

## Snackbar

```css
.md-snackbar {
  display: flex;
  align-items: center;
  min-width: 344px;
  max-width: 672px;
  padding: 14px 16px;
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  border-radius: 4px;
  box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2),
              0 6px 10px 0 rgba(0, 0, 0, 0.14),
              0 1px 18px 0 rgba(0, 0, 0, 0.12);
}

.md-snackbar-text {
  flex: 1;
  font-family: var(--md-sys-typescale-body-medium-font);
  font-size: var(--md-sys-typescale-body-medium-size);
}

.md-snackbar-action {
  color: var(--md-sys-color-inverse-primary);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  background: none;
  border: none;
  cursor: pointer;
}
```

## Progress Indicators

### Linear Progress

```css
.md-linear-progress {
  position: relative;
  width: 100%;
  height: 4px;
  background: var(--md-sys-color-surface-variant);
  border-radius: 2px;
  overflow: hidden;
}

.md-linear-progress-indicator {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--md-sys-color-primary);
  border-radius: 2px;
  transition: width 0.2s ease;
}
```

### Circular Progress

```css
.md-circular-progress {
  width: 48px;
  height: 48px;
  animation: rotate 1.4s linear infinite;
}

.md-circular-progress circle {
  fill: none;
  stroke: var(--md-sys-color-primary);
  stroke-width: 4;
  stroke-dasharray: 100;
  stroke-dashoffset: 25;
  animation: dash 1.4s ease-in-out infinite;
}

@keyframes rotate {
  100% { transform: rotate(360deg); }
}

@keyframes dash {
  0% { stroke-dashoffset: 100; }
  50% { stroke-dashoffset: 25; }
  100% { stroke-dashoffset: 100; }
}
```
