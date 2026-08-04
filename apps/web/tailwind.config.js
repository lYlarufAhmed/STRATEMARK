/** @type {import('tailwindcss').Config} */

/*
 * Semantic colors are CSS-variable backed so a single `.dark` class on <html>
 * reflows the whole app — no `dark:` variant needed on the 460+ existing
 * utility usages across 39 files.
 *
 * The `rgb(var(--x) / <alpha-value>)` form (rather than a hex inside the
 * variable) is required because opacity modifiers are in real use:
 * `bg-surface/40`, `text-content/80`, `border-border/60`. A hex-valued variable
 * silently breaks those. Variables therefore hold space-separated RGB channels.
 *
 * Palettes live in src/index.css — `:root` is light, `.dark` is dark.
 */
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Canvas → panel → raised panel, then hairline.
        bg: v('--c-bg'),
        surface: v('--c-surface'),
        'surface-2': v('--c-surface-2'),
        border: v('--c-border'),
        // Ink scale. `muted` and `faint` clear WCAG AA (4.5:1) against
        // `surface` in BOTH themes.
        content: v('--c-content'),
        muted: v('--c-muted'),
        faint: v('--c-faint'),
        // Orange accent: highlights, active states, the logo, card accents.
        // The `ink` variant is the AA-safe color for orange text on canvas.
        primary: {
          DEFAULT: v('--c-primary'),
          fg: v('--c-primary-fg'),
          ink: v('--c-primary-ink'),
        },
        // The high-contrast pill (ref: "Login/Register"). Near-black on light,
        // near-white on dark — so its foreground must flip too, hence an object
        // rather than the flat color this used to be.
        ink: {
          DEFAULT: v('--c-ink'),
          fg: v('--c-ink-fg'),
          hover: v('--c-ink-hover'),
        },
        positive: v('--c-positive'),
        neutral: v('--c-neutral'),
        negative: v('--c-negative'),
      },
      fontFamily: {
        sans: ['"Google Sans Flex"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Parkinsans', '"Google Sans Flex"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      // Shadows are variables too: the light theme's soft grey lifts read as
      // muddy smears on a dark canvas, so dark deepens them instead.
      boxShadow: {
        card: 'var(--s-card)',
        'card-hover': 'var(--s-card-hover)',
        soft: 'var(--s-soft)',
      },
      borderRadius: {
        xl2: '1rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
