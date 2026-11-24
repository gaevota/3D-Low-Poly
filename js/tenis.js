/* ============================================================================
   tenis.js — o tênis de uma perna.
   Define: createShoe(s, shoeM) → shoePivot
   Usa:    THREE, M, box() (ajudantes.js)
   ============================================================================ */

/* s      = lado da perna (−1 ou 1)
   shoeM  = material do cabedal (cada personagem tem o seu, para a cor poder mudar)
   Devolve o shoePivot, que fica no tornozelo: quem chama o coloca no grupo da perna e o gira ao andar. */
function createShoe(s, shoeM) {
  /* tênis */
  /* shoePivot fica no tornozelo (y = 0,7): o tênis gira em torno dele para a boca do tênis continuar encaixada na meia */
  var shoePivot = new THREE.Group();
  shoePivot.position.set(s * 0.46, 0.7, 0);
  var shoe = new THREE.Group();
  shoe.position.set(0, -0.7, 0);
  shoe.rotation.y = s * 0.12;
  shoePivot.add(shoe);
  /* sola: contorno angular (x, z) extrudado para cima; camada cinza embaixo + entressola branca */
  var SOLE = [[-0.18,-0.38],[0.18,-0.38],[0.31,-0.28],[0.34,0.10],[0.33,0.60],[0.30,0.95],[0.22,1.20],[0.08,1.30],
              [-0.08,1.30],[-0.22,1.20],[-0.30,0.95],[-0.33,0.60],[-0.34,0.10],[-0.31,-0.28]];
  function soleLayer(k, y0, h, m) {
    var sh = new THREE.Shape();
    SOLE.forEach(function (p, i) {
      var px = p[0] * k, pz = 0.4 + (p[1] - 0.4) * k;
      if (i) sh.lineTo(px, -pz); else sh.moveTo(px, -pz);
    });
    var g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    var o = new THREE.Mesh(g, m);
    o.position.y = y0;
    shoe.add(o);
  }
  soleLayer(0.97, 0, 0.05, M.shoeOut);
  soleLayer(1.0, 0.05, 0.13, M.shoeWhite);

  /* cabedal: seções transversais angulares ligadas ao longo do pé (z, meia-largura, ombro, topo, meia-largura do topo) */
  var VR = [[0.22,0.31,0.42,0.70,0.15],[0.48,0.32,0.38,0.56,0.15],[0.74,0.30,0.34,0.46,0.13],
            [0.97,0.26,0.30,0.38,0.11],[1.12,0.20,0.25,0.31,0.08]];
  var Y0 = 0.14, rings = [], vv = [];
  VR.forEach(function (r) {
    var w = r[1], y1 = r[2], yt = r[3], tw = r[4];
    rings.push([[-w, Y0, r[0]], [-w, y1, r[0]], [-tw, yt, r[0]], [tw, yt, r[0]], [w, y1, r[0]], [w, Y0, r[0]]]);
  });
  function tri(a, b, c) { vv.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
  for (var ri = 0; ri < rings.length - 1; ri++) {
    for (var rj = 0; rj < 5; rj++) {
      var qa = rings[ri][rj], qb = rings[ri][rj + 1], qc = rings[ri + 1][rj + 1], qd = rings[ri + 1][rj];
      tri(qa, qb, qc); tri(qa, qc, qd);
    }
  }
  var rf = rings[0], rc = [0, 0.4, rf[0][2]];
  for (var cj = 0; cj < 6; cj++) tri(rc, rf[cj], rf[(cj + 1) % 6]);
  var rl = rings[rings.length - 1], rtip = [0, 0.2, 1.24];
  for (var tj = 0; tj < 6; tj++) tri(rl[tj], rl[(tj + 1) % 6], rtip);
  var vampGeo = new THREE.BufferGeometry();
  vampGeo.setAttribute('position', new THREE.Float32BufferAttribute(vv, 3));
  vampGeo.computeVertexNormals();
  shoe.add(new THREE.Mesh(vampGeo, shoeM));

  /* parte de trás do cabedal: paredes laterais + calcanhar + tampa com o furo da perna, emendando com a frente */
  var HZ = [-0.36, -0.28, -0.10, 0.05, 0.22], HW = [0.19, 0.295, 0.315, 0.325, 0.31], HH = 0.5, HT = 0.95;
  var hv = [];
  function hq(a, b, c, d) { hv.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]); }
  for (var hi = 0; hi < HZ.length - 1; hi++) {
    [-1, 1].forEach(function (sd) {
      hq([sd * HW[hi], Y0, HZ[hi]], [sd * HW[hi] * HT, HH, HZ[hi]], [sd * HW[hi + 1] * HT, HH, HZ[hi + 1]], [sd * HW[hi + 1], Y0, HZ[hi + 1]]);
    });
  }
  hq([-HW[0], Y0, HZ[0]], [-HW[0] * HT, HH, HZ[0]], [HW[0] * HT, HH, HZ[0]], [HW[0], Y0, HZ[0]]);
  var heelGeo = new THREE.BufferGeometry();
  heelGeo.setAttribute('position', new THREE.Float32BufferAttribute(hv, 3));
  heelGeo.computeVertexNormals();
  shoe.add(new THREE.Mesh(heelGeo, shoeM));

  /* topo do tênis: o próprio cabedal sobe em declive das laterais e do peito do pé até abraçar a meia */
  var OL = [[0, 0.5, -0.36], [-0.1805, 0.5, -0.36], [-0.285, 0.5, -0.28], [-0.309, 0.5, -0.10], [-0.318, 0.5, 0.05],
            [-0.2945, 0.5, 0.22], [-0.14, 0.655, 0.34], [0, 0.655, 0.34], [0.14, 0.655, 0.34], [0.2945, 0.5, 0.22],
            [0.318, 0.5, 0.05], [0.309, 0.5, -0.10], [0.285, 0.5, -0.28], [0.1805, 0.5, -0.36]];
  var OI = OL.map(function (P) {
    var ca = Math.atan2(P[0], P[2]);
    return [Math.sin(ca) * 0.256, 0.78, Math.cos(ca) * 0.256];
  });
  var tv = [];
  for (var tm = 0; tm < OL.length; tm++) {
    var tn = (tm + 1) % OL.length;
    tv.push(OL[tm][0], OL[tm][1], OL[tm][2], OL[tn][0], OL[tn][1], OL[tn][2], OI[tn][0], OI[tn][1], OI[tn][2]);
    tv.push(OL[tm][0], OL[tm][1], OL[tm][2], OI[tn][0], OI[tn][1], OI[tn][2], OI[tm][0], OI[tm][1], OI[tm][2]);
  }
  var topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(tv, 3));
  topGeo.computeVertexNormals();
  shoe.add(new THREE.Mesh(topGeo, shoeM));
  /* camada interna preta logo abaixo da borda: fecha o fundo ao redor da meia, então não se vê o que tem dentro */
  var inner = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.24, 8, 1), shoeM);
  inner.position.set(0, 0.6, 0);
  shoe.add(inner);
  /* enchimento preto sólido por todo o interior: mesmas seções do cabedal, um pouco menores, do calcanhar à ponta */
  var FS = [];
  for (var fz = 0; fz < HZ.length - 1; fz++) {
    var fw = HW[fz] * 0.9;
    FS.push([HZ[fz] + (fz === 0 ? 0.03 : 0), [[-fw, 0.2], [-fw, 0.4], [-fw * 0.8, 0.46], [fw * 0.8, 0.46], [fw, 0.4], [fw, 0.2]]]);
  }
  VR.forEach(function (r) {
    var vw = r[1] * 0.9, vy = r[2] - 0.04, vt = r[3] - 0.04, vtw = r[4] * 0.8;
    FS.push([r[0], [[-vw, 0.2], [-vw, vy], [-vtw, vt], [vtw, vt], [vw, vy], [vw, 0.2]]]);
  });
  var fv2 = [];
  function fp(s, j) { var q = FS[s][1][j % 6]; return [q[0], q[1], FS[s][0]]; }
  function ftri(a, b, c) { fv2.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
  for (var fs = 0; fs < FS.length - 1; fs++) {
    for (var fj = 0; fj < 6; fj++) {
      ftri(fp(fs, fj), fp(fs, fj + 1), fp(fs + 1, fj + 1));
      ftri(fp(fs, fj), fp(fs + 1, fj + 1), fp(fs + 1, fj));
    }
  }
  [0, FS.length - 1].forEach(function (cs) {
    var cc = [0, 0.32, FS[cs][0]];
    for (var cj = 0; cj < 6; cj++) ftri(cc, fp(cs, cj), fp(cs, cj + 1));
  });
  var fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(fv2, 3));
  fillGeo.computeVertexNormals();
  shoe.add(new THREE.Mesh(fillGeo, shoeM));

  /* cadarços brancos sobre a parte inclinada do peito do pé */
  function topAt(z) {
    for (var q = 0; q < VR.length - 1; q++) {
      if (z <= VR[q + 1][0]) {
        var t = (z - VR[q][0]) / (VR[q + 1][0] - VR[q][0]);
        return [VR[q][3] + (VR[q + 1][3] - VR[q][3]) * t, VR[q][4] + (VR[q + 1][4] - VR[q][4]) * t];
      }
    }
    return [VR[VR.length - 1][3], VR[VR.length - 1][4]];
  }
  [0.40, 0.57, 0.74, 0.91].forEach(function (lz) {
    var a = topAt(lz - 0.04)[0], b = topAt(lz + 0.04)[0], tp = topAt(lz);
    var lace = box(tp[1] * 2 + 0.1, 0.035, 0.08, M.shoeWhite, 0, tp[0] + 0.022, lz);
    lace.rotation.x = Math.atan2(a - b, 0.08);
    shoe.add(lace);
  });
  return shoePivot;
}
