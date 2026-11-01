#!/usr/bin/env python3
"""Verify the launcher patch contract against the game source.

Both launchers patch game.html with ordered string replacements. A replacement
whose anchor is missing either throws at load (guarded by includes()) or, worse,
silently does nothing. This checks every anchor without needing Node.

  python scripts/check_launcher_anchors.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAIRS = (("index.html", "game.html"), ("test/index.html", "test/game.html"))

LITERAL = re.compile(
    r"""html\.(includes|replace|replaceAll)\(\s*"""
    r"""(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\$])*)`)"""
)
HOOK = re.compile(r"const hook([A-F])='((?:\\.|[^'\\])*)'", re.S)
ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", "'": "'", '"': '"', "`": "`"}


def unescape(raw):
    out, i = [], 0
    while i < len(raw):
        if raw[i] == "\\" and i + 1 < len(raw):
            out.append(ESCAPES.get(raw[i + 1], raw[i + 1]))
            i += 2
        else:
            out.append(raw[i])
            i += 1
    return "".join(out)


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8").replace("\r\n", "\n")


failures = 0
for loader_rel, game_rel in PAIRS:
    loader, game = read(loader_rel), read(game_rel)
    checked = derived = replaces = 0

    for match in LITERAL.finditer(loader):
        kind = match.group(1)
        anchor = unescape(match.group(2) or match.group(3) or match.group(4) or "")
        if not anchor or len(anchor) > 4000:
            continue
        if anchor in game:
            checked += 1
        elif kind != "includes" or anchor not in loader:
            print(f"FAIL {loader_rel}: {kind} anchor not in {game_rel}: {anchor[:80]!r}")
            failures += 1
        else:
            derived += 1          # post-replacement verification of injected text
        replaces += kind != "includes"

    hooks = {m.group(1): unescape(m.group(2)) for m in HOOK.finditer(loader)}
    hook_bad = 0
    for key, value in hooks.items():
        if value in game or value in loader:
            continue
        print(f"FAIL {loader_rel}: hook{key} missing from {game_rel}: {value[:80]!r}")
        hook_bad += 1
    failures += hook_bad

    print(f"{loader_rel} -> {game_rel}: {checked} anchors OK, {derived} post-replacement, "
          f"{replaces} replacement calls, {len(hooks)} hooks, {hook_bad} bad")

if failures:
    print(f"RESULT: FAIL ({failures} problem(s))")
    sys.exit(1)
print("RESULT: PASS - every launcher anchor still matches the game source")
