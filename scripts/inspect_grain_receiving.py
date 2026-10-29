#!/usr/bin/env python3
"""Inspect the checked-out full-size game source for grain-receiving coordinates."""
from pathlib import Path
import re
s=Path("index.html").read_text(encoding="utf-8")
lines=s.splitlines()
patterns=[r"grain.{0,30}receiv",r"receiv.{0,30}grain",r"unload",r"\bpit[s]?\b",r"\bscale.?house\b",r"\bSH_DX\b",r"\bNROAD\b",r"\bSCZ_OUT\b",r"rail.{0,20}(dump|pit|unload)",r"truck.{0,20}(dump|pit|unload)"]
out=["# Grain receiving source inspection",f"Source: index.html ({len(s):,} characters, {len(lines):,} lines)","", "Matches include surrounding source lines; inspect actual building definitions before selecting a safe prop location.",""]
seen=set()
for pattern in patterns:
 hits=[i for i,line in enumerate(lines) if re.search(pattern,line,re.I)]
 out.append(f"## Pattern: \`{pattern}\` ({len(hits)} matches)")
 for i in hits[:35]:
  a=max(0,i-3);b=min(len(lines),i+4)
  for j in range(a,b):
   if j not in seen:
    out.append(f"{j+1}: {lines[j][:350]}")
    seen.add(j)
  out.append("")
out.append("## Nearby coordinate and construction clues")
for i,line in enumerate(lines):
 if re.search(r"(grain|receiv|pit|rail|truck)",line,re.I) and re.search(r"(position|set\\(|const |let |building|mesh|geometry|x\\s*=|z\\s*=)",line,re.I):
  out.append(f"{i+1}: {line[:350]}")
  if len(out)>2200:break
Path("grain-receiving-source-report.md").write_text("\n".join(out)+"\n",encoding="utf-8")
print("Wrote grain-receiving-source-report.md")
