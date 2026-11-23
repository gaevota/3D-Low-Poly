(function () {
  var stage = document.getElementById('stage');
  if (!window.THREE) { stage.textContent = 'Não foi possível carregar o motor 3D.'; return; }
  var THREE = window.THREE;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (err) {
    stage.textContent = 'Este navegador não conseguiu abrir o 3D (WebGL indisponível).';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Modelo 3D low poly de corpo inteiro de uma menina de cabelo castanho volumoso em facetas, camiseta larga, bermuda preta com listras, meias brancas e tênis, com mãos simples de cinco dedos. Use as setas para girar.');
  stage.appendChild(canvas);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  /* ---------- luzes (suaves para a pele não estourar) ---------- */
  var hemi = new THREE.HemisphereLight(0xffffff, 0x8a8aa0, 0.62); scene.add(hemi);
  var key = new THREE.DirectionalLight(0xfff4ea, 0.7); key.position.set(3, 8, 7); scene.add(key);
  var fill = new THREE.DirectionalLight(0xb8c4ff, 0.3); fill.position.set(-6, 3, 3); scene.add(fill);
  var rim = new THREE.DirectionalLight(0x9fb4ff, 0.35); rim.position.set(-4, 4, -6); scene.add(rim);
  /* intensidades do visualizador, para restaurar ao sair do jogo */
  var VIEW_LIGHTS = [[hemi, 0.62], [key, 0.7], [fill, 0.3], [rim, 0.35]];

  /* ---------- materiais ---------- */
  function mat(c, o) {
    return new THREE.MeshPhongMaterial(Object.assign({ color: c, flatShading: true, specular: 0x000000, shininess: 0 }, o || {}));
  }
  var DS = THREE.DoubleSide;
  var M = {
    eye: mat(0x151a17),
    pupil: mat(0x151a17),
    hi: mat(0xffffff, { emissive: 0xffffff }),
    lid: mat(0x3e343e),
    mouth: mat(0x8a5a5a),
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

  var rig = new THREE.Group();          /* gira com o mouse; guarda os personagens */
  scene.add(rig);

  /* ---------- fábrica de personagem ----------
     Monta uma menina completa e devolve as partes que as animações mexem.
     Cada chamada gera uma cópia independente; o gerador aleatório é recriado
     aqui dentro para todas as cópias terem exatamente o mesmo cabelo. */
  function createCharacter(variant) {
    /* variant = posição da aba (0 = Personagem 1, 1 = Personagem 2...); só muda detalhes de cada um */
    var rnd = rng(7);
    /* camiseta própria de cada personagem, para a cor poder mudar sem afetar os outros */
    var shirtM = mat(0xffffff), shirtD = mat(0xffffff);
    var shortsM = mat(0xffffff), shoeM = mat(0xffffff, { side: DS });   /* shoeM = cabedal do tênis */
    /* pele (cabeça lisa, corpo facetado e orelhas um pouco mais escuras) e cabelo: a cor vem do material,
       as facetas do cabelo só guardam claro/escuro */
    var skinM = mat(0xffffff), skinSmoothM = mat(0xffffff, { flatShading: false }), skinShadeM = mat(0xffffff);
    var hairM = mat(0xffffff, { vertexColors: true, side: DS });
    var character = new THREE.Group();    /* pés em y = 0, depois deslocado para centralizar */
    character.position.set(-0.05, -4.6, 0);

    /* ---------- cabeça ---------- */
    var HEAD_Y = 7.92;
    var head = new THREE.Group();
    var hg = new THREE.IcosahedronGeometry(0.9, 2);
    var pos = hg.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i) * 1.1, y = pos.getY(i) * 1.1 * 0.98, z = pos.getZ(i) * 1.1 * 0.98;
      if (y < 0) {
        var k = Math.min(1, -y / 0.95);
        x *= 1 - 0.03 * k;
        z *= 1 - 0.02 * k;
      }
      pos.setXYZ(i, x, y, z);
    }
    var headMesh = new THREE.Mesh(hg, skinSmoothM);
    head.add(headMesh);
    head.updateMatrixWorld(true);

    var ray = new THREE.Raycaster();
    function surf(x, y) {
      ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1));
      var h = ray.intersectObject(headMesh, false)[0];
      return h ? h.point.clone() : new THREE.Vector3(x, y, 0.8);
    }

    /* olhos grandes, de íris cinza-esverdeada */
    [-1, 1].forEach(function (s) {
      var p = surf(s * 0.34, -0.14);
      var e = ico(1, 1, M.eye, 0.17, 0.2, 0.06);
      e.position.set(p.x, p.y, p.z + 0.01);
      e.rotation.y = s * 0.35;
      head.add(e);
      var pu = ico(0.085, 0, M.pupil, 1, 1.25, 0.5);
      pu.position.set(p.x, p.y - 0.005, p.z + 0.03);
      var hi = ico(0.035, 0, M.hi, 1, 1, 0.5);
      hi.position.set(p.x + 0.05, p.y + 0.07, p.z + 0.1);
      head.add(hi);
      var lid = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.05), M.lid);
      lid.position.set(p.x, p.y + 0.28, p.z - 0.005);
      lid.rotation.z = -s * 0.04;
      lid.rotation.y = s * 0.35;
      lid.position.z += 0.03;
      head.add(lid);
    });
    /* boca */
    var mp = surf(0, -0.52);
    var mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.04), M.mouth);
    mouth.position.set(mp.x, mp.y, mp.z + 0.015);
    head.add(mouth);
    /* orelhas */
    [-1, 1].forEach(function (s) {
      var ear = ico(0.17, 0, skinShadeM, 0.5, 1, 0.8);
      ear.position.set(s * 0.93, -0.12, -0.02);
      head.add(ear);
    });

    /* ---------- cabelo: casca volumosa de facetas grandes + lâminas ----------
       Cada faceta ganha um tom próprio conforme a direção em que aponta,
       para a luz e a sombra ficarem marcadas como em papel dobrado. */
    var HAIR_LIGHT = new THREE.Vector3(0.3, 0.75, 0.6).normalize();
    function bake(geo, hex, center, spread) {
      var g = geo.index ? geo.toNonIndexed() : geo;
      var p = g.attributes.position;
      var n = p.count / 3;
      var col = new Float32Array(p.count * 3);
      var base = new THREE.Color(hex);
      var A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
      var N = new THREE.Vector3(), T = new THREE.Vector3(), Cn = new THREE.Vector3();
      for (var f = 0; f < n; f++) {
        A.fromBufferAttribute(p, f * 3);
        B.fromBufferAttribute(p, f * 3 + 1);
        C.fromBufferAttribute(p, f * 3 + 2);
        N.copy(B).sub(A).cross(T.copy(C).sub(A)).normalize();
        Cn.copy(A).add(B).add(C).multiplyScalar(1 / 3).sub(center);
        if (N.dot(Cn) < 0) N.negate();
        var l = N.dot(HAIR_LIGHT) * 0.5 + 0.5;
        var s = 0.62 + 0.78 * l + (rnd() - 0.5) * spread;
        for (var j = 0; j < 3; j++) {
          var o = (f * 3 + j) * 3;
          col[o] = base.r * s; col[o + 1] = base.g * s; col[o + 2] = base.b * s;
        }
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    }

    var SHELL_C = new THREE.Vector3(0, 0.08, -0.06);
    var BANG_TIP_Y = 0.15;     /* altura da ponta da franja na esfera do cabelo (o "bico" original ficava em 0,526) */
    function noise3(x, y, z) {
      return Math.sin(x * 7.3 + y * 5.1 + z * 3.7) * 0.5 + Math.sin(x * 3.1 - y * 8.7 + z * 6.3) * 0.5;
    }
    /* casca: esfera de poucas faces, aberta embaixo e com uma janela para o rosto */
    /* longBang = true gera o "Cabelo 2" (franja comprida); false gera o "Cabelo 1" */
    function buildShell(longBang) {
    rnd = rng(7);                 /* mesmas cores de faceta em toda reconstrução */
    var shellSrc = new THREE.IcosahedronGeometry(1, 1);
    var sp = shellSrc.attributes.position;
    var kept = [];
    for (var fi = 0; fi < sp.count; fi += 3) {
      var cx = (sp.getX(fi) + sp.getX(fi + 1) + sp.getX(fi + 2)) / 3;
      var cy = (sp.getY(fi) + sp.getY(fi + 1) + sp.getY(fi + 2)) / 3;
      var cz = (sp.getZ(fi) + sp.getZ(fi + 1) + sp.getZ(fi + 2)) / 3;
      var bottomOpen = cy < -0.72;
      var faceWindow = cz > 0.5 && cy > -0.8 && cy < 0.42 && Math.abs(cx) < 0.58;
      if (bottomOpen || faceWindow) continue;
      for (var q = 0; q < 3; q++) {
        var vx = sp.getX(fi + q), vy = sp.getY(fi + q), vz = sp.getZ(fi + q);
        /* Personagem 2, franja: o vértice do cabelo que forma o "bico" no meio da testa
           (0; 0,526; 0,851 na esfera) desce, então o triângulo de cabelo do meio da testa
           fica comprido e termina perto das sobrancelhas. O vértice continua sobre a esfera. */
        if (longBang && Math.abs(vx) < 0.01 && Math.abs(vy - 0.526) < 0.01 && vz > 0.8) {
          vy = BANG_TIP_Y;
          vz = Math.sqrt(1 - vy * vy - vx * vx);
        }
        var rr = 1 + noise3(vx, vy, vz) * 0.02;
        var fl = vy < 0 ? 1 + 0.14 * (-vy) : 1;
        kept.push(vx * rr * fl * 1.12 + SHELL_C.x, vy * rr * 1.2 + SHELL_C.y, vz * rr * fl * 1.12 + SHELL_C.z);
      }
    }
    var shellGeo = new THREE.BufferGeometry();
    shellGeo.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
    bake(shellGeo, 0xffffff, SHELL_C, 0.06);       /* só claro/escuro; a cor do cabelo vem do material */
    return shellGeo;
    }
    var hairMesh = new THREE.Mesh(buildShell(variant === 1), hairM);
    head.add(hairMesh);
    function setHair(n) {
      hairMesh.geometry.dispose();
      hairMesh.geometry = buildShell(n === 2);
      result.hair = n;
    }

    head.position.set(0, HEAD_Y, 0.05);
    head.rotation.set(0.2, 0.1, -0.06);
    head.scale.setScalar(0.92);
    character.add(head);

    /* ---------- tronco (camiseta larga) ---------- */
    character.add(limb([0, 6.7, 0], [0, 7.22, 0.02], 0.24, 0.22, skinM, 7));

    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.0, 2.3, 8, 1), shirtM);
    torso.scale.z = 0.6;
    torso.position.y = 5.55;          /* de 4,4 a 6,7 */
    character.add(torso);

    var collar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 5, 10), shirtD);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 6.73, 0.0);
    collar.scale.set(1, 1, 1);
    character.add(collar);


    /* ---------- mão simples low poly: luva de uma peça só + polegar ----------
       Origem no pulso, dedos para baixo; a palma olha para o corpo.
       s = +1 mão direita (x positivo), s = -1 mão esquerda. */
    function makeHand(s) {
      var g = new THREE.Group();
      var d = -s;                               /* lado da palma no eixo x */
      var body = ico(1, 1, skinM, 0.115, 0.4, 0.2);
      body.position.set(0, -0.28, 0);
      g.add(body);
      var thumb = ico(1, 1, skinM, 0.06, 0.2, 0.068);
      thumb.position.set(d * 0.04, -0.27, 0.22);
      thumb.rotation.x = -0.35;
      g.add(thumb);
      return g;
    }

    /* ---------- braço direito caído (à direita na imagem de frente) ---------- */
    var S = [0.7, 6.62, 0.05], E = [0.9, 5.65, 0.05], H1 = [1.1, 4.4, 0.05];
    /* grupo do braço que acena: gira em torno do ombro */
    var armRG = new THREE.Group(); armRG.position.set(S[0], S[1], S[2]); character.add(armRG);
    var armIn = new THREE.Group(); armIn.position.set(-S[0], -S[1], -S[2]); armRG.add(armIn);
    armIn.add(limb(lerp3(S, H1, 0.07), H1, 0.21, 0.085, skinM, 7));
    armIn.add(limb([0.69, 6.7, 0.0], lerp3(S, E, 0.8), 0.26, 0.38, shirtM, 7));
    var hand1 = makeHand(1);
    hand1.position.set(H1[0], H1[1] + 0.03, H1[2]);
    hand1.scale.setScalar(0.95);
    armIn.add(hand1);

    /* ---------- braço esquerdo caído (à esquerda na imagem de frente) ---------- */
    var S2 = [-0.7, 6.62, 0.05], E2 = [-0.9, 5.65, 0.05], H2 = [-1.1, 4.4, 0.05];
    var armLG = new THREE.Group(); armLG.position.set(S2[0], S2[1], S2[2]); character.add(armLG);
    var armLIn = new THREE.Group(); armLIn.position.set(-S2[0], -S2[1], -S2[2]); armLG.add(armLIn);
    armLIn.add(limb(lerp3(S2, H2, 0.07), H2, 0.21, 0.085, skinM, 7));
    armLIn.add(limb([-0.69, 6.7, 0.0], lerp3(S2, E2, 0.8), 0.26, 0.38, shirtM, 7));
    var hand2 = makeHand(-1);
    hand2.position.set(H2[0], H2[1] + 0.03, H2[2]);
    hand2.scale.setScalar(0.95);
    armLIn.add(hand2);

    var bodyRoot = character;
    var legs = [];
    /* ---------- bermuda, pernas, meias e tênis ---------- */
    [-1, 1].forEach(function (s) {
      /* cada perna fica num grupo que gira em torno do quadril (para andar) */
      var legG = new THREE.Group(); legG.position.set(s * 0.42, 4.0, 0); bodyRoot.add(legG);
      var legIn = new THREE.Group(); legIn.position.set(-s * 0.42, -4.0, 0); legG.add(legIn);
      legs.push({ g: legG, s: s });
      /* bermuda: um cano por perna, com a listra branca na lateral */
      var sl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 1.1, 8, 1), shortsM);
      sl.scale.z = 0.85;
      sl.position.set(s * 0.42, 3.85, 0);   /* de 3,3 a 4,4 */
      legIn.add(sl);
      /* listra colada na lateral da bermuda, inclinada para acompanhar o cano que alarga embaixo */
      var stripe = box(0.05, 1.12, 0.1, M.stripe, s * 0.92, 3.85, 0);
      stripe.rotation.z = s * 0.09;
      legIn.add(stripe);

      /* pernas */
      var hipP = [s * 0.42, 3.6, 0], ankle = [s * 0.46, 0.7, 0];
      legIn.add(limb(hipP, ankle, 0.26, 0.14, skinM, 8));

      /* meia larga com a boca dobrada */
      legIn.add(limb([s * 0.46, 0.2, 0], [s * 0.46, 1.4, 0], 0.235, 0.25, M.sock, 8));
      legIn.add(limb([s * 0.46, 1.25, 0], [s * 0.46, 1.55, 0], 0.29, 0.3, M.sock, 8));

      /* tênis */
      var shoe = new THREE.Group();
      shoe.position.set(s * 0.46, 0, 0);
      shoe.rotation.y = s * 0.12;
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
      legIn.add(shoe);
    });

    var result = { character: character, armRG: armRG, armLG: armLG, hand1: hand1, legs: legs,
                   parts: {                       /* peças que mudam de cor: materiais principais + os de tom mais escuro (k = quanto escurece) */
                     shirt: { main: [shirtM], dark: [shirtD], k: 0.72, hex: null },    /* a gola usa o tom escuro */
                     shorts: { main: [shortsM], dark: [], hex: null },
                     shoes: { main: [shoeM], dark: [], hex: null },
                     skin: { main: [skinM, skinSmoothM], dark: [skinShadeM], k: 0.87, hex: null },   /* as orelhas usam o tom escuro */
                     hair: { main: [hairM], dark: [], hex: null }
                   },
                   hair: variant === 1 ? 2 : 1, setHair: setHair };
    Object.keys(PART_DEFAULT).forEach(function (k) { setPartColor(result, k, PART_DEFAULT[k]); });
    return result;
  }

  /* cor de uma peça: o tom principal vem do hex; o tom escuro (gola, orelhas) é o mesmo, mais escuro */
  var PART_DEFAULT = {
    shirt: '#1b1b20', shorts: '#1b1b20', shoes: '#1b1b20',      /* roupas pretas */
    skin: '#d3c3bb', hair: '#5a4a43'                              /* pele e cabelo como eram antes */
  };
  function setPartColor(c, part, hex) {
    var p = c.parts[part];
    p.hex = hex;
    p.main.forEach(function (m) { m.color.set(hex); });
    p.dark.forEach(function (m) { m.color.set(hex).multiplyScalar(p.k); });
  }

  /* ---------- personagens (abas) ----------
     Cria os personagens, mostra um por vez e monta as abas "Personagem 1..N".
     Por enquanto só existe o Personagem 1. */
  var NUM_CHARACTERS = 1;
  var characters = [];
  var active = null;
  var tabList = document.getElementById('personagens');
  var charName = document.getElementById('charName');
  var tabBtns = [];
  var nf = new Intl.NumberFormat('pt-BR');

  function triCount(root) {
    var n = 0;
    root.traverse(function (o) {
      if (o.isMesh) {
        var g = o.geometry;
        n += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      }
    });
    return n;
  }
  function selectCharacter(i, focus) {
    active = characters[i];
    characters.forEach(function (c) { c.character.visible = (c === active); });
    tabBtns.forEach(function (b, j) {
      var on = j === i;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    stage.setAttribute('aria-labelledby', tabBtns[i].id);
    if (focus) tabBtns[i].focus();
    charName.textContent = active.name;
    syncColorUI();
    syncHairUI();
    document.getElementById('count').textContent = nf.format(Math.round(triCount(active.character))) + ' triângulos';
  }
  for (var ci = 0; ci < NUM_CHARACTERS; ci++) {
    (function (i) {
      var c = createCharacter(i);
      c.name = 'Personagem ' + (i + 1);
      c.character.visible = false;
      rig.add(c.character);
      characters.push(c);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.id = 'tab-personagem-' + (i + 1);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'stage');
      b.textContent = c.name;
      b.addEventListener('click', function () { selectCharacter(i); });
      tabList.appendChild(b);
      tabBtns.push(b);
    })(ci);
  }
  stage.setAttribute('role', 'tabpanel');
  /* com um personagem só, as abas não têm o que escolher */
  if (NUM_CHARACTERS === 1) {
    document.getElementById('personagens-label').hidden = true;
    tabList.hidden = true;
  }
  tabList.addEventListener('keydown', function (e) {
    var i = tabBtns.indexOf(document.activeElement);
    if (i < 0) return;
    var n = tabBtns.length, to = -1;
    if (e.key === 'ArrowRight') to = (i + 1) % n;
    else if (e.key === 'ArrowLeft') to = (i - 1 + n) % n;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = n - 1;
    if (to >= 0) { e.preventDefault(); selectCharacter(to, true); }
  });

  /* ---------- cor da camiseta, do shorts e do tênis (cada personagem tem as suas) ---------- */
  var CLOTH_COLORS = [
    ['Azul-marinho', '#2f3366'], ['Vermelho', '#b3333a'], ['Laranja', '#d9772b'], ['Amarelo', '#e0b92f'],
    ['Verde', '#3f8a55'], ['Turquesa', '#2f9aa3'], ['Roxo', '#7a45a8'], ['Rosa', '#d9739c'],
    ['Branco', '#e9e9ee'], ['Cinza', '#7d7f8c'], ['Preto', '#1b1b20']
  ];
  /* cada peça tem a sua paleta: roupas usam as cores acima; pele e cabelo, tons próprios */
  var PALETTES = {
    shirt: CLOTH_COLORS, shorts: CLOTH_COLORS, shoes: CLOTH_COLORS,
    skin: [['Muito clara', '#f3d9c8'], ['Clara', '#e8c4aa'], ['Bege', '#d3c3bb'], ['Média', '#c99a78'],
           ['Morena', '#a8714f'], ['Escura', '#7a4b32'], ['Muito escura', '#4a2e20']],
    hair: [['Preto', '#1b1b20'], ['Castanho escuro', '#3a2a24'], ['Castanho', '#5a4a43'], ['Castanho claro', '#8a6a4a'],
           ['Loiro', '#d8b56a'], ['Ruivo', '#a8432a'], ['Grisalho', '#9a9aa4'], ['Branco', '#e9e9ee'],
           ['Rosa', '#d9739c'], ['Azul', '#3f6fd0'], ['Roxo', '#7a45a8'], ['Verde', '#3f8a55']]
  };
  var PARTS = [['shirt', 'Camiseta'], ['shorts', 'Shorts'], ['shoes', 'Tênis'], ['skin', 'Pele'], ['hair', 'Cabelo']];
  var curPart = 'shirt';                 /* peça que o seletor está pintando */
  var partBox = document.getElementById('partBtns');
  var colorBox = document.getElementById('colorSwatches');
  var colorCustom = document.getElementById('colorCustom');
  var partBtns = [];
  var swatchBtns = [];
  function syncColorUI() {
    var hex = active.parts[curPart].hex.toLowerCase();
    partBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-part') === curPart ? 'true' : 'false'); });
    swatchBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-hex') === hex ? 'true' : 'false'); });
    colorCustom.value = hex;
  }
  function applyColor(hex) {
    setPartColor(active, curPart, hex);
    syncColorUI();
  }
  PARTS.forEach(function (pt) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'part';
    b.setAttribute('data-part', pt[0]);
    b.setAttribute('aria-pressed', 'false');
    b.textContent = pt[1];
    b.addEventListener('click', function () { curPart = pt[0]; buildSwatches(); syncColorUI(); });
    partBox.appendChild(b);
    partBtns.push(b);
  });
  /* refaz os botões de cor com a paleta da peça escolhida */
  function buildSwatches() {
    colorBox.innerHTML = '';
    swatchBtns = [];
    PALETTES[curPart].forEach(function (sc) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.setAttribute('data-hex', sc[1]);
      b.setAttribute('aria-label', 'Cor ' + sc[0].toLowerCase());
      b.setAttribute('aria-pressed', 'false');
      b.title = sc[0];
      b.style.backgroundColor = sc[1];
      b.addEventListener('click', function () { applyColor(sc[1]); });
      colorBox.appendChild(b);
      swatchBtns.push(b);
    });
  }
  buildSwatches();
  colorCustom.addEventListener('input', function () { applyColor(colorCustom.value); });

  /* ---------- cabelo: só o Personagem 1 tem a opção (Cabelo 1 = atual, Cabelo 2 = o do Personagem 2) ---------- */
  var hairPicker = document.getElementById('hairPicker');
  var btnHair = [document.getElementById('btnHair1'), document.getElementById('btnHair2')];
  function syncHairUI() {
    hairPicker.hidden = (active !== characters[0]);
    btnHair.forEach(function (b, j) { b.setAttribute('aria-pressed', active.hair === j + 1 ? 'true' : 'false'); });
  }
  btnHair.forEach(function (b, j) {
    b.addEventListener('click', function () { active.setHair(j + 1); syncHairUI(); });
  });
  selectCharacter(0);

  /* ---------- câmera e controles ---------- */
  var START_YAW = 0.3, START_PITCH = 0.05;
  var yaw = START_YAW, pitch = START_PITCH, zoom = 1, zoomCur = 1;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var auto = !reduce;
  var drag = null;
  var playing = false;                  /* true enquanto estiver dentro do ambiente de jogo */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function applyCamera() {
    var fov = camera.fov * Math.PI / 180;
    var th2 = 2 * Math.tan(fov / 2);
    var base = Math.max(10.6 / th2, 5.6 / (th2 * camera.aspect));
    camera.position.set(0, 0.3, base * zoomCur);
    camera.lookAt(0, 0, 0);
  }
  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);
  resize();

  var btnSpin = document.getElementById('btnSpin');
  var btnWire = document.getElementById('btnWire');
  function syncSpin() { btnSpin.setAttribute('aria-pressed', auto ? 'true' : 'false'); }
  syncSpin();

  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (auto && !playing) { auto = false; syncSpin(); }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (playing) {
      /* no jogo, arrastar gira a câmera em volta da personagem */
      camYaw -= (e.clientX - drag.x) * 0.008;
      camPitch = clamp(camPitch + (e.clientY - drag.y) * 0.005, pitchMin(), PITCH_MAX);
    } else {
      yaw += (e.clientX - drag.x) * 0.008;
      pitch = clamp(pitch + (e.clientY - drag.y) * 0.005, -0.5, 0.6);
    }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  function endDrag() { drag = null; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoom = clamp(zoom * Math.exp(e.deltaY * 0.001), 0.4, 1.7);
  }, { passive: false });
  canvas.addEventListener('keydown', function (e) {
    if (playing) return;                /* no jogo, as teclas são tratadas em window */
    var used = true;
    if (e.key === 'ArrowLeft') yaw -= 0.15;
    else if (e.key === 'ArrowRight') yaw += 0.15;
    else if (e.key === 'ArrowUp') pitch = clamp(pitch - 0.08, -0.5, 0.6);
    else if (e.key === 'ArrowDown') pitch = clamp(pitch + 0.08, -0.5, 0.6);
    else used = false;
    if (used) { e.preventDefault(); if (auto) { auto = false; syncSpin(); } }
  });

  btnSpin.addEventListener('click', function () { auto = !auto; syncSpin(); });
  /* aceno: o braço sobe, balança por alguns segundos e volta para baixo */
  var waveT0 = -1, WAVE_DUR = 3.2;
  document.getElementById('btnWave').addEventListener('click', function () { waveT0 = performance.now(); });
  /* andar no lugar: pernas e braços balançam em oposição */
  var walking = false, running = false, runK = 0, walkK = 0, walkPh = 0;
  var btnWalk = document.getElementById('btnWalk');
  btnWalk.addEventListener('click', function () {
    walking = !walking; running = false; syncGait();
  });
  var btnRun = document.getElementById('btnRun');
  btnRun.addEventListener('click', function () {
    running = !running; walking = false; syncGait();
  });
  function syncGait() {
    btnWalk.setAttribute('aria-pressed', walking ? 'true' : 'false');
    btnRun.setAttribute('aria-pressed', running ? 'true' : 'false');
  }
  btnWire.addEventListener('click', function () {
    var on = btnWire.getAttribute('aria-pressed') !== 'true';
    btnWire.setAttribute('aria-pressed', on ? 'true' : 'false');
    Object.keys(M).forEach(function (n) { M[n].wireframe = on; });
    characters.forEach(function (c) {
      Object.keys(c.parts).forEach(function (k) {
        c.parts[k].main.concat(c.parts[k].dark).forEach(function (m) { m.wireframe = on; });
      });
    });
  });
  document.getElementById('btnIn').addEventListener('click', function () { zoom = clamp(zoom * 0.85, 0.4, 1.7); });
  document.getElementById('btnOut').addEventListener('click', function () { zoom = clamp(zoom / 0.85, 0.4, 1.7); });
  document.getElementById('btnReset').addEventListener('click', function () {
    yaw = START_YAW; pitch = START_PITCH; zoom = 1;
  });

  /* ---------- modo jogo: ambiente "Sala vazia" ----------
     Chão (xadrez), 4 paredes e teto com uma lâmpada pendurada que ilumina a sala.
     O piso fica em y = 0, então os pés da personagem ficam em y = 0. */
  var ROOM_W = 40, ROOM_D = 40, ROOM_H = 18;
  var room = new THREE.Group();
  room.visible = false;
  scene.add(room);

  M.floor = mat(0xffffff, { vertexColors: true });
  M.wall = mat(0xe6e1ec, { side: DS });
  M.ceiling = mat(0xf5f2f9, { side: DS });
  M.lampCord = mat(0x2a2a30);
  M.lampShade = mat(0xe9e2d0, { side: DS });
  M.bulb = new THREE.MeshBasicMaterial({ color: 0xfff2c4 });

  /* chão: grade 10x10 com cada casa de um tom, para dar noção de movimento */
  (function () {
    var g = new THREE.PlaneGeometry(ROOM_W, ROOM_D, 10, 10).toNonIndexed();
    g.rotateX(-Math.PI / 2);
    var p = g.attributes.position;
    var col = new Float32Array(p.count * 3);
    var ca = new THREE.Color(0xa6a1af), cb = new THREE.Color(0x908b99);
    for (var f = 0; f < p.count; f += 3) {
      var cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3;
      var cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
      var par = (Math.floor((cx + ROOM_W / 2) / (ROOM_W / 10)) + Math.floor((cz + ROOM_D / 2) / (ROOM_D / 10))) & 1;
      var c = par ? ca : cb;
      for (var j = 0; j < 3; j++) {
        col[(f + j) * 3] = c.r; col[(f + j) * 3 + 1] = c.g; col[(f + j) * 3 + 2] = c.b;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    room.add(new THREE.Mesh(g, M.floor));
  })();

  /* paredes (viradas para dentro) e teto */
  function wall(w, x, z, ry) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, ROOM_H), M.wall);
    m.position.set(x, ROOM_H / 2, z);
    m.rotation.y = ry;
    room.add(m);
  }
  wall(ROOM_W, 0, -ROOM_D / 2, 0);
  wall(ROOM_W, 0, ROOM_D / 2, Math.PI);
  wall(ROOM_D, -ROOM_W / 2, 0, Math.PI / 2);
  wall(ROOM_D, ROOM_W / 2, 0, -Math.PI / 2);
  var ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), M.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM_H;
  room.add(ceil);

  /* lâmpada: fio, cúpula, bulbo aceso e uma luz de ponto no mesmo lugar */
  var lamp = new THREE.Group();
  lamp.position.set(0, ROOM_H, 0);
  room.add(lamp);
  var cord = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M.lampCord);
  cord.position.y = -0.6;
  lamp.add(cord);
  var shade = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.7, 8, 1, true), M.lampShade);
  shade.position.y = -1.55;
  lamp.add(shade);
  var bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), M.bulb);
  bulb.position.y = -1.75;
  lamp.add(bulb);
  var lampLight = new THREE.PointLight(0xfff0d0, 1.15, 90, 1);
  lampLight.position.set(0, ROOM_H - 1.9, 0);
  room.add(lampLight);

  /* ---------- jogo: botão, menu de ambientes e controles ---------- */
  var LIM_X = ROOM_W / 2 - 2.2, LIM_Z = ROOM_D / 2 - 2.2;   /* limite dos pés da personagem */
  var WALK_SPEED = 8, RUN_SPEED = 15;
  var pl = { x: 0, y: 0, vy: 0, z: 8, face: Math.PI };   /* posição, altura do pulo e direção que a personagem olha */
  var JUMP_V = 16, GRAVITY = 42;            /* pulo de cerca de 3 unidades de altura, ~0,76 s no ar */
  var camYaw = 0, camPitch = 0.4;
  /* Duas vistas (teclas 1 e 2 ou botões):
     Vista 1 = câmera em terceira pessoa de antes: orbita a personagem sempre olhando para ela
               (camPitch de ORBIT_MIN até PITCH_MAX); as setas andam como W A S D.
     Vista 2 = vista da sala: abaixo de ORBIT_MIN a câmera fica baixa e só inclina o olhar para
               cima (até PITCH_MIN), para ver as paredes, o teto e a lâmpada; as setas giram a câmera. */
  var PITCH_MIN = -1.1, PITCH_MAX = 1.2, ORBIT_MIN = 0.05;
  var VIEW1_PITCH = 0.4, VIEW2_PITCH = -0.4;     /* inclinação ao trocar de vista */
  var camView = 1;
  function pitchMin() { return camView === 2 ? PITCH_MIN : ORBIT_MIN; }
  var keys = {}, moving = false, sprint = false;
  var MOVE_KEYS = {
    KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1,
    ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
    ShiftLeft: 1, ShiftRight: 1, Space: 1
  };
  var menu = document.getElementById('menuJogo');
  var btnPlay = document.getElementById('btnPlay');
  var VIEW_LABEL = canvas.getAttribute('aria-label');
  var PLAY_LABEL = 'Sala vazia em 3D. Use as teclas W, A, S e D para andar com a personagem, Shift para correr, Espaço para pular. Arraste o mouse para girar a câmera. As teclas 1 e 2 trocam a vista; na vista 2, as setas e o mouse olham para cima, até o teto.';

  var HINT_V1 = 'W A S D (ou setas) para andar · Shift para correr · Espaço para pular · arraste para girar a câmera · 1 e 2 trocam a vista · F tela cheia · Esc para sair';
  var HINT_V2 = 'W A S D para andar · Shift para correr · Espaço para pular · setas ou arraste giram a câmera e olham o teto · 1 e 2 trocam a vista · F tela cheia · Esc para sair';
  function setView(n) {
    camView = n;
    camPitch = n === 2 ? VIEW2_PITCH : VIEW1_PITCH;
    document.getElementById('btnView1').setAttribute('aria-pressed', n === 1 ? 'true' : 'false');
    document.getElementById('btnView2').setAttribute('aria-pressed', n === 2 ? 'true' : 'false');
    document.getElementById('playHint').textContent = n === 2 ? HINT_V2 : HINT_V1;
  }
  function setPlayUI(on) {
    document.getElementById('viewerBtns').hidden = on;
    document.getElementById('viewerHint').hidden = on;
    document.getElementById('tabsBar').hidden = on;
    document.getElementById('playBtns').hidden = !on;
    document.getElementById('playHint').hidden = !on;
    canvas.setAttribute('aria-label', on ? PLAY_LABEL : VIEW_LABEL);
  }
  function openMenu() {
    menu.hidden = false;
    menu.querySelector('.env').focus();
  }
  function closeMenu() {
    menu.hidden = true;
    btnPlay.focus();
  }
  function startGame(envId) {
    if (envId !== 'sala-vazia') return;        /* por enquanto só existe este ambiente */
    menu.hidden = true;
    playing = true;
    keys = {}; moving = false; sprint = false;
    pl.x = 0; pl.y = 0; pl.vy = 0; pl.z = 8; pl.face = Math.PI;     /* de costas para a câmera */
    camYaw = 0; setView(1);
    zoom = 1; zoomCur = 1;
    walking = false; running = false; syncGait();
    waveT0 = -1;
    rig.visible = false;
    room.visible = true;
    var c = active.character;
    room.add(c);                               /* sai do visualizador e entra na sala */
    c.rotation.order = 'YXZ';                  /* gira o corpo no eixo vertical antes de inclinar */
    c.position.set(pl.x, 0, pl.z);
    VIEW_LIGHTS.forEach(function (l) { l[0].intensity = 0; });
    hemi.intensity = 0.65;                     /* luz ambiente da sala + a lâmpada no teto */
    setPlayUI(true);
    canvas.focus();
  }
  function stopGame() {
    playing = false;
    keys = {}; moving = false; sprint = false;
    if (full) {
      if (fsElement()) exitFs();
      setFull(false);
    }
    var c = active.character;
    rig.add(c);                                /* volta para o visualizador */
    c.rotation.set(0, 0, 0);
    c.rotation.order = 'XYZ';
    c.position.set(-0.05, -4.6, 0);
    room.visible = false;
    rig.visible = true;
    VIEW_LIGHTS.forEach(function (l) { l[0].intensity = l[1]; });
    yaw = START_YAW; pitch = START_PITCH; zoom = 1; zoomCur = 1;
    setPlayUI(false);
    btnPlay.focus();
  }

  /* tela cheia: a página inteira, para o menu e os botões continuarem funcionando */
  var fsRoot = document.documentElement;
  var btnFull = document.getElementById('btnFull');
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  /* aviso curto no topo (ex.: quando o navegador bloqueia a tela cheia de verdade) */
  var note = document.createElement('div');
  note.className = 'note';
  note.setAttribute('role', 'status');
  note.hidden = true;
  document.body.appendChild(note);
  var noteT = 0;
  function showNote(text) {
    note.textContent = text;
    note.hidden = false;
    clearTimeout(noteT);
    noteT = setTimeout(function () { note.hidden = true; }, 8000);
  }
  var FS_BLOCKED = 'O navegador não deixou usar a tela cheia de verdade aqui (a página pode estar dentro de outra janela). Abra o jogo em uma aba própria para ocupar a tela toda.';
  function enterFs() {
    var req = fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen;
    var allowed = document.fullscreenEnabled !== false && document.webkitFullscreenEnabled !== false;
    if (!req || !allowed) { showNote(FS_BLOCKED); return; }
    var p;
    try { p = req.call(fsRoot); } catch (err) { showNote(FS_BLOCKED); return; }
    if (p && p.catch) p.catch(function () { showNote(FS_BLOCKED); });
  }
  function exitFs() {
    var ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (!ex) return;
    var p = ex.call(document);
    if (p && p.catch) p.catch(function () {});
  }
  /* "tela cheia" = layout sem título nem abas, com o palco ocupando a janela toda (classe immersive)
     + tela cheia real do navegador, quando ele permite. Se o navegador bloquear a real
     (página dentro de um preview/iframe, iPhone...), o layout sem bordas continua valendo. */
  var full = false, realFs = false;
  /* na tela cheia, os controles somem depois de 2,5 s sem mexer o mouse e voltam ao mexer */
  var idleT = 0;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleT);
    if (full) idleT = setTimeout(function () { document.body.classList.add('idle'); }, 2500);
  }
  window.addEventListener('pointermove', wake);
  window.addEventListener('pointerdown', wake);
  function setFull(on) {
    full = on;
    document.body.classList.toggle('immersive', on);
    btnFull.setAttribute('aria-pressed', on ? 'true' : 'false');
    wake();
  }
  function toggleFullscreen() {
    if (full) {
      if (fsElement()) exitFs();
      setFull(false);
    } else {
      setFull(true);
      enterFs();
    }
  }
  function onFsChange() {
    if (fsElement()) { realFs = true; return; }
    if (realFs) {                       /* saiu da tela cheia real (Esc, por exemplo) */
      realFs = false;
      if (full) setFull(false);
    }
  }
  btnFull.addEventListener('click', function () { toggleFullscreen(); canvas.focus(); });
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  document.getElementById('btnView1').addEventListener('click', function () { setView(1); canvas.focus(); });
  document.getElementById('btnView2').addEventListener('click', function () { setView(2); canvas.focus(); });

  btnPlay.addEventListener('click', openMenu);
  document.getElementById('btnCloseMenu').addEventListener('click', closeMenu);
  document.getElementById('btnExit').addEventListener('click', stopGame);
  menu.addEventListener('click', function (e) { if (e.target === menu) closeMenu(); });
  Array.prototype.forEach.call(menu.querySelectorAll('.env'), function (b) {
    b.addEventListener('click', function () { startGame(b.getAttribute('data-env')); });
  });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!menu.hidden) closeMenu();
      else if (playing) stopGame();
      return;
    }
    if (!playing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Digit1' || e.code === 'Numpad1') { setView(1); e.preventDefault(); return; }
    if (e.code === 'Digit2' || e.code === 'Numpad2') { setView(2); e.preventDefault(); return; }
    if (e.code === 'KeyF') {
      if (!e.repeat) toggleFullscreen();
      e.preventDefault();
      return;
    }
    if (MOVE_KEYS[e.code]) { keys[e.code] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) {
    delete keys[e.code];
    if (playing && e.code === 'Space') e.preventDefault();   /* não "clica" no botão focado */
  });
  window.addEventListener('blur', function () { keys = {}; });

  /* W/A/S/D andam em relação à câmera: W afasta da câmera, S aproxima, A esquerda, D direita */
  function updatePlay(dt) {
    /* pulo: Espaço no chão dá o impulso; a gravidade traz de volta (dá para andar no ar) */
    if (keys.Space && pl.y === 0 && pl.vy === 0) pl.vy = JUMP_V;
    if (pl.y > 0 || pl.vy > 0) {
      pl.vy -= GRAVITY * dt;
      pl.y += pl.vy * dt;
      if (pl.y <= 0) { pl.y = 0; pl.vy = 0; }
    }
    var cam2 = camView === 2;
    if (cam2) {
      /* vista 2: setas giram a câmera (esquerda/direita em volta, cima/baixo olham para cima/baixo) */
      var ky = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      var kp = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
      camYaw -= ky * 1.9 * dt;
      camPitch = clamp(camPitch + kp * 1.4 * dt, PITCH_MIN, PITCH_MAX);
    }
    /* vista 1: as setas andam como W A S D */
    var f = ((keys.KeyW || (!cam2 && keys.ArrowUp)) ? 1 : 0) - ((keys.KeyS || (!cam2 && keys.ArrowDown)) ? 1 : 0);
    var r = ((keys.KeyD || (!cam2 && keys.ArrowRight)) ? 1 : 0) - ((keys.KeyA || (!cam2 && keys.ArrowLeft)) ? 1 : 0);
    sprint = !!(keys.ShiftLeft || keys.ShiftRight);
    var sy = Math.sin(camYaw), cy = Math.cos(camYaw);
    var dx = -sy * f + cy * r;
    var dz = -cy * f - sy * r;
    var len = Math.sqrt(dx * dx + dz * dz);
    moving = len > 0.001;
    if (!moving) return;
    dx /= len; dz /= len;
    var sp = sprint ? RUN_SPEED : WALK_SPEED;
    pl.x = clamp(pl.x + dx * sp * dt, -LIM_X, LIM_X);
    pl.z = clamp(pl.z + dz * sp * dt, -LIM_Z, LIM_Z);
    var target = Math.atan2(dx, dz);           /* a personagem olha para +z quando rotation.y = 0 */
    var diff = Math.atan2(Math.sin(target - pl.face), Math.cos(target - pl.face));
    pl.face += diff * Math.min(1, dt * 12);
  }
  /* câmera em terceira pessoa: orbita a personagem e nunca sai da sala */
  function applyPlayCamera() {
    var dist = 22 * zoomCur;
    var orbit = Math.max(camPitch, ORBIT_MIN);
    var lookUp = Math.max(0, ORBIT_MIN - camPitch);   /* quanto inclinar o olhar para cima */
    var cp = Math.cos(orbit), sp = Math.sin(orbit);
    var tx = pl.x, ty = 5.2 + pl.y * 0.6, tz = pl.z;   /* a câmera acompanha o pulo pela metade */
    var hx = ROOM_W / 2 - 0.6, hz = ROOM_D / 2 - 0.6;
    camera.position.set(
      clamp(tx + Math.sin(camYaw) * cp * dist, -hx, hx),
      clamp(ty + sp * dist, 1, ROOM_H - 1),
      clamp(tz + Math.cos(camYaw) * cp * dist, -hz, hz)
    );
    camera.lookAt(tx, ty, tz);
    if (lookUp > 0) camera.rotateX(lookUp);
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing) updatePlay(dt);
    if (auto && !drag && !playing) yaw += dt * 0.45;
    rig.rotation.y = yaw;
    var wz = 0, wt = 0;
    if (waveT0 >= 0) {
      var w = (now - waveT0) / 1000;
      if (w >= WAVE_DUR) { waveT0 = -1; }
      else {
        var up = Math.max(0, Math.min(1, w / 0.4, (WAVE_DUR - w) / 0.4));
        up = up * up * (3 - 2 * up);
        wt = up;
        wz = up * (2.55 + (reduce ? 0 : 0.3 * Math.sin(w * 9)));
      }
    }
    var a = active;
    a.armRG.rotation.z = wz;
    a.hand1.rotation.y = wt * Math.PI / 2;
    var gaitOn = playing ? moving : (walking || running);
    var runOn = playing ? (moving && sprint) : running;
    walkK += ((gaitOn ? 1 : 0) - walkK) * Math.min(1, dt * 6);
    runK += ((runOn ? 1 : 0) - runK) * Math.min(1, dt * 6);
    var la = 0.35 + 0.25 * runK, aa = 0.4 + 0.4 * runK;
    if (walkK > 0.001) walkPh += dt * (6.5 + 5 * runK);
    var sw = Math.sin(walkPh) * walkK;
    a.legs.forEach(function (l) { l.g.rotation.x = l.s * sw * la; });
    a.armLG.rotation.x = sw * aa;
    a.armRG.rotation.x = waveT0 >= 0 ? 0 : -sw * aa;
    a.character.position.y = (playing ? pl.y : -4.6) - 3.9 * (1 - Math.cos(la * Math.abs(sw)));
    if (playing) {
      a.character.position.x = pl.x;
      a.character.position.z = pl.z;
      a.character.rotation.y = pl.face;
    }
    a.character.rotation.x = 0.12 * runK;
    rig.rotation.x = pitch;
    zoomCur += (zoom - zoomCur) * Math.min(1, dt * 8);
    if (playing) applyPlayCamera(); else applyCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
