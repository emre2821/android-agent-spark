# Release Notes

## Enhancements
- Agent updates, task activity, and memory edits now persist through the API layer so dashboards stay in sync across devices.
- Agent memory fetches, inserts, updates, and deletes use the live API with optimistic UI updates for a smoother editing flow.
- Mobile (`bundle:android` / `bundle:ios`) and desktop (`bundle:desktop`) bundles are explicitly labeled as preview builds while native shell integration is finalized.

## Deferred / Known Gaps
- The custom workflow builder remains hidden until end-to-end persistence is delivered. Existing prebuilt and saved workflows continue to function normally.
- Native shell wiring for Capacitor/Tauri packages is still pending; expect manual integration work before producing shippable binaries.
