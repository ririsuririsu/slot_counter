# Color System

Appleのカラーシステムは、クリーンで一貫性があり、ライトモードとダークモードの両方で美しく機能するように設計されています。

## System Colors

### Primary Colors

```css
:root {
  /* Blues */
  --apple-blue: #007AFF;
  --apple-blue-dark: #0A84FF;

  /* Greens */
  --apple-green: #34C759;
  --apple-green-dark: #30D158;

  /* Indigo */
  --apple-indigo: #5856D6;
  --apple-indigo-dark: #5E5CE6;

  /* Orange */
  --apple-orange: #FF9500;
  --apple-orange-dark: #FF9F0A;

  /* Pink */
  --apple-pink: #FF2D55;
  --apple-pink-dark: #FF375F;

  /* Purple */
  --apple-purple: #AF52DE;
  --apple-purple-dark: #BF5AF2;

  /* Red */
  --apple-red: #FF3B30;
  --apple-red-dark: #FF453A;

  /* Teal */
  --apple-teal: #5AC8FA;
  --apple-teal-dark: #64D2FF;

  /* Yellow */
  --apple-yellow: #FFCC00;
  --apple-yellow-dark: #FFD60A;

  /* Cyan */
  --apple-cyan: #32ADE6;
  --apple-cyan-dark: #64D2FF;

  /* Mint */
  --apple-mint: #00C7BE;
  --apple-mint-dark: #63E6E2;
}
```

### Gray Scale

```css
:root {
  /* Light Mode Grays */
  --gray-1: #8E8E93;
  --gray-2: #AEAEB2;
  --gray-3: #C7C7CC;
  --gray-4: #D1D1D6;
  --gray-5: #E5E5EA;
  --gray-6: #F2F2F7;

  /* Dark Mode Grays */
  --gray-1-dark: #8E8E93;
  --gray-2-dark: #636366;
  --gray-3-dark: #48484A;
  --gray-4-dark: #3A3A3C;
  --gray-5-dark: #2C2C2E;
  --gray-6-dark: #1C1C1E;
}
```

## Semantic Colors

### Background Colors

```css
:root {
  /* Light Mode */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F2F2F7;
  --bg-tertiary: #FFFFFF;
  --bg-grouped: #F2F2F7;
  --bg-grouped-secondary: #FFFFFF;

  /* Elevated backgrounds (for modals, cards) */
  --bg-elevated-primary: #FFFFFF;
  --bg-elevated-secondary: #F2F2F7;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #000000;
    --bg-secondary: #1C1C1E;
    --bg-tertiary: #2C2C2E;
    --bg-grouped: #000000;
    --bg-grouped-secondary: #1C1C1E;

    --bg-elevated-primary: #1C1C1E;
    --bg-elevated-secondary: #2C2C2E;
  }
}
```

### Text Colors

```css
:root {
  /* Light Mode */
  --text-primary: #000000;
  --text-secondary: #3C3C43;
  --text-tertiary: #3C3C4399;  /* 60% opacity */
  --text-quaternary: #3C3C4366; /* 40% opacity */
  --text-placeholder: #3C3C434D; /* 30% opacity */

  /* Links */
  --text-link: var(--apple-blue);
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #FFFFFF;
    --text-secondary: #EBEBF5;
    --text-tertiary: #EBEBF599;
    --text-quaternary: #EBEBF566;
    --text-placeholder: #EBEBF54D;

    --text-link: var(--apple-blue-dark);
  }
}
```

### Separator Colors

```css
:root {
  /* Light Mode */
  --separator: rgba(60, 60, 67, 0.29);
  --separator-opaque: #C6C6C8;

  /* Dark Mode */
  --separator-dark: rgba(84, 84, 88, 0.65);
  --separator-opaque-dark: #38383A;
}
```

### Fill Colors

```css
:root {
  /* Light Mode */
  --fill-primary: rgba(120, 120, 128, 0.2);
  --fill-secondary: rgba(120, 120, 128, 0.16);
  --fill-tertiary: rgba(118, 118, 128, 0.12);
  --fill-quaternary: rgba(116, 116, 128, 0.08);
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --fill-primary: rgba(120, 120, 128, 0.36);
    --fill-secondary: rgba(120, 120, 128, 0.32);
    --fill-tertiary: rgba(118, 118, 128, 0.24);
    --fill-quaternary: rgba(116, 116, 128, 0.18);
  }
}
```

## Gradients

### Apple-Style Gradients

```css
/* Subtle background gradient */
.gradient-subtle {
  background: linear-gradient(180deg,
    var(--bg-primary) 0%,
    var(--bg-secondary) 100%);
}

/* Hero gradient overlay */
.gradient-hero {
  background: linear-gradient(180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.8) 100%);
}

/* Card shine effect */
.gradient-shine {
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0) 50%);
}

/* Colorful accent (use sparingly) */
.gradient-accent {
  background: linear-gradient(90deg,
    var(--apple-blue) 0%,
    var(--apple-purple) 100%);
}
```

## Shadows

### Elevation Shadows

```css
:root {
  /* Small - buttons, inputs */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);

  /* Medium - cards, dropdowns */
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);

  /* Large - modals, popovers */
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);

  /* Extra large - dialogs */
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.16);
}

/* Dark mode shadows */
@media (prefers-color-scheme: dark) {
  :root {
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.24);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.32);
    --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.48);
    --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.64);
  }
}
```

### Colored Shadows

```css
/* Blue glow for primary actions */
.shadow-blue {
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.32);
}

/* Success state */
.shadow-green {
  box-shadow: 0 4px 16px rgba(52, 199, 89, 0.32);
}
```

## Color Usage Guidelines

### Accent Color Strategy

```css
/* Use ONE accent color throughout the app */
:root {
  --accent: var(--apple-blue);
  --accent-hover: #0066CC;
  --accent-active: #004999;
  --accent-subtle: rgba(0, 122, 255, 0.1);
}
```

### Semantic Color Mapping

| 用途 | カラー | 例 |
|------|--------|-----|
| Primary action | Blue | CTA buttons, links |
| Success | Green | Completion, confirmation |
| Warning | Orange/Yellow | Alerts, caution |
| Error | Red | Errors, destructive |
| Info | Teal/Cyan | Information |

### Background Hierarchy

```
Level 0: --bg-primary (白/黒) - メインコンテンツ
Level 1: --bg-secondary (薄グレー) - セクション背景
Level 2: --bg-tertiary - ネストされた要素
Elevated: --bg-elevated-* - モーダル、カード
```

## Dark Mode Implementation

### CSS Variables Approach

```css
:root {
  --color-background: #FFFFFF;
  --color-text: #000000;
  --color-accent: #007AFF;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #000000;
    --color-text: #FFFFFF;
    --color-accent: #0A84FF;
  }
}
```

### Manual Toggle

```css
[data-theme="light"] {
  --color-background: #FFFFFF;
  --color-text: #000000;
}

[data-theme="dark"] {
  --color-background: #000000;
  --color-text: #FFFFFF;
}
```

### Image Adaptation

```css
/* Invert images in dark mode */
@media (prefers-color-scheme: dark) {
  .icon-invertible {
    filter: invert(1);
  }
}

/* Different images for each mode */
.logo {
  content: url('logo-light.svg');
}

@media (prefers-color-scheme: dark) {
  .logo {
    content: url('logo-dark.svg');
  }
}
```

## Accessibility

### Contrast Ratios

| テキスト | 背景 | コントラスト比 | WCAG |
|----------|------|----------------|------|
| #000000 | #FFFFFF | 21:1 | AAA |
| #3C3C43 | #FFFFFF | 9.7:1 | AAA |
| #007AFF | #FFFFFF | 4.5:1 | AA |
| #FFFFFF | #007AFF | 4.5:1 | AA |

### Color Blind Safe

```css
/* Use shapes/icons in addition to color */
.status-success {
  color: var(--apple-green);
}
.status-success::before {
  content: "✓"; /* Add icon for clarity */
}

.status-error {
  color: var(--apple-red);
}
.status-error::before {
  content: "✕";
}
```

## Best Practices

### DO

- 背景色のヒエラルキーを活用
- アクセントカラーは1色に統一
- ダークモードでは色を明るくする（例：Blue → Blue Dark）
- テキストの透明度で階層を表現
- シャドウは控えめに

### DON'T

- 原色を直接使わない
- グラデーションを多用しない
- 彩度の高い色を背景に使わない
- 色だけで情報を伝えない（アクセシビリティ）
- ダークモードで白を直接使わない

## Color Palette Generator

```css
/* Base color から派生色を生成 */
:root {
  --color-base: #007AFF;

  /* Tints (明るく) */
  --color-tint-1: color-mix(in srgb, var(--color-base), white 20%);
  --color-tint-2: color-mix(in srgb, var(--color-base), white 40%);
  --color-tint-3: color-mix(in srgb, var(--color-base), white 60%);

  /* Shades (暗く) */
  --color-shade-1: color-mix(in srgb, var(--color-base), black 20%);
  --color-shade-2: color-mix(in srgb, var(--color-base), black 40%);

  /* Subtle backgrounds */
  --color-subtle: color-mix(in srgb, var(--color-base), transparent 90%);
}
```
