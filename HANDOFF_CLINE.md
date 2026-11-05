# Corn Souls: handoff for Cline

Written 2026-11-04, at TEST **v1.97.169** (branch `main`). LIVE has not been touched since v1.97.130. All **53** suites listed in CI pass.

## 1. Ground rules (the owner's standing instructions)

- **Work in TEST only.** TEST lives in `test/`. LIVE is the repo root (`game.html`, `index.html` and the rest).
- **Never promote TEST to LIVE without the owner's explicit approval.** Do not run `scripts/sync_test_to_live.py` or `PROMOTE TEST to LIVE.bat` unless the owner says so.
- **Do exactly what the owner asked.** Don't add extras: once they asked for one grain pile and rejected a second. If a request is ambiguous ("cob walker", "someone nimblers", "reloading"), take the most reasonable reading, say which reading you took, and offer the other.
- **Two-player matters.** The owner asked for every feature to be synced where it affects play. When you add something, decide whether it needs syncing (see section 6).
- **Ship each change separately:** version bump, changelog entry, test suite, full test run, commit, push to `main`.

## 2. Layout

| Path | What it is |
|---|---|
| `test/game.html` | The whole TEST game (~15,800 lines, three.js r170 inlined). This is the file you edit. |
| `test/index.html` | Launcher. It patches `game.html` at load using anchor strings (semi truck sync, highway traffic, vehicle contacts), so `scripts/check_launcher_anchors.py` must pass after edits. |
| `test/sw.js`, `test/refresh.html` | Service worker and cache. The bump script updates them. |
| `test/validate-*.cjs` | Node test suites (no browser). They slice `game.html` by marker strings and run real game code in `vm` with three.js. |
| `.github/workflows/validate.yml` | CI. It lists every suite that runs, so **add new suites to the list there** (the main loop ends `... validate-headlights.cjs; do`). |
| `DEVELOPMENT.md` | Changelog. The newest entry goes at the **top**. |
| `assets/`, `assets/registry.json`, `CREDITS.md`, `assets/models/README.md` | Models and textures. When the owner sends art, add it, register it (insert text into `registry.json`, don't reformat the file), and credit it. |

## 3. Workflow for every change

1. Edit `test/game.html` and add or update a `test/validate-*.cjs` suite. Make each new check fail when the fix is reverted (try it).
2. Bump the version: `python3 scripts/bump_test_version.py > bump.txt 2>&1`. Redirect the output, because piping it raises BrokenPipe.
3. Add a `DEVELOPMENT.md` entry at the top, in the existing style. Use the heading `## TEST v1.97.170 — <plain summary> (date)`, quote the owner, cover the cause and the fix, say how it was verified, and end with the version/cache bump line.
4. Run every suite the way CI does. Each step in `validate.yml` has its own `working-directory`: some loops run from the repo root, the main loop from `test/`.
   - The reliable way: clone the repo to a temporary folder, copy your changed and new files in, commit them there, then generate a runner from `validate.yml` that wraps each `run:` step in `( cd <working-directory> && bash -e <<EOF ... EOF )`.
   - `validate-inbox.cjs` is deliberately not in CI (its mock is broken). Its failure is not yours.
5. Commit only your files, with a clear message, then push with `git push origin HEAD:main`.

## 4. Pitfalls that have bitten before

- **No `//` comment in the middle of a line that has code after it.** Many lines are long one-liners, and a `//` swallows every statement after it. This has happened more than once.
- **Tests slice the source by exact strings.** Examples: the init line `buildBillboards(); buildDirtHills(); buildGrainPiles(); exitSignsForEgress(); meshDoorsBuild(); lightBuild(); ribAll(); mergeStatic();`, and the `stepSafe(...)` frame line. When you change a pinned line, grep `test/validate-*.cjs` for it and update the tests.
- **Cross-realm arrays:** `assert.deepEqual` against arrays made inside `vm` fails. Compare with `JSON.stringify`.
- **There is only one `function frame(now) {`.** The title's loop is `tFrame`.
- **`validate-live-promotion.cjs` runs `validate-traffic` against the LIVE files**, which are older; `validate-traffic` is dual-mode for that reason.
- **three.js sprites ignore a negative scale.** This is now patched globally (`SPRITE_MIRROR`), so `scale.x = -1` mirrors a sprite. Don't remove that patch.
- **Headless checks (optional):** serve `/home/.../` with `python3 -m http.server`, open `test/game.html` in Playwright/Chromium, and use `Plant3D` / `Plant3D.dbg` (it exposes `CREEP`, `HAULER`, `VEHL`, `CSU`, `MMAP`, `CBRUSH`, `ROOFMAP`, `utv`, `walk`, `enclAt` and more). SwiftShader runs at about 1 fps, so judge stills; pose things directly rather than waiting for them.

## 5. What exists now (v1.97.131 → v1.97.169)

**Look and title**
- **"Cry & Dry" title:**
  - a 3D pixel bonfire; settings fixed in `var TS`, tuner removed;
  - menu: SOLO HARVEST / HOST MULTIPLAYER / JOIN MULTIPLAYER;
  - CORN SOULS and Cry & Dry are drawn into `#spTxt` at the bonfire's pixel size, under the CRT lines;
  - the version text is 12.1px; the footer is gone.
- **The plant isn't drawn behind the title (v149).**
- **Lighting:** `ENCL` building envelopes plus a lighting shader (`csLight`, uniforms in `CSU`).
  - Rooms get an even fill (`roomLampEven`), with a third as many fixtures.
  - The walker's headlamp is `csFl*`. **Vehicle headlights (v169)** are a second spot, `csHl*`, set by `vehLights()` from the nose of the Ranger, a car or the mower.
- **Grass:** the base plane is a graded grid (`grassGeometry`), with hole patches refined to edges of 40 m or less (`grassRefine`). This fixed the green flicker; the old 16 km slivers were the cause. It uses a flat-plane raycast (`grassRaycast`). Big ground planes are cut into ~30 m cells (`GSEG`). Grass tufts are at half density.
- **Fire art** is the owner's GIF (`FLAME_ART`). The **hydrant** is the owner's GLB.

**Plant and buildings**
- **Mesh doors** inside every roll-up door, with a switch: green = both open, yellow = door open and mesh closed, red = both closed (`rollButtonPress`, `ROLLBTN`).
- **EXIT signs** inside every exterior man door. The **grain pile** by the train is a single pile.
- **Yeast cooler readout** sits 1 cm proud of its housing (v157). The equipment side panel is off (`UNIT_PANEL = false`).
- **Roof collision map:** the 12 s rebuild is sliced over frames (`roofMapRebuildStart` / `roofMapStep`). `roofMapSkip()` is the shared "moving things" skip list.

**HUD**
- **Mini map:** `#mmap`, bottom right; 118 px, lifted to 24vh to clear the gun magazine. On a phone it sits above the buttons.
  - Its picture is baked one tile a frame and unlit (`mmapBakeStart`).
  - The pause menu has an on/off toggle (`cs_minimap`), and the other player shows as a dot.
- **Reload:** the shotgun reloads by itself only when empty; R or D-pad down reloads any time; phones still top up after a pause (v167).

**Creatures**
- **Cob stalkers and Daddy Cob Legs** (Daddy HP 30). A debug spawn puts a stalker next to you (`creepNear`, `c.free`; it hunts the nearer player anywhere).
- **Nibblers (v163):**
  - each has its own way of coming at you (`nibPersonality`, `nibHuntAt`: direct / flank / circle), and they keep apart;
  - corpses stay (30 kept);
  - kill a burst's five within 20 s, or its dead get back up as green **zombies** (`nibGroups`, `nibRevive`; snapshot kind 3).
- **Critters:** every picked-up critter can be eaten. Pigeon coos are shut out indoors (`soundShutOut`, v168). Ducks, lizards and the vulture now face the way they move (sprite mirror, v161).
- **Corn field:** stalks lean away from you, the other player and vehicles; leaves and a vignette in first person; a rustle (`cornBrushUpdate`, v165).

**Vehicles**
- **Grain haulers (v166):** the owner's eight vertex-coloured, rigged GLBs (`assets/models/grain_haulers/`) are the corn deliveries.
  - `haulerTruck`, `haulerPose` (bed tips on its rear hinge, ram, gate, pour) and `haulerUpdate` (wheel spin, and the guest's dumps).
  - The GLB reader `glbBuild` now reads `COLOR_0`.
  - The hauler colour rides the launcher's `vt` truck sync (12th field).
- **Headlights** on whatever you drive (above).

## 6. Two-player rules of thumb

- **The host runs** the creatures (`creepSnapshot` in `wsState` → `creepApplySnapshot` on the guest), the trucks (the launcher's `vt` sync), critters and the world state (power, clock, darkness, doors via `rd`).
- **The guest asks the host** for changes: `cdbg` (debug spawns, carrying the guest's position and facing), and hits via `creepNetHit`.
- **Kept local on purpose** (they don't affect play): title, grass, lighting, roof map, mini map picture and toggle, fire/hydrant art, ducks.
- **Not synced, offered to the owner:** the other player's headlights, and pigeon coos for the guest (the guest's `updateBirds` returns early).
- `validate-two-player.cjs` runs the real host and guest code together. Add new sync behaviour to it.

## 7. Open questions still waiting on the owner (don't act until they answer)

- Softer landings on the grain pile (it does 18–34 HP per jump)?
- Should the title music come back (it's off)?
- Remove the small subtitle lines under the title menu items?
- More hydrant locations?
- Should roll-up doors open automatically for vehicles?
- Sync the ducks? Show the other player's headlights? Add pigeon coos for the guest? Add a reload button on phones?
- The remaining performance items: draw calls.
