## TEST v1.97.73 — the ground layering is measured in depth steps, not centimetres (2026-11-01)
- Owner-reported follow-up: concrete now rendered further out but still stopped at a certain distance from the character. That distance is the depth buffer, not the geometry.
- **The arithmetic**: with `camera.near = 0.2` and `far = 9000` a 24-bit depth buffer resolves about **0.3 cm at 100 m, 2.7 cm at 300 m, 6 cm at 450 m and 10.7 cm at 600 m**. The layers were separated by 4 polygon-offset units and ~5 cm of real height, so past roughly 450 m one depth step was wider than the gap and the grass plane won - the pad vanished at exactly the distance the owner saw.
- **Offsets are now 32 units each way** (base pushed back +16/+32, every overlay pulled forward -16/-32), and the flat concrete pads went from 5.5 cm to **8 cm** of real height. 32 units is ~3 m of effective separation at 600 m and ~6 m at 800 m, which carries past the fog's far plane at 760 m - beyond that the ground is sky-coloured anyway, so nothing can be seen to fight there.
- Nothing else changes: no renderer flag, no logarithmic depth, no perceptible cost. At close range 32 units is a fraction of a centimetre, so a kerb or a bollard standing on a pad still draws over it.
- Tests pin the new offsets on both the ground materials and the pad material, and the pad height.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.73` / `corn-souls-test-shell-v100`.

## TEST v1.97.72 — every tank, equipment and door label is 25% smaller (2026-11-01)
- Owner request. All 28 nameplate call sites funnel through `nameplate()`, so the trim is one constant there: **`NAME_K = 0.75`** applied to the plate height (0.53 with a tag line, 0.34 without, times each call site's own `k`), and the plate width follows the same factor. Tanks, dryers, boilers, the cooling tower, the drive-through windows, the exit doors and every room sign shrink together.
- **Door signs are their own system** (`doorSign()` -> `signFace()`, the painted plates over the process-building doorways such as COOK ALLEY / BREAK ROOM / LAB / SERVER) and had a fixed plane of 1.15 x 0.25 m; those now use `1.15 * NAME_K` by `0.25 * NAME_K` so they match.
- Nothing else moved: the canvas resolutions are untouched (so the text is crisper per pixel, not blurrier), the standoff distance from the wall is unchanged, and every plate stays exactly where it was. To go bigger or smaller later it is one number.
- Tests: `validate-west-wing.cjs` compares every office object against the previous build, so door-sign plates are now explicitly exempted as *resized* (they are the same sign in the same place, just smaller) and the sandbox gained the `NAME_K` constant.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.72` / `corn-souls-test-shell-v99`.

## TEST v1.97.71 — the vending buttons just dispense (no menu, no toast) (2026-11-01)
- Owner request: pressing a button on the machine should dispense what that button sells, instead of opening a menu and announcing it.
- **The cabinets carry real button nodes**, so those are what you press: `SELECT_POPCORN` / `SELECT_CORN_CHIPS` / `SELECT_ROASTED_CORN` on the Shifty Food machine, `MILO_RADE_SELECT_BUTTON` / `..._SECOND` and `WATER_SELECT_BUTTON` on the Milo-Rade machines. `loadVendMachine()` registers them per machine (`M.buttons`), hides the Milo-Rade preview can as well as the snack ones, and keeps the cabinet as a raycast target (`M.root`).
- **`vendPress()`** (engine) casts from the crosshair into the cabinet at 4.2 m: it walks up from whatever was hit to see if a button is an ancestor (so a caption label counts as its button, as the package instructs), dispenses that item, and returns which one - including the `water` flag for the joke. Aim at the cabinet anywhere else and it dispenses the first thing on the menu; look away from it and X does nothing.
- **The menu is gone.** `vendX()` in the UI block is now: pick up a packet off the floor if one is underfoot, otherwise press. Dispensing is silent - the flap swings and the packet lands in front of the machine. The only remaining line of dialogue is the WATER button's, because that is the joke.
- Tests: the buttons are registered by node (all three Shifty, both Milo-Rade, the WATER one separately), the press raycasts and refuses when the cabinet is not in view, the pick falls back to the first button, the selection menu no longer exists anywhere in the build, and nothing announces a dispense.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.71` / `corn-souls-test-shell-v98`.

## TEST v1.97.70 — performance audit, and the frame rate now caps at 144 (2026-11-01)
- **Frame cap 144** (`FPS_CAP`). `requestAnimationFrame` runs at the display's rate - 165 Hz on the owner's PC - and the loop rendered every tick. It now uses a **deadline accumulator** (`fpsAcc += frame time; paint when it clears 1000/144; keep the remainder`), so it settles at the cap rather than halving to 82 on a 165 Hz screen; a skipped frame still schedules the next one, and the simulation reads its own clock, so the skipped time simply lands as slightly larger `dt` on the next frame (already clamped to 0.1 s). Set `FPS_CAP = 0` to disable.
- **Audit of what the imported models actually cost.** Every part of a glTF model is a submission, and `glbBuild` marks each one `castShadow`, so every part is drawn twice. What was still unbatched:

| Model | Parts | Submissions before | After | Saved |
|---|---|---|---|---|
| NPC rigs (Vern 101, Rick 62, Brenda 60, Tammy 59) | 282 | **564** | ~60 | **~500** |
| Cooling tower | 83 | 166 | ~26 | **~140** |
| Vending machines (2 snack + 2 Milo-Rade) | 48 + 38 | 86 | 43 | **43** |
| Boiler x2 | 516 | 1032 | 22 | 1030 (v1.97.60) |

- **NPC rigs are folded after posing.** `mergeModel()` runs at the end of `loadCharacter()`: the pose is the last thing that ever moves those parts (`npc.model` is only ever hidden, never animated), so they become one mesh per material and stop casting shadows. Verified against the real Brenda GLB: **60 parts -> 15 meshes, 60 -> 0 shadow casters**, bounding box drift 2.3 cm on the min corner only - that is three vertices the index buffer never referenced, so nothing that was being drawn.
- **Cooling tower shell folded, fans kept.** `mergeModel()` gained an optional `skip(o)` predicate so a mostly-static model can be batched while its moving parts stay addressable: the shell goes 83 -> ~9 while the four `Fan_Rotor_*` nodes are untouched, and shadows are kept because it is a large outdoor structure.
- **Vending machines out of the shadow pass** (indoors, static, and they cannot be merged because `DISPENSED_*` / `SNACK_DISPENSER_FLAP` must stay nodes).
- **Left alone deliberately, with reasons**: the player rigs (up to three avatars x 101 meshes, already shadow-free; limbs animate, so they cannot be merged wholesale - per-pivot merging would take them to ~25 each if the budget ever needs it), the vulture (animated joints), and the pixel-ratio cap of 1.5 (the biggest remaining mobile lever, already written down in `LIGHTING.md`'s Low tier).
- Tests pin the cap (constant, accumulator, and that a skipped frame reschedules), the NPC merge and its comment, the vending shadow flag, the tower `skip` merge and the `mergeModel` signature.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.70` / `corn-souls-test-shell-v97`.

## TEST v1.97.69 — the power outage is world state now, so both players see it come back (2026-11-01)
- Owner-reported in 2 player: the host started an outage from the debug menu, the other player closed the main breaker, a toast said power was restored - but the egress strobes kept blinking and the interiors stayed dark on the other side.
- Cause: `POWER_OUTAGE.on` was **per-client**. `setPowerOutage()` was called by whoever pressed the button (debug menu, or `powerResetAction()` at the substation) and nothing told the other PC, so each side could sit in a different world. The toast came from the side that acted; the strobes and the interior dimming come from `POWER_OUTAGE.on` on the side that did not.
- **`powerSet(on)`** is now the single way the plant supply changes: it applies locally through `setPowerOutage()` and sends `{ t: 'po', on }` when connected. The breaker reset (`powerResetAction`) and both debug-menu rows go through it, and `Plant3D.powerSet` is exposed for the menu.
- **The other side applies what it hears** (`m.t === 'po'` -> `setPowerOutage(!!m.on)`). `setPowerOutage()` already returns early when the state has not changed, so a state that already holds - or the echo of your own message - is a no-op: no loops, and the restore path (fixtures, screens, the interior daylight pass, the egress strobes) runs on both sides.
- Tests: `validate-power-outage.cjs` pins the new path (one setter, it sends, the breaker and both debug rows use it, the receiver applies it), the debug-row count now counts `P3.powerSet(`, and the machines sandbox gained offline `NET`/`netSend` stubs.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.69` / `corn-souls-test-shell-v96`.

## TEST v1.97.68 — the flat concrete pads stop losing to the grass at distance (2026-11-01)
- Owner-reported: concrete surfaces only showed up to a certain distance from the player. The concrete pads (the station pads and the pad under the fermentation area) are **thin flat planes lying on the ground** drawn with a shared, offset-free `mat(c)` - the one ground-overlay family that never got the layering treatment in v1.97.65. A few hundred metres out they lose the depth fight with the grass base plane and the grass wins, so the concrete appears to stop.
- Each pad now gets **its own material** (`padMat(c)` - a clone of the palette colour with `polygonOffset` -4/-8 pulling it forward) so the shared `mat()` palette stays untouched, and the pads moved from 4.5 cm to **5.5 cm** above the grass, clear of the dirt (3.5) and asphalt (2.4).
- **Ground textures keep their detail further out**: `groundTex()` anisotropy went from a flat 4 to `min(8, maxAnisotropy)`, which matters on ground seen at grazing angles for hundreds of metres - the mip chain was collapsing to flat colour well before the terrain ended.
- Tests pin the pad material (own clone, offset -4/-8, shared palette untouched, 5.5 cm) and the anisotropy line.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.68` / `corn-souls-test-shell-v95`.

## TEST v1.97.67 — hotfix: the vending interaction called UI helpers from the engine block (2026-11-01)
- Owner-reported on v1.97.66: pressing X at a machine (the water can on the floor beside it) threw `TypeError: toast is not a function`.
- Cause is the same cross-block trap as v1.97.61: `toast()`, `modal()` and `unlockMouse()` live in the **UI script block**, while the vending engine block is in the **engine script block**. The engine can only call `*_NOTIFY` callbacks the UI installs, or expose data and let the UI act. My first cut called all three directly, so collecting a packet (and opening the menu) threw.
- **Split along the seam the rest of the game uses.** The engine now exposes data and actions - `P3.vendPickNear()`, `P3.vendTake(p)`, `P3.vendMachineNear()`, `P3.vendDispense(m, file, name)` and `P3.vendSnacks` - and knows nothing about talking to the player. `vendX()` in the UI block does the interaction: pick up what is on the floor ("Collected &lt;name&gt;"), or open the machine's `modal` with the three snacks or Milo-Rade/Water. `unlockMouse()` moved there too.
- Behaviour is unchanged otherwise: flap swings, the labelled standalone model drops in front of the cabinet, X collects it with a running count, repeat presses are ignored while one is in the air, and the WATER button still refuses water and drops a Milo-Rade can.
- **Guard added so this class of bug fails the suite**: `validate-power-outage-machines.cjs` now scans the vending engine block and asserts it contains no `toast(`, `modal(` or `unlockMouse(` call, and that the UI side is the one doing the talking. The engine/UI split of the whole checkout is the same rule that bit us with `renderer.info` in v1.97.61.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.67` / `corn-souls-test-shell-v94`.

## TEST v1.97.66 — the Shifty Food snack machine, its snacks, the Milo-Rade cans and the water can (2026-11-01)
- Owner's `shifty_food_cline_package` integrated. Six models are now shipped and registered as first-party work (owner-directed, generated with ChatGPT): the **Shifty Food cabinet** (`shifty_food_machine.glb`, 29 nodes / 24 meshes / one embedded label PNG / the three `Dispense_*` clips), the three snack packets (`shifty_popcorn`, `shifty_corn_chips`, `shifty_roasted_corn`), the **Milo-Rade can** and the **water can**.
- **The flat box snack machines are gone.** `loadVendMachine()` puts the real cabinet in the **process break room** (where the black box and its glass panel stood, front facing +Z) and in the **scale-house tech room** (in that building's shifted coordinates), feet snapped to the floor from its own bounds, collider registered, and no shadow casting. The break room box is recorded in `validate-west-wing.cjs` as an intended replacement, the same way the soda machines were.
- **Dispensing.** X within 2.8 m of any machine opens its menu: the three snacks from the Shifty Food cabinet, `Milo-Rade` and `Water` from both Milo-Rade machines. Picking one swings `SNACK_DISPENSER_FLAP` for half a second (the packaged glTF clips are *not* used - this game's reader has no animation mixer and the flap is driven procedurally instead), then the matching **labelled standalone model** drops onto the floor in front of the machine. X within 2.6 m picks a dropped item up and toasts it with a running count. One press at a time: `VEND.busy` ignores repeat clicks until the packet has landed.
- **The WATER joke survives**: the WATER button still reports that it is out of order and dispenses a Milo-Rade can anyway. `water_can.glb` is a **separate** item, standing on the floor beside each snack machine - the vending machine never stocks it, per the package's instruction.
- **No duplicate packets**: the machine's `DISPENSED_*` preview nodes stay hidden and only the standalone model is spawned, so a selection can never leave two visible items. The embedded preview's `.001` hiding scale is never copied onto a spawned prop.
- The machine itself is deliberately **not merged**: `DISPENSED_*` and `SNACK_DISPENSER_FLAP` have to remain addressable nodes. The stand-alone props *are* merged (static, indoors) so each costs one draw per material.
- The X handler keeps the exact line the TEST launcher patches (`const r = P3.kiaToggle() || P3.radioToggle()`); the vending check sits on its own line above it, which is why `validate-traffic.cjs` (which runs the launcher's patch table) still passes.
- Assets: six entries in `assets/registry.json` (23 total), `CREDITS.md` and `assets/models/README.md` updated. Tests parse all six GLBs (clip names, interaction nodes, embedded PNGs) and pin the placement, the WATER joke, repeat-click prevention, the separate water can, the unmerged machine and the launcher anchor.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.66` / `corn-souls-test-shell-v93`.

## TEST v1.97.65 — ground and floor layering: no more green flicker through the dirt (2026-11-01)
- Owner-reported: some ground textures outside the process area flickered green. Cause is z-fighting, and it was built in: the world is one grass plane at **y 0** with dirt/asphalt planes a couple of centimetres above it, separated only by **one unit of polygon offset** (`polygonOffsetFactor/-Units = -1`) on everything except grass. With `camera.near = 0.1` against `far = 9000` the depth buffer has almost no resolution a few hundred metres out, so those layers interleave and the grass shows through.
- **The rule is now explicit in `groundMat()`**: grass is the base layer and is pushed **back** (+4/+8), every overlay is pulled **forward** (-4/-8), and polygon offset is enabled on all of them. Four units instead of one is what survives the depth range at distance.
- **Real gaps, not slivers**: the dirt yard and the pit pad went from 1 cm to **3.5 cm** above the grass (1.1 cm clear of the asphalt too); the station and fermentation concrete pads from 1.5 cm to **4.5 cm** (they are plain shared materials with no offset of their own, so they needed the physical separation); the scale-house **tile floor** was 2 cm thick and centred at `FY + 0.01`, i.e. its underside sat exactly on the floor slab's top face - it now clears by 5 mm.
- **`camera.near` 0.1 -> 0.2 in walk mode**, which halves the depth range and is the single biggest win for coplanar ground at distance. Nothing held is affected: the first-person weapon is drawn in `hudScene` with its own `hudCam` (near 0.01).
- Audited the rest while there: building floors (`concreteFloor`, the receiving slab, the process/shop slabs) are 10 cm boxes with their undersides above the site slab, so they were never coplanar; road markings and pads all sit above the asphalt.
- Tests: `validate-power-outage-machines.cjs` now pins the layering rule (base pushed back, overlays forward, four units), each layer's new height, the tile-floor clearance, the near plane, and a strictly-increasing bottom-to-top ordering of grass < asphalt < dirt < pads.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.65` / `corn-souls-test-shell-v92`.

## TEST v1.97.64 — the box body is removed rather than hidden, and player rigs stop casting shadows (2026-11-01)
- Owner-reported in 2 player: "my character shows the original Squeeg model plus another yellow character over it", while Player 2 looked right - and fps was bouncing.
- **The box body is now REMOVED, not hidden.** `dressPlayer()` used to set `visible = false` on every part marked `userData.body`. If anything ever set `visible` back - or if a rig failed to arrive for one avatar - that avatar kept its old box and read as the original Squeeg while another player's rig stood in the same spot. The parts are now detached from the avatar entirely, so no later `visible` write can resurrect them. Held items live in their own groups and are untouched.
- **Never dressed twice.** `dressPlayer()` records the rig on the avatar (`av.userData.rig`) and removes any previous one before adding the new, so a rebuild can't stack two characters on one body.
- **A failed dress is now loud.** The rig arrives through a promise that swallowed exceptions, so a throw left a box avatar and no message. `dressPlayer` now catches and warns `[player rig] dressing failed, the box avatar stays: <message>`.
- **The local avatar self-heals.** `buildSelfAv()` only rebuilt when the player identity changed, so an avatar that somehow ended up without a rig stayed a box for the session. It now rebuilds if the avatar has no rig - guarded by `VIEW.pending` so it does not thrash while the model is still downloading, with an 8 s timeout so a failed load retries instead of sticking.
- **fps: player rigs no longer cast shadows** (`castShadow = false`, `receiveShadow = false` on every rig mesh). A dressed avatar is 101 meshes; with shadows on, each one was submitted twice - up to ~600 submissions for three dressed avatars in a 2-player session. They still light correctly, they just stop adding a second pass. If fps is still short, the next lever is merging each rig's parts inside its own pivot (the limbs are rigid within a pivot, so 101 meshes can fold to roughly 25).
- Tests: the dressing assertions now check the box is removed rather than hidden, that a second dress replaces the rig, and the functional test dresses two avatars from the real GLB and asserts no `userData.body` part survives on either.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.64` / `corn-souls-test-shell-v91`.

## TEST v1.97.63 — ride along: one drives, the other sits beside them (2026-11-01)
- Requested: two players should be able to ride in the same vehicle, one driving and one as passenger. Until now the only 2-player vehicle interaction was `swapRangers()` - hop into the other player's **parked** Ranger and take it off them.
- **The seat already existed.** The Ranger is a side-by-side (`makeRangerMesh` is 1.45 m wide with the driver at x -0.3), so `seatPassenger()` puts a seated body at **x +0.34** - the other half of the bench - and dresses it with the rig exactly like `seatDriver()` does.
- **Boarding** is folded into `rideToggle()` (the X action that already owns getting in and out): with the other player **driving** and their Ranger within 3.4 m, X puts you in the passenger seat and returns "Riding along beside them". X again steps you out. Your exit is placed 1.1 m to the side of the vehicle rather than inside it.
- **While riding**, `walk.pass` replaces walking in the frame loop (`else if (walk.pass) passUpdate(dt)`), so physics, collision and your own walking are all skipped: `passUpdate()` reads the seat from the vehicle's own world matrix (`passSeat`) and pins position and heading to it every frame. The camera is the normal first-person one, so you can still look around. Your third-person body is hidden while you ride.
- **Both directions are synced with one flag.** The 15 Hz player message now carries `ps: !!walk.pass`. The other PC reads it into `R.ps`, hides their standing avatar (`R.av.visible` gained `&& !R.ps`) and seats them in **their own** passenger seat via `seatPassenger(utv.g, VEST_COL[...])`, so each side draws the rider in the right vehicle with the right vest colour without sending any seat coordinates. Clean-up is automatic: if the driver gets out (`!Q.drive`) or the passenger dies or leaves walk mode, `passExit()` fires and tells the other side.
- Tests: `validate-power-outage-machines.cjs` pins the seat offset (opposite side to the driver), the `walk.pass` flag, the frame-loop branch, the seat-from-world-matrix maths, the both-way exit, the `ps` flag on the wire and the seated-avatar swap - plus the updated dressing count (five avatars now: 2P remote, own third person, Ranger driver, mower rider, passenger).
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.63` / `corn-souls-test-shell-v90`.

## TEST v1.97.62 — the players wear the operator rig too, tinted per player (2026-11-01)
- Owner-spotted: in 2-player both players were still the old box avatars while the NPCs had real models. The players were built by `makeCharacter()` in four places - `netRemote()` (the other player), `buildSelfAv()` (your own third-person body), `seatDriver()` (Ranger/UTV) and the shed-mower rider.
- **`dressPlayer(av, vest, opts)`** puts the operator rig (`operator_vern_rig.glb`, the same rigid-part family as Vern) on any avatar: one upload cached in `PLAYER_RIG`, cloned per avatar so all of them share geometry. The box body is hidden - and only the body: every box part is now marked `userData.body`, so held items (pump shotgun, squeegee, washer wand, every tool) survive.
- **Tinted per player.** The jacket is the vest, so the material on `Torso_Jacket_Male` is cloned **per avatar** and lerped 72% toward that player's `VEST_COL` - Player 1 comes out `#f16f1a`, Player 2 `#c7c81d`. The clone is the point: a shared material would have recoloured both players. Nine meshes under that node (jacket, lapels, cuffs) share the material, so the whole jacket takes the colour.
- **The walk cycle drives the rig.** `buildSelfAv()` hands `VIEW.legs` / `VIEW.arms` the rig's own hip and shoulder pivots once it lands (`onRig`), so the existing swing animation moves the model instead of the (now hidden) box. Seated avatars (Ranger driver, mower rider) fold thigh and knee 1.15 rad.
- Scale and facing match the box body exactly: the rig is 1.64 m and the box 1.8 m, so it is scaled 1.8/1.64 inside the avatar (which is already at `SQ_K`), feet are snapped from its own bounds, and it is turned 180 degrees because the rigs face +Z while the box avatars face -Z. Everything on the rig is `noHit`, as the box parts were.
- Cost: a dressed avatar is ~101 draw calls instead of ~12, so a 2-player session carries roughly +200 on top of the ~1000 the model merge saved in v1.97.60. If that ever shows on the fps readout, the fix is merging each rig's **static** parts per pivot group (the limbs have to stay separate).
- Tests: `validate-power-outage-machines.cjs` now dresses two avatars from the real GLB through the game's own reader, `characterRig` and `dressPlayer`, and asserts the rig lands and is scaled/turned correctly, the box body is hidden while held items are not, each player gets its **own** jacket material, and the two colours come out orange (`#f16f1a`) and lime (`#c7c81d`) respectively - the test that would have caught the shared-material mistake.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.62` / `corn-souls-test-shell-v89`.

## TEST v1.97.61 — hotfix: the FPS/Draw-call readout was reading the renderer from the wrong script block (2026-11-01)
- Owner-reported on v1.97.60: `Uncaught ReferenceError: renderer is not defined`, thrown once a second (the readout runs in the once-a-second branch), so a frame was skipped every second and the error banner appeared.
- Cause: the frame loop lives in a later `<script>` block than the engine. `renderer` is a `let` in the engine block, so the readout could not see it. `scene` was reachable only because everything funnels through the `Plant3D` bridge, and the readout had not.
- Fix: `root.Plant3D` now exposes `get drawCalls()` and `get triCount()` (next to the existing `get scene()`), and the readout uses `P3.drawCalls` / `P3.triCount`. Same information, reachable scope.
- Guarded in `test/validate-power-outage-machines.cjs` (which already asserts page-wide wiring): both getters must exist, the readout must use `P3.drawCalls`, and the `$('fps')` line must never mention `renderer` itself - so a future HUD edit cannot reintroduce the crash.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.61` / `corn-souls-test-shell-v88`.

## TEST v1.97.60 — boilers turned to face the dryer trains, and the imported models stop eating the frame (2026-11-01)
- **Owner-reported framerate drop (165 -> 100/144, varying).** Cause: every part of an imported model is its own draw submission, and `glbBuild()` marks every part `castShadow`, so each one is drawn twice. The boiler alone was **258 parts x 2 boilers = 516 objects, ~1032 submissions a frame**; the four NPC rigs added ~592, the tower car ~166, the vulture ~136. The procedural plant is batched (the existing `mergeStatic()` folds `MATS`/`wallMats` meshes at init) but imported models are added after init and were never batched at all.
- **`mergeModel(root, castShadow)`**: folds a model down to **one mesh per material** - each part's world matrix is baked into a cloned geometry and the attributes concatenated (with `toNonIndexed()`, and a textured batch is left alone if any part lacks UVs). Measured on the real boiler file: **258 meshes -> 11**, **258 shadow casters -> 0**, **identical triangle count**, **bounding box drift 0.000000**, **32 ms** one-off, and the result is merged *before* cloning so both boilers share one set of geometries. Vending machines get the same treatment (19 -> 8, indoors so no shadow pass). Applied where the parts are static: NPC rigs and the vulture keep their rigs because they animate.
- **Boilers turned 180 degrees** (`yaw -90` -> `+90`): burner, blower and ladder now face **east**, the exhaust stack and rear flue box face **west**.
- **Casing sleeve.** The model's casing stopped ~2 m short of the dryer train. A sleeve in the model's own casing material - **r 1.67** (the casing's 3.34 m section), **2.03 m long**, centreline **y 2.35**, centred at local z -4.235 - now carries the casing's west face back to **x = E0 + 7.35**, which is the dryer train's burner-can tip: the boilers and the drums read as one flush line. It merges into the casing's material batch, so it costs no draw call. Colliders widened to `cx +/- 5.2`.
- **Outdoor darkening fixed.** `applyInteriorDark()` sampled each mesh at its object origin, and the ground is one 16 km plane whose origin sits at (0,0,0) - inside the shop envelope - so the whole ground went to 10% during an outage. A mesh now only counts as interior if its **bounding sphere fits inside** the matched envelope's half-diagonal, so world-scale surfaces (ground, roads crossing a footprint) can never be dimmed while interior floors still are.
- The FPS readout now also shows **draw calls and triangles** (`165 fps  412 dc  318k tri`), so the budget is visible in-game instead of guessed from the frame rate.
- Tests: the boiler block asserts the +90 yaw, the sleeve (section, length, model-space placement, its own casing material, and that the sleeved west face lands on `E0 + 7.35`), the widened collider, and merges the **real GLB through the game's own reader and `mergeModel`** - asserting part count, identical triangles, identical bounds and zero shadow casters. `validate-interior-dark.cjs` gained a ground-scale mesh that must never be dimmed while its room still is.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.60` / `corn-souls-test-shell-v87`.

## TEST v1.97.59 — interiors go dark in an outage, and only windows let the daylight back in (2026-11-01)
- Until now an outage only killed the fixtures: `setPowerOutage()` dims everything carrying `gridLight` (lamps, screens, wall packs, halos) and deliberately never touches the world's own lighting. But there is no baked light and no occlusion in this renderer, so the sky light kept lighting an interior exactly like the yard - a room with the power off looked as bright as the road outside.
- **Envelopes.** Every roofed building now registers its volume (`enclosure(x0, x1, z0, z1, top)`) and the glazing in it (`glazing(e, x, y, z, r)`), right next to the roof it already builds: the generic `building()` helper does it from its own opening lists, plus the process building's west block and ferment alley, the office block's ceiling (nested inside the shed), the three shop roofs, the receiving building (in its shifted coordinates) and the scale house (in its shifted coordinates).
- **The dim.** On an outage every interior mesh is re-materialled to a dimmed clone of itself, level set by `interiorLight()`: **0.10 with no daylight at all, up to 0.80 right at a window**, falling off over the window's radius. The innermost envelope containing a point wins, so the office block is darker than the shed around it and a windowless cupboard inside a windowed room stays dark. Windows are the only daylight - the see-through wall materials of the free camera never count as glazing.
- **Nothing else is touched.** Fixtures and battery gear are left to the existing outage code, and the wall shells are skipped because `setWallsSolid()` owns their opacity - dimming a wall would have left it see-through after a switch to walk mode. Outdoors, the sky, the fog, the sun and the hemi light are untouched: this dims surfaces, it does not change world lighting.
- **Restore is exact.** Each touched mesh remembers its own material and gets it back when the power returns; a repeated outage call is idempotent, and one dimmed clone is shared per (material, level) so a whole room costs a handful of materials, not one per mesh.
- The player's headlamp still lights a dark interior normally, which is the point: a windowless room with the power out is dark until you turn a light on.
- New **`test/validate-interior-dark.cjs`** (registered in the workflow - 10 repo-root + 6 `test/` suites now): it runs the game's own engine over a scene with a windowless room, a windowed room, a cupboard nested inside it, an outdoor mesh, a wall shell and a gridLight fixture, and proves the dark room reads 0.10, the window face reads above 0.6, the cupboard inside the lit room stays dark, the outdoor mesh, wall shell and fixture are untouched, and power restores every material exactly. `validate-power-outage.cjs` and `validate-west-wing.cjs` gained the new globals their sandboxes now need.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.59` / `corn-souls-test-shell-v86`.

## TEST v1.97.58 — seated workers sit on their chairs, and their knees go under the counter (2026-11-01)
- Owner-spotted at the scale house: the drive-through tech was hovering above her chair with her folded knees buried in the counter. Two separate bugs, both in the seating maths.
- **The anchor was one hip-height off.** `loadCharacter()` set `root.position.y = seatY` — but the root of these rigs is at the model's **feet**, and the hip joint sits **0.62 m above that**, so every seated worker (the two scale techs and Rick) floated 0.62 m above their chair, torso and all. The anchor now measures the rig's own hip (`Leg_Upper_L`, 0.62 m, read from the loaded model rather than hard-coded) and drops the root by that much, so the **PELVIS** lands at `seatY` = 0.49. Standing models are untouched: they still get their feet on the floor from `-bb.min.y`.
- **The chair had no seat at 0.47.** The slab is 0.08 m thick and was centred *on* 0.47, so its top was 0.51 while the comment, the pelvis anchor and the box avatar all assumed 0.47. It is now centred at 0.43 — the documented surface exists — so the pelvis sits 2 cm above the seat instead of 2 cm inside it.
- **The counters were solid boxes.** `box(6.5, 1.0, 0.7, ...)` is a 1 m tall block, and a seated thigh now reaches 0.33 m forward at hip height — straight into it. Both counters are service **desks**: a 6 cm top slab whose top stays flush with the window sill at `FY + 1.0`, carried on two end panels 6.42 m apart, with the middle open as a knee hole. From outside nothing changes (the wall below the window hides it); from inside the tech's legs sit under the desk instead of inside it.
- The thigh fold eased from 1.5 to **1.15 rad** so the shins come back down and the feet hang 0.13 m above the floor rather than 0.3 m+; the knee ends up at 0.64 m absolute, comfortably under the counter top's 1.24 m underside.
- New **`test/validate-seating.cjs`** (registered in the workflow - 10 repo-root + 5 `test/` suites now): it reads the hip, thigh and shin heights out of `boardop_rick_rig.glb`, `brenda_scalehouse_rig.glb` and `tammy_scalehouse_rig.glb`, re-does the anchor and fold maths, and asserts the pelvis lands at `seatY` on a 0.47 seat, the knees stay under the counter top, the feet stay within 0.2 m of the floor, and that the old anchor was floating them 0.62 m up - plus that the solid counter box is gone, the desk is top slab on two panels, and both techs still sit at their windows facing out. `validate-power-outage-machines.cjs` had pinned the old angles and is updated to the new anchor.
- Verified locally: 10 repo-root suites + 5 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.58` / `corn-souls-test-shell-v85`.

## TEST v1.97.57 — the owner's vulture replaces the drawn buzzard (2026-11-01)
- The bird on the RTO stack is the owner's **`vulture_rig.glb`** now, not a billboarded sprite. The whole gag is untouched — perch on the stack lip, wait for a body older than 120 s, glide down, hop on it, **chalk outline** traced from the ragdoll, carry it to the far pond, splash, return, with the hiss / flap / splash sounds — only the bird itself changed.
- **What the model is:** root `Vulture_Root` -> `Torso_Hunch` -> the limb joints, 105 nodes / 68 meshes / 6 materials / **three embedded PNG feather textures**, no skins, no baked animations, 88 matrix transforms. It carries `Grip_Target_Socket` at y 0.59 — the authored perch contact point — and the beak sits on **+Z**.
- **Placed at 0.8**: the export is 2.94 m across the spread wings, so this is a **2.35 m wingspan, 0.94 m tall** bird. `Grip_Target_Socket` is what lands on the stack lip (0.59 x 0.8 = 0.472 m offset), which leaves the talons just under the edge rather than perching on tiptoe; the claws are the fallback if the socket ever disappears.
- **Posed from its own joints.** Every joint in the export rotates about **world X** (the wing and head joints are pure translations), so the pose code is plain angles with one rule: the left wing gets an angle, the right gets it negated on Y and Z. Perched: shoulder `(0, 0.40, -0.55)`, elbow `0.60`, wrist `2.40` — the elbow tucks to the flank, the forearm sweeps back and the primaries cross over the tail, pulling the tips from 1.47 m out to **0.22 m** and back to z -0.31. Flying: `0.18 + 0.7 sin(phase)` lifts the tips from **0.68 m to 2.29 m**, with the old flap rates (7 carrying / 5 climbing / 1.2 gliding) and the flap sound firing on the **upstroke**.
- **Alive, not just animated**: the neck hunches 0.34 rad on the perch and stretches to 0.06 in flight, the head bobs and slowly scans while he waits, and `Joint_Jaw` opens 0.55 rad on every hiss (`vultSound` sets the jaw timer, so even a hiss too far away to hear opens the beak).
- **Facing**: the beak is +Z, so in flight the yaw is `atan2(vel.x, vel.z)` eased at 4 rad/s; perched he holds a fixed yaw derived from the stack position so he looks back across the plant instead of billboarding to the camera.
- The drawn bird is still built and is **hidden only once the model has arrived**, the same rule `loadCharacter()` uses for the box NPCs — a failed fetch leaves a buzzard on the stack rather than nothing. The whole rig is flagged `noHit`, so it never blocks a shot, a raycast or the chalk outline.
- Asset bookkeeping: registered in `assets/registry.json` as first-party work (owner-directed, generated with ChatGPT), plus `CREDITS.md` and `assets/models/README.md`.
- New **`test/validate-vulture.cjs`** (registered in the workflow, so the local gate is 10 repo-root + 4 `test/` suites): it parses the GLB (root, 105/68/6, three PNGs, no skins or animations), walks the matrices for the bounds (2.94 x 1.17 x 1.14, talons 0.54 below the origin, socket at 0.59), proves the beak is +Z and the left wing is +X, asserts **every joint the pose code touches exists and pitches about world X**, then runs the game's own `vulturePose()` on a rig rebuilt from the export's joint origins: the fold pulls the tips in to the flanks and back over the tail, the beat sweeps them 0.68 -> 2.29 m, both wings mirror exactly, and a hiss opens and closes the beak. The wiring (URL, 0.8 scale, socket lift, `noHit`, fallback-hidden-last, perch on `STACKS[0]`, all five states, chalk and pond drop) is pinned too.
- Verified locally: 10 repo-root suites + 4 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.57` / `corn-souls-test-shell-v84`.

## TEST v1.97.56 — the owner's boiler model replaces both package boilers (2026-11-01)
- The two placeholder package boilers in the energy centre are gone; the owner's **`ethanol_plant_steam_boiler_narrow_long.glb`** stands in both bays. North is **Boiler 1**, south is **Boiler 2**, per the owner.
- **What the model is:** root `Ethanol_Plant_Steam_Boiler`, 259 nodes / 258 meshes / 11 flat materials, no textures, no skins, no animations, and every part placed with a `matrix` (which the shared reader has honoured since the cooling tower). It carries its own **exhaust stack, burner and throat, forced-draft blower, upper steam drum, insulated casing, blowdown valve and lines, pressure gauges, sight glasses, a 19-part ladder and a moulded nameplate** - so the procedural casing, rounded top, front plate, red burner, FD fan and rooftop stack are all deleted rather than left to z-fight.
- **Assembled through its matrices it measures 6.34 x 8.14 x 9.96 m**, and its base already sits at y 0.01 - so it goes in at **1:1, unscaled**. Turned **-90 degrees** the ~10 m casing runs east-west and the burner end swings to **west**, matching the old boilers' orientation and leaving the aisle between the bays clear.
- **Placement.** Both boilers share one table entry shape with the NPCs and the vending machines: `BOILER_SPOTS.push({ x: cx, y: 0, z: cz, yaw: -Math.PI / 2, name })` at `cx = E0 + 12.6` and `cz = EZ0 + 22.4` (north) / `EZ0 + 35.3` (south), where `y` is the floor and the base is snapped with `g.position.y += s.y - bb.min.y`. A per-spot `scale` is accepted, so filling the bay later is one number (~1.25 = 12.4 m long).
- **One upload, two boilers:** the GLB is fetched and built once and the second bay gets a `clone(true)`, so both share geometry and materials.
- The readable **`BOILER 1` / `BOILER 2`** plates stay at 3.2 m on the north face (the model's own plate is moulded detail, not a label), and each boiler keeps its own collision box, resized from the old casing to the model: `ecBox(cx - 5.0, cx + 5.0, cz - 3.2, cz + 3.2)`.
- The old **15.5 m stacks through the roof** went with the old geometry; the model's integral stack tops out at 8.1 m, inside the building.
- Asset bookkeeping: registered in `assets/registry.json` as first-party work (owner-directed, generated with ChatGPT), plus `CREDITS.md` and `assets/models/README.md`.
- `test/validate-power-outage-machines.cjs` now parses this GLB - magic, root name, no images, the matrix-per-node count, and the stack / burner / blower / drum / casing / nameplate parts - recomputes the **assembled bounds through the matrices** (6.34 x 8.14 x 9.96 m, base at 0), and pins the wiring: north is Boiler 1, south is Boiler 2, the -90 degree yaw, the single upload plus clone, the kept colliders, and that the old casing / rooftop stack / `BOILER A`+`B` code is gone.
- Verified locally: 10 repo-root suites + 3 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.56` / `corn-souls-test-shell-v83`.

## TEST v1.97.55 — character and vending placement fixes (2026-11-01)
- From the owner’s play-test: Rick sunk into the ground, Brenda and Tammy stood into the desks in front of them, Vern clipped the rail and stood in the train’s way, and the Milo Rade machine floated. All four were anchoring mistakes rather than model problems:
- **Seated characters are anchored at the pelvis, not at their feet.** `seatedPerson()` builds its seat top at 0.47 and puts the box avatar’s hips at 0.49, so a seated model now gets its pelvis at **0.49** whatever the leg fold does - which lifts Rick out of the floor and drops Brenda and Tammy back behind their counters in one change. Standing models still get their feet put on the floor from their posed bounds.
- **Vern stepped off the loop track.** He stood at x -238 (`-194 + GDX` with GDX -44), which is **2 m from the unit-train loop’s east leg at x -240** - the rail he was clipping, on a line trains actually use. He now stands at **x -232**, 8 m clear.
- **The vending machines are measured onto the floor.** A spot’s `y` now means the floor level (0 in the break room, `FY` in the scale house) and the base is snapped with `g.position.y += s.y - bb.min.y` from the loaded model, so an origin that sits above its base can no longer float.
- Every NPC also accepts world nudges (`x`, `z`) and local offsets (`dx`, `dy`, `dz`) in `NPC_MODELS`, so any remaining placement tweak is one number rather than a code change.
- Tests updated: the pelvis seat anchor, the standing feet-from-bounds rule, the per-NPC nudge hooks and the measured vending-machine base are all asserted.
- Verified locally: 10 repo-root suites + 3 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.55` / `corn-souls-test-shell-v82`.

## TEST v1.97.54 — four NPCs get real character models (Vern, Rick, Brenda, Tammy) (2026-11-01)
- The owner's four character models are in: **Vern** (`operator_vern_rig.glb`, 1.64 m, gloves + hard hat, headlamp, ear muffs, walkie-talkie, pipe wrench, 4-gas sniffer, ID badge), **Rick the board operator** (`boardop_rick_rig.glb`, 1.64 m) and the scale-house techs **Brenda** and **Tammy** (`*_scalehouse_rig.glb`, 1.57 m). All are the same rigid-part rig family as Squeeg - `Operator_Rig_Root`, named parts, no skins, no textures, no animations.
- **One shared rig builder.** `rigPivot()` + `characterRig()` reparent the limbs onto generated shoulder / elbow / hip / knee pivots (the same technique Squeeg's engine uses), with the hand group as a per-model option (`Hand_Glove_*` for Vern, `Hand_Bare_*` for the other three). Missing parts are skipped.
- **`NPC_MODELS`** is the whole wiring table - `vern`, `op` (Rick's NPC id in the game is `op`), `brenda`, `tammy` - so the next character is one entry plus its `.glb`. `loadCharacter()` finds the `NPCS` entry, loads through the in-game glTF reader, rigs, poses, seats it on the floor from its own posed bounds, and **only then hides the box avatar**, so a failed fetch leaves the box exactly as before.
- **Three of them sit.** All four exports are standing, so the seated ones (Rick at the control board, Brenda and Tammy at the drive-through windows) get their thigh pivots swung forward 1.5 rad and their knees back 1.5 rad; the model is then dropped so its feet touch the floor (`fy` in the scale house, which is 0.3 m up). The chair built by `seatedPerson()` stays - only the box body is hidden.
- **Facing is derived, not guessed**: the nose bridge and steel toe caps sit at +Z in all four exports, while the box avatars face -Z, so each model gets a 180 degree flip inside its NPC group.
- Asset bookkeeping: four registry entries (first-party, AI-generated), `CREDITS.md` and `assets/models/README.md` updated. Three of the files were still in Downloads and are now in `assets/models/`.
- Tests: `validate-power-outage-machines.cjs` parses each GLB (rig root, height 1.57/1.64 m, the 0.19 m origin offset, the right hand group) and asserts **every joint the rig builder reparents exists in that file** - a re-export that renames a knee now fails CI instead of silently leaving a limb behind - plus the seated pose, the floor seating, the 180 flip, the chair-preserving hide, and the wiring table.
- Verified locally: all 10 repo-root suites + 3 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.54` / `corn-souls-test-shell-v81`.

## TEST v1.97.53 — the scale-house vending machine is inside again (2026-11-01)
- **Owner-spotted bug:** the machine stood outside the scale house, next to the glass entrance. Cause: the scale house is laid out at x 56..90 and then **shifted 26 m east** by the building's `DX` block, which moves `scene.children`, `wallSegs`, `WALK_SURF` and `O.swingDoors` - but a `DRINK_SPOTS` entry is plain data, so it stayed at its laid-out x and the model was built 26 m west of the building.
- Fixed the same way the swing doors are handled: the spot's index is captured when it is registered, and the shift block now moves `DRINK_SPOTS` entries created inside that building. The machine lands at world **x 85**, inside the 82..116 footprint, on the raised floor (`FY`) and 0.46 m in from the north wall.
- `test/validate-power-outage-machines.cjs` now proves it: it reads `SH_DX` from the game, applies the shift to the registered x, and asserts the result falls inside the building's laid-out span - so this can't regress silently.
- Verified locally: 10 repo-root suites + 3 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.53` / `corn-souls-test-shell-v80`.

## TEST v1.97.52 — Milo Rade vending machines replace the flat soda boxes (2026-11-01)
- The owner's `milorade_machine.glb` now stands where the two flat red soda-machine boxes were: one in the **process break room** (x -61.35, against the north wall of the break room) and one in the **scale house** (x 59, on its raised floor). Both are placed at export scale (1.14 x 2.23 x 0.98 m), lifted 0.16 m because the model hangs that far below its own origin, and each gets a 0.7 m collider.
- **One upload, two machines**: the model is fetched and built once, then `clone()`d for the second spot, so the geometry, materials and the 3 MB embedded PNG are shared.
- **The glTF reader learned textures.** The machine's advert panel is a PNG inside the BIN chunk (material 7 carries `baseColorTexture`), and until now the reader ignored images, `TEXCOORD_0` and material maps - it would have rendered as bare coloured boxes. It now builds a blob URL per embedded image, decodes it through `TextureLoader`, sets sRGB + `flipY = false` for glTF UVs, attaches `map` where a material asks for it, and uploads `uv`.
- The snack machine (the black one) is untouched, and the colliders that used to sit in front of the soda boxes were kept.
- Asset bookkeeping: registered in `assets/registry.json` (+ `CREDITS.md`, `assets/models/README.md`) as first-party work, 22 nodes / 19 meshes / 8 materials / one embedded PNG / one `Dispense_Milo_Rade` animation. Note for the LIVE review: the advert art uses the in-game "Milo Rade" brand - worth a look before promotion.
- `test/validate-power-outage-machines.cjs` now parses this GLB too (root name, the embedded PNG, the textured material, the dispense animation, size and the 0.16 m offset) and pins both placements plus the removal of the old boxes. `test/validate-west-wing.cjs` records the soda-machine box and its glass panel as an intended replacement rather than a lost object.
- Verified locally before pushing: all 10 repo-root suites and the 3 `test/` suites pass, plus the launcher anchors.
- Bumped TEST to `1.97.52` / `corn-souls-test-shell-v79`.

## TEST v1.97.51 — the Debug menu only offers reading messages (2026-11-01)
- Removed the compose entry (`📝 Leave a note (bug / idea / message)`) from the Debug menu, so the menu now carries **only the reader**: `📥 Developer Inbox` (which the launcher patches in over the old Controls row).
- Writing a note is not lost - it still lives in the pause menu, where the launcher renames it to `✉ Message Developer`, and the loading-screen hint no longer claims the Debug menu has it.
- The TEST launcher's now-dead `replaceAll('📝 Leave a note (bug / idea / message)', ...)` was dropped; `check_launcher_anchors.py` treats every `replaceAll` target as a required anchor and flagged it, which is exactly what that check is for.
- Verified against the **real patched output** by running the launcher in a VM and dumping the menu: `Close · 📥 Developer Inbox · Weather ▸ · Power outage: start · Power outage: end · Pivot engine: empty the day tank` - no compose row. All 10 repo-root suites and the 3 `test/` suites pass locally.
- Bumped TEST to `1.97.51` / `corn-souls-test-shell-v78`.

## TEST v1.97.50 — cooling tower doubled, and kept off the pavement (2026-11-01)
- The tower is now **2x** (47.3 x 11.7 m footprint, 12 m tall) at (50, 202) - moved 4 m south so its north face sits at z 195.3, still **4.99 m clear of the south road's south edge** (z 190.35) and well off the pavement.
- The hardstand, curbs, nameplate and drift plume are now **sized from the placed model's bounds** instead of hard-coded, so the scale lives in one number (`TOWER.scale`) and nothing can drift out of sync: 50.3 x 14.7 m pad, curbs on both long edges, the plate at 62% of the deck height, and the plume radius scaled to the casing width.
- Collision follows automatically (it is built from the same bounds), and the fans spin about their own axes regardless of scale.
- `test/validate-power-outage-machines.cjs` now pins the doubled footprint (47.3 m), the scale being applied at load, the bbox-derived pad, and the clearance: the north face must stay more than 3 m from the road edge and must never cross it.
- Verified locally with the portable Node before pushing: all 10 repo-root suites and the 3 `test/` suites pass, plus the launcher anchors.
- Bumped TEST to `1.97.50` / `corn-souls-test-shell-v77`.

## TEST v1.97.49 — fix a SyntaxError from the shared-loader refactor (v1.97.48 would not load) (2026-11-01)
- **v1.97.48 shipped broken**: when `loadSubstation()` was refactored onto the shared `loadGlbModel(url, onReady)`, the old `const { root, byName } = glbBuild(buf);` line was left inside the new callback, redeclaring the callback’s own parameter - a `SyntaxError: Identifier 'root' has already been declared` that stopped the whole game script from loading. Removed; the callback now uses the pair it is handed.
- Two test expectations had gone stale with the same release and are corrected: the RTO plume gate now keys on `S.grid` (the cooling tower shares it), and the substation model is checked by its absolute URL going through `loadGlbModel` rather than a bare `fetch(...)`.
- **Local verification added**: a portable Node 22 was fetched to run the full CI suite on this machine, so this round was checked before pushing rather than after - 10 repo-root suites plus the 3 `test/` suites all pass, along with the launcher anchors and the version/cache wiring.
- Bumped TEST to `1.97.49` / `corn-souls-test-shell-v76`.

## TEST v1.97.48 — cooling-tower model, and the glTF reader now honours node matrices (2026-11-01)
- The cooling-tower area south of the south road (the painted 40 x 10 placeholder at EXR-22, SZR+13) is now the owner's **1x4_Cooling_Tower_Raised_Sill** model: 23.64 x 5.83 m footprint, 6.01 m tall - basin on the ground, casing on legs, fan deck with **four fans**, distribution header on the road side. Placed at 1:1 at (50, 198) on a 27 x 8.5 m hardstand with curbs and a `COOLING TOWER / CELLS 1-4` plate; the painted ground label is gone.
- **The loader had a real gap.** 103 of the model's 108 nodes place their parts with a `matrix` (glTF column-major), and the reader only read translation/rotation/scale - the tower would have loaded as a pile of parts at the origin. `glbBuild` now decomposes `node.matrix` when present (TRS still works, which is what the substation uses), and the suite asserts both the code path and the matrix-assembled size so it cannot regress. The fetch/parse was also refactored into one shared `loadGlbModel(url, onReady, tag)`.
- **It behaves like machinery.** The four `Fan_Rotor_*` nodes turn at 7.5 rad/s and stop dead while the plant has no power; a white drift plume off the fan deck joined `STACKS` flagged `grid`, and the outage gate now keys on that flag instead of specifically the RTO stack - so the oxidiser and the cooling tower go cold together.
- Asset bookkeeping: the cooling tower is registered in `assets/registry.json` (+ `CREDITS.md`, `assets/models/README.md`), and **the power-building entry was corrected** - both models were generated with ChatGPT at the owner's direction, which the earlier entry wrongly described as hand-made in Blender.
- `test/validate-power-outage-machines.cjs` parses both GLBs (magic, embedded-only, node names, true scale), computes the tower's assembled bounds through its matrices, and checks the four fan rotors, the fan stop, the plume flag, the plate, that the painted placeholder is gone, and that the tower clears the south road by about 4.3 m.
- Bumped TEST to `1.97.48` / `corn-souls-test-shell-v75`.

## TEST v1.97.47 — the main substation is the owner's main_power_building.glb (2026-11-01)
- **The substation now uses the owner's model** (`assets/models/main_power_building.glb`, added to the repo after v1.97.46 shipped, which is why that release had a procedural stand-in). Its compound gate faces the model's +Z, so the site is placed at (-610, 562) with a 180 degree yaw - the gate faces north as asked - at export scale: 16.6 x 14.6 m footprint, 4.5 m tall, 20,893 triangles, 14 flat materials, no textures.
- **A self-contained glTF 2.0 reader** (`glbChunks` / `glbAccessor` / `glbBuild`): the three.js bundle ships no GLTFLoader, so this walks the JSON + embedded BIN chunks, turns accessors into BufferGeometry (interleaved-safe), pbr base-colour/metallic/roughness factors into MeshStandardMaterial, and the node list into an Object3D tree that **keeps every node name**. Line primitives (mode 1) become LineSegments, triangles become Meshes, everything is `noHit`. If the fetch or the parse fails it logs and leaves bare ground - it can never break the game.
- **The model's own parts are what the game drives**, so the procedural building, its sliding panels, its lever and its lamp are all gone: `PLANT_POWER_RESET_BUTTON` is the interaction point (menu unchanged - `E` within 3 m, trip the main back in, power restored), `MAIN_BREAKER_HANDLE` rotates down while the main is tripped and comes back up when it is closed, and `Compound_Access_Gate_Hinge` + `Electrical_Building_Door` swing to the exported -90 degree pose as you walk up (the two exported 2-key animations reproduced by slerping the nodes, so no AnimationMixer is needed).
- **Collision comes from the model**: the compound fence line is read from the loaded bounding box and pushed as `wallSegs` with a 6.6 m gap where the gate is, so you walk in through the gate (which swings open) rather than through the fence.
- The asset is registered as first-party work in `assets/registry.json` (creator, evidence: 20,893 triangles / 29 nodes / 14 materials / 2 node animations, modification notes), with a line in `CREDITS.md` and `assets/models/README.md`.
- `test/validate-power-outage-machines.cjs` now **parses the GLB itself**: magic + version, embedded-only (no external URIs, no images), the five node names the game depends on, true-scale footprint and height, both exported animations, plus the reset behaviour and gate/door swing against stubs. It also re-checks that the model sits clear of both ponds and the loop track.
- Bumped TEST to `1.97.47` / `corn-souls-test-shell-v74`.

## TEST v1.97.46 — main substation + Ranger dirt tracks round the ponds, and its breaker resets an outage (2026-11-01)
- **Main substation** on the open ground south of the retention ponds, at (-610, 562): 26 x 16 m, 6.6 m tall, built with the same transparent-wall `building()` helper as the rest of the plant so the switchgear reads from the overview. **Two 6.4 x 5.2 m gate doors on the north wall**, meeting in the middle.
- The gates are **hand-slid steel panels, deliberately not powered roll-ups** - a roll-up would be dead during an outage, which is exactly when you need to reach the breaker. They slide aside as Squeeg walks up and close behind him.
- Inside: five switchgear cabinets with panel LEDs on the plant supply (`gridLight`, so they die with the plant), bus bars, a cable tray with bus drops, and a battery-fed emergency work lamp so the room is findable in the dark. Outside: a transformer bank with three HV bushings, bollards and `MAIN SUBSTATION / 13.8 kV` and `DANGER / HIGH VOLTAGE` plates.
- **The main breaker is the master reset.** A red enclosure on the south wall facing the gates, with a lever that drops to -0.6 rad while the main is tripped and a lamp that is red when tripped and green when closed (both battery-fed, so they read correctly with the plant dead). `E` within 2.8 m opens the panel: *Trip the main breaker back in* calls `setPowerOutage(false)` and everything recovers at once - plant model, belts, rotors, RTO plume, DCS, the cooler pulling back to 38 F, the egress strobes going dark. With power on it just reports the main is closed. Exported as `P3.powerResetNear` / `P3.powerResetAction`.
- **Dirt tracks for the Ranger**, built as offset ribbons (`dirtRoad()`) with world-metre UVs on the existing dirt texture, 5.5 m wide (7 m at the forecourt apron), no colliders. Route: starts where the paved south road ends at the unit-train loop (x = -235), crosses the track, then **splits** at (-285, 205) - one run goes west along the north side of both ponds and down their west flank, the other goes south round the ponds' east and south sides - and both meet at a 22 x 16 m forecourt in front of the gates.
- **Placement was verified, not eyeballed**: every one of the 19 nodes clears both pond squares (rotated by `atan(0.756)`, 70 m hole) by at least 8 m and the loop track by at least 12 m. The first attempt put the forecourt inside pond A's 8 m margin, so the whole site moved 10 m south - and that check now lives in CI so a future pond or track move fails the suite instead of putting the road in the water.
- `test/validate-power-outage-machines.cjs` gained: the pond/track geometry guard (re-deriving the ponds and the loop polyline from the game's own numbers), the gate/panel/building static guards (gates on the north wall, hand-slid not `rollDoors`, breaker inside the footprint, P3 exports, the E-dispatch), and a behavioural test that the breaker reports "already closed" on a live plant, restores power when tripped, and that the gates slide open on approach and close behind you.
- Bumped TEST to `1.97.46` / `corn-souls-test-shell-v73`.

## TEST v1.97.45 — the pivot diesel is louder (owner request) (2026-11-01)
- The gen-set idle gain goes from `0.06` to `0.13` at full closeness (roughly +7 dB) - clearly audible as soon as you come into the circle, still fading out at the same ~80 m. Only the volume changed: the lope, the pitch wobble and the lowpass are untouched.
- Bumped TEST to `1.97.45` / `corn-souls-test-shell-v72`.

## TEST v1.97.44 — fix `PIVOT_GEN is not defined` at load (scope bug) (2026-11-01)
- **Reported by the owner as a red error card on load: `PIVOT_GEN is not defined`.** The gen-set state was declared with `const` beside the pivot field block - two spaces of indentation, which in that spot meant it landed *inside* an enclosing building block (brace depth 3) instead of at closure scope (depth 2). `updatePivot()`, `pivotGenAction()` and the `P3.pivotGen` getter all sit at closure scope, so on the first frame the world threw and the whole scene failed to build. Nothing was wrong with the feature itself, only with where its state was declared.
- `PIVOT_GEN` and `CAN` now live next to the other world-level state (beside `EXIT_SIGN`, `EGRESS` and the light helpers), with a comment recording why the placement matters.
- `test/validate-power-outage-machines.cjs` gained the guard that would have caught it: both declarations must start at column 0 (`/^const PIVOT_GEN = \{/m`), because everything closure-level in this file is written flush left - a nested declaration is invisible to the frame loop and the P3 export.
- Everything else from v1.97.43 is unchanged: the plant stops with the grid, the cooler warms, the DCS freezes, and the pivot keeps turning on its own diesel until the day tank runs dry.
- Bumped TEST to `1.97.44` / `corn-souls-test-shell-v71`.

## TEST v1.97.43 — the outage stops the plant (and the pivot's own diesel keeps the field alive) (2026-11-01)
- **The plant stops with the grid.** `stepH` now returns early while `s.power` is set, so nothing is conveyed, pumped or ground: no silo/day inflows, no conveyor, no mill rates, no blender feed, no strainer/hydroheater/cook/liq output. A `dead(s)` helper zeroes those derived rates so the HUD and the 3D plant read 0 instead of lying. `sim.power = P3.powerOutage` in the main loop is the single source of truth (no new plumbing), and because every rate is recomputed from scratch each tick, powering back up resumes exactly where the plant stopped - no jumps, no fake alarms.
- **Everything that moves follows.** Mill rotors, the slurry-blender paddle and the fermenter agitators stop (the spinner increment is multiplied by power), the four rate sources that come from *visual* state rather than measured rates are gated (rail unloading, pit dumping, beer-well drain, fermenter receipts), so every belt empties and every pipe stream goes dark.
- **The RTO stops smoking**: `updatePlumes` emits nothing from `STACKS[0]` (the oxidiser stack) while the outage runs, and the particles already in the air blow away with the wind.
- **Unit readouts tell the truth**: `status()` answers "No power - nothing is running." for every unit, mills report `limit = 'power'`, and the DCS screens (control-room wall, alarm summary, board screens, cooler and shop temperature readouts) were already `gridLight` so they are black as well - a dead DCS, not a lying one.
- **The yeast cooler loses its compressor** and drifts toward the outside air at `0.0025/s` (faster with a door open). At 50 F outside the box climbs 38 -> 45 F - the existing alarm threshold - in about six minutes; in cold weather it never trips. The alarm, its sounder and the HUD entry still work (battery-backed), while the red beacon stays dark on the dead lighting circuit.
- **The center pivot is engine-driven, so it keeps turning** - with its own diesel gen-set on a pad beside the pivot point: enclosure, radiator, exhaust stack, 120 L day tank with a site gauge, a 1 000 L bulk tank with a hand pump, spare diesel cans and a green run lamp fed from the engine's own battery (so it stays lit in an outage). `PIVOT_GEN` burns **1.2 L/h**, i.e. ~100 hours per tank; when it runs dry the engine stops, the arm freezes where it is and the water is cut, and the player is told once.
- **Refuelling loop**: a diesel can holds 20 L. `E` at the pad opens the gen-set menu - take a can, fill it at the bulk tank, pour it into the day tank - and pouring restarts a stopped engine. `P3.pivotGen`, `P3.pivotGenNear`, `P3.pivotGenAction` and `P3.pivotNotify` wire it to the HUD; the debug menu gained `Pivot engine: empty the day tank` so the dry state can be seen on demand.
- **Engine sound**: a diesel lope synthesised like the UTV engine (sawtooth + square an octave down through a lowpass), with gain driven by the camera's distance to the pivot point - **audible inside ~80 m, silent beyond**, silent when stopped.
- New `test/validate-power-outage-machines.cjs` (blocking in CI): runs the real plant model in a VM and proves the clock, levels and tank contents are untouched while frozen with every rate at zero and the readout saying "No power", then proves it runs again; plus the pivot's burn rate, dry-stop, spray cut, refuel restart and can/bulk-tank menu logic, and 20 static guards for the gates above.
- Bumped TEST to `1.97.43` / `corn-souls-test-shell-v70`.

## TEST v1.97.42 — egress strobe placement fixes, and real EXIT lettering (2026-11-01)
- **Fixed from the owner's play-test:** the two east-wall man doors of the maintenance shop had their strobes placed from a *wall-start offset* instead of the doorway centre (the door specs are written pre-relative, so `BSZ + (-8.0 - BSZ)` collapses to `-8.0`). They now sit directly over the doorways at z = -8.0 and z = 30.0 instead of ~24 m away, which is why one of them appeared to have no strobe at all and the other one hung south of its door.
- **Strobes no longer overlap door-name plates.** The plates (`doorSign`) sit at `DH + 0.32` = 2.45 m, exactly where the strobe was mounted; the fixture is now at **2.78 m**, clear of the plate's top edge, still centred over the door.
- **Strobes are no longer half-embedded in the wall.** The offset from the wall centre line went from 0.17 m to **0.24 m**, which clears the face of both the 0.3 m exterior walls and the 0.25 m interior ones (the dome is 0.17 m wide).
- The rest of the 22 doorways were re-checked against the wall helper's real centre formula (start + direction x offset) and were already correct: west-wall office exit, cook-alley south door, ferm-alley north-end door, FERM MCC green double door, pump house, scale-house glass entrance, DDG storage x2, energy centre x7, turbine/MCC x4, RTO building.
- **EXIT signs are now real signs:** one shared canvas material (red face, dark border, cream `EXIT` lettering — the look the lab sign already had) replaces the three flat red boxes, and each sign gets a soft additive red halo. All five sign materials are `batteryLight`, so they stay lit through an outage; the lab sign's private canvas was deleted in favour of the shared one.
- `test/validate-power-outage.cjs` gained guards for the strobe mount (offset/height constants, and that the shop doors are not placed from a wall-start offset) and for the signage (`exitSignMat`/`exitHalo` counts, the `EXIT` lettering, `batteryLight` count now 8).
- Bumped TEST to `1.97.42` / `corn-souls-test-shell-v69`.

## TEST v1.97.41 — the Power Outage is now an actual power cut, with interior egress strobes (2026-11-01)
- **The event no longer touches the world's lighting.** v1.97.39 dimmed the ambient to 65% by day / 5% by night, killed the sun, crushed the sky and popped the stars. All of that is gone: `DAYLIGHT`, `outageNightSky()`, the `auto`/`day`/`night` mode, `daylight()`'s snapshot and `P3.powerOutageMode` are deleted, and the outage module contains no reference to `hemi`, `sunL`, the sky, the fog or the shadow-casting sun. A power cut kills lights, not daylight.
- **Emitters declare themselves where they are built**, because "everything self-lit" was only correct while the whole scene went dark: `gridLight(m)` = wired to the plant supply, `batteryLight(m)` = self-powered. Unflagged materials are never touched, so printed signs and nameplates, paint, HUD and item textures, water curtains, process-liquid glow and the selection rings can no longer be dimmed by mistake.
- **23 mains emitters die:** grain-yard ceiling strips, strainer duty ring, liquefaction pump indicator, lab and control-room monitors, the 6015 wall pack, hallway ceiling lights, the door-window glow, the lit window glaze, both loadout indicators, the light-pole head, the shop temperature screen, the cooler alarm beacon, three wall packs / wall lights, the `scrM` screen, the crossing flasher lenses *and* their additive halos, the gate-arm lamps and the green pipe lamp.
- **10 self-powered emitters survive:** five EXIT-sign materials, the handheld-radio LED, both cars' headlights (plus the turn-signal strip), the Kia's headlight and the electric UTV's blue floor spot. Fires keep `keepLit`; Squeeg's headlamp is a separate SpotLight and is unaffected.
- **Red egress strobes on 22 exterior man doors**, interior face only, 2.42 m above the door and facing into the room, blinking on a 1.1 s cycle *only* while the plant is dead (battery-backed, one shared lens material so they flash on the same circuit). Marked doors: process building x6 (west, south, north end of the ferm alley, shop east x2, FERM MCC green double door), energy centre x7 (west x2, east, north green man door, east green double door, two east personnel doors), turbine/MCC x4, DDG storage x2, office/scale-house glass entrance, methanator pump house, RTO building. **No strobe in the ethanol load-out shack, none on any rolling door, none on interior doors** (offices, restrooms, training, HR, reception, lab/control room, cook-alley and hallway partitions, shop aisle, process/FERM MCC).
- **Roll-up doors do not work during an outage** — the hoist needs power, so `O.rollDoors` are forced shut (and any open one closes). Man doors keep working, which is what makes the strobes matter.
- `test/validate-power-outage.cjs` rewritten for the new contract: mains emitters die and stay dead when their own update loop rewrites the colour, screens and additive halos go fully black, battery gear and fires are untouched, ambient/sun/sky/fog are identical before and after, the strobes blink only while the event runs, plus static guards (23 `gridLight`, 11 `batteryLight`, 14 `egressStrobe` sites, no strobe in the load-out shack, the roll-door loop is power-gated, and the module can never mention the world lighting again).
- Bumped TEST to `1.97.41` / `corn-souls-test-shell-v68`.

## TEST v1.97.40 — the blackout event is now the **Power Outage** (2026-11-01)
- Renamed the whole feature, not just the label: `BLACKOUT` → `POWER_OUTAGE`, `setBlackout()` → `setPowerOutage()`, `applyBlackout()` → `applyPowerOutage()`, `blackoutNightSky()` → `outageNightSky()`, and the screen flag `userData.darkOnBlackout` → `userData.darkOnOutage`.
- Debug menu rows are now `Power outage: start` (auto), `Power outage: force night` and `Power outage: end`, matching the `Weather: live` sentence case used by the rows above them. Toasts read `Power outage: all plant power is out` / `Power outage: night look forced`; the release toast stays `Power restored`.
- Exports renamed with it: `P3.setPowerOutage(on, mode)`, `P3.powerOutage`, `P3.powerOutageMode` (no back-compat alias — the debug menu is the only consumer and this has never shipped to LIVE, which contains zero references).
- `test/validate-blackout.cjs` → `test/validate-power-outage.cjs`, with its slice markers, VM shim (`__POWER_OUTAGE`), menu lookups and exact-comment assertion moved in lockstep; the CI suite list in `.github/workflows/validate.yml` updated to the new path.
- Behaviour is unchanged: day/night aware response, per-frame re-apply, idempotent from the `DAYLIGHT` base. Verified no launcher anchor referenced the old identifiers, so nothing about the LIVE launcher changed.
- Bumped TEST to `1.97.40` / `corn-souls-test-shell-v67`.

## TEST v1.97.39 — blackout is now day/night aware (2026-11-01)
- A power outage at midday no longer darkens the world. It kills the plant's artificial light (emissive fixtures, unlit signs, screen textures, indicator lamps, sprites) and dips the hemisphere light to **65% of the current daylight value**, while the sun, its shadows, the sky dome, the fog and the stars stay exactly as `daylight()` set them.
- At night (before 07:00 or from 19:00) the event keeps its original response: ambient crushed to 5% of the daylight base, sun off, sky clamped to 2% luminance, sun disc removed, stars out.
- `daylight()` now records what it computed (`DAYLIGHT.baseHemi`, `baseSun`, `hours`); `applyBlackout()` rebuilds its result from that base every frame instead of scaling whatever is currently in the light, so it stays idempotent and stays correct when the clock rolls from day into night mid-event (auto mode switches to the night response by itself).
- `setBlackout(on, mode)` accepts `'auto' | 'day' | 'night'` (default auto), `P3.blackoutMode` exposes the current choice, and the mode can be changed while the event is already running.
- Debug menu now has three rows: `Blackout: start` (auto), `Blackout: force night` (preview the night look at any hour) and `Blackout: end`; all routed through `P3.setBlackout`.
- `test/validate-blackout.cjs` covers daytime (hemisphere dip only, sun/sky untouched, no compounding), night (full crush from the daylight base), forced night at 13:00 overriding a bright sky, plus the three menu rows and the new exports.
- Bumped TEST to `1.97.39` / `corn-souls-test-shell-v66`.

## TEST v1.97.38 — blackout survives per-frame indicator rewrites (strainer / liquefaction pump lamps) (2026-11-01)
- Owner feedback: the duty indicator lights for the slurry strainers and the liquefaction pumps were still lit. Those rings are `MeshBasicMaterial({color: 0x3ddc84})` whose colour is rewritten by the duty logic every frame, so the one-off dim was overwritten on the next frame.
- The blackout now stores each material's **original colour components** and re-applies the dim from that base every frame via `BLACKOUT.apply()`, called at the end of `applyBlackout()` — after all simulation and UI updates. Because it is applied from the stored base (not multiplied in place) it stays idempotent: repeated frames cannot compound, and a colour rewritten by the sim is immediately re-dimmed.
- Saved entries are `[material, base, kind]` with kinds `'emissive'` (base = original intensity), `'color'` (base = r/g/b, scaled to 12%) and `'dark'` (base = r/g/b, forced to black for screens). Restoring uses the stored base, so signs, lamps and screens return to exactly their original colours even if they changed mid-event.
- `test/validate-blackout.cjs` now simulates that rewrite: a green duty lamp set bright is re-dimmed on the next `applyBlackout()`, and a screen redrawn mid-event stays black.
- Bumped TEST to `1.97.38` / `corn-souls-test-shell-v65`.

## TEST v1.97.37 — control room monitors go black in a blackout (2026-11-01)
- Owner feedback: the control room screens should go black, not just dim. They are unlit canvas-texture materials, so the 12% colour scale still left them readable.
- Both screen builders now flag their material `userData.darkOnBlackout = true`: the `mk()` helper behind the process / web / desktop pictures, and the alarm-summary monitor (`ALARM_SCR.m`). `setBlackout()` checks that flag first and sets the colour to pure black instead of 12%, saving the original hex for an exact restore. The saved-entry format is now `[material, value, kind]` with `'emissive'` / `'color'` kinds.
- `test/validate-blackout.cjs` gained a screen case: colour must hit 0 during the event, restore to 1 afterwards, and the saved-entry count is asserted at 5.
- Office desk monitors are plain dark boxes with no picture, so they already read as off. Bumped TEST to `1.97.37` / `corn-souls-test-shell-v64`.

## TEST v1.97.36 — blackout also kills unlit signs and indicator lamps (2026-11-01)
- Owner feedback: signs and the lamps on motors/pumps still looked lit. Those are **unlit** materials (`MeshBasicMaterial`) and sprites, which ignore lighting entirely, so the emissive-only pass could not touch them.
- `setBlackout()` now also walks unlit materials (`isMeshBasicMaterial` / `isSpriteMaterial` / `isPointsMaterial`), saves their colour and scales it to 12%, restoring the exact hex on exit. Emissive materials are still handled by `emissiveIntensity`. The scene traversal no longer requires `o.isMesh`, so sprites and points are included too.
- Exclusions: `userData.keepLit` (fire sprites, now flagged inside `flameSprite()`), and the sky's own cloud/star materials, which `applyBlackout()` handles per frame.
- `test/validate-blackout.cjs` extended: unlit sign and lamp dim to 12% and restore, flame sprites stay lit, cloud/star materials are skipped, saved-entry count checked, plus a source assertion that `flameSprite()` marks its material keepLit.
- Bumped TEST to `1.97.36` / `corn-souls-test-shell-v63`.

## TEST v1.97.35 — fix `setBlackout is not defined` from the debug menu (2026-11-01)
- Reported by the owner as a red error card. Cause: `setBlackout()` lives inside the world closure (brace depth 1 at its definition), while `debugMenu()` is declared in the separate top-level UI script (depth 0). The menu rows called the private function directly, so the click threw `ReferenceError: setBlackout is not defined`.
- The debug menu now goes through the export (`P3.setBlackout(true|false)`), which was already wired for exactly this reason. `applyBlackout()` was never affected: it is called from the frame loop inside the same closure.
- `test/validate-blackout.cjs` now also asserts that both menu rows call `P3.setBlackout(`, never the bare function, and that the event is exported on `Plant3D` — a guard for this whole class of cross-script scope mistake.
- Bumped TEST to `1.97.35` / `corn-souls-test-shell-v62`.

## TEST v1.97.34 — blackout event: all plant power out, only headlamps, fires and stars (2026-11-01)
- Added `BLACKOUT` / `setBlackout(on)` / `applyBlackout()` in `game.html`. Starting the event dims every self-lit material once (walks the scene, saves `emissiveIntensity` per unique material and drops it to 6%), then the per-frame pass crushes the ambient hemisphere to 0.06, kills the sun, clamps the sky background to 2% luminance, matches the fog to it, removes the sun disc from the sky shader and brings the stars out. Ending it restores every saved material exactly.
- The per-frame pass is **idempotent** (clamps rather than multiplies) because `daylight()` only re-runs every ~20 s; `setBlackout` sets `dayT = 99` so the sky re-applies immediately in both directions. The headlamp spotlight is never touched, and materials flagged `userData.keepLit` (fires) are skipped.
- Trigger for now is the debug menu: `Blackout: start` / `Blackout: end`, plus `P3.setBlackout(on)` and `P3.blackout`. A random, environmental or in-world trigger can call the same functions later.
- Tests: new `test/validate-blackout.cjs` (dim-once, shared material saved once, keepLit untouched, clamp without compounding, exact restore, `dayT` reset, no-op while off). Added to the CI suite list.
- Bumped TEST to `1.97.34` / `corn-souls-test-shell-v61`. LIVE untouched at Alpha v1.98.

## TEST v1.97.33 — remove the startup control hint toast (2026-11-01)
- Dropped the touch/keyboard hint that popped up 900 ms after the title screen was dismissed ("One finger: drag to move, tap to select · Two fingers: twist to turn, pinch to zoom, slide up/down to tilt"). The same controls remain in the ☰ menu and the Controls screen. `musicPlay()` on splash dismissal is untouched.
- Bumped TEST to `1.97.33` / `corn-souls-test-shell-v60`.

## TEST v1.97.32 — dispatcher phone: round the ETA to whole tens (2026-11-01)
- The call confirmation now rounds the arrival estimate down to whole tens of seconds (`Math.max(10, Math.floor(bestEta / 220) * 10)`), so "about 88 s" reads "about 80 s". The test asserts the value is a multiple of ten and never zero.
- Bumped TEST to `1.97.32` / `corn-souls-test-shell-v59`.

## TEST v1.97.31 — dispatcher phone: fix "a train is already on the crossing" false refusals (2026-11-01)
- Reported by the owner: calling a train to hold was refused with "already on the crossing" and no train appeared. Cause: the guard was `THRUS.some(R => R.u >= 0)`, which is true whenever **any** through freight is anywhere on the line — and they are running most of the time — so the call was nearly always rejected.
- `railPhoneApply('hold')` now refuses only when a consist is actually occupying or within ~60 m of the crossing (`R.u > uc - TLEN - 60 && R.u - TLEN < uc + 60`). It also picks the consist that can get there soonest: a waiting train (started from `u = 0`) **or one already inbound**, which is simply halted at the crossing without losing its progress. The confirmation now states the ETA ("holding the Road P crossing in about 15 s").
- `railPhoneState()` reports `held`, `moving` (genuinely at the crossing) and `running` (on the line) separately, so the menu no longer claims a train is on the crossing when it is hundreds of metres away.
- `test/validate-rail-phone.cjs` gained three cases: a train elsewhere must not block the call, a train on the crossing must block it, and an inbound freight is halted with its progress preserved.
- Bumped TEST to `1.97.31` / `corn-souls-test-shell-v58`.

## TEST v1.97.30 — dispatcher phone: face the approach, and free the cursor for the menu (2026-11-01)
- Rotated the cabinet 180 degrees so the door, sign plate and handset face the approach instead of the hillside behind it.
- `railPhoneMenu()` now calls the existing `unlockMouse()` before it opens, so the pointer is released while the menu is up and its buttons can be clicked. Previously the pointer stayed locked, the mouse kept steering the first-person view, and selections had to be made with the controller or keyboard.

## TEST v1.97.29 — Road P dispatcher phone: hold a freight, release it, or call one through (2026-11-01)
- Added an interactable dispatcher phone at the Road P crossing (`RAIL_PHONE`) on the **north side of the tracks**, beside the southbound-approach mast (`x = RDPX_C - 5.2 - 1.9`, `z = mainZ(px) - 9 - 1.2`) so it stands clear of the gate arm and the roadway. `buildRailPhone()` builds a concrete pad, post, weatherproof cabinet with door/latch/rain hood, a handset with a coiled cord and a `RAILROAD / DISPATCHER PHONE` plate; it registers a 0.42 m collider through `extraCols` and every mesh is `userData.noHit`.
- `X` / `E` within 2.3 m opens `railPhoneMenu()` (built on `modal`), whose options follow the state of the line: **call a train and hold the crossing**, **send the blocked train on**, **call a train straight through**, hang up. A controls-help row was added for it.
- Through freights gained a small state machine (`state`, `speed`, `target`, `heldT`, `warned`). A hold eases the consist to `uc + TLEN/2` so it parks **across** the crossing, which keeps the existing `RXING.active` test true — the gates stay down and the bell rings while the road is physically blocked (`THRUS` cars are already solid bodies for Squeeg). `send` clears the target and accelerates back to 22 m/s; `through` starts a waiting consist with no stop target. Normal random traffic is unchanged when the phone is not used.
- Holds auto-release after **300 s** (notice at 285 s) so the crossing cannot stay blocked forever; the warning reaches the HUD through `railPhoneNotice()` polled by the UI.
- 2P: the host owns the trains. A guest's request is sent as `{t:'rp', a:'hold'|'send'|'through'}` and applied by the host in `netRecv`; the existing `th` packet already replicates consist positions, so no extra state is needed.
- Tests: new `test/validate-rail-phone.cjs` covers proximity, stop accuracy on the target, `RXING.active` staying true while held, send-on and call-through, the five-minute release, and the guest relay. `test/validate-live-promotion.cjs` no longer asserts `game.html === test/game.html`: parity is enforced by `sync_test_to_live.py --check` at promotion time, so TEST can legitimately run ahead of LIVE during development.
- Bumped TEST to `1.97.29` / `corn-souls-test-shell-v56`. LIVE is untouched at Alpha v1.98.

## TEST v1.97.28 — remove the controller button-echo diagnostic (2026-11-01)
- Deleted the TEST-only controller diagnostic that echoed every newly pressed gamepad button into a `#corn-pad-diagnostic` overlay pinned to the top of the screen. It had served its purpose (identifying the Retroid stick-click mapping); the direct R3 routing fix it shipped with is unchanged.
- `test/index.html` loses 13 lines / ~1.9 KB; `game.html` and `test/game.html` are untouched. Bumped TEST to `1.97.28` / `corn-souls-test-shell-v55`.

## TEST v1.97.20-v1.97.27 — Squeeg GLB character, walk rig, and gun/prop fixes (2026-11-01)
- Squeeg's third-person body is now the owner-made `test/models/operator_male_psx_rig.glb` (1,936 triangles, 16 flat materials, no textures, no skins, no animations, 1.804 m tall with the feet at Y=0, facing +Z). `test/squeeg-model.js` is inlined by the TEST launcher at `function buildSelfAv()` through asserted `html.replace` anchors, parses the GLB with a purpose-written reader, then scales it with the existing `SQ_K` (1.684 m) and rotates it 180 degrees to match the game's -Z forward. The box character remains the fallback.
- The export is **flat**: `Arm_Upper_*`, `Arm_Lower_*` and `Hand_Bare_*` are siblings under `Arm_Hierarchy_*`, so rotating one node moved a single mesh and the limbs came apart. The engine now builds pivot Groups at the real joints (shoulder Y=1.240, elbow Y=1.010, hip Y=0.620, knee Y=0.260) and re-parents the parts with `attach()` so world transforms are preserved. The walk cycle is hip/shoulder swing plus knee fold and a standing elbow bend.
- Walk feel is exposed as tunables in `SQUEEG`: `cadence: 0.72` (fewer, longer steps), `stride: 0.70`, `armSwing: 0.55`.
- Held items anchor to the hand that appears on Squeeg's **right**, matching first person. The GLB's node names are mirrored relative to anatomy (`Hand_Bare_R` sits at +X while the model faces +Z), so `SQUEEG.hand = [0.292, 0.835, -0.030]` and the arm that raises to carry is the one on that side. `SQUEEG.hold` adds per-item tilt deltas on top of each item's authored pose (gun -0.15 rad, crowbar -0.60 rad).
- Fixed the third-person gun's ammo display: the avatar's copy never receives `setRounds()`, so its magazine sat at build defaults, including the water column at `scale.x = 1` — a 1 m long, 9 mm blue bar through the character. `squeegPose()` now calls `setRounds(ammo, mags[ammo])` each frame and hides the water level on that copy, so the paintball row reflects the real magazine.
- Safety: gated to the `/test/` path (`?char=0` forces the box character, `?char=1` forces the model); any fetch or parse failure logs `[squeeg]` and keeps the box character; every mesh is `userData.noHit`; collision remains the independent `BODY_R = 0.28` capsule. Debug handles `window.__squeeg`, `__view`, `__scene` and `__diag` are exposed for future sessions.
- Note for future debugging: `updateSelfAv` re-asserts `VIEW.items[k].visible = k === held` and `av.visible = true` every frame, so toggling `.visible` from the console is undone immediately — read state with `__diag()` instead of hiding objects.
- **Promotion checklist for the LIVE move (not done yet):** `sync_test_to_live.py` does not touch `squeeg-model.js`, so before promoting this feature three things must happen. 1) Copy `test/squeeg-model.js` to the repo root and `test/models/operator_male_psx_rig.glb` to `assets/models/`, and update the model URL in the LIVE copy to `/corn-souls/assets/models/operator_male_psx_rig.glb`. 2) Drop the `/\/test\//` requirement in the `SQUEEG.enabled` gate (keep `?char=0` as the off switch), otherwise LIVE silently keeps the box character. 3) Add both files to the LIVE service-worker `PRELOAD` list if they should work offline. Until then LIVE stays on the box character by design.
- Registered the model as a first-party asset (`first-party-operator-male-psx-rig`) in `assets/registry.json` and `CREDITS.md`; `credits.html` renders it from the registry. Bumped TEST to `1.97.27` / `corn-souls-test-shell-v54`. LIVE is untouched at Alpha v1.98.

## TEST v1.97.19 — remove the wind debug readout and its instrumentation (2026-11-01)
- The windsocks track real weather correctly on PC and RP6, so the TEST-only `#wind-readout` overlay has served its purpose and is gone. Removed the `<TEST-ONLY>` block plus the `window.__cornWindSockState` and `window.__cornWindWeatherAt` instrumentation that existed only to feed it, from **both** launchers. The windsocks keep the compass/vector mapping and the 5-minute Open-Meteo refresh.
- `scripts/sync_test_to_live.py` now strips zero or more `<TEST-ONLY>` blocks (it previously required exactly one) and still aborts on an unbalanced marker, so the mechanism stays available for future debugging aids without forcing a dummy block.
- `--check` still reports `index.html: MATCH`, `game.html: MATCH`, wiring CONSISTENT after the manual edits, and neither launcher contains `windDebug`, `wind-readout`, `__cornWindSockState` or `__cornWindWeatherAt`.
- Bumped TEST to `1.97.19` / `corn-souls-test-shell-v46`. LIVE stays Alpha v1.98 / `corn-souls-live-shell-v8`: the removed globals were invisible, so no release bump was warranted.

## TEST v1.97.18 — release tooling: generated LIVE launcher, TEST bump helper, CI guards (2026-11-01)
- Added `scripts/sync_test_to_live.py`. The LIVE launcher is now GENERATED from `test/index.html` by asserted transforms instead of being hand-edited, and one run also refreshes `game.html`, `version.json`, `refresh.html`, the `sw.js` cache name and the assertions in `test/validate-live-promotion.cjs`. `--check` proves LIVE still equals the generated output (currently index.html MATCH, game.html MATCH, wiring CONSISTENT), `--consistency` verifies version/cache wiring for CI, and `--live-version X` performs the promotion. Any transform whose pattern is missing aborts instead of silently producing a half-patched launcher.
- TEST-only code must now be wrapped in `// <TEST-ONLY>` ... `// </TEST-ONLY>`; the generator strips those lines. The wind readout block in `test/index.html` is marked, so the Alpha v1.98 LIVE leak cannot recur.
- Added `scripts/bump_test_version.py` (bumps `TEST_VERSION` plus the TEST cache name so installed apps auto-update), `scripts/check_launcher_anchors.py` (verifies every patch anchor and `hookA`-`hookF` against the game source without Node), and the double-click helpers `BUMP TEST VERSION.bat` / `PROMOTE TEST to LIVE.bat`.
- Added `.github/workflows/validate.yml`: blocking anchor + LIVE wiring checks on every push, plus the Node gameplay suites on GitHub's Node as report-only, because `node` is not installed on the development machine.
- Added `RELEASE.md`: the change -> TEST -> PC/RP6/RP Nova -> promote loop, the per-device checklist, and the rules that prevent the failures actually hit so far (hand-edited LIVE launcher, CRLF worktree, `git add -A`, unregistered GLBs).
- Bumped TEST to `1.97.18` / `corn-souls-test-shell-v45`. The marker lines are comments, so there is no behavior change. LIVE is unchanged at Alpha v1.98 / `corn-souls-live-shell-v8`.

## LIVE Alpha v1.98 — local clone synced and leaked TEST wind readout removed (2026-11-01)
- Fast-forwarded the local clone `02dfbe9` -> `1364a5e` ("Promote latest TEST game to LIVE Alpha v1.98"). LIVE was already serving Alpha v1.98 (`index.html` `TEST_VERSION='1.98'`, `version.json` 1.98, `corn-souls-live-shell-v7`); the working tree had simply not been fetched since 2026-10-30 17:48, which is why the local files still read 1.97 / 1.91 / shell-v6. `game.html` is now byte-identical to `test/game.html`.
- Removed the TEST-only wind readout that the promotion carried into LIVE `index.html`: the `#wind-readout` overlay definition plus its unconditional `html=html.replace(/<\/body>/i,windDebug+'</body>')` insertion, which drew a "WIND LIVE n mph FROM x" debug box at the bottom-left of the LIVE game. The invisible `window.__cornWindSockState` / `__cornWindWeatherAt` instrumentation stays for console debugging; TEST keeps its readout by design.
- Bumped the LIVE cache to `corn-souls-live-shell-v8` and updated the matching assertion in `test/validate-live-promotion.cjs`.
- Local-testing gotcha: with `core.autocrlf=true`, `git checkout` rewrites `game.html` to CRLF in the working tree while the committed blob stays LF. The launcher's two multi-line anchors (`fire`, `playerCollision`) contain `\n` and can never match `\r\n`, so serving a local checkout failed with `Corn collision test patch mismatch: fire, playerCollision`. GitHub Pages serves the LF blob, so LIVE was never affected. Added `.gitattributes` (`* text=auto eol=lf`) and converted the worktree copy; local server tests now match production byte-for-byte. LIVE stays `Alpha v1.98` (cache revision only), so the Chrome LIVE icon, manifest identity and worker scope are unchanged.
- Fixed this changelog: the v1.98 entry claimed TEST advanced to `1.98.0` / `shell-v39` but TEST is still `1.97.17` / `shell-v44`, and that entry was filed below older v1.97.x sections. It now sits newest-first with corrected facts.
- Verification: 19 static promotion assertions pass (game/test parity, manifest id+scope, LIVE launcher base/scope, `version.json`, worker TEST exclusion, `refresh.html` clearing only the LIVE cache, shared-helper parity), and every launcher `includes()`/`replace()` patch anchor still resolves. **The Node suites were NOT run: `node` is not installed on this machine.** Install Node 20+ and run the suites before the next promotion; `test/validate-live-promotion.cjs` must be run from the repository root, `test/validate-mcc-extinguisher.cjs`, `validate-npc.cjs`, `validate-west-wing.cjs` and `validate-windsocks.cjs` from `test/`.

## LIVE Alpha v1.98 — TEST feature promotion (2026-10-30)
- Synchronized `test/game.html` with the latest `game.html` (`20333b0`), bringing Vern, expanded Rick and Tammy dialogue, dual windsocks (`O.windsocks`), `extWall()` PSX fire-extinguisher mounts (N Energy MCC, north energy door, turbine building doors, south wall roll-up door), open fermentation aisle south of Ferm MCC, 8 ft west ethanol loadout shed shift, and methanator pump house T-support removal into TEST.
- Promoted TEST v1.97.1–v1.97.11 launcher patches into LIVE `index.html`: centered walking 3rd-person camera, real-weather windsock compass/vector mapping (updated to drive all socks in `O.windsocks`) with 5-minute Open-Meteo refresh, localized rail crossing bell fade, 3rd-person seated mower operator avatar, fermenter top guardrail stair-gap alignment, far pond shoreline hopping/croaking frogs, dynamic solid-body vehicle/train collisions, 2P moving mower blade strike, and Pause menu Controls entry.
- Updated LIVE to `Alpha v1.98` (`index.html`, `version.json`, `sw.js` cache `corn-souls-live-shell-v7`). TEST was **not** advanced by this promotion and stays at `TEST_VERSION='1.97.17'` / `corn-souls-test-shell-v44`; the earlier 'TEST v1.98.0 / shell-v39' wording was wrong. Separate Chrome LIVE and Edge TEST PWA identities are preserved.
- Reconciled `assets/registry.json`, `CREDITS.md`, and `assets/models/README.md` with all five shipped GLB models in `assets/models/` (`horror_game_crowbar.glb` by hvarley, `psx_fire_extinguisher.glb` by zynxeror, `corn_cube.glb` by tg, `corn_low_poly.glb` by Low Poly Fox, and `pallet.glb` by Thingits — all CC BY 4.0) so `credits.html` displays full creator attribution, source links, license links, and modification notes.

## TEST v1.97.17 — methanator hallway with protruding tank manways & pancake blind flanges, and flat textured pavement & dirt roads (2026-10-30)
- Converted the dead-end gabled shed between the four Methanator Tanks (`x = 13.6`, north green door at `z = -36.55` in `test/game.html`) into a full-length enclosed gabled hallway (`D = 12.85 m`, `z = -36.55..-23.7`) with overhead light fixtures that connects and opens directly through the north wall of the process building (`z = BSZ = -23.7`).
- Kept the four Methanator Tanks (`x = 11.15` and `x = 16.05`, `CR = 1.75`) protruding ~0.25 m inside the hallway walls (`x = 12.65` and `x = 14.55`), and moved their manways to the inside (hallway-facing) wall of each tank, closed off by bolted circular pancake blind-flange fittings while keeping a clear `1.4 m` walkway down the center.
- Replaced all `0.20 m` thick untextured 3D road/pad boxes in `test/game.html` with flat `PlaneGeometry` surfaces (`y = 0.024`, `polygonOffset` enabled) using new seamless procedural `'asphalt'` (weathered blacktop with aggregate speckles) and `'dirtroad'` (graded compacted dirt/gravel with wheel ruts and pebbles) textures in `groundTex()`/`groundMat()`. Applied across all plant paved roads, Grain Yard access and bypass roads, Scale House exit road, Employee Parking Lot and driveways, Road P, US-54 divided highway, the Cross Road (`CZR`), and the Tank Farm perimeter dirt roads (`tfE`, `tfS`, `tfW`), with flat lane markings and flush parked vehicles.
- Added automated collision and geometry verification in `test/validate-west-wing.cjs` and bumped TEST to `1.97.17` / `corn-souls-test-shell-v44`. LIVE files untouched pending owner test.

## TEST v1.97.16 — centered control room / office block, flat walkable silo tops, and automatic PWA update (2026-10-30)
- Shifted the Control Room / Lab / Office block south (`WEST_WING.officeNorth = 14`, `OZN = 14`, `OZS = 20.95`, `OZH = 18.75` in `test/game.html`) so it sits centered between the Cook Alley equipment (`z ≈ -2.15`, ~16.15 m clearance to the north) and the Evaporators (`z - r = 37.6`, ~16.65 m clearance to the south). All interior offices, Lab, Break Room, Locker/Bathroom, Control Room consoles, furniture, doors, windows, key hooks, and Rick (`z = 15.75`) move rigidly intact.
- Shifted the Cook Alley trench drain (`z = OZN - 2.6 = 11.4`, both west and east of `AC` to the east roll-up door) and the Evaporator Alley trench drain (`z = OZS + 1.1 = 22.05`, connecting perpendicular to the Fermentation Alley trench drain at `x = AC`) with the relocated Control Room / Office block.
- Flattened the tops of all four silos (Tin Bins #1, #2, #3, and #4) in `test/game.html`: set `dome: false` on all four silo `tank()` calls, lowered the grain spout endpoints to the flat roof (`SILOH + 0.15`), added a flat red circular roof deck (`y = SILOH + 0.075`, walkable top at `y = 22.15`) inside `siloClimb()`, centered the west ladder guardrail opening, and replaced the stepped dome rings with a flat walkable roof surface (`WALK_SURF`).
- Updated `test/sw.js` (`corn-souls-test-shell-v43`), `test/index.html` (`TEST_VERSION = '1.97.16'`), and `test/refresh.html` so the RP6 PWA fetches `./index.html?check=...` on launch/resume and automatically activates and reloads into new versions. LIVE files untouched pending owner test.

## TEST v1.97.15 — shoot, grab, carry, and throw dead birds, frogs, rats, and lizards (2026-10-30)
- Added paintball and melee-tool hit support for pond frogs (`hitPondFrog` in `test/index.html`, `toolHit` in `test/game.html`) so frogs can be shot or whacked like birds, rats, and lizards, flipping belly-up with paintball color splat and puff effects.
- Extended dead critter persistence (`hitCritter`, `updateBirds`, `updatePondFrogs`) to 45 seconds when untouched, paused despawn timers while held or in flight, and made falling birds land on the local walkable floor/deck height (`floorAt`) so they remain within reach.
- Extended `cornEngine` (`cornCritterDead`, `cornCritterWrap`, `cornSyncDeadCritters`, `cornInteract`, `cornThrow`, `cornUpdate` in `test/index.html`) so dead birds (`dead bird`), frogs (`dead frog`), rats (`dead rat`), and lizards (`dead lizard`) can be grabbed with Interact (`E` / `X` / `🖐️`), carried in front of the player, set down with Interact, or thrown with Fire (`click` / `R2` / `🎯`) with full 3D gravity, spin, wall/floor bounce, and live-critter knockdown physics.
- Added automated pickup/carry/throw verification for all four critter types in `test/validate-traffic.cjs` and bumped TEST to `1.97.15` / `corn-souls-test-shell-v42`. LIVE files untouched pending owner test.

## TEST v1.97.14 — process building footprint, cook alley clearance, trench drain T-junction, and windsock dialogue (2026-10-30)
- Updated the process building footprint in `test/game.html` to match the owner's purple-line plant diagram:
  - Restored `WEST_WING.south = 44` so the west wing extends south to `z = 44` in line with the south wall, putting Evaporators 1–8 (`EZ = 40.6`) and their 4-story enclosure back along the `z = 44` south wall and restoring the outdoor Distillation pad south of the building (`z = 53.05`, reconnecting with the 190/200-proof pipe rack), while keeping the Office/Lab/Control Room block shifted north (`z = 5..11.95`) for a full-size open Evaporator Alley.
  - Straightened the eastern exterior wall along `x = 19` from `z = -23.7` (`BSZ`) to `z = 44` (`SZ`), removing the eastern `x = 19..37.4` bump-out, shifting the three Maintenance Shop offices west to `x = -7.6..0` (`MX0 = FXE`, `OFX = 0`), and placing the Maintenance Shop floor, workbenches, tool wall, radio, cabinets, and forklifts inside `x = 0..19` (`P3.cam.tx = 10, tz = 27` in `test/index.html`). Extended the outdoor concrete shop yard apron west to `x = 19`.
- Removed the southwest door on the west wall (`WZS - 1.7 - NZ`) and any door on the west-wing south wall.
- Extended the Evaporator Alley trench drain (`z = OZS + 1.1`) east to `x = AC` (`-19.3`) so it connects perpendicular to the north–south Fermentation Alley trench drain.
- Shifted Cook Alley equipment (`blend`, `st1`, `cip`, `st2`, `SP1`, `SP2`, `strA`, `strB`, `hop`, `hydro`, `ct1`, `ct2`, `flash`, and the flash pump, plus connecting pipes/flows and `UPOS` entries) 3.5–4.5 m north toward the `z = -12.5` north wall, opening >7 m of clear aisle north of the Lab / Control Room / Office block (`OZN = 5`).
- Updated Rick's `wxSay` dialogue to reference only the two plant windsocks ("Check the wind socks by the wet cake pad and ammonia tank before you mess with ammonia.").
- Updated `test/validate-west-wing.cjs` and bumped TEST to `1.97.14` / `corn-souls-test-shell-v41`. LIVE files untouched pending owner test.

## TEST v1.96.20 — berm-filling spill and louder closing thud (2026-10-29)
- Acid pool now begins at the first stream impact and spreads as clipped rectangular bounds until it covers the berm interior. The origin persists while draining, avoiding jumps when a leak ends; it resets after drying. Surface rises from 0.13 m to 0.68 m, below the 0.9 m curb. Ripples follow its height. Contact hazard footprint follows the rectangular visible surface; burn timing, leak duration and fill/drain rates remain unchanged.
- Doubled both layers of the cooler's final closing thud (.28→.56 noise, .22→.44 low resonance). Opening/movement levels and attenuation are unchanged.
- Real Three.js tests cover starting under stream, stream coverage throughout spread, all containment bounds, full interior coverage, height below curb and retained/reset anchor. Audio tests verify increased closing level and retained quieter opening. Full generated game validation passes. TEST 1.96.20 / shell-v28; LIVE unchanged. Visual/listening check remains pending.

## TEST v1.96.19 — cooler door audio and acid scope correction (2026-10-29)
- Added short synthesized opening latch/seal, closing movement and final closing-thud sounds to all yeast cooler doors. Sounds use the existing effects context, attenuate/pan with distance, skip suspended/background audio, and release their nodes. Door-target transitions (local or remote) play once; the close thud fires only when motion reaches fully closed. Temperature, collision and network packets are unchanged.
- Corrected v1.96.18 `saLiquidMesh is not defined`: acid helpers were injected outside Plant3D's private scope. They now sit beside `saHit` within the plant closure. Added generated-source scope assertions and execution of the actual helper/caller pair; a tool hit successfully constructs the mesh. Owner's screenshot confirmed the original v1.96.18 error.
- Door transition/completion tests, audio-node scheduling/cleanup tests, real Three.js liquid geometry tests and full generated-game syntax validation pass. Listening/device/multiplayer checks still pending. TEST 1.96.19 / shell-v27; refresh helper updated. LIVE unchanged.

## TEST v1.96.18 — liquid acid leaks (2026-10-29)
- Replaced world-origin-scaled/jittering acid streams and rising impact puffs with hole-local curved liquid streams, moving pale liquid highlights and flat impact ripples. Pool opacity changes are subtler. Materials/texture/ripple geometry are shared; per-leak tube geometry and ripple material are disposed on patch/expiry. No external assets added.
- Original paintball collision called ammonia damage only. Added acid damage for locally originated paintballs, reusing the existing `sa` multiplayer packet once per created hole. Remote projectile visuals do not duplicate the leak. Paintballs cannot invoke the wrench repair branch if the player switches tools in flight. Tool hits/repairs remain on their existing path.
- Leak lifetime, landing point, pool growth/drainage, containment bounds, damage and alarms are unchanged. Real Three.js geometry tests confirm source/end anchoring, 1,000-frame stable positions, flowing texture/ripple animation, shared resources/disposal, and paintball packet rules. Full generated-game validation passes. Visual and live multiplayer checks remain pending. TEST 1.96.18 / shell-v26; LIVE unchanged.

## TEST v1.96.17 — unlimited vehicle turbo (2026-10-29)
- Removed turbo tank depletion and recharge gating for the Ranger and other existing turbo-equipped vehicles. Holding B / Shift / NOS now sustains turbo without running out. The bar stays full; releasing the control, braking and reverse restrictions retain their existing behavior. Vehicles without turbo remain unchanged, as do boost power/top speed, effects and multiplayer boost packets.
- Validation executes the patched boost logic for 10,000 consecutive frames, starts from an empty reserve, and checks release/brake/reverse/non-turbo cases. Full generated-game validation passes. Version 1.96.17 / shell-v25; refresh helper updated. LIVE unchanged; device driving check pending.

## TEST v1.96.16 — first-person tools and hand overlay world transparency (2026-10-29)
- User showed pegboard shovel drawing over the held crowbar and reported silo/pipe transparency drawing over the crowbar and empty hand. Root cause: shotgun alone used the separate post-world HUD scene; hand/tool groups were parented to the world camera, and the HUD draw guard skipped rendering whenever the shotgun was hidden.
- Reparent all first-person held groups to the existing HUD scene on creation and render that pass whenever a held group is visible. Existing world render → clearDepth → HUD order now covers crowbar, hand, squeegee, other tools and extinguisher. Shared local poses, animations, first/third-person visibility, world tool models, transparent world materials and gameplay are unchanged.
- Validation executes the patched item initialization and actual HUD draw function with renderer doubles: all held groups leave the world pass; local pose stays intact; crowbar/hand/squeegee/ext render after world and depth clear; autoClear is restored and hidden items skip drawing. Full generated game scripts pass syntax validation. Visual iPhone/PC/Retroid validation remains pending. TEST 1.96.16 / shell-v24; LIVE unchanged.

## TEST v1.96.15 — inline music volume buttons (2026-10-29)
- Placed − to the left and + to the right of the music slider in a responsive three-column row. Removed the separate volume actions below it. The 44px buttons have accessible labels and update slider/percentage without rebuilding the menu; controller navigation includes both and preserves focus for repeated presses.
- Volume/layout behavior and full generated-game validation pass. Version 1.96.15 / shell-v23; refresh helper updated. LIVE unchanged.

## TEST v1.96.14 — remove pause reset action (2026-10-29)
- Removed Reset all setpoints from the TEST pause menu at the owner's request. Equipment settings and simulation behavior are unchanged.
- Complete loader/generated-script validation passes. Version 1.96.14 / shell-v22; refresh helper updated. LIVE unchanged.

## TEST v1.96.13 — Sound submenu and saved music volume (2026-10-29)
- Moved the pause menu's Music toggle into a vertical Sound submenu. Added a 0–100% music slider, live percentage label and controller-friendly ±10% actions that retain focus for repeated changes. Back returns to the vertical pause menu.
- Music level persists in `cs_music_volume`, including zero, and is applied before the first track. Invalid/blocked storage falls back to the existing 60% default; the existing on/off preference and background-audio handling are preserved. This controls background music only; spatial/game effects remain unchanged.
- TEST v1.96.13 / shell-v21; refresh helper and precache include the new settings script. Volume behavior, persistence/bounds, toggle preservation, controller focus, complete generated game syntax and the existing inbox/traffic checks pass. Browser/device audio listening remains pending. LIVE unchanged.

## TEST v1.96.12 — vertical pause menu (2026-10-29)
- Pause/main menu now uses the existing vertical modal layout: one full-width action per row. Shared pause button, menu button and controller Start entry retain their existing actions. Inbox and weather layouts remain unchanged.
- Complete loader/generated-script validation and existing client checks pass. Version 1.96.12 / cache shell-v20; refresh helper updated. LIVE unchanged.

## TEST v1.96.11 — compact Debug and message browsing (2026-10-29)
- Built on current main `332fe8d` (TEST v1.96.10), preserving its inbox response checks and post-login error handling.
- Renamed the Debug/pause entry and form title to Message Developer. Grouped live/sunny/cloudy/rain/snow under one Weather submenu with a Back to Debug action; existing weather behavior is retained.
- Developer Inbox now uses a wider responsive panel, compact All messages/Unread/Resolved tabs, readable message preview rows, and a short footer. It defaults to All messages so opening a message does not make it disappear on the next visit. Empty states explain the selected filter.
- Message view has Back to messages, Previous/Next message, a collapsed screenshot, and readable body text. Resolving advances to the next message in the current page when available. Filter and message controls are included in controller navigation; focused controls scroll into view. Back to game remains visible.
- Version 1.96.11 / cache shell-v19 and refresh helper updated. All three client validation scripts pass, including selected filters, next/previous navigation, resolve-and-advance, escaped content, weather selection and full generated game syntax. `git diff --check` passed. No real browser rendering or iPhone/Retroid visual validation performed. Backend authorization and LIVE files unchanged.

## TEST v1.96.9 — menu exits and central inbox cleanup (2026-10-29)
- Owner confirmed Developer Inbox sign-in opens successfully after approving their Auth user; reports an inability to leave the menu. Central report send/receipt and other-device testing are still not confirmed.
- Added a sticky Back to game × action to TEST modals and border-box viewport sizing so the exit stays reachable on short screens. Inbox close explicitly removes the overlay, clears stale controller targets and invalidates pending views. Controller B/Start uses the same path; Escape also works while an inbox login field is focused. Existing join-code button indexes are preserved.
- Removed the old Read notes entry from Debug at the owner's request. Developer Inbox remains; stored local notes and their retry/share code are preserved, with no automatic upload or deletion of old notes.
- Version 1.96.9 / cache shell-v17; refresh helper updated. All three client checks and generated-game syntax pass, including exit overlay state, stale-request cancellation and removed menu entry. Visual checks on iPhone/Retroid remain pending. LIVE unchanged.

## TEST v1.96.8 — receiving project configured (2026-10-29)
- Owner supplied project `jicsccfdcmjxzopaqbca`, its public publishable key, and reported "Success, no rows returned" after running the supplied inbox schema in SQL Editor. TEST config now points to that project. No secret/service-role/database credentials are stored.
- TEST advanced to 1.96.8 / shell-v16 to refresh the configuration. All three local client validations pass. Direct API verification was blocked by DNS/network restrictions in this session; do not claim hosted delivery or RLS tests passed. Developer Auth user/allowlist, transactional SQL security test, and real send/read test remain pending. LIVE unchanged.

## TEST v1.96.7 — in-game developer inbox prepared (2026-10-29)
- Added TEST in-game Developer Inbox sign-in, approved-reader check, unread/all/resolved pagination, escaped report details, private screenshot display, read marking and resolve/reopen actions. Credentials are not stored; tokens remain in memory. Pending responses cannot reopen the inbox after sign-out/closing it.
- When configured, Send report saves locally and uploads through a bounded submission RPC. Report UUIDs are persisted before upload; confirmed reports are not resent and retries reuse IDs. Existing notes require an explicit Send to developer inbox action. Sharing remains available as a fallback.
- Added schema, transactional database access tests, public URL/publishable-key configuration and `test/INBOX_SETUP.md`. Config remains empty: Supabase is installed, but no project/database tools are available in this chat. No hosted schema, reader account, or real report delivery has been configured or verified. The UI explicitly says not connected and preserves local notes.
- Validation: all three client validation scripts and generated-game syntax checks pass. Hosted SQL/RLS tests, advisors and an iPhone-to-developer end-to-end test remain REQUIRED after connection. TEST version/cache/refresh advanced to 1.96.7 / shell-v15. LIVE Alpha v1.96 unchanged.

## TEST v1.96.6 — share debug notes across devices (2026-10-29)
- Debug notes previously lived only in the author's localStorage (`cs_notes`); no report was delivered to the developer. Existing notes and storage keys are preserved.
- Added TEST-only Share note actions after a successful save and beside every stored note. Native sharing supplies report text, build, timestamp, device/location/held-item metadata and JPEG screenshot when file sharing is supported. Users choose the recipient and finish sending in Messages, Mail or another share target. No automatic inbox or delivery confirmation is claimed.
- Missing/failed sharing falls back to escaped report text, clipboard/manual copying and screenshot download. Cancellation leaves the saved note intact; storage failures reopen the original form. Saving and copying are explicitly distinguished from sending.
- TEST loader now loads `note-sharing.js` with checked source anchors. Version 1.96.6, cache shell-v14 and refresh helper updated. LIVE Alpha v1.96 is unchanged. Older notes can be shared after opening TEST in the same browser/storage context; Safari and installed iPhone apps may have separate storage.
- Validation: `node test/validate-notes.cjs`, `node test/validate-traffic.cjs`, and `git diff --check` pass. Generated full-game scripts parse. Native iPhone share-sheet behavior and actual message receipt still require an on-device test.

## TEST v1.96.5 — guest semi smoothing and directional highway traffic (2026-10-29)
- Owner confirmed R3 works and semis synchronize in TEST v1.96.4; Nova guest movement looked choppy with RP6 hosting.
- TEST loader now buffers host semi poses and interpolates position and shortest-path yaw 250 ms behind receipt time. New IDs start at their host pose; missing IDs are removed on the next snapshot; an empty snapshot clears all semis. A bounded eight-pose buffer holds the latest pose if updates stop, without extrapolating through stops. Host simulation, packet frequency and gameplay remain unchanged.
- Highway traffic uses 20 fixed, double-sided side quads sharing one plane geometry and four existing canvas materials. Headlights/local +X follow the highway tangent in each travel direction. No camera-facing billboards, new external assets, colliders or shadows. Host traffic clock synchronization is retained.
- TEST version is 1.96.5; independent PWA cache is shell-v13 and TEST refresh helper targets 1.96.5. LIVE Alpha v1.96 files are unchanged.
- Validation: `node test/validate-traffic.cjs` executes the complete loader against the checked-in game, parses every generated inline script and checks semi spawning, interpolation, shortest turns, stalled updates, despawning, fixed highway headings, shared geometry/materials and traffic clock hooks. `git diff --check` passed. No browser rendering or physical Nova/RP6 multiplayer test performed; owner should verify both devices on the same TEST version before promotion.
- TEST: https://crazylegsmalone.github.io/corn-souls/test/?build=1.96.5 ; refresh: https://crazylegsmalone.github.io/corn-souls/test/refresh.html . No promotion to LIVE authorized.

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
### 2026-10-30 — LIVE promotion to Alpha v1.98
- Owner requested updating the live game. Promote the complete TEST v1.97.17 game and launcher behavior from commit `02dfbe9`, including subsequent methanator sign removal. This uses the latest test layout, including centered offices and the straight east wall; it does not recreate the earlier superseded satellite-layout draft.
- Preserve LIVE manifest/install identity and root URL. Adapt the tested launcher to root asset paths, Alpha labels and LIVE-only update checks; bump LIVE service-worker cache to v7 while retaining its offline fallback and exclusion of `/test/`. Add a LIVE-only refresh page; publish `version.json` 1.98. TEST files remain independent.
- Promote sound-menu and developer-inbox fixes with LIVE inbox links/configuration paths. Keep all existing models and gameplay patches.
- Backup: local Git branch `backup/pre-live-1.98` at `02dfbe9`; full source ZIP saved outside the repository as `corn-souls-before-live-1.98.zip`.
- Passed: real Three.js layout construction before promotion; LIVE launcher execution and generated-script parsing; Rick menus/context/variation and NPC parity; traffic/HUD/car boost/dead wildlife interactions; windsocks; extinguisher; sound; acid; cooler door audio; note-sharing suites; diff whitespace check.
- Existing `validate-inbox.cjs` fails because its mock lacks `window` for the already-existing page navigation in `inboxOpen`; no new inbox routing change. Browser walkthrough, Android and two-player network play were not performed for this promotion. Browser origin approval remained unavailable in this chat.

GitHub synchronizes committed files, **not** assistant conversations or uncommitted edits. Always fetch the latest state before continuing. If a user has uncommitted local work, request it before editing overlapping files.

## TEST v1.97.12 — satellite west-wing proportions (2026-10-30)
- West arm stays anchored to its existing north/east joins, at full equipment scale: 43 m wide, depth shortened from 56.5 m to 32.5 m. This matches the satellite roof arm's approximate width/depth ratio, not a survey of absolute dimensions. Main ferm/shop south wall, tanks and east road remain fixed.
- Translate the entire office block 6 m north without scaling rooms or furnishings; move Rick with his chair. Relocate strainers and cook tube 2, including pipe paths and selection targets, to retain the cook aisle. Move all eight full-size evaporators and their tower 24 m north; retain over 2 m clear aisle south of the offices. Move the outside distillation pad/beer-feed endpoint into the exposed recess. Add recessed south/return walls, working exits and matching collision; update floors, roof, paths and critter bounds.
- Refresh TEST game source from the current LIVE source before the focused geometry edits, retaining current NPC dialogue and recent plant fixes. TEST launcher retains its own installation identity and patches; version 1.97.12 / shell-v39. LIVE source and launcher are unchanged.
- Validation: real Three.js scene construction; original office meshes and positions compared after rigid translation; eight evaporators and aisle clearances; wall collision and door positions; NPC routing and generated LIVE launcher; windsocks, extinguisher, acid and cooler audio suites pass. TEST launcher loads and starts locally. Full visual overhead comparison and walkthrough remain pending owner review. Publish only TEST pending approval for LIVE.

## TEST v1.97.13 — west-wing polish, asset compliance & code audit fixes in TEST only (2026-10-30)
- **West-wing geometry fixes in `test/game.html` (on top of `v1.97.12`):**
  - Moved the recessed west-wing south exit door from `(-33, 20)` (which was blocked inside by Evaporator #8 at `(-33.6, 16.6)`) to `(-67.7, 20)` in the wide `5.8 m` open bay between Evaporator #1 and Evaporator #2; updated `test/validate-west-wing.cjs`.
  - Moved the evap alley trench drain from `OZS + 3` (`z = 14.95`, buried under the 8 evaporator base rings) to `OZS + 1.1` (`z = 13.05`) down the center of the clear evap alley walkway.
  - Moved the cook alley strainer feed drops from `FZ = 3.2` (inside the west roll-up door lane) to `FZ = 1.85`, routed the overhead discharge header north (`z = -1.2`) without zig-zagging south, moved the orange strainer trash hopper out of the aisle to `WZ = 0.5`, and connected both east-west trench drains (`z = 2.4` and `z = 8.4`) into the central `x = AC` ferm alley trench drain.
  - Updated `STATIONS.dist.pos` in `test/game.html` to `[-52.5, 0, 27.5]` to match the relocated distillation pad.
- **TEST-only code audit fixes (LIVE untouched pending owner play-test approval):**
  - Bumped TEST to `TEST v1.97.13` (`test/sw.js` `corn-souls-test-shell-v40`, `test/refresh.html` `1.97.13`); LIVE files (`game.html`, `index.html`, `sw.js`, `version.json`) remain untouched at `1.97`.
  - Updated `updateWindsock(dt)` in `test/index.html` to animate all windsocks (`O.windsocks || (O.windsock ? [O.windsock] : [])`).
  - Fixed 2P mower death message (`hit === 'mower'`), Pause -> Controls -> Back navigation (`code === 'pause' ? menu() : debugMenu(code)`), gamepad focus preservation on Music toggle (`soundSettings(2)`), `developer-inbox.html` token revocation + `eyJ` anon key support + duplicate CSS removal, Brenda's `didn't` typo, Vern/windsock help text, hidden `#labels` per-frame projection guard, and unused `makeWasher` meshes / dead variables.
  - Registered all 5 shipped `.glb` models as `"in-use"` in `assets/registry.json`, `CREDITS.md`, and `assets/models/README.md`.

## TEST v1.97.14 — play-test feedback: remove west south wall door, connect evap trench drain, shift cook alley north (2026-10-30)
- Removed the south exit door on the recessed west-wing south wall (`z = 20`) in `test/game.html` and updated `test/validate-west-wing.cjs`.
- Extended the evaporator alley trench drain (`z = 13.05`) east to `x = AC` (`-19.3`) so it connects directly into the perpendicular north-south fermentation alley trench drain.
- Shifted all cook alley equipment (`blend`, `st1`, `cip`, `st2`, `SP1`, `SP2`, `strA`, `strB`, `hop`, `hydro`, `ct1`, `ct2`, `flash`, and the flash pump, plus all connecting pipes/flows and `UPOS` targets) `3.5 m – 4.5 m` north toward the north wall (`z = -12.5`), opening over `7 m` of clear aisle space north of the Lab / Control Room / Office block (`z = 5`).
- Bumped TEST to `TEST v1.97.14` (`corn-souls-test-shell-v41`).
