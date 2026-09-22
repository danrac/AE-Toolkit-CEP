# Toolbox 2 — 0.1.29 Alpha 1

- Restore marker-driven fades: Fade in/out creates or reuses named layer markers and an opacity expression, so dragging the markers changes the fade timing.
- Remove the fade-duration note from the Animation and Layers toolbar while keeping the action tooltips.
- Make Move animation keys to parent null explicitly transform-only; Opacity keys remain on the original layer.
- Add regression coverage for marker reuse, marker expressions, and preserving Opacity keys.

Validation: the complete automated suite, ExtendScript ES3 syntax checks, client JavaScript syntax checks, release structure check, and package staging pass.

Install the attached signed ZXP, restart After Effects, and confirm **0.1.29 Alpha** in the topper.
