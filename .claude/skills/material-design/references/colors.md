# Material Design 3 Color System

## Overview

Material Design 3 uses a dynamic color system based on tonal palettes. Colors are organized into color schemes with specific roles.

## Tonal Palettes

Each color has 13 tones from 0 (darkest) to 100 (lightest):

```
Tone 0   - Pure black
Tone 10  - Darkest usable
Tone 20  - Dark
Tone 30  - Dark medium
Tone 40  - Medium dark
Tone 50  - Medium
Tone 60  - Medium light
Tone 70  - Light medium
Tone 80  - Light
Tone 90  - Lighter
Tone 95  - Very light
Tone 99  - Near white
Tone 100 - Pure white
```

## Color Roles

### Primary

Main brand color used for prominent buttons and active states.

```css
/* Light Theme */
--md-sys-color-primary: #6750A4;           /* Tone 40 */
--md-sys-color-on-primary: #FFFFFF;        /* Tone 100 */
--md-sys-color-primary-container: #EADDFF; /* Tone 90 */
--md-sys-color-on-primary-container: #21005D; /* Tone 10 */

/* Dark Theme */
--md-sys-color-primary: #D0BCFF;           /* Tone 80 */
--md-sys-color-on-primary: #381E72;        /* Tone 20 */
--md-sys-color-primary-container: #4F378B; /* Tone 30 */
--md-sys-color-on-primary-container: #EADDFF; /* Tone 90 */
```

### Secondary

Used for less prominent components like filter chips.

```css
/* Light Theme */
--md-sys-color-secondary: #625B71;
--md-sys-color-on-secondary: #FFFFFF;
--md-sys-color-secondary-container: #E8DEF8;
--md-sys-color-on-secondary-container: #1D192B;

/* Dark Theme */
--md-sys-color-secondary: #CCC2DC;
--md-sys-color-on-secondary: #332D41;
--md-sys-color-secondary-container: #4A4458;
--md-sys-color-on-secondary-container: #E8DEF8;
```

### Tertiary

Accent color for contrast and visual interest.

```css
/* Light Theme */
--md-sys-color-tertiary: #7D5260;
--md-sys-color-on-tertiary: #FFFFFF;
--md-sys-color-tertiary-container: #FFD8E4;
--md-sys-color-on-tertiary-container: #31111D;

/* Dark Theme */
--md-sys-color-tertiary: #EFB8C8;
--md-sys-color-on-tertiary: #492532;
--md-sys-color-tertiary-container: #633B48;
--md-sys-color-on-tertiary-container: #FFD8E4;
```

### Error

Indicates errors and destructive actions.

```css
/* Light Theme */
--md-sys-color-error: #B3261E;
--md-sys-color-on-error: #FFFFFF;
--md-sys-color-error-container: #F9DEDC;
--md-sys-color-on-error-container: #410E0B;

/* Dark Theme */
--md-sys-color-error: #F2B8B5;
--md-sys-color-on-error: #601410;
--md-sys-color-error-container: #8C1D18;
--md-sys-color-on-error-container: #F9DEDC;
```

### Surface

Background colors for components and containers.

```css
/* Light Theme */
--md-sys-color-surface: #FEF7FF;
--md-sys-color-on-surface: #1D1B20;
--md-sys-color-surface-variant: #E7E0EC;
--md-sys-color-on-surface-variant: #49454F;

/* Surface Containers (Light) */
--md-sys-color-surface-container-lowest: #FFFFFF;
--md-sys-color-surface-container-low: #F7F2FA;
--md-sys-color-surface-container: #F3EDF7;
--md-sys-color-surface-container-high: #ECE6F0;
--md-sys-color-surface-container-highest: #E6E0E9;

/* Dark Theme */
--md-sys-color-surface: #141218;
--md-sys-color-on-surface: #E6E0E9;
--md-sys-color-surface-variant: #49454F;
--md-sys-color-on-surface-variant: #CAC4D0;

/* Surface Containers (Dark) */
--md-sys-color-surface-container-lowest: #0F0D13;
--md-sys-color-surface-container-low: #1D1B20;
--md-sys-color-surface-container: #211F26;
--md-sys-color-surface-container-high: #2B2930;
--md-sys-color-surface-container-highest: #36343B;
```

### Outline

Used for borders and dividers.

```css
/* Light Theme */
--md-sys-color-outline: #79747E;
--md-sys-color-outline-variant: #CAC4D0;

/* Dark Theme */
--md-sys-color-outline: #938F99;
--md-sys-color-outline-variant: #49454F;
```

### Inverse

For elements that need reverse contrast.

```css
/* Light Theme */
--md-sys-color-inverse-surface: #322F35;
--md-sys-color-inverse-on-surface: #F5EFF7;
--md-sys-color-inverse-primary: #D0BCFF;

/* Dark Theme */
--md-sys-color-inverse-surface: #E6E0E9;
--md-sys-color-inverse-on-surface: #322F35;
--md-sys-color-inverse-primary: #6750A4;
```

## State Layers

Interactive states use semi-transparent overlays:

```css
/* State Layer Opacities */
--md-sys-state-hover-state-layer-opacity: 0.08;
--md-sys-state-focus-state-layer-opacity: 0.12;
--md-sys-state-pressed-state-layer-opacity: 0.12;
--md-sys-state-dragged-state-layer-opacity: 0.16;
```

Example usage:

```css
.button:hover {
  background-color: color-mix(
    in srgb,
    var(--md-sys-color-primary) 8%,
    var(--md-sys-color-on-primary)
  );
}
```

## Complete Theme Template

```css
:root {
  /* Light Theme */
  color-scheme: light;

  /* Primary */
  --md-sys-color-primary: #6750A4;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-primary-container: #EADDFF;
  --md-sys-color-on-primary-container: #21005D;

  /* Secondary */
  --md-sys-color-secondary: #625B71;
  --md-sys-color-on-secondary: #FFFFFF;
  --md-sys-color-secondary-container: #E8DEF8;
  --md-sys-color-on-secondary-container: #1D192B;

  /* Tertiary */
  --md-sys-color-tertiary: #7D5260;
  --md-sys-color-on-tertiary: #FFFFFF;
  --md-sys-color-tertiary-container: #FFD8E4;
  --md-sys-color-on-tertiary-container: #31111D;

  /* Error */
  --md-sys-color-error: #B3261E;
  --md-sys-color-on-error: #FFFFFF;
  --md-sys-color-error-container: #F9DEDC;
  --md-sys-color-on-error-container: #410E0B;

  /* Background */
  --md-sys-color-background: #FEF7FF;
  --md-sys-color-on-background: #1D1B20;

  /* Surface */
  --md-sys-color-surface: #FEF7FF;
  --md-sys-color-on-surface: #1D1B20;
  --md-sys-color-surface-variant: #E7E0EC;
  --md-sys-color-on-surface-variant: #49454F;

  /* Outline */
  --md-sys-color-outline: #79747E;
  --md-sys-color-outline-variant: #CAC4D0;

  /* Shadow */
  --md-sys-color-shadow: #000000;
  --md-sys-color-scrim: #000000;
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;

    /* Primary */
    --md-sys-color-primary: #D0BCFF;
    --md-sys-color-on-primary: #381E72;
    --md-sys-color-primary-container: #4F378B;
    --md-sys-color-on-primary-container: #EADDFF;

    /* Secondary */
    --md-sys-color-secondary: #CCC2DC;
    --md-sys-color-on-secondary: #332D41;
    --md-sys-color-secondary-container: #4A4458;
    --md-sys-color-on-secondary-container: #E8DEF8;

    /* Tertiary */
    --md-sys-color-tertiary: #EFB8C8;
    --md-sys-color-on-tertiary: #492532;
    --md-sys-color-tertiary-container: #633B48;
    --md-sys-color-on-tertiary-container: #FFD8E4;

    /* Error */
    --md-sys-color-error: #F2B8B5;
    --md-sys-color-on-error: #601410;
    --md-sys-color-error-container: #8C1D18;
    --md-sys-color-on-error-container: #F9DEDC;

    /* Background */
    --md-sys-color-background: #141218;
    --md-sys-color-on-background: #E6E0E9;

    /* Surface */
    --md-sys-color-surface: #141218;
    --md-sys-color-on-surface: #E6E0E9;
    --md-sys-color-surface-variant: #49454F;
    --md-sys-color-on-surface-variant: #CAC4D0;

    /* Outline */
    --md-sys-color-outline: #938F99;
    --md-sys-color-outline-variant: #49454F;
  }
}
```

## Custom Theme Example

Generate custom themes from a source color:

```css
/* Custom Blue Theme */
:root {
  --md-sys-color-primary: #0061A4;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-primary-container: #D1E4FF;
  --md-sys-color-on-primary-container: #001D36;

  --md-sys-color-secondary: #535F70;
  --md-sys-color-on-secondary: #FFFFFF;
  --md-sys-color-secondary-container: #D7E3F7;
  --md-sys-color-on-secondary-container: #101C2B;

  --md-sys-color-tertiary: #6B5778;
  --md-sys-color-on-tertiary: #FFFFFF;
  --md-sys-color-tertiary-container: #F2DAFF;
  --md-sys-color-on-tertiary-container: #251431;
}
```
