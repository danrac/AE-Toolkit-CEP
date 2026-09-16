# Toolbox 2 — 0.1.19 Alpha 1

- Shared resources is the first Templates panel. Project records, project presets, naming presets and aspect-ratio presets load and save in the chosen shared library; no shared folder defaults to existing local storage. Checker packages remain in the selected library.
- Guide files saved with presets use library-relative paths, supporting different Mac/Windows mount locations.
- Exclusive filesystem save locks and revision checks prevent concurrent and stale saves. A leftover lock after a crash requires closing all writers before removing it. CEP Node support is enabled for exclusive filesystem locking.
- Search current projects by name or path.
- Source discovery displays project working space when the source is the currently open project; otherwise it explicitly reports unavailable. Reading color space from unopened projects remains incomplete.
- Clarified rendered-image and XMP sidecar source discovery; added mocked image-path tests.

Existing local libraries are retained separately when choosing a shared folder, not automatically merged. Project root paths still need to be valid on the machine using them. AOM selections remain local preferences. Existing native render and solid-conform operations, new CEP locking, and actual network-drive behavior need native/multi-machine testing; automated local tests pass.
