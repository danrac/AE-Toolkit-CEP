# AE Toolkit CEP

A separate CEP-panel implementation of AE Toolkit. The existing ScriptUI Toolbox repository remains independent.

## Current foundation

- CEP manifest and dockable After Effects panel shell
- Native ExtendScript storage under the user's Adobe data directory
- Template library with a reusable default template and custom templates
- Per-project template assignment
- Relative, semantic folder mappings for After Effects, Assets, To GFX, Outputs, and Style Frames
- macOS and Windows project-root resolution

## Development

Run `npm test` to validate the template data model. Run `npm run package:stage` to validate the installable extension layout. Load the extension as an unsigned CEP extension during development, then open **Window → Extensions → AE Toolkit CEP** in After Effects.

## Signed ZXP releases

Every published GitHub release runs the packaging workflow and attaches `AE-Toolkit-CEP-v<version>.zxp` to that release. The workflow uses Adobe's official `ZXPSignCmd` release tool and never stores signing material in the repository.

Before publishing the first release, configure these repository secrets:

- `ZXP_CERT_BASE64`: Base64-encoded signing `.p12` certificate.
- `ZXP_CERT_PASSWORD`: Certificate password.

Optionally configure the `ZXP_TSA_URL` repository variable for a timestamp authority. For a local signed package, set `ZXPSIGNCMD_PATH`, `ZXP_CERT_PATH`, and `ZXP_CERT_PASSWORD`, then run `npm run package:zxp`.

## Migration direction

The project-template system replaces hard-coded Project Navigation paths first. Existing Toolbox operations will migrate into explicit ExtendScript backend modules and be called from the CEP panel as each workflow is rebuilt.
