#!/usr/bin/env python3
"""Bump the TEST channel version so installed TEST apps pick up the change.

The TEST launcher polls ./index.html?check= on launch/resume/focus; when
TEST_VERSION differs it clears the TEST caches, reloads, and the new service
worker activates. So every TEST push should bump this first.

  python scripts/bump_test_version.py            # 1.97.17 -> 1.97.18, shell-v44 -> v45
  python scripts/bump_test_version.py --dry-run
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class Fail(Exception):
    pass


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8").replace("\r\n", "\n")


def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")


def bump(version):
    parts = version.split(".")
    if not all(p.isdigit() for p in parts):
        raise Fail(f"cannot bump non-numeric version {version!r}")
    parts[-1] = str(int(parts[-1]) + 1)
    return ".".join(parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        launcher = read("test/index.html")
        found = re.search(r"const TEST_VERSION='([^']+)';", launcher)
        if not found:
            raise Fail("test/index.html: TEST_VERSION not found")
        old, new = found.group(1), bump(found.group(1))

        sw = read("test/sw.js")
        cache_old = re.search(r"const CACHE = 'corn-souls-test-shell-v(\d+)';", sw)
        if not cache_old:
            raise Fail("test/sw.js: TEST cache constant not found")
        cache_new = f"corn-souls-test-shell-v{int(cache_old.group(1)) + 1}"

        refresh = read("test/refresh.html")
        if old not in refresh:
            raise Fail(f"test/refresh.html: version {old} not present")

        print(f"TEST {old} -> {new};  cache {cache_old.group(0).split(chr(39))[1]} -> {cache_new}")
        if args.dry_run:
            print("dry run: nothing written")
            return 0

        write("test/index.html", launcher.replace(f"const TEST_VERSION='{old}';",
                                                  f"const TEST_VERSION='{new}';", 1))
        write("test/refresh.html", refresh.replace(old, new))
        write("test/sw.js", sw.replace(
            f"const CACHE = 'corn-souls-test-shell-v{cache_old.group(1)}';",
            f"const CACHE = '{cache_new}';", 1))
        print("updated test/index.html, test/refresh.html, test/sw.js")
        print(f"device check URL: https://crazylegsmalone.github.io/corn-souls/test/  (should show TEST v{new})")
        return 0
    except Fail as exc:
        print(f"FAIL: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
