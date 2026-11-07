# Slim a Sketchfab GLB into a game tool (optional 4th arg: pick one mesh by name out of a pack, cropping its part of the atlas): one mesh (all mesh nodes baked), POSITION/NORMAL/TEXCOORD_0 + indices,
# base colour only, resized, long axis -> +X with the heavy head at +X, wide face in XY, handle centreline on the X axis.
import json, struct, sys, io
import numpy as np
from PIL import Image
src, dst, px, mesh_filter = sys.argv[1], sys.argv[2], int(sys.argv[3]), (sys.argv[4] if len(sys.argv) > 4 else None)
b = open(src, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + L]); bo = 20 + L
bl = struct.unpack('<I', b[bo:bo + 4])[0]; BIN = b[bo + 8:bo + 8 + bl]
CT = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride', 0) or n * dt.itemsize
    raw = np.frombuffer(BIN, dtype=np.uint8, count=st * (a['count'] - 1) + n * dt.itemsize, offset=off)
    out = np.empty((a['count'], n), dtype=dt)
    for k in range(a['count']): out[k] = np.frombuffer(raw[k * st:k * st + n * dt.itemsize].tobytes(), dtype=dt)
    return out
def local(n):
    if 'matrix' in n: return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    M = np.eye(4); t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = r; R = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    M[:3, :3] = R * np.array(s); M[:3, 3] = t; return M
P, N, U, I = [], [], [], []
def walk(ni, M):
    n = j['nodes'][ni]; W = M @ local(n)
    if 'mesh' in n:
        m = j['meshes'][n['mesh']]
        if mesh_filter is None or mesh_filter.lower() in m.get('name', '').lower():
            for pr in m['primitives']:
                p = acc(pr['attributes']['POSITION']).astype(np.float64); nn = acc(pr['attributes']['NORMAL']).astype(np.float64)
                uv = acc(pr['attributes']['TEXCOORD_0']).astype(np.float64)
                idx = acc(pr['indices']).reshape(-1).astype(np.int64) if 'indices' in pr else np.arange(len(p))
                base = sum(len(x) for x in P)
                P.append((np.c_[p, np.ones(len(p))] @ W.T)[:, :3]); nm = nn @ np.linalg.inv(W[:3, :3]); N.append(nm / np.linalg.norm(nm, axis=1, keepdims=True))
                U.append(uv); I.append(idx + base)
    for c in n.get('children', []): walk(c, W)
sc = j['scenes'][j.get('scene', 0)]
for r in sc['nodes']: walk(r, np.eye(4))
P = np.vstack(P); N = np.vstack(N); U = np.vstack(U); I = np.concatenate(I)
# principal axes from the bounding extents along PCA directions
c = P.mean(0); ev, evec = np.linalg.eigh(np.cov((P - c).T)); order = np.argsort(ev)[::-1]; A = evec[:, order]   # columns: long, wide, thin
if np.linalg.det(A) < 0: A[:, 2] *= -1
Q = (P - c) @ A; NQ = N @ A
x = Q[:, 0]; lo, hi = x.min(), x.max(); Ln = hi - lo
cross = lambda sel: np.ptp(Q[sel, 1]) * np.ptp(Q[sel, 2]) if sel.sum() > 3 else 0
if cross(x < lo + 0.2 * Ln) > cross(x > hi - 0.2 * Ln):   # head goes to +X
    Q[:, 0] *= -1; Q[:, 1] *= -1; NQ[:, 0] *= -1; NQ[:, 1] *= -1
x = Q[:, 0]; lo = x.min(); hand = (x > lo + 0.05 * Ln) & (x < lo + 0.45 * Ln)
if hand.sum() < 3: hand = x < lo + 0.5 * Ln   # a plain tube has vertices only at its ends: take the handle half
cy, cz = (Q[hand, 1].min() + Q[hand, 1].max()) / 2, (Q[hand, 2].min() + Q[hand, 2].max()) / 2
Q[:, 1] -= cy; Q[:, 2] -= cz; Q[:, 0] -= (Q[:, 0].min() + Q[:, 0].max()) / 2
head_side = np.sign(Q[x > x.max() - 0.25 * Ln, 1].mean()) or 1.0
if head_side < 0: Q[:, 1] *= -1; Q[:, 2] *= -1; NQ[:, 1] *= -1; NQ[:, 2] *= -1   # the jaw / head sticks out toward +Y
print('length', round(Ln, 4), 'width', round(np.ptp(Q[:, 1]), 4), 'thick', round(np.ptp(Q[:, 2]), 4), 'verts', len(Q), 'tris', len(I) // 3,
      'handle r', round(np.ptp(Q[hand, 2]) / 2, 4))
# base colour texture, resized
mat = j['materials'][0]; ti = mat['pbrMetallicRoughness']['baseColorTexture']['index']; im = j['images'][j['textures'][ti]['source']]
bv = j['bufferViews'][im['bufferView']]; img = Image.open(io.BytesIO(BIN[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
if mesh_filter and U.min() >= 0 and U.max() <= 1:   # one weapon from a shared atlas: keep only its part of the texture
    W0, H0 = img.size; pad = 4
    x0, x1 = max(0, int(U[:, 0].min() * W0) - pad), min(W0, int(np.ceil(U[:, 0].max() * W0)) + pad)
    y0, y1 = max(0, int(U[:, 1].min() * H0) - pad), min(H0, int(np.ceil(U[:, 1].max() * H0)) + pad)
    img = img.crop((x0, y0, x1, y1)); U = np.c_[(U[:, 0] * W0 - x0) / (x1 - x0), (U[:, 1] * H0 - y0) / (y1 - y0)]
    print('atlas crop', (x0, y0, x1, y1), 'of', (W0, H0))
img = img.resize((px, px), Image.LANCZOS)
ib = io.BytesIO(); img.save(ib, 'JPEG', quality=88); ib = ib.getvalue()
f = lambda a, dt: np.ascontiguousarray(a, dtype=dt).tobytes()
idt, ict = (np.uint16, 5123) if len(Q) < 65536 else (np.uint32, 5125)
chunks = [f(Q, np.float32), f(NQ, np.float32), f(U, np.float32), f(I, idt), ib]
views, blob = [], b''
for ch in chunks:
    while len(blob) % 4: blob += b'\0'
    views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(ch)}); blob += ch
while len(blob) % 4: blob += b'\0'
Qf = Q.astype(np.float32)
doc = {'asset': {'version': '2.0', 'generator': 'corn-souls slim_glb.py', 'extras': dict(j['asset'].get('extras', {}), modifications='Slimmed for Corn Souls: one mesh, base colour only (resized), reoriented and centred')}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': 'tool'}],
  'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
  'materials': [{'name': mat.get('name', 'tool'), 'doubleSided': bool(mat.get('doubleSided')), 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}}],
  'textures': [{'source': 0}], 'images': [{'bufferView': 4, 'mimeType': 'image/jpeg'}],
  'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': len(Q), 'type': 'VEC3', 'min': Qf.min(0).tolist(), 'max': Qf.max(0).tolist()},
    {'bufferView': 1, 'componentType': 5126, 'count': len(Q), 'type': 'VEC3'}, {'bufferView': 2, 'componentType': 5126, 'count': len(Q), 'type': 'VEC2'},
    {'bufferView': 3, 'componentType': ict, 'count': len(I), 'type': 'SCALAR'}],
  'bufferViews': views, 'buffers': [{'byteLength': len(blob)}]}
js = json.dumps(doc, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + blob
open(dst, 'wb').write(out); print(dst, len(out), 'bytes')
