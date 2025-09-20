# Platform QA Checklists

## Web (Desktop Browsers)
- [ ] Verify layout adapts between wide and narrow viewports (multi-column dashboard and single-column stack).
- [ ] Confirm agent search updates results in real time and empty states render guidance.
- [ ] Open each dashboard dialog (create, configure, memory, workflow) and ensure they center, scroll, and close correctly.
- [ ] Validate workflow builder tabs switch without layout jumps and prebuilt workflow previews expand/collapse smoothly.
- [ ] Trigger offline mode via DevTools, confirm cached data renders, and that sync banner appears when returning online.
- [ ] Run through a full agent edit flow and confirm toast notifications render.

## Mobile Web (Responsive / PWA)
- [ ] Inspect dashboard in emulated mobile viewport; action buttons stack vertically with full-width tap targets.
- [ ] Ensure dialogs respect safe-area spacing, avoid overflow, and support vertical scrolling for long forms.
- [ ] Validate AgentCard actions collapse into single-column button stack.
- [ ] Test touch interactions on workflow step controls (add/remove) to verify target sizes.
- [ ] Confirm offline banner messaging appears and that create/update actions queue without errors while offline.

## Android (Capacitor)
- [ ] Build with `npm run cap:android` and open in Android Studio; confirm plugins initialize without runtime errors.
- [ ] Test push notification registration path (mock token retrieval) and ensure permission prompt surfaces.
- [ ] Verify background runner hook keeps cached agents fresh after returning from background.
- [ ] Exercise offline/online transitions on device, ensuring pending updates sync when connectivity returns.
- [ ] Navigate between dashboard and agent detail via hardware back button without crashes.

## iOS (Capacitor)
- [ ] Build with `npm run cap:ios` and run on simulator/device; ensure splash settings and dark background render.
- [ ] Confirm push notification authorization request appears on first launch and respects presentation options.
- [ ] Test background fetch by sending the app to background, then relaunch to verify pending sync completion.
- [ ] Evaluate dialog interactions with VoiceOver enabled to ensure focus traps work.
- [ ] Validate offline cache persists after force-quit and relaunch.

## Desktop (Electron)
- [ ] Run `npm run desktop:dev` to validate hot reload and window creation.
- [ ] Ensure window min/max constraints, dark background, and devtools toggle operate as expected.
- [ ] Build package with `npm run desktop:build`; install artifact to confirm local file loading without server.
- [ ] Verify offline caching works when the desktop app is launched without network access.
- [ ] Test navigation, dialogs, and workflow editor using keyboard shortcuts (Tab, Enter, Escape).

