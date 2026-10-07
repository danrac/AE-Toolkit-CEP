# Toolbox 2 — 0.1.39

Client-specific aspect ratios and checker presets now share the Toolkit library. Existing formats remain under Default. Each preset panel includes client selection, Add/Remove controls, Create General/Create Custom, and a full-width Read CSV button.

Read CSV opens a file browser and imports valid new or changed definitions immediately. Client plus format code identifies each imported preset; unchanged imports create no duplicates and require no library write. Incomplete or absent rows preserve existing presets. Pending guide cells preserve assignments, N/A clears them, and duplicate rows are handled explicitly.

- Create Composition, Modify Composition, and Create Checkers filter formats by client. General Format adds Client and FPS fields; CSV accepts an optional FPS or Frame Rate column.
- Preset dimensions and FPS drive generation. Guides and mattes are centered and ordered Guide 1, Guide 2, other guides, then mattes. Missing files are checked before composition creation.
- Create Checker Presets supports general definitions and native custom-template capture with client assignment. Create Checkers remains in Covers / Checkers, below Create Cover.
- Documentation includes the complete CSV schema, shared-resource behavior, update rules, FPS defaults, and validation results.

Validation: full automated tests and release checks passed. In native AE 26.5, a temporary 1920×1080, 24 FPS composition verified guide/matte dimensions, order, centering, asset reuse, Add Guides off, and missing-file handling. Original/updated/repeated CSV checks passed through the UI and native local storage: 21 initial formats, then 3 additions and 1 update, then 24 unchanged, with no duplicate IDs or imported client/code pairs.

Shared-drive concurrency on multiple physical computers and Windows native checker import remain unverified. CSV asset paths reference their original files and require accessible mounts; they are not automatically copied or remapped.

Install the signed ZXP attached to this release, restart After Effects, and verify **0.1.39** in the topper.
