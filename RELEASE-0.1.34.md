# Toolbox 2 — 0.1.34 Alpha 1

- Stop creating an automatic date folder when rendering to Outputs or a template-defined custom render destination. The selected optional subfolder is now the final destination path.
- Build output filenames from the selected After Effects output module's render dimensions, so resized or half-resolution renders use their actual output width and height in the suffix.
- Fall back to the composition dimensions when a preset does not expose usable output dimensions, and preserve the existing frame-rate, extension, and image-sequence naming behavior.

Validation: automated tests, ES3 syntax checks, release structure checks, and package staging pass. The regression suite covers no-date-folder paths, half-size output naming, and the comp-size fallback. Native After Effects rendering still requires a project-specific verification pass.

Install the signed ZXP and restart After Effects. The topper should show **0.1.34 Alpha**.
