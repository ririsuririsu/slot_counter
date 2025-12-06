# Material Design 3 Common Patterns

## App Layout Patterns

### Standard App Layout

```html
<div class="md-app">
  <nav class="md-navigation-rail">
    <!-- Navigation items -->
  </nav>
  <main class="md-main-content">
    <header class="md-top-app-bar">
      <!-- App bar content -->
    </header>
    <div class="md-page-content">
      <!-- Page content -->
    </div>
  </main>
</div>
```

```css
.md-app {
  display: flex;
  height: 100vh;
}

.md-navigation-rail {
  width: 80px;
  flex-shrink: 0;
  background: var(--md-sys-color-surface);
}

.md-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.md-page-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
```

### Mobile App Layout

```html
<div class="md-app-mobile">
  <header class="md-top-app-bar">
    <!-- App bar -->
  </header>
  <main class="md-page-content">
    <!-- Content -->
  </main>
  <nav class="md-navigation-bar">
    <!-- Bottom navigation -->
  </nav>
</div>
```

```css
.md-app-mobile {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.md-page-content {
  flex: 1;
  overflow-y: auto;
}

.md-navigation-bar {
  flex-shrink: 0;
}
```

## Top App Bar Patterns

### Center-Aligned Top App Bar

```html
<header class="md-top-app-bar-center">
  <button class="md-icon-button">
    <span class="material-icons">menu</span>
  </button>
  <h1 class="md-top-app-bar-title">Title</h1>
  <button class="md-icon-button">
    <span class="material-icons">more_vert</span>
  </button>
</header>
```

```css
.md-top-app-bar-center {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 4px;
  background: var(--md-sys-color-surface);
}

.md-top-app-bar-center .md-top-app-bar-title {
  flex: 1;
  text-align: center;
  font-family: var(--md-sys-typescale-title-large-font);
  font-size: var(--md-sys-typescale-title-large-size);
}
```

### Large Top App Bar

```html
<header class="md-top-app-bar-large">
  <div class="md-top-app-bar-row">
    <button class="md-icon-button">
      <span class="material-icons">arrow_back</span>
    </button>
    <div class="md-top-app-bar-actions">
      <button class="md-icon-button">
        <span class="material-icons">attach_file</span>
      </button>
    </div>
  </div>
  <h1 class="md-top-app-bar-headline">Large Title</h1>
</header>
```

```css
.md-top-app-bar-large {
  display: flex;
  flex-direction: column;
  padding: 0 4px 28px;
  background: var(--md-sys-color-surface);
}

.md-top-app-bar-row {
  display: flex;
  align-items: center;
  height: 64px;
}

.md-top-app-bar-actions {
  margin-left: auto;
  display: flex;
}

.md-top-app-bar-headline {
  padding: 0 16px;
  font-family: var(--md-sys-typescale-headline-medium-font);
  font-size: var(--md-sys-typescale-headline-medium-size);
  color: var(--md-sys-color-on-surface);
}
```

## List Patterns

### Simple List

```html
<ul class="md-list">
  <li class="md-list-item">
    <span class="md-list-item-text">List item 1</span>
  </li>
  <li class="md-list-item">
    <span class="md-list-item-text">List item 2</span>
  </li>
</ul>
```

### List with Icons

```html
<ul class="md-list">
  <li class="md-list-item">
    <span class="material-icons md-list-item-icon">inbox</span>
    <span class="md-list-item-text">Inbox</span>
  </li>
</ul>
```

```css
.md-list {
  padding: 8px 0;
  list-style: none;
  margin: 0;
}

.md-list-item {
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 8px 16px;
  cursor: pointer;
}

.md-list-item:hover {
  background: rgba(var(--md-sys-color-on-surface-rgb), 0.08);
}

.md-list-item-icon {
  margin-right: 16px;
  color: var(--md-sys-color-on-surface-variant);
}

.md-list-item-text {
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
  color: var(--md-sys-color-on-surface);
}
```

## Card Patterns

### Basic Card

```html
<article class="md-card-elevated">
  <img src="image.jpg" alt="" class="md-card-media">
  <h2 class="md-card-headline">Card Title</h2>
  <p class="md-card-supporting-text">Description text.</p>
  <div class="md-card-actions">
    <button class="md-text-button">Action</button>
  </div>
</article>
```

```css
.md-card-elevated {
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3),
              0 1px 3px 1px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.md-card-media {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.md-card-headline {
  padding: 16px 16px 8px;
  font-family: var(--md-sys-typescale-title-large-font);
  font-size: var(--md-sys-typescale-title-large-size);
}

.md-card-supporting-text {
  padding: 0 16px 16px;
  font-family: var(--md-sys-typescale-body-medium-font);
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.md-card-actions {
  padding: 8px;
  display: flex;
  gap: 8px;
}
```

## Form Patterns

### Login Form

```html
<form class="md-form">
  <h1 class="md-form-title">Sign In</h1>
  <div class="md-text-field-outlined">
    <input type="email" id="email" placeholder=" " required>
    <label for="email">Email</label>
  </div>
  <div class="md-text-field-outlined">
    <input type="password" id="password" placeholder=" " required>
    <label for="password">Password</label>
  </div>
  <div class="md-form-actions">
    <button type="submit" class="md-filled-button">Sign In</button>
  </div>
</form>
```

```css
.md-form {
  max-width: 400px;
  padding: 24px;
}

.md-form-title {
  font-family: var(--md-sys-typescale-headline-medium-font);
  font-size: var(--md-sys-typescale-headline-medium-size);
  margin-bottom: 24px;
}

.md-form .md-text-field-outlined {
  margin-bottom: 16px;
}

.md-form-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
}
```

### Search Bar

```html
<div class="md-search-bar">
  <span class="material-icons">search</span>
  <input type="search" placeholder="Search">
</div>
```

```css
.md-search-bar {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background: var(--md-sys-color-surface-variant);
  border-radius: 28px;
  gap: 16px;
}

.md-search-bar input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
}

.md-search-bar input:focus {
  outline: none;
}
```

## Empty State Pattern

```html
<div class="md-empty-state">
  <span class="material-icons md-empty-state-icon">inbox</span>
  <h2 class="md-empty-state-headline">No messages</h2>
  <p class="md-empty-state-supporting">Your inbox is empty.</p>
  <button class="md-filled-button">Compose</button>
</div>
```

```css
.md-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.md-empty-state-icon {
  font-size: 48px;
  color: var(--md-sys-color-on-surface-variant);
  margin-bottom: 16px;
}

.md-empty-state-headline {
  font-family: var(--md-sys-typescale-headline-small-font);
  font-size: var(--md-sys-typescale-headline-small-size);
  margin-bottom: 8px;
}

.md-empty-state-supporting {
  font-family: var(--md-sys-typescale-body-medium-font);
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface-variant);
  margin-bottom: 24px;
}
```

## Settings Pattern

```html
<div class="md-settings">
  <div class="md-settings-group">
    <h2 class="md-settings-group-title">General</h2>
    <div class="md-settings-item">
      <div class="md-settings-item-text">
        <span class="md-settings-item-headline">Notifications</span>
        <span class="md-settings-item-supporting">Enable push</span>
      </div>
      <div class="md-switch"></div>
    </div>
  </div>
</div>
```

```css
.md-settings-group-title {
  padding: 16px;
  font-family: var(--md-sys-typescale-title-small-font);
  font-size: var(--md-sys-typescale-title-small-size);
  color: var(--md-sys-color-primary);
}

.md-settings-item {
  display: flex;
  align-items: center;
  padding: 16px;
  min-height: 72px;
}

.md-settings-item-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.md-settings-item-headline {
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
}

.md-settings-item-supporting {
  font-family: var(--md-sys-typescale-body-medium-font);
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}
```
