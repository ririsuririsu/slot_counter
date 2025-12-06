# Spacing & Layout System

Appleのデザインでは、一貫したスペーシングシステムが視覚的な調和と使いやすさを生み出します。

## Spacing Scale

### Base Unit: 4px

```css
:root {
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-14: 56px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
  --space-40: 160px;
}
```

### Semantic Spacing

```css
:root {
  /* Component spacing */
  --spacing-component-xs: var(--space-2);   /* 8px */
  --spacing-component-sm: var(--space-3);   /* 12px */
  --spacing-component-md: var(--space-4);   /* 16px */
  --spacing-component-lg: var(--space-6);   /* 24px */
  --spacing-component-xl: var(--space-8);   /* 32px */

  /* Section spacing */
  --spacing-section-sm: var(--space-16);    /* 64px */
  --spacing-section-md: var(--space-20);    /* 80px */
  --spacing-section-lg: var(--space-24);    /* 96px */
  --spacing-section-xl: var(--space-32);    /* 128px */

  /* Page margins */
  --spacing-page-mobile: var(--space-4);    /* 16px */
  --spacing-page-tablet: var(--space-6);    /* 24px */
  --spacing-page-desktop: var(--space-8);   /* 32px */
}
```

## Layout Grid

### Container Widths

```css
:root {
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 980px;
  --container-xl: 1200px;
  --container-2xl: 1440px;
}

.container {
  width: 100%;
  max-width: var(--container-lg);
  margin: 0 auto;
  padding: 0 var(--spacing-page-mobile);
}

@media (min-width: 735px) {
  .container {
    padding: 0 var(--spacing-page-tablet);
  }
}

@media (min-width: 1069px) {
  .container {
    padding: 0 var(--spacing-page-desktop);
  }
}
```

### Grid System

```css
/* 12-column grid */
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}

/* Column spans */
.col-1 { grid-column: span 1; }
.col-2 { grid-column: span 2; }
.col-3 { grid-column: span 3; }
.col-4 { grid-column: span 4; }
.col-6 { grid-column: span 6; }
.col-8 { grid-column: span 8; }
.col-12 { grid-column: span 12; }

/* Responsive grid */
@media (max-width: 734px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
  }
}

@media (min-width: 735px) and (max-width: 1068px) {
  .grid {
    grid-template-columns: repeat(8, 1fr);
  }
}
```

### Auto-fit Grid

```css
/* Responsive card grid */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
}

/* Feature grid */
.grid-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-8);
}
```

## Breakpoints

### Apple Standard Breakpoints

```css
/* Mobile First */
/* Default: 0-734px (iPhone) */

/* Tablet */
@media (min-width: 735px) {
  /* iPad portrait and small tablets */
}

/* Desktop */
@media (min-width: 1069px) {
  /* Desktop and large tablets */
}

/* Large Desktop */
@media (min-width: 1441px) {
  /* Wide screens */
}
```

### Breakpoint Variables

```css
:root {
  --breakpoint-sm: 375px;   /* iPhone SE */
  --breakpoint-md: 735px;   /* iPad */
  --breakpoint-lg: 1069px;  /* Desktop */
  --breakpoint-xl: 1441px;  /* Wide */
}
```

## Component Spacing

### Button Padding

```css
/* Small button */
.button-sm {
  padding: var(--space-2) var(--space-4);  /* 8px 16px */
}

/* Medium button (default) */
.button-md {
  padding: var(--space-3) var(--space-6);  /* 12px 24px */
}

/* Large button */
.button-lg {
  padding: var(--space-4) var(--space-8);  /* 16px 32px */
}
```

### Card Padding

```css
/* Compact card */
.card-compact {
  padding: var(--space-4);  /* 16px */
}

/* Default card */
.card {
  padding: var(--space-6);  /* 24px */
}

/* Spacious card */
.card-spacious {
  padding: var(--space-8);  /* 32px */
}
```

### Input Padding

```css
.input {
  padding: var(--space-3) var(--space-4);  /* 12px 16px */
}

.input-lg {
  padding: var(--space-4) var(--space-5);  /* 16px 20px */
}
```

### List Item Spacing

```css
.list-item {
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--separator);
}

.list-item:last-child {
  border-bottom: none;
}
```

## Section Spacing

### Vertical Rhythm

```css
/* Standard section */
.section {
  padding: var(--spacing-section-md) 0;  /* 80px */
}

/* Large section */
.section-lg {
  padding: var(--spacing-section-lg) 0;  /* 96px */
}

/* Hero section */
.hero {
  padding: var(--spacing-section-xl) 0;  /* 128px */
}

/* Responsive adjustment */
@media (max-width: 734px) {
  .section {
    padding: var(--spacing-section-sm) 0;  /* 64px */
  }
}
```

### Content Grouping

```css
/* Related elements - close together */
.group-tight {
  gap: var(--space-2);  /* 8px */
}

/* Standard grouping */
.group {
  gap: var(--space-4);  /* 16px */
}

/* Separate groups - more space */
.group-loose {
  gap: var(--space-8);  /* 32px */
}
```

## Aspect Ratios

```css
:root {
  --ratio-square: 1 / 1;
  --ratio-landscape: 4 / 3;
  --ratio-portrait: 3 / 4;
  --ratio-wide: 16 / 9;
  --ratio-ultrawide: 21 / 9;
  --ratio-golden: 1.618 / 1;
}

.aspect-square {
  aspect-ratio: var(--ratio-square);
}

.aspect-video {
  aspect-ratio: var(--ratio-wide);
}

.aspect-golden {
  aspect-ratio: var(--ratio-golden);
}
```

## Border Radius

```css
:root {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-2xl: 22px;
  --radius-full: 9999px;
}

/* Component-specific */
--radius-button: var(--radius-lg);     /* 14px */
--radius-input: var(--radius-md);      /* 10px */
--radius-card: var(--radius-xl);       /* 18px */
--radius-modal: var(--radius-2xl);     /* 22px */
--radius-chip: var(--radius-full);     /* pill shape */
```

## Z-Index Scale

```css
:root {
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-toast: 600;
  --z-tooltip: 700;
  --z-max: 9999;
}
```

## Spacing Utility Classes

```css
/* Margin utilities */
.m-0 { margin: var(--space-0); }
.m-1 { margin: var(--space-1); }
.m-2 { margin: var(--space-2); }
.m-4 { margin: var(--space-4); }
.m-8 { margin: var(--space-8); }

.mt-4 { margin-top: var(--space-4); }
.mb-4 { margin-bottom: var(--space-4); }
.ml-4 { margin-left: var(--space-4); }
.mr-4 { margin-right: var(--space-4); }

.mx-auto { margin-left: auto; margin-right: auto; }

/* Padding utilities */
.p-0 { padding: var(--space-0); }
.p-4 { padding: var(--space-4); }
.p-6 { padding: var(--space-6); }
.p-8 { padding: var(--space-8); }

.px-4 { padding-left: var(--space-4); padding-right: var(--space-4); }
.py-4 { padding-top: var(--space-4); padding-bottom: var(--space-4); }

/* Gap utilities */
.gap-2 { gap: var(--space-2); }
.gap-4 { gap: var(--space-4); }
.gap-6 { gap: var(--space-6); }
.gap-8 { gap: var(--space-8); }
```

## Layout Patterns

### Centered Content

```css
.centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}
```

### Split Layout

```css
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-16);
  align-items: center;
}

@media (max-width: 734px) {
  .split {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }
}
```

### Stack Layout

```css
.stack {
  display: flex;
  flex-direction: column;
}

.stack-sm { gap: var(--space-2); }
.stack-md { gap: var(--space-4); }
.stack-lg { gap: var(--space-6); }
```

## Best Practices

### DO

- 4pxグリッドに従う
- セクション間に十分な余白を確保（80px+）
- 関連要素はグループ化して近くに配置
- コンテナの最大幅を設定（980-1200px）
- レスポンシブで余白を調整

### DON'T

- 任意の数値を使わない（4の倍数に）
- 要素を詰め込みすぎない
- 異なるスペーシングを混在させない
- 小さな画面でも余白を詰めすぎない
- 非対称なパディングを多用しない
