---
name: apple-design
description: Create Apple-inspired minimalist UI/UX designs with clean typography, generous whitespace, and elegant aesthetics following Human Interface Guidelines. Use when designing websites, apps, interfaces for iOS, macOS, watchOS, visionOS, or any project requiring modern, sophisticated, Apple-style visual design with SF Pro fonts and system colors.
---

# Apple Design System

このスキルは、Appleの洗練されたデザイン哲学とHuman Interface Guidelines (HIG) に基づいて、美しくモダンなUI/UXを作成するためのデザインシステムを提供します。

## When to Use This Skill

- Apple風のミニマリストデザインを作成する時
- モダンでクリーンなUIを設計する時
- iOS、macOS、watchOS、visionOS風のインターフェースを作成する時
- 洗練されたウェブサイトやランディングページをデザインする時
- タイポグラフィとホワイトスペースを重視したデザインが必要な時
- Human Interface Guidelinesに準拠したデザインが必要な時
- Liquid Glass デザインシステムを適用する時

## Design System Overview

### Core Philosophy (HIG Principles)

1. **明瞭性 (Clarity)** - 読みやすく、認識しやすく、余計な装飾を排除。すべての要素が理解しやすく、ミニマリストデザインと直感的なナビゲーションに焦点を当てる
2. **敬意 (Deference)** - コンテンツが主役、UIは控えめに。気を散らす要素を最小限に抑え、ユーザーがタスクに集中できるようにする
3. **深度 (Depth)** - レイヤー、シャドウ、ビジュアルエフェクトで階層を表現し、多次元的な体験を作り出す

### 2025 Design Updates - Liquid Glass

Apple の最新デザインシステム「Liquid Glass」は、以下の特徴を持ちます：

- **洗練されたカラーパレット**: ライト、ダーク、高コントラストモードで調和するよう調整
- **太字で左揃えのタイポグラフィ**: アラートやオンボーディングなど重要な場面での可読性を向上
- **同心円性 (Concentricity)**: ハードウェアとソフトウェアの間に統一されたリズムを作成

### Design Tokens

```css
:root {
  /* System Colors */
  --apple-blue: #007AFF;
  --apple-green: #34C759;
  --apple-indigo: #5856D6;
  --apple-orange: #FF9500;
  --apple-pink: #FF2D55;
  --apple-purple: #AF52DE;
  --apple-red: #FF3B30;
  --apple-teal: #5AC8FA;
  --apple-yellow: #FFCC00;

  /* Typography */
  --font-system: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif;
  --font-rounded: 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'SF Mono', ui-monospace, monospace;

  /* Text Colors */
  --text-primary: #000000;
  --text-secondary: rgba(60, 60, 67, 0.6);
  --text-tertiary: rgba(60, 60, 67, 0.3);
  --text-quaternary: rgba(60, 60, 67, 0.18);

  /* Background Colors */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F2F2F7;
  --bg-tertiary: #FFFFFF;
  --bg-grouped: #F2F2F7;

  /* Spacing (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-2xl: 22px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.16);

  /* Blur */
  --blur-regular: 20px;
  --blur-prominent: 40px;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #FFFFFF;
    --text-secondary: rgba(235, 235, 245, 0.6);
    --text-tertiary: rgba(235, 235, 245, 0.3);
    --bg-primary: #000000;
    --bg-secondary: #1C1C1E;
    --bg-tertiary: #2C2C2E;
    --bg-grouped: #000000;
  }
}
```

## Quick Reference

### Typography

San Francisco (SF Pro) は Apple のカスタムデザインフォントで、あらゆるデバイスサイズで読みやすさを実現します。

| Style | Size | Weight | Line Height |
|-------|------|--------|-------------|
| Large Title | 34px | Bold | 41px |
| Title 1 | 28px | Bold | 34px |
| Title 2 | 22px | Bold | 28px |
| Title 3 | 20px | Semibold | 25px |
| Headline | 17px | Semibold | 22px |
| Body | 17px | Regular | 22px |
| Callout | 16px | Regular | 21px |
| Subheadline | 15px | Regular | 20px |
| Footnote | 13px | Regular | 18px |
| Caption 1 | 12px | Regular | 16px |
| Caption 2 | 11px | Regular | 13px |

**ベストプラクティス**:
- Light ウェイトは避け、Medium、Semibold、Bold を使用
- 最小フォントサイズは大多数が読める大きさを確保
- Dynamic Type をサポートしてアクセシビリティを向上

詳細は [typography.md](references/typography.md) を参照

### Colors

Appleは色の賢明な使用を推奨し、情報伝達の補助手段として使用することを勧めています。

**システムカラーの使用例**:
- **Blue**: プライマリアクション（保存、続行）
- **Red**: 破壊的アクション（削除）
- **Green**: 成功、完了
- **Orange**: 警告
- **Gray**: 中立的なサーフェス

**重要なガイドライン**:
- 同じ色を異なる意味で使用しない
- 限定されたカラーパレットで一貫性を保つ
- テキストと背景のコントラスト比は最低 4.5:1 (WCAG準拠)
- ライトモードとダークモードの両方をサポート
- セマンティックカラー（systemBlue、systemGray等）を使用

詳細は [colors.md](references/colors.md) を参照

### Spacing

- **セクション間**: 80-120px
- **コンポーネント内**: 16-32px
- **要素間**: 8-16px
- **タッチターゲット最小サイズ**: 44×44pt

詳細は [spacing.md](references/spacing.md) を参照

## Essential Components

### Button

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  font-family: var(--font-system);
  font-size: 17px;
  font-weight: 600;
  border-radius: var(--radius-lg);
  background: var(--apple-blue);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px; /* Touch target */
}

.button:hover {
  filter: brightness(1.1);
  transform: scale(1.02);
}

.button:active {
  transform: scale(0.98);
}

.button-secondary {
  background: rgba(0, 122, 255, 0.1);
  color: var(--apple-blue);
}

.button-destructive {
  background: var(--apple-red);
  color: white;
}
```

### Card

```css
.card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-md);
}

.card-grouped {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  margin: 0 var(--space-4);
}
```

### Navigation Bar

```css
.navbar {
  position: sticky;
  top: 0;
  height: 44px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(var(--blur-regular));
  -webkit-backdrop-filter: blur(var(--blur-regular));
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  z-index: 100;
}

@media (prefers-color-scheme: dark) {
  .navbar {
    background: rgba(29, 29, 31, 0.72);
    border-bottom-color: rgba(255, 255, 255, 0.15);
  }
}
```

### Toggle / Switch

```css
.toggle {
  position: relative;
  width: 51px;
  height: 31px;
  background: rgba(120, 120, 128, 0.16);
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.2s ease;
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
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.toggle.active {
  background: var(--apple-green);
}

.toggle.active::after {
  transform: translateX(20px);
}
```

詳細は [components.md](references/components.md) を参照

## Common Patterns

### Hero Section

```html
<section class="hero">
  <h1 class="hero-title">Product Name</h1>
  <p class="hero-subtitle">Tagline goes here.</p>
  <div class="hero-cta">
    <a href="#" class="button">Get Started</a>
    <a href="#" class="button-text">Learn more ›</a>
  </div>
</section>
```

```css
.hero {
  text-align: center;
  padding: 120px 24px;
}

.hero-title {
  font-size: clamp(48px, 10vw, 96px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin-bottom: 16px;
}

.hero-subtitle {
  font-size: clamp(21px, 3vw, 28px);
  color: var(--text-secondary);
  margin-bottom: 32px;
}
```

### Feature Grid

```html
<div class="feature-grid">
  <article class="feature-item">
    <div class="feature-icon"><!-- SF Symbol --></div>
    <h3 class="feature-title">Feature Title</h3>
    <p class="feature-description">Description text.</p>
  </article>
</div>
```

詳細は [patterns.md](references/patterns.md) を参照

## Motion Guidelines

- **Duration**: 0.1-0.4s
- **Easing**: ease-out for enter, ease-in for exit
- **Spring**: 自然な動きには spring アニメーションを使用
- **Transform/Opacity** を優先（GPU accelerated）

詳細は [motion.md](references/motion.md) を参照

## Accessibility Guidelines

アクセシビリティはAppleデザインの中核です：

### 色とコントラスト
- 色は情報伝達の二次的手段として使用
- 色の手がかりにはテキストラベルを併用（色覚異常への配慮）
- 最小コントラスト比 4.5:1 を確保

### タイポグラフィ
- SF Pro フォントを使用して認識性と可読性を向上
- Dynamic Type をサポート
- ユーザーが選択したテキストサイズを尊重

### タッチターゲット
- 最小タッチターゲットサイズ: 44×44pt
- 十分なタップ間隔を確保

### モーション
- `prefers-reduced-motion` を尊重
- 必須でないアニメーションは無効化可能に

## SF Symbols

SF Symbols は Apple のアイコンライブラリで、9,000以上のシンボルを提供します。

### SF Symbols 7 の新機能
- **Draw**: 描画アニメーション
- **Variable Draw**: 可変描画
- **Magic Replacement**: 拡張された自動置換

### 使用方法
```css
/* Web での疑似的な SF Symbols 使用 */
.icon {
  font-family: 'SF Pro';
  font-weight: 400;
}
```

Web では [SF Symbols Web](https://developer.apple.com/sf-symbols/) からSVGを取得するか、類似のアイコンセットを使用します。

## Best Practices

### DO

- 大胆なタイポグラフィでヒエラルキーを作る
- 余白を恐れずに使う（ホワイトスペースは呼吸）
- アクセントカラーは1色に統一
- ダークモード対応を必ず含める
- `prefers-reduced-motion` を尊重
- セマンティックカラーを使用（systemBlue、systemGray等）
- 44×44pt 以上のタッチターゲットを確保
- Dynamic Type をサポート

### DON'T

- 装飾的な要素を多用しない
- グラデーションを過度に使わない
- 色を使いすぎない（限定パレットを維持）
- アニメーションを派手にしない
- フォントサイズのバリエーションを増やしすぎない
- 同じ色を異なる意味で使わない
- Light ウェイトのフォントを使わない

## Platform-Specific Considerations

### iOS
- Safe Area Insets を考慮
- ホームインジケーターのスペースを確保
- タブバー、ナビゲーションバーの標準パターンを使用

### macOS
- ウィンドウコントロール（信号機ボタン）を考慮
- メニューバーとの統合
- キーボードショートカットのサポート

### watchOS
- Digital Crown のインタラクション
- コンパクトな画面での可読性
- グランスとコンプリケーション

### visionOS
- 空間コンピューティングの奥行き
- 視線追跡とジェスチャー
- ウィンドウとボリューム

## AI Assistant Instructions

When this skill is activated:

1. **要件確認**
   - 作成するUIの種類（ウェブ、iOS、macOS、watchOS、visionOS）
   - ターゲットデバイス
   - 主要コンテンツと機能
   - アクセシビリティ要件

2. **リファレンス参照**
   - 必要に応じて references/ 内の詳細ドキュメントを読み込む
   - [typography.md](references/typography.md) - フォント、サイズ、行間の詳細
   - [colors.md](references/colors.md) - カラーパレット、ダークモード
   - [spacing.md](references/spacing.md) - グリッド、マージン、パディング
   - [components.md](references/components.md) - ボタン、カード、フォーム等
   - [patterns.md](references/patterns.md) - Hero、Grid、Footer等のパターン
   - [motion.md](references/motion.md) - アニメーション、トランジション

3. **コード生成ルール**
   - CSS変数を使用して一貫性を保つ
   - レスポンシブデザインを含める
   - ダークモード対応を必ず含める
   - アニメーションは控えめに
   - アクセシビリティを考慮（ARIA属性、コントラスト比）
   - タッチターゲットサイズを確保

Always:
- Apple Human Interface Guidelines を参考にする
- ホワイトスペースを大切にする
- タイポグラフィのヒエラルキーを明確にする
- シンプルさを追求する
- アクセシビリティを最優先する
- セマンティックカラーを使用する

Never:
- 過度な装飾を加えない
- 派手なアニメーションを使わない
- 色を使いすぎない
- 要素を詰め込みすぎない
- アクセシビリティを無視しない
- Light フォントウェイトを使わない

## Additional Resources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Apple Design Resources](https://developer.apple.com/design/resources/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [Apple Developer Design](https://developer.apple.com/jp/design/)
- [Icon Composer](https://developer.apple.com/design/resources/#icon-composer)
