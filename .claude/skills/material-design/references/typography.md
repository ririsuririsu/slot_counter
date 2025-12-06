# Material Design 3 Typography

## Font Families

### Primary Font: Roboto

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

--md-ref-typeface-plain: 'Roboto', sans-serif;
--md-ref-typeface-brand: 'Roboto', sans-serif;
```

### Alternative: Google Sans

For Google products and branded experiences:

```css
--md-ref-typeface-brand: 'Google Sans', 'Roboto', sans-serif;
```

## Type Scale

Material Design 3 defines 15 type styles organized into 5 categories.

### Display

Large, expressive styles for short, important text.

```css
/* Display Large */
.md-typescale-display-large {
  font-family: var(--md-ref-typeface-brand);
  font-size: 57px;
  line-height: 64px;
  font-weight: 400;
  letter-spacing: -0.25px;
}

/* Display Medium */
.md-typescale-display-medium {
  font-family: var(--md-ref-typeface-brand);
  font-size: 45px;
  line-height: 52px;
  font-weight: 400;
  letter-spacing: 0px;
}

/* Display Small */
.md-typescale-display-small {
  font-family: var(--md-ref-typeface-brand);
  font-size: 36px;
  line-height: 44px;
  font-weight: 400;
  letter-spacing: 0px;
}
```

### Headline

For marking sections and primary content.

```css
/* Headline Large */
.md-typescale-headline-large {
  font-family: var(--md-ref-typeface-brand);
  font-size: 32px;
  line-height: 40px;
  font-weight: 400;
  letter-spacing: 0px;
}

/* Headline Medium */
.md-typescale-headline-medium {
  font-family: var(--md-ref-typeface-brand);
  font-size: 28px;
  line-height: 36px;
  font-weight: 400;
  letter-spacing: 0px;
}

/* Headline Small */
.md-typescale-headline-small {
  font-family: var(--md-ref-typeface-brand);
  font-size: 24px;
  line-height: 32px;
  font-weight: 400;
  letter-spacing: 0px;
}
```

### Title

For medium emphasis text, shorter than headlines.

```css
/* Title Large */
.md-typescale-title-large {
  font-family: var(--md-ref-typeface-brand);
  font-size: 22px;
  line-height: 28px;
  font-weight: 400;
  letter-spacing: 0px;
}

/* Title Medium */
.md-typescale-title-medium {
  font-family: var(--md-ref-typeface-plain);
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  letter-spacing: 0.15px;
}

/* Title Small */
.md-typescale-title-small {
  font-family: var(--md-ref-typeface-plain);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: 0.1px;
}
```

### Body

For longer passages of text.

```css
/* Body Large */
.md-typescale-body-large {
  font-family: var(--md-ref-typeface-plain);
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  letter-spacing: 0.5px;
}

/* Body Medium */
.md-typescale-body-medium {
  font-family: var(--md-ref-typeface-plain);
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
  letter-spacing: 0.25px;
}

/* Body Small */
.md-typescale-body-small {
  font-family: var(--md-ref-typeface-plain);
  font-size: 12px;
  line-height: 16px;
  font-weight: 400;
  letter-spacing: 0.4px;
}
```

### Label

For buttons, tabs, and other UI elements.

```css
/* Label Large */
.md-typescale-label-large {
  font-family: var(--md-ref-typeface-plain);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: 0.1px;
}

/* Label Medium */
.md-typescale-label-medium {
  font-family: var(--md-ref-typeface-plain);
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* Label Small */
.md-typescale-label-small {
  font-family: var(--md-ref-typeface-plain);
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
```

## Complete Type Scale CSS Variables

```css
:root {
  /* Font Families */
  --md-ref-typeface-plain: 'Roboto', sans-serif;
  --md-ref-typeface-brand: 'Roboto', sans-serif;

  /* Display */
  --md-sys-typescale-display-large-font: var(--md-ref-typeface-brand);
  --md-sys-typescale-display-large-size: 57px;
  --md-sys-typescale-display-large-line-height: 64px;
  --md-sys-typescale-display-large-weight: 400;
  --md-sys-typescale-display-large-tracking: -0.25px;

  --md-sys-typescale-display-medium-font: var(--md-ref-typeface-brand);
  --md-sys-typescale-display-medium-size: 45px;
  --md-sys-typescale-display-medium-line-height: 52px;
  --md-sys-typescale-display-medium-weight: 400;
  --md-sys-typescale-display-medium-tracking: 0px;

  --md-sys-typescale-display-small-font: var(--md-ref-typeface-brand);
  --md-sys-typescale-display-small-size: 36px;
  --md-sys-typescale-display-small-line-height: 44px;
  --md-sys-typescale-display-small-weight: 400;
  --md-sys-typescale-display-small-tracking: 0px;

  /* Headline */
  --md-sys-typescale-headline-large-font: var(--md-ref-typeface-brand);
  --md-sys-typescale-headline-large-size: 32px;
  --md-sys-typescale-headline-large-line-height: 40px;
  --md-sys-typescale-headline-large-weight: 400;
  --md-sys-typescale-headline-large-tracking: 0px;

  --md-sys-typescale-headline-medium-font: var(--md-ref-typeface-brand);
  --md-sys-typescale-headline-medium-size: 28px;
  --md-sys-typescale-headline-medium-line-height: 36px;
  --md-sys-typescale-headline-medium-weight: 400;
  --md-sys-typescale-headline-medium-tracking: 0px;

  --md-sys-typescale-headline-small-font: var(--md-ref-typeface-brand);
  --md-sys-typescale-headline-small-size: 24px;
  --md-sys-typescale-headline-small-line-height: 32px;
  --md-sys-typescale-headline-small-weight: 400;
  --md-sys-typescale-headline-small-tracking: 0px;

  /* Title */
  --md-sys-typescale-title-large-font: var(--md-ref-typeface-brand);
  --md-sys-typescale-title-large-size: 22px;
  --md-sys-typescale-title-large-line-height: 28px;
  --md-sys-typescale-title-large-weight: 400;
  --md-sys-typescale-title-large-tracking: 0px;

  --md-sys-typescale-title-medium-font: var(--md-ref-typeface-plain);
  --md-sys-typescale-title-medium-size: 16px;
  --md-sys-typescale-title-medium-line-height: 24px;
  --md-sys-typescale-title-medium-weight: 500;
  --md-sys-typescale-title-medium-tracking: 0.15px;

  --md-sys-typescale-title-small-font: var(--md-ref-typeface-plain);
  --md-sys-typescale-title-small-size: 14px;
  --md-sys-typescale-title-small-line-height: 20px;
  --md-sys-typescale-title-small-weight: 500;
  --md-sys-typescale-title-small-tracking: 0.1px;

  /* Body */
  --md-sys-typescale-body-large-font: var(--md-ref-typeface-plain);
  --md-sys-typescale-body-large-size: 16px;
  --md-sys-typescale-body-large-line-height: 24px;
  --md-sys-typescale-body-large-weight: 400;
  --md-sys-typescale-body-large-tracking: 0.5px;

  --md-sys-typescale-body-medium-font: var(--md-ref-typeface-plain);
  --md-sys-typescale-body-medium-size: 14px;
  --md-sys-typescale-body-medium-line-height: 20px;
  --md-sys-typescale-body-medium-weight: 400;
  --md-sys-typescale-body-medium-tracking: 0.25px;

  --md-sys-typescale-body-small-font: var(--md-ref-typeface-plain);
  --md-sys-typescale-body-small-size: 12px;
  --md-sys-typescale-body-small-line-height: 16px;
  --md-sys-typescale-body-small-weight: 400;
  --md-sys-typescale-body-small-tracking: 0.4px;

  /* Label */
  --md-sys-typescale-label-large-font: var(--md-ref-typeface-plain);
  --md-sys-typescale-label-large-size: 14px;
  --md-sys-typescale-label-large-line-height: 20px;
  --md-sys-typescale-label-large-weight: 500;
  --md-sys-typescale-label-large-tracking: 0.1px;

  --md-sys-typescale-label-medium-font: var(--md-ref-typeface-plain);
  --md-sys-typescale-label-medium-size: 12px;
  --md-sys-typescale-label-medium-line-height: 16px;
  --md-sys-typescale-label-medium-weight: 500;
  --md-sys-typescale-label-medium-tracking: 0.5px;

  --md-sys-typescale-label-small-font: var(--md-ref-typeface-plain);
  --md-sys-typescale-label-small-size: 11px;
  --md-sys-typescale-label-small-line-height: 16px;
  --md-sys-typescale-label-small-weight: 500;
  --md-sys-typescale-label-small-tracking: 0.5px;
}
```

## Usage Guidelines

### Applying Type Styles

```css
/* Using CSS variables */
.headline {
  font-family: var(--md-sys-typescale-headline-large-font);
  font-size: var(--md-sys-typescale-headline-large-size);
  line-height: var(--md-sys-typescale-headline-large-line-height);
  font-weight: var(--md-sys-typescale-headline-large-weight);
  letter-spacing: var(--md-sys-typescale-headline-large-tracking);
}

/* Using utility classes */
<h1 class="md-typescale-headline-large">Headline</h1>
<p class="md-typescale-body-large">Body text</p>
<button class="md-typescale-label-large">Button</button>
```

### Responsive Typography

```css
/* Smaller screens */
@media (max-width: 600px) {
  .md-typescale-display-large {
    font-size: 36px;
    line-height: 44px;
  }

  .md-typescale-display-medium {
    font-size: 28px;
    line-height: 36px;
  }

  .md-typescale-headline-large {
    font-size: 24px;
    line-height: 32px;
  }
}
```

### Text Colors

Apply appropriate color tokens:

```css
/* Primary text */
.primary-text {
  color: var(--md-sys-color-on-surface);
}

/* Secondary text */
.secondary-text {
  color: var(--md-sys-color-on-surface-variant);
}

/* Disabled text */
.disabled-text {
  color: var(--md-sys-color-on-surface);
  opacity: 0.38;
}
```
