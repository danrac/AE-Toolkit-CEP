# Toolbox 2 — 0.1.24 Alpha 1

- Add Set Anchor and Step and Repeat at the bottom of Tools > Animation and layers, with directional grids, Layer/Comp bounds, Absolute mode, and optional spacing.
- Refactor placement around actual layer bounds and native AE coordinate transforms. Process multiple selected layers; preserve duplicate Position keys and separated dimensions. Locked layers and expression-driven Position/Anchor are skipped with clear messages. Cameras and lights support duplication but have no anchor point.
- Present each discovered source project as a separate bordered card with Found/Missing, File Path, and Color Space on separate rows, preserving path capitalization.
- Confirm existing rendered-image support: source discovery reads embedded XMP and .xmp sidecars, then imports the linked .aep/.aepx project. Metadata must contain a source-project link; arbitrary image metadata is insufficient.

Validation: automated tests, ES3 syntax checks, and browser layout checks pass. Native AE transform evaluation has not been verified: the script chooser did not accept path-entry automation, so the test was not run. Anchor compensation preserves the current frame; animated properties gain a current-time key. Real shared-drive testing remains unverified.

Install the signed ZXP and restart After Effects. The topper should show **0.1.24 Alpha**.
