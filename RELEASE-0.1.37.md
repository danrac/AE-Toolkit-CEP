# Toolbox 2 — 0.1.37

- Current Project folder rows show folder labels without exposing resolved filesystem paths; Reveal and Import actions remain available.
- Conform solid to comp size now centers the solid anchor and layer position while preserving animation and lock state.
- Modify Composition centers top-level layer hierarchies through a temporary null when resizing, then restores parents and locks.
- Create Composition and Create Checkers lock format-controlled fields for saved presets, unlock them for Custom, and visibly gray muted fields.
- Create Cover uses the selected format without exposing width, height, FPS, or duration controls.

Validation: `npm test`, `node --check client/js/app.js`, `npm run release:check`, and `npm run package:stage`.

Install the signed [Toolbox 2 v0.1.37 ZXP](https://github.com/danrac/AE-Toolkit-CEP/releases/tag/v0.1.37), then restart After Effects so CEP reloads the extension.
