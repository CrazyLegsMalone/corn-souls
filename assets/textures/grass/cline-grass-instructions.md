# Cline task: Add low-cost PSX grass

Inspect the project first. Reuse its terrain, foliage, material, asset-loading, and visibility systems where possible. Find the existing render/debug counters and use the project's scene units and coordinate convention. Implement a small, playable test patch using the supplied assets.

## Assets and placement

- Import `psx-grass-atlas.png` as a single 128 × 64 RGBA texture. Use `grass-manifest.json` for the six frame rectangles and shared ground anchor. The separate PNGs are available for editing or engine import.
- Use nearest-neighbor sampling and a cutout material with an initial alpha threshold of 0.5, depth testing and depth writes enabled. Disable translucent blending. Use clamp addressing and keep UVs inside each frame. Start without atlas mipmaps. If distant shimmer needs mipmaps, use alpha-coverage-preserving mips and tile padding, then check for bleed.
- Default to one upright quad per short tuft. Face it toward the camera around the world-up axis only. Put its ground anchor on the terrain so it stays rooted as the camera orbits. Use crossed quads only for selected tall tufts, behind a setting.
- Pick variants, scale, and modest tint variation from a stable per-instance seed. Place tufts in irregular patches, leaving bare ground between them. Avoid roads, buildings, and steep or blocked surfaces using the project's existing placement rules.

## Performance

- Instance or batch by spatial chunk with the shared atlas and material. Pass the frame, tint, and scale as per-instance data. Avoid creating a separate material or gameplay entity for each tuft. Grass is decorative and needs no colliders.
- Cull chunks against the view and cap grass draw distance. Make density and draw distance configurable. Start sparse and tune at ground level, where overlapping tufts cost the most. Use the terrain texture to carry the grass look beyond the cutoff.
- Profile the same camera route with grass off and on. Check frame time, draw calls, and visible instances. Test a low angle looking across the densest patch. If the cost is too high, reduce density and draw distance before increasing rendering complexity.

## Done when

- The test patch shows all six variants without atlas bleed or floating roots.
- Tufts stay upright and rooted during a full camera orbit.
- Grass uses the shared atlas, batches by chunk, and culls beyond the configured distance.
- The final handoff names the modified files, exposes the density and distance settings, and reports any measured before/after performance. If the project cannot run locally, state which checks still need to be run.
