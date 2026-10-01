# Toolbox 2 — 0.1.36

- The Current project selector now displays connected project names only; filesystem paths are no longer shown in its options.
- Project names are normalized to a folder-name label when older records contain a path.
- The panel badge and cache-busting query strings use a `__TOOLBOX_VERSION__` marker that is replaced from `package.json` during staging, preventing version drift between the package and UI.

Validation: `npm test`, `npm run release:check`, and `npm run package:stage`.

Install the signed [Toolbox 2 v0.1.36 ZXP](https://github.com/danrac/AE-Toolkit-CEP/releases/tag/v0.1.36), then restart After Effects so CEP reloads the extension.
