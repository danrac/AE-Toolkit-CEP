# AE Toolkit CEP

A separate CEP-panel implementation of AE Toolkit. The existing ScriptUI Toolbox repository remains independent.

## Compact panel

The seven sections use an icon toolbar at the top. Hover an icon for its name; the heading identifies the active section. Tool actions also use labeled icons, with smaller controls and consistent card spacing. Rows keep their column count as the panel narrows, while field widths, spacing, and type shrink to fit. The panel scrolls vertically.

## Current foundation

- CEP manifest and dockable After Effects panel shell
- Native ExtendScript storage under the user's Adobe data directory
- Template library with a reusable default template and custom templates
- Custom template locations alongside the standard project folders
- Per-project template assignment
- Relative, semantic folder mappings for After Effects, Assets, To GFX, Outputs, and Style Frames
- macOS and Windows project-root resolution, including a native folder chooser
- Resolved project paths with one-click reveal controls
- Active-project controls for opening project files, importing from mapped folders, and rendering selected compositions to dated project outputs
- Sourcing workflows for path-based asset imports and discovery of explicit source-AE-project links in rendered footage
- Create / Modify workflows for validated composition creation, direct selected-composition size and FPS edits, project-item renaming, and solid-to-comp conforming
- Native editable Covers and held-frame Checkers, with checker rendering routed through the safe Project output workflow
- Cleanup, collecting, asset localization, and Basic/DMS/XAV 2025 project organization workflows
- Core Tools for composition timing, fades, sequencing, layer parenting, guide marking, and selected-text replacement
- Custom composition formats with validated dimensions and safely stored matte/chart guide assets

## Create / Modify

New composition names use `Job_Format_Style_Description_01_Initials`, with initials last. Empty fields are omitted.

The Create / Modify panel rebuilds the core composition tools without the legacy temporary-null resize workflow. Creating a comp validates its dimensions, frame rate, and duration before creating it. Editing selected comps writes only their width, height, frame rate, or requested name, preserving existing layers, parent relationships, and transforms.

Project-item rename actions treat the search text literally, so names containing characters such as `[` and `.` are handled predictably. The solid conform action only changes selected `SolidSource` layers in the active composition.

## Covers / Checkers

Covers are built as editable After Effects comps with a background and named text layers, avoiding the old import-and-convert flow that relied on fixed Photoshop layer positions. Checkers are created from selected comps at a chosen held frame. Render selected checker comps through **Projects → Render to outputs → Checker**; that workflow keeps existing render-queue entries intact.

## Cleanup / Collect

Cleanup actions call After Effects’ native consolidate, remove-unused, reduce, and Collect Files operations. Localize copies only selected, file-based footage into the active project’s semantic Assets folder and does not overwrite an existing file. Use Collect Files for sequences and proxies.

The organizer snapshots project items before it creates folders, runs as one undo step, and never removes folders. Basic, DMS aspect-ratio, and XAV 2025 presets are available. Every selected Project-panel item is lifted to the root and excluded from routing; a selected folder’s unselected contents stay together.

## Tools

The CEP Tools panel carries over the reliable, focused layer and composition utilities. Duration controls preserve a one-frame minimum; fades set explicit opacity keys over the requested frames; text replacement writes at the current time when the source text is animated. It also includes typed layer selection, stacking reversal, snapping, transform transfer, and validated no-slate comp creation. AutoSplice is intentionally excluded.

## Custom composition formats

Manage formats from **Templates → Composition formats**. A format validates its name and dimensions, then stores selected matte or chart guide files in AE Toolkit CEP’s user-data folder before the preset is saved. Files already stored there are reused and no existing resource is overwritten. Enable **Add this format’s stored guide assets** when creating a composition to add the matte and charts as guide layers.

## Development

Run `npm test` to validate the template data model. Run `npm run package:stage` to validate the installable extension layout. Load the extension as an unsigned CEP extension during development, then open **Window → Extensions → AE Toolkit CEP** in After Effects.

## Signed ZXP releases

Every published GitHub release runs the packaging workflow and attaches `AE-Toolkit-CEP-v<version>.zxp` to that release. The workflow uses Adobe's official `ZXPSignCmd` release tool and never stores signing material in the repository.

Before publishing the first release, configure these repository secrets:

- `ZXP_CERT_BASE64`: Base64-encoded signing `.p12` certificate.
- `ZXP_CERT_PASSWORD`: Certificate password.

Optionally configure the `ZXP_TSA_URL` repository variable for a timestamp authority. For a local signed package, set `ZXPSIGNCMD_PATH`, `ZXP_CERT_PATH`, and `ZXP_CERT_PASSWORD`, then run `npm run package:zxp`.

To publish a test build while the extension manifest remains at its package version, use a GitHub prerelease tag such as `v0.1.0-alpha.1`. The packaging workflow accepts that suffix and attaches a matching ZXP asset.

## Migration direction

The project-template system replaces hard-coded Project Navigation paths first. Existing Toolbox operations will migrate into explicit ExtendScript backend modules and be called from the CEP panel as each workflow is rebuilt.

Before releasing host changes, run `tests/after-effects-load-check.jsx` through After Effects File → Scripts → Run Script File. It loads the complete host and exercises filename sanitizing. Read `ae-toolkit-cep-host-check.txt` in the system temporary folder for PASS or FAIL. Node syntax checks alone do not establish ExtendScript compatibility.

## Path portability audit

Runtime project locations come from the selected project root and its editable template. Fresh installs use generic relative folders: `After Effects`, `Assets`, `Incoming`, `Outputs`, and `Outputs/Style Frames`. Existing saved templates are preserved. Mac/Windows absolute paths belong in the project-root field, not in relative template-folder or render-subfolder fields.

DMS organization routes supported video files by media type without requiring a `06_ToGFX` disk folder. Organizer names describe folders inside the AE project, not directories that must exist on disk. App settings and copied guides live beneath Adobe’s OS-resolved `Folder.userData`; localized media is created beneath the configured Assets location. Packaging paths are relative to the repository, and signing-tool/certificate locations come from environment variables. Absolute paths in tests are fixtures only.

Known non-path dependency: the render modes still require the named `X_...` output-module templates. These should become selectable installed templates in a subsequent render-workflow update.

## ExtendScript JSON compatibility

The host bundles public-domain JSON-js (json2.js, 2023-05-10) in a private `AEToolkitJSON` namespace. It requires no native JSON object, other installed panels, or runtime download. Host action tests explicitly disable global JSON. Before release, stage the package and run `tests/after-effects-load-check.jsx` in After Effects; inspect `dist/ae-toolkit-cep-host-check.txt` for the result. The check loads the host and exercises path serialization, default-state parsing, and a host response without changing the open project.

Asset import accepts absolute Mac paths, Windows drive and UNC paths, and Terminal-escaped spaces in Mac paths. Existing literal paths are tried first. The AE smoke check tests absolute-path detection directly, since a compound logical expression behaved differently in AE than in Node.
