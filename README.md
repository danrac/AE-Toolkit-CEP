# AE Toolkit CEP

A separate CEP-panel implementation of AE Toolkit. The existing ScriptUI Toolbox repository remains independent.

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

## Create / Modify

The Create / Modify panel rebuilds the core composition tools without the legacy temporary-null resize workflow. Creating a comp validates its dimensions, frame rate, and duration before creating it. Editing selected comps writes only their width, height, frame rate, or requested name, preserving existing layers, parent relationships, and transforms.

Project-item rename actions treat the search text literally, so names containing characters such as `[` and `.` are handled predictably. The solid conform action only changes selected `SolidSource` layers in the active composition.

## Covers / Checkers

Covers are built as editable After Effects comps with a background and named text layers, avoiding the old import-and-convert flow that relied on fixed Photoshop layer positions. Checkers are created from selected comps at a chosen held frame. Render selected checker comps through **Projects → Render to outputs → Checker**; that workflow keeps existing render-queue entries intact.

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
