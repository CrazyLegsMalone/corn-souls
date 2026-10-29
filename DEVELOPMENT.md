## Crowbar hand mount correction (2026-10-29 — Test v23)
- User confirmed the **pegboard mounting is correct** and MUST NOT be changed in this fix.
- User supplied screenshots showing first-person hook placement still awkward and third-person crowbar sideways across the avatar's head.
- Root cause confirmed from live main source: `toolItem()` already sets `m.rotation.y = Math.PI / 2` and `m.position.z = -L * 0.35`; test injection had applied an additional `visual.rotation.y=Math.PI/2`, doubling the yaw.
- In `test/index.html` commit `667e2cf`: removed the redundant local yaw in third-person, kept `visual.rotation=(0,0,0)` and scale 0.74; matched first-person grip at `q.position=(0.14,-0.13,-0.67)`, scale 0.88, rolled the claw 180° about the local shaft so the tip should point away from the player. **Pegboard's transform was verified unchanged.**
- Test URL: https://crazylegsmalone.github.io/corn-souls/test/index.html?v=23
- JavaScript syntax checked; browser-visible position STILL needs screenshot validation. Do not publish to live until user approves both handheld views.

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

## Crowbar decision — 2026-10-29
- **Owner chose ONLY hvarley's "Horror Game Crowbar".** Remove the alternate clean and Bendy-named models from active test/game selectors. Do not restore the other models unless asked.
- Test page: https://crazylegsmalone.github.io/corn-souls/test/index.html?v=12 . The preview now uses one local GLB file picker for `horror_game_crowbar.glb`, with the hook rolled 180 degrees about the shaft axis to correct the first-person claw direction. **Orientation still needs a real gameplay visual check.**
- The prior three-way comparison details below are historical, not current instructions. No downloaded GLB was uploaded into GitHub or live game; user must choose file locally in the test page. Live gameplay stays unchanged.
- Asset registry keeps both unused models as `rejected` for provenance/audit history, and hvarley's as `candidate` pending legal/source and release credit review.

## Corn props outside scale house — local prototype (2026-10-29)
- Owner requested corn cubes placed near the scale-house door, **and a trash can filled with low-poly corn ears** outside the west entrance. Both kinds of props should be **pickup / carry / throw**, with **NO inspect feature**.
- Implemented in a downloadable test project ZIP (not committed to the game repository): `corn_souls_corn_props_test.zip`. This contains an updated gameplay `index.html` plus the two real GLBs under `assets/models/` and `CORN_PROPS_README.md`.
- Current prototype: 4 corn cubes; 1 trash can; 7 corn ears. Squeeg uses E / X / touch interact to pick up or put down, fire to throw. Basic gravity and bounce; test gameplay behavior and positioning on device before release. No educational inspect popup.
- Models: Corn Cube (tg, 12 triangles, CC BY 4.0); Corn (Low Poly) (Low Poly Fox, 94 triangles, CC BY 4.0). Exact Sketchfab URLs and license evidence are in `assets/registry.json` as **candidates**, not shipped; source author/rights verification and public credits needed before deploying.
- All ten inline scripts passed Node syntax checks. Automated browser smoke test was blocked by environment policy (local HTTP access), **so runtime is unverified**.
- **Do not assume this work is live or present on GitHub**. The repository documentation and candidate asset registry are updated; gameplay edits currently exist only in the downloadable test ZIP. When preparing to merge, review against the latest main `index.html` and avoid overwriting other changes, particularly the crowbar test work.

## Browser corn-props preview — 2026-10-29
- **Preview URL:** https://crazylegsmalone.github.io/corn-souls/test/index.html?v=13
- Implemented as a small test-only injection in `test/index.html`, building on the main version's existing Three.js and input system; **live index.html not modified**.
- West scale-house door: four throwable corn cubes, one steel trash can, seven ears. **No inspect feature**. Keyboard E/controller X/touch interaction grabs or sets down; fire throws; basic gravity/bounce.
- Placeholder corn shapes appear by default; the test has a file picker for `corn_cube.glb` and `corn_low_poly.glb` to show the **actual downloaded models without publishing binary assets**.
- The original GLBs are uploaded in the user's ChatGPT conversation and included in an earlier downloadable ZIP, not publicly hosted in GitHub. Attribution candidate entries exist in `assets/registry.json`.
- Code committed and test page signatures checked, but GitHub Pages publication and actual Android/browser runtime remain **unverified**. If it fails, inspect the loader's error and reconcile with current main game before deploying.
- Previous crowbar test code continues in the same test loader; test overlay may show both selectors. Never promote to live without owner approval and legal review.

## Corn preview startup fix — 2026-10-29
- v13 failed with "Corn source signatures changed; no patch applied." Root cause: the preview's earlier shop-spawn patch had already replaced the `P3.init(view)` startup signature, which the corn injection incorrectly required. The corn injection also previously attempted a second replacement of `root.Plant3D = {` after already consuming that target.
- **Fixed in test v14**: target the post-shop-spawn initialization and export `cornBuild` / `cornInteract` in the same replacement. Commit `d3daea5`.
- URL: https://crazylegsmalone.github.io/corn-souls/test/index.html?v=14
- Actual browser gameplay still awaits confirmation. If loading succeeds, validate placement at scale-house west entrance, pickup/carry/throw, and optional GLB file selection. The live game remains unchanged.

## Corn props Test v16 startup crash fix (2026-10-29)
- User tested v15 and reported `Uncaught SyntaxError: Identifier 'CORN' has already been declared` on Squeeg startup, followed by missing `STATIONS`.
- Root cause: original game defines `const CORN = {}` for cornfield graphics; injected props had also defined `const CORN` in the same script scope.
- Updated only `test/index.html`: renamed all 22 occurrences in corn prop injection to `CORN_PROPS_STATE`, preserving existing main game's `CORN`. Commit `ebd2bb3`.
- Preview: https://crazylegsmalone.github.io/corn-souls/test/index.html?v=16
- **Not yet runtime-verified**. If any further error appears, diagnose actual message before claiming success. Do not promote to live before confirming Squeeg startup and pickup/throw in browser.

## 2026-10-29 — Automatic asset loading, selected crowbar (pending one-time binary upload)
- Owner confirmed corn cubes and ears work with locally selected GLB files and asked to eliminate the recurring file picker. Owner **chose hvarley's Horror Game Crowbar as the official design**.
- Changed only `test/index.html` at commit `3e88581`: automatically fetch `assets/models/corn_cube.glb`, `assets/models/corn_low_poly.glb`, and `assets/models/horror_game_crowbar.glb`. File input remains as an emergency fallback. Fixed test label to "CORN PROPS — TEST". These paths are relative to base href root.
- Created `assets/models/README.md` to establish the GitHub upload directory.
- **IMPORTANT PENDING ACTION:** The three optimized binary GLBs are **not yet in the GitHub repository**. They must be uploaded to `assets/models/` once by the project owner or a tool that supports binary GitHub upload. Until then, the test page will report HTTP 404 and users can use file pickers. Do not claim autoload works yet.
- Optimized sizes: corn cube 5,836 B, corn ears 7,564 B, horror crowbar 18,940 B. Original downloads are in previous conversation.
- **Live `index.html` still contains the original crowbar.** Owner approval to make hvarley's crowbar official is recorded here, but the live source update and proper player-visible CC BY attribution have NOT been completed. Implement them after verifying binary hosting and runtime, and keep unrelated gameplay unchanged.
- Original model licenses shown in embedded metadata as CC BY 4.0; include credit + model source + modification details. Preserve the existing asset registry.

## Sandbox prop polish preview — 2026-10-29 (commit c80aac4)
- Owner requested **items 2, 3 and 4 only** from the suggested polish list. **Do not change the ear arrangement in the trash can** unless separately requested.
- In `test/index.html`, the existing `updateGun()` first-person visibility predicate now hides the current weapon/tool while `CORN_PROPS_STATE.held` is truthy; normal visibility resumes after putting corn down or throwing it. Controls and physics unchanged.
- Removed preview HUD labels and both file-picker panels. Real `corn_cube.glb`, `corn_low_poly.glb`, and `horror_game_crowbar.glb` are loaded silently from `assets/models/`.
- Corn cubes remain textured novelty blocks, now with a dark-green reinforced edge outline so they do **not** resemble realistic bulk kernels. No inspect action or educational popup.
- Test URL: https://crazylegsmalone.github.io/corn-souls/test/index.html?v=18
- **Only test-page code changed; live `index.html` unchanged. Browser runtime and Android validation still required.** No asset licensing status changed.

## Vehicle enter/exit character visibility test (2026-10-29)
- Report: third-person Squeeg character remains visible at the entry point when driving away in a car.
- Cause found in source: `updateSelfAv()` hides `VIEW.av` while `walk.drive` is true, but is called by `walkCam()`; the drive camera bypasses `walkCam()`, leaving the last character pose rendered.
- **Test-only v22 fix:** in `test/index.html`, patch `utvEnter()` immediately after `walk.drive = true;` with `if (VIEW.av) VIEW.av.visible = false;`. Both Ranger and drivable cars use `utvEnter()`. The normal walking-camera update restores the character after exit.
- Test: https://crazylegsmalone.github.io/corn-souls/test/index.html?v=22 ; commit `7f38135`. Validate entering/driving/exiting cars and Ranger, including both camera views. **Live index.html unchanged; visual runtime test pending.**

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
