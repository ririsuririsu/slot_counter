---
name: material-design
description: Create Material Design 3 (M3) interfaces with dynamic color, typography scales, and modern components. Use when designing Android apps, web interfaces with Material You, implementing M3 components, or creating Google-style UI with elevation and motion.
---

# Material Design 3 System

Material Design 3 (Material You) is Google's latest design system that enables personalized, adaptive, and accessible UI design. It emphasizes dynamic color, expressive typography, and updated components.

## When to Use This Skill

- Creating Android app interfaces with Material Design
- Building web applications with M3 components
- Implementing dynamic color theming
- Designing Google-style modern interfaces
- Working with Material Web Components or MUI
- Creating adaptive layouts for multiple screen sizes

## Core Philosophy

### Design Principles

1. **Personal** - Dynamic color adapts to user preferences
2. **Adaptive** - Responsive layouts for any screen size
3. **Expressive** - Bold typography and meaningful motion

### Key Concepts

- **Dynamic Color**: Colors derived from user's wallpaper or brand
- **Tonal Palettes**: 13 tones (0-100) for each color
- **Shape**: Rounded corners with consistent radii
- **Elevation**: Tonal color elevation instead of shadows

## Design Tokens

```css
:root {
  /* Primary Colors */
  --md-sys-color-primary: #6750A4;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-primary-container: #EADDFF;
  --md-sys-color-on-primary-container: #21005D;

  /* Secondary Colors */
  --md-sys-color-secondary: #625B71;
  --md-sys-color-on-secondary: #FFFFFF;
  --md-sys-color-secondary-container: #E8DEF8;
  --md-sys-color-on-secondary-container: #1D192B;

  /* Tertiary Colors */
  --md-sys-color-tertiary: #7D5260;
  --md-sys-color-on-tertiary: #FFFFFF;
  --md-sys-color-tertiary-container: #FFD8E4;
  --md-sys-color-on-tertiary-container: #31111D;

  /* Error Colors */
  --md-sys-color-error: #B3261E;
  --md-sys-color-on-error: #FFFFFF;
  --md-sys-color-error-container: #F9DEDC;
  --md-sys-color-on-error-container: #410E0B;

  /* Surface Colors */
  --md-sys-color-surface: #FEF7FF;
  --md-sys-color-on-surface: #1D1B20;
  --md-sys-color-surface-variant: #E7E0EC;
  --md-sys-color-on-surface-variant: #49454F;

  /* Outline */
  --md-sys-color-outline: #79747E;
  --md-sys-color-outline-variant: #CAC4D0;

  /* Typography */
  --md-sys-typescale-display-large: 57px;
  --md-sys-typescale-display-medium: 45px;
  --md-sys-typescale-display-small: 36px;
  --md-sys-typescale-headline-large: 32px;
  --md-sys-typescale-headline-medium: 28px;
  --md-sys-typescale-headline-small: 24px;
  --md-sys-typescale-title-large: 22px;
  --md-sys-typescale-title-medium: 16px;
  --md-sys-typescale-title-small: 14px;
  --md-sys-typescale-body-large: 16px;
  --md-sys-typescale-body-medium: 14px;
  --md-sys-typescale-body-small: 12px;
  --md-sys-typescale-label-large: 14px;
  --md-sys-typescale-label-medium: 12px;
  --md-sys-typescale-label-small: 11px;

  /* Shape */
  --md-sys-shape-corner-none: 0px;
  --md-sys-shape-corner-extra-small: 4px;
  --md-sys-shape-corner-small: 8px;
  --md-sys-shape-corner-medium: 12px;
  --md-sys-shape-corner-large: 16px;
  --md-sys-shape-corner-extra-large: 28px;
  --md-sys-shape-corner-full: 9999px;

  /* Elevation */
  --md-sys-elevation-level0: 0px;
  --md-sys-elevation-level1: 1px;
  --md-sys-elevation-level2: 3px;
  --md-sys-elevation-level3: 6px;
  --md-sys-elevation-level4: 8px;
  --md-sys-elevation-level5: 12px;

  /* State Layers */
  --md-sys-state-hover-opacity: 0.08;
  --md-sys-state-focus-opacity: 0.12;
  --md-sys-state-pressed-opacity: 0.12;
  --md-sys-state-dragged-opacity: 0.16;
}
```

## Quick Reference

### Typography Scale

| Style | Size | Line Height | Weight |
|-------|------|-------------|--------|
| Display Large | 57px | 64px | 400 |
| Display Medium | 45px | 52px | 400 |
| Display Small | 36px | 44px | 400 |
| Headline Large | 32px | 40px | 400 |
| Headline Medium | 28px | 36px | 400 |
| Headline Small | 24px | 32px | 400 |
| Title Large | 22px | 28px | 400 |
| Title Medium | 16px | 24px | 500 |
| Title Small | 14px | 20px | 500 |
| Body Large | 16px | 24px | 400 |
| Body Medium | 14px | 20px | 400 |
| Body Small | 12px | 16px | 400 |
| Label Large | 14px | 20px | 500 |
| Label Medium | 12px | 16px | 500 |
| Label Small | 11px | 16px | 500 |

Font Family: `Roboto, "Google Sans", sans-serif`

See [typography.md](references/typography.md) for details.

### Color Roles

- **Primary**: Main brand color for key components
- **Secondary**: Less prominent components
- **Tertiary**: Contrasting accents
- **Error**: Error states and destructive actions
- **Surface**: Background colors
- **On-X**: Content colors on top of X

See [colors.md](references/colors.md) for details.

### Spacing

Base unit: 4px

- Extra Small: 4px
- Small: 8px
- Medium: 16px
- Large: 24px
- Extra Large: 32px

See [spacing.md](references/spacing.md) for details.

## Essential Components

### Button

```css
/* Filled Button */
.md-filled-button {
  height: 40px;
  padding: 0 24px;
  border-radius: 20px;
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.1px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.md-filled-button:hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* Outlined Button */
.md-outlined-button {
  height: 40px;
  padding: 0 24px;
  border-radius: 20px;
  background: transparent;
  color: var(--md-sys-color-primary);
  border: 1px solid var(--md-sys-color-outline);
  font-size: 14px;
  font-weight: 500;
}

/* Text Button */
.md-text-button {
  height: 40px;
  padding: 0 12px;
  border-radius: 20px;
  background: transparent;
  color: var(--md-sys-color-primary);
  border: none;
  font-size: 14px;
  font-weight: 500;
}
```

### Card

```css
.md-card {
  background: var(--md-sys-color-surface);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 16px;
}

/* Elevated Card */
.md-card-elevated {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3),
              0 1px 3px 1px rgba(0, 0, 0, 0.15);
}

/* Filled Card */
.md-card-filled {
  background: var(--md-sys-color-surface-variant);
}

/* Outlined Card */
.md-card-outlined {
  border: 1px solid var(--md-sys-color-outline-variant);
}
```

### Text Field

```css
.md-text-field {
  position: relative;
  height: 56px;
  border-radius: 4px 4px 0 0;
  background: var(--md-sys-color-surface-variant);
}

.md-text-field input {
  width: 100%;
  height: 100%;
  padding: 20px 16px 6px;
  border: none;
  border-bottom: 1px solid var(--md-sys-color-on-surface-variant);
  background: transparent;
  font-size: 16px;
  color: var(--md-sys-color-on-surface);
}

.md-text-field input:focus {
  outline: none;
  border-bottom: 2px solid var(--md-sys-color-primary);
}

.md-text-field label {
  position: absolute;
  left: 16px;
  top: 16px;
  font-size: 16px;
  color: var(--md-sys-color-on-surface-variant);
  transition: all 0.2s ease;
  pointer-events: none;
}

.md-text-field input:focus + label,
.md-text-field input:not(:placeholder-shown) + label {
  top: 8px;
  font-size: 12px;
  color: var(--md-sys-color-primary);
}
```

### Switch

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

### FAB (Floating Action Button)

```css
.md-fab {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2),
              0 6px 10px 0 rgba(0, 0, 0, 0.14),
              0 1px 18px 0 rgba(0, 0, 0, 0.12);
  transition: all 0.2s ease;
}

.md-fab:hover {
  box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
              0 8px 10px 1px rgba(0, 0, 0, 0.14),
              0 3px 14px 2px rgba(0, 0, 0, 0.12);
}
```

See [components.md](references/components.md) for all components.

## Common Patterns

### Top App Bar

```html
<header class="md-top-app-bar">
  <button class="md-icon-button">
    <span class="material-icons">menu</span>
  </button>
  <span class="md-top-app-bar-title">Page Title</span>
  <button class="md-icon-button">
    <span class="material-icons">search</span>
  </button>
</header>
```

```css
.md-top-app-bar {
  height: 64px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--md-sys-color-surface);
}

.md-top-app-bar-title {
  flex: 1;
  font-size: 22px;
  font-weight: 400;
  margin-left: 16px;
}
```

### Navigation Rail

```html
<nav class="md-navigation-rail">
  <div class="md-nav-item active">
    <span class="material-icons">home</span>
    <span class="md-nav-label">Home</span>
  </div>
  <div class="md-nav-item">
    <span class="material-icons">search</span>
    <span class="md-nav-label">Search</span>
  </div>
</nav>
```

```css
.md-navigation-rail {
  width: 80px;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: var(--md-sys-color-surface);
}

.md-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 16px;
  cursor: pointer;
}

.md-nav-item.active {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.md-nav-label {
  font-size: 12px;
  font-weight: 500;
}
```

See [patterns.md](references/patterns.md) for more patterns.

## Motion Guidelines

### Duration

- **Short**: 100ms (simple state changes)
- **Medium**: 250ms (standard transitions)
- **Long**: 400ms (complex transitions)

### Easing

```css
/* Standard easing */
--md-sys-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);

/* Emphasized easing */
--md-sys-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);

/* Decelerate easing (entering) */
--md-sys-motion-easing-decelerate: cubic-bezier(0, 0, 0, 1);

/* Accelerate easing (exiting) */
--md-sys-motion-easing-accelerate: cubic-bezier(0.3, 0, 1, 1);
```

See [motion.md](references/motion.md) for details.

## Best Practices

### DO

- Use the full tonal palette for color harmony
- Apply state layers for interactive feedback
- Follow the type scale consistently
- Use appropriate elevation for hierarchy
- Test with dynamic color themes
- Ensure 4.5:1 contrast ratio minimum
- Support dark mode with proper tokens

### DON'T

- Mix M2 and M3 components
- Override semantic color roles
- Use arbitrary color values
- Ignore state feedback (hover, focus, press)
- Skip motion for state changes
- Use shadows instead of tonal elevation

## AI Assistant Instructions

When this skill is activated:

1. **Analyze Requirements**
   - Determine target platform (Web, Android, iOS)
   - Identify key components needed
   - Check for dark mode requirements

2. **Apply Design System**
   - Use M3 design tokens consistently
   - Follow color role semantics
   - Apply proper typography scale
   - Include state layers and elevation

3. **Generate Code**
   - Use CSS custom properties for tokens
   - Include dark mode support with `prefers-color-scheme`
   - Add appropriate transitions and animations
   - Follow component specifications exactly

4. **Reference Documentation**
   - Load [colors.md](references/colors.md) for color details
   - Load [typography.md](references/typography.md) for type specs
   - Load [components.md](references/components.md) for component details
   - Load [patterns.md](references/patterns.md) for layout patterns

Always:
- Use semantic color tokens, not raw values
- Include hover, focus, and pressed states
- Follow 8dp grid for spacing
- Support both light and dark themes
- Use Roboto or Google Sans fonts

Never:
- Mix Material Design 2 and 3 styles
- Use arbitrary colors outside the system
- Skip accessibility considerations
- Ignore elevation and state layers

## Additional Resources

- [Material Design 3 Official Site](https://m3.material.io/)
- [Material Theme Builder](https://www.figma.com/community/plugin/1034969338659738588)
- [Material Web Components](https://github.com/nicolo-ribaudo/nicolo-ribaudo)
- [Material Symbols & Icons](https://fonts.google.com/icons)
