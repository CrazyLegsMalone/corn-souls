# Make the vending items from the owner's product pictures (v1.97.78):
#   python3 scripts/make_vend_items.py
# Reads assets/models/source/vend_cards/*_card.png (the owner's product art: Milorade sports drink, WET water, Chippys corn chips)
# and writes assets/models/milorade_bottle.glb, wet_water_bottle.glb and chippys_bag.glb.
# The owner's own GLBs of these were just a box with the whole picture card wrapped round it (dark floor and caption included, and
# no normals), so each item is built here instead: the product is cut out of its picture (it is bright / saturated, the floor is
# dark grey), and
#   - a bottle is turned (lathed) from the cut-out's own silhouette, row by row, so its shape is the drawing's; the front half shows
#     the picture as drawn and the back half shows it again (not mirrored), so the label reads from both sides;
#   - the chip bag is a puffed pillow whose outline follows the cut-out row by row (the crimped ends stay flat), with the picture on
#     the front and again, readable, on the back.
# Each GLB: one mesh, one material, the cropped picture embedded as PNG, origin at the middle of the base (y up, front toward +z).
import io, json, math, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/models/source/vend_cards'
OUT = ROOT / 'assets/models'

def cutout(name):
    img = Image.open(SRC / (name + '_card.png')).convert('RGB')
    a = np.asarray(img).astype(float) / 255
    mx, mn = a.max(2), a.min(2); sat = (mx - mn) / (mx + 1e-6)
    m = ((sat > 0.28) & (mx > 0.3)) | (mx > 0.62)
    m[400:] = False                                   # the caption band under the picture
    m = ndimage.binary_opening(m, iterations=1)
    lab, k = ndimage.label(m); sizes = ndimage.sum(m, lab, range(1, k + 1))
    m = lab == (1 + int(np.argmax(sizes)))
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=3))
    ys, xs = np.where(m); x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
    crop = img.crop((x0, y0, x1, y1)); mk = m[y0:y1, x0:x1]
    # paint the floor round the product with the product's own edge colours, so a texel sampled just outside never shows the floor
    arr = np.asarray(crop).copy(); idx = ndimage.distance_transform_edt(~mk, return_distances=False, return_indices=True)
    arr = arr[idx[0], idx[1]]
    return Image.fromarray(arr.astype(np.uint8)), mk

def rows(mk):   # per pixel row: left and right edge of the product (None where the row is empty)
    out = []
    for y in range(mk.shape[0]):
        xs = np.where(mk[y])[0]
        out.append((xs.min(), xs.max() + 1) if len(xs) else None)
    return out

def glb(name, pos, nrm, uv, idx, png, extras):
    pos = np.asarray(pos, np.float64); pos[:, 1] -= pos[:, 1].min(); pos[:, 0] -= (pos[:, 0].min() + pos[:, 0].max()) / 2; pos[:, 2] -= (pos[:, 2].min() + pos[:, 2].max()) / 2   # on its base, centred
    pos = pos.astype(np.float32); nrm = np.asarray(nrm, np.float32); uv = np.asarray(uv, np.float32); idx = np.asarray(idx, np.uint16)
    blobs = [idx.tobytes(), pos.tobytes(), nrm.tobytes(), uv.tobytes(), png]
    views, off, body = [], 0, b''
    for i, bl in enumerate(blobs):
        while len(body) % 4: body += b'\0'
        off = len(body); body += bl
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(bl)}
        if i < 4: v['target'] = 34963 if i == 0 else 34962
        views.append(v)
    while len(body) % 4: body += b'\0'
    j = {'asset': {'version': '2.0', 'generator': 'corn-souls make_vend_items.py', 'extras': extras},
         'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'name': name, 'mesh': 0}],
         'meshes': [{'name': name, 'primitives': [{'attributes': {'POSITION': 1, 'NORMAL': 2, 'TEXCOORD_0': 3}, 'indices': 0, 'material': 0}]}],
         'materials': [{'name': name, 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}, 'doubleSided': False}],
         'textures': [{'sampler': 0, 'source': 0}], 'samplers': [{'magFilter': 9728, 'minFilter': 9728}],
         'images': [{'bufferView': 4, 'mimeType': 'image/png'}],
         'accessors': [{'bufferView': 0, 'componentType': 5123, 'count': len(idx), 'type': 'SCALAR'},
                       {'bufferView': 1, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()},
                       {'bufferView': 2, 'componentType': 5126, 'count': len(nrm), 'type': 'VEC3'},
                       {'bufferView': 3, 'componentType': 5126, 'count': len(uv), 'type': 'VEC2'}],
         'bufferViews': views, 'buffers': [{'byteLength': len(body)}]}
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    data = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(body)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(body), 0x004E4942) + body
    (OUT / (name + '.glb')).write_bytes(data)
    return len(data)

def pngbytes(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return b.getvalue()

def bottle(card, name, height, seg=12, levels=40, extras=None):
    im, mk = cutout(card); W, H = im.size; R = rows(mk)
    ys = [y for y in range(H) if R[y]]; ytop, ybot = ys[0], ys[-1]
    k = height / (ybot + 1 - ytop)                     # metres per pixel
    lv = np.linspace(ytop + 0.5, ybot + 0.5, levels)
    prof = []
    for y in lv:
        a, b = R[min(ybot, max(ytop, int(y)))]
        prof.append(((a + b) / 2, max(1.0, (b - a) / 2 - 1.2), y))   # centre, half-width (inset 1 px off the edge), row
    pos, nrm, uv, idx = [], [], [], []
    for half in (0, 1):                                  # 0: front (faces +z), 1: back
        base = len(pos)
        for li, (cx, w, y) in enumerate(prof):
            r = w * k; h = (ybot + 1 - y) * k
            j0, j1 = max(0, li - 1), min(levels - 1, li + 1)
            dh = (prof[j0][2] - prof[j1][2]) * k   # height between the neighbouring rings
            for s in range(seg + 1):
                th = -math.pi / 2 + math.pi * s / seg + (math.pi if half else 0)
                x, z = r * math.sin(th), r * math.cos(th)
                # slope: the surface leans in where the radius shrinks upward
                slope = (prof[j0][1] - prof[j1][1]) * k / (abs(dh) + 1e-6)
                n = np.array([math.sin(th), slope, math.cos(th)]); n /= np.linalg.norm(n)
                u = cx + w * math.sin(th) if not half else cx - w * math.sin(th)
                pos.append((x, h, z)); nrm.append(n); uv.append((u / W, y / H))
        for li in range(levels - 1):
            for s in range(seg):
                a = base + li * (seg + 1) + s; b = a + 1; c = a + seg + 1; d = c + 1
                idx += [a, c, b, b, c, d]
    # caps: a fan at the top and at the bottom, coloured from the middle of the top / bottom rows
    for top in (True, False):
        cx, w, y = prof[0] if top else prof[-1]; h = (ybot + 1 - y) * k; r = w * k
        c = len(pos); pos.append((0, h, 0)); nrm.append((0, 1 if top else -1, 0)); uv.append((cx / W, y / H))
        ring = []
        for s in range(2 * seg):
            th = 2 * math.pi * s / (2 * seg)
            pos.append((r * math.sin(th), h, r * math.cos(th))); nrm.append((0, 1 if top else -1, 0)); uv.append(((cx + w * 0.6 * math.sin(th)) / W, y / H)); ring.append(len(pos) - 1)
        for s in range(2 * seg):
            a, b = ring[s], ring[(s + 1) % (2 * seg)]
            idx += [c, a, b] if top else [c, b, a]
    n = glb(name, pos, nrm, uv, idx, pngbytes(im), extras)
    return n, height, 2 * max(p[1] for p in prof) * k

def bag(card, name, width, thick, nx=16, ny=22, extras=None):
    im, mk = cutout(card); W, H = im.size; R = rows(mk)
    ys = [y for y in range(H) if R[y]]; ytop, ybot = ys[0], ys[-1]
    xs = [v for y in ys for v in R[y]]; k = width / (max(xs) - min(xs))
    lv = np.linspace(ytop + 0.5, ybot + 0.5, ny + 1)
    pos, nrm, uv, idx = [], [], [], []
    for side in (1, -1):                                 # front (+z), back (-z)
        base = len(pos)
        for j, y in enumerate(lv):
            a, b = R[min(ybot, max(ytop, int(y)))]; a += 1; b -= 1; cxr = (a + b) / 2
            ty = (y - ytop) / (ybot - ytop)
            fy = max(0.0, math.sin(math.pi * min(1, max(0, (ty - 0.06) / 0.88)))) ** 0.55   # the crimped top and bottom stay flat
            for i in range(nx + 1):
                tx = i / nx; x = a + (b - a) * tx
                fx = math.sin(math.pi * tx) ** 0.5
                z = side * thick / 2 * fx * fy
                px, py = (x - (min(xs) + max(xs)) / 2) * k, (ybot + 1 - y) * k
                pos.append((px, py, z))
                u = x if side > 0 else cxr - (x - cxr)       # the back shows the picture again, reading the right way round
                uv.append((u / W, y / H))
                # normal: puff outward, leaning toward the edges
                gx = -side * (math.cos(math.pi * tx) * 0.9 if 0 < tx < 1 else (1 if tx == 0 else -1))
                gy = side * (0.6 * math.cos(math.pi * ty))
                nv = np.array([gx * 0.6, gy * 0.4, side * 1.0]); nrm.append(nv / np.linalg.norm(nv))
        for j in range(ny):
            for i in range(nx):
                a2 = base + j * (nx + 1) + i; b2 = a2 + 1; c2 = a2 + nx + 1; d2 = c2 + 1
                idx += [a2, c2, b2, b2, c2, d2] if side > 0 else [a2, b2, c2, b2, d2, c2]
    n = glb(name, pos, nrm, uv, idx, pngbytes(im), extras)
    return n, (ybot + 1 - ytop) * k

own = lambda title: {'title': title, 'author': 'CrazyLegsMalone (project owner) - product art generated at the owner\'s direction',
                     'license': 'First-party work, project owner', 'made_by': 'scripts/make_vend_items.py from assets/models/source/vend_cards/'}
print('milorade_bottle', bottle('milorade', 'milorade_bottle', 0.20, extras=own('Milorade sports drink bottle')))
print('wet_water_bottle', bottle('wet_water', 'wet_water_bottle', 0.22, extras=own('WET water bottle')))
print('chippys_bag', bag('chippys', 'chippys_bag', 0.17, 0.05, extras=own('Chippys: Extra Corn! chip bag')))
