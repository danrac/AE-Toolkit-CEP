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

Run `npm test` to validate the template data model. Load the extension as an unsigned CEP extension during development, then open **Window → Extensions → AE Toolkit CEP** in After Effects.

## Migration direction

The project-template system replaces hard-coded Project Navigation paths first. Existing Toolbox operations will migrate into explicit ExtendScript backend modules and be called from the CEP panel as each workflow is rebuilt.
