# Toolbox 2 — 0.1.21 Alpha 1

- Fix render setup when an output preset initially has no filename. Assign a destination and let After Effects resolve the extension; preserve sequence frame-number tokens and reacquire the output module after settings changes.
- Use underscores in fractional frame rates in all render filenames: `23_976fps`, `29_97fps`, and `59_94fps`. Whole rates remain `24fps`. The actual composition frame rate is unchanged.
- Follow `[compName]_[frameRate]fps_[width]x[height].[fileExtension]`, for example `ABA_9x16_A_new_v01_dr_23_976fps_1080x1920.mp4`. Image sequences retain their frame-number suffix.
- Include Apache 2.0 LICENSE and NOTICE crediting Dan Racusin in the extension package.
- Add the illustrated guide covering every Toolkit panel.

Automated host regression and ES3 syntax checks pass, including empty filenames, sequence numbering, trailing subfolder separators, queue cleanup, all four render modes, and unchanged composition frame rates. The new filename fallback has not yet been verified in a live After Effects render. Existing shared-network and unsupported OCIO limitations remain documented in the panel guide.

Install the attached signed ZXP, restart After Effects, and confirm **0.1.21 Alpha** in the panel topper.
