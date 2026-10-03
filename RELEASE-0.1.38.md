# Toolbox 2 — 0.1.38

- Render To Outputs rounds frame rates to three decimals for filename safety and adds an Include FPS checkbox beside each render button.
- FPS remains included by default; disabling the checkbox keeps the output dimensions while omitting the FPS segment.
- Renamer now appears as the final module in Cleanup / Collect.

Validation: `npm test`, `node --check client/js/app.js`, `npm run release:check`, and `npm run package:stage`.

Install the signed [Toolbox 2 v0.1.38 ZXP](https://github.com/danrac/AE-Toolkit-CEP/releases/tag/v0.1.38), then restart After Effects so CEP reloads the extension.
