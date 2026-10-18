# Stage 4: persistence, graphics, audio and motion

v0.19 now uses `developer-html-v019-save`. Stable v0.18 / rc1 retains `developer-html-save`; v0.19 never imports it automatically. A user may explicitly import that slot or a portable JSON backup. Import validates the complete candidate before replacing the v0.19 slot and restores the previous slot on restore failure. Download/upload is exercised by Chromium, as are malformed inputs and denied localStorage. This is local-only persistence, not a cloud account or multiplayer service.

`resumeSavedGame` now starts after all gameplay extensions. Existing sound settings, audio unlock and reduced/fast/off scene modes are retained. Card receipt notices use Russian category names; floating money indicators are constrained to their pill. Artwork remains the approved SVG v1 manifest (266 assets). Portfolio keyboard focus wraps inside its dialog; Escape returns to the project control.

The 768px portrait tablet now intentionally uses a full-width map and two-column cabinet section. The visual test breakpoint was changed from 760 to 820 to assert the designed layout; desktop map/cabinet alignment and viewport fit remain checked at 1024/1366.

Known boundary: legacy dialogs still call compatibility globals, and all modal focus traps are not yet unified. No new lending terms, card probabilities, prices, victory goals or AI purchasing thresholds were introduced.
