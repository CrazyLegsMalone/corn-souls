## TEST v1.97.56 — the green Jeep and the three white lot cars are drivable, keys in four places (2026-11-09)
- Owner: *"Can you make the green and the white vehicle drivable"*. There are three white ones in the lot, and asked which, the owner chose *"All three"*. Then: *"Put each key in a different place"*.
- The green Jeep, white Jeep Renegade, white Crown Victoria and white '90 Ford Ranger pickup drive like the Silverado (`mkCar`). They're added to `O.cars` after the Pink Sedan, so its index stays 2.
- The Jeep's older builder now tags its wheels (so they steer), records its two collision circles (so they move with it) and copies its cab's seat and steering wheel up for the first-person view.
- **Keys:** each car has its own keychain (fuzzy dice, red heart, gold star, lucky horseshoe), or you can smash a window with the crowbar as before.
  - green Jeep: break room north wall (-63.0)
  - white Crown Vic: control room north wall (-38.5)
  - white Renegade (Tammy's car): scale house, the plant manager's office south wall, beside the golf club
  - white Ranger pickup: the end of the maintenance shop pegboard
- **Fixed:** taking a key checked the position the hook was built at. The scale house is built and then shifted 26 m east, so its key would have been takeable from the parking lot and not where it hangs. It now checks where the key really hangs. Several hooks also no longer grab whichever is first in the list; you get the nearest.
- Checked in the running game: all seven drivable cars have wheels, a seat and a steering wheel. Each new key comes off its hook, and the green Jeep starts and drives with its key.
- New suite `validate-lot-cars.cjs`.
- Bumped TEST to `1.97.56`.

## TEST v1.97.55 — every fire extinguisher is usable (2026-11-09)
- Owner: *"Are all the fire extinguishers functional?"* No: only the two posts (maintenance shop pegboard, parking lot) gave you one. The rest were decoration: the wall mounts used the real 3D model, and four were plain red cylinders. Asked whether to make the wall mounts grab-able and swap the cylinders for the model, the owner said *"Both"*.
- `extWall()` now registers each wall mount as a station, so `takeExtinguisher()` gives a full can from any of them, the same as from a post.
- The four red cylinders are now real wall mounts: by the steel column at the east end of the berm, beside the door with the FIRE EXTINGUISHER sign, standing by the south wall at -152.4, and on the lab's east wall. The red arrow sign at the pump house stays as it was.
- Checked in the running game: 13 stations (2 posts + 11 wall mounts) and no errors. Taking one off a wall gives a full can.
- New suite `validate-extinguishers.cjs`.
- Bumped TEST to `1.97.55`.

## TEST v1.97.54 — flat process building floor, the dead lie on it, the Ranger keeps the pixel fire (2026-11-09)
- Owner: *"Ranger fire went back to old fire. Also in the process building can the floor be flatter. The dead critters And zombies clip into floor after you kill them."*
- **Floor:** the process building's concrete slab (west block, ferm alley, maintenance shop, north rooms) stood 22 cm proud, but walking, landing and dropping all used ground level 0. You, ragdolls, dead zombies, and thrown or falling critters and pigeons all sat 22 cm inside it.
  - The slab is now a flat 9 cm (`SLAB_TOP`, just over the top ground layer). The trench-drain grates are 1.5 cm proud (was 4 cm) and the office tile is 2 cm over the slab (was at 0.25).
  - The slab top and office tile are walkable surfaces (`WALK_SURF`), so `floorAt()` lands everything on the floor you see.
- **Zombies:** a dead zombie pivots on its heels, so it's lifted by its back's depth as it goes over and lies on the floor. After 6 s it fades out where it lies (3 s) instead of sinking through the floor. The green stand-in box's shared material is left alone.
- **Fire:** a vehicle fire picks its art when it lights, so one lit before the pixel fire's strip had loaded kept the old code-drawn flipbook for good. More models now load at startup, so that got likelier. Burning sprites now switch to the pixel fire the moment it's in. Checked in the running game: the Ranger burns with the pixel fire.
- `validate-west-wing.cjs` lists the office tile's drop as deliberate.
- Bumped TEST to `1.97.54`.

## TEST v1.97.53 — the cows and sheep are where you'll come across them (2026-11-09)
- Owner: *"I don't see the sheep or cows or the pigeons"*. All of them were loading and visible. The herds were just 500–800 m out (cows NE around 510, -210; sheep SE around 531, 572), out where the view fades (fog 380–760 m), and the pigeons, 6 since v1.97.51, perch 8–28 m up on the rooftops.
- The cows have moved to the open grass just east of the plant, halfway between the employee parking lot and the north–south road (around 190, -88). The sheep are south of the thin diagonal road, short of the rails (around 175, 255). Both groups are about 150–250 m from the plant and checked clear from overhead. The pigeons are unchanged.
- `validate-farm-animals.cjs`: the herds must be within 420 m of the plant and out east of it.
- Bumped TEST to `1.97.53`.

## TEST v1.97.52 — the ferm alley wall goes round the fermenters, not through them (2026-11-07)
- Owner (screenshot from the yard): *"WALL SHOULD NOT CLIP INTO FERM"*. Since v1.97.156 the ferm alley's two outside walls were carried straight across every tank slot along the column line, through the middle of each fermenter and the beer well, so you couldn't see the yard through the glass from inside. The tanks are translucent, so that panel showed clearly cutting through them from outside.
- Each slot now gets a half-round panel instead. It wraps the alley side of the tank 12 cm outside the shell, from one tangent point to the other, with the top trim's ends capped where the straight runs stop. From the yard each tank stands whole in front of the wall; from inside, the wall bulges round the tanks and there's still no gap to see out through. That covers 7 fermenters plus the beer well.
- `validate-west-wing.cjs` counts the curved panels when it checks for gaps, and now also checks that no straight panel runs through a tank.
- Bumped TEST to `1.97.52` / `corn-souls-test-shell-v258`.

## TEST v1.97.51 — frogs, lizards, crow, fish and flies on micaelsampaio's rigged animals; 6 pigeons (2026-11-07)
- Owner (attached micaelsampaio's **Low Poly Animals (Frog, Frogglet, Crow, Fish)**, CC BY 4.0): *"swap the frog models but we will only have 6 frogs now, pigeon count should be 6 now, replace vulture with the crow, add fish to the pond make them jump out every now and then since water is not transparent. i think the froglet is supposed to be a lizard use it to replace lizard. and what about the fly ?"*, then *"add the fly somehwere"*.
- The new `scripts/split_skinned_glb.py` splits the pack into one rigged GLB per animal under `assets/models/critters/`: `frog1`–`frog4` (four colourings), `frogglet`, `crow`, `fish`, `fly`. Each keeps its skeleton, stands on the ground, is centred and scaled. The lily pad and stick aren't used. The pack has no animation clips, so everything moves by turning bones about model axes each frame. New shared helpers: `critModel` / `critRig` / `rigRest` / `rigTurn`.
- **Frogs:** there are now 6 at the far pond (was 8), using the four colourings, 0.38 m long. The back legs kick out behind on each hop and the mouth opens on each croak. The frog engine is in the TEST shell (`test/index.html`); the old drawn frog stays as a stand-in until the model loads.
- **Lizards:** they're the frogglet (0.3 m). On the floor it lies flat facing its run. On a wall its back faces out, with the head pointing the way it crawls, worked out from its movement so the 2-player guest sees it right too. The tail and legs swing while it moves. Hit tints still apply to just that lizard.
- **Pigeons:** 6 (was 10).
- **The body-collecting bird is a giant crow** (2.19 m wingspan, the vulture's size) with the same perch → swoop → grab → carry-to-the-pond → return routine. Perched, its wings are lowered and swept back. In flight they beat in mirror image, and they're half open for the grab. It caws (two or three) instead of hissing, and every caw throws its head up. The old vulture model is no longer loaded in TEST; LIVE still has it. Vern's dialogue line now calls it a big crow.
- **Fish:** two per pond leap clear of the water every 6–24 s. Each one breaks the surface with a splash, ring and plop, arcs nose up then nose down with its tail beating, and splashes back in. This only happens within 200 m of the pond, and each player sees their own.
- **Flies:** a small swarm (three flies, up to two swarms) buzzes over the nearest carcasses within 30 m. That means a body the crow hasn't taken yet, or a shot rat, lizard, pigeon or frog. Stand within 3.5 m and you hear them buzz.
- Credits: CREDITS.md and assets/registry.json (micaelsampaio). Tests: `validate-vulture.cjs` is rewritten for the crow, and the new `validate-critter-models.cjs` covers the frogs, lizard, pigeons, fish and flies. `validate-drawcall-batch.cjs` now expects six frogs.
- Bumped TEST to `1.97.51` / `corn-souls-test-shell-v257`.

## TEST v1.97.50 — the rat is a real model now (2026-11-07)
- Owner (Sketchfab screenshot, then the GLB): *"replace rat model with this. dont forget to add all credits and attributions"*. The rat critter now wears Tyler Lazzareschi's **Low Poly Rat** (CC BY 4.0) in place of the code-drawn spheres. The new `scripts/slim_creature_glb.py` bakes it to `assets/models/critters/rat.glb`: one mesh, 758 tris, a 256 px colour map, head toward -z like the old rat, on the ground, 0.5 m nose to tail tip, 40 KB. The original is kept as `assets/models/source/low_poly_rat.glb`.
- Each rat gets its own copy of the material, swapped into its tint list, so a hit or an eaten rat still turns only that one red. Behaviour, speed, holding/throwing and 2-player sync are unchanged. The spheres show only until the model loads, or if it fails to load.
- Credits: CREDITS.md, plus an in-use entry in assets/registry.json (credits.html lists it from there). New suite `validate-rat-model.cjs`.
- Bumped TEST to `1.97.50` / `corn-souls-test-shell-v256`.

## TEST v1.97.49 — farm animals, the shed cat, half the grass, a quicker buzzard (2026-11-07)
- Owner: *"could we use thes except the elephant"* (ranaaunhaider12's Low poly animals pack, CC BY 4.0) and *"maybe a few cows in the green fields away from everything same for sheep but in a different area. we can fence them in later and add some animation."* The pack is split into `assets/models/animals/{cow,sheep,dog,cat}.glb` by the new `scripts/split_flat_glb.py` (vertex colours kept, each centred and stood on the ground, head toward +z); the elephant isn't used. Four cows stand in the open grass NE of the plant (around 510, -210), six sheep SE across the rails (around 531, 572). They stand still and have round colliders, ready for fences and animation later. The dog stands at Vern's side at grain receiving.
- Owner: *"can we use the cat in a jump scare. it runs out the first time you open the lawnmower shed"*. The cat is hidden behind the mower until a shed door first opens with you at it: the man door when you walk up to it, or the roll-up when you hit its switch. Then it yowls (synthesised) and bolts out that door, close past you, and off across the yard, gone after about 25 m. It happens once per session and only on your own screen. It can't fire from the title screen's tour.
- Owner: *"cut amount of grass tufts by half"*. `GRASS.density` goes from 0.00825 to 0.004125 tufts/m².
- Owner: *"buzzard picks up bodies after 1 minute instead of 2"*. The vulture now leaves his perch 60 s after a death (was 120 s), and the line about him in the NPC dialogue now says "give it a minute".
- Credits: CREDITS.md and assets/registry.json. New suite `validate-farm-animals.cjs`.
- Bumped TEST to `1.97.49` / `corn-souls-test-shell-v255`.

## TEST v1.97.48 — the shed's lawn mower is there before you walk in (2026-11-07)
- Owner: *"the lawn mower in the shed should spawn in before player opens door right now it looks empty until player crosses threshold"*. To save draws, the parked mower was only drawn while the roll-up door was open or once you were inside the shed's walls, so looking in through the door showed an empty shed. It is now drawn whenever you're within 30 m of the shed (and, as before, while the roll-up is open, while you're mowing, or once it's been taken out).
- Bumped TEST to `1.97.48` / `corn-souls-test-shell-v254`.

## TEST v1.97.47 — no more flicker on the substation forecourt (2026-11-07)
- Owner (screenshot of the forecourt in front of the substation): *"flickering at the ground here"*. The forecourt plane, the substation spur and the pond loop's south corner overlap there, and all three lay at the same height (`GY('dirtroad')`) with the same depth pull (`GB('dirtroad')` = -10), so the depth test could not choose and they took turns: z-fighting.
- Each dirt-road leg now gets its own half-step of pull (-9, -9.5, -10, -10.5) through `dirtRoad(pts, w, pull)`, and the forecourt sits on top at -11. That is all still between the dirt yard (-8) and asphalt (-12), so the ground layer order is unchanged. This also cures the same fight at the loop's two junctions.
- Bumped TEST to `1.97.47` / `corn-souls-test-shell-v253`.

## TEST v1.97.46 — stun baton moved to the owner's spot (2026-11-07)
- Lesion Toolbox placement (made on v1.97.44): the stun baton by the substation's RESET PLANT POWER button goes from -607.70, 1.22, 565.15 to **-609.82, 1.22, 565.08**, turn unchanged (180°). It is still placed relative to the button, which the model sits at -608.60, 565.30, so the offset is now (-1.22, -0.22) instead of (+0.90, -0.15). Its pick-up spot moves with it, since it is built there.
- Bumped TEST to `1.97.46` / `corn-souls-test-shell-v252`.

## TEST v1.97.45 — signpost at the pond-loop fork (2026-11-07)
- Owner: *"the small circle was the positioning of a sign that points left to main power station and '?' to the right"*. The circle mapped to (-295, 207), the fork where the loop splits, coming in from the paved road heading west.
- `fingerpost(x, z, arms)`: a wooden post with pointed arm boards (canvas text on both faces, readable from either side), each turned to point at a spot down its branch. **MAIN POWER STATION** (green) points left, down the east side toward the substation; **?** (brown) points right, along the north side toward the rail. The post has a small collision circle. Checked in headless Chromium coming up the road.
- `validate-power-outage-machines.cjs` pins it.
- Bumped TEST to `1.97.45` / `corn-souls-test-shell-v251`.

## TEST v1.97.44 — the pond dirt road re-laid where the owner drew it (2026-11-07)
- The owner drew the route in purple on an overhead screenshot: *"thats where the dirt road should be instead of where it currently is"*. The drawing was mapped to world coordinates from three known points: both pond centres and the substation forecourt.
- `DIRT_ROADS` now has four legs:
  - a straight-sided loop hugging the two retention ponds: the north side from the paved road by Fire & Process Water (-225, 185) across to the west corner (-734, 433);
  - the loop's east side down to the south corner by the substation, then back up the west side;
  - a run out to the north-west alongside the rail line, kept 12 m east of the track (the drawing ran almost on top of it);
  - the substation spur.
  The old curving tracks are gone.
- `validate-power-outage-machines.cjs`: four legs; every node 8 m clear of both ponds and 10 m clear of the rail, and the loop still clear of the corn circle. The road table no longer has inline comments (the suite parses it). Checked from overhead in headless Chromium.
- `Plant3D.dbg.cam` exposes the overview camera (for overhead checks).
- Bumped TEST to `1.97.44` / `corn-souls-test-shell-v250`.

## TEST v1.97.43 — drivers' hands on the steering wheel (2026-11-07)
- Owner: *"hands on steering wheel"*.
- `armsToWheel()` runs while a seated driver is dressed (`dressPlayerSkin(..., { wheel })`). Each hand goes to its side of the rim (9 and 3 o'clock, a little toward the driver), using a two-bone reach in the body's fore-and-aft plane: the shoulder and elbow angles come from the triangle of upper arm, forearm and shoulder-to-grip distance. Then the arm swings in about the vertical to the rim's width. When the wheel is out of reach sitting straight, the driver leans in from the waist (up to 0.45 rad), and the Ranger driver sits 8 cm further up the seat.
- This applies to your Ranger and the other player's (using the model's own wheel when it has one, otherwise the box Ranger's at -0.3, 1.18, -0.44) and to a car's driver figure (the cabin's wheel). Checked in headless Chromium: both hands within 1 cm of the rim, and a side shot of Squeeg driving with both hands on the wheel.
- Bumped TEST to `1.97.43` / `corn-souls-test-shell-v249`.

## TEST v1.97.42 — third-person attacks (synced), labels back on their buildings, trucks talk at the scale window (2026-11-07)
- **Third-person attacks** (owner: *"3rd person has no animations for any weapons or attacks ... synced with 2player so both players see each others attacks"*):
  - A tool swing winds up back over the shoulder, strikes down in front and settles (0.5 s), and the right arm follows it. A shot kicks the gun up and back.
  - `atkStart` / `atkCurve` / `atkApply`. Your own avatar plays them from `fire()`. The other player's avatar plays them from a new `atk` message (swings) and from the existing `shot` message (shots), so each player sees the other's attacks.
- **Floating labels** (owner: *"the door labels from the scale house and the tin bins are floating in mid air"*): `nameplate()` freezes its matrix, and the two "move the whole block afterwards" loops (the grain yard by GDX/GDZ, the scale house by SH_DX) shifted `position` but never the frozen matrix. The TIN BIN plates and the scale-house door plates were still drawn where those blocks used to be. Both loops now update frozen matrices too. The scale-house door plates are 25% smaller (owner).
- **Scale trucks** (owner: *"grain trucks pulling up to scale house should line up with window ... take a little longer to scale in and out"*): each truck now stops with its driver's window at the scale-house window (x 112), using `cabX`. A box truck's cab is 9.1 m ahead of its origin (which is what the old stops were laid out for); the owner's haulers' cab is 6.05 m, so they used to stop 3 m short. `WEIGH_T` goes from 3 to 9 s.
- `validate-player-health.cjs` covers the attack curves (wind-up, strike, done in 0.5 s, the shot's kick, the item back at rest) and the message wiring.
- Bumped TEST to `1.97.42` / `corn-souls-test-shell-v248`.

## TEST v1.97.41 — 3.0 models for Player 1, Player 2, Tammy and Vern (2026-11-07)
- Owner: *"time to upgrade the models again"*, with four Corn Souls Crew 2.5 exports (each zip: GLB + CREDITS.txt + .wardrobe.json).
- `assets/models/player1_3_0.glb` (long hair, hard hat, belt, boots), `player2_3_0.glb`, `tammy3_0.glb`, `vern3_0.glb` (hard hat, safety glasses, full beard, hi-vis vest, fingerless gloves), stored byte-for-byte. All are on the 66/71-joint Mixamo rig with every finger bone, so the first-person hands are still baked from the players' own hands. `PLAYER_SKIN.url`, `NPC_TAMMY` and `NPC_VERN` now point at them. Brenda and Rick keep their 2.0 builds, and the old files stay in the repo.
- Registered `in-use` and credited in `CREDITS.md`, with each zip's CREDITS.txt text as the modification notice.
- The 3.0 player builds paint skin, boots and jeans in three textures, so the first-person body is one draw more: the `validate-fp-body.cjs` budget goes from 6 to 7.
- Checked in headless Chromium: first-person hands on the gun and wrench, Player 1 in third person, Vern in his vest and beard at receiving, and Tammy typing at her window.
- New `validate-models-3-0.cjs` (in CI). The content suites for the 2.0 files keep testing those files, with their wiring checks moved to the 3.0 names.
- Bumped TEST to `1.97.41` / `corn-souls-test-shell-v247`.

## TEST v1.97.40 — corn zombie prototype (2026-11-07)
- Owner: *"lets add a basic corn zombie or something to test the weapons and player movement. it spawns randomly inside any building but moves slow once found or something im open to ideas this is just a prototype"*.
- **The zombie** (`ZOMB`, `zombSpawn` / `zombUpdate`): Loves_Art's base male (already shipped, CC BY) recoloured at runtime as green skin, corn-silk yellow hair and dirty olive clothes, with its arms out in front and its head lolled. It is merged to one skinned draw, with a simple shamble: legs swing, knees bend, the body rocks and the arms bob. A green box stands in until the model loads.
- **Spawning:** up to 3 at a time, one every 12 s, at a random spot in a random roofed building (`ENCL`, 25–6000 m²) on its ground floor. The spot is clear of walls and machines and at least 22 m from you.
- **Behaviour:** it stands swaying until it sees you (16 m with no wall line between), you come within 5 m, or you hit it. Then it shambles after you at 1.5 m/s (you walk at 8.9) and swipes when within 1.25 m: 14 damage with knock-back, at most every 1.6 s. Being killed by one is "Squeeg got eaten by a corn zombie." (BRAINS / CORNED / HUSKED). It gives up if you get 40 m away.
- **Fighting:** 100 HP. Tools do their `TOOL_DMG` (sledgehammer 40 … knife 15) in front of you and in reach, with a short stagger and push-back; a paintball does 15. When it dies it falls back, lies there, sinks and is replaced elsewhere later.
- **Prototype limits:** each game runs its own zombies (in 2 player you each see and fight your own) and they don't make their own sounds beyond the creature sounds. Debug: `Plant3D.dbg.zombNear()` puts one 8 m in front of you, awake, and `ZOMB.on = false` turns them off.
- Checked in headless Chromium: it chases, faces you, renders green with its arms out, dies to a sledgehammer, and a natural one appeared idle inside a building.
- New `validate-zombies.cjs` (in CI): sight through walls, spawn spots, the slow chase speed, timed swipes, tool and paint damage, death / sink / gone, max 3.
- Bumped TEST to `1.97.40` / `corn-souls-test-shell-v246`.

## TEST v1.97.39 — scale house techs stand at their windows with a computer; knife edges lead the slash (2026-11-07)
- Owner (screenshot of Tammy sitting below the counter): *"remove the chair and have them stand maybe add a keyboard and computer for them to use at window and some basic arm and head animations"*.
  - Brenda and Tammy now stand (`standingPerson`, no chair) just behind the counter's back edge, facing their drive-through windows. `NPC_MODELS` sets `pose: 'stand'`, and `keepY` keeps them on the raised scale-house floor.
  - Each counter has a keyboard in front of the tech and a monitor beside it, angled toward her and clear of the window, with a lit blue screen.
  - `npcTypePose`: upper arms a little forward and forearms bent level, so the hands sit over the keys. These two keep their skeleton (not baked), and `npcAnimRig` / `npcAnimUpdate` (stepSafe 'npcAnim') animate them: forearms tap out of step while typing, and every few seconds they glance at the window or the screen (head + neck) and back. Animation is skipped when you're more than 40 m away.
- Owner: *"the sharp side of blade on both knives is facing the wrong way according to slash direction"*. v1.97.37 turned them end for end about y, which kept the edge on the wrong side. They're now turned about z, which flips the edge too.
- `validate-seating.cjs` / `validate-skinned-npcs.cjs` updated: the techs stand (no chairs at the windows) and are animated.
- Bumped TEST to `1.97.39` / `corn-souls-test-shell-v245`.

## TEST v1.97.38 — Respawn button, back near where you went down (2026-11-07)
- Owner: *"should be able to press a button to respawn a few seconds after death"*, then *"should respawn nearby death area"*.
- When the death scene ends (4.9 s), a red **↻ Respawn** button comes up. It, E / Enter / Space / R, or A / Start on a controller puts you straight back on foot at full health. Starting Squeeg mode any other way hides it.
- `respawnPoint()` (Plant3D.respawnPoint): the nearest spot on rings of 6, 9, 12, 16 and 24 m round the death spot (wider rings up to 100 m for a pond), eight ways round. The spot must be out of the ponds (3 m margin), out of the corn field (3 m) and 12 m from any train car; you face back toward where you fell, and walkStart's push-out keeps you out of walls. Checked in headless Chromium: killed by a pond, the button came up at about 5 s and the click put you back on foot 40 m away on the bank.
- `validate-player-health.cjs` covers the button, its keys, the pond bank, the few-metres case, facing back and avoiding trains.
- Bumped TEST to `1.97.38` / `corn-souls-test-shell-v244`.

## TEST v1.97.37 — windsock back, knife and cleaver held by the handle, jumps never count as falls (2026-11-07)
- Owner: *"put sock back where it used to be my mistake"*. The ammonia windsock (pole and sock) is back at NH3 + (4, -8) = 39.3, -56.5, i.e. v1.97.36's windsock move is undone. The Pink Sedan stays at its new spot.
- Owner: *"the cleaver and knife are being held by the blade"*. The slimming script puts the thicker end at +X as the head. On the knife and the cleaver that end is the handle, so the fist closed on the blade. `TOOL_GLB[k].flip` turns the model end for end. Checked on screen: the fist is on the handle with the blade up.
- Owner: *"jumping shouldnt cause fall damage"*. A jump goes 1.8 m up, and the v1.97.35 hard-landing damage started at 1.49 m measured from the highest point, so every jump on flat ground hurt. A jump now remembers the floor it left (`walk.jumpFrom`), and only the height you come down below that floor counts. A jump on flat ground or up onto a ledge does nothing; jumping off a 2 m ledge still counts 2 m. Falls you didn't jump into still count from the highest point. Jump height and the fatal heights are unchanged. This also fixes an older problem: jumping off a 0.7 m ledge used to count 2.5 m, which was fatal.
- `validate-player-health.cjs` covers the jump rule; `validate-windsocks.cjs` pins the original spot again.
- Bumped TEST to `1.97.37` / `corn-souls-test-shell-v243`.

## TEST v1.97.36 — owner's Lesion Toolbox placements: ammonia windsock and the Pink Sedan (2026-11-07)
- Owner sent a placement report (made on v1.97.33) and noted that the collision boxes didn't move with the objects in the live test. Both are now moved in the source, so collision is built in the new spots:
  - **Ammonia windsock** (the `CylinderGeometry` pole + its sock `group`): pole 39.30, -56.50 → **41.16, -58.53** (its collision circle moves with it); sock head 39.30, 6.00, -56.50 → **41.23, 6.25, -58.32**. Turn is unchanged: the sock's yaw is live wind.
  - **Pink Sedan** (`O.cars[2]`): lot stall 6 (109.55, -96.45) → **136.42, -76.14**, same heading. Its drivable wrapper and collision boxes come from that spot.
- `validate-windsocks.cjs` pins the new sock position. All suites pass.
- Bumped TEST to `1.97.36` / `corn-souls-test-shell-v242`.

## TEST v1.97.35 — basic damage system: health, and damage between player 1 and 2 (2026-11-07)
- Owner: *"add a basic damage system to start with. including damage between player 1 and 2"*.
- **Health:** 100 HP (`HP`, `playerHurt(n, cause, kx, kz, msg)`). A hit takes HP off, knocks you back, flashes the screen edge red, vibrates the phone and says what hit you with the HP left. At 0 you go down with that cause (the usual death scene). After 6 quiet seconds it heals at 8 HP a second, and you are full again after a death. A thin bar at the top centre shows only while hurt (green, then yellow, then red).
- **Between players:**
  - The other player's paintball now takes 34 (three tags), not an instant kill. You are only knocked out of a vehicle if it kills you.
  - A tool swing with the other player in front of you and in reach (1.2 m + 80% of the tool's length, not in a vehicle) sends `mh` with the tool's damage (`TOOL_DMG`): sledgehammer 40, war pick 35, crowbar / pitchfork / machete / pipe / bat 25, the rest 15–20. Their game applies it. Death by it is "Squeeg got beaten down by the other player!" (KNOCKED OUT / LIGHTS OUT …).
- **Creatures:** a cob stalker or Daddy bite takes 34, a nibble 17, so three bites still kill but now heal back. `CREEP.bites` is still counted for the field pacing and the two-player sync.
- **Falls:** a landing above 62% of the fatal height hurts, up to 60 HP. The fatal heights are unchanged.
- The sure-death hazards (train, pond, acid, ammonia, mower, big falls) still kill outright.
- New `validate-player-health.cjs` (in CI): hits, knock-back, three tags, healing timing, melee in front and in reach only, not through vehicles or alone, and the game wiring. The four suites that run the bite / fall / network code now load the health section; message checks were updated to the HP wording.
- Bumped TEST to `1.97.35` / `corn-souls-test-shell-v241`.

## TEST v1.97.34 — ten weapons from the Survival Melee Weapon Pack, placed round the plant (2026-11-07)
- Owner asked, piece by piece: *"replace the pick with the war pick"*, sickle and machete in grain receiving, pipe in the turbine room, frying pan + kitchen knife + cleaver in the maintenance break room, stun baton at the main power station, aluminum bat at the back of the second-to-last train car (reachable while riding the last car), golf club in the scale house manager's office.
- `scripts/slim_tool_glb.py` gained a 4th argument: take one mesh by name out of a pack and crop its part of the shared atlas. Plain tubes (vertices only at the ends) are handled too. Files are 22–74 KB each.
- **Placements** (`toolSpot(k, x, y, z, ry)`: hung on a wall, facing the room, in `TOOL_WALL` so E / X takes it):
  - War pick: the shop pegboard, replacing the drawn pickaxe.
  - Sickle and machete: the receiving building's west wall inside.
  - Steel pipe: the turbine room's north wall, west end.
  - Pan, knife and cleaver: the maintenance break room's north wall.
  - Stun baton: beside the substation's RESET PLANT POWER button.
  - Golf club: the scale house plant manager's south wall.
  - Aluminum bat: the back wall of car 14, as its child so it rides the loop. That spot has a 4.6 m reach, because the rider deck pins you about 4 m away. `takeTool` now measures world positions.
- **Held:** the war pick, pipe, bat and golf club are two-handed, with grips along the handle. The sickle, machete, pan, knife, cleaver and baton are one-handed: the right fist with the thumb toward the blade, and the left hand down. `TOOL_GLB[k].hud` sets where each sits in view. All of them swing like the other hand tools; the war pick hits creeps for 3.
- Checked in headless Chromium: every wall spot, every one held, and riding the last car and taking the bat.
- Registry: the pack is `in-use` with its ten files; credited in `CREDITS.md` and on `credits.html`.
- Bumped TEST to `1.97.34` / `corn-souls-test-shell-v240`.

## TEST v1.97.33 — red pipe wrench and a new sledgehammer, as real models (2026-11-07)
- Owner picked three Sketchfab downloads (all CC BY 4.0): CUBICcube's **Game Wrench** (red pipe wrench), MaX3Dd's **Sledge Hammer** and Oxygen3D's **Survival Melee Weapon Pack** (28 weapons).
- `scripts/slim_tool_glb.py` turns a Sketchfab GLB into a game tool. It bakes everything to one mesh, keeps only the colour map (resized to 512 px JPEG; normal, roughness and occlusion maps dropped, since the game draws Lambert), puts the long axis on +X with the head at +X and the jaw toward +Y, centres the handle on the X axis, and keeps the author, licence and source in `asset.extras`. Results: `assets/models/pipe_wrench.glb` 97 KB (from 4.1 MB), `sledge_hammer.glb` 65 KB (from 2.7 MB).
- `TOOL_GLB` and `toolModelOn()` put the model on the existing picture mesh (same place, same length) and hide the picture, which stays as the stand-in until the file loads. This covers the first-person hand, the third-person hand and the shop pegboard. The launcher's crowbar patch anchors are unchanged. The fists grip at fractions of the model's length along its handle (`TOOL_GLB[k].grip`).
- **Pipe wrench** replaces the drawn adjustable wrench and keeps every wrench job (fixing vehicles, patching the acid tank). **Sledgehammer** is a new pegboard tool (6 tools now, respaced). It swings like the crowbar and pick: breaks windows, dents cars, hits a creep for 3. It is held lower and further right so its head shows.
- Checked in headless Chromium: pipe wrench in both fists, sledgehammer, the pegboard with all six, and the wrench in third person.
- The weapon pack is stored as downloaded in `assets/models/source/` for future tools (registry `approved`, not loaded). The wrench and sledge are registered `in-use` and credited in `CREDITS.md`, which also feeds `credits.html`.
- `validate-fp-body.cjs` builds the real files with the game's reader and checks each model is in the hand, the picture is hidden, and both grips sit on the tool.
- Bumped TEST to `1.97.33` / `corn-souls-test-shell-v239`.

## TEST v1.97.32 — Squeeg sits on the Ranger's seat, boots on the floor (2026-11-07)
- Owner (screenshot, third person in the Ranger): he sat far too low, with only his head over the dash and his boots poking through the floor under the cab.
- Measured the Ranger model with raycasts: seat cushion 1.01 m, footwell floor 0.68 m. The seated driver and passenger origin was at 0.12, which put his underside at 0.54 m, 0.47 m below the cushion. It is now `RANGER_SEAT_Y = 0.59`, so he sits on the cushion, his torso shows above the dash, his knees go under the wheel and his soles end in the floor slab. This covers your Ranger, the other player's Ranger and the passenger seat. Checked in headless Chromium from behind and from the side.
- `SKIN_POSE.seatTop` (desk NPCs) is untouched. `validate-power-outage-machines.cjs` now pins the shared constant. All CI suites, launcher anchors and LIVE consistency pass.
- Bumped TEST to `1.97.32` / `corn-souls-test-shell-v238`.

## TEST v1.97.31 — first-person hands are the player model's own hands and arms (2026-11-07)
- Owner: *"thes look nothing like the hands of the models"*, with reference shots of first-person shotguns (support forearm rising from the bottom-left to cup the pump, fingers wrapped round it).
- The box gloves are replaced by each player's own hand and forearm, baked from `squeeg1_2_0.glb` / `squeeg2_2_0.glb`: the T-posed rig has its finger bones curled into a fist and the thumb wrapped over. The hand, the forearm up to the elbow, skin and nails are cut out by bone weight and skinned in the model's space. The colour map is sampled into vertex colours, so it is still one mesh and one draw per hand (the six-draw budget holds). The forearm is stretched a little so it reaches the edge of the screen.
- The hand is baked in a fist frame: the origin sits inside the grip, +y runs along the handle toward the thumb, and +z runs back up the forearm. Each grip now gives a point and a handle direction on the item, and the forearm is aimed at an elbow off the bottom corner of the screen (`FP_MHAND.elbow`). Covered: the shotgun stock and pump (the pump hand still follows the stroke and the magazine reach), wrench, crowbar, extinguisher and radio. Until the model has loaded (or if it never does) the old box gloves and poses stand in.
- Checked in headless Chromium: shotgun hip and ADS, wrench, crowbar. Tunables are in `Plant3D.dbg.FP_MHAND` with `rebuildModelHands()`.
- `validate-fp-body.cjs` now bakes the real GLBs and checks: model hands, not boxes; a real hand plus forearm with colours; the fist centred on the grip with the forearm behind it; the thumb along the stock wrist; and the box fallback.
- Bumped TEST to `1.97.31` / `corn-souls-test-shell-v237`.

## TEST v1.97.30 — first-person legs actually show; Codex's body and hands checked on screen (2026-11-06)
- Owner: *"catch up on what codex did and then finish it"*. Codex's v1.97.28 note said its cloud browser could not start WebGL, so the first-person body and hands had only been checked by projection maths.
- Rendered them in headless Chromium through the real launcher. **Bug found:** looking down showed a dark hollow dome at the bottom of the screen instead of legs and boots. The character models are double-sided (right for the outside view); with the waist cut you look down into the body, and its inside faces covered the legs. First person now draws the outside faces only (`material.side = FrontSide` while the waist clip is on; double-sided again in third person). After the fix: both trouser legs and boots show when looking down, with the wrench and beside the gun, standing and walking.
- Also checked: third person shows Squeeg's legs, arms, boots and held gun; the gloves sit on the shotgun stock and pump, and on the wrench / crowbar handles (v1.97.29 two-handed grips). The vest-coloured cuffs are large on screen with the wrench and crowbar (they run from the glove to the screen edge like forearms); the Lesion Toolbox "hand scale" slider can shrink them if the owner prefers.
- `validate-fp-body.cjs` now checks the outside-faces-only material in first person and the double-sided material back in third person (fails against v1.97.29). All CI suites, launcher anchors, LIVE consistency and script syntax pass. LIVE is untouched.
- Bumped TEST to `1.97.30` / `corn-souls-test-shell-v236`.

## TEST v1.97.29 — two-handed wrench and crowbar grips (2026-11-06, Codex; entry added in v1.97.30)
- The wrench and crowbar are held with both gloves: each tool carries grip points along its handle (`userData.gripPoints`, in the tool picture's own space, with an offset for the launcher's 3D crowbar whose shaft sits behind the centre of its bounds). The right glove takes the first point and the left glove the second; the old one-handed fist and cuff only show when seated.
- `validate-fp-body.cjs` checks both grips.
- Bumped TEST to `1.97.29` / `corn-souls-test-shell-v235`.

## TEST v1.97.28 — first-person hands and legs (2026-11-06)
- Reuses the local third-person rig for boots and legs on both player slots. A waist plane clips the colour pass and the merged body mesh casts one animated shadow. The body hides on ladders and during vehicle, riding and death views.
- Tan gloves with vest-coloured cuffs grip the shotgun, wrench, crowbar, extinguisher and radio. The shotgun support hand follows the pump and reaches across for the side magazine during reload. The empty hand stays out of view.
- The pause menu remembers **Body in first person** per device and defaults to on. Lesion Toolbox can tune body offset, waist, shadow arms and hand scale. The recorder includes both render passes in its draw and triangle counts.
- `validate-fp-body.cjs` checks both actual GLBs, projected boot and ADS hand visibility, the six-draw budget including shadows, player state transitions and poses. The cloud browser could not start WebGL on the baseline. Visual checks and the 1 ms frame-time target need a device run.
- Bumped TEST to `1.97.28` / `corn-souls-test-shell-v234`.

## TEST v1.97.27 — walls no longer disappear: indoor culling off by default (2026-11-06)
- Owner: *"Wall still disappear and reappear. Frame rate is steadier and closer to 30"* (second Lesion Toolbox recording: avg 30.1 fps, typical frame 33.2 ms, hitches 7 → 4, critters 4.6 → 0.55 ms).
- Cause: the v1.97.196 indoor culling. The plant registers smaller lighting rooms inside the big halls, and culling round the smallest room you stood in hid the hall's own walls and equipment, so they vanished and came back as you turned. Reproduced at the owner's recorded spots: up to 17% of the picture changed with culling on.
- Made it safe (cull round the outermost envelope only, and only when every gap in its walls is a listed window or doorway), then swept all 18 envelopes × 5 spots × 8 directions with in-page renders: it culled in only 7 of 720 views. Not worth the risk, so **indoor culling is off by default**. The Lesion Toolbox "Indoor culling" slider can still switch on the safer version for testing.
- Draw calls in enclosed rooms go back up; the safe fix for those is merging the ~2,300 separate meshes (proposed next).
- `validate-perf-leaks.cjs` now checks: off by default; the outer hall is culled round, not a room inside it; an unlisted gap (open side) never culls. All 70 CI suites, launcher anchors, LIVE consistency and script syntax pass. LIVE is untouched.
- Bumped TEST to `1.97.27` / `corn-souls-test-shell-v233`.

## TEST v1.97.26 — even frame pacing on phones, cheaper critters (2026-11-06)
- From the owner's first Lesion Toolbox recording (Razr, Low): avg 32 fps swinging 29-45, worst 1% 20 fps, the screen read as "30 Hz", critters 4.6 ms a frame (19 ms worst), world render CPU 18.5 ms at 775 draw calls (1,420 max in the big open building facing west).
- **Pacing:**
  - The refresh-divisor skip counted rAF callbacks; a phone still busy drawing misses callbacks, so it skipped too many (every 5th-6th refresh, 20-24 fps, where every 4th was possible). Frames are now gated by time (`PACE.minGap`): never closer than the cap allows, and never under the cap's own frame time, so a fast frame waits for the next refresh instead of bursting to 45 fps. Result: an even 30.
  - The refresh rate is read from the short callback gaps (10th percentile), not the median: a busy device's typical gap is 2-3 refreshes, which is how a 120 Hz Razr read as "30 Hz".
  - The 40 fps step on a fast screen is only kept while the device holds it: frames 10% over budget, or so busy the screen stops reading as fast, drop it to 30 for a minute, and for good after the second time.
- **Critters:** wall-climbing lizards crawl every frame but check the wall with a ray 5 times a second instead of 60 (each ray tests the merged cook / evap alley buildings; four lizards were firing four a frame). If the face runs out they step back to the last checked spot and turn. Critters more than 45 m from both players wait where they are.
- **Draw distance:** on foot nothing past the fog is drawn (it is fully fog-coloured there), and the sky dome, clouds and stars shrink with it (centred on you, so they look the same). Driving keeps 900 m; the free camera keeps its long view. Measured: only 3-6% fewer draw calls, since nearly everything drawn is within 400 m, but the Lesion Toolbox fog slider now moves the draw distance too.
- Also measured: at the owner's slow spot (x -13.7, z 9, facing west, 1005 x 411) about 2,300 separate meshes are visible (~1,000 model parts, 565 boxes, 248 cylinders, 267 planes, unmerged); that is what the 18.5 ms render cost is. Proposed as the next batch.
- Added `test/validate-phone-pacing.cjs` (simulates a 120 Hz screen with phone-like and fast frame times through the real pacer; lizard probe rate; far critters; draw distance). Updated `validate-performance.cjs`, `validate-frame-stability.cjs` and `validate-power-outage-machines.cjs` for the time gate. All 70 CI suites, launcher anchors, LIVE consistency and script syntax pass; the launcher boots headless with no page errors. LIVE is untouched.
- Bumped TEST to `1.97.26` / `corn-souls-test-shell-v232`.

## TEST v1.97.25 — Rick, Brenda, Tammy and Vern react to what is happening (2026-11-06)
- Owner: *"Sweet add them to the game"* (the situational dialogue system), *"get rid of Virgil only want Rick"*, *"did Tammy Brenda and Vern get updated lines?"* and *"they aren't all going to talk at the same time right?"*
- A small dialogue engine (priority rules over the live plant state, line rotation, irritated repeats that forget after 25 s, objective hooks; ~0.3 µs a check) now picks each person's **opening line** when you walk up to them. Their topics and replies are unchanged.
  - **Rick** (Board Op): blackout briefing to the substation main breaker (sets a 📋 objective), a "lights are back" line, ammonia ("get upwind, close the drain valve"), the corn field ladder (stalkers → nibblers → green ones that got back up → Daddy Cob Legs), night shift and everyday gripes alongside his own greetings.
  - **Brenda** (curt, trucks), **Tammy** (friendly, nervous, wants to get to her white car) and **Vern** (one or two words) react to the blackout, the creatures and the night in their own voices.
- **One voice at a time:** unprompted lines share one slot, at least 8 s apart. Only Rick radios you across the plant (blackout, ammonia, creatures); the others only mutter when you are standing with them. Nothing unprompted plays while a conversation or menu is open.
- The PPE, RTO-failure and hopper/elevator lines from the brief are not in the game: those mechanics do not exist yet. No "Virgil" anywhere.
- Added `test/validate-npc-dialogue.cjs` (runs the engine, data and bark loop: every state for all four, repeats, objective, the 8 s voice slot, radio only for Rick, no Virgil). Checked in headless Chromium through the real launcher: openings in normal / blackout / power-back states, repeats rotate, Rick's radio call during a blackout, no page errors. All 69 CI suites, launcher anchors, LIVE consistency and script syntax pass. LIVE is untouched.
- Bumped TEST to `1.97.25` / `corn-souls-test-shell-v231`.

## TEST v1.97.24 — Lesion Toolbox: in-game dev tools (2026-11-06)
- Owner: *"tools or labs I could use in game to help with game development … I could make changes on the fly and test and just give you the data"*, named **Lesion Toolbox**, *"with the least friction"*.
- A 🛠 button (TEST only, only while playing) opens the panel. Each tab ends in one **Copy** button that copies plain text to paste to the developer:
  - **Place:** aim the crosshair, tap Pick (a yellow box marks it). Move away/closer/left/right relative to the view, raise/lower, turn, "to me", Undo; fine / mid / big steps (0.05 m · 5°, 0.25 m · 15°, 1 m · 45°). Copy lists every moved thing by the game's own name (`O.idleP2`, `NPC …`, vending machine, Ranger, GLB file name) with its new and old position. Merged buildings and ground are refused. Colliders do not move in the test.
  - **Tune:** live sliders for render sharpness (pixel ratio), shadow distance, grass distance and amount, fog start/end on foot, walk and sprint speed, headlamp strength, darkest-place brightness, indoor culling on/off. Copy lists only what changed (with the old value and quality setting); Reset all restores everything.
  - **Record:** 30 s of frame timing, draw calls, triangles, render CPU time, per-system cost (`stepSafe` timing, only while recording) and the in-game spot of the slowest frames, as a text report with device, screen Hz and target fps. No video and nothing outside the game. The 🛠 button turns red while recording.
- The walk/sprint speeds, foot fog and headlamp strength now live in `TUNE` (same shipped values). Merged statics are tagged `userData.merged`; loaded GLB roots carry `userData.glb`; the frame pacer is readable as `window.CS_PACE`. The panel is hidden outside `/corn-souls/test/`, so promoting this file does not show it to players.
- Added `test/validate-lesion.cjs` (runs the toolbox in a sandbox). Updated `validate-critter-sync.cjs` for the `TUNE` speeds. Clicked through all three tabs in headless Chromium at phone-landscape size (892 × 412) through the real launcher: picked the idle Player 2, moved and copied it, tuned and reset, recorded a report; no page errors. All 68 CI suites, launcher anchors, LIVE consistency and script syntax pass. LIVE is untouched.
- Bumped TEST to `1.97.24` / `corn-souls-test-shell-v230`.

## TEST v1.97.23 — Quality choice on the pause menu (2026-11-06)
- Owner: asked for a way to pick the quality setting (for example Medium on a Retroid Pocket Nova, or Low on a weak PC).
- The pause menu has **⚙️ Quality: Auto (low) / Low / Medium / High**. The page shows what is running and offers Auto, Low (steady 30-40 fps), Medium and High. The choice is stored as `cs_perf`, which `perfTier()` already obeys ahead of the device guess; Auto removes it.
- Antialiasing and the pixel ratio are fixed when the renderer starts, so a new choice offers **Restart now** or **Later**, and warns when a restart would leave a 2 player game. Choosing the setting that is already running just returns to the pause menu.
- Added `test/validate-quality-menu.cjs` (runs the menu code: labels, storing, Auto clearing, restart and 2 player warning, perfTier honouring the choice, launcher anchor intact). Checked in headless Chromium through the real launcher: the pause menu shows the entry, picking Low and restarting comes back on Low, no page errors. All 67 CI suites, launcher anchors, LIVE consistency and script syntax pass. LIVE is untouched.
- Bumped TEST to `1.97.23` / `corn-souls-test-shell-v229`.

## TEST v1.97.22 — 40 fps on a 120 Hz phone screen (2026-11-06)
- Owner (Razr 2025, which reports 120 Hz): asked for smoother frames; a steady 40 is possible on that screen.
- The Low tier keeps its 30 fps cap but gains `fpsHi: 40`. When the measured refresh is 110 Hz or more, `paceHi()` picks the refresh divisor for 40 (rounded up), so frames still land on whole refreshes: 120 Hz → every 3rd (40 fps), 144 Hz → every 4th (36), 165 Hz → every 4th (41). At 60 or 90 Hz (for example when Android drops Chrome to 60 Hz to save battery) it stays at 30. Medium and High are unchanged.
- `validate-performance.cjs` checks the divisor and resulting rate at 60/90/120/144/165 Hz, and that tiers without `fpsHi` are unaffected. Verified locally: all 66 CI suites, launcher anchors, LIVE consistency and script syntax pass. LIVE is untouched.
- Bumped TEST to `1.97.22` / `corn-souls-test-shell-v228`.

## TEST v1.97.21 — a steady 30 fps on phones (2026-11-06)
- Owner: *"frame rate jumps up to 60fps sometimes is there a way we could limit it so it's smoother?"*
- The Low tier (phones) now caps at 30 fps instead of 60. The existing pacing draws on whole screen refreshes, so frames are evenly spaced: every 2nd refresh at 60 Hz, every 4th at 120 Hz. Swinging between about 40 and 60 felt rougher than a steady 30. Medium (90) and High (144) are unchanged, and the `cs_perf` quality override still picks another tier.
- `validate-performance.cjs` pins the 30 cap and checks the refresh multiples at 60/90/120/144 Hz. Verified locally: all 66 CI suites, launcher anchors, LIVE consistency and script syntax pass. LIVE is untouched.
- Bumped TEST to `1.97.21` / `corn-souls-test-shell-v227`.

## TEST v1.97.20 — version numbers back to two digits (2026-11-06)
- Owner: *"Can we just use 1.97.xx not 1.97.xxx"* and *"Next would be 1.97.20"*. TEST goes from 1.97.198 to 1.97.20; normal bumps continue 1.97.21, 1.97.22 and so on.
- `scripts/bump_test_version.py` takes `--set VERSION` for a change like this one (the TEST cache name still bumps). The launcher's update check only compares for a different version, so phones on 1.97.198 still update to 1.97.20.
- Verified locally: all 66 CI suites, launcher anchors, LIVE consistency and script syntax pass. LIVE is untouched.
- Bumped TEST to `1.97.20` / `corn-souls-test-shell-v226`.

## TEST v1.97.198 — Batch 5: offline TEST shell, dead code, anchor and inbox checks (2026-11-06)
- Owner: *"I want to do everything you recommend earlier from batch 1 to batch 5"*. This is the last batch of the plan.
- **Offline TEST (`test/sw.js`):** when the network failed, a page request got the "needs a connection" page before the cache was checked, so the precached shell could never open offline. The worker now serves the cached page (or the precached `index.html`) first and shows that page only when nothing is cached. It is still network-first online, and the scope and cache name are unchanged, so LIVE is never intercepted.
- **Dead code:** removed the dead-critter corn carry from the launcher's corn engine (wrap, sync, the critter branches of interact/throw/update/resolve). The game's own `critterPick` / `critterEat` / `critterThrow` handle corpses, and the carry still skips critters. Removed the three pause-menu Help patterns that no longer match; the one the game has, `['Help', help]`, stays. Deleted the orphaned `test/squeeg-model.js`. The `.cs-inbox*` CSS is kept because `test/inbox.js` uses it.
- **Not removed, on purpose:** the title-screen silhouettes and title music code (title music is still an open question for the owner, and `validate-title.cjs` pins it), the `FAILURES = false` hooks (placeholders for planned breakdowns), and the owner's models (`pallet.glb`, `operator_male_psx_rig.glb`) and their embedded textures. The handoff's `car()` helper and duplicate icon link were already gone, and `puffT` is live.
- **Checks:** `scripts/check_launcher_anchors.py` now also checks the first string of every `[from, to]` row in the launcher's patch tables (`trafficPatches`, `scopedEffects`, `acidVisualPatches`, `modalExitPatches`, `notePatches` and the rest), including later overrides such as `notePatches[1][0]`. A mutated anchor fails it. `test/validate-inbox.cjs` now runs from either directory, stubs `window`, checks that the inbox opens the TEST developer page, and is back in CI.
- Added `test/validate-cleanup.cjs`, which runs the service worker's offline path in a sandbox and fails against v1.97.197. Updated `validate-perf-leaks.cjs` for the removed carry. Verified locally: all 66 CI suites, launcher anchors (with the tables), LIVE consistency and script syntax pass; the launcher boots headless with no page errors. LIVE is untouched.
- Bumped TEST to `1.97.198` / `corn-souls-test-shell-v225`.

## TEST v1.97.197 — Batch 4: gameplay and two-player sync fixes (2026-11-06)
- Owner: *"I want to do everything you recommend earlier from batch 1 to batch 5"*. This is Batch 4 of the plan.
- **Swallowed code (mid-line `//`):** three statements sat after a comment on the same line and never ran. The RTO shack now has its man door and concrete floor, flows start empty and cast shadows when asked, and the other player's shotgun tilts as it is shouldered.
- **Milo-Rade machines:** their VEND entries had no cabinet, so X at a drink machine did nothing. The button nodes now stay out of the merge, and each placed cabinet is handed to its entry with its two Milo-Rade buttons and the WATER button (which still drops a Milo-Rade can). Vending machines that finish loading after you start walking now block you too.
- **Gameplay:** lizards climbing a wall can be hit by tools, the washer, paintballs and thrown corn. The silo bin walkway's walk surface was 44 m off its rails; it now uses world coordinates, and its toe boards run along both edges. In third person before the model loads, the box stand-in's limbs swing instead of producing NaN, and a model that arrives after the 8 s retry no longer binds to the old avatar. Your own mower rider wears your model and is rebuilt when you change sides. The Ranger parked while you drive a car is pushed by the train with its colliders. The phone car button now shows next to the Ranger. `Plant3D.dbg` no longer has duplicate keys that hid the live `utv`/`wallSegs` getters. Rick no longer suggests the removed squeegee. Sound menu steps land on whole percents, and Escape on the slider returns to the pause menu.
- **Two-player sync:** corn props now use the `cprop` message. They had taken `cp`, so the parked-car exit sync (`carRestore`) was never received. `swapRangers()` now moves the walk-into box, the "can't shoot the other player's Ranger" flags and the damage state along with the physical Rangers. The host sends each freight train's state and speed, so a guest's held train stays still instead of rubber-banding, and the guest never times the hold out by itself. A guest whose creature models load late no longer spawns its own stalkers, and `netDrop()` resets the first-snapshot flag.
- Draw calls rise by about 30 at the shop spawn because of the separate drink buttons, the flow shadows and the RTO shack door and floor.
- Added `test/validate-bugfix-batch.cjs` (fails against v1.97.196). Updated `validate-corn-sync.cjs` for `cprop`. Verified locally: all 64 CI suites, launcher anchors, LIVE consistency and script syntax pass; the launcher boots headless with no page errors. LIVE is untouched.
- Bumped TEST to `1.97.197` / `corn-souls-test-shell-v224`.

## TEST v1.97.196 — Batch 3: phone tier, indoor culling, no forced reflow, minimap crop, cheaper walk cycle, leak fixes (2026-11-06)
- Owner: *"I want to do everything you recommend earlier from batch 1 to batch 5"*. This is Batch 3 of the performance plan.
- **Foldable phones (`perfTier`):** an unfolded flip/fold phone could pass the size checks and land on Medium. A mobile user agent, or a touch screen at DPR 2.5+ whose short side is 860 px or less, now selects Low. Tablets (the 1024 px mock, iPads) stay Medium; shadows still refresh every frame.
- **Deep-indoor culling (`indoorCullHide` / `indoorCullShow`):** on foot, well inside a roofed room, with none of its windows or doorways (`e.wins`) near the view cone, static meshes wholly outside the room and the grass chunks outside it are hidden for the draw only and shown again right after it. Moving things are never touched; the shadow map is redrawn when culling switches. Measured in headless Chromium at the maintenance-shop spawn facing the back wall: 927 → 498 draw calls (−46%). Facing a doorway, nothing is culled. A screenshot with and without culling differs only in the fps readout.
- **No forced reflow:** `bodyCls()` changes a body class only when it flips, the NOS bar width is written only when it changes, and the `driving`/`nearutv`/`canEat` classes are set after the world update, so the minimap's layout read no longer forces a style recalculation every frame. The always-hidden `#out` tiles are no longer reformatted 5 times a second.
- **Minimap crop:** the widget blits only the ~520 px square around you instead of the whole 2048 px baked map, 15 times a second.
- **Walk cycle (`skinSwing`, `updateSelfAv`):** the bone swing no longer walks the whole avatar twice per bone or allocates; it gives exactly the old pose. Limbs that have settled are not re-posed every frame.
- **Leaks:** the launcher no longer wraps dead critters as corn props (each one added a permanent collider). Departing semis free their own geometry and materials (`disposeUnused`, guest side too), and haulers share one load box and pour cylinder. The box Ranger's parts are freed when the model replaces them. Removed Nibblers free their sprite material (`nibDispose`). The corn-prop and extinguisher stand-ins are freed when the real model arrives. The minimap frees its unlit stand-in materials after the last bake. Noise buffers are cached per AudioContext (`noiseBuf`), and the engine start, NOS hiss and radio squelch reuse them or the game's AudioContext. One-shot audio nodes disconnect when they finish.
- **Launcher:** title music only calls `play()` when paused; the six helper files are fetched in parallel.
- Added `test/validate-perf-leaks.cjs` (runs the real code in a sandbox; fails against v1.97.195). Updated `validate-critter-eat.cjs` (pinned `canEat` line now uses `bodyCls`) and `validate-minimap.cjs` (stand-ins are freed after the second bake). Verified locally: all 63 CI suites, launcher anchors, LIVE consistency and script syntax pass; the launcher boots headless with no page errors. LIVE is untouched.
- Bumped TEST to `1.97.196` / `corn-souls-test-shell-v223`.

## TEST v1.97.195 — Batch 2 skeleton deduplication, static NPC/avatar baking, and shared skin VRAM (2026-11-06)
- **Shared GLB texture VRAM (`GLB_IMG_CACHE`):** Cached decoded `THREE.Texture` instances per `ArrayBuffer` in `glbBuild()` and skipped unused non-`baseColorTexture` embedded PNGs when `!MODEL_PBR`, so all 7 player avatars share one GPU texture upload per map (~140+ MB VRAM saved).
- **Static character baking (`bakeStaticSkin`):** Baked posed `SkinnedMesh`es and bone-attached rigid accessories into vertex-colored + per-texture static `THREE.Mesh`es (disposing skeletons and pruning dead `Bone` hierarchies) for all 4 in-game NPCs (`Vern`, `Rick`, `Brenda`, `Tammy`) and all non-animating player avatars (`idlePlayer2`, vehicle seats, remote avatar), dropping ~149 live `Skeleton`s to 0 and ~170 character meshes down to ~30.
- **3rd-person avatar skeleton deduplication (`dedupSkeletons`, `mergeSkinnedFlat`):** Collapsed the animating 3P player avatar's 15 identical glTF skins onto 1 shared `THREE.Skeleton` and merged its untextured `SkinnedMesh`es into a single vertex-colored `SkinnedMesh`.
- Added `test/validate-skin-batch.cjs` to `.github/workflows/validate.yml`. Verified all 62 CI suites, launcher anchors, script syntax, and LIVE consistency.
- Bumped TEST to `1.97.195` / `corn-souls-test-shell-v222`.

## TEST v1.97.194 — Batch 1 draw-call, matrix, material, and GLB merge wins (2026-11-06)
- **Static batching & matrix freezing (`mergeStatic`, `mergeGroup`, `nameplate`, `padMat`, `glass`, `ribWall`):** Cached `padMat`, `glass`, and `ribWall` materials, expanded `mergeStatic`'s shared-material batching (`MARK_MATS`, `PAD_MATS`, `GLASS_MATS`, `ribMats`, `EXIT_SIGN`, `EGRESS.lens`), preserved `userData.noHit`/`noRoof`, and froze `matrixAutoUpdate = false` across static `InstancedMesh`es, nameplates, ground, and batched meshes.
- **Shader pre-warm & `crowbarReadGLB`:** Made `setWallsSolid()` idempotent and ran `setWallsSolid(true)` before `renderer.compile(scene, camera)` so `walkStart()` no longer invalidates compiled wall shaders on frame 1. Switched `crowbarReadGLB` in `test/index.html` from `MeshStandardMaterial` + `cache: 'no-store'` to `MeshLambertMaterial` + `cache: 'force-cache'` while skipping unused non-baseColor textures.
- **Multi-mesh vehicle, weapon, critter & GLB merging:** Deduplicated concurrent `loadGlbModel()` network fetches (`GLB_FETCH`, eliminating the duplicate 3.42 MB `shifty_food_machine.glb` download); merged static sibling meshes in `rangerTireOn` (17 meshes/wheel → 4 shared geometries), 3P `buildShotgun` (39 → ~18), `makePondFrogs` (8 spheres/frog → 1 shared vertex-colored `BufferGeometry`), `hydrantModel`, `loadSubstation`, `loadSmokingArea`, and per-joint `vultureInit` segments while culling small late-loaded shadow casters via `TIER.minCaster`.
- Added `test/validate-drawcall-batch.cjs` to `.github/workflows/validate.yml`. Verified all 61 CI suites, launcher anchors, script syntax, and LIVE consistency.
- Bumped TEST to `1.97.194` / `corn-souls-test-shell-v221`.

## TEST v1.97.193 — reduce the phone rendering budget (2026-11-06)
- The Razr reported about 15 FPS. The Low tier now renders the 3D canvas at 0.75 of CSS resolution, about 44% fewer pixels, and uses a 512 × 512 sun shadow map. On foot, the shadow box half-size is 28 m. The minimum radius for ordinary startup shadow casters rises to 1 m. Shadows still update every frame for even pacing.
- A touch viewport with a short side of 600 CSS pixels or less also selects Low, including when a phone opens the game in landscape. Explicit quality overrides still take priority.
- The performance suite checks the Low budget, the landscape case and the override. Razr frame rate still needs an on-device measurement.
- Bumped TEST to `1.97.193` / `corn-souls-test-shell-v220`.

## TEST v1.97.192 — spread startup roof collision work across frames (2026-11-06)
- The first walk now queues the same tiled roof collision build used for late models. It draws at most one roof tile per frame, keeps regular ground and wall collision active, and swaps in the completed roof grid. The late-model rebuild still runs after the first pass.
- TEST worker activation claims fetches without navigating open windows. The launcher checks for a new version on a fresh open, so focusing an active game does not trigger an update reload.
- Verified locally with all 60 CI suites, launcher anchor checks and LIVE wiring checks. The new assertions fail against v1.97.191.
- Bumped TEST to `1.97.192` / `corn-souls-test-shell-v219`.

## TEST v1.97.191 — the idle Player 2's feet sit on the smoking pad (2026-11-05)
- Owner: *"her feet clip into the concrete"* — the idle squeeg2 was standing at y 0, but the smoking pad's concrete top is 0.2 m (its 0.2 m slab, lifted 0.1 m off the grass), so her feet sank into it.
- Raised `idlePlayer2()`'s position to `y: 0.2` so her feet rest on the pad. `validate-skinned-players.cjs` pins the new height.
- Verified locally: the 60 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.191` / `corn-souls-test-shell-v218`.

## TEST v1.97.190 — Player 2 waits idle at the smoking area (2026-11-05)
- Owner: *"place the squeeg2 model at the new smoking area by parking lot idle ready to be used if player 2 joins"*.
- **`idlePlayer2()`** stands squeeg2 (Player 2's build) on the smoking pad east of the parking lot (`147, 0, -80`, facing west toward the plant) at init, so there is always a Player 2 figure waiting at the smoking area in solo play.
- **When somebody joins** (`netRemote()`), the idle figure is hidden and the real Player 2 is drawn wherever they actually are; **when they leave** (`netDrop()`), the idle figure comes back for the next game.
- `validate-skinned-players.cjs` pins the idle figure (position, facing, squeeg2, init wiring) and the hide/show in `netRemote`/`netDrop`; `validate-power-outage-machines.cjs` and `validate-skinned-players.cjs` now count seven avatars (was six).
- Verified locally: the 60 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.190` / `corn-souls-test-shell-v217`.

## TEST v1.97.189 — Brenda and Tammy sit 4 inches back from their windows (2026-11-05)
- Owner: *"move brenda and tammy 4 inches away from the wall they are facing"*.
- Brenda (inbound, north window) moved `+0.1016` (4 in) along +Z; Tammy (outbound, south window) moved `-0.1016` along -Z — each is now 4 inches further back from the drive-through window they face. `validate-seating.cjs` pins the new positions.
- Verified locally: the 60 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.189` / `corn-souls-test-shell-v216`.

## TEST v1.97.188 — Brenda and Tammy sit 6 inches higher (2026-11-05)
- Owner: *"move tammy and brendas position 6 inches higher"*.
- Added `dy: 0.1524` (6 in) to Brenda's and Tammy's `NPC_MODELS` entries — `skinnedNpc()` already adds `cfg.dy` to the seated anchor, so both scale-house techs now sit 6 inches higher. Vern and Rick are untouched.
- `validate-skinned-npcs.cjs` now asserts Brenda and Tammy carry the `dy: 0.1524` offset and that Vern and Rick do not.
- Verified locally: the 60 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.188` / `corn-souls-test-shell-v215`.

## TEST v1.97.187 — the walk looks like walking now (2026-11-05)
- Owner: *"animate"* follow-up — the first pass walked, but with **straight, stiff legs** (a goose-step march), and a real bug in the swing primitive made it worse.
- **The bug:** `skinSwing()` (added in v1.97.186) wrote `pw.invert().multiply(… pw.clone().multiply(rest))`. In JS the receiver `pw.invert()` runs *before* the argument's `pw.clone()`, so by the time the clone was taken `pw` was already inverted — the knee was being rotated by `pw⁻²·rest` instead of `rest`. `skinTurn()` (the one-shot pose helper the NPCs use) doesn't have this bug because it reads its operand into a separate variable first. Fix: capture `w = pw.clone().multiply(rest)` **before** inverting, exactly like `skinTurn()`.
- **The gait:** with the swing primitive fixed, the walk is now a real two-joint stride. `updateSelfAv()` adds a **knee bend** that peaks mid-swing and straightens at heel-strike (`K·max(0, ∓cos(ph))`, driven off the same `VIEW.ph` as the hip swing), so the foot clears the ground instead of scissoring through it. Hip swing softened 0.7→0.55 rad, arms 0.8→0.6, and the two held-item arm poses eased (-0.9→-0.7, -2.6→-2.2).
- Measured in a vm (not guessed): the foot now **plants at the front**, sweeps back during stance, **lifts ~20 cm** off the ground as the knee bends, and returns — an alternating gait with a proper swing phase, instead of the stiff march.
- `validate-power-outage-machines.cjs` now asserts **both** halves of the gait: the hip swing moves the feet in opposite directions, and bending the knee lifts the foot off the ground.
- Verified locally: the 60 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.187` / `corn-souls-test-shell-v214`.

## TEST v1.97.186 — the players walk (2026-11-05)
- Owner: *"animate"* — the walk cycle is back, now on the skinned skeletons instead of the old rigid pivots.
- **`skinSwing(root, bone, rest, axis, ang)`** is the new primitive: it sets a bone to a stored rest orientation, then rotates it by `ang` about a model-space axis. `skinTurn()` (the one-shot pose helper) pre-multiplies the current orientation, which compounds every frame, so the per-frame swing needs an absolute-from-rest setter — this is it.
- **`dressPlayerSkin()` now captures the walk bones at rest** — the two hip bones (`LeftUpLeg`/`RightUpLeg`) and the two shoulders (`LeftArm`/`RightArm`), each with its rest quaternion and an easing accumulator — and hands them back through `onRig(R, root, swing)`.
- **`buildSelfAv()` wires `VIEW.legs`/`VIEW.arms` to those bones**, and `updateSelfAv()` swings them the same way it swung the old box/rig pivots: hips alternate `±sw` (eased 0.3), arms counter-swing and still take the two held-item poses — the right arm comes forward 0.9 rad with a gun or tool, the left arm lifts 2.6 rad when carrying the boom box. All of it runs through `skinSwing(…, SKIN_X, …)` (the model's left-right axis).
- **Same as before, on purpose:** only your own third-person body walks; the other player glides (no per-frame leg data over the wire), and the seated avatars stay folded (they never get a swing).
- `validate-power-outage-machines.cjs` now runs the swing in the vm: after `dressPlayerSkin` hands back the bones, swinging the left hip forward and the right hip back moves the two feet in **opposite** directions — the alternating gait is asserted, not just wired.
- Verified locally: the 60 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.186` / `corn-souls-test-shell-v213`.

## TEST v1.97.185 — the players wear squeeg1 and squeeg2 (2026-11-05)
- Owner: *"do player 1 and 2"* — Player 1 wears **squeeg1** (male), Player 2 wears **squeeg2** (female), their own Crew Wardrobe builds of Loves_Art's Low Poly Male / Female (CC BY 4.0), standing/posed only as agreed.
- **The players stop wearing the rigid `operator_vern_rig.glb`.** `dressPlayer()` / `loadPlayerRig()` are gone, replaced by `dressPlayerSkin(av, vest, opts)`: the vest colour picks the slot (orange → squeeg1, lime → squeeg2), the raw bytes are cached per slot and **`glbBuild()` runs fresh per avatar** — a skinned model cannot be cloned without sharing its skeleton, and two avatars of the same player (standing + seated) must fold independently.
- **Pose:** each is scaled to its own height (P1 1.78 m, P2 1.65 m), arms lowered from the T-pose, feet on the floor, turned to face −Z like the box avatar it replaces. **No walk cycle yet** — the hip/shoulder swing and the held-item arms that drove the old rigid rig are gone for now, so the players stand still (the box body still falls back until the model lands). **Seated avatars** (Ranger driver, mower rider, passenger, other-player-in-car) fold their legs with the same measured fold as `skinnedNpc()`, so they don't clip through the vehicle.
- **The files:** squeeg1 is **16 parts / 6,214 tris** (15 skins × 66 joints + a hard hat on the head), squeeg2 is **18 parts / 7,516 tris** (15 skins × 71 joints + hard hat, earrings and a bracelet on her forearm); both have 2–3 embedded maps and an empty `walking` clip.
- **Cleaned up:** the legacy `squeeg-model.js` inline in `test/index.html` is removed (it was the old PSX self-model fighting `dressPlayer`), so there is now exactly one player-model path. `test/squeeg-model.js` and `test/models/operator_male_psx_rig.glb` stay in the repo but are no longer fetched; `operator_vern_rig.glb` stays too (first-party, no longer loaded by the players).
- **Tests:** `validate-power-outage-machines.cjs` now checks the `PLAYER_SKIN` wiring and **runs `dressPlayerSkin()` in a vm** on both player models (P1 1.78 m, P2 1.65 m, distinct files, box body removed, a held item survives, a stray child is hidden, no shadow casting, seated legs fold to ~1.4 m with feet on the floor). New `validate-skinned-players.cjs` (60th suite) pins the two GLBs, the wiring, and the credits.
- **Licence:** two new registry entries (`sketchfab-loves-art-low-poly-male-squeeg1-2-0`, `-female-squeeg2-2-0`, `in-use`, CC BY 4.0) and two `CREDITS.md` lines.
- Verified locally: the 60 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.185` / `corn-souls-test-shell-v212`.

## TEST v1.97.184 — Vern and Rick wear their own 2.0 builds (2026-11-05)
- Owner: *"do rick and vern"* — the two male NPCs get the same treatment as Brenda and Tammy: their own Crew Wardrobe builds, kept as delivered.
- **Vern** now wears `assets/models/vern_2_0.glb` and **Rick** wears `assets/models/rick_2_0.glb`, both byte-for-byte (643,668 / 600,028 bytes, SHA1 `6e0dcc61…` / `5a118f1b…`). Each is **scaled to 1.78 m and posed** with **no `colors`** — Vern stands by the loop track, Rick sits at the board, and every colour is the file's own now.
- **Their builds are shaped like the women's, not like the plain male**: **14 skins × 66 joints** each (the male base skeleton), with **rigid accessories riding bones** — Vern's `beard`, `hard_hat`, `glasses` and `safety_lens` (yellow safety specs), Rick's `cowboy_hat`, `hat_band`, `glasses` and `lens` plus his mustache on an unnamed head node. Rick is **19 parts / 6,650 tris / 2 textures**, Vern **18 parts / 5,974 tris / 3 textures**, both with an empty `walking` clip.
- **Wardrobe specifics:** Rick is angry, with a cowboy hat and sunglasses, a **green top `#3e6b45`** (the same green as Brenda's, in a different file); Vern is angry with a white hard hat, yellow safety specs, a full beard, and a **textured** top/trousers (so there's no flat colour to pin — the palette lives in the maps).
- **The plain male is now unused.** `low_poly_male_loves_art.glb` stays as the **base file both builds were made from** (still credited, registry note says no NPC wears it since this release), and `NPC_MALE` is gone from `test/game.html`: the four NPCs are `NPC_VERN`, `NPC_RICK`, `NPC_BRENDA`, `NPC_TAMMY`. With that, **no NPC is recoloured in game** — the `colors` machinery in `skinnedNpc()` is now only exercised by the base male in the test suite (so it can't silently rot while unused).
- **Licence:** two new registry entries (`sketchfab-loves-art-low-poly-male-rick-2-0`, `-vern-2-0`, `in-use`, CC BY 4.0, evidence from each GLB's `asset.extras`) and two new `CREDITS.md` lines. The plain-male line now says it is the source file and who wore it when.
- `validate-skinned-npcs.cjs` now covers all four wardrobe builds per file (Brenda 16 skins, Tammy 15, Rick + Vern 14 each, with their rigid accessories and tri counts), runs the **standing** check on Vern and the **seated** check on Rick, pins the three flat-colour tops (`#3e6b45`, `#1f3552`, `#3e6b45`) and asserts Vern's top is textured, and checks no NPC is repainted. `validate-power-outage-machines.cjs` checks the four model paths.
- Verified locally: the 59 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.184` / `corn-souls-test-shell-v211`.

## TEST v1.97.183 — a smoking area by the employee parking lot (2026-11-05)
- Owner: dropped `smoking_area_lopoly.glb` — *"place this by parking lot away from plant"*.
- **`assets/models/smoking_area_lopoly.glb`** — stored byte-for-byte (21,932 bytes). It is a rigid, low-poly shelter (17 nodes, 10 meshes, 8 flat-colour materials, no skins/textures, **174 triangles**, 8 × 3 × 6 m): a concrete pad with a painted orange boundary line, a blue mat, a bench, an ashtray and a sign, plus four corner posts.
- **Placed at `x 145, z -80`**, lifted 0.1 m so its pad sits on the grass — that is just **east of the employee parking lot's east curb** (`x 140`), and the plant is **west** of the east road (`x 72`), so it is by the parking lot and away from the plant, as asked. **Decorative only**: the reader marks every part `noHit`, it casts/receives shadows, and there is no collision or interaction (say the word if you want it solid or interactive).
- **One thing worth knowing about the file:** its four corner posts all export at the origin (THREE.GLTFExporter dropped their corner offsets), so they render clustered at the centre rather than at the four corners. I left the file byte-for-byte as you sent it — if you re-export with the post positions baked in, I'll drop the new file straight in.
- Registered as first-party (`first-party-smoking-area-lowpoly`) in `assets/registry.json`, credited in `CREDITS.md`, listed in `assets/models/README.md`. Note: the file carries no license metadata, so I treated it as your own work (the same as the other first-party drops); if it actually came from a pack, tell me the source and I'll re-register it with the right license.
- New `validate-smoking-area.cjs` (59th suite in CI) checks the whole-GLB structure (174 tris, 8 × 3 × 6 m), the placement string, that it is defined and called, and the registry + credits.
- Verified locally: the 59 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.183` / `corn-souls-test-shell-v210`.

## TEST v1.97.182 — Tammy wears her own Brenda-style 2.0 build (2026-11-05)
- Owner: dropped `tammy_2_0.zip` with no note — the same pattern as Brenda's, so the same defaults: **her wardrobe colours as delivered** and **nothing else touched**.
- **Tammy now wears `assets/models/tammy_2_0.glb`**, her own **Crew Wardrobe** build of Loves_Art's *Low Poly Female* (CC BY 4.0): recoloured, expression edited to **angry**, and given a **grey bun** with a hair tie, **square gold glasses**, **stud earrings, a pendant and a wristwatch**, boots and a long-sleeve top. Stored **byte-for-byte** as exported (565,896 bytes, SHA1 `56e40ce5…`). In game she is only **scaled to 1.65 m and posed** — **no `colors`**, because every colour is the file's own now (navy top `#1f3552`, khaki trousers, grey hair).
- **She is shaped like Brenda's build, not like the plain file**: **15 glTF skins** (71 joints each) across 15 skinned meshes, plus **six rigid accessory meshes** — `bun`, `hair_tie`, `glasses`, `earrings` and her **watch** (two unnamed nodes on `mixamorig:LeftForeArm`) — all parented to bones so they ride the pose. **21 drawn parts, 7,196 triangles, 19 materials, 2 embedded colour maps**, and again a `walking` clip with **no channels** in it (nothing to play, and nothing plays it).
- **Measured seated result, identical to Brenda's** (same base skeleton, so the same pose code fits her): underside of the seat on the chair at **0.470 m**, ankles **8.1 cm** above the floor, knees at 0.51 m under the 0.94 m desk, head bone at 1.10 m, facing −Z, box body hidden.
- **Cost:** 21 parts where the plain female was 11 — the four NPCs now draw **61 parts** (was 51 with Brenda, 42 before her), with no shadow casting, as before.
- **The plain female is now unused.** `low_poly_female_loves_art.glb` stays in the repo as the **base file both builds were made from** (and stays credited, `in-use` in the registry with a note saying no NPC wears it since this release), but `NPC_FEMALE` is gone from `test/game.html`: `NPC_MALE` for Vern and Rick, `NPC_BRENDA`, `NPC_TAMMY`. `validate-power-outage-machines.cjs` now checks those three paths.
- **Licence:** new `assets/registry.json` entry `sketchfab-loves-art-low-poly-female-tammy-2-0` (`in-use`, CC BY 4.0, evidence from the GLB's own `asset.extras`) and a new `CREDITS.md` line naming the modifications (and no endorsement implied). The base line now says it is the source file and who wore it when.
- `validate-skinned-npcs.cjs` covers her the way it covers Brenda: **15 skins / 21 parts / 6 bone-mounted accessories / ~7,196 triangles**, per file rather than one set of numbers for all, and the seated checks run on **her** as well. Two new colour assertions pin the owner's palette from the files themselves (Brenda `#3e6b45`, Tammy `#1f3552`) and prove posing **cannot** repaint them — the recolour machinery is now only exercised by Vern and Rick, whose shirt colours still work per material.
- Verified locally: the 58 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.182` / `corn-souls-test-shell-v209`.

## TEST v1.97.181 — the two-player suite stops guessing where the corn ends (2026-11-05)
- Not an owner request: **v1.97.180 went green locally and failed on CI**, and the failing suite was `validate-two-player.cjs` — the flaky one already on the handoff list. This release makes it bite every time.
- **What was actually wrong** (measured, not guessed): the hunt-and-bite step put the guest **6 m north of wherever the first stalker had wandered to**. A stalker picks its targets against the corn field (`inCField(px, pz, 2)`), and one that had drifted up to the north edge at `z ≈ -186` put the guest at `z ≈ -180` — **2.4 m outside the field**. Outside, a stalker only ever shadows you (`state: 'stalk'`) and **never bites**, so the loop ran its 120 steps and the assertion "the guest got bitten by the host's creature" failed. Instrumented runs showed exactly that: `guestInF=false creepInF=true state=stalk dP≈4.1 biteCd=0` at the timeout.
- **The fix:** the guest and that stalker are now **placed on a fixed point well inside the corn** — the field centre (field is 338 m × 47 m, so ±23 m of clearance) with the creature 6.7 m away. Where a monster is put, and where you are put, was never what that assertion was about: the bite is. The step budget goes 120 → 200 (6 s → 10 s) as margin; the bite itself lands in about 1.5 s.
- **Why it looked fine locally:** it is about a **1-in-40** failure. 40 local runs hit it once; the previous 30-run check would have missed it three times out of four. After the fix, **120 consecutive runs, 0 failures**.
- The rest of the suite is untouched, and the second hunt-and-bite step (a `free` debug stalker, which hunts you anywhere) never had the problem.
- Verified locally: the 58 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.181` / `corn-souls-test-shell-v208`.

## TEST v1.97.180 — Brenda wears the owner's Brenda 2.0 wardrobe build (2026-11-05)
- Owner: dropped `brenda_2_0.zip` (twice, identical) with no note, so the defaults were taken: **her wardrobe colours as delivered** (green top, navy trousers) and **Tammy left on the plain Low Poly Female**.
- **Brenda now wears `assets/models/brenda_2_0.glb`** — the owner's own **Crew Wardrobe** build of Loves_Art's *Low Poly Female* (CC BY 4.0): recoloured, expression edited, glasses / earrings / necklace / bracelet / hair tie / boots added. Stored **byte-for-byte** as exported (588,416 bytes). In game she is only **scaled to 1.65 m and posed** — no `colors` entry, because her colours, hair and accessories are the file's own now (`NPC_BRENDA`, and her `NPC_MODELS` line carries a comment saying why there is no recolour).
- **Her wardrobe build is not shaped like the old files**, and that is what this release had to get right:
  - **16 glTF skins, not 1** (71 joints each) across 16 skinned meshes — the reader builds a `Skeleton` per skin, and the poses are written to the joint *nodes*, so all 16 follow at once. Verified by the seated measurements below, not assumed.
  - **four rigid accessory meshes** (`hair_tie`, `glasses`, `earrings`, and an unnamed bracelet) parented to the `Head` / `LeftForeArm` bones, so they ride the pose with the skeleton rather than hanging in the T-pose. They are the first **non-skinned** parts inside a skinned model the reader has had to keep: the old code path only skipped rigid models as a whole.
  - **20 drawn parts, 8,160 triangles, 18 flat-colour materials, 2 embedded colour maps** (her eyes and face). Cost: 20 parts where the plain female was 11, so the four NPCs now draw **51 parts** (was 42) — no shadow casting, as before.
  - **Its `walking` clip is empty** (no channels at all, unlike the 59 in the plain female) — harmless, since no NPC is animated, but worth knowing before anyone tries to play it.
  - Bone names match `skinBone()` exactly (`mixamorig:LeftArm_09`, `mixamorig:LeftUpLeg_…`), so the same pose code sits her down: underside of the seat on the 0.47 m chair, ankles 9 cm above the floor, knees under a 0.94 m desk top, facing −Z like the box avatar she replaced.
- **Licence:** new `assets/registry.json` entry `sketchfab-loves-art-low-poly-female-brenda-2-0` (`in-use`, CC BY 4.0, evidence taken from the GLB's own `asset.extras`) and a new `CREDITS.md` line that names the modifications and says no endorsement is implied. The plain Low Poly Female line now credits **Tammy** only.
- `validate-skinned-npcs.cjs` is now **per file** rather than assuming one skin everywhere: plain female 1 skin / 11 parts / 71 joints, male 1 / 10 / 66, **Brenda 16 skins / 16 skinned parts / 4 bone-mounted accessories / 20 parts / ~8,160 triangles**, her empty clip stated as such, then the same seated checks run on **her** as well as on Rick and Tammy, plus the wiring (`NPC_BRENDA`, no `colors` for her), the new registry entry and both CREDITS.md lines. Suite also had to learn `Blob` / `URL` / a stub `TextureLoader`, because her build is the first NPC file with **textures** and node has no DOM images.
- Verified locally: the 58 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.180` / `corn-souls-test-shell-v207`.

## TEST v1.97.179 — the ducks are synced, and nothing else (2026-11-04)
- Owner: *"only duck sync no phone reload"* — so the ducks, and no phone reload button.
- **The ducks were the last thing each machine ran for itself.** Twelve of them (six a pond) paddled about on their own random seeds, so the host and the guest saw the same two ponds with different ducks in them.
- **Now the host owns them** (`updateDucks`): it swims the twelve as before and sends **3 numbers a duck** — its offset inside the pond and its heading, to 2 dp — **4 times a second** (`{ t: 'du', a: [...] }`, 36 numbers a packet). The order is stable because both sides build them the same way (`for (const [px, pz] of PONDS) for 6`), so an index means the same duck on both machines.
- **The guest runs no duck AI at all**: `duckApply()` stores the three numbers per duck and the guest glides to them (6/s easing, heading turning the short way round). The bank clamp, the turn timers and the "drifted to the middle, head back" rule stay host-only.
- **Left local on both sides, on purpose:** the bob (`clock`), the facing mirror (camera-relative) and the quack (a random timer, panned against your own camera) — none of them is state, and syncing them would cost a packet for nothing.
- **Solo is untouched:** `critNetGuest()` is false, so the host path runs and the packet is only sent when a connection is open. A guest that joins before its ducks exist drops early packets (`duckApply` returns).
- New `validate-duck-sync.cjs` (58th suite in CI) runs the game's own `updateDucks` / `duckRows` / `duckApply` on a host and a guest: about 4 packets a second carrying 36 numbers, twelve ducks never leaving their pond, the guest not moving before a packet and running no turn timers (so it sends nothing), then landing within 0.35 m of the host after 2 s and turning its heading the short way round; plus both sides still drawing and mirroring them, and the wiring (guest applies, host sends, solo runs the host path). It fails on the previous revision (`ReferenceError: duckRows is not defined`) and passes now.
- Verified locally: the 58 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.179` / `corn-souls-test-shell-v206`.

## TEST v1.97.178 — the other player's headlights, and the guest hears the pigeons (2026-11-04)
- Owner: *"sync headlights and pigeon coos"* — two of the four "unsynced niceties" left on the `HANDOFF_CLINE.md` §7 list.
- **Nothing new goes over the wire.** The other player's vehicle pose is already sent every frame (`m.u` for their Ranger, `m.car` for the car they got into, `m.d` for "driving"), and the pigeons are already mirrored by the `crs` snapshot. Both changes only read what was arriving all along, so there is no extra traffic and no new failure mode.
- **Headlights:** your beam is a spot in the lighting pass (`csHl0/1/2`, v1.97.169). The other player's is now a **second one** of its own (`csHl3/4/5`), fed by `vehLightSourceRemote()`:
  - their **Ranger** at 1.6 m nose / 0.9 m lamps, or their **car** at 2.5 m / 0.75 m, read from the car's own group so it is wherever the car actually is;
  - aimed along their heading, a little down, the same cone and the same `+25` shaping so it does not white out at their bumper;
  - faded in and out on its own timer (`VEHLr.k`), stutters with a nearby flicker, lit in a power outage (engine, not grid);
  - **dropped past 120 m** (`VEHL_SEE`) so the far side of the plant is not lit for nothing, and in solo `NET.rp` is null so the uniforms stay 0 and the shader skips the block.
  - Two beams can light the same road at once; neither side draws its own beam twice (each side only ever reads the *other* player).
- **Pigeon coos:** the guest's `updateBirds` used to return before the coo timer, so a guest heard nothing. It now runs `birdCooTick(dt)` — the same per-bird coo timer, the same `pigeonCoo()` (so **v1.97.168's "not through the roof" rule comes with it**) and the same volume curve, **on the mirrored perches only**. It moves nothing: no flight, no perching, no scaring — the host still owns the birds.
- Tests: `validate-headlights.cjs` now runs `vehLightsRemote` with real three.js: no source in solo and nothing sent to the shader, their Ranger's nose at (10, 0.9, -21.6) heading -z, their car's nose from the car group, the beam turning with the car, a flicker stuttering it, **both beams on at once**, dropped at 590 m, off when they get out, and the shader's new uniforms + block. `validate-critter-sync.cjs` pins the guest branch and the coo ticker (no `flyTo`, no `perchAt`, no idle). Both fail on the previous revision (the critter one on a pinned string, the headlights one on `ReferenceError: vehLightsRemote is not defined`).
- Verified locally: the 57 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.178` / `corn-souls-test-shell-v205`.

## TEST v1.97.177 — the NPCs wear Loves_Art's Low Poly Male / Female (2026-11-04)
- Owner: *"lets tryt he models as is at first"*, then picked **the NPCs** (not the players) to wear them first.
- **Vern** (standing, by the loop track) and **Rick** (seated, control room) wear **Low Poly Male**; **Brenda** and **Tammy** (seated, scale house) wear **Low Poly Female** - both by Loves_Art on Sketchfab, **CC BY 4.0**, now `in-use` in `assets/registry.json` and credited in `CREDITS.md` (`credits.html` reads the registry). The GLBs are stored byte-for-byte as `assets/models/low_poly_male_loves_art.glb` / `low_poly_female_loves_art.glb`.
- **"As is"**: the files are not edited - not merged, not reduced, finger bones kept. In game they are only scaled (1.78 m / 1.65 m), posed and recoloured:
  - arms brought down from the export's **T-pose** to the sides (`SKIN_POSE.arm`), measured from wherever the export left each arm;
  - seated: thighs forward to near level, the underside of the seat set on the 0.47 m chair, and each shin tilted just enough that the ankle stops 9 cm above the floor - worked out from the model's own leg lengths, so the feet reach the floor for both sizes;
  - each NPC keeps the colour it had: the **clothing** takes its old shirt colour (Vern khaki, Rick blue, Brenda purple, Tammy green) and the two women keep their **old hair colours** (Brenda brown, Tammy blonde), so they are not twins. Skin, faces and shoes are the models' own.
- **The glTF reader learned skinning.** The bundle ships no GLTFLoader and `glbBuild` read only rigid parts, so it now also reads `JOINTS_0` / `WEIGHTS_0`, builds a `Skeleton` per glTF skin (bones from the joint nodes, inverse bind matrices from the file) and `SkinnedMesh` parts bound to it, and returns the file's animation clips; `glbPose(clip, t)` samples one into a pose. Rigid models read exactly as before.
- Worth knowing / readings I took:
  - The models come as they are: the women wear a **crop top and shorts**, the men a T-shirt and trousers, and nobody has a **hard hat** (Rick's camo hard hat went with the old rig). Say if you want work clothes or hats - they are add-ons.
  - Arms hang straight; nobody is animated (the files' walk clips are read but unused - NPCs stand or sit still).
  - Cost: 42 skinned parts for the four NPCs, no shadow casting; the old rigs were folded to one mesh per material. Merging is the planned next step if the draw calls show.
  - The old rigid NPC rigs stay in the repo: the **players still wear `operator_vern_rig.glb`**.
- Verified in a headless browser: the real TEST page loads all four (42 skinned meshes, 274 bones), with no frame errors.
- New `validate-skinned-npcs.cjs` (57th suite in CI) runs the game's reader on both files (10 / 11 skinned parts on one 66 / 71-joint skeleton, the walk clip read and sampled; a rigid model unchanged) and the game's own `skinnedNpc()`: Vern 1.78 m with his feet on the floor, hands at his sides, facing -Z; Rick and the women sitting ON the seat with ankles just above the floor and knees under a desk top; per-NPC colours on separate materials; the four `NPC_MODELS` entries; registry `in-use` and the CREDITS.md lines. It fails on v1.97.176 and passes now. `validate-power-outage-machines.cjs` now checks that `NPC_MODELS` no longer points at the old rigs (on purpose; it still checks the rig files the players use).
- Bumped TEST to `1.97.177` / `corn-souls-test-shell-v204`. LIVE is untouched.

## TEST v1.97.176 — creatures hit by a vehicle get kicked back (2026-11-04)
- Owner: *"when enemies are hit by vehicle they should be kicked back"*.
- Before: a cob stalker or Daddy Cob Legs that survived a vehicle hit was moved a flat **1.5 m** in one frame (a jump, not a throw), a killed one stayed where it was hit, and a **nibbler** was not moved at all.
- Now every vehicle hit **throws** what it hits (`creepKick` / `creepKickSet` / `creepKickStep`): a kick velocity of **70% the way the vehicle is going, 30% straight away from it**, at the vehicle's speed times **1.2 for a nibbler, 0.8 for a stalker, 0.25 for Daddy** (capped at 14 m/s), which then slides to a stop (drag 3/s). At 15 m/s a stalker goes about 4 m; a nibbler at 10 m/s about 4 m; Daddy barely shifts.
- **The killing hit throws the body too** - a run-over nibbler or stalker lands where it was thrown, not where it was hit.
- **2 player:** the host moves the creatures, so both screens see the throw. A guest's vehicle hit sends its kick to the host with the damage (`ch` now carries `k: [x, z]`); the host caps it and ignores a garbled one. Paint hits send no kick, as before.
- Reading I took: "enemies" = the corn creatures (cob stalkers, nibblers, zombie nibblers, Daddy Cob Legs) - the only things a vehicle damages. Critters (lizards, rats) and NPCs are not run over by vehicles today, so they are unchanged.
- New `validate-creep-kick.cjs` (56th suite in CI) runs the game's creature code: a stalker hit at 15 m/s is thrown more than 3 m straight ahead and slides to a stop, a slower hit throws it less, a nibbler run over dies and its body is thrown further, a side-on hit goes mostly along the vehicle, Daddy < stalker < nibbler, the cap holds, the guest's kick reaches the host capped, and all three vehicle hits are wired. It fails on v1.97.175 and passes now.
- Bumped TEST to `1.97.176` / `corn-souls-test-shell-v203`. LIVE is untouched.

## TEST v1.97.175 — roll-up doors open by themselves when you drive at them (2026-11-04)
- Owner: answered **yes** to `HANDOFF_CLINE.md` section 7, *"Should roll-up doors open automatically for vehicles?"*, and on this build: *"do it"*. Built to the plan agreed in the v1.97.174 handoff.
- New `rollAutoStep()` (next to the door switch code, run every frame in `stepSafe('rollAuto', ...)` right before the doors step). While you are **driving** (the Ranger, or any car - they all move through `utv`), a roll-up opens when:
  - you are on its **outside** face (the opposite side from its mesh door and switch station - `d.in`),
  - within **12 m** of it and within 3 m of its floor height,
  - moving faster than **1 m/s**, pointed within **60°** of it **and** moving in through the wall (at least 30% of your speed across it) - so driving along the wall past a door does nothing.
- It opens through **`rollSwitchSet(i, 'open')`** - exactly the green button: steel door and mesh both go up, the guest/host gets the same `rd` message and world-sync lock, and the host stays in charge. One message per opening, not one per frame (an open door is skipped).
- **Power outage: nothing happens**, the same rule as the switch. When the power comes back and you are still driving at it, it opens.
- **It never closes on its own.** The red button is still how it comes down. A door left on yellow (steel up, mesh down) gets its mesh raised when you drive at it, so you can get through.
- Readings I took: from the **inside** nothing opens automatically (the plan said outside face only - you have the switch station in there); the **mower** and on foot do not trigger it (the plan said "only while driving"). Either is a one-line change if you want it.
- New `validate-roll-auto.cjs` (55th suite in CI) runs the game's own `rollUpDoor`, `meshDoorsBuild`, `rollDoorStep`, `rollSwitchSet` and `rollAutoStep` on a two-door building: opens from outside (straight on and at an angle), sends exactly the switch's `rd` message once, really stops blocking, never closes; stays shut on foot, from inside, driving away, driving past, beyond 12 m, creeping, on another level, while dead, and in an outage. It also checks the call sits in the engine block (no cross-block reference). It fails on v1.97.174 and passes now.
- Bumped TEST to `1.97.175` / `corn-souls-test-shell-v202`. LIVE is untouched.

## TEST v1.97.174 — the squeegee is gone; you start with the shotgun, wrench and crowbar (2026-11-04)
- Owner: *"remove the squegee instead you should start with the shotgun, wrench, and crowbar"*.
- **The squeegee item is removed outright** - not just parked: `makeSqueegee()` (the yellow-handled, black-bladed viewmodel), its `heldG.squeegee` entry, its swipe branch in `fire()`, its push-forward animation in `updateGun()`, its two third-person hand meshes, its HUD label and its line in the controls card are all gone. Nothing else could reach it: it was only ever in `ITEMS`.
- **The starting kit** is now `ITEMS = ['gun', 'wrench', 'crowbar', 'hand']` - the paintball **shotgun** (the `gun` item is the pump shotgun model from `buildShotgun`), the **wrench** and the **crowbar** in your hands from the first frame, where before the wrench and crowbar were only on the shop pegboard. The **empty hand stays** as the fourth slot: it is what you carry a corpse or the boom box with, so dropping it would have broken carrying.
- Keys **1 / 2 / 3** now pick shotgun / wrench / crowbar (they used to be gun / squeegee / hand); the empty hand is still on the mouse wheel / L1 / R1 cycle, and 4 is still the ammo swap (paint / water) - untouched.
- The radio's "go squeegee the floor in the process building" job line stays as flavour; it is the cleaner you are, not an item.
- Tests: `validate-traffic.cjs` (which runs the launcher-patched TEST source) now requires the new `ITEMS` line, that **no** trace of the squeegee is left (`makeSqueegee`, `'squeegee'`, `squeegee: [`) and that 1/2/3 map to the three starting items while the controls card still says "1 2 3"; its held-item HUD count drops 5 -> 4 and it now walks whatever held groups exist instead of a hard-coded list. Fails on the previous revision, passes now.
- Verified locally: the 54 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes. LIVE is untouched.
- Bumped TEST to `1.97.174` / `corn-souls-test-shell-v201`.

## TEST v1.97.173 — the wet cake pad has walls on its south and east sides too (2026-11-04)
- Owner: *"wetcake pads needs walls on the south and east side matching the north wall"*.
- The pad (67 x 24 m, under an open roof on steel posts, right south of the energy center) had a single **2.2 m push wall** on its north side. The same wall is now on the other two sides the owner named:
  - **south**: `box(67, 2.2, 0.4, ..., PZ1 - 0.2)` - the north wall's twin, mirrored to the south edge;
  - **east**: `box(0.4, 2.2, 24, ..., E1 - 0.2)` - the same wall turned along the 24 m end.
  Both are inset 0.2 m like the north one, in the same concrete (`0x9aa1a8`), so the pad reads as a three-sided bay open to the west. Nothing else about the pad changed - slab, roof, posts and the truck scale in the lane south of it are untouched.
- Worth knowing: the pad's south side is the loading lane (the 21 m truck scale sits 4 m south of it) and its east side faces the concrete apron along the energy center's east wall, so both approaches now stop at a 2.2 m wall. That is what was asked for; if the wet cake needs a way in from the lane, say where and it is a gap in that wall.
- Tests: `validate-windsocks.cjs` already sliced the code right up to the pad, so its slice now runs the pad block too and asserts **three** 2.2 m walls in that concrete, the south one matching the north wall's size and centreline, the east one 0.4 x 2.2 x 24 on the end's centreline. It fails on the previous revision and passes now.
- Verified locally: the 54 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes. LIVE is untouched.
- Bumped TEST to `1.97.173` / `corn-souls-test-shell-v200`.

## TEST v1.97.172 — the ammonia cloud is bigger (2026-11-04)
- Owner: *"ammonia cloud should be a little bigger"*.
- The cloud is a pool of sprites (`nh3Puff`), and a puff's size is its world size: it starts at `size0`, then grows by `f * N` over its 14-20 s life. Both numbers went up about 30%:
  - start: `1.0 + random * 0.6` -> **`1.3 + random * 0.7`** (1.3-2.0 m puffs, was 1.0-1.6);
  - growth: `q.size0 + f * 9` -> **`q.size0 + f * 11.5`**, so the oldest puffs reach ~13 m instead of ~10.6.
- **The hazard moved with it, on purpose.** The exposure test uses the same size (`d < size * 0.6`) to decide whether the cloud is at Squeeg's face, so a visibly bigger cloud is also a slightly wider hazard - which is the honest coupling: the cloud looks like what it does to you. Nothing else changed: the spawn rate, the 150-puff ceiling, the wind drift, the drain/hole jets and the alarm are untouched.
- New `validate-ammonia-cloud.cjs` (54th suite in CI) **runs `updateNH3` for real** over an open drain for 20 s: the puffs start 1.3-2.0 m across, the oldest grow past 11.6 m (proving the old 10.6 m ceiling is gone - measured 13.1-13.4 m), the cloud still sits downwind of the tank, standing in it builds exposure until it kills you, and out of it the exposure wears off. It fails on the previous revision and passes now.
- Verified locally: the 54 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes. LIVE is untouched.
- Bumped TEST to `1.97.172` / `corn-souls-test-shell-v199`.

## TEST v1.97.171 — the corn cubes have no green edge outline any more (2026-11-04)
- Owner: *"remove the green outline from around the corn cubes"*.
- **What it was:** the corn props come from the launcher's injected corn engine (`cornEngine` in `test/index.html`, not `game.html`). `cornVisual()` put the cube GLB on the prop and then drew a **dark-green box of edges** round it - `new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.57,.57,.57)), new T.LineBasicMaterial({ color: 0x254b3d }))`, sized to the 0.57 m cube - "reinforced cube edges make this a playful CORN BLOCK". That outline is gone; the cube model itself (and the ear, which never had an outline) is untouched.
- One less draw call per cube on the ground, and no green lines to see through the corn.
- Tests: `validate-corn-sync.cjs` (which already runs the launcher's corn engine for both players) now asserts the prop still shows the model and that **no** `EdgesGeometry` / `LineSegments` / `LineBasicMaterial` outline is drawn, and that the cube GLB is still loaded. It fails on the previous revision and passes now.
- Checked separately that the launcher's injected engine is still **valid JS** after the edit (a stray `"` in an inserted comment broke the double-quoted `cornEngine` string on the first attempt - caught by parsing the launcher's script blocks, not by the suites).
- Verified locally: the 53 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes. LIVE is untouched.
- Bumped TEST to `1.97.171` / `corn-souls-test-shell-v198`.

## TEST v1.97.170 — four lizards instead of one (2026-11-04)
- Owner: *"havent seen a single lizard"*, then *"increase lizard number to 4"*.
- **Why he never saw one:** the whole plant had exactly **one** lizard and one rat - `critters = [makeCritter('rat'), makeCritter('lizard')]` is built once and nothing ever adds to it. That one lizard is a **0.30 x 0.11 m sprite** on a wall 0.55-3.35 m up, only in the cook and evap alleys (~2,000 m²), never within 6 m of you, it drops and runs when you come within 4 m, lives 60-150 s and then is gone for 8-43 s.
- **Now:** four lizards and the one rat, each built by `makeCritter` with **its own sprite material** - the hit / eat tint is applied per creature, so a shared material would have turned all four belly-up red when you shot one.
- **The frame budget is unchanged.** A waiting critter makes one probe a frame, so five waiting at once would have been five raycasts a frame where v1.97.92 had cut it to one. `updateCritters` now spends a shared `crBudget = 1` per frame: one critter gets to ask, the rest keep their `t` below zero and ask again next frame, so the same one-probe-a-frame cost now covers the whole set.
- **Two player needs nothing new:** `critSnapshot()` maps over the whole critter list and the wire rows are `[kind, index, ...]`, so four lizards mirror by index. The guest's climbing lizard still counts as alive.
- Tests: `validate-frame-stability.cjs` (which owns the critter probes) now asserts the set is exactly 4 lizards + 1 rat, that each creature gets a fresh sprite material, and it **runs `updateCritters`** over five waiting critters for 12 frames: never more than one spawn probe in a frame, and all five still get their turn. `validate-critter-sync.cjs` now builds the real 1 + 4 set so the index-based mirroring is exercised over all of them. The new checks fail on the previous revision and pass now.
- Verified locally: the 53 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes. LIVE is untouched.
- Bumped TEST to `1.97.170` / `corn-souls-test-shell-v197`.

## TEST v1.97.169 — headlights on whatever you drive (2026-11-04)
- Owner: *"vehicles should have headlights when driving them especially after dark"*.
- **A second spot in the lighting pass** (`csHl0/1/2`, beside the walker's headlamp `csFl*`), fed every frame by `vehLights`:
  - from the nose of whatever you're driving (the Ranger, any car, the zero-turn mower), along its heading and a little down;
  - 0.42 rad cone, 75 m reach;
  - fades in when you get in, out when you get out (not for a dead driver).
  - Battery/engine power like the headlamp: an outage doesn't touch it, a flicker event close by makes it stutter.
- **Lighting the road ahead:** from 0.9 m up, the road ahead is lit at a grazing angle of a few degrees, and plain Lambert shading left it black past ~10 m.
  - The beam gives faces turned toward it a floor (30%), so the road lights up into the distance; faces turned away get nothing.
  - A `+25` in the falloff keeps it from whiting out at the bumper.
- Checked in the running game at 11 PM in the Ranger: a cone of light down the yard ahead with the lights on, nothing with them off.
- New `validate-headlights.cjs` checks:
  - on foot, nothing;
  - the Ranger's beam at its nose, along and turning with its heading;
  - a car's nose, the mower's own heading;
  - the fade in and out, the flicker stutter;
  - the shader block and the frame hook.
- Bumped TEST to `1.97.169` / `corn-souls-test-shell-v196`.

## TEST v1.97.168 — no pigeon coos through the roof (2026-11-04)
- Owner: *"shouldnt be able to hear the pigeons on the roof from inside the building"*.
- The coo only knew distance (35 m), so a pigeon on the roof right over your head was the loudest thing in the room.
- **Now** (`soundShutOut`, using the lighting's building envelopes `ENCL` / `enclAt`): when the camera is inside a building and the pigeon is not in that same room, you don't hear it. That covers a pigeon on the roof (above the envelope's top), one out in the yard, or one in the main shop while you're in an office inside it.
- With you outside, up on the roof, or in the same room, you hear it as before.
- Checked in the running game: none of the 122 perches counts as indoors; standing inside the biggest building, all 23 pigeons on its roof and the yard ones are shut out.
- New `validate-indoor-sound.cjs` runs the game's own check and coo for each case.
- Bumped TEST to `1.97.168` / `corn-souls-test-shell-v195`.

## TEST v1.97.167 — the shotgun no longer reloads when it doesn't need to (2026-11-04)
- Owner: *"reloading seems to happen automatically when not necessary"*.
- **Cause:** the gun topped up any part-used magazine by itself after ~2.2 s without shooting. One shot and a pause meant a full reload animation and a lost moment.
- **Now:**
  - it reloads by itself only when the magazine is **empty**;
  - otherwise reload is on **R** (keyboard) or the new **D-pad down** (controller; it was unused while walking);
  - a **phone**, which has no reload control, keeps the top-up after a pause (no `pc` / `padmode` class on the page).
- The controls card says so.
- `validate-gun-magazine.cjs` runs the game's own reload rule for PC, controller and phone, part-used and empty (it fails on the old rule), and checks D-pad down and the controls card.
- Bumped TEST to `1.97.167` / `corn-souls-test-shell-v194`.

## TEST v1.97.166 — the owner's grain haulers bring the corn in (2026-11-04)
- Owner: pointed me to `Kernel Art/3D/Grain Haulers` (eight GLBs: black, blue, green, pink, red, white, yellow, yellpink).
- **The models:** each is a tractor plus an end-dump trailer, about 240 triangles, painted with vertex colours and rigged (`DumpBed_Pivot`, `Tailgate_Pivot`, `Hydraulic_Ram`, `Steer_*`, `Wheel_*`). They are added under `assets/models/grain_haulers/`, registered and credited.
- **Vertex colours:** the game's GLB reader (`glbBuild`) now reads `COLOR_0`, on a vertex-colour copy of the material made once per material. Without it every hauler came out white.
- **Corn deliveries are now haulers** (`truck('corn', look)` → `haulerTruck`), in a random colour. The ethanol / oil tankers are unchanged, and the old box trucks are used only until the models have loaded.
  - Turned from its +z to the game's +x and centred, 15.2 m long. It has its own collision box (`userData.vbox`, half length 7.6 instead of the 21 m truck's 10.6).
  - **The dump** (`haulerPose`, same 2.6 s timing as before):
    - the bed tips back 0.5 rad on its rear hinge;
    - the hydraulic ram stretches from its foot on the chassis to the bed's front, blending in from its own rest pose;
    - the tailgate swings out at the bottom;
    - a stream of corn pours out the back;
    - the heap in the bed is gone by 1.5 s, so the truck leaves empty.
  - It stops 8.4 m further on (`DUMP_AHEAD`), so its tail is over the pit.
  - Its wheels turn with the ground covered.
- **Two-player:**
  - the host now sends which hauler each truck is, as the 12th field of the launcher's `vt` truck sync, so the guest builds the same colour;
  - the guest now also plays the host's dumps from the `dumping` flag and clock it already received (before, a guest never saw a truck dump).
- Checked in the running game: all eight load in their own colours, and a pink and a yellow-pink hauler tip their beds with the rams up.
- New `validate-haulers.cjs` loads the real files with the game's reader and checks:
  - every part vertex-coloured;
  - all eight colours, turned and centred, ten wheels;
  - the bed on its rear hinge, the ram reaching the bed front, the gate, the pour, empty after, back to rest;
  - wheel roll, the guest's dump, the sync field, the collision box and the dump stop.
- Bumped TEST to `1.97.166` / `corn-souls-test-shell-v193`.

## TEST v1.97.165 — pushing through the corn (2026-11-04)
- Owner: *"When running through the corn there should be an effect especially in first person"*.
- **The stalks give way** (`cornBend`): clumps within 1.3 m of you lean away from you, tipped over at their foot. They spring back upright with a little swing once you're past, and settle to exactly how they stood.
  - It works for you on foot, for you driving (2.2 m), and for the other player.
  - It shows in third person and on the other player's screen without any network traffic.
  - Only the bent clumps' slots in the instance buffer are re-sent (`addUpdateRange`), never the pivot field's 14,000.
  - A clump mown while it leans stays mown.
  - A strongly pushed clump sometimes puffs tassel pollen.
- **First person, on foot, moving in the corn:**
  - corn leaves (drawn in code) sweep from in front of you out past the side of your face, more often the faster you go;
  - the rows close in: a dark-green ring round the view (`#cornVig`) that fades in among the rows and clears when you step out.
  - Standing still among the rows, the ring stays but no leaves come. Not shown in third person, while driving, mowing or riding.
- **Sound:** a dry rustle (soft-edged filtered noise) that comes faster and louder with your speed, on foot or driving.
- Checked in the running game: the rows close in round the view, a leaf swipes past, and the corn bends as you go.
- New `validate-corn-brush.cjs` checks:
  - only the clumps round you are pushed, away from you, and spring back exactly;
  - only their buffer slots are sent;
  - leaves, closing-in and rustle in the right cases only;
  - third person, the other player and vehicles;
  - mown stays mown.
- Bumped TEST to `1.97.165` / `corn-souls-test-shell-v192`.

## TEST v1.97.164 — two-player audit of the new features (2026-11-04)
- Owner: *"Make sure all the new features are synced with 2 player well everything that needs to be synced"*.
- **Audited, already synced:**
  - roll-up + mesh door switches, including yellow (`rd` message + `ws.rd` door/mesh states, the power outage ignored for the other player's press);
  - eating any picked-up critter (`cre`), and carrying one (critter snapshot);
  - cob stalkers, Daddy's health (host-run, guest hits go to the host);
  - nibbler personalities (host-run AI);
  - zombie nibblers (snapshot kind 3), corpses (in the host's list, so in the snapshot);
  - the debug stalker request from a guest (`cdbg` with the guest's spot and facing).
- **Local by design (nothing to share):** title screen, grass, lighting, roof map, mini map bake and on/off, sprite mirror, fire art, hydrant, exit signs, grain pile, landing damage, eat button. The ducks on the ponds are ambient and each player's are their own.
- **Fixed — three gaps:**
  - **A debug stalker the guest spawned could ignore the guest.** If the host was standing in the corn, the field rule ("whoever is in its corn") made it keep after the host, hundreds of metres away. Free stalkers now go for whichever player is nearer.
  - **The guest wasn't told about nibblers.** "😈 Nibblers burst out…" and "🧟 The dead nibblers are getting back up!" only showed on the host. The guest now gets both from the snapshot (within 60 m; the get-up message at most once every 5 s). A join is not news of a burst.
  - **Joining guests heard a death scream for every corpse.** Since nibbler corpses now stay (up to 30), a guest joining made each one already lying there play a death scream. Corpses that arrive already down now arrive quiet.
- **Mini map:** the other player's dot now follows their position on foot *or driving* (it used their on-foot body, which is hidden in a vehicle).
- `validate-two-player.cjs` checks all of these with the real host and guest code; each check fails with its fix reverted.
- Bumped TEST to `1.97.164` / `corn-souls-test-shell-v191`.

## TEST v1.97.163 — nibblers: varied chases, corpses that stay, zombie nibblers (2026-11-04)
- Owner: *"Nibbler behavior should be more varied sometimes after chasing you all the nibblers seem to stack up or chase you single file in the same way. Also dead ones should remain. And if you don't kill all the nibblers within 20 seconds the dead ones come back as someone nimblers. Maybe just a color swap for those."* I read "someone nimblers" as zombie nibblers.
- **Why they stacked and lined up:** every nibbler aimed straight at you at the same speed, so they followed each other in and piled into one spot.
- **Varied chase:** each nibbler gets its own personality at birth (`nibPersonality`), and `nibHuntAt` picks where it heads:
  - 25% come straight in, 45% swing out to your side first, 30% circle you at ~3 m and dart in;
  - each has its own speed (82–118%) and its own weave (or none);
  - the odd hesitation, never when right on you;
  - its own hop rhythm, so they don't hop in step;
  - within 2.6 m every one goes straight for the bite;
  - they keep 0.85 m apart instead of stacking.
- **Measured in the game's own code:** five nibblers bursting 10 m from a player who stands still, same seed.

  | | Old | New |
  |---|---|---|
  | Closest two | 0.03 m | ≥ 0.66 m |
  | Spread of their approach bearings | 0.23 rad | 0.42 rad (0.60–0.86 on five other seeds) |
- **Dead ones stay:** nibbler corpses no longer fade after 7 s. The 30 most recent are kept. Dead stalkers and Daddy still clear after 30 s.
- **Zombies:** the five from one stalker are a group (`CREEP.ngrp`).
  - Kill all five within 20 s of the burst and they stay dead.
  - Leave any alive at 20 s and that group's dead get back up one after another (`nibRevive`): a puff of dirt, a screech, the sprite swinging upright, then hunting, furious.
  - Zombies are tinted green (`NIB.ZOMBIE`), with the same stats. A zombie that goes down stays down.
  - You're told: "🧟 The dead nibblers are getting back up!"
- **2 player:** zombies travel as kind 3 in the creature snapshot; the guest makes them nibblers, greens them and plays the get-up.
- Checked in the running game: zombies get up green next to the normal yellow ones, and a corpse stays on the ground.
- `validate-nibblers.cjs` covers:
  - the three styles and their spreads;
  - the hunt targets;
  - the chase spacing and spread (fails on the old chase);
  - out-of-step hops;
  - all killed in time → they stay dead;
  - partly killed → zombies at 20 s, green, the survivors unchanged;
  - dead zombies stay dead;
  - the 30-corpse cap;
  - the snapshot.
- Bumped TEST to `1.97.163` / `corn-souls-test-shell-v190`.

## TEST v1.97.162 — mini map: on/off in the pause menu, smaller, clear of the magazine (2026-11-04)
- Owner: *"Mini map needs a on and off toggle in pause menu. Also minimal needs to me a little smaller and out of way of the gun magazine so you can keep track of ammo."*
- **Pause menu → "🗺️ Mini map: on / off":** flips it, says so, and re-opens the menu showing the new state. It is remembered on this device (`cs_minimap`) and on by default. While it is off there is no bake and no drawing.
- **Smaller and clear of the magazine:**
  - desktop / controller: 150 → 118 px, lifted to `24vh + 8px` from the bottom. The first-person gun scales with the window height, so this keeps it over the magazine at any size (checked at 960×540, 1920×1080 and 1280×1024);
  - touch: 116 → 100 px, still above the fire / swap / eat / aim buttons;
  - short landscape phone: 96 → 84 px, under the pause button (checked at 844×390 and 390×844).
- `validate-minimap.cjs` covers the new size and placement, the menu item, and the toggle (on by default, off hides it and is remembered).
- Bumped TEST to `1.97.162` / `corn-souls-test-shell-v189`.

## TEST v1.97.161 — ducks swim bill first (and lizards, the vulture and nibblers face the way they go) (2026-11-04)
- Owner: *"ducks swim backwards"*.
- **Cause:** the ducks turn to face the way they swim with a negative sprite `scale.x`, but three.js ignores the sign. Its sprite vertex shader takes `length(modelMatrix[0].xyz)`, so no sprite ever mirrored. Every duck kept its picture's bill on the right, swimming backwards whenever it went left on screen. The wall lizards, the flying vulture and the nibblers use the same flip, so they were affected the same way.
- **Fix:** one patch to `T.ShaderLib.sprite.vertexShader` at load (`SPRITE_MIRROR`), right after `#include <uv_vertex>`:
  - a sprite whose matrix is mirrored (det < 0) reads its picture right to left (`1.0 - MAP_UV.x`);
  - the quad isn't flipped, which would reverse its winding and cull it;
  - non-mirrored sprites are unchanged;
  - the patch applies only once.
- Checked in real WebGL: a test card with an orange "bill" on the right renders it on the right at scale +1 and on the left at −1 (before the fix, on the right both times).
- New `validate-sprite-mirror.cjs` checks:
  - the patch lands where it should;
  - the determinant test in the game's cases, including a flipped nibbler inside a turning group;
  - the duck and lizard facing rules match their right-facing pictures.
- Bumped TEST to `1.97.161` / `corn-souls-test-shell-v188`.

## TEST v1.97.160 — debug: spawn a cob stalker next to you (2026-11-04)
- Owner: *"add a spawn cob walker to debug so we can spawn it nearby player"*. I took "cob walker" to mean the cob stalker.
- **Debug → "🌽 Spawn a cob stalker next to me"** (`P3.creeps('near')` → `creepDebug('near')` → `creepNear`):
  - a full-health stalker comes out 9 m in front of you;
  - if a wall line is in the way it comes out at 6 m or 3.5 m instead, so it lands on your side of the wall;
  - it screeches on arrival;
  - it only works while walking.
- It is a **free** stalker (`c.free`), not tied to the corn field:
  - it hunts whoever comes within its range anywhere;
  - it wanders within ~15 m of where it was put;
  - it never heads back to the corn, and the field edge doesn't wall it in;
  - it doesn't count toward the field's cycle, so Daddy still comes when the field's own two are down;
  - it still bites, takes paint and tool damage, and bursts into nibblers when it dies.
- **2 player:** the guest's request goes to the host with the guest's position and facing, so it comes out in front of whoever asked.
- Checked in the running game: it appeared 9 m ahead and went straight into its hunt.
- `validate-corn-creatures.cjs` covers:
  - placement, and the wall case;
  - hunting outside the field without returning;
  - wandering round its spot;
  - the field cycle untouched;
  - only while walking;
  - the menu item, and the guest path.
- Bumped TEST to `1.97.160` / `corn-souls-test-shell-v187`.

## TEST v1.97.159 — a mini map in the bottom-right corner (2026-11-04)
- Owner: *"mini map to bottom right"*. There was no mini map, so I asked; the owner chose a new, real one.
- **The widget:**
  - a round map, bottom right while walking or driving (150 px);
  - centred on you and turned with your view, so what is ahead is up;
  - a yellow arrow for you, a pink dot for the other player, N on the rim;
  - redrawn 15 times a second; drawing is skipped while it is hidden.
  - On a touch screen it is 116 px and sits above the fire / swap / eat / aim buttons. On a short landscape phone it moves up under the pause button.
- **The map picture:** baked from straight above in 256 × 256 tiles, one a frame, read back asynchronously, the same way as the roof map rebuild.
  - It is unlit: each mesh is drawn with a flat stand-in of its own colour and texture, so it reads the same by day or night.
  - It leaves out what moves (`roofMapSkip`, now shared with the roof map).
  - It covers the play area round the plant (x -1200..500, z -500..800) at about 0.83 m a pixel.
  - It is baked when you first walk, and once more 14 s later for the late models. The flat stand-ins are kept between bakes; creating them was the slow part.
- **Measured headless (SwiftShader):** the second bake runs 63 tiles at about 6–9 ms each. One tile, over the corn field's 14,000 clumps, takes ~60 ms; that is vertex work a real GPU does far faster. The first bake's first tile (~150 ms) builds the stand-ins at spawn, next to the roof map's one-time build.
- **Tests:** new `validate-minimap.cjs` runs the bake against a stand-in renderer that paints each pixel from its world position, and checks:
  - every pixel is in place (it fails on a flipped tile);
  - one tile a frame;
  - materials are swapped back;
  - the fps readout is untouched;
  - moving things are left out;
  - the stand-ins are reused;
  - the widget's placement, and that the map turns the right way.

  `validate-roofmap.cjs` now reads the shared skip list.
- Bumped TEST to `1.97.159` / `corn-souls-test-shell-v186`.

## TEST v1.97.158 — Daddy Cob Legs weaker, a pixel/CRT title, and the green ground flicker's real cause (2026-11-04)
- Owner: *"reduce the health of daddy cob legs. remove no kernel left unburnt from start menu, make version on start menu 10% bigger. add the crt shader and pixel effect from the bonfire onto the title and cry and dry. ground still flickers green especially when looking down at it from high places like the top of tin bin 4"*.
- **Daddy Cob Legs:** health 60 → 30 (three stalkers' worth). The owner gave no number, so this is a halving.
- **Title screen:**
  - the "NO KERNEL LEFT UNBURNT" footer is gone;
  - the version text is 12.1px instead of 11px;
  - CORN SOULS and Cry & Dry are drawn into a new `#spTxt` canvas at the bonfire's own pixel size (screen ÷ 3.2, ÷ 2.5 on a phone), drawn back up with hard pixels. It sits in the CRT stack, under the rolling band and the scan lines, like the fire.
  - Each letter is drawn exactly where the page laid it out (one `Range` per character), so the page still does the fonts and layout. It is redrawn only when the window, layout or fonts change.
  - The page's own text goes to `opacity:0` once drawn, so it is still there for screen readers. If the canvas fails, the page text stays visible.
- **Green ground flicker, the cause:** the grass under everything was one 16 km `ShapeGeometry` with holes (the ponds, the tank-farm pit, the receiving pits). Triangulated, that is a handful of sliver triangles kilometres long, several fanning into the grain yard round the bins. Depth across triangles that size is interpolated too coarsely (worst on phone GPUs) to stay under overlays a couple of centimetres up, whatever the layer table says. That is why the earlier layer and offset fixes never fully held.
  - The grass is now a graded grid (`grassGeometry`): 25 m cells from -1600 to 1800 m, 400 m cells to the horizon. It is one tensor grid, so there are no T-junctions.
  - Each hole sits in a small patch whose outline keeps every grid vertex. The patch triangles are refined by shared-midpoint edge splitting (`grassRefine`) until none is over 40 m; the pond patch had 355 m edges.
  - The result is 57k triangles in one draw call, with the same area, holes, UVs and material.
  - The grass gets a flat-plane raycast (`grassRaycast`). Tuft probes, shots and splats would otherwise test 57k triangles per ray (measured: ~2 s per 256 probes, against ~1–5 ms now). It gives the same hits as the triangle test at 410 sampled points.
  - The other ground planes that use `groundMat` (dirt yard, lots, roads; 12 of them) are cut into ~30 m cells (`GSEG`). The 300 m dirt yard was two triangles.
- Headless rendering is too exact to show the flicker itself, so the fix is verified on the geometry: the view down from Tin Bin 4 renders clean, with no cracks.
- **Tests:** new `validate-grass-grid.cjs` checks the game's real holes:
  - no edge over 40 m near the plant;
  - the same area;
  - watertight (only the border and hole sides open);
  - flat raycast = triangle raycast;
  - holes are still holes;
  - all ground planes subdivided.

  Also updated: `validate-title.cjs` (footer, version size, pixel layer) and `validate-corn-creatures.cjs` (HP 30).
- Bumped TEST to `1.97.158` / `corn-souls-test-shell-v185`.

## TEST v1.97.157 — the yeast cooler's temperature readout no longer flickers (2026-11-04)
- Owner: *"yeast cooler temp display texture flickers over"*.
- The readout plane sat at `Z0 - 0.17`, exactly on the front face of its dark housing box (centre `Z0 - 0.15`, 0.04 deep), so the two z-fought. The readout now sits 1 cm in front of the housing (`Z0 - 0.18`).
- `validate-frame-stability.cjs` checks that the readout stands clear of its housing's face. It fails on the old position.
- Bumped TEST to `1.97.157` / `corn-souls-test-shell-v184`.

## TEST v1.97.156 — you can no longer see the yard through the fermenters (2026-11-04)
- Owner, screenshot from inside the process building: *"whin in process building looking out you shouldn't be able to see outside"* — a rectangle of sky, with the plant's outdoor rack in it, between the tanks.
- **The cause was two things meeting.** `tank()` draws a fermenter's shell as **translucent glass** (`glass(0xdff4ff, 0.38)`) so the liquid level reads through it - and the ferm alley walls are built as **segments that stop at each tank's tangent point** (`wall(FXE, fz[0] - FR, FXE, fz[1] + FR, …)`, FR = 7.4 = the tank radius), on the assumption that the tank itself closes the gap. It does close it physically - but it is glass, so every tank slot was a window onto the yard.
- **The fix:** the wall is carried **across every tank slot**, 2 cm inside the tangent line, so the panels meet the wall ends with no sliver: 4 slots on the east wall (Ferm 1-4), 3 on the west (Ferm 5-7) and the beer well's 19 m slot, which was open in exactly the same way. The tanks now read as half-embedded in a continuous wall - which is what "half in, half out" means - from inside and from the yard. No collision is added: the new segments sit inside the tanks that were already solid.
- **Measured in the headless build** (`validate-west-wing.cjs` runs the real construction): before, the east wall had four 14.80 m gaps and the west wall three 14.80 m plus one 19.00 m; now every wall line from the north end to the south end is continuous (west: 10 panels, no gap; east: 9 panels, the only opening left is the open walkway to the shop at -23.7 .. 16.2, which is indoors).
- Tests: `validate-west-wing.cjs` (which owns this building) now measures the siding panels along both wall lines and requires no gap, plus that one panel is drawn across Ferm 1's slot behind the tank. It fails on the previous revision and passes now.
- Verified locally: the 46 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes. LIVE is untouched.
- Bumped TEST to `1.97.156` / `corn-souls-test-shell-v183`.

## TEST v1.97.155 — a cooling tower plume off every fan, not one out of the middle (2026-11-04)
- Owner: *"cooling tower clouds should come from each cooling fan that is running not just a single point"*.
- **What it was:** one `STACKS` entry at the tower's centre (`x: TOWER.x, z: TOWER.z`, rate 8, radius `max(2.6, w * 0.12)`), so a single column rose out of the middle of a 47 m deck while four fan rotors turned on top of it.
- **Now:** one plume per fan rotor (`Fan_Rotor_0..3`, the same nodes the fans spin on), each at that rotor's own world position on the deck (`f.getWorldPosition(V3())`, never below the deck top `bb.max.y - 0.6`), with the same **8 puffs a second split between them** (2 each) and a smaller cloud each (`FR = max(1.2, w * 0.045)` against the old deck-wide radius). So four columns rise eleven metres apart and blend into one drift above the tower instead of one column out of the centre. `TOWER.stacks` holds them.
- **"that is running":** `updateCoolingTower` now sets `spinning` on each of the tower's plumes (`!POWER_OUTAGE.on`), and `updatePlumes` makes no puffs for a stack with `spinning === false` - so an outage stops the fans *and* their drift together, and the hook is there if a single cell is ever taken out of service.
- **Fallback:** a model with no named rotors still gets the single deck plume it had before, at rate 8.
- Cost is unchanged: the total rate is the same 8 a second and the sprite pool is per stack, so ~22 live sprites a plume (~88 for four) against ~88 before.
- Tests: `validate-power-outage-machines.cjs` (which owns the tower) now reads the four rotor positions straight out of the GLB's node matrices and prints them - **x 33.5, 44.5, 55.5, 66.5, closest pair 11.0 m apart**, all up on the deck - so "four plumes, not one point" is measured, not assumed. It also pins the per-fan position code, the `spinning` flag both ways, and the no-rotor fallback.
- Verified locally: the 46 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.155` / `corn-souls-test-shell-v182`.

## TEST v1.97.154 — half as many grass tufts (2026-11-04)
- Owner: *"there should be half as many tufts"*.
- `GRASS.density` goes **0.0165 -> 0.00825 tufts/m²**, exactly half. Everything else about the grass is untouched: 4 m probe grid, 3 tufts in a kept cell (so it is still clumps, not lone blades), the clump mask, the seeded per-chunk scatter, 64 m chunks, the 3x3 ring and the 96 m draw distance.
- Measured with the game's own `grassChunk` over 49 chunks: **1020 tufts against 1956** before (52.2% - the cell either keeps its clump of three or loses it, so the halving lands just above 50), which is 5.2% of the 0.16 default the v1.97.135 "remove 90%" left behind. Per 64 m chunk on open grass that is about **20 tufts instead of 40**; a full ring in view about **175 instead of 360**, worst case ~320 instead of ~590. Draw calls are unchanged: up to 6 instanced meshes per chunk, one per species.
- **The stored setting would have hidden it:** `cs_grass` remembers a density per device, so a phone that had played before would have kept 0.0165. The saved format's version is bumped (`v: 2 -> 3`), so a stored density from before this release is ignored once and the new default lands; `on` and `dist` still carry over.
- Tests: `validate-grass.cjs` reads the default from the source, so it adapts, and now pins both ratios - about a twentieth of the old 0.16 default, and within 5% of half of the 0.0165 it replaced (printing `1020 vs 1956 before the halving and 19635 at the old 0.16`).
- Verified locally: the 46 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, all 10 script blocks parse. LIVE is untouched.
- Bumped TEST to `1.97.154` / `corn-souls-test-shell-v181`.

## TEST v1.97.153 — the game runs again: the frame loop was throwing on every frame (2026-11-04)
- Owner, screenshot of the title screen over an empty blue viewport: `Uncaught ReferenceError: titleFrames is not defined`.
- **The bug was mine, from v1.97.149.** The title gate's warm-up counter was `let titleFrames` in the engine block, and the loop block's `frame()` incremented it directly: `titleFrames++;`. The frame loop is a separate `<script>` block and cannot see the engine block's `let`/`const`/`function` - that is the codebase's oldest trap, and `renderer`, `scene`, `srgbTex`, `MODEL_PBR`, `GRASS.solids` and `pivotCols` have all been broken by it before. The ReferenceError was thrown at the top of `frame()`, before the frame body, so **nothing was simulated and nothing was drawn** from 1.97.149 to 1.97.152 - the title screen sat over an empty sky.
- **Why verification missed it:** all 45 suites pass source slices into `vm` and check strings; none of them asks *which block* a name comes from, and `new Function(block)` only proves the block is valid on its own. The fix that shipped had a test asserting the broken line was there.
- **The fix:** the loop calls `P3.frameDrawn()`; the bridge owns the counter (`frameDrawn: () => { titleFrames++; }`), exactly like `drawCalls`, `triCount` and `drawHud` do for the renderer.
- **New `validate-frame-loop.cjs` (46th suite in CI) is the check that was missing:** it runs the loop's own `paceUpdate` + `frame` for real in a `vm` where **the engine block does not exist**, with a `P3` that only answers names the real bridge declares (289 entries). A bare engine-block name throws `ReferenceError`, a call into a bridge entry that does not exist throws `TypeError`, and the suite also proves it is not vacuous by running `frame()` against a bridge with no `frameDrawn` and requiring a loud failure. Against the v1.97.149 revision it reproduces the owner's exact error: `ReferenceError: titleFrames is not defined`.
- `validate-title-render.cjs` now asserts the bridge call and that `frame()` never mentions the counter.
- Verified locally: the 46 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes. LIVE is untouched.
- Bumped TEST to `1.97.153` / `corn-souls-test-shell-v180`.

## TEST v1.97.152 — the lawn mower shed's south wall shelf is gone (2026-11-04)
- Owner: *"remove shelf on south wall of lawn mower shed"*.
- The storage shed by the yeast cooler (the zero-turn mower parks in its east half, `O.shedMower`) had a U of shelves in its west half: a run along the west wall, one along the north side, and one along the south side (`shelfRun(X0 + 0.7, half - 0.2, Z1 - 0.6, Z1 - 0.1)` - four boards on four posts).
- **The south run is removed**: the shed now has an L (west wall and north side). Nothing else about the shed changed - the man door at the SE corner, its step, the 2 ft x 4 ft window, the east roll-up and the parked mower are all untouched.
- New `validate-mower-shed.cjs` (45th suite in CI) owns that block: exactly two `shelfRun` calls, the west and north ones named, no shelf left hugging `Z1`, no stale "U-shaped / both side walls" comment, and positive checks that the south wall's door and window, the mower and its roll-up are still there. Verified that it fails against the previous revision and passes now.
- Verified locally: the 45 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes. LIVE is untouched.
- Bumped TEST to `1.97.152` / `corn-souls-test-shell-v179`.

## TEST v1.97.151 — a phone Eat button, only while something edible is in your hands (2026-11-04)
- Owner, on the audit's open question about a touch-screen eat button: *"yes add eat button only visible when holding something edible"*.
- **The button:** `#eatBtn` (🍖) in the HUD next to the interact and jump buttons, `display:none` unless `body.walking:not(.pc):not(.driving).canEat`. So it is on phones and tablets, never on a desktop (`.pc`), never in a vehicle, never in pad mode, and only while it would do something.
- **"Something edible"** is `P3.canEat` - `!!(heldDead && !heldDead.eating)` - which is exactly the condition `critterEat()` needs, so the button cannot appear with nothing in your hands or while you are already chewing. The frame body sets the class from it, the way it already sets `driving` / `nearutv` from `P3.driving` / `P3.nearUTV`.
- **What it does:** the same call as the B key (`P3.critterEat()`), so it plays the same three crunchy bites and shows the same toast. No second code path to drift.
- Placed above the interact button (bottom right, 104 px up) so it never covers the fire button or the act button's reach.
- Tests: `validate-critter-eat.cjs` (which owns eating) now checks the markup, both CSS rules and the two exclusions, the `canEat` getter, the frame-body toggle, and that the handler is the same `critterEat()` + toast as B.
- Verified locally: the 44 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes. LIVE is untouched.
- Bumped TEST to `1.97.151` / `corn-souls-test-shell-v178`.

## TEST v1.97.150 — a hard landing costs a third of what it did (2026-11-04)
- Owner, asked whether landings on the grain pile should be softer (18-34 HP per jump): *"lets try this"*.
- **Where the damage came from:** not the pile itself - `vehVertical` charges the vehicle when it lands, `(hit - AIR.HURT) * 6` HP, and jumping the pile sends the Ranger off a 4.5-5 m peak and lands it on the grass past the track at 11-15 m/s, i.e. 2-6 m/s over the 9 m/s limit. That is the 18-34 the owner saw.
- **The fix:** the 6 is now `AIR.HURT_K` and it is **2**, so the same jump off the same pile costs a third. Measured with the game's own `vehVertical` at 60 fps off the peak line: 31 mph 4 HP, 40 mph 6, 47 mph 8, 54 mph 9, 59 mph 11 - against 18-34 before, on a Ranger with 100. A hard landing still costs something at every speed, so the jump is not free, and the existing "one jump can never wreck the Ranger" bound still holds.
- `validate-grain-pile.cjs` (which drives the pile) now pins the tuning: `HURT_K` is 2, the landing line uses it and not a literal 6, every speed down the pile costs under 15 HP, and 59 mph still costs more than 5.
- Verified locally: the 44 suites in `.github/workflows/validate.yml` all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes. LIVE is untouched.
- Bumped TEST to `1.97.150` / `corn-souls-test-shell-v177`.

## TEST v1.97.149 — the plant is not drawn while the title screen is up (2026-11-04)
- Owner asked which of the audit's two performance items to do first; this is item 2, *"the world is rendered behind the title screen"*.
- **What was wrong:** `frame()` has always run from the moment the page loads, and `update()` ends with the shadow refresh, the world render and the HUD pass - with no idea what is on screen. The "Cry & Dry" title is an **opaque** panel (`#splash{background:#070403}`) with its own 3D bonfire on its **own** WebGLRenderer and canvas (`title3D`), so every pixel of the plant drawn under it was thrown away: a full shadow pass, world pass and HUD pass every frame, on top of the bonfire's own context and rAF loop. The title screen was the most expensive moment in the game, and it is the first thing a player sees.
- **The gate:** `titleHidesWorld(el, warm)` - one pure rule, next to `PERF`:
  - no title element, or one that is no longer in the document: **draw** (so the LIVE entry point and any embedder render normally);
  - the title has its `.out` class: **draw** - `go()` adds it on the same statement as `live = false`, so the world is live from the *first frame of the 1.2 s fade*, not after the element is finally removed;
  - otherwise, draw the first `TITLE_WARM` (40) frames and then stop: those first draws are what upload the textures and warm the shaders, so the cost does not move into the fade.
- **What stops:** `shadowFollow()`, `shadowRefresh()`, `renderer.render(scene, camera)` and `drawHudGun()`. The skip path does `renderer.info.reset()` and zeroes `PERF.draw/dc/tri`, so the fps line honestly reads `0 dc  0k tri` instead of the last world frame.
- **What does not stop:** the simulation. `Sim.step`, `P3.update`'s world updates, the clock, the netcode and v1.97.147's sliced roof-map rebuild all keep running behind the title - that is the free time they get.
- The fps line gains `· title` while the gate is closed (same shape as `· PAUSED` / `· noGun`), and `P3.perf.title` carries it, so a future regression is visible instead of silent.
- New `test/validate-title-render.cjs` (44th suite in CI): the title is still opaque and the bonfire still has its own renderer (the two facts the change rests on), then `titleHidesWorld` is run for real in `vm` across the no-title / removed-title / warm-up / closed / fading cases; `update()` is sliced and required to keep the shadow refresh, the world render, the HUD pass and the counter reset inside the guard while `lightUpdate` stays outside it; `frameBody` is required to still step the sim and to contain no gate; `frame()` increments `titleFrames` after the pacing skip and before the frame body; `snapshot()` still renders its own frame (bug-note JPEGs can never depend on the gate); and `go()` must add `.out` on the `live = false` line as live code, not behind a `//` (that trap has bitten twice).
- Verified locally: the 44 suites in `.github/workflows/validate.yml` (10 repo-root + 34 `test/`) all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes. LIVE is untouched.
- Bumped TEST to `1.97.149` / `corn-souls-test-shell-v176`.

## TEST v1.97.148 — far fewer ceiling fixtures, with the same light on the floor (2026-11-04)
- Owner: *"there is still too many light fixtures on ceiling looks bad"* (asked of the audit's open questions: the generated high-bays were one every 9 m, which is 48 white boxes in the 23 x 140 m hall alone, plus 7 authored fittings).
- **The grid is 15 m now** (`HB_STEP`, where `lightBuild` generates high-bays for every room that has no ceiling light of its own): 48 -> 18 in the 23 x 140 m hall, 21 -> 8, 10 -> 3, and 4 -> 1 in a 20 m shed. Each fixture that is left is **exactly as strong as before** (same `k` 1.5 and same reach `max(9, (y + 0.6) * 1.6)`), so it is drawn and pools the way it always was - there are just a third as many of them.
- **The floor does not get darker.** A room's first three fixtures threw most of its light, so removing two thirds of them would have taken the floor down with them (measured: 15 m with no top-up reads 0.4596 against today's 1.1558 in the hall, -60%). Every room that loses high-bays now carries `e._boost` - the fraction of them it lost (`n` at 9 m over `n` at 15 m, set where they are generated) - and `roomLampEven`'s even fill is scaled by it. Measured with the game's own `roomLampEven`, unchanged `k`: hall 1.1558 -> 1.2255, next room 0.7781 -> 0.8446, 0.5191 -> 0.5594, shed 0.3998 -> 0.4298. That is 6-8% *brighter* than before, not darker (a coarser grid overlaps its pools slightly differently); the test pins it within 15%.
- **Knock-on fix in the same pass:** the room's even light now counts **mains fixtures only** (`L.grid`). A battery EXIT sign is a red pool at the door, not a room light - but with one high-bay left in a shed it was standing in for the blacked-out ones, so a local blackout left the room glowing at 0.112 instead of black. The suite caught it (`a local blackout kills the fixtures nearby`).
- A room now needs 4+ high-bays to get the one tired ballast, so the small rooms in the test world no longer flicker on their own; the big halls still do (18 and 8 fixtures).
- Tests: `validate-interior-dark.cjs` (which owns the lamp build) now generates the world at 15 m and asserts the new counts (1 in the shed, 1 in the cupboard, 0 in the office with its own light), that `HB_STEP`/`HB_REF` are 15/9 and the hall really does go 48 -> 18, that `_boost` is 4 for the shed, that a 4+ room still gets a tired lamp, and - the important one - it rebuilds this shed's old 9 m array, runs the game's own `roomLampEven` over it and requires the new fill to land within 15% of that floor light (`0.3998 -> 0.4298`, printed by the suite). The blackout assertion now reports the value it measured.
- Verified locally: the 43 suites in `.github/workflows/validate.yml` (10 repo-root + 33 `test/`) all pass, `scripts/check_launcher_anchors.py` passes, `sync_test_to_live.py --consistency` passes. LIVE is untouched.
- Bumped TEST to `1.97.148` / `corn-souls-test-shell-v175`.

## TEST v1.97.147 — the roof map rebuild no longer freezes the game (2026-11-04)
- Owner: *"fix the roof collision rebuild"* (audit item: the second roof-map build, 12 s after you start walking, drew the whole plant top-down into one target and read it back in one go, a ~150 ms freeze mid-walk).
- The rebuild is now sliced (`roofMapRebuildStart` / `roofMapStep`, run from `powerUpdate`):
  - one 128 x 128 tile drawn a frame, two in flight, read back with `readRenderTargetPixelsAsync` (synchronous fallback);
  - the old map stays in use until the last tile lands, then the new one is swapped in whole with its wall tops;
  - a failure (`roofMapGuard`) drops back to the old map and shows `roofmap` on the fps line.
- The grid corner is snapped to whole cells (`roofMapGrid`), so a part moving at the plant's edge no longer shifts every cell a fraction between builds.
- Moving things now left out of the map: the main-line through trains, pigeons, rats, lizards, frogs, thrown corn, and the irrigation pivot (its 345 m arm sweeps the field, so a map of it is wrong a minute later; it used to leave invisible floors behind). A mid-line `//` comment added during this work had hidden the `O.cars` skip; caught and fixed.
- Measured headless (SwiftShader): one-shot 155 ms; sliced, 40 tiles, worst frame 9–11 ms. Sliced against one-shot: same grid, wall tops identical, 3 of 577,760 roof cells differ (by under 2 cm, on a swaying tall part). Before the pivot was skipped, two builds a few seconds apart differed in ~315 roof cells.
- The first build, when you start walking, is still one-shot: the map is needed at once.
- New `validate-roofmap.cjs` runs the rebuild against a stand-in renderer with a known height pattern (6 tiles; every cell checked across the seams; one tile a frame, two in flight; renderer state restored; failure path; skip list read from code, not comments). All 43 suites pass.
- Bumped TEST to `1.97.147` / `corn-souls-test-shell-v174`.

## TEST v1.97.146 — the equipment panel is switched off (2026-11-04)
- Owner (screenshot of the Tin Bin 1 side panel in Savior Mode): *"remove that menu we dont need it at this point"*.
- Every way in goes through `selectUnit`:
  - clicking a unit or a station label;
  - the pad's A / UP / DOWN / L1 / R1 in Savior Mode;
  - the (hidden) Tanks button.
- `selectUnit` now returns at once while `UNIT_PANEL` is false. The panel never opens, and nothing else changes. Its code (`buildPanel`, setpoint controls, cycling) is kept, so `UNIT_PANEL = true` brings it back.
- Verified in the running game: clicking a station label and the Tanks button leaves the panel shut. `validate-frame-stability.cjs` checks the switch. All 42 suites pass.
- Bumped TEST to `1.97.146` / `corn-souls-test-shell-v173`.

## TEST v1.97.145 — lit buildings are lit end to end, not just round you (2026-11-04)
- Owner: *"when inside lit buildings it seems like the building lights up as you walk through it"* (and: *"the building probably doesnt need so many lamps"*).
- **Cause:** the lighting pass makes pools for only the nearest `CS_N.L` lamps (5 on low, 8 on medium / high), picked each frame by distance from you. The big rooms have far more fixtures: 52 in the 23 x 140 m hall, 38, 30, 22 and 20 in the next ones. A room's even fill was weak (0.35) next to its pools, so everything past the nearest few lamps sat dark, and pools came on ahead of you as you walked. Lamp count alone isn't the fix: even a few lamps across a 140 m hall would pop the same way, and the generated high-bays are one instanced mesh, so they cost almost nothing to draw.
- **Fix** (`roomLampEven`, run once at the end of `lightBuild`):
  - For each room, the average light its whole lamp array throws on the floor with every fixture on, using the shader's own pool maths over a 2 m grid. Stored as `e._arr` in fill units.
  - Each frame, a room's fill adds `LAMP_EVEN` (0.75) x that x how many of its fixtures are on. That count is weighted toward the fixtures near you (1 / (1 + d² / 15²)), so outage, warm-up, flicker and a local blackout still darken around you.
  - Room lamps' pools keep `LAMP_POOL` (0.25) of their strength, as a local touch. Outdoor lamps are unchanged.
  - No shader change and nothing per pixel: it's the existing fill uniform.
- **Measured in the running game** (floor light, standing 8% in from one end):

  | Hall | Before (your end → rest) | After |
  | --- | --- | --- |
  | 140 m hall | 1.31 → 0.33 past ~15 m | 1.20 → 0.96 the whole way |
  | 76 m hall | 1.71 → 0.33 | 1.59 → 1.24 |

- `validate-interior-dark.cjs`: the existing checks pass (dark rooms, outage, windows, doors, flicker, local blackout, darkness levels), plus checks for the even-light wiring.
- Bumped TEST to `1.97.145` / `corn-souls-test-shell-v172`.

## TEST v1.97.144 — title screen: the owner's settings, no tuner, pink, new menu names (2026-11-04)
- Owner (screenshot of the tuner set up): *"set the menu the way the settings are in the menu tuner then remove the menu tuner. give Corn Souls the magenta pinkish color scheme matching the fire. remove the harvest rememebers from the start menu. remove rites and controls. new harvest should be solo harvest. kindle a bonfire should be Host Multiplayer. join a bonfire should be Join Multiplayer. remove a tale of the north field."*
- **Settings fixed** at the screenshot's values (`var TS`):
  - 3D bonfire on, silhouettes **off**, soul embers on, PS1 pixelation on, CRT lines on, audio **off**;
  - flame intensity 139, hue 0 (the magenta-pink fire), size 100%, x 4.0, z 2.8.
  - Audio off means no title music (`music()` returns early). The start gong still plays.
- **Tuner removed:** its markup, ~18 CSS rules, its handlers, its keyboard / tap guards and its `cs_title` storage. A browser that saved tuner settings before keeps nothing from them. `applyLook()` puts the fixed look on the page and the 3D scene.
- **Colours:** CORN SOULS is a magenta-pink gradient (`#ffe6f2 → #ff9fd0 → #ff4fa2 → #d81b6a → #8c0d3f`) with a pink glow. The accent colour (`--sp-ember`, "Cry & Dry") is `#ff3d8b`. The rule line, PRESS ANY KEY glow, menu flame marker, selected-item glow and the wake-up flash are pink to match.
- **Text:**
  - "A TALE OF THE NORTH FIELD" removed;
  - the subtitle is just "Cry & Dry";
  - menu: **SOLO HARVEST** (1 player), **HOST MULTIPLAYER**, **JOIN MULTIPLAYER**;
  - RITES & CONTROLS removed. The controls card is still in the in-game menu (🎮 Controls).
- Verified in the running game at 1280 x 720 (title and menu). Old saved tuner settings in the browser are ignored.
- `validate-title.cjs` rewritten for the new menu names and order, no controls item, no kicker or old subtitle, the tuner fully gone, the exact fixed settings, title music off, and the pink title.
- Bumped TEST to `1.97.144` / `corn-souls-test-shell-v171`.

## TEST v1.97.143 — the owner's low-poly fire hydrant (2026-11-04)
- Owner sent `lopoly_hydrant.glb`. The first upload arrived as the text "[object Object]" (15 bytes) and was re-sent; the second came through intact. I'd said it would replace the game's one hydrant unless told otherwise.
- **The model:** 43.7 KB, made with THREE.GLTFExporter, kept unchanged in `assets/models/lopoly_hydrant.glb`. 18 nodes, 14 meshes, 3 materials with three 64 x 64 colour maps (red barrel / dome / nozzles, gold top nut and caps, dark gray base and rings), and nearest-pixel samplers.
- **In the game** (`hydrantModel`): it replaces the old code-drawn flat hydrant (a camera-facing picture) west of the ethanol load-out shack, beside its yellow bollard. Placement details:
  - 2.1 units tall as made, drawn at 0.42 scale = **0.88 m**, the old picture's height;
  - turned so its big front nozzle faces west, away from the shack;
  - colour maps forced to nearest-pixel (the shared GLB reader ignores glTF samplers), so it stays crisp like the rest of the PS1 look;
  - same round collider as before.
- The old picture's code (`BILL_SPEC.hydrant`) is removed; trees are the only billboards now.
- Registered as `first-party-lopoly-hydrant`, credited in CREDITS.md, and listed in `assets/models/README.md`.
- Verified in the running game: loads at x -169.5, z 193.7; its bounding box is 0.60 x 0.88 x 0.65 m, standing on the ground, all 14 parts nearest-pixel. Rendered close up and wide.
- New suite `test/validate-hydrant.cjs` (added to CI) checks:
  - the file is a whole GLB with the expected parts and nearest samplers;
  - its height as made x the game's scale is 0.88 m;
  - the loader, the crisp maps and the placement;
  - the flat picture is gone;
  - the registry entry and the credit.
- Bumped TEST to `1.97.143` / `corn-souls-test-shell-v170`.

## TEST v1.97.142 — the owner's pixel fire for fires (2026-11-04)
- Owner (an animated pixel-art fire GIF): *"can we use this for fires"*.
- **Assets:**
  - `assets/textures/fire/fire.gif` is kept exactly as sent: 256 x 192, 8 frames at 90 ms, 6 colours, 32 x 24 art drawn at 8x.
  - `fire-atlas.png` is cut from it: each frame scaled down 8x (pixel-exact: scaling it back up reproduces the GIF frame), the flat dark background (#211c20) made transparent, all eight in one 256 x 24 strip.
  - Registered as `first-party-pixel-fire`, credited in CREDITS.md, and listed in `assets/textures/README.md`.
- **Where fires are:** the game's fires are the burning vehicles (a Ranger or car at 0 health, `updateDamage`). They now draw the owner's fire:
  - five camera-facing sprites, crisp nearest pixels, at the GIF's own 90 ms a frame (`FLAME_FPS`), each at its own phase;
  - anchored at the flames' base (row 22 of 24) and standing on the bed and hood, wide and low as drawn (2.0 x 1.5 m each, the main one 1.5x);
  - smoke, crackle and burn-out unchanged.
- **Loading:** the strip is fetched when the game starts (`flameArt()`). The old code-drawn flipbook only stands in until it arrives, or if it can't load.
- **Fixed:** the flipbook's frame index could go negative (seen in the running game), which pointed the sprite off the strip and showed a blank frame. It is now kept in range.
- Verified in the running game: set the Ranger on fire, checked that all five flames use the strip with frames advancing, and rendered it from two sides.
- New suite `test/validate-fire.cjs` (added to CI) checks:
  - the GIF is as sent (size, 8 frames, 90 ms);
  - the strip is a 256 x 24 RGBA PNG with eight crisp frames and a transparent background;
  - the registry entry and the credit;
  - the game's loader, speed, anchoring, range fix and preload.
- Bumped TEST to `1.97.142` / `corn-souls-test-shell-v169`.

## TEST v1.97.141 — yellow = rolling door open, mesh closed (2026-11-04)
- Owner: *"pressing the yellow should open the door if the door is closed. basically pressing the yellow should make the door be mesh closed rolling door open. right now if pressed when mesh and door are closed nothing happens"*.
- **Yellow** now sets the steel door **open** and the mesh **closed** from any state. Before, it only closed the mesh, so with both already shut nothing happened.
- **Green** (both open) and **red** (both closed) are unchanged.
- The 2-player message and world sync already carry both targets, so nothing changed there.
- `validate-mesh-doors.cjs` checks yellow from both shut: the door goes up, the mesh stays down and blocks. It does this on the switch directly and by aiming and pressing.
- Controls card updated. All 40 suites pass.
- Bumped TEST to `1.97.141` / `corn-souls-test-shell-v168`.

## TEST v1.97.140 — the door switch prompt just says "Interact" (2026-11-04)
- Owner (screenshot, with the action text struck out): *"remove the part i crossed out. the interact prompt and the different colors is enough for player to understand function"*.
- `#iprompt` is now just the west face button symbol (E on a keyboard) and **Interact**. The "· Close the mesh only" style action text and its styling are gone. Checked in the running game while aiming at the yellow button.
- `validate-mesh-doors.cjs` checks there's no action text. All 40 suites pass.
- Bumped TEST to `1.97.140` / `corn-souls-test-shell-v167`.

## TEST v1.97.139 — mesh doors flush at the wall, like the original (2026-11-04)
- Owner (screenshots: the energy center door, and one where the mesh stood out from the wall): *"also notice how original rolling door with mesh both are flush. new ones it has a huge gap it looks bad. make them more like the original"*.
- **Cause:** where the steel door's coil hood was on the inside face (11 of 14 doors), v1.97.137 stood the mesh 1.0 m off the wall to clear the hood, so it looked freestanding.
- **Now every mesh sits flush,** 0.36 m in from the wall line in its tracks. On those 11 doors the **hood goes up over the mesh's head box**, as on the energy center's original, where the coil sat above the mesh: centre at door height + 0.9 m, offset 0.42. It is capped 0.4 m under the building's envelope top. Checked in the game: every lifted hood clears its head box by 8 cm and stays well under its ceiling.
- **EXIT signs:** the old sign was one box textured on every face, so its ends showed a squashed "EXIT" (visible in the owner's second screenshot). Each sign is now a plain dark housing with one lettered face toward the room. Lighting still finds the lettered face for its red pool.
- Rendered two hood-inside doors (west-wall cook alley, shop east) with the steel door up and the mesh down: the mesh is flush in its tracks, with its head box and the coil on top.
- **Tests updated:**
  - `validate-mesh-doors.cjs`: flush at 0.36, an inside hood clears the head box and stays under the roof, an outside hood is unchanged.
  - `validate-exit-signs.cjs`: a lettered face looking into the room on a plain housing.
- Bumped TEST to `1.97.139` / `corn-souls-test-shell-v166`.

## TEST v1.97.138 — door switch buttons: bigger, reordered, press to act (2026-11-04)
- Owner: *"make the three buttons a little bigger on the rolling doors. green button on top(opens door and mesh), middle yellow button(mesh closed only), red button on bottom(both closed). dont pull up a toast to select simply do the action when the button is activated. maybe just show a Interact prompt with the west face button symbol"*.
- **Buttons:** 3 cm → **4.8 cm**, 14 cm apart on a larger station (0.46 x 0.22 m).
  - **Green on top:** open door + mesh.
  - **Yellow in the middle:** close the mesh only.
  - **Red at the bottom:** close both.
- **No menu:** `rollSwitchMenu` is gone. `rollButtonAim()` picks the button under the crosshair (within 7.5 cm of the line of sight, so you don't have to be pixel-exact). The button must be within 2.2 m of Squeeg, so it works in 3rd person too. Interact (X / E / ✋) runs `rollButtonPress()`, which does that button's action at once, with a click. No toast, except "no power" in an outage.
- **Interact prompt** (`#iprompt`, just under the crosshair) while a button is aimed at: the **west face button** symbol (a face-button diamond with the left one filled), "Interact" and what the button does, e.g. "· Close the mesh only". On a keyboard (not in controller mode) the symbol becomes an **E** key.
- Verified in the running game at the energy center's east door: aimed at each button and pressed through the real controller path. Green → door + mesh up, yellow → mesh down with the door still up, red → both down. No menu or toast appeared, and the prompt showed for each. Screenshots taken.
- `validate-mesh-doors.cjs` now also checks:
  - three buttons per switch in the owner's order and colours, at the new size;
  - aiming at each one picks it, and pressing does it with nothing to read;
  - looking away or standing out of reach falls through;
  - the outage line;
  - the prompt markup and that the menu is gone.
- Controls card updated.
- Bumped TEST to `1.97.138` / `corn-souls-test-shell-v165`.

## TEST v1.97.137 — a mesh door inside every roll-up, with a switch (2026-11-04)
- Owner: *"Do you remember the mesh door you made in the energy center"*, then *"Can we add a mesh door to all rolling doors. The mesh door should be on the interior. With an interactive switch next to the door with the option to open both close both or only close mesh."*
- **Mesh doors** (`meshDoorsBuild()`, run with the world after `exitSignsForEgress()`, once the building envelopes in `ENCL` exist). Each of the **14 roll-ups** gets a high-speed mesh screen like the energy center's original (removed in v1.97.119 when the steel doors were made uniform):
  - see-through gray wire (shared code-drawn grid texture), dark stiffeners and a centre seam;
  - aluminum side tracks and a head box it rolls up into.
- **Placement:** the mesh goes on the **inside** face. `rollInside()` checks which side of the wall is in a roofed envelope; for a door between two rooms it picks the smaller room's side. It sits 0.36 m in from the steel door, or 1.0 m when the coil hood is on that face, so it clears the hood.
- **The storage shed** has no envelope and no wall beside its door. It declares `inside: -1`, and its switch goes on the south wall by its man door (`swAt`).
- **Switches:** a push-button station (green / red / yellow) on the inside face beside each door, on the side away from any man door, at 1.35 m. Press X / E / ✋ there (`rollSwitchNear` → `rollSwitchMenu`) and pick:
  - **Open both (door + mesh)**
  - **Close both**
  - **Close the mesh only** (the steel door stays where it is)
- **Behaviour change:** roll-ups **no longer open on their own as you walk up**. They follow their switch (`rollDoorStep`):
  - steel up at 1.6/s, down at 0.8/s; the mesh at 2.5/s;
  - each blocks you while shut (the mesh has its own collision line);
  - **no power, no hoist:** in an outage the doors freeze and the switch says so.
  - Every building with a roll-up also has a man door into the same room (checked in the game), so you can always get in.
- **2 player:** a press is sent at once (`rd`, with a 1.5 s lock like the other world events), and the host's door states ride the world sync (`ws.rd`, two bits a door), so both players see the same doors.
- The controls card lists the switch.
- Verified in the running game:
  - all 14 doors' inside faces and switch spots;
  - one switch end to end: open both, mesh only (door up, mesh down and blocking), close both, and the outage refusal;
  - renders of the energy center's east door from inside (switch beside it, steel up, mesh down) and from outside (looking in through the mesh).
- New suite `test/validate-mesh-doors.cjs` (added to CI) runs the game's own builders on test buildings. It checks:
  - inside faces (including a hood on the inside face) and switch placement;
  - no walk-up opening;
  - all three modes, with their collision lines;
  - the outage behaviour;
  - net messages and the sync round trip;
  - the shed's declared side and switch spot;
  - the wiring.
- **Updated tests:**
  - `validate-doors.cjs`: the steel curtain is still the one design, and mesh screens come only from `meshDoorsBuild`.
  - `validate-power-outage.cjs`: doors freeze in an outage.
  - `validate-two-player.cjs`: sandbox hooks for the door states.
  - `validate-exit-signs` / `interior-dark` / `ranger`: the new init line.
- All 40 suites pass.
- Bumped TEST to `1.97.137` / `corn-souls-test-shell-v164`.

## TEST v1.97.136 — a lit EXIT sign inside every door to the outside (2026-11-04)
- Owner (photo: a lit EXIT sign over a man door, under its red egress strobe): *"make the personel doors that open to the outside like this. obviosly only from the inside"*.
- Every exterior man door already had an egress strobe on its inside face (`egressStrobe`). The new world-build pass `exitSignsForEgress()` (run after the grain pile, before `lightBuild()` so the signs get their battery-backed red glow) gives each strobe the lit EXIT sign and halo under it. The sign goes on that same inside face, centred on the door at 2.47 m, between the head and the strobe as in the photo. From outside the wall hides it.
- **21 exterior doors, one sign each.** Verified in the running game: door by door, the signs, door heights and anything else on the wall. Rendered the shop's east door from inside (strobe + EXIT, matching the photo) and from outside (nothing), plus the green FERM MCC double doors.
- **Fixed along the way:**
  - **Stray sign.** The shop's old hand-placed sign hung on blank wall at z 17.7; its door (and strobe) are at z -8. It's removed, and the door now has the standard sign.
  - **One standard sign.** The ferm-alley north door and west hall door had hand-placed signs (the hall one a smaller size). Both are replaced by the standard sign from the pass.
  - **FERM MCC double door.** Its inside face had a door-name plate reading "OUTSIDE" exactly where the sign goes. The EXIT sign replaces it (`['FERM MCC', null]`; `signFace` skips an empty label). The "FERM MCC" plate on the outside stays.
  - **Tall door.** One door (x 82, z -125.5) is 2.43 m tall. Its sign sits 0.21 m above the door, and its strobe moves up to stay above the sign.
  - **Duplicate strobe.** The door at (-76.3, 82.8) had two identical strobes. `egressStrobe` now makes only one per spot.
- New suite `test/validate-exit-signs.cjs` (added to CI) runs the game's own `egressStrobe` + `exitSignsForEgress` on four test doors. It checks:
  - signs are centred and on the inside face, facing into the room;
  - each sits above the door head and below the strobe;
  - a tall door lifts both the sign and its strobe;
  - a door with an existing sign gets no second one, and a repeat strobe is not added;
  - the stray shop sign is gone and the OUTSIDE plate is dropped.
- `validate-interior-dark.cjs` / `validate-ranger.cjs`: updated for the new init line. `validate-power-outage.cjs`: the source now has 3 `exitSignMat()` / `exitHalo(` uses (builder, lab door, the pass). `validate-west-wing.cjs`: the hall door's old small sign + halo are expected to be gone (replaced, not moved). All 39 suites pass.
- Bumped TEST to `1.97.136` / `corn-souls-test-shell-v163`.

## TEST v1.97.135 — 90% fewer grass tufts (2026-11-04)
- Owner: *"remove 90% of the grass tufts"*.
- `GRASS.density` 0.16 → **0.0165** tufts per m². Below 3 tufts per 4 m cell, `grassChunk` keeps only that fraction of cells (`keep = n / 3`), and each kept cell still gets a clump of 3. The grass stays clumpy instead of turning into lone blades. Previously the per-cell count could never go below 1, so a lower density alone couldn't get there.
- Measured over a 7 x 7 block of chunks with the game's own chunk code: **1,956 tufts vs 19,635 before (10.0%)**. In the running game, 279 tufts are around you on open grass.
- A density saved in the browser from before (`cs_grass` without `v: 2`, only ever set from the console) is ignored, so nobody keeps the old amount. New saves carry `v: 2`.
- `validate-grass.cjs` now builds chunks at the game's own default. It checks that the count is 7–13% of the old 0.16 over 49 chunks and that tufts come in threes.
- Bumped TEST to `1.97.135` / `corn-souls-test-shell-v162`.

## TEST v1.97.134 — one grain pile, as asked (2026-11-04)
- Owner: *"just needs the one pile in the spot i asked for. i nevewr asked for 2 piles"*.
- **Removed the second pile** (the "loader heap" across the track, added in v1.97.130 as a landing bank and reshaped in v1.97.133) and its code: the cut-face profile, `gpPchip`, the `GP_TRACK` lookup and the second heightfield. `GRAIN_PILES` is now the one plain heap. It is unchanged from v1.97.133: 4.8 m peak at x -224, repose sides, rounded uneven outline. It still sits where the jump has been since v1.97.130, just west of the box on the owner's map.
- **The jump, with the game's physics at 60 fps, on the peak line and 3 m either side:**
  - 31 mph doesn't make it.
  - 40 mph clears a hopper car by 1.7–2.1 m.
  - Flat out it goes 10.4–11 m up and 4.5–4.8 m over the cars.
- **Landing is now on flat grass past the track** (x -258 to -293), so it costs the Ranger health:
  - 40 mph: ~18 of 100.
  - 47 mph: ~23.
  - 54 mph: ~27.
  - 59 mph: ~32–34.
- Asked the owner whether landings should be softer.
- **Why not further east:** I tried moving the peak to x -220 and -216, toward the middle of the marked box. That made it worse. At 40 mph the Ranger only just clears, or doesn't, because the cars are further away when it comes down.
- `test/validate-grain-pile.cjs` now checks:
  - exactly one pile;
  - that it sits east of the track and well clear of it (the track found from the loop's own `LSAMP`);
  - flat grass across the track;
  - 40+ mph clears a hopper car by 1 m on all three lines;
  - 40+ mph lands well past the track;
  - no single jump does 40 or more damage.
- Bumped TEST to `1.97.134` / `corn-souls-test-shell-v161`.

## TEST v1.97.133 — the grain piles are just piles of grain now (2026-11-04)
- Owner: *"the grain pile by the train was just supposed to look like a normal pile of grain that happens to be able to be used as a ramp not a specific made ramp its too obvious."*
- **Why it looked made:** v1.97.130 drew each pile as straight wedges from a 2D profile, with flat sheer sides, a 16 m rectangular footprint and side walls. In other words, a ramp.
- **Now:** two ordinary piles of shelled corn, each **one heightfield on a 0.5 m grid**. The same numbers draw it and are its floor: a `WALK_SURF` entry with an `hf` sampler that `floorAt` reads. Walking, the Ranger and the cars ride exactly what you see. There are no walls; it's grain, so you can climb it.
  - **Takeoff heap (east):** a plain dumped pile, 4.8 m peak at x -224. Its sides are at grain's angle of repose all round (0.42–0.45). It has a short ridge, an uneven rounded outline and gentle lumps (kept fainter on the climb, so it stays a slope and not steps).
  - **Loader heap (west):** a broad oval ground pile, about 57 x 50 m. Its track side is the steep, scalloped cut a loader bucket leaves, with a slumped skirt, ~4.7 m off the track and following it. Behind the cut it slumps into a long low dome. That dome is where the jump comes down.
  - **Look:** kernel texture, vertex shading (sun-dried on top, dusty toe, patchy), and the rim tucked just under the grass.
- **Follows the real track:** `GP_TRACK(z)` reads the loop's own samples (`LSAMP`) instead of the straight-line estimate, which was up to 0.9 m off near z -295. The closest grain is 3.2 m from the track centreline (1.6 m clear of a car's side).
- **The jump still works,** with the game's physics at 60 fps, on the peak line *and* 3 m either side:
  - 31 mph doesn't make it.
  - 40 mph clears a hopper car by 1.7–2.1 m.
  - 40–54 mph lands on the loader heap with no damage.
  - 59 mph does 7–15 damage.
- `floorAt` supports heightfield surfaces (`s.hf`), and the roof map skips meshes flagged `userData.noRoof` (the piles), since their floor is already exact.
- `test/validate-grain-pile.cjs` was rewritten. It checks:
  - two heightfield floors and no walls, kept out of the roof map;
  - `GP_TRACK` matches the loop;
  - no grain within 1.5 m of a car;
  - every edge at the ground and an uneven outline (not a box);
  - takeoff slopes under 0.55;
  - the climb under the 0.45 launch limit on all three lines;
  - the jump table on all three lines.
- Verified in the game: rendered from the east, south, north, west and overhead.
- Bumped TEST to `1.97.133` / `corn-souls-test-shell-v160`.

## TEST v1.97.132 — every dead critter you pick up can be eaten (2026-11-04)
- Owner: *"some are killed but when picked up there is no eat option"* (frogs, pigeons, lizards and rats).
- **Cause:** two pickups competed for X:
  - The game's eating pickup (`deadNear`) only reached corpses within **2.2 m** of you, in any direction.
  - The launcher's older corn-cube carry (`cornInteract`, which wraps dead critters as carry items) reached **3.8 m** along where you look.
  - So a corpse lying 2.2–3.8 m away in front of you was grabbed by the corn carry: "Picked up dead rat — fire to throw", with no B-to-eat and no power. Reproduced in the game through the real X then B path. At 3 m ahead, before: corn carry, no eat. After: "Picked up the dead rat - ... B to eat it", eaten, and rat speed given. At 1 m it worked both before and after.
- **Fix (both sides):**
  - `deadNear` also reaches anything the corn carry could: within 3.8 m of your eyes, in front, within 1.25 m of your line of sight (or 1 m of it flat). The nearer, all-round 2.2 m catch still wins.
  - The launcher's corn carry now skips critters, so it only ever carries corn cubes and ears.
- New suite `test/validate-critter-eat.cjs` (added to CI) runs the game's own `deadNear` with a real camera. It checks:
  - corpses 2.5, 3.0 and 3.4 m ahead, and slightly off-line, are reachable;
  - one 1.8 m behind you is still reachable;
  - 3 m behind, 3 m off to the side and 4.5 m ahead are not;
  - held corpses are skipped;
  - the nearer corpse wins;
  - dead pigeons and pond frogs are covered;
  - the corn carry skips critters, and X tries the eating pickup first.
- `validate-traffic.cjs` asserted the old corn-carry grab, so it now checks whichever launcher it is given: on TEST the corn carry must leave critters alone, while on LIVE (run through `validate-live-promotion.cjs`, still pre-eating) it keeps the old grab-and-throw check. All 38 suites pass.
- Bumped TEST to `1.97.132` / `corn-souls-test-shell-v159`.

## TEST v1.97.131 — the "Cry & Dry" title screen (2026-11-04)
- Owner pasted a Gemini "Claude Prompt Blueprint" for a *CORN SOULS: CRY & DRY* title screen (Abyssal Harvest Fire: a PS1 cob bonfire in a dark silo, left-aligned gothic title and menu, PRESS ANY KEY then a flash into the menu, a tuner with 6 toggles and 5 sliders, silhouettes, embers, CRT), then: *"when your done with this. add it to test"*.
- Built first as a standalone page (sent to the owner), then **ported into the game's own splash** rather than bolted on beside it: the blueprint's Tailwind / three r128 / Tone.js are not loaded. The scene uses the game's bundled three (r170; light intensities scaled for physical units), the CSS is hand-written and scoped under `#splash`, and the existing WebAudio title music (drone, bells, crackle) and the boom stay.
- **Scene** (`title3D(T)` inside the splash script): procedural canvas textures only, rendered at a low internal resolution and scaled up with `image-rendering: pixelated` (the PS1 look). A silo interior, ash bed, cob-pile bonfire with three flame rings that flicker, soul embers rising, the Daddy Cob Legs and pump silhouettes, and a camera that drifts with the mouse. It waits for `window.THREE`, and `stop()` cancels its frame loop, removes its listeners, disposes geometry, materials and textures, and forces the WebGL context loss 1.3 s after the splash fades.
- **Menu**: themed names on the **same actions**: NEW HARVEST = 1 player, KINDLE A BONFIRE = 2P host, JOIN A BONFIRE = 2P join (the code box is unchanged), RITES & CONTROLS = the controls card. Keyboard, mouse, touch and controller navigation are unchanged, and the launcher anchors (`spVer`, `musicPlay`) still match.
- **PRESS ANY KEY** (TAP TO BEGIN on touch) leads to a radial ember flash, a short screen shake, and the fire flaring up as the menu slides in.
- **Tuner** (top right, folded by default): 3D PS1 Bonfire, Silhouettes, Soul Embers, PS1 Pixelation, CRT Scanlines and Audio (mutes the title music); Flame Intensity, Flame Color Hue (also tints the accent text and toggles), Cobfire Size, Pos X and Pos Z. It is saved per device in `localStorage.cs_title` (guarded), with RESTORE DEFAULTS. Keys typed or taps made in the tuner never start the game.
- **Layout**: on landscape the title and menu sit on the left third with a dark lean; on portrait (aspect under 4:5) the fire sits on top and the menu below. It respects `prefers-reduced-motion`. The fonts are Cinzel and Cormorant Garamond from Google Fonts, falling back to Georgia offline.
- **Two collisions caught in testing**:
  - The game's global `.tb` (touch buttons: `display:none`, fixed) hid the tuner body, so it is now `.tbd`.
  - The global `.reset` restyled the reset button, so it is now `.rst`.
  - A mid-line `//` comment in `go()` briefly swallowed the body-class removal; it is fixed and now covered by a test.
- New suite `test/validate-title.cjs` (added to CI) checks:
  - the menu's six actions and the themed order;
  - the 6 toggles and 5 sliders with defaults;
  - guarded storage;
  - the tuner guards on key, pointerdown and click;
  - 3D start, flare and teardown;
  - that every statement in `go()`'s line is live;
  - that no splash class has a global game style.
- Verified headless in the game at 1280x720 and 390x844: title, then menu with the flash, a hue change to 200, then the tuner opened with all 11 controls, then RESTORE DEFAULTS, then Enter. The splash leaves and the game is walking.
- Bumped TEST to `1.97.131` / `corn-souls-test-shell-v158`.

## TEST v1.97.130 — a grain pile to jump the Ranger over the train (2026-11-04)
- Owner (overhead screenshot with a box drawn north of the north corn field's west end, beside the rail loop): *"add a grain pile here. i want to be able to ramp the ranger on it to jump over the train"*.
- **Where:** the box maps to x -210..-165, z -260..-355 in world space (my own top-down render with a 100 m grid, matched to the owner's view, which has north to the right). The rail loop runs north-south there along x -240, bending west north of z -296 (x ~ -243 at z -305, probed in the running game; a parked train sits on exactly this stretch). Nothing else tall in the area.
- **Takeoff pile** (`GRAIN PILE JUMP`, `GRAIN_PILES[0]`, x -232..-213, z -313..-297): you come at it from the open grass to the east, driving west; corn rises at grain's natural slope (0.42, 23 degrees, under the Ranger's 0.45 launch limit) to a sharp 4.6 m crest 19 m from the track (no flat top: on a flat top the Ranger's climb would level off before the lip), then drops on the track side.
- **Landing spill** (`GRAIN_PILES[1]`, x -311..-249, z -314..-296): the far side of the track, a 4.5 m bank 6 m past it, nearly flat for 14 m, then falling west for 45 m - shaped against the jump arcs (I searched six profiles with the game's own `vehVertical`) so a 40-54 mph jump comes down on a slope instead of flat ground.
- **The jump, with the game's own physics at 60 fps** (driving west along z -305): 31 mph does not make it (4.0 m over the track, cars are 5.1); 40 mph clears by 2.0 m and lands unhurt; 47 mph by 3.2 m, 54 mph by 4.1 m (both unhurt); flat out (59 mph) by 4.5 m, up to 10.6 m, landing just past the spill for 10 damage. Coming up short (31-36 mph) slams into the spill's face.
- Built like the dirt hills: each slope is a `WALK_SURF` ramp along x (so walking, the Ranger and the cars all ride it), drawn in a code-painted corn kernel texture (`grainTex`). No side walls (the slopes start at the ground, like the dirt hills). Built with the world (`buildGrainPiles()` after `buildDirtHills()`), and over 2 m it is also in the roof map. Grass tufts stay off it (it is not tagged as grass ground).
- New suite `test/validate-grain-pile.cjs` (added to CI): builds the game's own piles and drives the game's own `vehVertical` over them at 31/40/47/54/59 mph: launch off the crest, clearance over a hopper car, landing spot and damage; plus the slope limit, clearance from a car on the track at both ends of each pile, the floor heights and the build wiring. Checked in the running game: screenshots from the approach (the pile in front of the parked train) and from the crest (looking over the train's roofs at the landing bank).

## TEST v1.97.129 — the trees are the old code-painted spruce again (2026-11-04)
- Owner: *"ok i like the grass but i hate the trees. put the trees back to the old trees"*.
- **Reverted the card renderer.** The whole `PSX TREE SPRITES` block is gone: `TREE_SPR`, `treeAtlas`, `treeMesh`, `treeSpriteSetup`, `updateTreeSprites`, `treeView`, `TREE_SINK`, the `TREE_STANDS` list, the extra frame-loop tick and the `P3.spriteTrees`/`P3.treeInfo` getters. Nothing loads `assets/textures/trees/*-atlas.png` any more.
- **The old trees are back**: every placed tree goes through `billboard('tree', x, z, s)` - the code-painted 5.6 x 9.0 m spruce, one instanced mesh for all of them, turning to face the camera, unchanged from before v1.97.126.
- **What stays from the v1.97.127 work** (that was your separate ask): the layout is still seeded (`TREE_SEED = 20261104`), so the trees are in the **same 56 spots every session**, and still placed off a blocked-ground test that keeps them out of the north corn field, the pivot circle, the plant and every road inside it, the entrance yard, the weighbridge exit road, the highway and the dirt tracks (the rail spur sits inside the plant block). The species stands went with the pack - with one spruce there is nothing to group.
- **The pack is parked, not deleted**: the ten atlases + manifest stay in `assets/textures/trees/`, and the registry entry is now `status: "approved"` (approved, unused) with the reason in its evidence field, so the provenance of the releases that did use it (v1.97.126-128) is intact and re-enabling it is a renderer change and nothing else. `CREDITS.md` and `assets/textures/README.md` say the same.
- Grass is untouched (v1.97.128 stands as shipped).
- Tests: `validate-trees.cjs` was rewritten for the revert - the billboard system and the 5.6 x 9.0 m spruce are there, every placed tree calls `billboard('tree', ...)`, and the card renderer plus its atlas URL are asserted **absent**; the placement checks stay (56 trees from the fixed seed, byte-identical on a second run, free ground at every tree, and the corn field / pivot / plant / grain-yard road / highway / rail spur all blocked); and the parked pack is still checked on disk (ten 256 x 128 atlases and a ten-species manifest) with the registry entry marked approved and the reason written down.
- Verified locally and in a clean clone: 10 repo-root suites + 25 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.129` / `corn-souls-test-shell-v156`.


## TEST v1.97.128 — PSX grass tufts scattered over the grass and nowhere else (2026-11-04)
- Owner dropped `psx-grass-cline-pack` (a brief plus a 128 x 64 atlas of six 32 px tufts and a manifest) and asked for it *"sporadically in grassy areas never on dirt or concrete"*.
- **Assets**: the atlas + `grass-manifest.json` (+ the brief itself) in `assets/textures/grass/`, registered as `first-party-psx-grass-tufts`, credited and listed in `assets/textures/README.md`.
- **"Never on dirt or concrete" is enforced by the ground itself**: `groundMat()` and `padMat()` now tag their materials with `userData.ground = 'grass' | 'dirt' | 'dirtroad' | 'asphalt' | 'pad'`, and `grassProbe()` casts down from 6 m and accepts a point **only** when the first thing it hits is the grass layer. Dirt, asphalt, concrete pads, building floors, the corn canopy strips and the pivot circle all come back as something else, so they are excluded by construction rather than by a list of rectangles that could drift.
- **Rendering** (`GRASS`): crossed-quad cutout cards (the corn clump's trick, so a tuft reads from any angle with no per-frame billboarding), 0.42 m tall sunk by the manifest anchor (`2 px of 32`), `alphaTest 0.5`, depth written, no blending, `DoubleSide`, nearest sampling, no mipmaps, guarded sRGB tag, no shadow casting, `noHit`. Six **shared** materials (one per atlas frame) for the whole world, tint per instance through `instanceColor`, variant chosen by which frame's mesh the instance lives in.
- **Streaming**: 64 m chunks in a 3 x 3 ring round the camera, one new chunk built per frame (nearest first), chunks behind released, each shown only within the draw distance. Building a chunk probes a **4 m grid** (256 raycasts, not one per tuft) against a per-chunk prefiltered solid list, then scatters `density` tufts per square metre inside the cells that passed, with a clump mask so bare ground stays bare.
- **Seeded**: each chunk seeds from its own coordinates (`treeRng((cx * 73856093) ^ (cz * 19349663) ^ 0x9e3779b9)`), so the grass is identical every session, like the trees.
- **Settings**: `P3.grass` reports `{ on, density, dist, chunks, instances, visible, drawCalls }` and `P3.setGrass({ on, density, dist })` sets them (density clamped 0-2 tufts/m2, distance 0-300 m), remembered per device in `localStorage cs_grass`. Defaults: 0.16 tufts/m2, 96 m.
- Tests: new `test/validate-grass.cjs` (11th `test/` suite, wired into CI): the atlas is a 128 x 64 PNG with six non-overlapping 32 x 32 frames inside it and the (16, 30) anchor; the card/material/culling wiring in the source; a behavioural run of `grassProbe` (grass accepted, dirt / asphalt / gravel / pad / untagged / nothing all refused); a behavioural run of `grassChunk` (tufts appear, sparsely, at most one mesh per frame, identical on a second run, and **none at all** when the probe never finds grass); a behavioural run of `updateGrass` (a 3 x 3 ring settles at nine chunks, chunks behind are released, a zero distance hides everything); and the clamps plus the persisted settings and the registry/credit entries.
- Profiling: building a chunk costs 256 raycasts against the chunk's own short list; the steady-state cost is one draw call per (visible chunk, frame) - at most 9 chunks x 6 frames, and only for chunks inside 96 m. **The frame-time comparison (grass off vs on) still has to be measured in the running game** - I have no browser here; `P3.grass` and the `fps / dc / tri / ms` readout give you the numbers to compare.
- Verified locally and in a clean clone: 10 repo-root suites + 25 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.128` / `corn-souls-test-shell-v155`.


## TEST v1.97.127 — all 56 trees on the pack, single-species stands, seeded fixed spots clear of corn, roads and rail (2026-11-04)
- Owner: *"use them all but keep the similar types together in different areas. they should always be in the same spot every game none in the cornfields or on roads or railroads."*
- **All 56.** `TREE_SPRITE_COUNT` is 999 now, so every scenery tree is a PSX card (the code-painted spruce stays in the file behind that one number, so an A/B is still a one-line change).
- **The same spots every session.** Tree placement used `Math.random()` in three places, so the windbreak moved every reload. It now runs off a fixed-seed **mulberry32** (`TREE_SEED = 20261104`): sample a pool of clear ground round the plant, keep it in seeded order, and the layout is identical on every device and every load. Measured: 56 trees at radius 207-416 m, x -347..341, z -263..227.
- **Similar types together in different areas.** `TREE_STANDS` is the ten species in order. The free ground is sampled, sorted by the angle round the plant, then **split at the real gaps** (the plant blocks most of the ring, so the clear ground comes in arcs) before the species are handed out as **contiguous runs** - each species gets a stand of five to six trees in one place, and no stand straddles two arcs (that was the first bug: the flowering cherry ended up 253 m wide because its run crossed the wrap). Species counts after the change: 6, 5, 5, 6, 5, 5, 6, 5, 5, 8.
- **Nothing in the corn, on a road, the highway or the railroad** (`treeBlocked`, one predicate): the plant and every road inside it plus the tank farm, the entrance yard and scale lane, the weighbridge exit road, **the north corn field** (`inCField` with a 12 m margin), **the pivot circle** (`O.pivot` radius + 12 m), **the highway** (within 22 m of `z = 434 - 0.653x`), and **the dirt tracks** (within half a width + 6 m of any `DIRT_ROADS` polyline). The railroad's plant-side spur sits inside the plant block and the main loop is far east, both already excluded.
- Colliders are still one round `0.45 x scale` per tree, now taken from the placed spot.
- Tests: `validate-trees.cjs` was rewritten around the placement - it lifts `treeRng`, `treeBlocked` and `treePlacement` out of the game with the real `WXR`/`NROAD`/`SH_DX`/`HWY`/`DIRT_ROADS`/`CFIELD`/`inCField` and the pivot stub, runs the placement **twice** and asserts the two are byte-identical (determinism), 56 trees, all ten species with five or more each, every placed tree on free ground, every species clustered within 150 m of its own centroid, and eight known-blocked probes (corn field, pivot, plant, grain-yard road, highway, rail spur) plus one known-free one. The card, atlas, manifest and registry checks stay.
- Verified locally and in a clean clone: 10 repo-root suites + 24 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.127` / `corn-souls-test-shell-v154`.


## TEST v1.97.126 — PSX tree sprites from the owner's Kernel Art pack (8 of 56 trees, proof of concept) (2026-11-04)
- Owner dropped `Kernel Art/2D`; asked for the trees first, on a handful, as a proof of concept before converting all 56.
- **The pack** (`Kernel Art/2D/tree_sprites_ten_8view`): 10 species x 8 views at 45 degrees, 64 px RGBA frames, ground anchor **(32, 62)** from the top-left, angle order front / front-right / right / back-right / back / back-left / left / front-left, nearest-neighbour, "pick the nearest 45-degree frame to the viewing angle", plus a `manifest.json` of files and atlas rects. Only the **10 atlases** (256 x 128 = 4 x 2 tiles) and the manifest are shipped, in `assets/textures/trees/` (the 80 individual frames stay in the owner's drop folder).
- **The game side** (`PSX TREE SPRITES`, after `updateBillboards`): `TREE_SPRITE_COUNT = 8` of the 56 scenery trees are drawn from the pack - the eight **nearest the plant**, so they are the easiest ones to walk up to - cycling through the seven species that suit the plains (broadleaf, leaning pine, silver birch, red maple, weeping willow, dead snag, cypress; the palm, cherry and acacia stay unused). Every other tree still goes through the old code-painted billboard, so the two can be compared side by side.
- Each tree is an **8 m square camera-facing card**, bottom-anchored with the pack's own sink (`TREE_SINK = 0.25`, i.e. the anchor's 2 px of 64 on an 8 m card), `alphaTest` cut-out, `NearestFilter` up and down with no mipmaps (the PSX look the nibbler and paintball sprites already have), tagged sRGB through the guarded form, and **never casting a shadow** (a flat card's shadow reads as a smear). One `(species, view)` pair is one instanced mesh, created the first time a tree needs it - so converting all 56 later costs at most species x 8 draw calls and nothing up front.
- `treeView(a)` is the pack's rule in one line: `round(a / 45 degrees) & 7`, wrapping both ways. `updateTreeSprites()` runs on the same tick as the billboards and only when the camera has moved 5 cm or an atlas landed, so the no-garbage rule from v1.97.92 holds.
- `P3.spriteTrees` lists the converted trees (species, x, z, scale) and `P3.treeInfo` reports the count and card size, so the owner can walk straight to them; the console says how many converted on load.
- Assets: registered as `first-party-psx-tree-sprites` in `assets/registry.json`, credited in `CREDITS.md` and listed in `assets/textures/README.md` (the same pass the nibbler and paintball packs got).
- Tests: new `test/validate-trees.cjs` (10th `test/` suite, wired into CI) checks the pack on disk (all 10 atlases are PNG and 256 x 128), the manifest (64 px frames, anchor 32,62, the angle convention, eight ordered views per species, one-tile rects, and that the atlases shipped are exactly the species described), the game side (loads from the repo, nearest + no mipmaps, guarded sRGB, one 4 x 2 window per view with row 0 on the top row of the file, bottom-anchored card, no shadow), runs the game's own `treeView` at every eighth turn plus the 22.5-degree boundaries and a negative angle, and checks the registry entry, its file list and the credit line.
- Verified locally and in a clean clone: 10 repo-root suites + 24 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.126` / `corn-souls-test-shell-v153`.


## TEST v1.97.125 — lizards spawn on walls and crawl along them instead of spawning on floors (2026-11-04)
- Owner: *"lizards should spawn on walls instead of floors"*.
- **How they spawn now** (`crWallSpot`, next to `crFloor`): a horizontal probe from a random spot in the critter area (cook / evap alley) at a random height 0.55–3.35 m looks up to 7 m for a face, and the lizard is placed **7 cm clear of it, facing out**, in a new `climb` state. A face counts only if its normal is horizontal (`|n.y| < 0.45`), so a floor, a roof or a dome is rejected - and a miss simply tries again next frame, using the existing one-probe-per-frame budget. After 8 frames without a wall it falls back to the old floor spawn, so a lizard can never fail to appear.
- **They crawl** (`crWallStep`): along the face at 0.5 m/s with a slow up/down wander, re-probing every frame to stay hugging it; where the face ends (top, bottom, or the end of the wall) it **turns round** rather than crawling into the air. The sprite gets the same scuttle wiggle a running lizard has.
- **They let go when you get close** (within 4 m): it drops to the floor at its own x/z and runs away from you (`crLeg(c, true)`), which is the same flee behaviour as before - and if there is nowhere to land it holds on a moment longer instead of falling through the world.
- **Shooting one off a wall drops the corpse** to the floor first (`hitCritter`), so the body lands somewhere you can pick it up rather than hanging in mid-air.
- **2 player:** `critAlive` counts `climb` as alive, so the guest mirrors a clinging lizard as a living one instead of playing the knocked-over rotation and the puff of bits, and its sprite wiggles the same way. The host drives the position, so the guest sees the wall, the crawl and the drop for free.
- Rats are untouched - they still spawn and run on the floor.
- Tests: `validate-frame-stability.cjs` (which owns the critter spawn/run probes) gains a lizard section: the wall-first spawn with its 8-frame fallback, the `climb` state, the alive check for the mirror, the drop-on-hit line, a behavioural run of `crWallSpot` (a wall face gives a spot 7 cm clear of it with the normal pointing out; a floor is rejected), and a behavioural run of `crWallStep` (with no face ahead, the lizard turns round).
- Verified locally and in a clean clone: 10 repo-root suites + 23 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.125` / `corn-souls-test-shell-v152`.


## TEST v1.97.124 — sprites darken indoors, roof map capped at 1024 cells / 1 m, its pass out of the fps readout (2026-11-04)
- Owner: *"do all 3"* (the items I had listed as risks rather than defects in v1.97.123).
- **1. Sprites take the indoor darkness.** v1.97.99 patched Lambert / Phong / Standard / Basic, so a **sprite was left out**: a dead critter carried into the dark shop, a pigeon that flew in, the scarecrows, the nibblers, the vulture - all full bright in a pitch-dark room. `csPatchSprite` now patches `SpriteMaterial` the same way: `sprite_vert` sets `mvPosition` from the model matrix (already view space), so `csVP` comes free in the vertex shader, and the existing `CS_BASIC` multiplier is injected right after `outgoingLight = diffuseColor.rgb;` (the sprite fragment shader writes its colour through `<opaque_fragment>`, so that is the anchor, not the `gl_FragColor` line the basic shader uses). Additive sprites - flames, steam, exit halos - are exempt through `csBasicOK`, exactly like additive `MeshBasicMaterial`, and the cache key keeps patched and unpatched sprites off one program.
- **2. The roof map is capped.** It was up to 2048 cells an axis at no coarser than 0.5 m: one far-flung roof inflated it to **4.2 million cells** - a 17 MB `Float32Array` kept for the whole session, plus a 17 MB render target and a 17 MB read buffer allocated **twice** (first walk, then 12 s later for late models), each with a full `readRenderTargetPixels` GPU stall. It is now **1024 cells an axis with no cell finer than 1 m** (`maxTex` 1024, `cell = max(1.0, W/1024, D/1024)`), which caps the worst case at ~4 MB and a typical plant-sized box at ~0.8 MB. The grid only answers "which roof am I standing on", so 1 m quantisation is not visible in play.
- **3. The roof map no longer pollutes the fps readout.** It renders the scene with an override material into its own target; it already saved and restored `overrideMaterial`, background, fog, both shadow flags and the render target, but not `renderer.info`. Those counters are restored in the `finally` now, so the pass can never show up as world geometry in `dc`/`tri` even if the frame's reset moves.
- Tests: `validate-interior-dark.cjs` runs the real patch against `T.ShaderLib.sprite` - a sprite must gain `csLight(csVP, vec3(0.0), csIrr)` and `csVP = mvPosition.xyz;`, an additive sprite must not, and the two must never share a program; `validate-critter-powers.cjs` pins the 1024-cell cap, the 1 m cell floor and the `renderer.info` restore.
- Verified locally and in a clean clone: 10 repo-root suites + 23 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.124` / `corn-souls-test-shell-v151`.


## TEST v1.97.123 — four defects from the 1.97.122 audit (guard label, sRGB tag, silent roof map, network car indices) (2026-11-04)
- Owner: *"search for bugs"*. Audited the current build (14,616 lines) for the classes the suites cannot see and found four real defects, plus three risks that are listed at the end rather than changed blind.
- **1. Two different sub-updates shared one guard label.** `stepSafe('power', …)` wrapped both `powerUpdate(dt)` and `applyPowerOutage()`, so `FAILS['power']` mixed them: the fps badge read `!power×37` with no way to tell which was dying, and the 64× re-log named the wrong one. They are `powerSim` and `powerApply` now. (Every other label was already unique - I checked all of them.)
- **2. One sRGB tag skipped the guard.** The vulture's chalk outline was `tex.colorSpace = T.SRGBColorSpace;` with no `if (T.SRGBColorSpace)` and no `srgbTex()` - the only such site in the file, and invisible to the rule test because the property name is still present. It goes through `srgbTex()` now.
- **3. A failed roof map was swallowed.** The first build logs (`console.warn('roof map', e)`), but the retry 12 s later was `try { roofMapBuild(); } catch (e) {}` - so on a device where the readback or the allocation fails, **roof collision and the lizard climb silently never work** and nothing says so. The retry now counts into `PERF.errs`, sets `PERF.err = 'roofmap'` with the message, and logs once.
- **4. Car indices from the network were used unchecked.** `O.cars[m.car[0]]` (their ride message), `O.cars[m.i]` (the car position message) and `O.cars[remote.i]` (the stereo) indexed straight into the array. A malformed or cross-version message threw on `undefined` - caught by `stepSafe('net', …)`, so it cost a frame of net updates rather than crashing, but it threw again on the very next message, i.e. a permanent 2P failure behind a misleading `!net` badge. All three are bounds-checked now (`if (!c) R.car = null;` / `if (c) { … }`), and the stereo falls back to `0` (off) instead of a bad index.
- Tests: `validate-performance.cjs` now **fails on any duplicate `stepSafe` label** (that is the check that would have caught #1) and pins the two power labels; `validate-ground-layers.cjs` rejects any `colorSpace = T.SRGBColorSpace` that is not inside `if (T.SRGBColorSpace)` or `srgbTex(` (#2); `validate-critter-powers.cjs` pins the roof-map failure report (#3); `validate-two-player.cjs` pins all three car-index guards (#4). Two existing assertions that pinned the old `power` label were updated in place.
- Checked and deliberately **not** changed (reported to the owner as risks, not defects): `ROOFMAP.h` is a `Float32Array` of up to 2048×2048 (~17 MB, plus ~33 MB transient twice per session with a full GPU readback stall) - cheapening the cell to 1 m would cap it at ~4 MB but that is a feel change, not a fix; `SpriteMaterial` is not covered by the v1.97.99 lighting patch, so a carried dead critter glows in a dark room; and `roofMapBuild` does not restore `renderer.info` (harmless today only because the frame resets it before the world render).
- Verified locally and in a clean clone: 10 repo-root suites + 23 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.123` / `corn-souls-test-shell-v150`.


## TEST v1.97.122 — nibbler rear views (2026-11-04)
- Owner sent `nibbler-rear-views.zip`: `nibbler-back.png`, `nibbler-rear-quarter-left.png`, `nibbler-rear-quarter-right.png` (40 px), added to `assets/textures/nibbler/` and the `first-party-nibbler-sprites` registry entry.
- `nibView`: a nibbler turned toward you (within ~100 degrees of the line to the camera) shows its face as before; turned away it shows its back (more than ~150 degrees off) or a rear quarter in between: the left one when you are behind it on its left, the right one on its right. The rear views are not mirrored; a dead one always shows its face. All 23 pictures load up front (texture numbers 21-23 for the rear views).
- `validate-nibblers.cjs` checks the view for each angle, the no-mirroring and the files. Checked headless: nibblers walking away into the corn show their backs.

## TEST v1.97.121 — nibblers burst out of dead cob stalkers (the owner's 20-face sprites) (2026-11-04)
- Owner (with `nibbler-sprites.zip`): *"add these. these spawn from dead cob stalkers. theres 20 different faces to animate them and make them work as 2d sprites that always face you"*.
- **Assets:** the 20 PNGs (40 px) in `assets/textures/nibbler/`, registered as `first-party-nibbler-sprites`, credited, listed in `assets/textures/README.md`. All 20 load when the creatures do (crisp nearest pixels), so a face never blanks when it first changes.
- **Nibblers** (a third kind in the corn creature system, `NIBBLERS` before the pigeon coo): five burst out of every cob stalker that dies, flung in every direction. Each is a `T.Sprite` (always faces you) standing on its feet, 0.62 m tall, with its own material so it has its own face. They hunt whoever is within 18 m (anywhere within a 45 m leash round where they came out, not tied to the field), at 4.4 m/s, slower than your walk, so you can outrun them; a nibble is half a stalker bite (the third whole bite still kills, "nibbled to death" has its own death message); two paint hits (the first sends one running for a moment), a tool swing or the Ranger kill one; a dead one's friends nearby go sad, then hunt harder; corn ears lure them too. They do not hold up Daddy Cob Legs, and burrow away after 3 minutes. Squeakier versions of the stalker sounds.
- **Faces** (`nibFace`): shocked as it bursts out, then crying for its stalker or a wicked grin; happy / smug / sneaky while it potters about, asleep after sitting still, confused when it loses you; hunting: a wicked grin from afar, angry closer, enraged right on you, foaming as it bites and gleeful after; taking damage when hit, then hurt or dazed, exhausted when wounded, terrified when it runs off, sad when a friend dies; unconscious, then dead (it keels over and fades). **Animation** (`nibPose`): hops with a squash on each landing, wobbles as it runs, breathes when still, flips left/right to face the way it goes, shakes when hit, darker at night (sprites are unlit).
- **2 player:** the host runs them in the creature snapshot (kind 2); the guest mirrors them with the same faces and animation, and its hits count on the host.
- New suite `test/validate-nibblers.cjs` (added to CI): the game's own creature code: no model fetched for them, five per dead stalker, sprites on their feet, the burst, Daddy not held up, hunting and half-bite nibbles, outrunnable, two hits with a flee, mourning friends, clean-up, every face rule, burrowing at 3 minutes, the snapshot kind, all 20 files and the death message. Checked headless: a stalker killed in front of the camera, its nibblers chased and nibbled.

## TEST v1.97.120 — paint splats 5% smaller; the side splatter for shots that hit at an angle (2026-11-04)
- Owner (the decal sheet with shape 1 marked, then shapes 2-5 marked): *"make the splatter 5% smaller and use the side splatter for shots that hit at an angle and the other 4 styles for other shots"*.
- Splat quads 0.7125 m (were 0.75). A hit more than ~53 degrees off square (`|cos| < SPLAT_GLANCE = 0.6` between the ball's path and the surface) uses shape 1, the side splatter, turned so its trailing spray runs on along the ball's path across the surface and stretched along it the shallower the hit (up to 1.5x); every other hit uses one of shapes 2-5 at a random turn (`decalMat(c, shape)`).
- `validate-gun-magazine.cjs` checks the size, the shape choice and, with the game's own sums on three surfaces, that the spray points along the path. Checked headless: two shots along the process building wall left side splatters trailing the way the balls flew.

## TEST v1.97.119 — one roll-up door design everywhere; no door with a crack round it (2026-11-04)
- Owner (screenshot of the ferm alley's north roll-up and exit door with slivers of the outside showing round them): *"fix all the doors that have cracks where you can see through"*, then *"also lets make all rolling door design uniform only size can differ"*.
- **Roll-up doors** (`ROLL-UP DOORS`, `rollUpDoor(cx, cz, alongX, w, h, { side, y0 })` before `manDoor`): one design for all 14 in the plant: gray coiling steel slats with a dark bottom bar; the curtain is 8 cm wider than the opening and runs 4 cm into a steel guide on each side (guides 0.42 m deep, their inner faces 4 cm inside the opening) and up into a head strip that stands just below the lintel, so nothing shows round it; a round coil hood on one face. It opens with the shared animation as before. Every roll-up now goes through it: the process building and maintenance shop (their `rollDoor` helper keeps its bollards; the two mesh high-speed curtains are now the standard door), the storage shed (also fixes its curtain dropping to the yard level while it opened), the DDG building, the energy center north, west bump-out and south doors (`ecRoll`) and its east door (was a mesh screen with a rolled-up metal door above), and the turbine room's west door.
- **Swing doors:** every leaf was a few centimetres narrower and shorter than its opening. Now each fills it: a single leaf runs past the latch edge into the wall and up into the frame, a pair meets in the middle. `manDoor` (0.99 x 2.15 in 0.95 x 2.13), the process building and shop doors, DDG, the energy center green man door, the N Energy MCC double door, the turbine room doors, and the scale house inside doors and glass entrance pair.
- New suite `test/validate-doors.cjs` (added to CI): the game's own `rollUpDoor` at three sizes (curtain wider than the opening, guides over its edges, head strip under the lintel, animation position, blocking), only one place makes roll-ups, no mesh variants left, and each swing door's leaf size. `validate-west-wing.cjs` runs the real `rollUpDoor`. Checked with screenshots: the ferm alley north door from the owner's spot and two other roll-ups.

## TEST v1.97.118 — the owner's PSX paintball decals for splats; paint colours match in flight and in the magazine (2026-11-04)
- Owner (with `psx-paintball-decals.zip`): *"can we use these for paintball splatter and change the paintball colors while shot and while in magazine to match"*.
- **Decals:** the 20 PNGs (blue, lime, orange, pink; five shapes each, 32 px) are in `assets/textures/paintball/` (registered as `first-party-psx-paintball-decals`, credited, `assets/textures/README.md`). A hit now lays one of the five decals for the ball's colour (`decalMat` / `decalGeo`, `PAINTBALL DECALS` before `splatAt`): a 0.75 m quad, crisp nearest-neighbour pixels for the PS1 look, cut out on alpha (no sorting), lit like the paint it replaces, polygon offset so it never flickers on the wall; one material per colour and shape, loaded the first time it is used. Any colour outside the four still gets the old cut-out splat.
- **Colours:** `PAINT` is now the decals' own colours (blue 0x2389bc, lime 0xa6d227, orange 0xf57c1a, pink 0xe54189), so the balls in the magazine window, the ball in flight, the splat and a painted critter all match. A shot is no longer a random colour: it is the colour of the round leaving the magazine (the one nearest the gun), so a full magazine fires blue, lime, orange, pink, blue, lime, in the order you see them.
- `validate-gun-magazine.cjs` extended (palette, shot colour follows the magazine order, decal wiring, all 20 files present). Checked headless: four shots at the process building's south wall left blue, lime, orange and pink decals, with blue and lime still showing in the magazine.

## TEST v1.97.117 — ribbed metal siding on every building's outside walls (2026-11-04)
- Owner (screenshot of the process building's ribbed wall): *"use this texture for all exterior building walls"*.
- **Siding** (`METAL SIDING` next to `wallSegs`): the process building's sheeting texture (faint gray vertical ribs every foot) is now shared (`ribTexture`), and `ribWall(m)` puts it on a wall material, keeping that building's colour as a tint. Applied to the gray metal buildings from `building()` (energy center, MCC rooms, yeast cooler ...), the evap tower enclosure, the scale house, the storage shed, the DDG building and the receiving building (its own copy of the yellow; `mat()` colours are shared). The process building and maintenance shop already had it. Once the plant is built, `ribAll()` sets each box wall's texture coordinates so there is one rib per foot along every face, short wall or long.
- **Fix on the way:** `mergeStatic` threw texture coordinates away when it folded the see-through wall meshes together, which flattened any textured wall to one colour; it now keeps them for textured materials.
- New suite `test/validate-siding.cjs` (added to CI): the game's own `ribGeo` on test walls (100 ribs on a 100 ft wall, 10 on a 10 ft one, untouched other materials, idempotent), each building's wall material, and the merge keeping UVs. `validate-interior-dark.cjs` / `validate-ranger.cjs` (init order line) and `validate-west-wing.cjs` (a stand-in for `ribWall`) updated. Checked with a screenshot of each building's outside wall.

## TEST v1.97.116 — the Ranger's wheels are real tyres with rims (2026-11-04)
- Owner (screenshot of the Ranger's wheels at night): *"fix wheels"*.
- **Cause:** the model's wheel (`wheel_L_mesh` / `wheel_R_mesh`) is a 10-sided block with the tread texture wrapped onto its sides as well, so each wheel read as a box of tread lugs with no rim.
- **Fix** (`RANGER TYRES`, `rangerTireOn` from `rangerSkin`): each wheel node gets a 24-sided tyre the same size (r 0.33, 0.22 wide, axle along x, so it spins, steers and rides the springs exactly as before) with knobby chevron tread round the outside and plain dark rubber sidewall discs (one material per mesh, as the lighting and damage code expect), and on both faces a grey steel rim with a dark hub and five lug nuts. The model's own wheel mesh is kept but hidden. One geometry and set of materials shared by every Ranger (yours, the other player's); a burnt-out Ranger keeps them. Checked with a close-up screenshot.
- `validate-ranger.cjs` checks the new tyres.

## TEST v1.97.115 — office door frames no longer flicker (2026-11-04)
- Owner (screenshot of a doorway in the scale house office hallway, the inside face of the frame speckled): *"fix this in office"*.
- **Cause:** z-fighting. The office `wall()` helper put each dark door jamb with its inside face exactly on the cut end of the wall beside the doorway (and the head's underside exactly on the underside of the wall above the door), so two surfaces drew at the same depth and flickered as you moved.
- **Fix:** the jambs and head stand 12 mm proud into the opening (`J = 0.012`), so the frame's face is the only surface there. Every office doorway (tech room, restroom, safety, training, plant manager, HR, reception) uses that helper. The doors still fit (0.9 m leaf in a 0.926 m clear opening). Checked with a close-up screenshot of a doorway.

## TEST v1.97.114 — ferm pumps turned to face their tanks, by each pair's gap; four shared drain pumps; beer well pump to match (2026-11-04)
- Owner (with a picture between Ferm 1 and 2): *"can you orientate the ferm pumps like this. this is in between ferm 1 and 2. can you set up ferms 3 and 4, and 5 and 6, 7 and the bw like this. with a smaller shared drain pump in between so there should be 4 ferm drain pumps 1 in between each pair of tanks."*
- **Ferm recirculation pumps:** each sits at the foot of its tank on the alley side, 2 m from the gap it shares with its pair (1-2 and 3-4 in the east column, 5-6 and 7 + beer well in the west), pointing straight at the tank: volute toward the tank, motor out toward the alley (`pumpModel('small', PX, PZ, 'x', -d, ...)`, they used to lie along the wall). The suction comes straight out of the tank into the volute (0.85 m up), the discharge rises off the top of the volute to 12 m and back into the tank, with the flow blobs on the new path. `FERM_GAP` / `FERM_PAIRS` hold the pairs and gaps.
- **Four shared drain pumps** (new): a smaller copy of the teal pump (0.6 scale) in the mouth of each pair's gap, pointing into the gap like the ferm pumps; a drain line from the foot of each tank in the pair meets in the gap and runs into it, and its discharge rises to the pipe-rack beam that rests across that gap. Clicking one opens the first tank of its pair.
- **Beer well pump:** the large teal pump moved next to the Ferm 7 / beer well gap, pointing at the beer well (motor toward the alley); the beer line steps out into the alley before running south, now just clear of the beer well (it used to clip its side).
- `validate-corn-creatures.cjs` pump wiring checks updated (ferm pumps along x facing their tanks, the drain pumps, the beer well pump). Checked with screenshots of all four pairs from the alley.

## TEST v1.97.113 — critter powers (frog jump, pigeon flaps, lizard climb, rat speed); every roof can be stood on (2026-11-04)
- Owner: *"frogs give you a better jump. birds give you a flapping pseudo flying effect, lizards let you climb walls, and rats give you speed"*, then *"make sure all roofs have collision we will fix looks later. ability counter continues when entering vehicle. lets make effect last 45 seconds though"*.
- **Powers** (`CRITTER POWERS` before `walkMove`): eating a critter (B) gives its power for 45 s, shown top left with a countdown (🐸 🐦 🦎 🐀; red in the last 5 s) plus a chime and a toast. One at a time: another critter swaps it, the same kind restarts it; it keeps counting while you drive, ride or mow; dying ends it.
  - 🐸 **Frog legs:** jump 8.4 m/s instead of 5.94 (about 3.6 m instead of 1.8), and a drop of up to 4.6 m is safe so you land your own jump.
  - 🐦 **Pigeon wings:** jump in the air to flap (+4.2 m/s, capped at 5.5; 6 flaps, back when you land; a wing flutter sound); hold jump (Space, A or the touch button, `P3.jumpHold`) to glide down at no more than 1.6 m/s; no fall can hurt you while you have them.
  - 🦎 **Lizard grip:** walk into a wall, tank or bin and keep pushing: when something solid holds you back (`lizardClimb`), you climb it at 2.6 m/s; at the top you step onto the roof. Stop pushing and you hold on for 0.6 s, then slide gently down (3 m/s, no fall damage); same if the power runs out mid-climb.
  - 🐀 **Rat speed:** walking and sprinting 1.5x, and the view widens a little while you sprint.
- **Roofs you can stand on** (`ROOF MAP`): one top-down render of every still, solid thing (buildings, tanks, bins, equipment; not vehicles, trains, people, animals, see-through things, the corn or the sky) with a shader that writes each pixel's height, read back once into a 0.5 m height grid (`roofAt`). `floorAt` stands you on anything 2 m up or more when you come down on it or step up a little (0.3 m) onto it, so inside a building the roof overhead is never your floor. Each wall line now stops blocking above the top of its wall (`ROOFMAP.tops`, the highest roof along it; walls with nothing found on top block at any height as before), so you can walk across a roof and off its edge. Built when you start walking and once more 12 s later for late-loading models (about 0.3 s on software rendering, much less on a GPU). Looks on top of the roofs are not touched yet, as asked.
- Checked headless in the running game: a lizard climbed the process building wall onto its 8.6 m roof and walked across it; a frog jump reached 3.5 m; pigeon wings flapped up to 7 m and landed safely; 876 of 901 wall lines found a top.
- New suite `test/validate-critter-powers.cjs` (added to CI): the game's own power, walking, jumping, falling, floor and wall code against a 10 x 10 m building with an 8 m roof: roof floor rules, walls stopping at their tops, each power, the 45 s clock in a vehicle, swap, wear-off, death, and the wiring. `validate-critter-sync.cjs` updated (eating now hands out the power).

## TEST v1.97.112 — 2 player critters; eating one plays three crunchy bites; walking and sprinting 10% slower (2026-11-04)
- Owner: *"sync the critters and add a simple eating effect when eating them. slow down player walking and sprinting speed by 10%"* (the ferm / drain pump layout comes next, from the owner's picture).
- **Critters in 2 player** (`2 PLAYER CRITTERS` before `hitCritter`): the host runs the 10 pigeons, the rat, the lizard and the 8 pond frogs for both players and sends where they all are 8x a second (`crs`: state, position, rotation, there or not, carried, paint colours of dead ones). The guest runs no critter AI of its own (`updateBirds`, `updateCritters` and the launcher's `updatePondFrogs` return early on the guest) and glides its copies to the host's (wings flap in flight, folded on a perch; the lizard wiggles; frogs show within 175 m of the guest). A guest's hit (paintball, thrown corn) goes to the host (`crh`, from the top of `hitBird` / `hitCritter` / `hitPondFrog`) and shows at once on the guest. A corpse is driven by whoever carries or throws it: the guest sends the one it holds or threw (`crp`) until it rests, then it is the host's again (back on the clean-up timer); the host's carried ones ride in its snapshot. Neither player can take a corpse out of the other's hands. Pigeons fly off from either player. If the other player leaves, what they had falls and a guest's mirrors get going on their own.
- **Eating** (B with a corpse in hand): it comes up to your mouth over about a second, shrinking, with three crunches (`chompSnd`: band-passed noise) and a puff of bits and a little red at each bite (`eatCrumbs`), then "You ate the …". No throwing or putting it down mid-meal ("Chewing..."); dying or getting in a vehicle finishes it. The other player sees the crumbs (and hears it within 15 m), sent as `cre`.
- **Fixes on the way:** eating used to remove the critter's model from the scene for good, so that rat, lizard, pigeon or frog never came back; it is now hidden and respawns like any other (`eatGone`; an eaten frog stays hidden until it comes back, `f.eaten`). Frogs had no `.g`, so the X press failed whenever a dead frog was around; they now carry `g` (launcher `frogEngine`) and are named "frog". A pigeon lying on the ground can now be picked up with X (and so eaten); only a falling one could be before.
- **Walking 8.91, sprinting 17.01** (were 9.9 and 18.9).
- New suite `test/validate-critter-sync.cjs` (added to CI): host and guest copies of the game's corpse, eating and critter-sync code piped together (mirroring, a flying pigeon, a guest's paintball hit counted once on the host and painted on both, carried corpse shown and protected, thrown corpse rests in the same spot, eating plays the bites and crumbs and takes it out on both, an eaten frog stays hidden, a dropped connection), plus the wiring and the walk speeds. `validate-power-outage-machines.cjs` updated for the new pick-up / eating lines. Checked with two game pages wired together headless (the guest saw the host's pigeons in place, its hit knocked one down on the host, and it ate it on both) and a screenshot mid-meal (gun away, pigeon coming up).

## TEST v1.97.111 — 2 player: the corn ears and cubes are shared; carrying a dead critter puts the gun away (2026-11-04)
- Owner: *"Sync the cubes. Also when you pick up and hold a dead critter it still shows you holding the shot gun."*
- **Corn props in 2 player** (launcher `cornEngine`): every ear and cube gets an id in build order (`CORN_PROPS_STATE.props`, the same on both PCs). Whoever picks one up, sets it down or throws it drives it (`cornNetTake`) and sends where it is 10x a second (`cp`) until it comes to rest, then one last word and it is nobody's again. The other PC carries it along (`cornNetGlide`, no physics of its own for it), takes it out of its can, and cannot grab it from the other player meanwhile (in hand: no collider either). The host sends where every resting one lies every 2 s, so a late joiner gets the same yard; for 1.5 s after my own move an older snapshot is ignored. If the other player leaves, what they had falls where it is (`cornNetDrop` from `netDrop`). A creature leaves alone an ear the other player is moving, and one it eats goes back in the can on both PCs.
- **Carrying a dead critter:** X on a corpse is the game's own carry (`heldDead`), which never hid what was in your hands. `updateGun` now hides the gun and every tool while you carry one (`fp = ... && !heldDead`); the launcher's weapon-visibility patch is updated to keep that alongside its own corn carry check.
- New suite `test/validate-corn-sync.cjs` (added to CI): host and guest copies of the launcher's corn engine with their messages piped together (carried along, cannot be grabbed, same landing spot, set down, ear out of the can, late joiner, older snapshot ignored, other player leaves, single player sends nothing), the game's hooks, and the gun hidden while a corpse is carried (the game's own `updateGun` lines). Also checked with two game pages wired together headless: the guest picked up a cube, the host saw it carried, and after the throw it lay at the same spot on both.

## TEST v1.97.110 — cob stalkers chase mouth-first; you can be shot in a vehicle or on the mower; the mower cuts the corn (2026-11-04)
- Owner: *"The cob stalkers face the wrong way when chasing. Need a 180 degree turn and You should be able to be shot when riding a vehicle including the mower. Mower should be able to cut down the corn."*
- **Facing:** the models' mouths already face +z, the way the creatures walk; v1.97.108 had added a 180 degree turn on the model inside its heading group, so they chased you backwards. The turn is gone (`creepSpawn`); checked headless with a stalker charging the camera.
- **Shot while seated (2 player):** `netTargetBody(R)` finds the other player wherever they are: on foot, at the wheel of a car (`carSeat(car, 1)`), driving their Ranger, riding along with me (car passenger seat or Ranger passenger seat) or on the mower. My paintballs test against that body instead of only the on-foot avatar. A tag on a seated player first gets them out (`passExit`, `mowExit(true)`, `utvExit()`), then down as before.
- **Mowing corn:** `cornField(mesh)` indexes each corn field's instances on a 4 m grid; `cornCut(x, z, r)` squashes the clumps under the mower deck to stubble (height ×0.1), puffs chaff and chops. The mower cuts while its blades are on, and the other player's mower cuts on my screen too. Cut corn stays cut until the page is reloaded.
- Suite updates: `validate-corn-creatures.cjs` (no extra turn on the model; the game's own mowing code against a test field: one clump cut, neighbours stand, cut stays cut, a pass takes a whole row; mower and remote-mower wiring) and `validate-two-player.cjs` (target body cases, the mower case run, tag-out order).

## TEST v1.97.109 — 2 player: one shared world (power, time, darkness, creatures) and riding along in the same vehicle (2026-11-03)
- Owner: *"the 2player game is not synced. feels like we see different enemies, both riding in the same car one rider one driver doesnt work, when i use the debug power outage or any darken option it only happens for 1 player"*.
- **Causes:** the data channel was unreliable (`reliable: false`), so one-off messages like the power outage could simply be lost; darkness, flicker, blackout and the game clock were never sent at all; each PC ran its own corn field creatures. Riding along checked a `drive` flag on the other player's Ranger that only the player record has, so a passenger was dropped on the first frame; and X next to the car the other player drives only said "The other player is driving that one".
- **World sync (`WORLD SYNC` before `netRecv`):** the host sends its world 4x a second (`ws`): power outage, game clock (game time + rate, or real), scripted darkness (target, hold, rate), the flicker and blackout events, and a snapshot of the creatures. A change made on either side is also sent at once (`po`, `gt`, `dk`, `le`), and for 1.5 s after making one the guest ignores the host's older state for that thing (`wsLock`), so nothing flips back. Channel now `reliable: true`; the periodic state heals anything missed. Brightness stays per device.
- **Creatures in 2 player:** the host runs them for both players: each one hunts whichever of you is in its corn (the nearer if both), and a bite on the guest is sent to the guest (`cbt`). The guest mirrors the host's creatures by id (no AI of its own: glides to the reported spot, legs at the reported speed, screech / death / roar sounds on state changes, "corn is shaking / goes still" on phase changes); its paintball, tool and vehicle hits go to the host (`ch`). The guest's corn ears lying on the ground ride in its `p` message (`ce`) so the host's creatures can smell them; when one eats a guest's ear the guest puts it back in its can (`cea`). Debug "Corn field" rows on the guest ask the host (`cdbg`). If the guest drops out its mirrors carry on with their own AI.
- **Riding along:** `passRide()` finds what the other player drives: one of the cars (you sit in its passenger seat, mirrored from the cabin's driver eye, camera at the passenger's eye) or their Ranger (as before). X at the car they are driving now hops in. The driver sees you seated in the passenger seat (`passFig`), you see them at the wheel (`drvFig`). Getting out puts you on the passenger side.
- New suite `test/validate-two-player.cjs` (added to CI): host and guest copies of the game's clock, creature, world-sync and receive code with their messages piped together. Checks the host's power, darkness, clock, blackout and creatures reach the guest; the guest's changes reach the host and are not flipped back by an older state already in flight; guest hits count on the host; the host's creature bites the guest; the guest's ear lures it out and goes back in the guest's can; Daddy appears on both; plus the ride-along and channel wiring. Also checked live with two game pages wired together headless (host drives the Pink Sedan, the guest rides along and stays seated).
- Suite updates for the shared controls: `validate-interior-dark.cjs` and `validate-game-clock.cjs` (the exported lights / time controls now also send to the other player), `validate-power-outage-machines.cjs` (one more seated player figure: the other player in a car; its ride-along checks had asserted the broken `Q.drive` test itself and now assert the fixed one).

## TEST v1.97.108 — creatures in the north corn field (cob stalkers, then Daddy Cob Legs); teal pumps in the ferm alley and at the beer well (2026-11-03)
- Owner: *"lets add the creatures to the corn field in the north. 2 cob stalkers then after they are killed the daddy cob legs appears. they do not leave their corn field unless drawn out by the throwable corn cobs. pumps should replace the ferm pumps and the beerwell pump"* (the throwable corn is the ears in the cans by the scale house and grain receiving, the launcher's `CORN_PROPS_STATE`).
- **New models** (the owner's, added to `assets/models/` and registered): `cob_stalker.glb`, `daddy_cob_legs.glb`, `small_teal_motor_pump.glb`, `large_teal_motor_pump.glb`.
- **Creatures** (`THE NORTH CORN FIELD'S CREATURES`, after the critter hit code):
  - The field is the 12-row corn north of the north road (x -199..139, z -231..-184). Two cob stalkers (0.42 scale, ~2.8 m across, 10 hits) roam it.
  - Step into the corn within 30 m of one and it screeches and hunts you (5 m/s), biting in reach (a stalker bite counts 1, the third kills: new death kind `cob`). One bite heals every 25 s. Step out and it stops at the edge and shadows you along it: the field edge is a wall to it from the inside.
  - A corn ear lying on the ground within 70 m draws it out of the field (Daddy: 90 m). It walks to the ear, eats it (3.5 s; a fresh ear turns up back in the nearest can, so the supply never runs out), then walks back into the corn. Ears in a can, in a hand or still flying draw nothing; one lying still, even jittering against a wall, does.
  - Paintballs (1 a ball) and swung tools (2; crowbar / pickaxe 3) hurt them; driving into one at speed hurts it and shoves it back. Dead ones flip belly-up, legs curled, and are cleared away after 30 s.
  - When both stalkers are dead, 5 s later Daddy Cob Legs (0.4 scale, ~7.4 m across, 60 hits, its bite counts 2, death kind `daddy`) climbs out of the corn about 30 m from you along the rows, with a roar and "The corn is shaking...". It can't be hurt while it climbs out. After it dies: "The corn goes still.", 15 quiet minutes, then two new stalkers move in (never while you are in the field).
  - No skins in the models: each `Leg_Hip_*` node swings and lifts on an alternating gait, the body bobs; the models are folded per material (body) and per leg at load, about 12 draw calls for a stalker. Red eye materials glow. Synthesized screech / crunch / shriek / roar. Local to this device (not synced to player 2 yet).
  - Debug menu: "🌽 Corn field: kill the stalkers (Daddy comes)" and "🌽 Corn field: reset the creatures".
- **Pumps:** `pumpModel()` replaces `pumpSet()` for the seven fermenter recirculation pumps (small teal model) and the beer well pump (large). Same spot and direction (volute at the pump point, motor along the axis), scaled to the plant pump length, on the yellow pad (now sized to the model's skid). Every copy of a model and its pads fold into one mesh per material: about ten draw calls for all seven ferm pumps. An invisible box per pump keeps it clickable in the free camera.
- **Fix:** `DMG_NOTIFY` was never connected to the UI, so vehicle damage / repair, acid tank, extinguisher (and now bite) messages never showed. `P3.dmgNotify = m => toast(m)`.
- New suite `test/validate-corn-creatures.cjs` (added to CI): runs the creature code over synthetic models (edge shadowing, hunting, three-bite death, healing, the ear lure out and back with the ear returned to its can, paintball / tool damage, Daddy's arrival, quiet spell and respawn, debug helpers) and the pump placement (volute on the spot, motor direction, scale, pad, one mesh per material), plus registry and wiring checks.

## TEST v1.97.107 — car windows fog over like the rest of the car (2026-11-03)
- Owner (screenshot, cars seen through the ammonia cloud): *"the windows look weird through the ammonia fog"*.
- Cause: the cabin glass (v1.97.105) had `renderOrder = 1`, which makes three.js draw it after every other see-through thing regardless of distance, so the windows were painted on top of fog, steam and smoke sitting in front of them: dark, crisp rectangles in a washed-out car.
- Fix: glass and the cracked-glass mesh use the default draw order, so they sort by distance with the fog sprites like everything else.
- `validate-vehicle-cabins.cjs`: glass and cracked panes have render order 0.

## TEST v1.97.106 — the crowbar breaks only the window it hits (2026-11-03)
- Owner: *"only the window struck by the crowbar should shatter not all the cars window. if you break the side windows the windshield should still be intact"*.
- Before: any tool hit anywhere on a vehicle ran `breakGlass`, which swapped every glass part of that vehicle to the cracked material.
- Now (`smashAt`, called from `toolHit`): only the glass the swing actually struck breaks.
  - Cabin cars: the glass mesh records its panes (`userData.panes`: each side window piece, windshield, back glass). `breakPane` moves the struck pane out of the intact mesh (its triangles fold to a point, so rays pass) into a second per-car mesh with the cracked look, made on the first break: at most two glass draw calls per car.
  - Vehicles with separate glass parts (Ranger, forklifts): just the part that was hit.
  - A hit on paint or trim breaks no glass (the dent still lands); hitting an already-smashed pane just clinks.
  - Any smashed window on a drivable car still lets you in without keys.
- Network: `cb` now carries the pane (or mesh) index (`smashNet`); a message without one (older build) breaks the whole vehicle as before. A full repair (`dmgRestore`) restores every pane (`unbreakPanes`).
- `validate-vehicle-cabins.cjs`: raycasts real swings at the Pink Sedan: driver window breaks alone and the windshield is untouched, the broken pane lets rays through, a second hit does nothing, the windshield breaks on its own, paint breaks nothing, repair restores, a remote smash hits the same pane.

## TEST v1.97.105 — see-through car windows, real interiors, a proper driver's seat; F-150 removed (2026-11-03)
- Owner (photo of the Pink Sedan): *"Can we fix the vehicle windows they are opaque. The first person view in the pink car is pretty bad as well"*, then *"Do 2 and 3 and remove the silver f150"*.
- **Why the windows were opaque:** every vehicle was one solid side-profile block in body colour with dark panels stuck on the outside, so there was nothing to see through. The Pink Sedan's glass also sat only 1 cm proud of the paint (stripes of pink through it on a phone's depth buffer) and it had no rear window at all.
- **Why first person was bad:** the camera sat inside that solid block; its faces only draw from outside, so the car vanished except a thin black roof slab just over your head.
- **New `cabin(g, spec)` helper** (parking-lot block, `HOLLOW CABINS`), used by all nine vehicles (Gladiator, Equinox, red + black lifted Silverado, yellow crossover, Renegade, Crown Vic, 90s Ranger, Denali, Pink Sedan). From each vehicle's own profile numbers it builds:
  - the lower body solid up to the belt line with a footwell cut into the cabin, door panels down the sides and trim-gray door cards inside;
  - a frame on each side with the window openings cut out (side glass split at the B/C pillars), a roof slab, a painted cab back under a smaller back window on the pickups;
  - all the glass (side windows, windshield, back glass) as **one** transparent mesh per vehicle (tint `0x1c2630` at 50%, shiny), UV-mapped so the crowbar's cracked-glass texture still works, colour in `GLASS_COLS` so smash / burn code still treats it as glass;
  - an interior: carpet, dash (kept clear of the windshield, leg room under it), a gauge hood with a softly lit dial strip (battery-lit, glows at night), steering column and wheel, front seats with headrests, a rear bench when the cabin is long enough.
- **Driver's seat view (Y / 🎥 in a car):** `mkCar` now carries the cabin's `eye` and steering wheel; the first-person camera sits at the driver's eye (left seat, behind the wheel) and rides with the body's bounce and tilt (`utvCam`, via the inner group's world matrix), looking slightly down so the dash, gauges and wheel top show with the road ahead. The steering wheel turns with your steering (it reuses the Ranger's `sw` hook; flipped so it turns the right way) and straightens when you park. The Ranger UTV's own first person is unchanged.
- **Silver F-150 removed:** model, its spot in the dirt west of the process building, the lab-beaker key on the lab office board and its keychain model. `O.cars` is now black Silverado, yellow crossover, Pink Sedan.
- **Performance:** about +2 draw calls per vehicle on screen (interior materials; each car's parts still fold together per material). Lot view measured 177 → 196 draw calls (with one car fewer).
- New suite `test/validate-vehicle-cabins.cjs` (added to CI): runs `cabin()` over every vehicle's real spec from the source with three.js and checks the glass (one mesh, see-through, inside the body, UVs, split at pillars), frames with openings, the driver eye (left seat, under the roof, behind the windshield), the wheel in front of it, the dash clear of the windshield, lit gauges, seats, the footwell, plus the camera / steering wiring and that the F-150 is gone.
- `validate-power-outage.cjs`: battery-lit count 10 → 11 (the dash gauge material is battery lit, so an outage does not kill it).

## TEST v1.97.104 — clouds, overcast sky and stack steam darken with the sky (2026-11-03)
- Owner: *"make the clouds darken as the sky does"*.
- `daylight()` now records `SKY.k`, how bright the clear sky of the hour is (1 by day, ~0.18 at night, ~0.08 in deep night, from the look's sky colour before weather).
- Clouds (`updateSky`): brightness `0.09 + 0.91·k'` (k' = smoothstep of `SKY.k`) and they take on more of the sky's colour as it darkens: white by day, a touch dimmer and warmer at sunset, dim blue-gray shapes at night. Was a fixed ×0.55 below a brightness threshold.
- Overcast / rain / snow: the weather gray the sky blends toward is scaled by `SKY.k` too, so a cloudy night is dark gray instead of daytime gray.
- Stack and cooling-tower steam (`updatePlumes`) dims the same way so it no longer glows white at night.
- `validate-game-clock.cjs`: wiring, plus the cloud brightness over the eight looks (white by day, dimmer at sunset, dim at night, dimmest in deep night).

## TEST v1.97.103 — eight 3-hour looks; night falls at 10 PM (2026-11-03)
- Owner: *"Can we make the day night change every 3 hours instead of six"* — chose Option B (eight looks on a real 24-hour day) over speeding the clock up.
- `LOOKS` now has eight entries on the sun/moon badge's hours: 7 AM sunrise, 10 AM morning, 1 PM midday, 4 PM late afternoon, 7 PM sunset, **10 PM night** (was 1 AM), 1 AM deep night (the darkest, sky light 0.56, was 0.66 at the darkest), 4 AM pre-dawn. Same one-hour fade.
- Yard lamps follow the sky light as before (`LIGHT.night`), so they are fully on from 10 PM and glimmer on at sunrise/sunset.
- Debug → Time of day presets are now one per look (8 AM, 11 AM, 2 PM, 5 PM, 8 PM, 11 PM, 2 AM, 5 AM).
- `validate-game-clock.cjs`: eight looks every 3 hours, same hours as the badge, night at 10 PM, deep night darkest but not black.
- `validate-interior-dark.cjs` flake fixed (failed ~1 run in 30): the shed's randomly-seeded 'tired' lamp could be mid-flicker during the exact before/after outage comparison. The suite now checks the shed has one tired lamp, then holds it steady (0 fails in 60 runs).

## TEST v1.97.102 — day/night controls in the debug menu (2026-11-03)
- Owner: *"Need day night cycle controls in debug"*.
- **Game clock:** new `gameDate()` in the engine (exported on `window` for the UI script). It is the device clock until the debug menu changes it: a set hour (keeps running at normal speed), ±1 hour, or a fast cycle (×360, a whole day in 4 minutes). Local to this device, resets on reload, not sent to player 2.
- Everything that went by `new Date()` for time of day now reads it: sky and light (`daylight`, re-lit 5× a second in the fast cycle instead of every 20 s), the beer well transfer schedule, the HUD clock (now ticks every second), the sun/moon badge (every 2 s) and the AM/PM music track.
- **Debug → 🕐 Time of day: <time> (real/set/fast):** Real time, Morning 9 AM, Afternoon 3 PM, Evening 9 PM, Night 3 AM (one per lighting look; looks change at 7 AM, 1 PM, 7 PM, 1 AM with an hour fade), +1 hour, −1 hour, Fast cycle on/off. Also `Plant3D.time.set({ hour | shift | rate | real })` for scripted use.
- New suite `test/validate-game-clock.cjs` (added to CI): runs the clock code against a fake `Date.now`, checks every reader is wired and the menu rows.

## TEST v1.97.101 — background music starts at 20% (2026-11-03)
- Owner: *"Starting background music should be lower maybe 20%"*.
- `test/sound-settings.js`: the default music volume (used until the player moves the Sound slider) is now 0.2, was 0.6. A volume already saved with the slider (`cs_music_volume`) is kept. `validate-sound.cjs` expects the new default.
- LIVE is untouched. `sound-settings.js` now works like `game.html`: TEST may run ahead, `sync_test_to_live.py` copies it on promotion (and `--check` compares it), and `validate-live-promotion.cjs` no longer demands the two copies be identical between promotions.

## TEST v1.97.100 — headlamp no longer lights far walls white; DDG building goes dark (2026-11-03)
- Owner (photo, process building, daytime, outage on): *"here's a spot that should be dark right now and isn't"*, and *"Ddg building also did not go dark during power outage and it should"*.
- **Process building:** the culprit was the headlamp. Its reach window `(1 - q²)²` was not clamped, so past the reach it grew again: a wall 84 m down the ferm alley got a huge boost and rendered white, and everything across a big hall was lit. The window is now clamped to zero past the reach.
- **Headlamp falloff:** now inverse square (`/(d² + 2)`, source ×2.2 to keep it strong close up) with a 40 m reach (was 1/d over 60 m). Bright at arm's length, a dim shape at 8–15 m, almost nothing across a big hall, which is what a torch in a dark plant should do.
- **DDG building:** was never registered as a roofed room (`enclosure`), so the lighting pass treated it as outdoors. Now registered; its roll-up and man doors become daylight openings automatically, and it gets generated high-bays like the other rooms. An audit of every large overhead surface found no other roofed building missing (the wet cake pad is an open-sided canopy and stays daylit on purpose).
- Tests: `validate-interior-dark.cjs` checks the clamped, inverse-square headlamp (nothing past the reach) and the DDG envelope.

## TEST v1.97.99 — new lighting: dark interiors, lamp pools, outages that only kill the lamps, scare controls (2026-11-02)
- Owner: *"It doesn't get very dark inside building during the day and it feel like the power outage also darkens the outside a bit"*, then *"give me a good lighting system that performs well on mobile. I want enough dark to make scary moments."*
- **Why interiors were bright:** one sun + one hemisphere light lit the whole world, and walls/roofs block neither, so a room was as bright as the yard. The only indoor darkening (`applyInteriorDark`) ran in an outage, by swapping each mesh to a dimmed material clone, and it skipped walls, anything large, and every merged mesh.
- **Why the outage darkened the outside:** that same per-mesh dimming judged "inside" by a mesh's centre point. Merged meshes all have their centre at the world origin, which is inside the shop envelope, so outdoor pieces were dimmed.
- **New system (`LIGHTING` section, replaces `INTERIOR`):** one shared shader patch on every Lambert / Phong / Standard material (`lightInstall`, prototype `onBeforeCompile`), injected after `lights_fragment_end`:
  - each pixel finds its world position from `viewMatrix` (no vertex changes), nudges it 0.4 m along its normal (so inner wall faces and ceilings land inside, outer faces and roof tops outside) and tests the nearest rooms (`ENCL`, up to 8, smallest first);
  - inside a room the sun and sky are scaled to 5% plus up to 80% near a window or an **open door** (roll-up and man doors are now daylight openings, tied to their open state);
  - the room adds a warm fixture fill, and the nearest lamps add pools (`csLampP/C`), packed so a pixel only walks its own room's lamps (outdoor lamps first, used outdoors only, and only at night or in scripted darkness);
  - the headlamp is computed in the same pass (same cone, reach, and intensity 28 as before) and is no longer a three.js `SpotLight`, which removes a light loop from every pixel in the game;
  - unlit `MeshBasicMaterial` surfaces (name plates, signs, faces) darken indoors; anything flagged as a light, additive, HUD (`depthTest: false`) or `fog: false` is left alone (`csBasicOK`);
  - surfaces given a fake emissive "lit" glow (wall sheeting, roof deck, drop ceiling, concrete, the see-through flow pipes) are tagged `selfLit`, and that glow now fades with the room's light instead of glowing gray in a blackout.
- **Lamps (`lightBuild`, before `mergeStatic`):** 7 authored fixtures tagged `lampLight(...)` (receiving ceiling lights, hallway lights, wall packs, the yard pole); EXIT signs (faint red pool, battery); egress strobes (red flashes in an outage); and generated ceiling high-bays (9 m grid, one InstancedMesh, `gridLight`) for every room without a ceiling light of its own. One lamp in each big room has a tired ballast that flickers now and then.
- **Outage:** the sun and sky are never touched. Grid lamps and room fill go out, and battery EXIT / strobe light stays. When the power returns, the lamps strike up one by one over about 2 s (`lightPower`).
- **Scare controls:** `Plant3D.lights.flicker(sec, r)`, `.blackout(sec, r)` (local: fixtures die, battery gear stays), `.dark(amount, fade, hold)` (global darkness, outdoors and sky included, lifts by itself after `hold`). Debug menu has a row for each, plus "lift now". All local to one player for now (no network sync).
- **Brightness floor:** pause menu → Brightness (Dark / Normal / Bright / Brightest = 0 / 3 / 8 / 15% minimum light), saved per device (`cs_bright`), for screens that crush blacks.
- **Free camera:** interiors are lifted 60% toward daylight (25% in an outage) so the plant still reads from above. The first-person HUD pass bypasses the world patch and is lit by `lightSample` at your position, so the gun darkens with the room and the headlamp brings it back.
- **Performance:** CPU `lightUpdate` measured at 0.08 ms/frame (202 lamps). GPU: every pixel pays a few compares outdoors, plus the window/lamp loops only inside a room; counts are uniforms (no recompiles), low tier uses 5 rooms / 8 openings / 5 lamps. The software renderer in CI runs every branch, so it shows the worst case (about 2x frame time there); real GPUs skip the uniform branches. Needs a check on the razr.
- Tests: `validate-interior-dark.cjs` rewritten for the new system (patch on real three.js programs, room/window/lamp packing, `lightSample` day / night / outage / flicker / blackout / darkness / brightness, the outage leaving the yard exactly unchanged, warm-up). Stubs updated in traffic, power-outage (gridLight count 23 → 24 for the high-bay mesh), west-wing, ranger.
- Bumped TEST to `1.97.99` / `corn-souls-test-shell-v126`.

## TEST v1.97.98 — CI fix for v1.97.97 (2026-11-02)
- I pushed v1.97.97 before I saw that `validate-power-outage-machines.cjs` failed in the clean clone. That suite lifts `function updatePivot(...)` up to `// ---------- HAND TOOLS` and runs it against a stub `O.pivot` that has no `wheels` / `cols` and no `pivotCols()`. The game itself was fine; only the suite broke.
- `pivotCols()` now sits *after* `updatePivot` (inside the slice that suite runs), and both loops read `P.wheels || []` / `P.cols || []`, so a pivot without towers (the stub) still runs. `validate-pivot.cjs` slices `pivotCols` from its new spot.
- Full set re-run in a clean clone before this push: 10 repo-root + 13 `test/` suites, anchors.
- Bumped TEST to `1.97.98` / `corn-souls-test-shell-v125`.

## TEST v1.97.97 — center pivot: tower tires roll the right way, and the towers are solid (2026-11-02)
- Owner: *"The wheels on the rotary sprinkler aren't oriented the right way and they have no collision."*
- **Orientation:** each tower's two tires sit fore and aft on the gearbox beam (local z ±1.7), but their cylinders were turned `rotateX`, so the axles pointed along the beam and the tires faced the direction of travel, as if rolling sideways along the arm. They're now `rotateZ`: axles along the arm (local x), so they roll round the circle the way the tower travels. They also turn now (`rotation.x += turn × tower radius / 0.75 m`, in `updatePivot`), so they only move while the engine runs.
- **Collision:** every tower gets three round footprints (both tires r 0.85, the A-frame between r 0.7) in `extraCols`, and the center tower gets one (r 1.7). `pivotCols()` moves the tower footprints with the arm: once at build, then every frame it turns. They feed the same `colliders` list as the tanks, so walking and every vehicle (Ranger and cars, via `utvBlocked`) bump off them. Verified: a Ranger steered at a moving tower stops ~2.4 m short of its centre (its own front circle touching the footprint) instead of driving through.
- Tests: new `test/validate-pivot.cjs` (13th `test/` suite, wired into CI): tire orientation and rolling, all towers and the centre are colliders, and `pivotCols` run in a vm (at rest, a quarter turn later, fore/aft footprints staying on the beam line), plus the per-frame and build-time calls.
- Bumped TEST to `1.97.97` / `corn-souls-test-shell-v124`.

## TEST v1.97.96 — grain-yard ground flicker fixed, road markings hold at range, pond ripples and splashes (2026-11-02)
- Owner: *"Ground still flickers between grains area and process building. Also could we add a basic splash or water thing like a basic texture that shows ripples when you disturb the water a cheap effect."*
- **Finding the flicker:** a headless scan collected every flat, up-facing, ground-level triangle in the scene on a 2 m grid and listed overlapping pairs whose heights and depth pulls are too close to separate. In the reported area there was one real hit: the **receiving (grain yard) slab**. It sat at `0.012 + 0.005 = 0.017 m` with a plain shared `mat()` and **no polygon offset**, while the plant's dirt plane (`GY('dirt')` 0.016 m, pulled 8 depth steps forward) runs under the slab's east 20 m (x -206.5…-187). The dirt beat the slab's 1 mm lead, so the two traded pixels. The slab now uses the gravel layer: height `GY('dirtroad')` (0.030) and its own material pulled `GB('dirtroad')` (-10). That puts it above the dirt by 14 mm and 2 steps, and still under the asphalt yard roads that cross its edge. The stairs and pit holes are unchanged.
- **Same scan, second cause: the road markings.** Every marking on the paint layer (plant road centre dashes, the grain-yard lines, the exit road dashes, the shop-lot stall lines, the highway edge lines and lane dashes) had the paint *height* but a plain `mat()`, so no depth pull. The asphalt under them is pulled 12 steps forward, so past a few tens of metres it beat the 7 mm and the dashes flickered or dropped out. New `markMat(color)` helper (next to `GLAYER`): one Lambert per colour with `polygonOffsetUnits: GB('paint')`, now used by all of them. (Named `markMat` because `paintMat` is already the paintball splat material.)
- Not changed: road-on-road overlaps at junctions. Same layer, same texture tint, so there was no visible fight. Also not changed: some building floors at y 0 under the dirt, which the dirt always covers consistently (no flicker).
- **Water ripples and splashes** (`WFX`, `wfxRing`, `wfxSplash`, `wfxUpdate`, run every frame next to the pond poison):
  - **Rings:** one 64 px canvas ring on a flat quad laid 12 mm above the pond surface. Each ring grows (ease-out) and fades over about a second. There is a pool of 20, each with its own material for its own opacity, and they are reused oldest-first.
  - **Splashes:** a pool of 32 droplet sprites sharing one material, thrown up and pulled down by gravity, hidden once they fall back below the water.
  - Nothing is allocated after the first ring, and the effect costs nothing until you touch a pond.
  - What makes them:
    - wading: a ring every ~0.3 s while moving, plus a little spray when running, and a slow ring every 1.4 s standing still;
    - jumping in: a splash;
    - the other player wading;
    - a vehicle in the water (yours or the other player's Ranger): rings off the rear wheels, more often the faster you go, and spray off the front wheels above 6 m/s;
    - dropping in off the bank: a big splash and ring;
    - a paintball hitting the pond surface: a plop ring and a few droplets, instead of a paint splat floating on the water.
- Verified in headless Chromium: wading across the east pond leaves a trail of rings; driving in leaves a wake of rings with spray off the wheels. A re-scan shows the receiving slab and the markings gone from the conflict list.
- Tests:
  - New `test/validate-water.cjs` (12th `test/` suite, wired into CI) runs the real water-fx code on stubs: fixed pools (nothing else added to the scene), rings sit on the surface, grow, fade and hide, droplets fall back in, wading, standing, on the berm (none), jumping in, driving through, dropping in off the bank, leaving the pond, the per-frame hook and the paintball plop.
  - `validate-ground-layers.cjs` pins the receiving slab's layer and pull, `markMat`, and that no `GY('paint')` line uses a plain `mat()`.
- Bumped TEST to `1.97.96` / `corn-souls-test-shell-v123`.

## TEST v1.97.95 — you can drive into the ponds again (2026-11-02)
- Owner: *"We used to be able to drive through the ponds."* Broken by v1.97.94. The Ranger has always refused a drop of more than 0.8 m in one movement step (meant for holes with no ground), but before v1.97.94 its height eased down the bank slope, so the floor was never that far below it. With air physics, driving off the pond crest at speed makes the Ranger airborne. The floor under it falls away down the inner bank toward the pond bottom (-1.57 m), the gap passes 0.8 m, and since the bottom is below -0.5 the v1.97.94 condition (`fN < -0.5`) bounced it back out.
- Now only a drop into **no ground at all** is refused (`fN <= -5`: `floorAt` returns -10 over a dug hole with no surface). The pond banks and bottom are real walk surfaces, so you drive over the berm (with a little air off the crest), down into the water, across the bottom and up the far side, like before.
- Verified in headless Chromium: from 110 m south of the east pond, heading north at full throttle, it crossed the berm, sat on the bottom at -1.57 m at ~19.6 m/s, and climbed out the north side (getting air off the far crest).
- `test/validate-ranger.cjs` pins the new condition and that the old `-0.5` one is gone.
- Bumped TEST to `1.97.95` / `corn-souls-test-shell-v122`.

## TEST v1.97.94 — air on hills, and four dirt hills to try it on (2026-11-02)
- Owner: *"And we can get air on hills?"* - no: the Ranger's height only eased toward the floor (`u.y += (fl - u.y) * 8dt`), so it glided over every crest. Then: *"Yes do it and then some hills in a grassy or dirt area to test the new physics."*
- **Air** (`AIR`, `vehVertical(u, dt)`, replacing that one line in `utvUpdate`; so the Ranger *and* the three cars): the driven vehicle carries vertical speed. On the ground it snaps to the floor and remembers the floor's rate of climb - but only for a slope (`|Δ| <= 0.45 × speed × dt + 2 cm`); a curb or slab edge is a step and never becomes a launch. When the floor falls away faster than gravity (9.8) can follow by more than 3 cm - over a crest, off the kicker lip, off any ledge - it goes airborne on that speed. In the air the gas, brakes, handbrake and steering are at 12 % and the tyres barely grip sideways (`ga`), so you fly the line you left on. Landing takes the slope speed it came down on (no re-launch on a downslope), thumps through `utvBump` (capped below that function's damage line), and only a > 9 m/s impact (~4 m fall) damages the vehicle (`(v - 9) × 6`). The pit/pond refusal now only fires for drops below grade (`fN < -0.5`), so a drop to the ground is a jump instead of a bounce-back. Getting in resets the jump state; getting out mid-air drops the vehicle to the ground.
- **Suspension in the air**: wheels hang at full droop, the body holds its tilt (the nose drops slowly), and touchdown kicks the heave and pitch springs by the impact. The ground-motion kick changed from displacement to **change of vertical speed** (ramp foot, crest, curb), because the displacement version kept pushing the body down the whole way up a steady slope (seen in the in-game trace: −0.13 m while climbing the kicker). The other player's Ranger is treated as airborne when it is > 0.25 m above the floor under it, so their jumps show hanging wheels and a landing too.
- **Dirt hills** (`DIRT_HILLS`, `buildDirtHills()`, built with the world before `mergeStatic`): four dirt mounds in the open grass east of the plant between its east road and Road P (x 118-184, z 2-50, ~60 m east of the Ranger), all running north-south so you hit them driving north:
  - kicker (x 118-128): 12 m ramp to 1.6 m ending in a sheer face;
  - tabletop (x 136-148): up to 2.0 m, 8 m flat top, back down;
  - whoops (x 154-164): three 0.7 m rollers;
  - big hill (x 170-184): rounded, 3.6 m, 44 m long.
  Each is a `[z, height]` profile: a slope is a `WALK_SURF` ramp (walking, Ranger and cars ride it), equal z is a sheer face. Faces and sides taller than 0.6 m are `wallSegs` that only block below the top (`ylo -0.5`, `yhi` = the lower edge height), so you can't drive through a hill but can drive off its edge. Dirt texture (the ground `dirt` canvas, cloned, 6 m tiles), flat-shaded, casts and receives shadows. Every slope is <= 0.45 so the air code treats it as a slope.
- Measured in headless Chromium, full throttle from 35-45 m back: kicker 1.1 s of air, ~15 m long; tabletop 1.5 s (clears the top); big hill leaves the ground at the crest and lands on the far slope (1.2 s); whoops make small hops at 60 % throttle. No damage on any of them.
- Tests: `test/validate-ranger.cjs` grew section 5 - runs `vehVertical` on stub ground (stays down climbing a ramp, takes off at the lip, peaks above it, lands > 8 m past it with one thump and no damage; crawling off the lip just drops; a curb never launches; off a crest it flies then stays planted down the slope; a 6 m fall damages, a 2.5 m drop doesn't), builds the hills on stubs (one mesh each, profiles run north, slopes <= 0.45, kicker 1.6 m / tabletop flat 2.0 m / hill crest 3.6 m, kicker face and tall sides are below-the-top walls, all inside the open area), and pins the wiring. The step-kick threshold in the existing suspension test moved −0.04 → −0.03 for the new velocity-based kick.
- Bumped TEST to `1.97.94` / `corn-souls-test-shell-v121`.

## TEST v1.97.93 — new Ranger model (owner's Gemini GLB) with per-wheel suspension (2026-11-02)
- Owner: wasn't happy with the box-built Ranger (it dates back to the old CobSouls 1.13 pipeline, built in code - no third-party author). He had Gemini generate a PS1-style replacement from a spec written here (sizes, named parts, a tintable `Body` material, <= ~900 triangles, wheel / steering / bed / light / shock / seat nodes) and asked for *"everything now"*: the new model plus suspension. The first export was missing its roof coverage over the cab (two loose rear roll-cage posts) and vertex normals; the second export fixes both and is the one shipped.
- **`assets/models/ps1_utv_ranger.glb`** - 732 triangles, 61 KB, 4 materials (Body / Trim / Tires / Lights), a 256 px atlas + 128 px tyre texture. Same footprint as the box Ranger (wheels at x ±0.78, z ±1.0, r 0.33, seat top ~1.0 m), so driving, collisions, the seated driver, the 2-player body swap, the passenger seat and the radio-in-the-bed spot carry over. Registered in `assets/registry.json` (`first-party-ps1-utv-ranger`), `CREDITS.md`, `assets/models/README.md`.
- **How it goes in** (`RANGER_GLB`, `rangerSkinQueue`, `rangerSkin` next to `makeRangerMesh`): `makeRangerMesh` still builds the box Ranger and marks its parts `userData.rangerPart`; the GLB is fetched once and, when it arrives, every Ranger swaps its box parts for a clone. Driver, passenger, NOS flame, fire sprites and the radio are not box parts and stay. **If the model fails to load or is missing a part, the box Ranger stays** (console warning, never a lost vehicle).
  - `Body` is cloned per Ranger and tinted `RANGER_COL` (Player 1 red, Player 2 blue) - never shared. `Lights` become an unlit `batteryLight` MeshBasic. Textures get nearest magnification (crunchy up close, mipmapped far) and flat shading. Normals are computed if a future export leaves them out (the reader would draw it black).
  - Each glTF wheel node is re-parented under a hub pivot, so the existing `{ pv, w, front }` wheel code spins and steers it unchanged; the wheels array is refilled in place, so `RANGER_SAVE` / `swapRangers` references stay valid. The model's `steering_wheel` replaces `sw` for whichever owner holds that Ranger.
  - The walk-into / stand-on `VBOXES` box is re-measured from the model, `SR_BED.y` drops to the model's bed floor (0.79), and a Ranger that burnt out before the model arrived is re-charred. `dmgChar` now chars textured parts that opt in (`userData.charOK`) - the old rule skipped anything with a texture, which would have left a burnt Ranger red.
  - `glbBuild` now keeps the glTF material name on each material (`mat.name`) - nothing else in the reader changed.
  - Draw cost: ~16 meshes per Ranger vs ~35 box parts before.
- **Suspension** (`suspStep`, visual only - speed, grip and steering are untouched): every wheel samples `floorAt` under its own hub; three damped springs (heave, pitch, roll; `SUSP.K 110`, `C 13` - slightly under-damped) carry the body to the plane those four points make, so it noses up ramps, rocks over the rail crossing and drops a corner off a slab edge. Each wheel takes up the remaining gap within ±9 cm of travel and its `shock_*` stretches / squashes to match. A step up or down kicks the heave spring (the body lags, bounces once, settles), and a ±1.6 cm ripple keeps it alive on flat ground. The existing lean (roll into turns, nose dip on brakes) sits on top, and the wheels stay planted while the body leans over them. The seat / first-person camera follows 80 % of the heave. Parked = no re-sampling (4 `floorAt` calls per frame only while moving). Runs for anything driven through `utvUpdate` (Ranger and the three cars, using their own wheel positions; virtual corners if a vehicle has no wheels) and for the other player's Ranger.
- **Riding along** already existed (`rideToggle` → `walk.pass`, `seatPassenger`, `passSeat`, the `ps` net flag): X beside the other player's moving Ranger to ride shotgun. Untouched; the model's passenger seat lines up with it (0.32 vs 0.34 m).
- Tests: new `test/validate-ranger.cjs` (11th `test/` suite, wired into CI) - checks the file (≤ 900 triangles, every named part, wheel positions, registry + credits), runs the real swap on the game's own glTF reader against two Rangers (box parts out, driver kept, 4 hub-pivoted wheels with shocks, separate red / blue Body materials, 4 unlit lights, normals, steering wheel handed over, `VBOXES` re-measured, bed height) and a broken model (box stays), then runs `suspStep` on stub ground: flat, ramp (pitch = atan(0.1/2)), side slope, a curb under one wheel (rides up within travel, shock squashes), a step (kick, bounce past level, settles), parked (no re-sampling, 4 samples when moved), no-wheels vehicle, and lean (low side compresses, high side droops). Verified in headless Chromium: model loads, drives, rolls into turns with wheels planted, no errors.
- `validate-power-outage.cjs`'s self-powered emitter count goes 9 → 10 (the model Ranger's lights are a new `batteryLight`, so they stay on through an outage like the box Ranger's did).
- Bumped TEST to `1.97.93` / `corn-souls-test-shell-v120`.

## TEST v1.97.92 — frame stability: no more alternating shadow frames, steadier pacing, less per-frame garbage (2026-11-02)
- Owner: *"we've been having frame rate issues it's not very stable."* Audited the TEST build in headless Chromium (swiftshader, so absolute ms are slow, but the *shape* of the frame times is what matters) with the GPU-side work stubbed out to isolate JS cost. Five causes, all fixed here:
- **1. Shadows were redrawn on alternate frames (medium/low).** `shadowEvery: 2` meant every other frame paid for the shadow pass: measured 638 vs 1155 draw calls, alternating - a built-in two-speed frame, which reads as stutter even when the average fps looks fine. Every tier now redraws shadows **every frame** (`shadowEvery: 1`) but with a cheaper pass sized per tier: shadow box `shadowR` 50 / 65 / 85 m (low / medium / high), box snapped on all three axes in `shadowStep` 4 / 3 / 2 m steps (so it re-centres rarely and the edges don't swim), and on low/medium small static meshes stop casting (`minCaster` 0.5 / 0.35 m world radius; skinned meshes always cast; count in `PERF.smallCasters`). Result: flat 887 dc every frame on medium, 778 on low - no alternation.
- **2. Frame cap pacing.** The old `fpsAcc` accumulator dropped frames in an uneven pattern on displays whose refresh is not a multiple of the cap (e.g. 90 Hz with a 60 cap → 1-1-2-1-1-2 judder). Replaced with `PACE`: a rolling median of rAF gaps measures the real display rate, and every 2 s picks a whole-number divisor `k = max(1, round(hz / cap - 0.15))`, rendering every k-th vsync. 60/60 → every frame, 120/60 → every 2nd, 90/60 → every frame (no judder), 165/60 → every 3rd.
- **3. Critter spawn/leg searches spiked.** `crSpawn` and `crLeg` looped up to 20 / 8 raycast attempts in a single frame. Each call now makes **one** attempt and retries next frame (`spawnTries` / `legTries`, resting after 20 / 8 misses), and the solid list they raycast is filtered by `crSolidsNear()` to meshes overlapping the critter areas (+2 m) - refreshed every 10 s. Critter raycasts no longer show in the spike profile.
- **4. Per-frame allocation.** ~7.5 MB/s of garbage → ~5.0 MB/s, GC-caused frame drops 7 → 4 per 20 s. `updateVehTops` walks box corners by bit index instead of building arrays; `vehicleHits` iterates vehicles/train cars/thru cars directly via `vehHitOne()`; `floorAt` drops its `DIGS.some` closure; the launcher's `vehicleContactEngine` now builds pooled bodies once per frame (`csBuild`, stamped by clock) and returns shared `CS_HIT` / `CS_PUSH` objects. `csVehicleBodies()` is kept for callers that want a fresh array.
- **5. Layout reads while walking.** The label pass read `offsetParent` / `offsetWidth` (forced layout) every frame even when labels were hidden in first person. Now skipped while walking, and the panel width is only read when labels are on.
- Measured (stubbed GPU, 20 s): JS frame p99 5.5 → 3.5 ms, worst frame 16.7 → 6.6 ms.
- Tests: new `test/validate-frame-stability.cjs` (10th `test/` suite, wired into CI) checks the shadow wiring, runs `crSolidsNear` on stubs and pins the one-attempt critter searches, runs `paceUpdate` in a vm over 1200 jittered frames for six display/cap pairs, checks the hot functions for allocation patterns, and runs the launcher contact engine on stub vehicles (pool reuse, truck contact). `validate-performance.cjs` now pins `shadowEvery: 1` and the per-tier `shadowR` / `shadowStep` / `minCaster`; `validate-power-outage-machines.cjs` checks the `PACE.k` skip instead of the removed accumulator.
- Not done yet (next candidates): ~640 world draw calls / 306 materials, the Ranger's 119 meshes, ~21 draw calls per NPC rig.
- Bumped TEST to `1.97.92` / `corn-souls-test-shell-v119`.

## TEST v1.97.91 — the magazine feeds from the gun end now (2026-11-01)
- Owner: firing takes a paintball off the right (far) side of the side magazine, when it should come off the left - the end nearest the gun. Follow-up to that: *"it doesn't look like there's a spring on the far end pushing the paintballs into the gun, it looks like the paintball farthest from the gun disappears."*
- **He is right about what was happening.** The rounds are laid out at `0.03 + i * 0.022` in the magazine's local space (slot 0 = 0.030, hard against the receiver; slot 5 = 0.140, out at the closed end) and `setRounds()` hid them with `i < n` - so it kept the near ones and blinked out the **farthest** one every shot. That is what a real spring-fed magazine looks like from the outside, but the model has no spring or follower to see (just the body, two rolled edges, a floor plate, the slit, the tick marks, the balls and the glass), so the effect was "the magazine eats from the wrong end".
- **Now it feeds from the gun end**: `b.visible = kind === 'paint' && i >= MAG - n`. Slot 0 (nearest the gun) leaves first and the empty slot grows at the magwell.
- **The water window recedes from the same end**: `wcol.position.x = 0.019 + (MAG - n) * 0.022 + wcol.scale.x / 2`, so the column always sits under the rounds that are left - `n = 6` fills 0.019…0.149, `n = 1` sits at 0.129…0.149 directly under slot 5. Paint and water can no longer drain toward opposite ends.
- Cosmetic only: `mags`, reload timing and the ammo counts are untouched, and the remote player's gun in third person uses the same `setRounds`, so their slit matches.
- Tests: new `test/validate-gun-magazine.cjs` (9th `test/` suite, wired into CI) lifts the real `setRounds()` out of `buildShotgun` and runs it against six stub rounds and a stub water column: a full magazine shows all six, `n = 5` hides **slot 0** (not the far one), `n = 1` leaves only slot 5, water hides the paintballs and lands the column on 0.019…0.149 then 0.129…0.149, an empty magazine shows nothing, and the repeat guard still short-circuits. It also pins the slot layout (`0.03 + i * 0.022`, `MAG = 6`) and the right-hand mount, so re-ordering the magazine cannot silently flip the feed end back.
- Verified locally and in a clean clone: 10 repo-root suites + 9 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.91` / `corn-souls-test-shell-v118`.


- Owner: the road between the process building and the energy center still looks like brown ground, not concrete or pavement.
- **It was never pavement.** The cross road (`z = CZR = 67.8`, x -125…72) was built as `groundMat('dirtroad', …)` - the gravel texture, `#9b7f5d` with ruts, which is the same brown family as the dirt around it. The v1.97.86/88 layer work made sure it is drawn on top of the yard; the surface itself was still gravel. On top of that, 11.4 m of the 29 m gap was bare dirt: measured, the strip ran concrete pad (z 47.3-58.8) → **dirt** (58.8-64.0) → gravel road (64.0-71.6) → **dirt** (71.6-73.0) → energy center wall.
- **The cross road is asphalt now**, across its whole 197 m run so the surface does not change mid-road. It meets the middle road and the east road at the same height and material, so the junctions stay clean, and its ends are unchanged.
- **The two dirt strips are concrete aprons** (`pad(…, 0xc9ccd1)` - the concrete layer at `GY('pad')`, with the pads' own forward-pulled material, matching the distillation pad beside them):
  - x -74…-21, z 58.8 → the road's north edge, tying the distillation pad's south curb down to the pavement;
  - x -55…-21, z the road's south edge → 73.2, the apron along the energy center's north wall, in front of its roll-up door (x -29.7) and man door (x -32.4).
  Both stop exactly at `CZR ∓ 3.8` (the road's half width), so the road stays visible between them and nothing is drawn over it. The gap now reads: concrete pad, concrete apron, asphalt road, concrete apron, energy center.
- Tests: `validate-ground-layers.cjs` now asserts the cross road is asphalt (and that no gravel surface is left in that gap), and pins both aprons *with their bounds computed from `CZR`*, so a future road-width change cannot leave an apron covering the pavement.
- Verified locally and in a clean clone: 10 repo-root suites + 8 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.90` / `corn-souls-test-shell-v117`.


- Follow-up to the v1.97.87 ground-texture fix. Only the ground canvases were tagged; the other **33 canvas colour textures** - tank and door nameplates, door signs, equipment plates, the office tiles and wall sheeting, vehicle camo, the tote label, the pigeon and critter sprites, clouds, the crack and broken-glass decals, the flow/slurry texture, the digit readout, the reserved-space ground labels - were still untagged, so against a corrected ground they read washed out (sRGB pixels used as linear, then encoded again on the way out).
- One helper writes the rule down: `const srgbTex = t => { if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; return t; };` and every authored colour canvas goes through it. **Additive glow ramps and alpha masks are deliberately left linear** (exit-sign halos, the rail-crossing glow, ammonia puffs, wind dust, the extinguisher spray, the flame sprite, the radial glows): they are luminance, not colour, and brightening them is the point. The `TextureLoader` paths already tagged themselves (glTF embedded images, the tote photos).
- Expected look: signs, plates and decals get their real colour back, matching the ground. Nothing else changes - alpha, geometry and layout are untouched.
- Tests: `test/validate-ground-layers.cjs` now enforces the rule itself - it walks every `new T.CanvasTexture(` in the game and fails if one is neither wrapped in `srgbTex(`, tagged on the line or the next two, nor one of the four deliberate ramp helpers, and it pins the helper's existence so the rule stays written down once. `validate-west-wing.cjs`'s isolated harness gained a passthrough `srgbTex`, since its slice of the build now calls it.
- Bumped TEST to `1.97.89` / `corn-souls-test-shell-v116`.


- Review of v1.97.87 (owner had Codex do it). Two instanced *painted* markings were still placed by literal height: the shop-lot stall lines and the highway lane divider dashes, both at `y 0.032` with a 2 cm box - so the box top stood 2 mm proud of the 4 cm pavement, and with the asphalt pulled 12 depth steps forward they flickered or vanished at range. Both now sit on `GY('paint')` like every other marking, so they are 7 mm clear of the surface they are painted on.
- `test/validate-ground-layers.cjs` grew a markings section: it pins the highway yellow/white edge lines, the highway lane dashes and the shop-lot stall lines to the paint layer, forbids a `0.032` marking height anywhere, and guards the sRGB tag below. (The v1.97.87 edge-line fix is pinned there too, so a future layer change cannot sink them again.)
- Bumped TEST to `1.97.88` / `corn-souls-test-shell-v115`.

## TEST v1.97.87 — the ground textures get their sRGB tag back, and the highway edge lines come back above the pavement (2026-11-01)
- Owner had Codex make this one; reviewed here against the v1.97.86 tree and re-run through the whole suite.
- **`groundTex()` was never tagging its canvases sRGB.** The statement `if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;` had ended up *inside the trailing `//` comment* on the anisotropy line, so it was dead code and the grass/dirt/asphalt/gravel textures were read as linear. With `renderer.outputColorSpace` at sRGB that meant sRGB-encoded pixels were used as linear and encoded again on the way out - the washed-out look. It is a statement of its own again, so the ground renders the colour the canvas actually painted.
- The **highway yellow and white edge lines** were still at `y 0.032` while v1.97.86 lifted the pavement to `GY('asphalt')` = 0.040, so they had sunk under the asphalt they line. They now take `GY('paint')`, like the other road markings.
- The commit message also mentions hit detection; the diff contains no hit-detection change - it is those two hunks plus the TEST version/cache bump (`1.97.87`, `corn-souls-test-shell-v114`).


- Owner: some of the paved roads are gone between the energy center and the process building.
- **It was a layer-ordering bug, not a missing road.** The ground is a stack of thin planes and every one of them except grass was given the *same* depth pull (`polygonOffsetUnits: -8`), so wherever two overlays coincide the **height** decided the depth test. The dirt yard sat at **y 0.035** - 1.1 cm *above* the asphalt and gravel roads at 0.024 - so the dirt won everywhere it overlapped them. Up to v1.97.80 the slope term in the polygon offset (`factor: ±16`) dragged the road surfaces forward and hid the mistake; when that term was removed (it was walking floors out of the depth range at distance) height alone decided, which is why the surface vanished up close and then fought the dirt at range - "some of the roads are gone".
- The road you were looking at is the proof: the **cross road at `CZR = 67.8`** (`:5632`) runs from `MXR -125` to `EXR 72`, i.e. exactly between the process building (south wall `z 44`) and the energy center (`z 73…149`), and it was built at 0.024 under the dirt. The middle road (`x -125`), the loop's inner half, the tank farm's gravel loop (its dirt slab top was 0.03) and **every lane dash** (0.03) were in the same state.
- **Fix: one ground layer table.** `GLAYER = { grass: [0, 8], dirt: [0.016, -8], dirtroad: [0.030, -10], asphalt: [0.040, -12], paint: [0.047, -14], pad: [0.080, -16] }` now holds both the height **and** the depth pull of every flat overlay, so the order is a fact of the data instead of magic numbers that disagreed - and because the pull gets stronger with every layer, a higher layer wins even where two planes are nearly coplanar. `groundMat()` takes its pull from the table, `padMat()` uses the pad entry, and `rd()`, the corners, the cross road, the grain yard, the scale exit road, the shop lot and driveways, the rail dump, the highway strips, the cooling-tower hardstand, the pond forecourt and the Ranger dust track all take their height from `GY(kind)`.
- The yard and the tank-farm dirt went **down** to the dirt layer (0.016), the roads came **up** to 0.040, and the white/yellow road markings moved onto the paint layer (0.047) so they no longer sink into the asphalt they mark. Boxes (curbs, slabs, scale decks, walkways) were left alone - they are solid, so their top surfaces are already above the top layer.
- Tests: new `test/validate-ground-layers.cjs` (8th `test/` suite, wired into CI) reads the table out of the game and asserts six layers in order bottom-to-top, a >=5 mm gap and a strictly stronger depth pull at every step, that `groundMat` takes its pull from it and that the old slope term is gone, that the yard/tank-farm/roads/dashes/pads/strip/dust-track all use their layer, that no overlay keeps a hand-written 0.024/0.028/0.031/0.035 height, and it runs `GY`/`GB` to prove they read the table. The layer-order block in the machines suite now reads `GLAYER` instead of restating stale numbers, and the interior-dark suite follows the new pull expression.
- Verified locally and in a clean clone: 10 repo-root suites + 8 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.86` / `corn-souls-test-shell-v113`.


- Owner: the shotgun is still not visible, and firing one paintball leaves it hanging in mid-air and then you cannot fire again.
- **First, the paintball maths is fine.** I pulled `fire()` and `updateBalls()` out of the build and ran them in a harness against the real THREE: the ball spawns at the muzzle (0.25, 1.52, -1.17), gets 65 m/s along the crosshair and travels ~1 m per 60 Hz frame, and `fire()` keeps working once the pump has been racked. So whatever is happening in the browser is not the ball logic - it is something in the frame chain throwing or the clock stopping, and both of those used to be invisible.
- **The frame tail is now failure-proof** (`stepSafe(name, fn)`): every sub-update in the per-frame chain - birds, critters, thrown bodies, vehicle roofs, doors, cooling tower, damage, extinguisher, acid, vulture, vending, Kia, radio, scarecrows, plumes, ammonia, **balls**, **gun**, ragdolls, net, billboards, sky, outage - runs guarded. A throw now costs that one update, is counted (`P3.perf.errs`, `P3.perf.err`, `P3.perf.msg`), is logged once (and again at 64) with its stack via `console.error('[update:<name>] failed n×', e)`, and is **named on the fps line** as `· !balls×3`. Before this, one throw in any of them silently took the render, the first-person gun and the paint-gun pump cooldown down with it - which is exactly a frozen ball plus "cannot fire anymore".
- **The first-person pass is drawn even when the world update throws**: `P3.drawHud()` is on the bridge and the frame loop calls it in the catch, so the gun cannot vanish because a sub-system died.
- **A stray entry in the ball list is dropped** instead of throwing every frame (`if (!B || !B.m || !B.v) { balls.splice(i, 1); continue; }`).
- **The fps line now diagnoses itself**: `58 fps  436 dc  1.1M tri  7.2 ms · high` plus, only when true, `· PAUSED` (a modal is swallowing the clock: `dt` is 0, so the ball would hang and the pump would never re-cock), `· noGun` (you are walking in first person holding the gun but its mesh is not visible), `· !<update>×n` (a guarded update is failing). `P3.viewmodel` exposes `{ held, third, gun, parent, scene, draw }` for the same reason.
- Tests: `test/validate-performance.cjs` gained the guard section - it pins `stepSafe`, the guarded calls for balls/gun/birds/power, the stray-ball drop, `drawHud` on the bridge and in the frame catch, `P3.viewmodel`, and the PAUSED / noGun badges; and it runs `stepSafe()` itself with a throwing callback to prove the next update still runs and the failure is counted, named and its message kept. The machines suite's frame-loop assertions were updated to the guarded form.
- Verified locally and in a clean clone: 10 repo-root suites + 7 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.85` / `corn-souls-test-shell-v112`.


- Owner: check the code to increase performance.
- **The fps readout was lying.** three.js resets `renderer.info` at the start of every `render()` call, and the HUD pass is the last render of the frame, so `P3.drawCalls`/`triCount` - read once a second by the `#fps` line - were reporting the **HUD pass only, 1-3 draw calls**, no matter what the world cost. With `renderer.info.autoReset = false` and one `renderer.info.reset()` of our own, placed just before the world render, the counters now cover the **shadow pass + world** together. The line reads `58 fps  436 dc  1.1M tri  7.2 ms`, where the ms is the whole frame body (sim + both passes + HUD), and `P3.perf` exposes `dc`, `tri`, `draw`, `frame`, `casters` and `compile`.
- **The shadow map was redrawn every single frame.** The whole caster set went through the shadow pass 60-144 times a second while the sun only moves when Squeeg crosses a whole shadow texel (`shadowFollow()` snaps it to the texel grid) or every 20 s (`daylight()`). Now `renderer.shadowMap.autoUpdate = false` and `shadowRefresh()` asks for a pass only when the box actually stepped, or every `TIER.shadowEvery`-th frame (1 high / 2 medium+low) so moving vehicles, the train and NPCs still cast live shadows, plus the first 10 frames while the world settles. The flag is consumed, so nothing is redrawn twice for the same picture.
- **Quality tiers** (the table `LIGHTING.md` §Tiers already specified, now real): `perfTier()` picks low/medium/high from `maxTouchPoints` / `deviceMemory` / `hardwareConcurrency` / screen width **before the WebGL context is created**, and `localStorage.cs_perf` (`'low' | 'medium' | 'high'`) overrides the guess. Low 1024 `BasicShadowMap` (1 tap per pixel instead of 9), 1.0 pixel ratio, no MSAA, 60 fps cap. Medium 2048 PCF, 1.25 ratio, MSAA, 90 cap. High is exactly what shipped before: 2048 PCF, `min(dpr, 1.5)`, MSAA, 144 cap, `powerPreference: 'high-performance'`.
- **Imported models are Lambert now** (`MODEL_PBR = TIER.pbr`, off): the glTF reader only ever set a base colour, a colour map and `DoubleSide` - no normal, emissive or opacity channel - so `MeshStandardMaterial` (metalness 1) was paying the most expensive fragment path in the game and, with no environment map to reflect, rendering metal almost black. Lambert draws the same inputs, cheaper. Flip `pbr: true` on a tier to go back.
- **Shaders are compiled once at build time** (`renderer.compile(scene, camera)` right after `mergeStatic()`, timed into `PERF.compile`), so the first paintball, first fire or the first power outage no longer compiles a program in the middle of a frame and drops it.
- Tests: new `test/validate-performance.cjs` (7th `test/` suite, wired into CI) - it runs `perfTier()` itself against fake phones/tablets/desktops and asserts the table and that the override wins, ignores an unknown value and survives a throwing `localStorage`; runs `shadowRefresh()` frame by frame to prove the warm-up frames draw, a still sun draws every second frame on medium, a texel step draws immediately and the request is consumed; and pins the source wiring (`autoUpdate = false`, `info.autoReset = false`, the reset before the world render, the tier-driven pixel ratio / shadow size / filter / frame cap, no unconditional `antialias: true`, the compile after the merge, the caster count, the Lambert branch).
- Verified locally and in a clean clone: 10 repo-root suites + 7 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.84` / `corn-souls-test-shell-v111`.


- Owner, after v1.97.82: **no first-person items render at all** - no shotgun, no squeegee, and you cannot even see your hand - and switching to third person showed the red Squeeg box with **an orange model standing inside it**.
- Root cause of the empty hands: every first-person item was parented to the **world camera**, whose near plane is **1 m** (that is what keeps the depth buffer usable out to the 9 km horizon and it is what the ground layering depends on). The hand sits 0.30-0.45 m from the eye and the squeegee's blade 1.7 m, the tool heads 0.55 m - everything nearer than a metre was clipped away, so the player looked empty-handed even though the items were there and animating.
- Fix: **one HUD scene for every first-person item**. `ensureHud()` owns `hudScene`/`hudCam`/its two lights and `makeGun()` uses it, so the hand (`makeHand`), the squeegee (`makeSqueegee`), the power washer (`makeWasher`), the pegboard tools (`makeTool`) and the extinguisher (`makeExtHud`) are all built straight into it (`ensureHud().add(g)`) - it has a **1 cm** near plane, so nothing is clipped. The world camera's near plane stays at 1 m.
- A carried special item (`SR.g`) no longer falls back to the camera either: `srAttach(ensureHud(), ...)` and the 1P/3P switch use `ensureHud()` instead of `hudScene || camera`, so a picked-up can or corpse can never be born inside the near plane.
- `drawHudGun()` now draws the post-world pass when **any** held item is up, not just the shotgun: `let any = SR.carry === 'me' || (gun && gun.visible); if (!any) for (const k in heldG) ...`. TEST's loader patch for this line was already obsolete, so it is gone from `test/index.html`; LIVE keeps its patch until it is promoted.
- The double character: `dressPlayer()` removes the box body (as of v1.97.64) and now also **switches off every child of the avatar that is not the rig and not a held item** (`if (c !== g && !c.userData.item) c.visible = false`), so a box part that somehow escaped the `userData.body` marker can never be seen standing inside the rig. Held-item groups are tagged `userData.item` on both avatars (own and remote) so the dressing leaves them alone, and `buildSelfAv()` sweeps a **stray self avatar** out of the scene (`if (o.userData.selfAv) scene.remove(o)`) so a half-finished rebuild cannot leave a second body behind.
- Tests: `validate-traffic.cjs` pins the five `ensureHud().add(g)` call sites, the absence of `camera.add(g)` and of `hudScene || camera`, and that `drawHudGun()` consults `heldG` (it checks the LIVE arrangement too, which lags until promotion); `validate-power-outage-machines.cjs` pins the two new `dressPlayer`/`buildSelfAv` guards and runs `dressPlayer()` on an avatar carrying a tagged held item plus a stray group - the item stays visible, the stray is switched off.
- Verified locally and in a clean clone: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.83` / `corn-souls-test-shell-v110`.


- Owner: X should drop the corpse you are holding, B should eat, fire should throw.
- **X** (`critterPick()`) now carries a corpse and, pressed again, **puts it down** - `deadDrop()` detaches it, snaps it to the floor at your feet and lays it belly-up, instead of swallowing it. It still picks up from 2.2 m across critters, fallen pigeons and dead pond frogs.
- **B** (`critterEat()`) eats: the corpse leaves the world (`state = 'gone'`). B still closes an open panel first, so it doesn't do two things at once, and the PC keyboard now has a **b** key for it (it had no key at all before - B was Escape/Backspace only).
- **Fire** (`critterThrow()`) throws: the corpse is detached at 0.7 m in front of the camera and given the view direction x 9 m/s plus 3.4 m/s of lift, with a random tumble. `updateThrown()` integrates a real 9.8 m/s2 arc every frame, and when the body reaches the floor it settles belly-up, clears `o.thrown` and gets its 45 s clean-up timer back - so a thrown body is an ordinary corpse again. Fire falls through to the tool whenever your hands are empty, so nothing else about shooting changed.
- The prompt says all three: *"Picked up the dead rat - X to put it down, B to eat it, fire to throw it."*
- A body thrown while dead or driving is impossible by construction: `deadDrop()` already puts it down when you die or get into a vehicle.
- Tests: the machines suite pins the three verbs, the bridge exports, the B key, the fire fall-through and the landing rule, and runs `updateThrown()` itself over a stand-in corpse - it starts up, travels forward, lands at 0.06 m, ends with the timer back at 45 s and the throw list empty.
- Verified locally and in a clean clone: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.82` / `corn-souls-test-shell-v109`.

## TEST v1.97.81 — the fermenters do not drain through pipes lying outside them (2026-11-01)
- Owner, pointing at the pipe run along the concrete in front of the fermenter columns: remove it, that is not how the ferms connect to each other or to the beer well.
- It was the **beer drain** assembly: two 0.7 m runs down the outside of both columns (`drW` on the west, `drE` on the east), a 0.7 m stub off every single tank, a riser climbing the office wall to `BWH + 3`, a run across at that height and a drop into the beer well, plus the steel support post that carried the riser.
- All of it is gone, together with the two flow animations that rode it (`O.fBeerW`, `O.fBeerE`) and the `anyDrain` gate that drove them - leaving those would have had orbs flying along pipes that no longer exist.
- The **drain itself is untouched**: a fermenter still drains to the beer well in the plant model, on its own clock, stopped by `dead()` on an outage like every other unit. This was scenery, not plumbing in the simulation.
- `DXW` / `DXE` stay: they are only numbers, and they size the concrete under the fermentation area.
- Tests: the machines suite now asserts that neither run, the wall riser, the support post, the per-tank stubs or the flow objects come back, that the pad is still sized from `DXW`/`DXE`, and its gated-subsystem list no longer expects the beer-drain gate.
- Verified locally and in a clean clone: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.81` / `corn-souls-test-shell-v108`.

## TEST v1.97.80 — the floor really does stop rendering at a distance (2026-11-01)
- Report: the concrete is still wrong, and now it also stops rendering at a distance *inside buildings*.
- **The floor was being clipped, not z-fighting.** `polygonOffset` adds `factor x slope + units x resolution`. Both the ground layering and the concrete pads used `factor = ±16`, and a floor viewed along its own plane has an almost **infinite depth slope** - the further away it is and the flatter the angle, the bigger the offset. That offset was added to the fragment depth, walked the concrete straight out of the clip range, and those fragments were **discarded**. Hence a hard edge where the floor simply stopped, at a distance that depended on your eye height and pitch - and it happened indoors as well, where long floors are seen at the flattest angles.
- **The fix: no slope term at all.** `groundMat()` is now `polygonOffsetFactor: 0, polygonOffsetUnits: back ? 8 : -8` (grass pushed back 8 resolution steps, dirt/asphalt pulled forward 8) and `padMat()` is `factor 0, units -12`. Resolution-step offsets are bounded by the depth buffer's own precision, so they cannot run away at any angle.
- The real separation is geometric and was never the problem: 3.5 cm between grass and dirt, 4.5 cm to the pads, 8 cm to a pad above the dirt. Depth precision at 200 m is ~2 mm and at 500 m ~15 mm, so the layers resolve on their own; fog is opaque from 760 m anyway.
- Tests: `/validate-interior-dark.cjs` now pins that no slope factor survives on either layering, that the offsets are resolution-relative, and that the reason is written next to the code.
- Verified locally and in a clean clone: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.80` / `corn-souls-test-shell-v107`.

## TEST v1.97.79 — jump onto a vehicle and stand on its roof (2026-11-01)
- Owner request: the player should be able to jump and stand on the Ranger and the other vehicles.
- **Half of it already worked.** `vehPush()` skips a vehicle the moment you are above it (`ly > b.max.y - 0.3`), so nothing shoved you off once you were up there - but there was **no floor**: `floorAt()` found the ground under the car, so you fell straight through the roof.
- **`updateVehTops()`** gives every vehicle in `VBOXES` a **walk surface that follows it**: one `WALK_SURF` entry per vehicle, created once and rewritten every frame with the vehicle's **world AABB** (its local box transformed through the group's matrix) and its roof height. It runs in the per-frame update before the player moves.
- **The Ranger is now registered** with `regVehBox()` in `buildUTV()`, so it gets the same solid box *and* the same roof. Registering it also replaces the old three-circle approximation the UTV used for being walked into - and that push-out is now skipped above 1.2 m, so it cannot shove you off its own roof.
- **Rebuilding it is safe**: `buildUTV()` prunes any `VBOXES` entry (and its walk surface) that belonged to the old group, so a respawn or a 2-player swap cannot leave a phantom solid and a floating roof behind at the old spot.
- The parked cars, the mower and anything else that goes through `regVehBox()` get roofs for free.
- Tests pin the per-frame follower, the world-AABB maths, the one-surface-per-vehicle rule, the Ranger's registration, the height guard on its old push-out and the rebuild pruning.
- Verified locally and in a clean clone: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.79` / `corn-souls-test-shell-v106`.

## TEST v1.97.78 — killing a critter, carrying the corpse and eating it (2026-11-01)
- Owner request: after killing a critter and picking up the corpse, it can be eaten.
- **Nothing could pick a corpse up before.** Critters, fallen pigeons and dead pond frogs were killed, flopped, cleaned themselves up after 45 s and that was it - `hitCritter()`/`hitBird()` set the state but no interaction ever looked at them.
- **`critterPick()`** (X, exposed as `Plant3D.critterPick`) finds the nearest corpse within **2.2 m** - a critter in the `hit` state, a pigeon in `fall`, a frog no longer `live` - and takes it into your hands: the group is `camera.attach`ed, so you carry it in front of you at (0.3, -0.3, -0.6), and the prompt says *"Picked up the dead rat - X again to eat it."*
- **X again eats it**: the corpse is removed from the world, its state goes to `gone` and the flag clears - *"You ate the rat."* No new inventory, no invented hunger or health numbers: eating simply takes the corpse out of the world, which is what was asked for.
- A carried corpse is already **exempt from the clean-up timer** because those updates skip anything with `held` set - the same flag that stops a thrown body being reclaimed - so it cannot evaporate out of your hands.
- **It is put down** if you die or get into a vehicle (`deadDrop()`), so a corpse can never be welded to the camera across a death or a drive.
- Tests pin the corpse search (all three kinds), the carry attachment, both messages, the clean-up exemption and the put-down.
- Verified locally and in a clean clone: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.78` / `corn-souls-test-shell-v105`.

## TEST v1.97.77 — the pond dirt loop stops cutting through the corn circle and actually meets the pavement (2026-11-01)
- Owner request: the dirt road round the ponds should not go through the corn circle, it should connect to the pavement on the west side once both sides of the loop meet, and it should connect to the east-west road over the tracks just north of the tank farm.
- **It ran straight through the pivot circle.** The circle is centred on (-675, -99) with a **344 m radius**, so its southern edge reaches z 245; the old track ran at z 190-200 from x -420 to -700, i.e. up to **32 m inside** the corn. The west leg now dips south around it and around the ponds' north-west corner: it keeps **22 m** off the circle (sampled every 2 m along the whole polyline, not just at the nodes) and 7 m off the pond edges, then rejoins the existing west-side run at (-742, 345).
- **It stopped 17 m short of the asphalt.** The paved south road - the east-west road just north of the tank farm, the one that runs over the railroad tracks - ends at x -235, and the dirt began at x -252. The first node now sits **on the pavement at (-225, 185)**, so the loop is joined to the road network.
- The unit-train loop's east side runs at x -240, which is why the join is at -225: the crossing is now a **segment** between nodes (a dirt level crossing, where it belongs) so every node still clears the track by 10 m and the ponds by 8 m, as the existing CI rules require.
- The comment explaining the route sits **above** the `DIRT_ROADS` array - CI parses that array as JSON, so a comment inside it breaks the build (it caught me once).
- Tests: the existing node rules (pond 8 m, track 10 m) still pass, and a new check samples **every segment** of all three legs and fails if the loop comes within 15 m of the corn circle or 2 m of a pond edge - so this cannot be routed back through the corn by accident.
- Verified locally and in a clean clone of the commit: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.77` / `corn-souls-test-shell-v104`.

## TEST v1.97.76 — a dead plant leaves the mash in the pipes (2026-11-01)
- Owner-reported: during an outage the mash pipes showed empty when they should still show mash, just not moving.
- Cause: `updateFlows()` hid the liquid tube whenever the flow rate was near zero (`f.mesh.visible = r > 0.02`). Every flow rate is derived from the simulation, and the simulation zeroes during an outage, so the whole plant's pipes went from a flowing stream to nothing - as if the pipes had been emptied.
- **A pipe now remembers that mash has been through it** (`f.wet`), stays visible once it has, and simply **stops scrolling** while nothing is flowing. Only a pipe that has never carried anything is hidden, so a fresh plant does not look full of mash before the first truck unloads.
- This covers everything that runs through the same liquid path - cooked mash, beer, water, the overflow lines - because they all animate through `updateFlows()`. Frozen is also physically right for an overflow line: it keeps what last went through it rather than draining.
- Tests pin the new rule in `validate-power-outage.cjs` (the pipe remembers, stays visible, only scrolls while flowing) and that the old one-line `visible = r > 0.02` rule is gone.
- Verified locally **and in a clean clone** of the commit: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.76` / `corn-souls-test-shell-v103`.

## TEST v1.97.75 — flat, walkable tops on the liq tanks and both final product tanks (2026-11-01)
- Owner request: the tops of Liq Tank 1 and 2 should be flat and walkable, and the same for both Final Product Tanks.
- **Nothing up there was standable.** `tank()` puts a **dome** on the shell, and the Final Product Tanks' `flat: true` was only a *squashed* dome (sphere scaled 0.25) - and it never pushed a `WALK_SURF` at all, so the tops were decoration.
- **`tankDeck(g, opt)`** gives a tank a proper top: a steel **deck disc flush with the rim** (`rim - 0.15`, 0.3 thick, so its surface is exactly `y0 + h`), a **yellow guardrail** (top and mid rail on posts, all the way round except a gap where the ladder lands), `wallSegs` along the rails so you cannot step off, a **caged ladder** from the ground to the rim with a `LADDERS` entry pointing inward, and a `WALK_SURF` over the deck.
- Applied to **Liq Tank 1, Liq Tank 2, Final Product Tank 1 and Final Product Tank 2**, each of which now passes `dome: false` (no cap sitting on the new deck) and `noRail: true` (the old torus-and-posts rail would have blocked the ladder). The squashed dome on the FP tanks is gone, so their tops are genuinely flat.
- The ladders land on the **north** side by default (`ang = -PI/2`), which is the yard side for all four; it is one argument per tank if any should face elsewhere.
- Tests pin the deck/rim relationship, the guardrail gap, the ladder and its `LADDERS` entry, the `WALK_SURF`, all four call sites, and that the domes and the old `flat: true` cap are gone.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.75` / `corn-souls-test-shell-v102`.

## TEST v1.97.74 — the tin-bin tops are joined up, with plant-side ladders on bins 2 and 4 (2026-11-01)
- Owner request: a walkway from the top of Tin Bin 2 to Tin Bin 3 and from Tin Bin 3 to Tin Bin 4, and a ladder up to the tops of Tin Bin 4 and Tin Bin 2.
- **The roofs were already walkable** - `siloClimb()` lays a roof disc, a yellow eave guardrail and a `WALK_SURF` disc for each bin - but nothing joined them (the source even said "not connected yet"), so each top was an island.
- **`binWalkway(xa, za, xb, zb, y)`** builds a 1.4 m grating deck at the roof height with handrails, posts, toe boards and a `WALK_SURF`, and pushes `wallSegs` along both rails so you cannot step off. The two bridges are measured from the bins themselves (`rimOf()` intersects the line between two centres with each radius), so they stay correct if a bin is ever moved: **Tin Bin 2 -> 3 is 2.76 m** and **Tin Bin 3 -> 4 is 2.00 m**, both at `SILOH + 0.15` - the same height `siloClimb` lays the roofs at, so the deck is flush.
- **`siloClimb()` gained a `gaps` list**: the eave guardrail now opens wherever a walkway leaves or a new ladder meets it (it previously only had the one gap for its own west ladder). Without that you would climb or walk straight into a fence.
- **`siloLadderAt(x, z, R, H, ang)`** puts the same ladder-and-cage on any side of a bin (the built-in one is welded to the west); Tin Bin 2 and Tin Bin 4 each get one on the **plant side** (angle 0, east) and a `LADDERS` entry pointing inward, so all four tops are reachable from the yard, in both directions.
- Tests pin the helpers, both bridges and their height, the rim-derived ends, the two new ladders, the guardrail gaps and the deck's walk/clip data.
- Verified locally: 10 repo-root suites + 6 `test/` suites pass, anchors pass.
- Bumped TEST to `1.97.74` / `corn-souls-test-shell-v101`.

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
