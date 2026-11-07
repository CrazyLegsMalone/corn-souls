# Split one flat-coloured (no texture) Sketchfab pack into one GLB per named group: every mesh under the group baked with its
# node transforms into a single mesh with the material colours as vertex colours (one draw), standing on y 0, centred on x/z,
# and the source's asset.extras (author, licence, source) kept. Usage: split_flat_glb.py pack.glb out.glb GroupNodeName
import json, struct, sys
import numpy as np
src, dst, group = sys.argv[1], sys.argv[2], sys.argv[3]
b = open(src, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + L]); bo = 20 + L
BIN = b[bo + 8:bo + 8 + struct.unpack('<I', b[bo:bo + 4])[0]]
CT = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride', 0) or n * dt.itemsize
    return np.array([np.frombuffer(BIN[off + k * st: off + k * st + n * dt.itemsize], dtype=dt) for k in range(a['count'])])
def local(n):
    if 'matrix' in n: return np.array(n['matrix'], float).reshape(4, 4).T
    M = np.eye(4); t = n.get('translation', [0, 0, 0]); x, y, z, w = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    R = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    M[:3, :3] = R * np.array(s); M[:3, 3] = t; return M
P, N, C, I = [], [], [], []
def walk(ni, M, on):
    n = j['nodes'][ni]; W = M @ local(n); on = on or n.get('name') == group
    if on and 'mesh' in n:
        for pr in j['meshes'][n['mesh']]['primitives']:
            p = acc(pr['attributes']['POSITION']).astype(float); nn = acc(pr['attributes']['NORMAL']).astype(float)
            idx = acc(pr['indices']).reshape(-1).astype(np.int64) if 'indices' in pr else np.arange(len(p))
            col = j['materials'][pr['material']]['pbrMetallicRoughness'].get('baseColorFactor', [1, 1, 1, 1])[:3]
            base = sum(len(x) for x in P)
            P.append((np.c_[p, np.ones(len(p))] @ W.T)[:, :3]); nm = nn @ np.linalg.inv(W[:3, :3]); N.append(nm / np.linalg.norm(nm, axis=1, keepdims=True))
            C.append(np.tile(col, (len(p), 1))); I.append(idx + base)
    for c in n.get('children', []): walk(c, W, on)
for r in j['scenes'][j.get('scene', 0)]['nodes']: walk(r, np.eye(4), False)
assert P, 'no group ' + group
P = np.vstack(P); N = np.vstack(N); C = np.vstack(C); I = np.concatenate(I)
P[:, 0] -= (P[:, 0].min() + P[:, 0].max()) / 2; P[:, 2] -= (P[:, 2].min() + P[:, 2].max()) / 2; P[:, 1] -= P[:, 1].min()
print(group, 'size x/y/z', np.round(np.ptp(P, 0), 3), 'verts', len(P), 'tris', len(I) // 3)
f = lambda a, dt: np.ascontiguousarray(a, dtype=dt).tobytes()
idt, ict = (np.uint16, 5123) if len(P) < 65536 else (np.uint32, 5125)
blob, views = b'', []
for ch in [f(P, np.float32), f(N, np.float32), f(C, np.float32), f(I, idt)]:
    while len(blob) % 4: blob += b'\0'
    views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(ch)}); blob += ch
while len(blob) % 4: blob += b'\0'
Pf = P.astype(np.float32)
ex = dict(j['asset'].get('extras', {}), modifications='Split out of the pack for Corn Souls: one mesh (' + group + '), material colours as vertex colours, standing on y 0, centred')
doc = {'asset': {'version': '2.0', 'generator': 'corn-souls split_flat_glb.py', 'extras': ex}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': group}],
  'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2}, 'indices': 3, 'material': 0}]}],
  'materials': [{'name': 'flat', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 1}}],
  'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': len(P), 'type': 'VEC3', 'min': Pf.min(0).tolist(), 'max': Pf.max(0).tolist()},
    {'bufferView': 1, 'componentType': 5126, 'count': len(P), 'type': 'VEC3'}, {'bufferView': 2, 'componentType': 5126, 'count': len(P), 'type': 'VEC3'},
    {'bufferView': 3, 'componentType': ict, 'count': len(I), 'type': 'SCALAR'}], 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}]}
js = json.dumps(doc, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
open(dst, 'wb').write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + blob)
