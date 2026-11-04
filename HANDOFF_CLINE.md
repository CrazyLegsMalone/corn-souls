# Corn Souls: handoff for Cline

Written 2026-11-04, at TEST **v1.97.147** (commit `45d4bb4`, branch `main`). LIVE has not been touched in this run of work.

## 1. Ground rules (the owner's standing instructions)

- **Work in TEST only.** TEST lives in `test/`. LIVE is the repo root (`game.html`, `index.html` and the rest).
- **Never promote TEST to LIVE without the owner's explicit approval.** Do not run `scripts/sync_test_to_live.py` or `PROMOTE TEST to LIVE.bat` unless the owner says so.
- **Do exactly what the owner asked.** For example, they asked for one grain pile and rejected a second one. Don't add extras. Ask if something is unclear.
- **Ship each change separately:** version bump, changelog entry, full test run, commit, push to `main`.

## 2. Layout

| Path | What it is |
|---|---|
| `test/game.html` | The whole TEST game (~15,300 lines, three.js inlined). This is the file you edit. |
| `test/index.html` | Launcher. It patches `game.html` at load using anchor strings, so `scripts/check_launcher_anchors.py` must pass after edits. |
| `test/sw.js`, `test/refresh.html` | Service worker and cache. The bump script updates them. |
| `test/validate-*.cjs` | Node test suites (no browser). They slice `game.html` by marker strings and run real game code in `vm` with three.js. |
| `.github/workflows/validate.yml` | CI. It lists every suite that runs, so **add new suites to the list there**. |
| `DEVELOPMENT.md` | Changelog. The newest entry goes at the **top**. |
| `assets/`, `assets/registry.json`, `CREDITS.md` | Models and textures. Edit `registry.json` by inserting text, not by reformatting the file. |

## 3. Workflow for every change

1. Edit `test/game.html` and add or update a `test/validate-*.cjs` suite for the change.
2. Bump the version: `python3 scripts/bump_test_version.py > bump.txt 2>&1`. Redirect the output, because piping it raises BrokenPipe. It updates `test/index.html`, `test/refresh.html` and `test/sw.js`, and bumps the cache name.
3. Add a `DEVELOPMENT.md` entry at the top, in the same style as the existing entries. Use the heading `## TEST v1.97.148 — <plain summary> (date)`, quote the owner, list what changed and how it was verified, and end with the version/cache bump line.
4. Run all suites the way CI does. Each step in `validate.yml` has its own `working-directory`: some loops run from the repo root, the main loop from `test/`.
   ```bash
   python3 scripts/check_launcher_anchors.py
   cd test && for f in validate-*.cjs; do node "$f" >/dev/null 2>&1 && echo "PASS $f" || echo "FAIL $f"; done
   ```
   The loop above also runs `validate-inbox.cjs`, which CI deliberately skips because its mock is broken. **That failure is expected and not yours.** Run the files listed in `validate.yml` for the authoritative result. All 43 suites listed in CI pass at v1.97.147.
5. Commit only the files you changed, with a clear message. Then push: `git push origin HEAD:main`.

## 4. Pitfalls that have bitten before

- **No `//` comment in the middle of a line that has code after it.** Many lines in `game.html` are long one-liners, and a `//` swallows every statement after it. This happened twice: once in the title `go()`, and in v1.97.147 it hid the `O.cars` skip. Put new statements on their own line or before the comment.
- **Tests slice the source by exact strings**, such as the init line `buildBillboards(); buildDirtHills(); buildGrainPiles(); exitSignsForEgress(); meshDoorsBuild(); lightBuild(); ribAll(); mergeStatic();`. When you change a pinned line, grep `test/validate-*.cjs` for it and update the tests.
- **CSS is partly global.** Splash and title classes must not clash with the game's global class names; `validate-title.cjs` checks this.
- **There is only one `function frame(now) {`.** Other suites slice the game at it. The title scene's loop is named `tFrame`.
- **`validate-live-promotion.cjs` runs `validate-traffic.cjs` against the LIVE files**, which are older. `validate-traffic` is dual-mode for that reason (marker `"t.net==='them'||t.isCritter||"`).
- **Cross-realm objects:** in `vm` tests, `deepEqual` across realms fails. Compare with JSON or by fields.
- **Headless browser checks** (optional): serve the repo root with `python3 -m http.server`, open `test/game.html` in Playwright/Chromium, and use `Plant3D` / `Plant3D.dbg` for internals. Keys on the splash go to a leftover listener, so use `window.padKey('X', true)`. SwiftShader is slow, so compare relative timings only.

## 5. What was done this session (v1.97.131 → v1.97.147)

- **v1.97.131 and v1.97.144:** the "Cry & Dry" title screen, with a 3D bonfire and a magenta-pink title. The menu is SOLO HARVEST / HOST MULTIPLAYER / JOIN MULTIPLAYER. Settings are fixed in `var TS = {...}` and the tuner is removed. Title music is off because `TS.audio` is false.
- **v1.97.132:** every picked-up critter can be eaten (frogs, birds, lizards, rats).
- **v1.97.133 and v1.97.134:** a single natural-looking grain pile by the train that you can use as a ramp (`buildGrainPiles`).
- **v1.97.135:** 90% fewer grass tufts.
- **v1.97.136:** lit EXIT signs inside every exterior man door (`exitSignsForEgress`).
- **v1.97.137 to v1.97.141:** mesh doors on all roll-up doors, flush with the wall (`meshDoorsBuild`). Each switch has three buttons, `rollButtonPress` / `ROLLBTN`:
  - green on top: door and mesh both open;
  - yellow in the middle: door open, mesh closed;
  - red on the bottom: both closed.

  An `#iprompt` "Interact" prompt shows the west face-button glyph. Door states sync in multiplayer through the `ws.rd` / WSYNC lock `rd`.
- **v1.97.142:** the owner's pixel fire GIF is used for fires (`assets/textures/fire/`, `FLAME_ART`).
- **v1.97.143:** the owner's low-poly hydrant GLB (`assets/models/lopoly_hydrant.glb`, `hydrantModel`).
- **v1.97.145:** lit buildings no longer seem to "light up as you walk". `roomLampEven` blends `LAMP_POOL` 0.25 with `LAMP_EVEN` 0.75, weighted toward nearby lamps so local blackouts still work.
- **v1.97.146:** the equipment side panel is off (`UNIT_PANEL = false`; the code is kept).
- **v1.97.147:** the roof collision map rebuild is sliced over frames. It used to freeze the game for about 150 ms; now the worst frame is about 10 ms. See `roofMapRebuildStart` / `roofMapStep` / `roofMapGuard` and the `ROOF MAP` comment block.
  - The irrigation pivot (`O.pivot.g`), through trains and critters are left out of the map.
  - Test: `validate-roofmap.cjs`.

Full audit report (performance and other recommendations): https://claude.ai/artifact/HxUvULbcg6qnLgNrdKT8cy

## 6. Next up (owner said "then we can see about the rest")

Remaining audit performance items. **Ask the owner which one to do first:**
1. **Draw calls.** Merge or instance more static geometry, since `mergeStatic()` exists. Measure with `renderer.info.render.calls` in the fps line.
2. **The world is rendered behind the title screen.** The plant scene keeps rendering while the splash or title is up. Skip the world render (or most of it) until the player leaves the title.

## 7. Open questions waiting on the owner (don't act until they answer)

- Grain pile landings do 18–34 HP per jump. Should landings on it be softer?
- Title music is off (it follows the tuner's Audio setting). Should it come back?
- Remove the small subtitle lines under the title menu items?
- More hydrant locations?
- A touch-screen "eat" button?
- Should roll-up doors open automatically for vehicles?
- Fewer lamps in buildings, for looks? (The owner said the buildings probably don't need so many.)

## 8. Known caveats

- The first roof-map build, when walking starts, is still one-shot (~150 ms, at spawn) because collision is needed immediately.
- A few small parts sway slightly (tall structure near x -194, z -12), so a handful of roof cells vary between builds. This is harmless.
