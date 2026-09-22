# Toolbox 2 — 0.1.30 Alpha 1

- Fix Comp Cleanup classification for hidden child layers. A disabled child is no longer kept solely because it has a parent; visible parents and other dependency edges remain protected.
- Add regression coverage for hidden parented layers while preserving effect, matte, expression, nested precomp, and shared dependency safeguards.

Validation: the complete automated suite, ExtendScript ES3 syntax checks, client JavaScript syntax checks, release structure check, and package staging pass.

Install the attached signed ZXP, restart After Effects, and confirm **0.1.30 Alpha** in the topper.
