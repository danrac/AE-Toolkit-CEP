# Local Backups of Shared Libraries

Available in Toolbox 2 **0.1.40**.

When a shared library is selected, Toolbox refreshes a separate local backup after successful library loads, Refresh Library, preset saves, and custom checker capture. The shared library remains the source used for normal work. With no shared library selected, the existing local library continues to load and save normally.

## What Is Backed Up

- `project-templates.json`: connected projects, project/naming presets, clients, aspect ratios, general checker definitions, FPS, codes, asset references, and curve presets.
- The library's `guide-assets` folder.
- Completed native checker packages with `template.json`, project files, and collected media.
- Individually referenced guide/matte files, including library-relative files outside `guide-assets` and available external files referenced by CSV presets.

Unrelated neighboring files in a shared folder are not copied. Bundled guide artwork remains in the installed extension. If a referenced guide is unavailable, Toolbox retains its last local copy when one exists, or records that only its reference could be backed up. Asset warnings appear in Shared Resources; the snapshot's `backup.json` lists the affected paths.

## Storage and Backup Protection

Backups are stored under the OS-resolved local Toolkit data folder in `shared-library-backups/<library-id>/`. Each configured shared path has its own backup. The normal local library's `project-templates.json` is not overwritten or merged with shared data.

The current and previous completed snapshots are retained. Unchanged files reuse local snapshot data through hard links where supported, with copy fallback; files are never linked directly to the shared drive. New snapshots are built separately and published only after the shared state is rechecked. Failed copies, corrupt state data, and concurrent shared saves leave the previous completed backup available. Overlapping local refreshes serialize and use a local exclusive lock.

## If the Shared Path Is Unavailable

On opening Toolbox or refreshing the library, Toolbox uses that shared path's last valid local backup when the source is missing, unreadable, invalid, or busy. Shared Resources displays the backup date and a clear **Using local backup** notice. The configured shared path remains visible so reconnecting does not require choosing it again.

Cached presets remain available for viewing and creating compositions/checkers. Backup asset paths resolve to the local copies. Shared-library editing, CSV import, and preset saves are disabled while using the backup, so a workstation cannot accidentally overwrite newer shared data with an offline copy.

Reconnect the shared drive and click **Refresh Library** to return to the shared source and resume saves. **Use Local Library** selects the workstation's separate normal local library; it does not copy the backup into it or upload cached data to the shared folder.

**Reveal Local Backup** opens the active snapshot's library folder. Its parent contains `backup.json` with the source path, revision, timestamp, file inventory, and external-guide mapping. Preserve both the library folder and this metadata when copying a backup elsewhere. Manual restoration of externally referenced guides may require updating those original paths; the running Toolkit's offline mode resolves them automatically.

Backups represent the most recently loaded or saved shared data on that workstation. Changes made by another user are incorporated when the library is refreshed. Availability is checked on open/refresh; this feature does not poll a disconnected drive continuously.

## Validation

Filesystem tests cover metadata and media copies, external and library-relative guide mapping, unchanged refreshes, current/previous retention, failed copies, concurrent edits, corrupt files/pointers, overlapping refreshes, missing sources, and preserving the normal local library.

In native AE 26.5 / CEP, an isolated QA library verified automatic backup after load, revision 2 after a successful UI save, fallback after the source folder was temporarily disconnected, disabled editing in backup mode, and a 1920×1080 / 24 FPS composition whose matte and both guides came entirely from cached media. Reconnecting resumed shared mode, and returning to the original local library preserved its data byte-for-byte. An actual multi-machine network-share test remains unverified.
