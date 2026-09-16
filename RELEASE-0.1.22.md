# Toolbox 2 — 0.1.22 Alpha 1

- Change a connected project's template from the named button beneath its project selector. Save/Cancel controls keep the assignment per project; saving refreshes folder paths, naming fields, and render destinations.
- Mark custom locations as Render output in project presets. Each marked location adds its own full-width render button after Render to outputs.
- Each destination has a bordered section with an independent Optional subfolder field and chooser. Values remain separate per project/template/destination during the panel session.
- Remove the fixed Offline, Online, Style frames, and Checker render buttons and the old preset render-subfolder fields. Existing disk files are not moved or removed.
- Render to the chosen destination / optional subfolder / YY_MMDD, for example Outputs/review/26_0916.
- Clear inherited output-module subfolder settings before assigning render filenames to prevent unwanted comp-named folders.
- Retain underscore fractional frame rates in filenames and the Apache 2.0 license and Dan Racusin attribution.

Validation: automated tests, ES3 syntax, packaging checks, and isolated browser mock checks for independent subfolder routing and project-template refresh pass. Live After Effects rendering of the new destination setup is not yet verified. Shared-network and OCIO limitations remain documented.

Install the signed ZXP and restart After Effects; confirm **0.1.22 Alpha** in the topper.
