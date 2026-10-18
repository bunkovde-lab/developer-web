# Реальные локальные браузерные проверки

## v019-browser-full.log

```text
browser_marketplace: BROWSER MARKETPLACE PASSED: real mobile viewport, catalog, search, buy/sell buttons, transaction ledger, no runtime errors
browser_city_requests: BROWSER CITY REQUEST PASSED: menu, simple demand, auto-return and payment, land-for-card barter
```

## v019-browser-core.log

```text
browser_territory: TERRITORY BROWSER PASSED 390×844, zoning, land choice and chain threats
TERRITORY BROWSER PASSED 1024×768, zoning, land choice and chain threats
browser_finance: FINANCE BROWSER PASSED 390x844 sale, debt valuation and save/load
FINANCE BROWSER PASSED 1024x768 sale, debt valuation and save/load
browser_work_integration: WORK INTEGRATION PASSED 390x844: metadata, touch passport, zoom, idempotent paint, state isolation, stale network cleanup
WORK INTEGRATION PASSED 768x1024: metadata, touch passport, zoom, idempotent paint, state isolation, stale network cleanup
WORK INTEGRATION PASSED 1024x768: metadata, touch passport, zoom, idempotent paint, state isolation, stale network cleanup
WORK INTEGRATION PASSED 1366x900: metadata, touch passport, zoom, idempotent paint, state isolation, stale network cleanup
WORK ASSET FAILURE PASSED: individual SVG 404 and repeated refresh retain playable HTML
browser_rc1_stability: RC1 STORAGE/TIMERS PASSED: new/loaded session isolation, malformed save rejection, storage denied
RC1 BROWSER CAMPAIGN {"players":3,"restored":true,"turns":240,"winner":2,"type":"tender","finite":true,"built":16,"scene":{"renderPasses":481,"emitted":621,"animations":942,"cancelled":2,"errors":0,"mode":"fast","reduced":false,"assetsReady":true,"assetCount":266,"activeAnimations":5,"activeGhosts":1},"nodes":986,"lots":24,"cells":32}
RC1 BROWSER CAMPAIGN {"players":6,"restored":true,"turns":240,"winner":2,"type":"tender","finite":true,"built":15,"scene":{"renderPasses":481,"emitted":640,"animations":977,"cancelled":2,"errors":0,"mode":"fast","reduced":false,"assetsReady":true,"assetCount":266,"activeAnimations":7,"activeGhosts":0},"nodes":971,"lots":24,"cells":32}
```

## v019-visual.log

```text
VISUAL TEST PASSED at 390×844, board/cell labels, motion CSS, sound switch and zoom
VISUAL TEST PASSED at 768×1024, board/cell labels, motion CSS, sound switch and zoom
VISUAL TEST PASSED at 1024×768, board/cell labels, motion CSS, sound switch and zoom
VISUAL TEST PASSED at 1366×900, board/cell labels, motion CSS, sound switch and zoom
```

## v019-ui-living.log

```text
LIVING CITY BROWSER PASSED 390×844 SVG=266; 24 lots; 32 ring; stages1-4; save/motion/accessibility; render off=30.1ms, normal=32.3ms
LIVING CITY BROWSER PASSED 768×1024 SVG=266; 24 lots; 32 ring; stages1-4; save/motion/accessibility; render off=53.3ms, normal=62.6ms
LIVING CITY BROWSER PASSED 1024×768 SVG=266; 24 lots; 32 ring; stages1-4; save/motion/accessibility; render off=39.6ms, normal=39.2ms
LIVING CITY BROWSER PASSED 1366×900 SVG=266; 24 lots; 32 ring; stages1-4; save/motion/accessibility; render off=54.7ms, normal=47.3ms
LIVING CITY FALLBACK PASSED: playable board without optional SVG manifest
```

## v019-studio-final.log

```text
STUDIO PASSED {"width":390,"height":844} {"version":"0.19","dispatches":2,"notifications":4,"errors":0,"listeners":1}
STUDIO PASSED {"width":768,"height":1024} {"version":"0.19","dispatches":2,"notifications":4,"errors":0,"listeners":1}
STUDIO PASSED {"width":844,"height":390} {"version":"0.19","dispatches":2,"notifications":4,"errors":0,"listeners":1}
STUDIO PASSED {"width":1366,"height":1000} {"version":"0.19","dispatches":2,"notifications":4,"errors":0,"listeners":1}
```

## v019-portable-final.log

```text
V019 STORAGE PASSED: late restore, actual JSON download/upload, invalid-file rollback, separate stable slot, explicit legacy migration
```

## Pending-decision restore regression

Before fix: `Audit must restore only the decision, without a duplicate generic event` failed.

```text
PENDING RESTORE PASSED: audit payment once, deck selection, event card, sealed auction and stale dialog cleanup
RC1 STORAGE/TIMERS PASSED: new/loaded session isolation, malformed save rejection, storage denied
V019 STORAGE PASSED: late restore, actual JSON download/upload, invalid-file rollback, separate stable slot, explicit legacy migration
```

## Full Chromium campaigns after final restore fix 3999780

```text
RC1 STORAGE/TIMERS PASSED: new/loaded session isolation, malformed save rejection, storage denied
RC1 BROWSER CAMPAIGN {"players":3,"restored":true,"turns":240,"winner":2,"type":"tender","finite":true,"built":16,"scene":{"renderPasses":482,"emitted":621,"animations":948,"cancelled":2,"errors":0,"mode":"fast","reduced":false,"assetsReady":true,"assetCount":266,"activeAnimations":5,"activeGhosts":1},"nodes":990,"lots":24,"cells":32}
RC1 BROWSER CAMPAIGN {"players":6,"restored":true,"turns":240,"winner":2,"type":"tender","finite":true,"built":15,"scene":{"renderPasses":481,"emitted":640,"animations":976,"cancelled":2,"errors":0,"mode":"fast","reduced":false,"assetsReady":true,"assetCount":266,"activeAnimations":7,"activeGhosts":0},"nodes":972,"lots":24,"cells":32}
```
