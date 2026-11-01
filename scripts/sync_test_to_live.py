#!/usr/bin/env python3
"""Promote the TEST channel (test/) to the LIVE channel (repo root).

TEST is the single source of truth. The LIVE launcher is GENERATED from
test/index.html by mechanical, asserted transforms, so the channels cannot drift
and TEST-only tooling (anything inside <TEST-ONLY> markers) never reaches LIVE.

  python scripts/sync_test_to_live.py --check
      Regenerate in memory and verify the repo already matches. Writes nothing.

  python scripts/sync_test_to_live.py --live-version 1.99
      Write game.html, index.html, version.json, refresh.html; bump the LIVE
      service-worker cache; update test/validate-live-promotion.cjs.

Every transform asserts its match count: a missing pattern aborts the run
instead of silently producing a half-patched launcher.
"""
import argparse
import difflib
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEST_ONLY = re.compile(r"^[ \t]*// <TEST-ONLY>.*?^[ \t]*// </TEST-ONLY>[ \t]*\r?\n",
                       re.S | re.M)


class Fail(Exception):
    pass


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8").replace("\r\n", "\n")


def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")


def sub(text, old, new, where, count=1):
    seen = text.count(old)
    if seen != count:
        raise Fail(f"{where}: expected {count} match(es) of {old[:70]!r}, found {seen}")
    return text.replace(old, new)


def strip_test_only(text):
    text, n = TEST_ONLY.subn("", text)
    if n != 1:
        raise Fail(f"test/index.html: expected exactly 1 <TEST-ONLY> block, stripped {n}")
    return text


def build_live_launcher(live_version):
    """Return the LIVE index.html text generated from test/index.html."""
    text = strip_test_only(read("test/index.html"))
    text = sub(text, re.search(r"const TEST_VERSION='[^']*';", text).group(0),
               f"const TEST_VERSION='{live_version}';", "version constant")
    text = sub(text, "<title>Corn Souls TEST</title>",
               f"<title>Corn Souls \u2014 Alpha v{live_version}</title>", "title")
    text = sub(text, "Loading Corn Souls TEST\u2026", "Loading Corn Souls\u2026", "status text")
    text = sub(text,
               "// This test build has its own service worker and never unregisters the live game's worker.",
               "// LIVE retains its own service worker and never unregisters the TEST worker.",
               "worker comment")
    text = sub(text, "corn-souls-test-shell-", "corn-souls-live-shell-", "cache prefix")
    paths = text.count("/corn-souls/test/")
    if paths < 3:
        raise Fail(f"launcher: expected several /corn-souls/test/ paths, found {paths}")
    text = text.replace("/corn-souls/test/", "/corn-souls/")
    text = sub(text, 'base href="../"', 'base href="/corn-souls/"', "base href")
    text = sub(text, "'TEST v\"+TEST_VERSION", "'Alpha v\"+TEST_VERSION", "version display", count=2)
    text = sub(text, "// Corn Souls TEST: inexpensive", "// Corn Souls: inexpensive", "traffic comment")
    text = sub(text, "'Corn Souls TEST could not load ", "'Corn Souls could not load ", "error text")
    text = sub(text, "reopen the TEST icon", "reopen the Corn Souls icon", "error hint")
    return text


def current_version():
    return re.search(r'"version"\s*:\s*"([^"]+)"', read("version.json")).group(1)


def current_cache():
    return re.search(r"const CACHE='(corn-souls-live-shell-v(\d+))';", read("sw.js"))


def bump_sw(version, cache_name):
    text = read("sw.js")
    old = current_cache()
    text = sub(text, f"const CACHE='{old.group(1)}';", f"const CACHE='{cache_name}';", "sw cache")
    text = re.sub(r"// Corn Souls LIVE \u2014 Alpha v[0-9.]+\.", f"// Corn Souls LIVE \u2014 Alpha v{version}.", text)
    return text


def bump_version_json(version):
    text = read("version.json")
    return re.sub(r'"version"\s*:\s*"[^"]+"', f'"version": "{version}"', text)


def bump_refresh(old_version, new_version):
    text = read("refresh.html")
    hits = text.count(old_version)
    if hits < 1:
        raise Fail(f"refresh.html: version {old_version} not present")
    return text.replace(old_version, new_version)


def bump_validator(old_version, new_version, old_cache, new_cache):
    text = read("test/validate-live-promotion.cjs")
    text = sub(text, f"const TEST_VERSION='{old_version}'", f"const TEST_VERSION='{new_version}'", "validator version")
    text = sub(text, f".version,'{old_version}')", f".version,'{new_version}')", "validator version.json")
    text = sub(text, old_cache, new_cache, "validator cache")
    return text


def report_diff(name, expected, actual):
    diff = list(difflib.unified_diff(expected.split("\n"), actual.split("\n"),
                                     f"expected/{name}", f"actual/{name}", lineterm="", n=1))
    print(f"  {name}: {'MATCH' if not diff else 'DIFFERS'}")
    for line in diff[:40]:
        print("    " + line[:200])
    return not diff


def verify_launchers():
    """Structural checks that must hold on every promotion."""
    ok = report_diff("game.html parity", read("test/game.html"), read("game.html"))
    result = subprocess.run([sys.executable, str(ROOT / "scripts/check_launcher_anchors.py")],
                            cwd=str(ROOT))
    return ok and result.returncode == 0


def consistency():
    """LIVE-only wiring check: version.json, sw.js, refresh.html and the
    validator must all agree. Used in CI, where TEST is allowed to run ahead."""
    version, cache = current_version(), current_cache()
    checks = {
        "sw.js header": f"Alpha v{version}" in read("sw.js"),
        "sw.js cache name": bool(cache) and cache.group(1).startswith("corn-souls-live-shell-v"),
        "refresh.html version": version in read("refresh.html"),
        "validator version": f"const TEST_VERSION='{version}'" in read("test/validate-live-promotion.cjs"),
        "validator cache": cache.group(1) in read("test/validate-live-promotion.cjs"),
        "manifest identity": '"id": "/corn-souls/"' in read("manifest.webmanifest"),
    }
    for name, ok in checks.items():
        print(f"  {'OK  ' if ok else 'FAIL'} {name}")
    return all(checks.values())


def check():
    version, cache = current_version(), current_cache()
    print(f"checking LIVE v{version} (cache {cache.group(1)}) against test/")
    ok = report_diff("index.html", build_live_launcher(version), read("index.html"))
    ok &= report_diff("game.html", read("test/game.html"), read("game.html"))
    consistent = (version in read("refresh.html")
                  and f"Alpha v{version}" in read("sw.js")
                  and f"const TEST_VERSION='{version}'" in read("test/validate-live-promotion.cjs")
                  and cache.group(1) in read("test/validate-live-promotion.cjs"))
    print("  version/cache wiring (sw.js, refresh.html, validator):",
          "CONSISTENT" if consistent else "INCONSISTENT")
    return bool(ok) and consistent


def promote(new_version):
    old_version = current_version()
    cache = current_cache()
    if new_version == old_version:
        raise Fail(f"LIVE is already {old_version}; pass a newer --live-version")
    new_cache = f"corn-souls-live-shell-v{int(cache.group(2)) + 1}"

    write("game.html", read("test/game.html"))
    write("index.html", build_live_launcher(new_version))
    write("sw.js", bump_sw(new_version, new_cache))
    write("version.json", bump_version_json(new_version))
    write("refresh.html", bump_refresh(old_version, new_version))
    write("test/validate-live-promotion.cjs",
          bump_validator(old_version, new_version, cache.group(1), new_cache))

    print(f"promoted: LIVE {old_version} -> {new_version}, {cache.group(1)} -> {new_cache}")
    if not verify_launchers():
        raise Fail("post-promotion verification failed; inspect the output above")
    print()
    print("next steps:")
    print("  1. local check:  double-click 'Start Corn Souls local test server.bat'")
    print("  2. commit + push:")
    print("       git add game.html index.html sw.js version.json refresh.html test/validate-live-promotion.cjs")
    print(f'       git commit -m "release: LIVE Alpha v{new_version}"')
    print("       git push origin main")
    print(f"  3. poll https://crazylegsmalone.github.io/corn-souls/sw.js until it shows {new_cache}")


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--live-version", help="new LIVE version, e.g. 1.99")
    parser.add_argument("--check", action="store_true", help="verify TEST/LIVE sync; writes nothing")
    parser.add_argument("--consistency", action="store_true",
                        help="verify LIVE version/cache wiring only (CI; TEST may run ahead)")
    args = parser.parse_args()
    try:
        if args.consistency:
            print("LIVE wiring consistency:")
            return 0 if consistency() else 1
        if args.check:
            return 0 if check() else 1
        if not args.live_version:
            raise Fail("pass --live-version 1.99 to promote, or --check to verify")
        promote(args.live_version)
        return 0
    except Fail as exc:
        print(f"FAIL: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

