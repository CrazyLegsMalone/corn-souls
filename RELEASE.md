# Corn Souls — release workflow

Two channels, one repository, both on `main`:

| Channel | URL | Files | Installed from |
| --- | --- | --- | --- |
| TEST | https://crazylegsmalone.github.io/corn-souls/test/ | `test/` | Edge |
| LIVE | https://crazylegsmalone.github.io/corn-souls/ | repo root | Chrome |

**`test/` is the single source of truth.** LIVE is *generated* from it — never
hand-edited — so the two channels cannot drift.

## The loop

1. **Change TEST only** — `test/game.html`, `test/index.html`, or a helper in `test/`.
2. **Bump the TEST version** — double-click `BUMP TEST VERSION.bat`
   (or `python scripts/bump_test_version.py`).
   Bumps `TEST_VERSION` and `corn-souls-test-shell-vN` so every installed TEST app
   clears its cache and reloads into the new build.
3. **Commit + push.** GitHub Pages publishes `/test/` in about a minute.
4. **Test on PC, RP6, and RP Nova** (see checklist below). Devices update by
   themselves on open/focus. If one is stuck, open
   `https://crazylegsmalone.github.io/corn-souls/test/refresh.html`.
5. **Bad?** Go back to step 1. **Good?** Continue.
6. **Promote** — double-click `PROMOTE TEST to LIVE.bat` and enter the new LIVE
   version (e.g. `1.99`). This regenerates, with assertions on every step:
   `game.html` (copy), `index.html` (generated from `test/index.html`),
   `version.json`, `refresh.html`, the LIVE cache bump, and the assertions in
   `test/validate-live-promotion.cjs`.
7. **Local check** — double-click `Start Corn Souls local test server.bat`,
   confirm the version and that the game boots.
8. **Commit + push**, then poll
   `https://crazylegsmalone.github.io/corn-souls/sw.js` until it reports the new
   cache name.
9. **Confirm on one device** that LIVE shows the new `Alpha vX`.

## Per-device checklist (TEST)

- [ ] Version badge reads the number you just pushed (`TEST vX`)
- [ ] Spawns in the maintenance shop, first person, world renders
- [ ] Walk around; walls and props still collide
- [ ] Enter and exit a vehicle
- [ ] Menu opens, Developer Inbox opens once
- [ ] Geometry change → walk the area, no clipping / missing floor
- [ ] Audio change → listen at the affected station
- [ ] Two-player change → host on one device, join with the 5-letter code on another
- [ ] Anything odd → `Message Developer` note with a screenshot

## Commands (if you prefer the terminal)

```powershell
python scripts/bump_test_version.py             # step 2
python scripts/check_launcher_anchors.py        # verify patch anchors
python scripts/sync_test_to_live.py --check     # prove LIVE == generated from TEST
python scripts/sync_test_to_live.py --live-version 1.99   # step 6
python scripts/sync_test_to_live.py --consistency         # LIVE version/cache wiring
```

Test suites, and the directory each must be run from:

| From repo root | From `test/` |
| --- | --- |
| `test/validate-live-promotion.cjs` | `validate-west-wing.cjs` |
| `test/validate-traffic.cjs` | `validate-windsocks.cjs` |
| `test/validate-acid.cjs` | `validate-mcc-extinguisher.cjs` |
| `test/validate-npc.cjs` | |
| `test/validate-door-audio.cjs` | |
| `test/validate-notes.cjs` | |
| `test/validate-sound.cjs` | |

`validate-npc.cjs` also requires a clean working tree: it asserts `index.html`
matches `git show HEAD:index.html`.

## Rules that prevent failures we have actually hit

1. **Never hand-edit LIVE `game.html` / `index.html`.** Generate them; that is how
   the TEST-only wind readout leaked into LIVE Alpha v1.98.
2. **Wrap TEST-only debug code** in `// <TEST-ONLY>` … `// </TEST-ONLY>`.
   The generator strips those lines, so new debug aids can never reach LIVE.
3. **Bump the TEST version on every TEST push**, or devices keep the old build.
4. **Bump the LIVE version and cache on every promotion.** `--check` fails if
   `version.json`, `sw.js`, `refresh.html` and the validator disagree.
5. **Never `git add -A`.** Unregistered GLBs sit in `assets/models/`; stage files
   explicitly. Unvetted models belong in `test/models/`.
6. **Do not rename** manifest ids, scopes, app paths or worker files — installed
   icons depend on them.

## Automation

`.github/workflows/validate.yml` runs on every push:

- **blocking** — every launcher patch anchor still matches the game source
  (`check_launcher_anchors.py`), and the LIVE version/cache wiring is consistent.
- **blocking** — the ten Node gameplay suites, executed on GitHub's Node because
  this development machine has none installed. All ten pass (first green run:
  `7d584ac`).

`validate-inbox.cjs` is excluded from CI: its mock lacks `window` for the existing
`inboxOpen` page navigation. That is a pre-existing test gap, not a game bug.
