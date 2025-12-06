# Design Patterns

よく使われるApple風デザインパターンとレイアウトの実装例です。

## Hero Sections

### Centered Hero

```html
<section class="hero hero-centered">
  <div class="hero-content">
    <h1 class="hero-title">iPhone 15 Pro</h1>
    <p class="hero-subtitle">チタニウム。とてつもなくプロ。</p>
    <div class="hero-cta">
      <a href="#" class="button-text">さらに詳しく ›</a>
      <a href="#" class="button-text">購入 ›</a>
    </div>
  </div>
  <div class="hero-media">
    <img src="hero-image.jpg" alt="iPhone 15 Pro">
  </div>
</section>

<style>
.hero-centered {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-16) var(--space-6);
  background: var(--bg-primary);
}

.hero-title {
  font-size: clamp(48px, 10vw, 96px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-4);
}

.hero-subtitle {
  font-size: clamp(21px, 3vw, 28px);
  color: var(--text-secondary);
  margin-bottom: var(--space-8);
}

.hero-cta {
  display: flex;
  gap: var(--space-8);
  justify-content: center;
  margin-bottom: var(--space-12);
}

.hero-media img {
  max-width: 100%;
  height: auto;
}
</style>
```

### Split Hero

```html
<section class="hero hero-split">
  <div class="hero-content">
    <h1 class="hero-title">MacBook Air</h1>
    <p class="hero-subtitle">
      軽さの中に、怪物が住んでいる。
    </p>
    <p class="hero-description">
      M3チップを搭載した新しいMacBook Airは、
      最大18時間のバッテリー駆動を実現。
    </p>
    <div class="hero-cta">
      <a href="#" class="button button-primary">購入</a>
      <a href="#" class="button-text">さらに詳しく ›</a>
    </div>
  </div>
  <div class="hero-media">
    <img src="macbook.jpg" alt="MacBook Air">
  </div>
</section>

<style>
.hero-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-16);
  align-items: center;
  min-height: 100vh;
  padding: var(--space-16);
}

@media (max-width: 734px) {
  .hero-split {
    grid-template-columns: 1fr;
    text-align: center;
  }
}
</style>
```

### Video Hero

```html
<section class="hero hero-video">
  <video autoplay muted loop playsinline class="hero-video-bg">
    <source src="hero.mp4" type="video/mp4">
  </video>
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <h1 class="hero-title">Vision Pro</h1>
    <p class="hero-subtitle">空間コンピューティングの幕開け。</p>
  </div>
</section>

<style>
.hero-video {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.hero-video-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
}

.hero-video .hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}
</style>
```

## Product Grids

### Feature Grid

```html
<section class="features">
  <div class="container">
    <h2 class="section-title">驚くべき機能</h2>
    <div class="feature-grid">
      <article class="feature-item">
        <div class="feature-icon">
          <svg><!-- icon --></svg>
        </div>
        <h3 class="feature-title">高速パフォーマンス</h3>
        <p class="feature-description">
          M3チップがあらゆる作業を圧倒的なスピードで処理します。
        </p>
      </article>
      <!-- More features -->
    </div>
  </div>
</section>

<style>
.features {
  padding: var(--space-24) 0;
}

.section-title {
  font-size: 48px;
  font-weight: 600;
  text-align: center;
  margin-bottom: var(--space-16);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-8);
}

.feature-item {
  text-align: center;
  padding: var(--space-8);
}

.feature-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--space-4);
  color: var(--apple-blue);
}

.feature-title {
  font-size: 21px;
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.feature-description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
```

### Product Card Grid

```html
<section class="products">
  <div class="container">
    <h2 class="section-title">最新の製品</h2>
    <div class="product-grid">
      <article class="product-card">
        <div class="product-media">
          <img src="product.jpg" alt="MacBook Air">
        </div>
        <div class="product-content">
          <span class="product-label">新登場</span>
          <h3 class="product-name">MacBook Air</h3>
          <p class="product-tagline">軽さの中に、怪物が住んでいる。</p>
          <p class="product-price">¥164,800から</p>
          <div class="product-actions">
            <a href="#" class="button-text">さらに詳しく ›</a>
            <a href="#" class="button-text">購入 ›</a>
          </div>
        </div>
      </article>
      <!-- More cards -->
    </div>
  </div>
</section>

<style>
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-6);
}

.product-card {
  background: var(--bg-secondary);
  border-radius: 18px;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.product-card:hover {
  transform: scale(1.02);
}

.product-media {
  aspect-ratio: 4/3;
  padding: var(--space-8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-media img {
  max-width: 80%;
  max-height: 100%;
  object-fit: contain;
}

.product-content {
  text-align: center;
  padding: 0 var(--space-6) var(--space-8);
}

.product-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--apple-orange);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.product-name {
  font-size: 24px;
  font-weight: 600;
  margin: var(--space-2) 0;
}

.product-tagline {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.product-price {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-4);
}

.product-actions {
  display: flex;
  gap: var(--space-6);
  justify-content: center;
}
</style>
```

## Comparison Tables

### Spec Comparison

```html
<section class="comparison">
  <div class="container">
    <h2 class="section-title">モデルを比較する</h2>
    <div class="comparison-table">
      <div class="comparison-header">
        <div class="comparison-cell"></div>
        <div class="comparison-cell">
          <img src="iphone-15.jpg" alt="iPhone 15">
          <h3>iPhone 15</h3>
          <p class="price">¥124,800から</p>
        </div>
        <div class="comparison-cell">
          <img src="iphone-15-pro.jpg" alt="iPhone 15 Pro">
          <h3>iPhone 15 Pro</h3>
          <p class="price">¥159,800から</p>
        </div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell label">チップ</div>
        <div class="comparison-cell">A16 Bionic</div>
        <div class="comparison-cell">A17 Pro</div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell label">ディスプレイ</div>
        <div class="comparison-cell">6.1インチ</div>
        <div class="comparison-cell">6.1インチ ProMotion</div>
      </div>
      <!-- More rows -->
    </div>
  </div>
</section>

<style>
.comparison-table {
  overflow-x: auto;
}

.comparison-header,
.comparison-row {
  display: grid;
  grid-template-columns: 200px repeat(2, 1fr);
  gap: 1px;
  background: var(--separator);
}

.comparison-header {
  background: transparent;
}

.comparison-cell {
  padding: var(--space-4);
  background: var(--bg-primary);
  text-align: center;
}

.comparison-header .comparison-cell {
  padding: var(--space-6);
}

.comparison-header img {
  max-width: 120px;
  margin-bottom: var(--space-4);
}

.comparison-header h3 {
  font-size: 17px;
  font-weight: 600;
}

.comparison-header .price {
  font-size: 14px;
  color: var(--text-secondary);
}

.comparison-cell.label {
  text-align: left;
  font-weight: 500;
  color: var(--text-secondary);
}

@media (max-width: 734px) {
  .comparison-header,
  .comparison-row {
    grid-template-columns: 120px repeat(2, 1fr);
  }
}
</style>
```

## Pricing Cards

```html
<section class="pricing">
  <div class="container">
    <h2 class="section-title">プランを選ぶ</h2>
    <div class="pricing-grid">
      <article class="pricing-card">
        <h3 class="pricing-name">iCloud+ 50GB</h3>
        <p class="pricing-price">
          <span class="price-amount">¥130</span>
          <span class="price-period">/月</span>
        </p>
        <ul class="pricing-features">
          <li>50GBのストレージ</li>
          <li>iCloudプライベートリレー</li>
          <li>メールを非公開</li>
        </ul>
        <button class="button button-primary">今すぐ登録</button>
      </article>

      <article class="pricing-card pricing-featured">
        <span class="pricing-badge">人気</span>
        <h3 class="pricing-name">iCloud+ 200GB</h3>
        <p class="pricing-price">
          <span class="price-amount">¥400</span>
          <span class="price-period">/月</span>
        </p>
        <ul class="pricing-features">
          <li>200GBのストレージ</li>
          <li>iCloudプライベートリレー</li>
          <li>メールを非公開</li>
          <li>カスタムメールドメイン</li>
        </ul>
        <button class="button button-primary">今すぐ登録</button>
      </article>

      <article class="pricing-card">
        <h3 class="pricing-name">iCloud+ 2TB</h3>
        <p class="pricing-price">
          <span class="price-amount">¥1,300</span>
          <span class="price-period">/月</span>
        </p>
        <ul class="pricing-features">
          <li>2TBのストレージ</li>
          <li>すべての機能を含む</li>
          <li>最大5人と共有</li>
        </ul>
        <button class="button button-primary">今すぐ登録</button>
      </article>
    </div>
  </div>
</section>

<style>
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
  align-items: start;
}

.pricing-card {
  position: relative;
  background: var(--bg-secondary);
  border-radius: 18px;
  padding: var(--space-8);
  text-align: center;
}

.pricing-featured {
  background: var(--bg-primary);
  box-shadow: var(--shadow-lg);
  transform: scale(1.05);
}

.pricing-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  background: var(--apple-blue);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-full);
}

.pricing-name {
  font-size: 21px;
  font-weight: 600;
  margin-bottom: var(--space-4);
}

.price-amount {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.price-period {
  font-size: 17px;
  color: var(--text-secondary);
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: var(--space-6) 0;
  text-align: left;
}

.pricing-features li {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--separator);
  font-size: 15px;
}

.pricing-features li::before {
  content: "✓";
  color: var(--apple-green);
  margin-right: var(--space-2);
}
</style>
```

## Testimonials

```html
<section class="testimonials">
  <div class="container">
    <h2 class="section-title">お客様の声</h2>
    <div class="testimonial-grid">
      <article class="testimonial-card">
        <div class="testimonial-rating">★★★★★</div>
        <blockquote class="testimonial-quote">
          "このアプリは私の仕事のやり方を完全に変えました。
          シンプルで美しく、毎日使うのが楽しみです。"
        </blockquote>
        <div class="testimonial-author">
          <img src="avatar.jpg" alt="田中太郎" class="testimonial-avatar">
          <div>
            <p class="testimonial-name">田中太郎</p>
            <p class="testimonial-role">デザイナー</p>
          </div>
        </div>
      </article>
      <!-- More testimonials -->
    </div>
  </div>
</section>

<style>
.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-6);
}

.testimonial-card {
  background: var(--bg-secondary);
  border-radius: 18px;
  padding: var(--space-6);
}

.testimonial-rating {
  color: var(--apple-yellow);
  margin-bottom: var(--space-4);
}

.testimonial-quote {
  font-size: 17px;
  line-height: 1.5;
  margin: 0 0 var(--space-6);
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.testimonial-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.testimonial-name {
  font-size: 15px;
  font-weight: 600;
}

.testimonial-role {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
```

## Footer

```html
<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-section">
        <h4 class="footer-title">製品</h4>
        <ul class="footer-links">
          <li><a href="#">iPhone</a></li>
          <li><a href="#">iPad</a></li>
          <li><a href="#">Mac</a></li>
          <li><a href="#">Apple Watch</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h4 class="footer-title">サービス</h4>
        <ul class="footer-links">
          <li><a href="#">Apple Music</a></li>
          <li><a href="#">Apple TV+</a></li>
          <li><a href="#">iCloud</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h4 class="footer-title">サポート</h4>
        <ul class="footer-links">
          <li><a href="#">お問い合わせ</a></li>
          <li><a href="#">ヘルプ</a></li>
          <li><a href="#">修理</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="footer-copyright">
        Copyright © 2024 Apple Inc. All rights reserved.
      </p>
      <div class="footer-legal">
        <a href="#">プライバシーポリシー</a>
        <a href="#">利用規約</a>
        <a href="#">サイトマップ</a>
      </div>
    </div>
  </div>
</footer>

<style>
.footer {
  background: var(--bg-secondary);
  padding: var(--space-16) 0 var(--space-8);
  font-size: 12px;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-8);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--separator);
}

.footer-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: var(--space-2);
}

.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
}

.footer-links a:hover {
  text-decoration: underline;
}

.footer-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-4);
  padding-top: var(--space-6);
}

.footer-copyright {
  color: var(--text-tertiary);
}

.footer-legal {
  display: flex;
  gap: var(--space-6);
}

.footer-legal a {
  color: var(--text-secondary);
  text-decoration: none;
}

.footer-legal a:hover {
  text-decoration: underline;
}

@media (max-width: 734px) {
  .footer-bottom {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>
```

## Newsletter Signup

```html
<section class="newsletter">
  <div class="container">
    <div class="newsletter-content">
      <h2 class="newsletter-title">最新情報を受け取る</h2>
      <p class="newsletter-description">
        新製品やイベントの情報をお届けします。
      </p>
      <form class="newsletter-form">
        <input
          type="email"
          placeholder="メールアドレス"
          class="input"
          required
        >
        <button type="submit" class="button button-primary">
          登録する
        </button>
      </form>
      <p class="newsletter-privacy">
        <a href="#">プライバシーポリシー</a>をご確認ください。
      </p>
    </div>
  </div>
</section>

<style>
.newsletter {
  padding: var(--space-24) 0;
  background: var(--bg-secondary);
}

.newsletter-content {
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
}

.newsletter-title {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.newsletter-description {
  font-size: 17px;
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.newsletter-form {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.newsletter-form .input {
  flex: 1;
}

.newsletter-privacy {
  font-size: 12px;
  color: var(--text-tertiary);
}

.newsletter-privacy a {
  color: var(--apple-blue);
}

@media (max-width: 734px) {
  .newsletter-form {
    flex-direction: column;
  }
}
</style>
```

## Empty States

```html
<div class="empty-state">
  <div class="empty-icon">
    <svg><!-- icon --></svg>
  </div>
  <h3 class="empty-title">アイテムがありません</h3>
  <p class="empty-description">
    新しいアイテムを追加して始めましょう。
  </p>
  <button class="button button-primary">
    アイテムを追加
  </button>
</div>

<style>
.empty-state {
  text-align: center;
  padding: var(--space-16);
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-6);
  color: var(--gray-3);
}

.empty-title {
  font-size: 21px;
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.empty-description {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}
</style>
```
