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

## Visual language

- Palette: Ivory `#FAF9F5` background, Slate `#141413` text and primary buttons, Clay `#D97757` as the single accent (marks, focus rings, selected tints, active-tab dot). Warm greys only.
- Type: serif display over sans body. Mockups reference Anthropic Serif / Anthropic Sans with Georgia / system-ui fallbacks; pick the production faces in `packages/ui`.
- Cards are drawn as objects: issuer-tinted rectangle, Oat chip, light-to-shade gradient, hairline top highlight. No bank logos, no card numbers, ever.
- Elevation: three levels (row, panel, hero). Frosted tab bar and sticky action bars (`backdrop-filter`), with a solid fallback for low-end Android.
- Pill primary buttons, 16 px row radius, 8 pt spacing grid.

## Product rules the design encodes

- Card names only. There is no field anywhere for a number, expiry, CVV, limit or spend.
- A card's audience is a mixed list of groups and people; a 1:1 share is a two-member group.
- No "who should pay" recommendation. The app is a directory; the group draws its own conclusions.
- The invite link is the growth loop: it must render a preview and let someone see the group before adding anything.
