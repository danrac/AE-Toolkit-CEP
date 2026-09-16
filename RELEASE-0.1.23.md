# Toolbox 2 — 0.1.23 Alpha 1

- Add Browse beside standard and custom relative folder fields in Create project presets. Selections are stored relative to the current project root. Without a current project, choose a reference root first. Folders outside that root are rejected.
- Present each custom location as a compact bordered card: Name and an X remove icon on the first row; Path and Browse on the second; Render output aligned to the right below.
- Retain template switching, independent custom render destinations, and destination / optional subfolder / YY_MMDD output paths from 0.1.22.

Validation: automated tests and ES3 syntax checks pass, including relative-path boundary tests. The custom-location layout was visually checked in an isolated browser preview. The new native folder chooser has not yet been verified inside After Effects; live rendering and shared-network limitations remain as documented.

Install the attached signed ZXP, restart After Effects, and confirm **0.1.23 Alpha** in the topper.
