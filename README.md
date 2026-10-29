# Corn Souls

Play: https://crazylegsmalone.github.io/corn-souls/

The game website (one-file build plus an offline service worker). The Android app loads it from here, so each new build reaches every device without reinstalling.


## Android app installs and release workflow

The LIVE and TEST builds are hosted in separate folders **in this repository**:

| Channel | App URL | Install browser | Manifest identity | Worker scope |
| --- | --- | --- | --- | --- |
| LIVE | https://crazylegsmalone.github.io/corn-souls/ | Chrome | `/corn-souls/` | `/corn-souls/` |
| TEST | https://crazylegsmalone.github.io/corn-souls/test/ | Microsoft Edge | `/corn-souls/test/` | `/corn-souls/test/` |

**First install on Android (Razr and Retroid):** Open Chrome *itself*,
navigate to the LIVE URL and use its menu to install. Then open **Edge
itself**, paste the TEST URL into Edge's address bar, and use Edge's
menu to add/install the app. Opening a link from a chat may launch the
default browser (Chrome), which is the wrong browser for TEST. If
Edge isn't installed, install it from a trusted app store first.

Android Chrome may refuse to install TEST alongside LIVE even with
different same-origin manifest identities. Installing one from Chrome
and the other from Edge avoids that observed conflict. **Folders alone
do not guarantee two Chrome installations.** Keep both folder URLs
stable, because the installed icons use those launch URLs.

**Normal updates:** No reinstall is needed for ordinary game changes.
Push TEST changes into `test/` first, verify code, and let testers open
their existing Edge TEST icon while online. After approval, promote to
LIVE, advance the Alpha version, and keep the Chrome LIVE icon
unchanged. Do not reset app identities or rename the manifest URLs,
app IDs, scopes, or service-worker files during routine releases.
Cache revisions may change without changing installation identities.

**Icons:** PWA launchers can cache icons independently of game code.
A new image on GitHub may not immediately replace an existing Android
launcher icon. Do not require reinstalling for ordinary code updates.
LIVE and TEST icon files are separate and should not be overwritten
with each other's art.

**Release safety:** Both builds share game code but use separate
index launchers, manifests, service workers, and asset paths.
The LIVE service worker must continue to exclude `/corn-souls/test/`
requests, and TEST must never register the LIVE worker or use LIVE's
manifest. Do not advance LIVE until TEST has been approved.

## Third-party assets and credits

- [Player-visible asset credits](credits.html)
- [Asset licensing and provenance policy](ASSET_POLICY.md)
- [Machine-readable asset register](assets/registry.json)
- [Human-readable credits](CREDITS.md)

**No downloaded model may be shipped until the license, provenance, modifications, distribution permissions, and required credits are checked and recorded.**
