# ADR-0012: Cool palette with role-named tokens, Fraunces display face

- Status: accepted
- Date: 2026-09-19

## Context

The mockups and `packages/ui` were drawn in a borrowed warm palette (Ivory, Slate, Clay, Oat) with placeholder typefaces the app cannot ship. The app had no mark and no character of its own. Tokens were named after the colours, so a repaint meant renaming every call site, and the accent doubled as the error colour in `TextField`.

## Decision

Toli's palette is Frost `#F5F6FC`, Midnight `#0F0E1C` and Iris `#5B4DFF`, with cool greys, a Steel card chip and a separate `danger` red. Tokens are named by role: `paper`, `ink`, `accent`, `accentOnInk`, `chip`, `danger`. The display face is one static, Latin-subset instance of Fraunces loaded by `apps/web` as `--toli-face-display`; body text is the platform sans. The wordmark ships as outlined paths in `packages/ui`.

## Consequences

- The brand is recognisably Toli's: a cool ground, an electric dot, a soft serif.
- The next palette change touches `tokens.ts`, `tokens.css`, the manifest and the rendered icons, not the primitives.
- Iris on Frost passes 4.5:1 for text, which Clay on Ivory did not.
- The nine mockups stay in the first palette until the canvas is redrawn; `docs/design/README.md` carries the mapping. Layout, copy and interaction in the mockups are unaffected.
- One 11 KB font request on first load, `display: swap`, Georgia as the fallback. No change to the JS budget.
