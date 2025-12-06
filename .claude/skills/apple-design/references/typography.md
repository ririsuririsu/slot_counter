# Typography System

Appleデザインにおけるタイポグラフィは最も重要な要素です。正しいフォント選択、サイズ、ウェイト、行間がデザインの品質を決定します。

## Font Families

### システムフォント

```css
/* Primary System Font Stack */
--font-system: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
               'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;

/* Japanese Support */
--font-system-jp: -apple-system, BlinkMacSystemFont, 'SF Pro JP',
                  'Hiragino Sans', 'Hiragino Kaku Gothic ProN',
                  'Noto Sans JP', sans-serif;

/* Monospace */
--font-mono: 'SF Mono', ui-monospace, 'Cascadia Code',
             'Source Code Pro', Menlo, Consolas, monospace;
```

### フォントの使い分け

| フォント | 用途 |
|----------|------|
| SF Pro Display | 20pt以上の見出し |
| SF Pro Text | 19pt以下の本文 |
| SF Pro Rounded | フレンドリーなUI |
| SF Mono | コード、数値 |
| New York | セリフが必要な場合 |

## Type Scale

### Display Sizes (Hero/見出し用)

```css
--text-display-1: 96px;  /* Hero title */
--text-display-2: 80px;  /* Large hero */
--text-display-3: 64px;  /* Section hero */
--text-display-4: 48px;  /* Page title */
```

### Heading Sizes

```css
--text-h1: 40px;
--text-h2: 32px;
--text-h3: 28px;
--text-h4: 24px;
--text-h5: 21px;
--text-h6: 17px;
```

### Body Sizes

```css
--text-body-large: 21px;
--text-body: 17px;
--text-body-small: 15px;
--text-caption: 13px;
--text-footnote: 12px;
--text-micro: 11px;
```

## Font Weights

```css
--font-ultralight: 100;
--font-thin: 200;
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-heavy: 800;
--font-black: 900;
```

### ウェイトの使い分け

| ウェイト | 用途 |
|----------|------|
| Bold (700) | Hero見出し、強調タイトル |
| Semibold (600) | セクション見出し、ボタン |
| Medium (500) | サブ見出し、ナビゲーション |
| Regular (400) | 本文、説明文 |
| Light (300) | 大きなサイズの見出し（稀に使用） |

## Line Height

```css
/* Display/Hero */
--leading-display: 1.05;

/* Headings */
--leading-tight: 1.1;
--leading-snug: 1.2;
--leading-heading: 1.25;

/* Body */
--leading-normal: 1.5;
--leading-relaxed: 1.65;
--leading-loose: 1.75;
```

### サイズ別推奨行間

| サイズ | 行間 | 用途 |
|--------|------|------|
| 96px+ | 1.05 | Hero |
| 48-80px | 1.1 | Display |
| 24-40px | 1.2 | Headings |
| 17-21px | 1.5-1.65 | Body |
| 12-15px | 1.4 | Caption |

## Letter Spacing

```css
/* Tracking values */
--tracking-tighter: -0.05em;
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
```

### サイズ別推奨トラッキング

| サイズ | トラッキング |
|--------|--------------|
| 48px+ | -0.02em to -0.03em |
| 24-40px | -0.01em to -0.02em |
| 17-21px | 0 |
| 12-15px | 0 to 0.01em |
| ALL CAPS | 0.05em to 0.1em |

## Typography Classes

```css
/* Display styles */
.text-display-1 {
  font-size: var(--text-display-1);
  font-weight: var(--font-bold);
  line-height: var(--leading-display);
  letter-spacing: -0.03em;
}

.text-display-2 {
  font-size: var(--text-display-2);
  font-weight: var(--font-bold);
  line-height: var(--leading-display);
  letter-spacing: -0.025em;
}

/* Heading styles */
.text-h1 {
  font-size: var(--text-h1);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
  letter-spacing: -0.02em;
}

.text-h2 {
  font-size: var(--text-h2);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
  letter-spacing: -0.015em;
}

.text-h3 {
  font-size: var(--text-h3);
  font-weight: var(--font-semibold);
  line-height: var(--leading-heading);
  letter-spacing: -0.01em;
}

/* Body styles */
.text-body {
  font-size: var(--text-body);
  font-weight: var(--font-regular);
  line-height: var(--leading-normal);
}

.text-body-large {
  font-size: var(--text-body-large);
  font-weight: var(--font-regular);
  line-height: var(--leading-relaxed);
}

.text-caption {
  font-size: var(--text-caption);
  font-weight: var(--font-regular);
  line-height: var(--leading-normal);
  color: var(--text-secondary);
}
```

## Responsive Typography

```css
/* Fluid typography with clamp() */
.hero-title {
  font-size: clamp(48px, 8vw + 1rem, 96px);
  font-weight: var(--font-bold);
  line-height: var(--leading-display);
  letter-spacing: -0.03em;
}

.section-title {
  font-size: clamp(32px, 5vw + 0.5rem, 64px);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  letter-spacing: -0.02em;
}

/* Breakpoint-based approach */
@media (max-width: 734px) {
  :root {
    --text-display-1: 48px;
    --text-display-2: 40px;
    --text-h1: 32px;
    --text-body-large: 19px;
  }
}

@media (min-width: 735px) and (max-width: 1068px) {
  :root {
    --text-display-1: 72px;
    --text-display-2: 56px;
    --text-h1: 36px;
  }
}
```

## Text Colors

```css
/* Light mode */
--text-primary: #000000;
--text-secondary: rgba(60, 60, 67, 0.85);
--text-tertiary: rgba(60, 60, 67, 0.6);
--text-quaternary: rgba(60, 60, 67, 0.4);
--text-placeholder: rgba(60, 60, 67, 0.3);

/* Dark mode */
--text-primary-dark: #FFFFFF;
--text-secondary-dark: rgba(235, 235, 245, 0.6);
--text-tertiary-dark: rgba(235, 235, 245, 0.4);
--text-quaternary-dark: rgba(235, 235, 245, 0.3);
```

## Best Practices

### DO

- フォントサイズのコントラストを大胆に（例：96px見出し + 17px本文）
- 行間は大きいサイズほど詰める
- 見出しのletter-spacingはマイナス値に
- テキストカラーの階層を活用（primary/secondary/tertiary）
- システムフォントを使用してパフォーマンスを向上

### DON'T

- フォントサイズを5種類以上使わない
- 本文に細すぎるウェイトを使わない
- 大文字のみのテキストを多用しない
- 行間を詰めすぎない（読みやすさ低下）
- Webフォントを過度に読み込まない

## Examples

### Hero Section Typography

```html
<div class="hero-text">
  <h1 class="hero-title">iPhone 15 Pro</h1>
  <p class="hero-subtitle">チタニウム。とてつもなくプロ。</p>
</div>

<style>
.hero-title {
  font-size: clamp(48px, 10vw, 96px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 16px;
}

.hero-subtitle {
  font-size: clamp(21px, 3vw, 28px);
  font-weight: 400;
  line-height: 1.2;
  color: var(--text-secondary);
}
</style>
```

### Article Typography

```html
<article class="article">
  <h1 class="article-title">新しいMacBook Airの魅力</h1>
  <p class="article-lead">
    M3チップを搭載した新しいMacBook Airは、
    パワーとポータビリティの完璧なバランスを実現しました。
  </p>
  <p class="article-body">
    本文テキストがここに入ります...
  </p>
</article>

<style>
.article-title {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 24px;
}

.article-lead {
  font-size: 21px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.article-body {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.65;
}
</style>
```
