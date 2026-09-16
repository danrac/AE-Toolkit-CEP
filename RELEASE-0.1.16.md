# Toolbox 2 — 0.1.16 Alpha 1

- Reorganized Projects with per-folder Reveal and Import actions.
- Project preset editor opens from New; saved presets remain editable inside it. Removed the separate Project templates panel. Compact checker controls.
- Editable Offline, Online, and Checkers destinations relative to Graphic Out.
- AOM preset-name inspection and matching against installed After Effects output modules. Load the AOM codec settings through After Effects’ native template dialog first. Matching is by name, not settings content.
- Render outputs use the selected preset and its file extension/sequence suffix.
- Conform solids checkbox in Modify composition and selected-solid icon in Tools.

Validation: automated host, template, ES3 syntax, and packaging checks; actual Test.aom parsed successfully (12 visible presets). New rendering and solid-conforming paths have not been verified in a native After Effects session.
