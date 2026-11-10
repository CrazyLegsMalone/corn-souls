# Make the game's first-person arms from Drillimpact's "PSX First Person Arms" (arms_rig.glb):
#   python3 scripts/slim_fp_arms.py arms_rig.glb assets/models/fp/arms.glb
# Keeps the mesh, its skeleton and skin, the bare-arm texture, and the animations the game uses (rest, relax, guard, jabs, pushes,
# grabs); drops the knife and finger-gun sets. Bone names lose their dots ("hand.R" -> "hand_R"): three.js animation bindings read a
# dot as "node.property", so a dotted bone name could never be animated. Everything else is copied as it is, only what is used.
import json, struct, sys
src, dst = sys.argv[1], sys.argv[2]
KEEP = ['rest', 'relax', 'guard_draw', 'guard_idle', 'jab.L', 'jab.R', 'push.L', 'push.R', 'grab.L', 'grab.R']
b = open(src, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + L]); bo = 20 + L
BIN = b[bo + 8:bo + 8 + struct.unpack('<I', b[bo:bo + 4])[0]]
j['animations'] = [a for a in j['animations'] if a['name'] in KEEP]
for a in j['animations']: a['name'] = a['name'].replace('.', '_')
for n in j['nodes']:
    if 'name' in n: n['name'] = n['name'].replace('.', '_')
# what is still used
used_acc = set()
for m in j['meshes']:
    for p in m['primitives']:
        used_acc.update(p['attributes'].values())
        if 'indices' in p: used_acc.add(p['indices'])
for s in j.get('skins', []):
    if 'inverseBindMatrices' in s: used_acc.add(s['inverseBindMatrices'])
for a in j['animations']:
    for s in a['samplers']: used_acc.update([s['input'], s['output']])
used_bv = {j['accessors'][i]['bufferView'] for i in used_acc}
used_bv.update(im['bufferView'] for im in j.get('images', []) if 'bufferView' in im)
# repack
amap, bmap, views, blob = {}, {}, [], bytearray()
for old in sorted(used_bv):
    v = dict(j['bufferViews'][old]); data = BIN[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    while len(blob) % 4: blob.append(0)
    v['byteOffset'] = len(blob); v['buffer'] = 0; blob.extend(data); bmap[old] = len(views); views.append(v)
accs = []
for old in sorted(used_acc):
    a = dict(j['accessors'][old]); a['bufferView'] = bmap[a['bufferView']]; amap[old] = len(accs); accs.append(a)
for m in j['meshes']:
    for p in m['primitives']:
        p['attributes'] = {k: amap[v] for k, v in p['attributes'].items()}
        if 'indices' in p: p['indices'] = amap[p['indices']]
for s in j.get('skins', []):
    if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = amap[s['inverseBindMatrices']]
for a in j['animations']:
    for s in a['samplers']: s['input'] = amap[s['input']]; s['output'] = amap[s['output']]
for im in j.get('images', []):
    if 'bufferView' in im: im['bufferView'] = bmap[im['bufferView']]
j['accessors'] = accs; j['bufferViews'] = views
while len(blob) % 4: blob.append(0)
j['buffers'] = [{'byteLength': len(blob)}]
j['asset'] = {'version': '2.0', 'generator': 'corn-souls slim_fp_arms.py',
  'extras': {'title': 'PSX First Person Arms', 'author': 'Drillimpact (https://drillimpact.itch.io)', 'source': 'https://drillimpact.itch.io/psx-first-person-arms-free',
             'license': 'Free asset: "You can use it commercially without the need to credit me" (credited anyway)',
             'modifications': 'knife and finger-gun animations dropped, bone and animation names without dots, repacked (scripts/slim_fp_arms.py)'}}
js = json.dumps(j, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
open(dst, 'wb').write(out)
print(dst, len(out), 'bytes;', len(j['animations']), 'animations:', [a['name'] for a in j['animations']])
