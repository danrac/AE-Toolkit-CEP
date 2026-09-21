# Toolbox 2 — 0.1.26 Alpha 1

- Add a compact **Key graph** editor to Tools → Animation and layers. Drag the cubic Bézier handles or enter precise control values, then apply the curve to adjacent selected keyframe pairs.
- Include Linear, Ease in, Ease out, and Ease in out curves. Custom curves can be saved, selected from the preset dropdown, and removed.
- Store custom curve presets in the active Shared resources library so workstations using the same library can use the same easing presets.
- Reduce the size of the Step and Repeat and Set Anchor controls so the expanded Animation and layers panel stays compact.
- Add descriptive hover tooltips to every Animation and Layers toolbar icon.

Validation: the complete automated suite, ExtendScript ES3 syntax checks, shared-library stale-write and locking tests, browser layout review, release structure check, and package staging pass. Tests cover curve preset validation and shared persistence plus scalar and multidimensional temporal-ease mapping.

Install the attached signed ZXP, restart After Effects, and confirm **0.1.26 Alpha** in the topper.
