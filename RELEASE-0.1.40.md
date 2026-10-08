# Toolbox 2 — 0.1.40

Import Source AE Projects now matches compositions to the original filenames of selected renders, including trailing FPS, dimensions, and image-sequence suffixes. Matches move into ImportedComps while the rest of each project stays under ImportedProjects. Each render is matched within its own source project, and only one comp with an identical name is isolated; additional copies remain in their imported project folders. Result modules show moved comps, existing names, unmatched renders, and ties requiring review.

Shared libraries now keep automatic local backups after successful loads, refreshes, saves, and custom checker capture. Backups include preset definitions, connected project records, guide/matte assets, and completed checker packages. The latest two completed snapshots are retained separately from the normal local library. If the shared source is unavailable, Toolbox uses its last valid backup for viewing presets and creating comps/checkers, with editing disabled until reconnection. Shared Resources shows backup status and includes Reveal Local Backup.

Validation: automated tests, ExtendScript ES3 checks, and release structure checks passed. In native After Effects 26.5, two actual project files imported successfully, suffix matching found the source comp, and only one same-named comp moved into ImportedComps. Native CEP backup testing verified load/save backups, disconnected-source fallback, disabled offline editing, composition creation using cached guide/matte media, and preservation of the separate local library.

Actual network-share behavior across multiple physical computers and Windows native checker import remain unverified. Backups reflect the shared data most recently loaded or saved on each workstation; refresh to pick up other users' changes. Duplicate comp names are not a comparison of comp contents. Distinct tied matches remain in their imported project folders for review.

Install the signed ZXP attached to this release, restart After Effects, and verify **0.1.40** in the topper.
