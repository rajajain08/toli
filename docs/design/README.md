# Toli — Design

Live canvas (interactive, Play mode): https://claude.ai/artifact/W7CD9SFEcb7naga6c5CZZG

The `mockups/` folder holds the nine artboards as exported from the canvas. They are the source of truth for layout, copy and interaction until `packages/ui` exists; after that, the tokens and primitives in `packages/ui` are.

## Screens

| # | File | Screen | Notes |
| --- | --- | --- | --- |
| 1 | Main.dc.html | Invite link landing | What a friend sees from a WhatsApp link. OTP on WhatsApp by default, SMS fallback, "Just look for now" escape. |
| 2 | AddCards.dc.html | Add your cards | Bank chips, tap-to-add rows, chip tray, live Done label. Interactive. |
| 3 | Group.dc.html | Group | Avatar row filters by person, chips filter by category. Interactive. Scrolls. |
| 4 | Groups.dc.html | Groups home | Group cards with member avatars and card stacks, "Shared with you". |
| 4b | GroupsEmpty.dc.html | Groups, first run | Empty state; primary action is "Paste an invite link". |
| 5 | Search.dc.html | Find | Who has this card, segmented by Everyone / Groups / People, perk chips. |
| 6 | MyCards.dc.html | My cards | Wallet carousel, perks, per-audience visibility toggles. Interactive. |
| 7 | Share.dc.html | Share with a person | Pick a person, tick cards, share. |
| 8 | Privacy.dc.html | What friends can see | The trust screen: what is shared, what is never stored. |

## Brand

Toli is टोली: your gang, the people you split bills with. The brand is small on purpose: one wordmark, one dot, one display face.

- **Wordmark.** Lowercase `toli` in Fraunces (opsz 144, wght 600, SOFT 100), Midnight on Frost or Frost on Midnight. It ships as outlined paths in `packages/ui` (`<Wordmark />`), so it never waits on a font. Use it on signed-out and invite surfaces; tab screens carry no logo, as in the mockups.
- **The Iris dot.** The tittle of the `i` is Iris. It is the one person in the group whose card gets used, and the same dot as the active tab and selection marks. It is the only decorative use of Iris; do not add a second. On Midnight grounds it lifts to `accentOnInk` so it stays lit.
- **App icon.** Midnight tile, Frost `t`, lifted Iris dot by the crossbar. `apps/web/public/icon.svg` is the source; the PNGs (192, 512, maskable, apple-touch) and `og.png` are rendered from it and the wordmark.
- **Display face.** Fraunces, one static instance (opsz 72, wght 450, SOFT 100), subset to Latin, about 11 KB. `brand/build-font.py` rebuilds it when copy needs new glyphs. The app loads it as `--toli-face-display`; tokens fall back to Georgia. OFL licence sits beside the font.
- **Aurora.** Hero surfaces carry a faint two-point glow, Iris from the top left and cyan from the right (`--toli-hero-glow`). It is the only gradient in the chrome.
- **Voice.** A friend who is good with cards, not a bank. Short, plain, second person, no exclamation marks, no finance jargon. Say what is never stored as often as what is shared. The line is "Know whose card to use before the bill comes."

## Visual language

- Palette (ADR-0012): Frost `#F5F6FC` background, Midnight `#0F0E1C` text and primary buttons, Iris `#5B4DFF` as the single accent (marks, focus rings, selected tints, active-tab dot). Cool greys only. Errors use `danger` `#C42B4B`, never the accent. Tokens are named by role (`paper`, `ink`, `accent`, `chip`, `danger`). The mockups are still drawn in the first palette (Ivory, Slate, Clay, Oat); read them as Frost, Midnight, Iris, Steel.
- Type: serif display over sans body. Display is Fraunces (see Brand); body is the platform sans (`system-ui`), which costs no bytes and feels native on Android and iOS. The mockups still name Anthropic Serif / Anthropic Sans; read those as Fraunces / system-ui.
- Cards are drawn as objects: issuer-tinted rectangle, Steel chip, light-to-shade gradient, hairline top highlight. No bank logos, no card numbers, ever.
- Elevation: three levels (row, panel, hero). Frosted tab bar and sticky action bars (`backdrop-filter`), with a solid fallback for low-end Android.
- Pill primary buttons, 16 px row radius, 8 pt spacing grid.

## Product rules the design encodes

- Card names only. There is no field anywhere for a number, expiry, CVV, limit or spend.
- A card's audience is a mixed list of groups and people; a 1:1 share is a two-member group.
- No "who should pay" recommendation. The app is a directory; the group draws its own conclusions.
- The invite link is the growth loop: it must render a preview and let someone see the group before adding anything.
