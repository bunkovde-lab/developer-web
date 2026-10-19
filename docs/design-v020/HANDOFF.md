# ASTRA — v0.20 Design Edition

Base main: f91ac3102eb6796a72f216aca443dc964082824e. Branch: astra/design-v020-premium. PR #36. No main merge.

## Implemented

- Original reproducible SVG production: scripts/generate-premium-art.py.
- 250 generated resources: 32 perimeter, 24 free parcels, 6 zone tiles, 6 completed architecture, 5 legacy stage tiles, 24 zone/stage combinations, 139 card illustrations, 14 UI icons.
- 212 existing resource identities preserved; 38 added. Manifest contains 377 entries, including retained studio19 graphics. SVGs contain vector shapes, no embedded raster.
- premium.css: cream/brass/navy tokens, perimeter states, dynamic metadata, owner borders, lease/network states, company cabinet, modal/hand/market styling, mobile and landscape layouts.
- premium.js: read-only UI projection, company, actual portfolio, unpaid Work/legacy obligations, drawn action/hand icons. It does not change game state, RNG, card order or payments.
- scene-motion.js: use zone-specific construction art; retain existing move/arrival event sequencing and fallback.
- Card titles/terms/effects remain authoritative engine DOM, never painted financial values.

## Baseline dependencies

Reviewed PR #18/#19 metadata: open, separate modular experiment and dependent QA; not merged into current engine. #20 is actually merged, its 73 assets retained. #27 geometry and #29 Work economy merged. #30–35 merged; direct-map auctions, Deal close and compact picker retained. Reference amounts and cell sequence not used as game data.

## Verification

Locally passed: smoke, territory, city-requests, pace, rework, tournament-v016, svg-assets, finance-integrity (8 suites); JS syntax; static packaging (16 script/link refs). Local Chromium missing, no physical Android test claimed. Browser CI on PR #36 includes premium read-only projection, all 5 viewport sizes, screenshot fixtures and existing mechanics regressions. CI final outcome and screenshot review must be recorded before acceptance.

Generated art sheet was rendered with sharp and inspected; adjusted buildings to remain above status band. Full artwork is original vector style; visual fidelity to detailed raster reference remains a review criterion, not an asserted 10/10.

## Screenshots

PR browser Actions artifact `developer-v010-screenshots`:
- premium-start-WxH.png: genuine new game.
- premium-city-fixture-WxH.png: explicitly staged visual fixture, real renderer, not simulated transactions.
- premium-menu-WxH.png: actual menu.
- Existing flow tests capture auction, market, Work card, zoom and construction screens.

Five targets: 390×844, 768×1024, 1024×768, 1366×900, 844×390. Fixture states are not evidence of a naturally played campaign. Actual engine tournaments are tested separately.

## PROGRAMM integration

Review CI and screenshots at the final PR SHA, inspect Android landscape, then merge through normal PR review. Keep current stable/RC/control/QA URLs unchanged. New separate owner-private test Site: https://developer-v020-design.jazzywren11.chatgpt.site . Build `node scripts/build-site.cjs` or download preview-package CI artifact. No new runtime npm dependency. Rebuild after any source change; verify exact SHA before publishing.

## Remaining acceptance work

Physical Android, performance on target hardware, user approval of reference fidelity. Human balance/duration validation remains unchanged and outside presentation scope. No unsupported claim that the initial vector pass is pixel-identical to the supplied raster reference.
