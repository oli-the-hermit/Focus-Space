# Styles

Plain CSS, one file per component or feature, imported by [`src/index.css`](../index.css).

```
foundation/   tokens.css (every design value), properties.css (@property),
              reset.css, reduced-motion.css, helpers.css
components/   generic, reusable pieces: button, card, select, modal, …
layout/       the app shell: rail, top bar, columns
features/     Focus Space pages and windows: timer, calendar, goals, mini, …
motion.css    cross-cutting motion: phase cross-fades, press feedback, page changes
```

## Rules

1. **Tokens only.** Colors, type, spacing, radius, rings, sizes and durations come from
   `foundation/tokens.css`. Stylelint (`npm run lint:css`) fails on raw values anywhere else.
   Tolerated literals: `0`, percentages, `calc()`/`clamp()`, `z-index` 1–3 for local stacking.
2. **Core vs product.** The **CORE** section of `tokens.css` is shared by the whole app family;
   the **PRODUCT** section holds Focus Space specifics (break phase, layout, loops).
3. **Flat Material.** Tonal surfaces, no gradients, no transparency, no decorative shadows,
   no separator borders. Only floating layers use `--elev-overlay`.
4. **New component → new file** in `components/`, imported in `index.css` next to its peers.

## Cascade layers

```css
@layer tokens, app;
```

- `tokens` holds only custom properties.
- `app` holds everything else. Inside it the normal specificity-then-order cascade applies,
  so **import order in `index.css` matters**: keep a file after the ones it overrides.
- Anything unlayered wins over both layers. A theme or override stylesheet imported after
  `index.css` never needs `!important` or specificity tricks.

## Themes

Dark is the default (`:root`); light is `[data-theme="light"]`. A new theme only redefines
the color tokens under its own `[data-theme="…"]` selector.
