/* ---- Squeeg GLB character (TEST channel) -------------------------------
   Loads test/models/operator_male_psx_rig.glb and swaps it in for the box
   Squeeg built by makeCharacter(). The model is rigid parts hanging off named
   nodes, so the walk cycle rotates Arm_Upper_* / Leg_Upper_* (the real shoulder
   and hip pivots); *_Hierarchy_* sit at the origin and are deliberately unused.
   Any failure falls back to the box character, so this can never break the game.
   ------------------------------------------------------------------------ */
const SQUEEG = { ready: false, proto: null, parts: null,
  // TEST-only until the owner approves it for LIVE. ?char=0 forces the box
  // character back for an A/B check; ?char=1 forces the model anywhere.
  enabled: /[?&]char=0/.test(location.search) ? false
    : (/\/test\//.test(location.pathname) || /[?&]char=1/.test(location.search)),
  // Absolute: the game document carries <base href="../">, so a relative path
  // would resolve to /corn-souls/models/. The promoter rewrites this for LIVE.
  url: '/corn-souls/test/models/operator_male_psx_rig.glb',
  // Held items anchor here. The model faces +Z and its node names are mirrored,
  // so the hand that appears on Squeeg's RIGHT (matching the first-person gun)
  // is the model's Hand_Bare_L at model-space -0.292 -> +0.292 after the 180 flip.
  hand: [0.292, 0.835, -0.030],
  // Walk feel. cadence < 1 = slower stride cycle (fewer steps per metre),
  // stride / armSwing = how far the limbs travel (radians).
  cadence: 0.72, stride: 0.70, armSwing: 0.55,
  // Extra tilt (radians) added to a held item's authored pose, per item.
  // Tune these numbers directly; no rebuild needed, just reload.
  hold: { gun: [-0.15, 0.10, 0], crowbar: [-0.60, 0, 0.10], default: [0, 0, 0] } };

function squeegAccessor(doc, bin, index) {
  const a = doc.accessors[index], v = doc.bufferViews[a.bufferView];
  const types = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2],
                  5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
  const pair = types[a.componentType], size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const stride = v.byteStride || size * pair[1];
  const base = (v.byteOffset || 0) + (a.byteOffset || 0);
  const out = new pair[0](a.count * size), dv = new DataView(bin);
  for (let i = 0; i < a.count; i++) for (let j = 0; j < size; j++) {
    const at = base + i * stride + j * pair[1];
    out[i * size + j] = a.componentType === 5126 ? dv.getFloat32(at, true)
      : a.componentType === 5125 ? dv.getUint32(at, true)
      : a.componentType === 5123 ? dv.getUint16(at, true)
      : a.componentType === 5121 ? dv.getUint8(at)
      : a.componentType === 5122 ? dv.getInt16(at, true) : dv.getInt8(at);
  }
  return { array: out, itemSize: size };
}

function squeegBuild(doc, bin) {
  const mats = (doc.materials || []).map(m => {
    const f = (m.pbrMetallicRoughness || {}).baseColorFactor || [1, 1, 1, 1];
    return mat(new T.Color().setRGB(f[0], f[1], f[2]).getHex());
  });
  const meshes = (doc.meshes || []).map(m => (m.primitives || []).map(p => {
    const geo = new T.BufferGeometry(), names = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv' };
    for (const k in names) if (p.attributes[k] !== undefined) {
      const a = squeegAccessor(doc, bin, p.attributes[k]);
      geo.setAttribute(names[k], new T.BufferAttribute(a.array, a.itemSize));
    }
    if (p.indices !== undefined) {
      const a = squeegAccessor(doc, bin, p.indices);
      geo.setIndex(new T.BufferAttribute(a.array, 1));
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return { geo, skin: mats[p.material] || mat(0x8a8f96) };
  }));
  const nodes = doc.nodes || [];
  const groups = nodes.map(n => {
    const g = new T.Group(); g.name = n.name || '';
    if (n.matrix) new T.Matrix4().fromArray(n.matrix).decompose(g.position, g.quaternion, g.scale);
    else {
      if (n.translation) g.position.fromArray(n.translation);
      if (n.rotation) g.quaternion.fromArray(n.rotation);
      if (n.scale) g.scale.fromArray(n.scale);
    }
    return g;
  });
  nodes.forEach((n, i) => {
    if (n.mesh !== undefined) for (const part of meshes[n.mesh]) {
      const me = new T.Mesh(part.geo, part.skin);
      me.userData.noHit = true; me.castShadow = true;
      groups[i].add(me);
    }
    for (const c of n.children || []) groups[i].add(groups[c]);
  });
  return groups;
}

function squeegLoad() {
  window.__squeeg = SQUEEG;
  window.__view = VIEW;                 // debug handle: inspect/hide the avatar and held items
  window.__scene = scene;               // debug handle: bisect world objects
  // One-shot diagnostic: reports what is actually visible in each render pass.
  window.__diag = () => {
    const cv = document.querySelector('#view canvas');
    return {
      thirdPerson: VIEW.third,
      avatarBuilt: !!VIEW.av,
      avatarInWorldScene: !!(VIEW.av && VIEW.av.parent === scene),
      worldSceneVisibleChildren: scene.children.filter(o => o.visible).length,
      gunItemVisible: !!(VIEW.items && VIEW.items.gun && VIEW.items.gun.visible),
      hudScenePresent: !!hudScene,
      hudSceneVisible: hudScene ? hudScene.visible : null,
      hudVisibleChildren: hudScene ? hudScene.children.filter(o => o.visible).map(o => o.type) : null,
      firstPersonGunVisible: fpGun ? fpGun.visible : null,
      canvasFound: !!cv,
      canvasParentId: cv && cv.parentElement ? cv.parentElement.id : '(no parent)'
    };
  };
  if (!SQUEEG.enabled) { console.info('[squeeg] disabled for this build'); return; }
  console.info('[squeeg] loading ' + SQUEEG.url);
  fetch(SQUEEG.url, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw Error('HTTP ' + r.status + ' for ' + SQUEEG.url);
    return r.arrayBuffer();
  }).then(buf => {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546c67) throw Error('not a GLB');
    let off = 12, doc = null, bin = null;
    while (off < buf.byteLength) {
      const len = dv.getUint32(off, true), kind = dv.getUint32(off + 4, true); off += 8;
      if (kind === 0x4e4f534a) doc = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off, len)));
      if (kind === 0x004e4942) bin = buf.slice(off, off + len);
      off += len;
    }
    const groups = squeegBuild(doc, bin);
    const root = new T.Group();
    const sceneNodes = (doc.scenes && doc.scenes[doc.scene || 0] && doc.scenes[doc.scene || 0].nodes) || [0];
    for (const i of sceneNodes) root.add(groups[i]);
    SQUEEG.proto = root; SQUEEG.ready = true;
    if (typeof VIEW !== 'undefined') VIEW.key = '';   // drop the cached box avatar; next frame rebuilds
    console.info('[squeeg] model ready (' + (doc.meshes || []).length + ' meshes)');
  }).catch(e => {
    console.warn('[squeeg] model unavailable, using box character:', e.message);
  });
}

/* The export is flat: Arm_Upper / Arm_Lower / Hand are siblings under
   Arm_Hierarchy_*, so rotating one node moves only that one mesh. Build real
   pivots at the joints and re-parent the parts into them (attach() keeps every
   world transform, so the model does not move when it is re-rigged). */
function squeegPivot(av, jointName, members) {
  const joint = av.getObjectByName(jointName);
  if (!joint || !joint.parent) return null;
  const g = new T.Group();
  g.name = 'pivot:' + jointName;
  joint.parent.add(g);
  g.position.copy(joint.position);
  for (const name of members) {
    const part = av.getObjectByName(name);
    if (part && part !== g && part.parent !== g) g.attach(part);
  }
  return g;
}

function squeegAvatar(me, vest) {
  if (!SQUEEG.enabled || !SQUEEG.ready) {
    if (SQUEEG.enabled && !SQUEEG.ready && !SQUEEG.warned) {
      SQUEEG.warned = true;
      console.info('[squeeg] avatar requested before the model finished loading; will rebuild on load');
    }
    SQUEEG.parts = null;
    return makeCharacter(vest, false);
  }
  const model = SQUEEG.proto.clone(true);
  model.rotation.y = Math.PI;                      // model faces +Z, the game walks toward -Z
  const av = new T.Group(); av.add(model);
  av.updateMatrixWorld(true);
  const P = SQUEEG.parts = {};
  const ARM = s => ['Shoulder_Cap_' + s, 'Arm_Upper_' + s, 'Arm_Lower_' + s, 'Jacket_Wrist_Cuff_' + s, 'Hand_Bare_' + s];
  const FOREARM = s => ['Arm_Lower_' + s, 'Jacket_Wrist_Cuff_' + s, 'Hand_Bare_' + s];
  const LEG = s => ['Leg_Upper_' + s, 'Cargo_Pocket_' + s, 'Knee_Guard_' + s, 'Leg_Lower_' + s, 'Boot_Lug_' + s];
  const SHIN = s => ['Leg_Lower_' + s, 'Boot_Lug_' + s];
  for (const s of ['L', 'R']) {
    P['arm' + s] = squeegPivot(av, 'Arm_Upper_' + s, ARM(s));
    P['elbow' + s] = P['arm' + s] && squeegPivot(av, 'Arm_Lower_' + s, FOREARM(s));
    P['leg' + s] = squeegPivot(av, 'Leg_Upper_' + s, LEG(s));
    P['knee' + s] = P['leg' + s] && squeegPivot(av, 'Leg_Lower_' + s, SHIN(s));
  }
  av.traverse(o => { o.userData.noHit = true; if (o.isMesh) o.castShadow = true; });
  return av;
}

/* Place held items in the hand and add a per-item tilt. The authored rotation is
   kept (tools ship with a 0.5 rad tilt of their own), so SQUEEG.hold holds
   deltas rather than absolute angles. */
function squeegHold(items) {
  const h = SQUEEG.hand, table = SQUEEG.hold || {};
  for (const k in items) {
    const it = items[k];
    if (!it || !it.isObject3D) continue;
    it.position.set(h[0], h[1], h[2]);
    const base = it.userData.baseRot || (it.userData.baseRot = [it.rotation.x, it.rotation.y, it.rotation.z]);
    const d = table[k] || table.default || [0, 0, 0];
    it.rotation.set(base[0] + d[0], base[1] + d[1], base[2] + d[2]);
  }
}

function squeegPose(av) {
  const P = SQUEEG.parts; if (!P) return;
  // The third-person gun is built but setRounds() is never called for it, so its
  // magazine sits at defaults: all 6 shells visible and the water column at its
  // full 1 m scale (which reads as a long blue line). Sync it, then hide the
  // water level, which is only useful on the first-person gun.
  const gunItem = VIEW.items && VIEW.items.gun;
  if (gunItem && gunItem.__sg) {
    gunItem.__sg.setRounds(ammo, mags[ammo]);
    gunItem.__sg.wcol.visible = false;
  }
  const swing = Math.sin(VIEW.ph * SQUEEG.cadence);   // <1 = slower step cycle
  const LEG = swing * SQUEEG.stride, ARM = -swing * SQUEEG.armSwing;
  if (P.legL) P.legL.rotation.x = LEG;                    // + swings the hanging limb backward
  if (P.legR) P.legR.rotation.x = -LEG;
  if (P.kneeL) P.kneeL.rotation.x = Math.max(0, -LEG) * 1.15;   // shin folds on the forward swing
  if (P.kneeR) P.kneeR.rotation.x = Math.max(0, LEG) * 1.15;
  const holding = held !== 'hand';
  const carrying = (typeof SR !== 'undefined' && SR.carry === 'me');
  // Held items anchor on the arm node named L (see SQUEEG.hand), so that is the
  // arm that raises to carry them; the other arm keeps the boom-box carry pose.
  if (P.armL) P.armL.rotation.x = holding ? -0.95 : -ARM;
  if (P.elbowL) P.elbowL.rotation.x = holding ? -0.55 : -0.12;
  if (P.armR) P.armR.rotation.x = carrying ? -2.6 : ARM;
  if (P.elbowR) P.elbowR.rotation.x = carrying ? -0.8 : -0.12;
}

squeegLoad();
