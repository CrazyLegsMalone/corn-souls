# Give a static flat-colour animal (assets/models/animals/*.glb, made by split_flat_glb.py: head toward +z, feet on y 0)
# a skeleton, so the game can move it:  python3 rig_animal_glb.py cow|sheep|dog in.glb out.glb [--preview out.png]
#
# 13 bones, all un-rotated at rest (so a bone's own axes are the model's: x side, y up, z nose):
#   root > body > neck > head
#               > tail
#               > fl_up > fl_low   (front left = -x)     > fr_up > fr_low   (front right = +x)
#               > bl_up > bl_low   (back left)           > br_up > br_low
# Every vertex is weighted to the bones it should follow from where it is on the animal (the joint heights and the head /
# tail / leg zones below were measured off each model), with a smooth blend across each joint so a knee or a neck bends
# instead of splitting. The geometry, normals, vertex colours and the pack's asset.extras are kept as they are.
import json, struct, sys
import numpy as np

def ss(a, b, x):   # smoothstep from 0 at a to 1 at b (a may be greater than b)
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

# model units (before the game's scale). leg: (name, side, z0, z1, hip y, knee y). band = half-width of a joint's blend.
CFG = {
    'cow': dict(
        body=(0, 1.25, -0.4), band=0.14,
        legs=[('fl', -1, 0.2, 0.66, 0.92, 0.46), ('fr', 1, 0.2, 0.66, 0.92, 0.46), ('bl', -1, -1.8, -1.27, 0.98, 0.5), ('br', 1, -1.8, -1.27, 0.98, 0.5)],
        leg_x=0.17,                                            # a leg vertex is at least this far off the centre line (the tail hangs on it)
        neck=(0, 1.45, 0.62), head=(0, 1.55, 0.98),
        neck_w=lambda x, y, z: ss(0.55, 0.86, z) * ss(1.05, 1.2, y), head_w=lambda x, y, z: ss(0.86, 1.08, z),
        tail=(0, 1.62, -1.5), tail_w=lambda x, y, z: (np.abs(x) < 0.16) * (z < -1.44) * ss(1.7, 1.42, y)),
    'sheep': dict(
        body=(0, 0.6, -0.15), band=0.06,
        legs=[('fl', -1, -0.04, 0.2, 0.4, 0.2), ('fr', 1, -0.04, 0.2, 0.4, 0.2), ('bl', -1, -0.62, -0.32, 0.4, 0.2), ('br', 1, -0.62, -0.32, 0.4, 0.2)],
        leg_x=0.0,
        neck=(0, 0.7, 0.2), head=(0, 0.8, 0.34),
        neck_w=lambda x, y, z: ss(0.14, 0.31, z) * ss(0.48, 0.58, y), head_w=lambda x, y, z: ss(0.29, 0.41, z),
        tail=(0, 0.68, -0.52), tail_w=lambda x, y, z: ss(-0.535, -0.585, z) * (y > 0.5)),
    'dog': dict(
        body=(0, 0.8, -0.1), band=0.08,
        legs=[('fl', -1, 0.3, 0.6, 0.6, 0.26), ('fr', 1, 0.3, 0.6, 0.6, 0.26), ('bl', -1, -0.9, -0.5, 0.62, 0.3), ('br', 1, -0.9, -0.5, 0.62, 0.3)],
        leg_x=0.1,
        neck=(0, 0.98, 0.44), head=(0, 1.16, 0.55),
        neck_w=lambda x, y, z: ss(0.93, 1.08, y) * ss(0.26, 0.42, z), head_w=lambda x, y, z: ss(1.08, 1.2, y) * (z > 0.3),
        tail=(0, 0.98, -0.44), tail_w=lambda x, y, z: ss(0.99, 1.06, y) * (z < -0.2)),
}
BONES = ['root', 'body', 'neck', 'head', 'tail', 'fl_up', 'fl_low', 'fr_up', 'fr_low', 'bl_up', 'bl_low', 'br_up', 'br_low']
PARENT = {'body': 'root', 'neck': 'body', 'head': 'neck', 'tail': 'body', 'fl_up': 'body', 'fl_low': 'fl_up', 'fr_up': 'body', 'fr_low': 'fr_up',
          'bl_up': 'body', 'bl_low': 'bl_up', 'br_up': 'body', 'br_low': 'br_up'}

def rig(kind, P):
    """-> joint world positions {name: xyz}, weights (n, 13) summing to 1"""
    C = CFG[kind]; x, y, z = P[:, 0], P[:, 1], P[:, 2]; n = len(P); band = C['band']
    W = np.zeros((n, len(BONES))); bi = {b: i for i, b in enumerate(BONES)}
    J = {'root': (0, 0, 0), 'body': C['body'], 'neck': C['neck'], 'head': C['head'], 'tail': C['tail']}
    free = np.ones(n)                                          # what is left for the body
    for name, side, z0, z1, hy, ky in C['legs']:
        inleg = (np.sign(x) == side) * (np.abs(x) >= C['leg_x']) * (z >= z0) * (z <= z1)
        u = inleg * ss(hy + band, hy - band, y)                # 0 above the hip, 1 below it
        lo = ss(ky + band * 0.7, ky - band * 0.7, y)           # 0 above the knee, 1 below it
        W[:, bi[name + '_up']] = u * (1 - lo); W[:, bi[name + '_low']] = u * lo; free = free - u
        cx = x[inleg * (y < hy)].mean() if (inleg * (y < hy)).any() else side * 0.2; cz = (z[inleg * (y < ky)].mean() if (inleg * (y < ky)).any() else (z0 + z1) / 2)
        J[name + '_up'] = (float(cx), hy, float(cz)); J[name + '_low'] = (float(cx), ky, float(cz))
    free = np.clip(free, 0, 1)
    nk = C['neck_w'](x, y, z) * free; hd = C['head_w'](x, y, z)
    W[:, bi['neck']] = nk * (1 - hd); W[:, bi['head']] = nk * hd; free = free - nk
    tl = C['tail_w'](x, y, z) * free; W[:, bi['tail']] = tl; free = free - tl
    W[:, bi['body']] = np.clip(free, 0, 1)
    W /= W.sum(1, keepdims=True)
    return J, W

def pose(P, J, W, turns):
    """linear-blend skinning in numpy, for the preview: turns = {bone: (axis 'x'|'y'|'z', radians)} about model axes"""
    def rot(ax, a):
        c, s = np.cos(a), np.sin(a)
        return {'x': np.array([[1, 0, 0], [0, c, -s], [0, s, c]]), 'y': np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]]), 'z': np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])}[ax]
    M = {}
    def world(b):
        if b in M: return M[b]
        Rp, tp = world(PARENT[b]) if b in PARENT else (np.eye(3), np.zeros(3))
        R = np.eye(3)
        for ax, a in turns.get(b, []): R = rot(ax, a) @ R
        j = np.array(J[b], float)
        # a turn about the joint, in the parent's (already turned) frame: p -> Rp (R (p - j) + j) + tp
        M[b] = (Rp @ R, Rp @ (j - R @ j) + tp); return M[b]
    out = np.zeros_like(P, dtype=float)
    for i, b in enumerate(BONES):
        R, t = world(b); out += W[:, i:i + 1] * (P @ R.T + t)
    return out

if __name__ == '__main__':
    kind, src, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    b = open(src, 'rb').read(); L = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + L]); bo = 20 + L + 8
    NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}; DT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}
    def acc(i):
        A = j['accessors'][i]; bv = j['bufferViews'][A['bufferView']]
        return np.frombuffer(b, dtype=DT[A['componentType']], offset=bo + bv.get('byteOffset', 0) + A.get('byteOffset', 0), count=A['count'] * NC[A['type']]).reshape(-1, NC[A['type']])
    pr = j['meshes'][0]['primitives'][0]; at = pr['attributes']
    P = acc(at['POSITION']).astype(np.float32); N = acc(at['NORMAL']).astype(np.float32); COL = acc(at['COLOR_0']); I = acc(pr['indices']).reshape(-1)
    colA = j['accessors'][at['COLOR_0']]
    J, W = rig(kind, P.astype(float))
    order = np.argsort(-W, axis=1)[:, :4]; w4 = np.take_along_axis(W, order, 1); w4 = (w4 / w4.sum(1, keepdims=True)).astype(np.float32); j4 = order.astype(np.uint8); j4[w4 == 0] = 0
    # ---- write
    blob = bytearray(); views = []; accs = []
    def put(arr, ctype, typ, target=None, norm=False, mm=False):
        while len(blob) % 4: blob.append(0)
        data = arr.tobytes(); v = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)}
        if target: v['target'] = target
        views.append(v); blob.extend(data)
        a = {'bufferView': len(views) - 1, 'componentType': ctype, 'count': len(arr) if arr.ndim > 1 else len(arr), 'type': typ}
        if norm: a['normalized'] = True
        if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
        accs.append(a); return len(accs) - 1
    aP = put(P, 5126, 'VEC3', 34962, mm=True); aN = put(N, 5126, 'VEC3', 34962)
    aC = put(np.ascontiguousarray(COL), colA['componentType'], colA['type'], 34962, norm=bool(colA.get('normalized')))
    aJ = put(j4, 5121, 'VEC4', 34962); aW = put(w4, 5126, 'VEC4', 34962)
    aI = put(I.astype(np.uint32 if len(P) > 65535 else np.uint16), 5125 if len(P) > 65535 else 5123, 'SCALAR', 34963)
    ibm = np.zeros((len(BONES), 16), np.float32)
    for k, bn in enumerate(BONES): m = np.eye(4, dtype=np.float32); m[:3, 3] = -np.array(J[bn], np.float32); ibm[k] = m.T.reshape(-1)   # column-major
    while len(blob) % 4: blob.append(0)
    views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': ibm.nbytes}); blob.extend(ibm.tobytes())
    accs.append({'bufferView': len(views) - 1, 'componentType': 5126, 'count': len(BONES), 'type': 'MAT4'}); aM = len(accs) - 1
    # nodes: 0 scene root, 1 the mesh, 2.. the bones (each translated from its parent's joint)
    nodes = [{'name': 'animal', 'children': [1, 2]}, {'name': kind, 'mesh': 0, 'skin': 0}]
    idx = {bn: 2 + k for k, bn in enumerate(BONES)}
    for bn in BONES:
        par = PARENT.get(bn); t = np.array(J[bn], float) - (np.array(J[par], float) if par else 0)
        nd = {'name': bn, 'translation': [float(v) for v in t]}; kids = [idx[c] for c in BONES if PARENT.get(c) == bn]
        if kids: nd['children'] = kids
        nodes.append(nd)
    while len(blob) % 4: blob.append(0)
    ex = dict(j['asset'].get('extras', {})); ex['modifications'] = (ex.get('modifications', '') + '; rigged for Corn Souls: a 13-bone skeleton and skin weights added (scripts/rig_animal_glb.py), geometry and colours unchanged').lstrip('; ')
    doc = {'asset': {'version': '2.0', 'generator': 'corn-souls rig_animal_glb.py', 'extras': ex}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': nodes,
           'meshes': [{'name': kind, 'primitives': [{'attributes': {'POSITION': aP, 'NORMAL': aN, 'COLOR_0': aC, 'JOINTS_0': aJ, 'WEIGHTS_0': aW}, 'indices': aI}]}],
           'skins': [{'joints': [idx[bn] for bn in BONES], 'inverseBindMatrices': aM, 'skeleton': idx['root']}],
           'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}]}
    js = json.dumps(doc, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
    open(dst, 'wb').write(out)
    print(kind, 'verts', len(P), 'tris', len(I) // 3, '->', dst, len(out), 'bytes; joints', {k: tuple(round(float(v), 2) for v in J[k]) for k in ('fl_up', 'bl_up', 'neck', 'head', 'tail')})
    if '--preview' in sys.argv:
        import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
        dom = W.argmax(1); fig, ax = plt.subplots(1, 4, figsize=(22, 5)); Pf = P.astype(float)
        ax[0].scatter(Pf[:, 2], Pf[:, 1], c=dom, cmap='tab20', s=3); ax[0].set_title(kind + ': which bone each vertex follows most')
        for bn in BONES: ax[0].plot(J[bn][2], J[bn][1], 'k+', ms=9)
        walk = {'fl_up': [('x', -0.5)], 'br_up': [('x', -0.5)], 'fr_up': [('x', 0.5)], 'bl_up': [('x', 0.5)], 'fl_low': [('x', 0.5)], 'br_low': [('x', 0.3)], 'tail': [('y', 0.5)]}
        graze = {'neck': [('x', 0.95)], 'head': [('x', 0.35)]}
        look = {'neck': [('y', 0.6)], 'head': [('y', 0.3), ('x', -0.2)], 'tail': [('y', -0.6)]}
        for a, (nm, tr) in zip(ax[1:], [('walk stride', walk), ('grazing', graze), ('looking round (top view)', look)]):
            Q = pose(Pf, J, W, tr)
            if 'top' in nm: a.scatter(Q[:, 2], Q[:, 0], c=dom, cmap='tab20', s=3)
            else: a.scatter(Q[:, 2], Q[:, 1], c=dom, cmap='tab20', s=3)
            a.set_title(nm)
        for a in ax: a.set_aspect('equal'); a.grid(True, alpha=.3)
        plt.tight_layout(); plt.savefig(sys.argv[sys.argv.index('--preview') + 1], dpi=55)
