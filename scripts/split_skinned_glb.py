# Split one rigged animal out of a Sketchfab pack, keeping its skeleton: python3 split_skinned_glb.py pack.glb out.glb ARMATURE_NODE LENGTH
# The armature's subtree (meshes, skin, joints) is copied with only the data it uses. A new root node takes the armature's world
# transform from the pack, then moves the animal so its bind pose stands on y 0, centred on x/z, scaled so its z length (head to
# tail, head toward +z as made in this pack) is LENGTH. All materials and the shared texture are kept. asset.extras are kept.
import json, struct, sys
import numpy as np
src, dst, arm_name, length = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
b = open(src, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + L]); bo = 20 + L; BIN = b[bo + 8:bo + 8 + struct.unpack('<I', b[bo:bo + 4])[0]]
N = j['nodes']; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
DT = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(DT[a['componentType']])
    st = bv.get('byteStride', 0) or n * dt.itemsize; off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    raw = np.frombuffer(BIN, dtype=np.uint8, offset=off, count=st * (a['count'] - 1) + n * dt.itemsize)
    return np.stack([np.frombuffer(raw[k * st:k * st + n * dt.itemsize].tobytes(), dtype=dt) for k in range(a['count'])])
def local(n):
    if 'matrix' in n: return np.array(n['matrix'], dtype=float).reshape(4, 4).T
    M = np.eye(4); t = n.get('translation', [0, 0, 0]); x, y, z, w = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    R = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    M[:3, :3] = R * np.array(s); M[:3, 3] = t; return M
W, PAR = {}, {}
def walk(i, M):
    W[i] = M @ local(N[i])
    for c in N[i].get('children', []): PAR[c] = i; walk(c, W[i])
for r in j['scenes'][j.get('scene', 0)]['nodes']: walk(r, np.eye(4))
arm = next(i for i, n in enumerate(N) if n.get('name') == arm_name)
sub = []
def collect(i): sub.append(i); [collect(c) for c in N[i].get('children', [])]
collect(arm)
# bind-pose points of the animal's meshes, in pack world space
pts = []
for i in sub:
    n = N[i]
    if 'mesh' not in n: continue
    for pr in j['meshes'][n['mesh']]['primitives']:
        P = acc(pr['attributes']['POSITION']).astype(float); Ph = np.c_[P, np.ones(len(P))]
        if 'skin' in n:
            s = j['skins'][n['skin']]; ibm = acc(s['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
            J = acc(pr['attributes']['JOINTS_0']).astype(int); Wt = acc(pr['attributes']['WEIGHTS_0']).astype(float)
            if Wt.max() > 1.5: Wt /= 255.0
            Ms = np.stack([W[jn] @ ibm[k] for k, jn in enumerate(s['joints'])]); out = np.zeros((len(P), 3))
            for c in range(4): out += Wt[:, c:c+1] * np.einsum('nij,nj->ni', Ms[J[:, c]], Ph)[:, :3]
            pts.append(out)
        else: pts.append((Ph @ W[i].T)[:, :3])
Q = np.vstack(pts); lo, hi = Q.min(0), Q.max(0); k = length / (hi[2] - lo[2])
Fix = np.diag([k, k, k, 1.0]); Fix[:3, 3] = [-k * (lo[0] + hi[0]) / 2, -k * lo[1], -k * (lo[2] + hi[2]) / 2]
rootM = Fix @ (W[PAR[arm]] if arm in PAR else np.eye(4))
print(arm_name, 'size', np.round((hi - lo) * k, 4), 'k', round(k, 5))
# rebuild with only what the subtree uses
nmap = {o: n for n, o in enumerate(sub)}; out = {'nodes': [], 'meshes': [], 'skins': [], 'accessors': [], 'bufferViews': []}; blob = bytearray()
amap, mmap, smap = {}, {}, {}
def put_acc(i):
    if i in amap: return amap[i]
    a = dict(j['accessors'][i]); bv = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(DT[a['componentType']])
    data = acc(i).astype(dt).tobytes()
    while len(blob) % 4: blob.append(0)
    out['bufferViews'].append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)}); blob.extend(data)
    a['bufferView'] = len(out['bufferViews']) - 1; a.pop('byteOffset', None); a.pop('sparse', None)
    out['accessors'].append(a); amap[i] = len(out['accessors']) - 1; return amap[i]
for o in sub:
    n = {k2: v for k2, v in N[o].items() if k2 not in ('children', 'mesh', 'skin')}
    if 'children' in N[o]: n['children'] = [nmap[c] + 1 for c in N[o]['children']]
    if 'mesh' in N[o]:
        mi = N[o]['mesh']
        if mi not in mmap:
            m = json.loads(json.dumps(j['meshes'][mi]))
            for pr in m['primitives']:
                pr['attributes'] = {k2: put_acc(v) for k2, v in pr['attributes'].items() if k2 != 'TANGENT'}
                if 'indices' in pr: pr['indices'] = put_acc(pr['indices'])
                pr.pop('targets', None)
            out['meshes'].append(m); mmap[mi] = len(out['meshes']) - 1
        n['mesh'] = mmap[mi]
    if 'skin' in N[o]:
        si = N[o]['skin']
        if si not in smap:
            s = dict(j['skins'][si]); s['joints'] = [nmap[x] + 1 for x in s['joints']]; s['inverseBindMatrices'] = put_acc(s['inverseBindMatrices'])
            if 'skeleton' in s: s['skeleton'] = nmap[s['skeleton']] + 1 if s['skeleton'] in nmap else s.pop('skeleton')
            out['skins'].append(s); smap[si] = len(out['skins']) - 1
        n['skin'] = smap[si]
    out['nodes'].append(n)
out['nodes'].insert(0, {'name': 'animal', 'matrix': rootM.T.reshape(-1).tolist(), 'children': [1]})
imgs = []
for im in j.get('images', []):
    bv = j['bufferViews'][im['bufferView']]; data = BIN[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    while len(blob) % 4: blob.append(0)
    out['bufferViews'].append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)}); blob.extend(data)
    imgs.append({'bufferView': len(out['bufferViews']) - 1, 'mimeType': im.get('mimeType', 'image/png')})
while len(blob) % 4: blob.append(0)
ex = dict(j['asset'].get('extras', {})); ex['modifications'] = 'Split out of the pack for Corn Souls (' + arm_name + '): its own skeleton and meshes only, stood on the ground, centred, scaled'
doc = {'asset': {'version': '2.0', 'generator': 'corn-souls split_skinned_glb.py', 'extras': ex}, 'scene': 0, 'scenes': [{'nodes': [0]}],
       'nodes': out['nodes'], 'meshes': out['meshes'], 'skins': out['skins'], 'accessors': out['accessors'], 'bufferViews': out['bufferViews'],
       'buffers': [{'byteLength': len(blob)}], 'materials': j.get('materials', []), 'textures': j.get('textures', []), 'images': imgs, 'samplers': j.get('samplers', [])}
if j.get('extensionsUsed'): doc['extensionsUsed'] = j['extensionsUsed']
if not doc['samplers']: doc.pop('samplers')
js = json.dumps(doc, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
open(dst, 'wb').write(glb); print(dst, len(glb), 'bytes')
