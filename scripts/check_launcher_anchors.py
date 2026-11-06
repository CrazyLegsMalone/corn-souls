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


TABLE = re.compile(r"const ([A-Za-z_]\w*)=\[")
STRING = re.compile(r"'((?:\\.|[^'\\])*)'|" + r'"((?:\\.|[^"\\])*)"')


def table_anchors(loader):
    """The first string of every [from, to] pair in the launcher's patch tables (trafficPatches, scopedEffects,
    acidVisualPatches, modalExitPatches, notePatches, ...), with any later NAME[i][0]="..." override applied.
    Only tables that a `for(const [from,to] of NAME)` loop applies are considered patch tables."""
    out = {}
    for m in TABLE.finditer(loader):
        name = m.group(1)
        if f"of {name})" not in loader:
            continue
        i, depth, quote, rows, row_start = m.end(), 1, None, [], None
        while i < len(loader) and depth:
            ch = loader[i]
            if quote:
                if ch == "\\":
                    i += 2
                    continue
                if ch == quote:
                    quote = None
            elif ch in "'\"`":
                quote = ch
            elif ch == "[":
                depth += 1
                if depth == 2:
                    row_start = i + 1
            elif ch == "]":
                if depth == 2 and row_start is not None:
                    rows.append(loader[row_start:i])
                    row_start = None
                depth -= 1
            i += 1
        anchors = []
        for row in rows:
            first = STRING.match(row.lstrip())
            anchors.append(unescape(first.group(1) if first.group(1) is not None else first.group(2)) if first else None)
        for o in re.finditer(re.escape(name) + r"\[(\d+)\]\[0\]=(?:" + STRING.pattern + ")", loader):
            k = int(o.group(1))
            if k < len(anchors):
                anchors[k] = unescape(o.group(2) if o.group(2) is not None else o.group(3))
        out[name] = [a for a in anchors if a]
    return out


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

    # v1.97.198: the [from, to] patch tables were not checked here at all; each "from" must be in the game (or be text
    # that an earlier patch in the same launcher injects).
    tables = table_anchors(loader)
    plain_loader = unescape(loader)
    table_ok = table_derived = table_bad = 0
    for name, anchors in tables.items():
        for anchor in anchors:
            if anchor in game:
                table_ok += 1
            elif plain_loader.count(anchor) > 1:   # its own literal, plus the earlier patch text that injects it
                table_derived += 1
            else:
                print(f"FAIL {loader_rel}: {name} anchor not in {game_rel}: {anchor[:80]!r}")
                table_bad += 1
    failures += table_bad

    print(f"{loader_rel} -> {game_rel}: {checked} anchors OK, {derived} post-replacement, "
          f"{replaces} replacement calls, {len(hooks)} hooks, {hook_bad} bad; "
          f"{len(tables)} patch tables: {table_ok} anchors OK, {table_derived} post-replacement, {table_bad} bad")

if failures:
    print(f"RESULT: FAIL ({failures} problem(s))")
    sys.exit(1)
print("RESULT: PASS - every launcher anchor still matches the game source")
