/* ============================================================================
   ajudantes.js — materiais compartilhados e ajudantes de geometria.
   Define: mat(), DS, M, rng(), UP, limb(), lerp3(), ico(), box()
   Usa:    THREE
   ============================================================================ */

/* ---------- materiais ---------- */
function mat(c, o) {
  return new THREE.MeshPhongMaterial(Object.assign({ color: c, flatShading: true, specular: 0x000000, shininess: 0 }, o || {}));
}
var DS = THREE.DoubleSide;
var M = {
  eye: mat(0x151a17),
  pupil: mat(0x151a17),
  hi: mat(0xffffff, { emissive: 0xffffff }),
  stripe: mat(0xe6e6ec),
  sock: mat(0xe4e4e8),
  shoeWhite: mat(0xe9e9e4),
  shoeOut: mat(0x8d8d96)
};

function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var UP = new THREE.Vector3(0, 1, 0);

/* ---------- ajudantes de geometria ---------- */
function limb(a, b, r1, r2, m, seg) {
  var A = new THREE.Vector3(a[0], a[1], a[2]);
  var B = new THREE.Vector3(b[0], b[1], b[2]);
  var d = B.clone().sub(A);
  var len = d.length();
  var o = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, seg || 7, 1), m);
  o.position.copy(A.clone().add(B).multiplyScalar(0.5));
  o.quaternion.setFromUnitVectors(UP, d.normalize());
  return o;
}
function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function ico(r, d, m, sx, sy, sz) {
  var o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, d), m);
  o.scale.set(sx || 1, sy || 1, sz || 1);
  return o;
}
function box(w, h, d, m, x, y, z) {
  var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  return o;
}
