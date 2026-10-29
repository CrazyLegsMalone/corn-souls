# Corn Souls — Third-Party Asset Policy

**Applies to Claude, ChatGPT, and anyone adding models, textures, audio, fonts, animations, icons, or other external assets.**

## Golden rule
**No third-party asset goes into a test or live game build without a registry entry and license review. No asset goes live unless its attribution and distribution conditions are satisfied.** Merely finding an asset on the internet, or seeing a download button, is not permission to use it.

## Source of truth
- `assets/registry.json`: machine-readable inventory, including approved assets and candidates (with `status`).
- `CREDITS.md`: human-readable public attribution list for **assets actually shipped**.
- `credits.html`: lightweight public credits page generated from the registry; lists only `in-use` entries.
- `DEVELOPMENT.md`: work handoff. Keep this policy and registry in mind every session.

## Before importing any asset
1. Record the **asset title, creator's handle/name, exact original item URL, source marketplace, license name/version and license URL**, and date checked.
2. Capture the **license evidence** (downloaded LICENSE/README, creator's permission, purchase receipt, or dated screenshot) in a private project archive when needed; record a reference to it in the registry. Never commit private receipts, account details or keys.
3. Check ownership/red flags: ripped franchise assets, official logos/characters, dubious uploader, contradictory terms, missing attribution details, third-party rights, or a license that doesn't permit intended use.
4. Check **commercial use, derivative edits, redistribution, hosting downloadable standalone files publicly**, and whether the license requires attribution or share-alike. Paid marketplaces often impose extra conditions. Hosting on a *public GitHub repository* can expose source files, so recheck direct-file distribution rights before committing.
5. Record the actual download version and original files (local/private archive), processing edits (recolor/retopology/texture compression), file names used in project, and who did the review.
6. Mark `candidate` until the rights and technical review are complete; mark `approved` after review, and `in-use` **only** when actually shipped and credited. Use `rejected` for unsuitable assets.
7. Add/update the credited entry in `CREDITS.md` and verify `credits.html` shows it **before** publishing. Keep notices attached when required.
8. Don't copy original files into a public repo if the license forbids redistributing standalone assets. Seek separate permission or use a compatible asset instead.

## License guidance — not a substitute for checking each asset's exact terms
- **CC0:** preferred. Usually no required attribution, though voluntary credit is welcome. Verify provenance and other rights.
- **CC BY 4.0:** allowed for commercial and modified uses with appropriate credit, a license link, notices if supplied, and indication of modifications. Do not imply endorsement.
- **CC BY-SA:** review separately; additional share-alike conditions may apply to modifications.
- **CC BY-NC / NC variants:** avoid; noncommercial restriction is incompatible with an unconstrained future commercial release.
- **CC BY-ND / ND variants:** avoid for assets that must be modified.
- **Editorial-only, unknown, all-rights-reserved:** do not import without specific permission.
- **Paid/marketplace licenses:** review the current license and redistribution restrictions individually; buying an asset does not transfer copyright.

## Public credit format
> “Asset Title” by Creator (Source URL). Licensed under LICENSE (License URL). Changes: DETAILS. No endorsement implied.

Also preserve supplied copyright and disclaimer notices where required. The relevant CC BY license and Creative Commons attribution guidance govern the actual legal requirements.

## Release gate (both assistants)
- Every third-party file added/changed has a corresponding registry entry.
- All shipped entries are `in-use` and have creator, source URL, license name/link, and modifications note.
- No `candidate` or `rejected` assets are accidentally embedded in the game.
- Player-accessible credits match all `in-use` entries.
- Licenses/permissions are documented and public-hosting restrictions checked.
- License evidence is retained privately where appropriate.
- An assistant should **never claim a specific model is approved based only on a search preview**.

## Current crowbar candidate
The Sketchfab *Horror Game Crowbar* by **hvarley** was shown by the owner in a screenshot as CC Attribution, 290 triangles / 173 vertices. It is **not yet imported**, so it must not be listed as shipped. Check its downloadable package, exact license version, ownership indicators, texture files, and hosting conditions before use.

## Primary references
- https://creativecommons.org/licenses/by/4.0/
- https://creativecommons.org/faq/
- https://sketchfab.com/developers/download-api/guidelines

*This is a workflow checklist, not legal advice. Review unusual licenses with a qualified professional before commercial launch.*
