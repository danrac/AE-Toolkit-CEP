# Toolbox 2 — 0.1.25 Alpha 1

- Add **Parent selected layers to a new null** to Tools > Animation and layers. The new parent null is positioned at the average current position of the selected layers and supports mixed 2D/3D selections.
- Preserve each child layer's visible transform when assigning the new parent. Locked layers are left unchanged and reported in the panel status.
- Change the Guide action into a toggle. Every selected layer independently switches between guide and normal, including mixed selections.
- Retain the Set Anchor, Step and Repeat, and source-discovery result improvements from 0.1.24.

Validation: the complete automated suite, ES3 syntax check, release structure check, and package staging pass. Tests cover mixed 2D/3D null positioning, locked-layer handling, parenting, and mixed guide states.

Install the attached signed ZXP, restart After Effects, and confirm **0.1.25 Alpha** in the topper.
