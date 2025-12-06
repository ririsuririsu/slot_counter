# UI Components

Apple Design Systemに基づいた、再利用可能なUIコンポーネントのリファレンスです。

## Buttons

### Primary Button

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: 12px 24px;
  font-size: 17px;
  font-weight: 500;
  line-height: 1.2;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.button-primary {
  background: var(--apple-blue);
  color: white;
}

.button-primary:hover {
  background: #0066CC;
  transform: scale(1.02);
}

.button-primary:active {
  background: #004999;
  transform: scale(0.98);
}

.button-primary:disabled {
  background: var(--gray-4);
  cursor: not-allowed;
  transform: none;
}
```

### Secondary Button

```css
.button-secondary {
  background: var(--gray-6);
  color: var(--apple-blue);
}

.button-secondary:hover {
  background: var(--gray-5);
}
```

### Ghost Button

```css
.button-ghost {
  background: transparent;
  color: var(--apple-blue);
}

.button-ghost:hover {
  background: var(--fill-quaternary);
}
```

### Text Link Button

```css
.button-text {
  background: none;
  color: var(--apple-blue);
  padding: 0;
  font-size: 17px;
  font-weight: 400;
}

.button-text:hover {
  text-decoration: underline;
}

/* With arrow */
.button-text::after {
  content: " ›";
  transition: transform 0.2s ease;
}

.button-text:hover::after {
  transform: translateX(3px);
}
```

### Button Sizes

```css
.button-sm {
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 10px;
}

.button-lg {
  padding: 16px 32px;
  font-size: 19px;
  border-radius: 18px;
}

.button-icon {
  padding: 12px;
  border-radius: 50%;
}
```

### Button Group

```css
.button-group {
  display: flex;
  gap: var(--space-4);
}

.button-group-vertical {
  flex-direction: column;
}

.button-group-center {
  justify-content: center;
}
```

## Cards

### Basic Card

```css
.card {
  background: var(--bg-primary);
  border-radius: 18px;
  padding: 24px;
  box-shadow: var(--shadow-md);
}
```

### Elevated Card

```css
.card-elevated {
  background: var(--bg-elevated-primary);
  box-shadow: var(--shadow-lg);
}
```

### Interactive Card

```css
.card-interactive {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.card-interactive:hover {
  transform: scale(1.02) translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-interactive:active {
  transform: scale(0.98);
}
```

### Media Card

```css
.card-media {
  padding: 0;
  overflow: hidden;
}

.card-media-image {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
}

.card-media-content {
  padding: 24px;
}
```

### Feature Card

```css
.card-feature {
  text-align: center;
  padding: 32px;
}

.card-feature-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  color: var(--apple-blue);
}

.card-feature-title {
  font-size: 21px;
  font-weight: 600;
  margin-bottom: 8px;
}

.card-feature-description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.5;
}
```

## Forms

### Text Input

```css
.input {
  width: 100%;
  padding: 12px 16px;
  font-size: 17px;
  line-height: 1.4;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--gray-4);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input::placeholder {
  color: var(--text-placeholder);
}

.input:focus {
  border-color: var(--apple-blue);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.input:disabled {
  background: var(--gray-6);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.input-error {
  border-color: var(--apple-red);
}

.input-error:focus {
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
}
```

### Input with Label

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-hint {
  font-size: 13px;
  color: var(--text-tertiary);
}

.form-error {
  font-size: 13px;
  color: var(--apple-red);
}
```

### Search Input

```css
.input-search {
  padding-left: 40px;
  background-image: url("data:image/svg+xml,..."); /* search icon */
  background-repeat: no-repeat;
  background-position: 12px center;
  background-size: 16px;
}
```

### Textarea

```css
.textarea {
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
}
```

### Select

```css
.select {
  appearance: none;
  padding-right: 40px;
  background-image: url("data:image/svg+xml,..."); /* chevron */
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px;
  cursor: pointer;
}
```

### Checkbox & Radio

```css
.checkbox,
.radio {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.checkbox-input,
.radio-input {
  width: 22px;
  height: 22px;
  accent-color: var(--apple-blue);
}

.checkbox-label,
.radio-label {
  font-size: 17px;
  color: var(--text-primary);
}
```

### Toggle Switch

```css
.toggle {
  position: relative;
  width: 51px;
  height: 31px;
  background: var(--gray-4);
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}

.toggle.active {
  background: var(--apple-green);
}

.toggle.active::after {
  transform: translateX(20px);
}
```

## Navigation

### Navbar

```css
.navbar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 22px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.navbar-brand {
  font-size: 21px;
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: 24px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.navbar-link {
  font-size: 14px;
  color: var(--text-primary);
  text-decoration: none;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.navbar-link:hover {
  opacity: 1;
}

@media (prefers-color-scheme: dark) {
  .navbar {
    background: rgba(0, 0, 0, 0.72);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
}
```

### Tab Bar (iOS Style)

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 8px 0 34px; /* Safe area */
  background: var(--bg-secondary);
  border-top: 1px solid var(--separator);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  color: var(--gray-1);
  text-decoration: none;
}

.tab-item.active {
  color: var(--apple-blue);
}

.tab-icon {
  width: 24px;
  height: 24px;
}

.tab-label {
  font-size: 10px;
  font-weight: 500;
}
```

### Breadcrumb

```css
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.breadcrumb-item {
  color: var(--apple-blue);
  text-decoration: none;
}

.breadcrumb-item:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  color: var(--gray-2);
}

.breadcrumb-current {
  color: var(--text-tertiary);
}
```

## Modals & Overlays

### Modal

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-4);
}

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  background: var(--bg-elevated-primary);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--separator);
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
}

.modal-close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fill-tertiary);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--separator);
}
```

### Action Sheet

```css
.action-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  z-index: var(--z-modal);
}

.action-sheet-content {
  background: var(--bg-elevated-primary);
  border-radius: 14px;
  overflow: hidden;
}

.action-sheet-item {
  display: block;
  width: 100%;
  padding: 16px;
  font-size: 20px;
  text-align: center;
  color: var(--apple-blue);
  background: none;
  border: none;
  border-bottom: 1px solid var(--separator);
  cursor: pointer;
}

.action-sheet-item:last-child {
  border-bottom: none;
}

.action-sheet-item:active {
  background: var(--fill-tertiary);
}

.action-sheet-item-destructive {
  color: var(--apple-red);
}

.action-sheet-cancel {
  margin-top: 8px;
  font-weight: 600;
}
```

### Toast / Snackbar

```css
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--text-primary);
  color: var(--bg-primary);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  font-size: 15px;
  z-index: var(--z-toast);
}

.toast-icon {
  width: 20px;
  height: 20px;
}

.toast-success {
  background: var(--apple-green);
  color: white;
}

.toast-error {
  background: var(--apple-red);
  color: white;
}
```

## Progress & Loading

### Progress Bar

```css
.progress {
  width: 100%;
  height: 4px;
  background: var(--fill-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--apple-blue);
  border-radius: 2px;
  transition: width 0.3s ease;
}
```

### Spinner

```css
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--fill-tertiary);
  border-top-color: var(--apple-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### Skeleton

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--fill-tertiary) 25%,
    var(--fill-secondary) 50%,
    var(--fill-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text {
  height: 16px;
  margin-bottom: 8px;
}

.skeleton-title {
  height: 24px;
  width: 60%;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}
```

## Lists

### Basic List

```css
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--separator);
}

.list-item:last-child {
  border-bottom: none;
}

.list-item-icon {
  width: 24px;
  height: 24px;
  color: var(--apple-blue);
}

.list-item-content {
  flex: 1;
}

.list-item-title {
  font-size: 17px;
  font-weight: 400;
}

.list-item-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.list-item-chevron {
  color: var(--gray-3);
}
```

### Inset Grouped List (iOS Style)

```css
.list-grouped {
  background: var(--bg-grouped);
  padding: 16px;
}

.list-group {
  background: var(--bg-grouped-secondary);
  border-radius: 10px;
  margin-bottom: 32px;
}

.list-group-header {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 0 16px 8px;
}

.list-group .list-item {
  padding: 12px 16px;
}
```

## Badges & Tags

### Badge

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--fill-tertiary);
  color: var(--text-secondary);
}

.badge-primary {
  background: var(--apple-blue);
  color: white;
}

.badge-success {
  background: var(--apple-green);
  color: white;
}

.badge-warning {
  background: var(--apple-orange);
  color: white;
}

.badge-error {
  background: var(--apple-red);
  color: white;
}
```

### Tag

```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 14px;
  background: var(--gray-6);
  border-radius: 8px;
  color: var(--text-primary);
}

.tag-removable {
  padding-right: 8px;
}

.tag-remove {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fill-tertiary);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}
```

## Dividers

```css
.divider {
  height: 1px;
  background: var(--separator);
  margin: var(--space-4) 0;
}

.divider-inset {
  margin-left: var(--space-4);
}

.divider-with-text {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  color: var(--text-tertiary);
  font-size: 13px;
}

.divider-with-text::before,
.divider-with-text::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--separator);
}
```
