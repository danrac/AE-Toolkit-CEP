# Toolbox 2

Toolbox 2 is a dockable After Effects CEP extension for project navigation, composition creation, sourcing, checkers, cleanup, and reusable production presets. It is separate from the original ScriptUI Toolbox.

**Documented version: 0.1.30 Alpha 1.** [Download the signed ZXP](https://github.com/danrac/AE-Toolkit-CEP/releases/tag/v0.1.30-alpha.1) · [Release history](https://github.com/danrac/AE-Toolkit-CEP/releases) · [Latest release notes](RELEASE-0.1.30.md)

## User guide

The [illustrated panel guide](docs/PANELS.md) documents every toolbar section and its modules:

| Section | What it does |
| --- | --- |
| [Projects](docs/PANELS.md#projects) | Search connected projects, reveal/import folders, render to template-defined destinations. |
| [Sourcing](docs/PANELS.md#sourcing) | Import file paths; discover source AE projects and supported saved color spaces. |
| [Create / Modify](docs/PANELS.md#create--modify) | Create and modify comps, replace preset guides, conform solids, rename items. |
| [Covers / Checkers](docs/PANELS.md#covers--checkers) | Build editable covers and general or custom-template checkers. |
| [Cleanup / Collect](docs/PANELS.md#cleanup--collect) | Organize, consolidate, remove unused items, localize, and collect. |
| [Tools](docs/PANELS.md#tools) | Timing, animation, layer selection/alignment, transform transfer, and text tools. |
| [Templates](docs/PANELS.md#templates) | Shared resources, aspect ratios, project/naming presets, project registration, and AOM output presets. |

![Toolbox 2 Projects browser preview](docs/images/projects.png)

Screenshots are captured from the 0.1.20 browser preview with an empty library. Native actions require After Effects; disabled controls and empty selectors in these screenshots do not indicate missing features.

## Getting started

1. Install the signed ZXP with your CEP extension installer, restart After Effects, and open **Window → Extensions → Toolbox 2**. Check the version in the topper after updating.
2. Under **Templates → Shared resources**, leave the local library selected or browse to your team's shared folder.
3. Use **Create project presets → New** to configure folders and composition naming, or use the default preset.
4. Under **Add new project**, enter a name, choose the project root, select its template, and add it.
5. Select that project in **Projects → Current project**. Save the AE project before rendering.
6. To render, load the desired output-module presets in After Effects, refresh them under **Templates → Load AOM presets**, and choose an Output Preset in Projects.

Drag the toolbar grip to any edge, or focus it and use the arrow keys. Click module headers to collapse or expand them. Toolbar position, active tab, and module states are restored locally. Hover tool icons for their names.

## What's current

- Project selection, search, Refresh/Remove, folder Reveal/Import, and file-opening controls are consolidated in Current project.
- Add new project lives in Templates. Create project presets starts with **New**; the editor opens only when needed.
- Shared resources covers projects, project presets, naming presets, aspect ratio presets, and custom checker packages.
- Output presets are read from AE and optionally filtered by an AOM file. No fixed ProRes/PNG preset names are required.
- Render to outputs and template-defined custom render destinations each have their own bordered subfolder controls; destinations use optional subfolder / YY_MMDD.
- Change each connected project’s template from its named button in Current project; paths and render destinations refresh automatically.
- Modify composition has its own format selector, guide replacement, and Conform solids option.
- Custom checkers capture native templates with their media; the graphic placeholder and Job text are replaced when generating checkers.
- Comp Cleanup analyzes the active composition and nested precomps, explains KEEP/SAFE TO REMOVE/AMBIGUOUS classifications, and removes only reviewed safe layers in one undo step.
- Animation and layers separates the cubic Bézier Key graph and Placement tools into remembered tabs. Keyframed Step and Repeat and Set Anchor operations preserve the existing animation.
- Fade in/out uses named layer markers plus an opacity expression. Reuse the fade buttons to create the markers, then drag `fadeIn_start`/`fadeIn_end` or `fadeOut_start`/`fadeOut_end` in the timeline to adjust timing without a duration field.
- Version 0.1.20 fixes the Node-enabled CEP startup regression and reads supported working spaces from unopened AEP/AEPX files.

## Compatibility and limits

See [shared-library behavior](docs/PANELS.md#shared-resources), [custom checker preparation](docs/PANELS.md#custom-checker-template-preparation), and [troubleshooting](docs/PANELS.md#troubleshooting-and-validation).

Actual network-share/two-computer save behavior and Windows native checker import remain unverified. Unknown/OCIO project color layouts report unavailable; they are not silently treated as sRGB. AOM codec settings must be installed in AE on each workstation. Shared library selection does not automatically migrate local records or remap absolute project roots.

## Development and packaging

```sh
npm ci
npm test
npm run release:check
npm run package:stage
```

Tests cover strict ExtendScript ES3 syntax, the data model, host actions, comp-cleanup dependency classification, custom checkers, shared-library revisions, and exclusive save locks. Browser preview captures are UI documentation, not native integration tests.

Before releasing host changes, run `tests/after-effects-load-check.jsx` through **File → Scripts → Run Script File** in After Effects and inspect the reported `ae-toolkit-cep-host-check.txt` result. The host bundles JSON-js privately as `AEToolkitJSON`, so it does not depend on a native JSON object or another panel.

Published GitHub releases trigger the workflow that signs and attaches `AE-Toolkit-CEP-v<version>.zxp`. Configure repository secrets `ZXP_CERT_BASE64` and `ZXP_CERT_PASSWORD`; optionally set `ZXP_TSA_URL`. For local signing, set `ZXPSIGNCMD_PATH`, `ZXP_CERT_PATH`, and `ZXP_CERT_PASSWORD`, then run `npm run package:zxp`. Never commit signing material.

Use a distinct package version for each distributed build so installers can distinguish updates. Prerelease tags use the form `v0.1.20-alpha.1`.

## License and credit

Copyright 2026 Dan Racusin. Licensed under the [Apache License 2.0](LICENSE).

**Toolbox 2 was created by Dan Racusin.** When redistributing Toolbox 2 or derivative works, retain applicable copyright and attribution notices, include the license, and preserve the attribution in [NOTICE](NOTICE) as required by Section 4. Mark modified files as changed. Credit may be carried in the distributed NOTICE, documentation/source, or an appropriate notices display as the license allows.

Suggested credit: **Toolbox 2 — created by Dan Racusin**. Apache 2.0 does not require credit in every render or private use of the tool. Third-party components retain their own terms and notices.
