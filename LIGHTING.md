# Lighting: where it is, and the rework design (parked)

**Status: parked by the owner on 2026-11-01** ("lighting is ok"). Nothing here is broken — the
current outage dimming ships and is tested. This file is the design for the *next* lighting pass so it
does not have to be re-derived. Phase 0 of it is already done (v1.97.60).

---

## 1. The constraint that shapes everything

There is **no baked light and no occlusion** in this renderer. Lighting is one `HemisphereLight`
(`hemi`) + one shadowed `DirectionalLight` (`sunL`) + the player's `SpotLight` headlamp, on a forward
renderer with mostly `MeshLambertMaterial`. Nothing knows "indoors" from "outdoors", so without help
a room whose power is off is lit by the sky exactly like the yard.

Cost model: in a forward renderer every extra light costs per-fragment on every lit material, and
every extra mesh costs a draw submission. So "many light sources" must be **faked** (emissive +
baked terms), not added.

Mobile is a real target (touch UI, safe-area insets, `powerPreference: 'low-power'` fallback,
pixel-ratio capped at 1.5, plain PCF "cheaper per pixel on phones"). Floor: 2020+ mid-range Android
and iPhone 12+.

---

## 2. What exists today (v1.97.61)

**Outage = fixtures only.** `setPowerOutage(on)` walks the scene and dims every material flagged
`gridLight` (lamps, screens, wall packs, halos); `batteryLight` (exit signs, strobes, radios, vehicle
lights) and `keepLit` (fires) survive. It deliberately never touches world lighting. Roll-up doors die
with the plant.

**Interior darkening (the stopgap, v1.97.59-60).** Every roofed building registers a volume and its
glazing, and on an outage each interior mesh is re-materialled to a dimmed clone:

```js
const ENCL = [];                                   // near wallSegs / wallMats
enclosure(x0, x1, z0, z1, top)                     // a roofed volume -> { x0,x1,z0,z1,top,wins[] }
glazing(e, x, y, z, r)                             // a daylight opening; light falls off over r metres
interiorLight(e, x, y, z) => 0.10 + 0.70 * max(1 - dist/r)     // 0.10 no daylight .. 0.80 at the glass
applyInteriorDark(on)                              // dims per mesh, restores exactly, idempotent
```

Registered: every shed built by the `building()` helper (10 call sites: shop-yard shed, energy centre,
the west building, N/S energy MCC, the EC control room, two turbine MCCs, the yard shed), plus the
process west block, the fermentation alley, the office block (nested inside the shed, with 4 windows),
the three shop roofs, the receiving building (truck bays) and the scale house (two drive-through
windows + the west doors). The innermost envelope containing a point wins, so a room inside a shed is
darker than the shed.

**Guards learned the hard way.** A mesh only counts as interior if its **bounding sphere fits inside**
the envelope — the ground is one 16 km plane whose origin sits at (0,0,0), inside the shop envelope,
which is why the whole yard used to go dark. Wall shells (`wallMats`) are skipped because
`setWallsSolid()` owns their opacity (walk = opaque, Savor = see-through); dimming them would leave a
wall see-through after switching to walk mode.

**Visibility.** The FPS readout shows `fps · draw calls · triangles`, via `Plant3D.drawCalls` /
`Plant3D.triCount` — the frame loop is in a later script block than the engine, so it must go through
that bridge, never `renderer` directly.

---

## 3. Known limits of the current approach

1. **Window glass dims.** Window panes are ordinary Lambert meshes (`glassM`, `glass()`), so they drop
   to 10% like everything else — the brightest thing in a dark room becomes one of the darkest.
2. **Walls stay full brightness.** They are the largest thing on screen and they do not dim, so a room
   reads as "lit room with dark furniture" rather than "no power".
3. **One value per mesh, sampled at its origin.** Floors are single big boxes (`slab(EW-WW, WZS-NZ, …)`
   is one 30x40 m box), so the whole floor takes one number and cannot show a pool of light under a
   window.
4. **Linear falloff with a hard stop at the radius** — the edge of the "bubble" can read as a contour.
5. **Windows only where hand-registered.** The EC control room's two windows ("South: window (west
   end)", "West: window over the middle desk") are not in the glazing list, so it stays dark except
   near its doors. The basement has no envelope of its own and inherits the receiving building's.

---

## 4. The design: a baked skylight field

One question, answered per voxel: **how much of the sky reaches this point?** Everything else
multiplies or adds on top.

- Rasterise the interior volume from the envelope registry + `wallSegs` (walls) + roofs (ceilings) +
  floors.
- Seed 1.0 at every glazing point, then propagate with **6 directional sweeps** (attenuation by
  distance, blocked by solids: walls block horizontally, roofs block from above).
- Pack to a `Data3DTexture` (R8). Outdoors is 1.0 **by construction**, so exteriors are untouched and
  the ground bug cannot come back.
- Sample it in the material shader (`onBeforeCompile`): world position -> voxel -> multiply.

Measured cost over the real envelopes:

| Envelope | 1.0 m voxels | 0.5 m | 0.33 m |
|---|---|---|---|
| process west block | 20,165 | 161,319 | 561,117 |
| ferm alley | 10,973 | 87,787 | 305,352 |
| shop floor | 13,446 | 107,568 | 374,155 |
| receiving | 6,480 | 51,840 | 180,316 |
| energy centre | 31,008 | 248,064 | 862,843 |
| control room + MCCs + scale house | 1,609 | 12,867 | 44,755 |
| **total** | **86,425** | **691,398** | **2,404,897** |
| **R8 memory** | **0.08 MB** | **0.66 MB** | **2.29 MB** |
| **6-sweep work** | 0.5 M ops | 4.1 M ops | 14.4 M ops |

At 0.5 m that is 0.66 MB and a bake measured in tens of milliseconds — one `texture3D` fetch per
fragment. This is *cheaper* than adding lights: zero extra draw calls, zero extra dynamic lights.

**Why not a vertex bake as the primary transport:** geometry here is `BoxGeometry`, i.e. 24 vertices,
4 per face. A 30x40 m floor slab has four usable samples — 17x coarser than a 0.5 m grid per axis
(289x fewer samples). Vertex colours would need every large surface tessellated first. Vertex baking
stays useful as the **mobile transport of the same field** (sample per vertex, interpolate) — one
bake, two transports.

### Layering rules (this is the part that must not be got wrong)

| System | Interaction |
|---|---|
| sun + hemi (day/night via `LOOKS`, weather multipliers in `daylight()`) | **multiplied** by the field — a windowed room brightens at noon, goes black at night, dims in rain, with no new wiring |
| exterior | field is 1.0 outside, so the yard keeps today's lighting at every hour |
| power outage | orthogonal: it kills `gridLight` fixtures; skylight is not power |
| headlamp | real `SpotLight`, added on top, **never multiplied**; shadows on Medium/High only |
| fires | promoted from unlit sprites to real flickering `PointLight`s from the light pool; not multiplied |
| fixtures/screens/exit signs | unlit emissive, unchanged; they die in an outage |

Shader detail: multiply **sky (ambient/hemi) and the sun**, leave point/spot alone. With exactly one
directional light that is a clean patch inside the directional branch of the light loop. Test for it:
*a spotlight in a room whose skylight term is 0.10 still lights that room.*

### Tiers (locked against the mobile floor)

| | Low (phone) | Medium | High (desktop) |
|---|---|---|---|
| field | 1.0 m, 0.08 MB | 0.5 m, 0.66 MB | 0.5 m |
| sampled | per vertex | per vertex | per pixel |
| dynamic lights (pool) | 2 | 4 | 8 |
| sun shadow | 1024, follows player | 2048, follows player | 2048, follows player |
| flashlight shadow | none, tight cone | 512 | 1024 |
| vignette/grain | CSS overlay (free) | CSS overlay | shader pass |
| pixel-ratio cap | 1.0 | 1.5 | 1.5 |

Tier chosen by `maxTouchPoints` / screen / `deviceMemory` / GPU string, **plus a manual override in
Settings** (heuristics always get someone wrong).

### Light pool (the other half of the design)

Fixtures become *data* (position, colour, radius, type). Each frame the nearest ~N (per tier, with
hysteresis and room-awareness so a fire outside cannot light a windowless room through a wall) own
real `PointLight`s; the rest are emissive geometry only. Cost stays constant however many fixtures
exist.

---

## 5. Phases

| Phase | Work | Status |
|---|---|---|
| 0 | perf floor: `mergeModel()` (imported models: boiler 258 parts -> 11 meshes, 258 -> 0 shadow casters, identical triangles/bounds, 32 ms; ~1032 -> ~22 submissions for both boilers), shadows off for interior models, `matrixAutoUpdate` off on statics, sun shadow follows the player, draw-call readout | **done (v1.97.60)** |
| 1 | light registry + pool + mood state machine (structure only) | not started |
| 2 | shadowed flashlight; sun shadow camera tightened | not started |
| 3 | the baked skylight field, replacing the per-mesh dim | not started (design above) |
| 4 | one cheap post pass (vignette, grain, contrast, pupil adaptation); light shafts, dust, height fog | not started |
| 5 | author the moods: daylight / overcast / night / storm / brownout / outage / emergency | not started |

Phase 3 practice, when it happens: build it behind a debug toggle with an A/B switch
(`field-pixel / field-vertex / current per-mesh dim / off`) and a readout of bake ms, MB, draw calls
and frame ms, prototyped on the office block (nested, corridors, 4 windows) and the scale-house tech
room (windows on opposite walls). Acceptance: no shader errors on Lambert/Phong/Standard, < 1 ms frame
cost on High, ~0 on Low, bake < 300 ms at 0.5 m and < 60 ms at 1.0 m, < 2 MB, visible pools where the
per-mesh dim is flat, and it toggles off with zero residue. If it wins, `applyInteriorDark()` is
deleted rather than kept alongside.

---

## 6. Non-goals

Deferred rendering, baked lightmaps with UV2 unwraps for procedural geometry, real-time GI,
shadow-casting point lights beyond the flashlight. All are days of work, fight the see-through-wall
art direction, and lose to the cheap tricks above on a browser budget.

Honest limits even after the rework: no shafts (daylight is a falloff, not a beam), no colour bounce
from fires or windows (the field is scalar), and dynamic lights other than the flashlight are not
shadowed.

---

## 7. Small fixes queued for whenever the next lighting pass runs

1. Never dim glazing — register window panes and `glass()` materials so they read as the light source.
2. Dim the wall shells too, capped (~0.55) and per-mesh cloned into `wallMats` so `setWallsSolid()`
   still drives them.
3. Smoothstep the falloff and widen the radii (windows ~5 m, bays ~7 m) to kill the bubble edge.
4. Floor spill patches — a flat gradient quad just inside each window, additive, outage-only.
5. Register the EC control room's two windows; give the basement its own (windowless) envelope.
6. Decide the shed rule: the `building()` helper currently counts its wall openings (roll-ups, bays)
   as daylight — defensible, but one deletion per side makes those halls pitch dark.

