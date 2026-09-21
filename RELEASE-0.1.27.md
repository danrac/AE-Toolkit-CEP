# Toolbox 2 — 0.1.27 Alpha 1

- Split **Animation and layers** into remembered **Key graph** and **Placement** tabs so the panel stays compact.
- Make Key graph tangent handles draggable in the CEP runtime with mouse and touch input, while retaining keyboard and numeric editing.
- Replace unsupported ExtendScript `Array.indexOf` use so applying a curve works in After Effects' ES3 engine.
- Make **Step and Repeat** translate every existing Position keyframe, including separated dimensions.
- Make **Set Anchor** shift every Anchor Point keyframe and compensate every Position key at its own time, preserving the layer's animated appearance.
- Avoid writes to the hidden Z follower exposed by After Effects on some 2D layers with separated Position dimensions.

Validation: the complete automated suite, ExtendScript ES3 syntax checks, keyframed and separated-position placement regressions, release structure check, package staging, and signed-package verification pass.

Install the attached signed ZXP, restart After Effects, and confirm **0.1.27 Alpha** in the topper.
