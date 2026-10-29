# Corn Souls — Development Handoff

This file is the shared development log for work done with Claude, ChatGPT, or a human developer.

## IMPORTANT FOR CLAUDE AND CHATGPT — Owner-approved creative direction (2026-10-29)

**Read this before designing or changing gameplay. These are the project owner's explicit preferences, not speculative feature requests.**

**Core identity:** Corn Souls is a **sandbox-first ethanol plant game** with **limited horror**, grounded in realistic corn and ethanol production. Keep it **simple, lightweight, and mobile-friendly**. Use natural opportunities to teach players about **corn, ethanol, and how ethanol is produced**.

**Design requirements**
1. **Sandbox first.** Let players explore, experiment, interact with equipment, drive around, and find emergent fun. Do not force a linear quest or turn normal play into a constant survival challenge.
2. **Realism without needless complexity.** Equipment, processes, terminology, and cause/effect should be credible, while controls, calculations, and presentation remain approachable and performant.
3. **Teach organically.** Prefer optional equipment descriptions, contextual NPC dialogue, signs, and feedback from experimentation over mandatory lectures or intrusive tutorials. Keep actual industrial science distinguishable from fiction.
4. **Horror is restricted to certain TIMES, PLACES, and possibly CONDITIONS.** Most of the plant and most of the time should feel like an ordinary sandbox. Horror should be localized, atmospheric, and sometimes surprising *within* its designated boundaries. It should **not** be a constant threat, random everywhere, or automatically escalate simply because the player has played longer.
5. **Protect performance.** Favor lightweight, event-driven scares and reuse existing assets over expensive systems. Keep Android performance and download size in mind.
6. **Do not invent approval for particular horror encounters, monsters, missions, or major mechanics.** Propose ideas and confirm with the owner before implementing them.

**Quick feature test:** Does this support freeform sandbox play, credible ethanol production, organic learning, or restrained place/time-based horror without making the game heavier or more complicated than necessary?

**Assistant handoff:** Claude and ChatGPT should both reread this section when resuming work, alongside the latest commits. If an implementation conflicts with these principles, ask the owner before proceeding.

## Shared browser testing page (2026-10-29)
- **Live:** https://crazylegsmalone.github.io/corn-souls/
- **Test:** https://crazylegsmalone.github.io/corn-souls/test/
- **Implementation:** `test/index.html` is a small preview loader. It fetches the live `../index.html`, applies a *preview-only* crowbar rendering patch, and runs the modified HTML. This is **not a separate deployment branch** and is **not a full copy of the game**. The preview depends on the current main game structure and an online connection.
- **For Claude and ChatGPT:** When experimenting with small code changes, update `test/index.html` instead of the main game. If the target code moves or changes, update the loader's patch and verify the preview. Do not assume a test change has reached the live game. For larger changes, consider a proper separate preview deployment rather than brittle string replacement.
- **Current test change:** red, straight, angular Half-Life-inspired crowbar texture replacing the old deep J-shaped candy-cane appearance; no gameplay mechanics intended to change.
- **Status:** Preview file committed; GitHub Pages publication and runtime behavior have not yet been verified. Do not call it tested until opened on a real browser/device.
- **Approval rule:** Ask the owner before merging a preview change into live `index.html`.

## MANDATORY — third-party asset licensing and credits (2026-10-29)
**Claude and ChatGPT: before downloading/importing ANY external model, texture, audio, font, icon, or animation, read [ASSET_POLICY.md](ASSET_POLICY.md).**
- **Single source of truth:** `assets/registry.json` (candidate → approved → in-use / rejected).
- **Shipped public credits:** `credits.html` (auto-reads in-use entries), with `CREDITS.md` as a human-readable credits record.
- Record creator, exact source link, license/version/link, evidence, modifications, permission for commercial use and public GitHub hosting; preserve license notices and mark in-use only when shipped.
- Do not silently substitute models, assume downloading conveys rights, or claim CC0/CC BY provenance is certain without verifying.
- **Horror Game Crowbar by hvarley is currently candidate only**, not installed or licensed as approved based on the screenshot.
- Before every release, reconcile registry, in-game/public credits, source files and license requirements. Existing assets need retrospective review.
- Player credits URL: https://crazylegsmalone.github.io/corn-souls/credits.html

## Crowbar three-model A/B/C test (2026-10-29)
- **Test preview:** https://crazylegsmalone.github.io/corn-souls/test/index.html?v=10
- `test/index.html` includes a lightweight GLB 2.0 parser using the game's bundled Three.js and a selector for three real creator-made models: **clean** (mahdylg, 104 triangles), **horror** (hvarley, 290 triangles) and **Bendy-named** (FurLad, 82 triangles).
- The user uploaded all three GLBs to ChatGPT. They are **not in GitHub**, because the current GitHub write connector cannot import mounted binary files. The test page lets the player choose all three GLB files directly from their computer with a local file picker, then switch between models; it also supports optional hosting at `test/models/<filename>` if independently cleared for public redistribution.
- Keep the live crowbar and gameplay unchanged until testing and user approval.
- Licensing: embedded model metadata declares CC BY 4.0, and the three models are registered as **candidates** in `assets/registry.json`. The **Bendy and the indigo ink** model explicitly references another franchise, so do not publicly host or ship it until rights to the underlying design are verified. Private comparison only for now. In-game/public credits must be added before shipping other models.
- Runtime rendering and orientation not verified on a real browser yet. Treat any visual differences or loader errors as issues to test, not established successes.

## Current baseline
- Repository: https://github.com/CrazyLegsMalone/corn-souls
- Last verified version at creation: **1.91**
- Last verified commit: `5be2e52e095127247745137a525b1a725002b180` (2026-10-28).
- The project includes a large `index.html`. The complete implementation has **not yet been audited** for this document.
- Game title: **Corn Souls**.
- Do not treat the baseline commit above as permanently current; check GitHub HEAD every session.

## Working agreement (for every assistant)
1. Read this file and check the latest default-branch commit before proposing or making changes.
2. Inspect the actual relevant source code; do not assume this document describes the implementation exhaustively.
3. Confirm the intended change with the user. Preserve existing gameplay and avoid unrelated refactors.
4. Prefer a small, focused change; test where possible, and state explicitly what was not tested.
5. Before committing, verify the branch has not moved. Do not overwrite another assistant's work or force-push.
6. After each meaningful change, update this file **in the same change/commit when possible** with the new behavior, tests, issues, and next step.
7. When switching assistants, ask the incoming assistant to read `DEVELOPMENT.md` and the latest commits first.

## Features verified
- [x] Static gameplay inventory documented below.
- [ ] Android native wrapper and runtime testing pending.
- [ ] Multiplayer and persistence behavior need live tests.

## Known issues
- No specific gameplay defects confirmed yet. Add reproducible issues here; do not mistake unverified behavior for a bug.

## Planned work / ideas
- [ ] Review project architecture and document confirmed game systems.
- [ ] Record user-requested gameplay changes as they are decided.
- [ ] Consider splitting the large `index.html` into smaller modules **only after** reviewing dependencies and deployment constraints.

## Source audit — 2026-10-29 (ChatGPT, static inspection of uploaded repository ZIP)
- Audited ZIP from commit `22d0304`, gameplay version `1.91`; 3,343,220-byte `index.html`, 11,524 lines, 10 inline JavaScript blocks.
- All 10 inline scripts passed `node --check` syntax validation. **No runtime, device, or multiplayer testing performed.**
- **Genre:** interactive 3D ethanol plant simulator/sandbox, not a zombie shooter.
- **Core process:** grain receiving and silos, day bins and hammermills, slurry and strainers, hydroheater/cook tubes, liquefaction, 7 fermenters, beer well, distillation, ethanol storage and shipping. Plant time is adjustable; default is one simulated minute per real second.
- **Player modes:** Squeeg first-person walking/interacting; Savior overhead plant-management view.
- **Sandbox:** NPC dialogue, cars and UTV, zero-turn mower, keys, breakable windows, tools, vehicle damage/fires, extinguisher, paint/water shotgun, climbing/parachute, wildlife and ambient interactions.
- **Controls:** desktop keyboard/mouse, controller, and mobile touch controls; 1-player and 2-player host/join menus.
- **Networking:** PeerJS/WebRTC with a dynamically loaded library from unpkg.com; connectivity and Android compatibility are unverified.
- **Deployment:** static GitHub Pages PWA; Android wrapper reportedly loads hosted URL per README, but Android native project is not included in this ZIP. Service worker is network-first with offline cache fallback.
- **Persistence:** localStorage used for notes, preferences and update markers; no full plant/game save-load system verified.
- **Simulation caveat:** `FAILURES = false` explicitly disables simulated breakdowns; do not claim strainer plugging or infections occur normally.
- **Risks / priorities:**
  1. Single-file size and inline bundled Three.js/audio assets complicate safe edits, code review and caching; separate source modules/build pipeline only with regression testing.
  2. Need actual Android device/browser FPS, memory, touch and WebGL testing; source parsing is not a runtime test.
  3. Need end-to-end multiplayer host/join/disconnect and offline behavior testing. PeerJS library is loaded over network.
  4. Verify whether full game progress should persist; current verified localStorage use is limited to notes/preferences/version markers.
  5. Review service-worker cache versioning/update transitions and the fallback response for non-navigation requests.
  6. Review dynamic HTML sinks for escaping when incorporating user or remote content.
- **Next step:** run smoke tests on desktop and Android, document exact failures, then prioritize focused fixes. No gameplay source modified by this audit.

## Change log
### 2026-10-29 — Shared handoff initialized (ChatGPT)
- Added this file to support switching development between ChatGPT and Claude.
- No gameplay code changed.
- Baseline is version 1.91; no source-code or runtime tests were performed.

## Session handoff template
Copy/update this section at the end of each work session:

- **Date / assistant:**
- **Starting commit / branch:**
- **Goal:**
- **Files changed:**
- **What changed:**
- **Tests performed and results:**
- **Known issues / caveats:**
- **Final commit / branch:**
- **Recommended next step:**

## Important
GitHub synchronizes committed files, **not** assistant conversations or uncommitted edits. Always fetch the latest state before continuing. If a user has uncommitted local work, request it before editing overlapping files.
