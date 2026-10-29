#!/usr/bin/env python3
"""Promote the existing corn props from test preview into the live game."""
import json,re
from pathlib import Path
main=Path("index.html"); html=main.read_text()
preview=Path("test/index.html").read_text()
def engine(name):
 m=re.search(r"const "+name+r"=(\"(?:\\.|[^\"\\])*\");",preview,re.S)
 if not m: raise RuntimeError("Missing preview engine "+name)
 return json.loads(m.group(1))
def replace_once(before,after):
 global html
 n=html.count(before)
 if n!=1:raise RuntimeError(f"Expected exactly one match, got {n}: {before[:100]!r}")
 html=html.replace(before,after,1)
if "CORN_PROPS_STATE" in html:
 print("Corn props already installed; no duplicate change")
else:
 corn=engine("cornEngine")
 crowbar=engine("crowbarEngine")
 a=crowbar.index("function crowbarAccessor(")
 b=crowbar.index("function crowbarSlot(")
 loader=crowbar[a:b]
 # Do not alter the live crowbar; only reuse the GLB geometry loader.
 replace_once("root.Plant3D = {",loader+"\n"+corn+"\nroot.Plant3D = { cornBuild:cornBuild, cornInteract:cornInteract,")
 replace_once("  clock += dt;","  clock += dt; cornUpdate(dt);")
 replace_once("function fire() {\n  if (!walk.on || walk.dead) return false;","function fire() {\n  if (!walk.on || walk.dead) return false;\n  if(cornThrow())return true;")
 replace_once("const r = P3.kiaToggle() || P3.radioToggle()","const r = P3.cornInteract() || P3.kiaToggle() || P3.radioToggle()")
 replace_once("try { P3.init(view); } catch (e)","try { P3.init(view); P3.cam.tx = 28; P3.cam.tz = 27; P3.cam.yaw = 0.35; P3.walkStart(); setWalkUI(); P3.cornBuild(); } catch (e)")
 replace_once("const show = walk.on && !walk.dead && !walk.drive && !walk.mow, fp = show && !VIEW.third;","const show = walk.on && !walk.dead && !walk.drive && !walk.mow, fp = show && !VIEW.third && !CORN_PROPS_STATE.held;")
 # Preserve the previously approved first-person maintenance-shop spawn; do not alter crowbar.
 assert "const rx=-172+GDX+5.5" in html
 assert "const x=56+SH_DX-2.9" in html
 assert "cornBuild:cornBuild, cornInteract:cornInteract" in html
 main.write_text(html)
 print("Promoted scale-house and grain-receiving corn props to live index.html")
