# Stage 3: coherent application shell

The board continues to use the 266 approved SVG assets. No replacement art library or economic retuning is included.

A read-only, recursively frozen `DeveloperGame.snapshot()` projects the current turn and the human company's public assets, equity, investor claims and residual debt. Subscribers update after a render microtask; no action waits for an animation. A bounded command history provides diagnostics without retaining private card arguments. Existing global entry points remain a compatibility layer for legacy dialogs.

The interface introduces a current-turn strip, labelled deck inventory, company financial summary, project portfolio, contextual help and a consistent dark architectural theme. The portfolio opens real parcel passports. Browsing never spends actions. On short desktop screens the command panel scrolls independently; on phones the layout becomes one column with four deck categories per row. Zoom remains the precise touch interface for compact map parcels.

Restore runs last, after all financial and victory overrides and both presentation adapters have been installed. This removes partial-startup restore ordering. The action count and turn limit are named immutable configuration values with unchanged values (2 and 240).

Checks: browser_studio covers frozen views, financial projection, empty/populated portfolio, actual parcel opening, guide controls, missing requests/JS exceptions and page overflow on phone, portrait tablet, landscape phone and desktop. Existing living-city browser tests cover all stages, SVG fallback, reduced motion and save/load. Full regression results are recorded in the final report.
