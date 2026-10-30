# Corn Souls — Third-Party Asset Credits

This file lists externally sourced 3D assets shipped in the Corn Souls repository (`assets/models/`). Asset selection, licensing evidence, and rejected candidates are tracked in [assets/registry.json](assets/registry.json) under the rules in [ASSET_POLICY.md](ASSET_POLICY.md) and displayed to players on [credits.html](credits.html).

## Shipped 3D Models (`assets/models/`)

- **“Horror Game Crowbar”** — by **hvarley** ([Sketchfab source](https://sketchfab.com/3d-models/horror-game-crowbar-0fbfdfd2a53e40be9ca3ffde55d71689)). Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Modifications: Normalized scale, centered origin, and rotated at runtime for first-person HUD, third-person hand, and shop pegboard mounts; original GLB geometry and texture unchanged. No endorsement implied.
- **“psx fire extinguisher”** — by **zynxeror** ([Sketchfab source](https://sketchfab.com/3d-models/psx-fire-extinguisher-e786b75a860c45c69590403504956a9a)). Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Modifications: Normalized scale, rotated upright, and instanced at runtime for usable extinguisher posts, decorative wall mounts, and first-person held HUD; original GLB geometry and texture unchanged. No endorsement implied.
- **“Corn Cube”** — by **tg** ([Sketchfab source](https://sketchfab.com/3d-models/corn-cube-a4210ecd049546b79cf68cfd796c5883)). Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Modifications: Resized, centered, instanced, and paired with a runtime dark-green edge outline for throwable novelty blocks outside the scale house and grain receiving building; original GLB mesh/texture unchanged. No endorsement implied.
- **“Corn (Low Poly)”** — by **Low Poly Fox** ([Sketchfab source](https://sketchfab.com/3d-models/corn-low-poly-c640a2fbe4914b8092b2f3aff0dbf538)). Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Modifications: Resized, centered, and instanced at runtime for throwable corn ears in trash cans outside the scale house and grain receiving building; original GLB mesh/texture unchanged. No endorsement implied.
- **“Pallet”** — by **Thingits** ([Sketchfab source](https://sketchfab.com/3d-models/pallet-dfa3a345c6924a5683404d4817396621)). Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Modifications: None; original GLB stored in `assets/models/pallet.glb`. No endorsement implied.

## Attribution template

**“Asset Title”** — by Creator ([source](https://example.com/)). [License Name](https://creativecommons.org/licenses/by/4.0/). Modifications: describe exactly what changed. No endorsement implied.

## Historical audit
- [x] Register and credit all 5 GLB models in `assets/models/`.
- [ ] Audit any pre-existing embedded textures, sounds, fonts, and icons in `game.html` for third-party sources.
