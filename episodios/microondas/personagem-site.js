/* =====================================================================
   personagem-site.js — o personagem da página principal (Personagem 1), copiado para este episódio.
   É uma cópia FIEL, sem nenhuma alteração, de js/ajudantes.js, js/cabelo.js, js/tenis.js e js/personagem.js,
   nessa ordem. Tudo fica dentro de uma função, para os nomes (box, rng, lerp3, M, S...) não se misturarem
   com os do motor 3D do episódio. Precisa do three.js carregado antes (a página do episódio já faz isso).

   Expõe window.PersonagemSite = { createCharacter, setPartColor }.
   O episódio (episodio.js, seção [5]) converte as malhas que ele cria para o seu próprio motor 3D.

   Para atualizar o personagem do episódio depois de mudar o do site, refaça esta cópia:
     { cabeçalho + "(function () {" ; cat js/ajudantes.js js/cabelo.js js/tenis.js js/personagem.js ; rodapé }
   (ou apenas cole de novo cada arquivo no lugar certo abaixo).
   ===================================================================== */
window.PersonagemSite = (function () {

/* ################ js/ajudantes.js ################ */
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

/* ################ js/cabelo.js ################ */
/* ============================================================================
   cabelo.js — o cabelo: casca volumosa de facetas, cortina de mechas (Cabelo 3 feminino) e rabo de cavalo (Cabelo 6).
   Define: createHair(head, hairM, result, variant) → { setHair, setBang }
   Usa:    THREE, rng (ajudantes.js)
   ============================================================================ */

/* head    = grupo da cabeça (o cabelo é colado nele; a cabeça já precisa estar na posição e na inclinação finais)
   hairM   = material do cabelo (a cor vem dele; as facetas só guardam claro/escuro)
   result  = objeto do personagem: o cabelo guarda nele o estilo (result.hair) e a franja (result.bang)
   variant = posição da aba (0 = Personagem 1...); só decide se a franja começa ligada */
function createHair(head, hairM, result, variant) {
  var rnd = rng(7);        /* gerador usado só pelo cabelo (cores das facetas) */
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
  var SHORT_CUT_Y = -0.3;    /* Cabelo 5: faceta da casca só fica se o centro dela estiver acima disso (normal: −0,72) */
  var BANG_TIP_Y = 0.15;    /* altura da ponta da franja na esfera do cabelo (o "bico" original ficava em 0,526) */
  function noise3(x, y, z) {
    return Math.sin(x * 7.3 + y * 5.1 + z * 3.7) * 0.5 + Math.sin(x * 3.1 - y * 8.7 + z * 6.3) * 0.5;
  }
  /* casca: esfera de poucas faces, aberta embaixo e com uma janela para o rosto */
  /* longBang = true liga a franja comprida ("Colocar franja"); false é a franja normal */
  /* shortCut = true gera o "Cabelo 5" (curto): a borda de baixo sobe e o cabelo termina na altura das orelhas */
  /* slimBack = fração (0 a 0,15) que o z de trás da casca encolhe (cabelos femininos 1 e 2): fica mais colada atrás da cabeça;
     só o z de trás é encolhido (cheio a partir de z ≤ −0,7), então frente e lados não mudam */
  var SLIM_F1 = 0, SLIM_F2 = 0.08;     /* (feminino 1 era 0,11: menor = casca de trás maior) quanto a casca encolhe atrás: feminino 1 (comprido) e feminino 2 (preso) */
  /* ---------- Cabelo 3 (feminino 1): mechas longas caindo pelas costas, como parte da própria casca ----------
     hang = true: a casca ganha uma cortina que sai da borda de baixo dela (costas e laterais) e desce até o meio das
     costas, terminando em pontas. Os primeiros vértices da cortina SÃO os vértices dessa borda (mais um ponto no meio de
     cada aresta), então não há emenda nem degrau entre a casca e a cortina. É a mesma malha, presa à cabeça.
     As fileiras de baixo são definidas no espaço do personagem (como a cortina antiga): a cabeça é inclinada, e assim as
     mechas caem retas atrás do corpo; depois os pontos voltam para o espaço da cabeça. A frente fica livre (rosto e camiseta). */
  var HANG_ROWS = [    /* [y, raio-alvo a partir do eixo da cabeça, mistura com o raio da borda da casca (0 a 1), estreitamento em x, fator do arco] */
    [6.85, 0.82, 0.6, 0.97, 0.94],     /* o arco encolhe aos poucos: a borda que aparece ao lado do pescoço fica reta e sem degraus */
    [6.40, 0.88, 0.9, 0.93, 0.86],
    [5.95, 0.82, 1.0, 0.90, 0.79],
    [5.50, 0.74, 1.0, 0.90, 0.74],     /* largura e fundo diminuem devagar até as costas (a camiseta tem o fundo em −0,3 a −0,5) */
    [5.00, 0.65, 1.0, 0.90, 0.70]      /* última fileira: pontas em dente (uma mecha mais baixa, a vizinha mais alta) */
  ];
  /* colunas cortadas em cada ponta lateral da cortina (cada coluna tem uns 10°). As duas últimas de cada lado ficavam quase de lado
     e, vistas de costas, formavam tirinhas e quinas no contorno, junto do ombro. Use número par: assim o desenho em dente da
     última fileira continua simétrico. 0 = cortina inteira, como antes. */
  var HANG_TRIM = 2;
  /* ---------- a cortina não pode entrar no corpo ----------
     Os pontos das fileiras são calculados num arco circular, mas o tronco é achatado (z × 0,6) e tem 8 lados: nas laterais,
     a cortina passava por dentro dele e das mangas. Depois de calcular cada ponto, o z é empurrado para trás da superfície de
     trás do tronco (ou da manga), com uma folga. Só o z muda, então a largura e o desenho da cortina continuam como eram.
     Os números do tronco e da manga são os da camiseta e do braço mais abaixo (tronco: raio 0,5 em y = 6,7 e 1,0 em y = 4,4,
     8 lados, z × 0,6; manga curta: do ombro (±0,69; 6,7; 0) até (±0,86; 5,84; 0,05), raio 0,26 → 0,38). Se mudar um, mude o outro. */
  var HAIR_GAP = 0.07;
  function torsoBackZ(x, y) {
    if (y > 6.7 || y < 4.4) return null;
    var r = 0.5 + 0.5 * (6.7 - y) / 2.3, ax = Math.abs(x);
    if (ax >= r) return null;
    var c = Math.SQRT1_2 * r;                                   /* x do vértice a 135° (o de trás, a 180°, fica em x = 0) */
    return ax <= c ? -0.6 * r + (0.6 * r - 0.6 * c) * (ax / c)
                   : -0.6 * c * (1 - (ax - c) / (r - c));
  }
  function sleeveBackZ(x, y) {
    /* acima do ombro (até 6,95) a zona proibida continua como cilindro reto: sem isso, as arestas entre a fileira de cima (y = 6,85,
       acima da manga) e a de baixo atravessavam o topo da manga */
    if (y > 6.95 || y < 5.844) return null;
    var t = Math.max(0, (6.7 - y) / 0.856);
    var d = Math.abs(x) - (0.69 + 0.17 * t), rad = 0.26 + 0.12 * t;
    if (Math.abs(d) >= rad) return null;
    return 0.05 * t - Math.sqrt(rad * rad - d * d);
  }
  function keepOutOfBody(p) {
    var z = torsoBackZ(p.x, p.y), s = sleeveBackZ(p.x, p.y);
    if (s !== null && (z === null || s < z)) z = s;
    if (z !== null && p.z > z - HAIR_GAP) p.z = z - HAIR_GAP;
    return p;
  }
  /* chave de vértice da esfera-fonte: arredonda para 3 casas e tira o −0, para o mesmo vértice dar a mesma chave em todos os triângulos */
  function vKey(x, y, z) {
    function f(v) { return (Math.round(v * 1000) / 1000 + 0).toFixed(3); }
    return f(x) + ',' + f(y) + ',' + f(z);
  }
  /* borda de baixo da casca nas costas e laterais, como lista de vértices [x, y, z, y-fonte, z-fonte] da esquerda (−x) para a direita */
  function hangChain(edges, info) {
    var adj = {}, k;
    for (k in edges) {
      var E = edges[k];
      if (E[2] !== 1) continue;                                 /* aresta de borda: só um triângulo a usa */
      var ia = info[E[0]], ib = info[E[1]];
      if (ia[3] > -0.3 || ib[3] > -0.3 || ia[4] > 0.45 || ib[4] > 0.45) continue;    /* só embaixo, atrás e nas laterais (fora da janela do rosto) */
      (adj[E[0]] = adj[E[0]] || []).push(E[1]);
      (adj[E[1]] = adj[E[1]] || []).push(E[0]);
    }
    var start = null;
    for (k in adj) if (adj[k].length === 1 && (start === null || info[k][0] < info[start][0])) start = k;
    var chain = [], seen = {}, cur = start;
    while (cur !== null) {
      seen[cur] = true;
      chain.push(info[cur]);
      var nxt = null;
      for (var j = 0; j < adj[cur].length; j++) if (!seen[adj[cur][j]]) nxt = adj[cur][j];
      cur = nxt;
    }
    return chain;
  }
  /* triângulos da cortina (coordenadas da cabeça) a partir da borda da casca */
  function buildHang(chain) {
    head.updateMatrix();
    var M = head.matrix, inv = new THREE.Matrix4().copy(M).invert();
    var ax = head.position.x, az = head.position.z, i, r;
    var ring0 = [];
    for (i = 0; i < chain.length; i++) {
      ring0.push(new THREE.Vector3(chain[i][0], chain[i][1], chain[i][2]).applyMatrix4(M));
      if (i < chain.length - 1) {
        ring0.push(new THREE.Vector3((chain[i][0] + chain[i + 1][0]) / 2, (chain[i][1] + chain[i + 1][1]) / 2, (chain[i][2] + chain[i + 1][2]) / 2).applyMatrix4(M));
      }
    }
    var n = ring0.length, th0 = [], r0 = [];
    for (i = 0; i < n; i++) {
      th0.push(Math.atan2(ring0[i].x - ax, -(ring0[i].z - az)));      /* 0 = bem atrás */
      r0.push(Math.hypot(ring0[i].x - ax, ring0[i].z - az));
    }
    var rows = [ring0];
    for (r = 0; r < HANG_ROWS.length; r++) {
      var H = HANG_ROWS[r], row = [];
      for (i = 0; i < n; i++) {
        var R = r0[i] * (1 - H[2]) + H[1] * H[2];
        var th = th0[i] * H[4];
        var kk = 1 + noise3(th * 2, H[0], 1.3) * 0.04;
        var jag = r === HANG_ROWS.length - 1 ? ((i & 1) ? -0.32 : 0.12) : 0;
        row.push(keepOutOfBody(new THREE.Vector3(ax + R * H[3] * kk * Math.sin(th), H[0] + jag, az - R * kk * Math.cos(th))));
      }
      rows.push(row);
    }
    var out = [];
    function put(p) { var q = p.clone().applyMatrix4(inv); out.push(q.x, q.y, q.z); }
    for (r = 0; r < rows.length - 1; r++) {
      for (i = HANG_TRIM; i < n - 1 - HANG_TRIM; i++) {        /* sem as colunas das pontas (HANG_TRIM de cada lado) */
        var a = rows[r][i], b = rows[r][i + 1], c = rows[r + 1][i], d = rows[r + 1][i + 1];
        put(a); put(c); put(b);
        put(b); put(c); put(d);
      }
    }
    return out;
  }
  /* junta duas geometrias já coloridas (posição + cor) em uma só */
  function mergeGeo(a, b) {
    var pa = a.attributes.position.array, pb = b.attributes.position.array;
    var ca = a.attributes.color.array, cb = b.attributes.color.array;
    var pos = new Float32Array(pa.length + pb.length), col = new Float32Array(ca.length + cb.length);
    pos.set(pa); pos.set(pb, pa.length);
    col.set(ca); col.set(cb, ca.length);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  /* hang = true gera a cortina comprida do "Cabelo 3" (feminino 1) como parte da casca */
  function buildShell(longBang, noSideTips, shortCut, slimBack, hang) {
  slimBack = slimBack || 0;      /* sem o argumento (cabelo 1 masculino na primeira montagem) = sem encolher; undefined dava NaN e o cabelo sumia */
  rnd = rng(7);                 /* mesmas cores de faceta em toda reconstrução */
  var shellSrc = new THREE.IcosahedronGeometry(1, 1);
  var sp = shellSrc.attributes.position;
  var kept = [];
  var edges = {}, info = {};      /* só para a cortina (hang): arestas da casca, com quantos triângulos usam cada uma, e posição de cada vértice */
  for (var fi = 0; fi < sp.count; fi += 3) {
    var cx = (sp.getX(fi) + sp.getX(fi + 1) + sp.getX(fi + 2)) / 3;
    var cy = (sp.getY(fi) + sp.getY(fi + 1) + sp.getY(fi + 2)) / 3;
    var cz = (sp.getZ(fi) + sp.getZ(fi + 1) + sp.getZ(fi + 2)) / 3;
    var bottomOpen = cy < (shortCut ? SHORT_CUT_Y : -0.72);
    var faceWindow = cz > 0.5 && cy > -0.8 && cy < 0.42 && Math.abs(cx) < 0.58;
    /* Cabelo 3: as duas facetas da frente de baixo (x ≈ ±0,55, z ≈ 0,27, na borda inferior) apareciam como dois triângulos escuros de cada lado do pescoço */
    var sideTip = noSideTips && Math.abs(cx) > 0.45 && cz > 0.15 && cz < 0.35 && cy < -0.6;
    if (bottomOpen || faceWindow || sideTip) continue;
    var keys = [];
    for (var q = 0; q < 3; q++) {
      var vx = sp.getX(fi + q), vy = sp.getY(fi + q), vz = sp.getZ(fi + q);
      var vkey = vKey(vx, vy, vz), srcY = vy, srcZ = vz;
      keys.push(vkey);
      /* Personagem 2, franja: o vértice do cabelo que forma o "bico" no meio da testa
         (0; 0,526; 0,851 na esfera) desce, então o triângulo de cabelo do meio da testa
         fica comprido e termina perto das sobrancelhas. O vértice continua sobre a esfera. */
      if (longBang && Math.abs(vx) < 0.01 && Math.abs(vy - 0.526) < 0.01 && vz > 0.8) {
        vy = BANG_TIP_Y;
        vz = Math.sqrt(1 - vy * vy - vx * vx);
      }
      var rr = 1 + noise3(vx, vy, vz) * 0.02;
      var fl = vy < 0 ? 1 + 0.14 * (-vy) : 1;
      var bk = slimBack ? Math.max(0, Math.min(1, -vz / 0.7)) : 0;
      var bz = 1 - slimBack * bk * bk * (3 - 2 * bk);
      var px = vx * rr * fl * 1.12 + SHELL_C.x, py = vy * rr * 1.2 + SHELL_C.y, pz = vz * rr * fl * 1.12 * bz + SHELL_C.z;
      kept.push(px, py, pz);
      if (hang) info[vkey] = [px, py, pz, srcY, srcZ];
    }
    if (hang) {
      for (var e = 0; e < 3; e++) {
        var ka = keys[e], kb = keys[(e + 1) % 3], ek = ka < kb ? ka + '|' + kb : kb + '|' + ka;
        if (edges[ek]) edges[ek][2]++; else edges[ek] = [ka, kb, 1];
      }
    }
  }
  var shellGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
  bake(shellGeo, 0xffffff, SHELL_C, 0.06);       /* só claro/escuro; a cor do cabelo vem do material */
  if (hang) {
    var chain = hangChain(edges, info);
    if (chain.length > 1) {
      var hangGeo = new THREE.BufferGeometry();
      hangGeo.setAttribute('position', new THREE.Float32BufferAttribute(buildHang(chain), 3));
      rnd = rng(11);
      /* centro só para decidir o lado de fora de cada faceta (a cortina fica abaixo do centro da casca): ponto do meio das costas, no espaço da cabeça */
      var hangC = new THREE.Vector3(0, 6.6, -0.1).applyMatrix4(new THREE.Matrix4().copy(head.matrix).invert());
      bake(hangGeo, 0xffffff, hangC, 0.06);
      shellGeo = mergeGeo(shellGeo, hangGeo);
    }
  }
  return shellGeo;
  }
  var hairMesh = new THREE.Mesh(buildShell(variant === 1), hairM);
  head.add(hairMesh);

  /* Estilo (result.hair) e franja (result.bang) são independentes: qualquer estilo aceita a franja comprida.
     Masculino: 1 (padrão) e 5 (curto) · Feminino: 3 (comprido, com a cortina de mechas como parte da própria casca: hang), 6 (preso, rabo de cavalo longo)
     e 7 (curto: a mesma casca do 3, com a mesma folga atrás, só que sem a cortina); os femininos têm a casca mais justa atrás */
  function rebuildHair() {
    var n = result.hair;
    var fem = (n === 3 || n === 6 || n === 7);
    hairMesh.geometry.dispose();
    hairMesh.geometry = buildShell(result.bang, fem, n === 5, (n === 3 || n === 7) ? SLIM_F1 : n === 6 ? SLIM_F2 : 0, n === 3);
    ponytail.visible = (n === 6);
  }
  function setHair(n) { result.hair = n; rebuildHair(); }
  function setBang(on) { result.bang = !!on; rebuildHair(); }

  /* ---------- Cabelo 6: cabelo preso (rabo de cavalo longo) ----------
     A casca é a do Cabelo 1, só que mais justa atrás da cabeça (slimBack). Atrás da cabeça sai um rabo de facetas
     que desce pelas costas. O grupo fica preso à cabeça (acompanha o lugar dela),
     mas com a inclinação e a escala da cabeça desfeitas, para o rabo cair reto e com o mesmo tamanho
     das outras peças. Coordenadas do rabo: origem no ponto onde ele sai da cabeça, y para cima, o rabo desce em y negativo. */
  var PONY_RINGS = [          /* [y, raio, deslocamento em z] */
    [0.10, 0.20,  0.00],
    [-0.20, 0.36, -0.04],
    [-0.80, 0.48, -0.14],
    [-1.50, 0.46, -0.16],
    [-2.10, 0.34, -0.10],
    [-2.60, 0.17, -0.04]
  ];
  var PONY_TIP_Y = -3.0, PONY_SEGS = 7;
  function buildPonytail() {
    rnd = rng(13);
    var rows = [];
    for (var r = 0; r < PONY_RINGS.length; r++) {
      var ring = PONY_RINGS[r], row = [];
      for (var s = 0; s < PONY_SEGS; s++) {
        var th = s / PONY_SEGS * Math.PI * 2;
        var kk = 1 + noise3(th * 2, ring[0], 2.1) * 0.08;          /* irregularidade leve, como nas outras mechas */
        row.push([ring[1] * kk * Math.sin(th), ring[0], ring[2] + ring[1] * 0.8 * kk * Math.cos(th)]);
      }
      rows.push(row);
    }
    var pv = [];
    function pt(a, b, c) { pv.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
    for (var ra = 0; ra < rows.length - 1; ra++) {
      for (var sb = 0; sb < PONY_SEGS; sb++) {
        var a = rows[ra][sb], b = rows[ra][(sb + 1) % PONY_SEGS], c = rows[ra + 1][sb], d = rows[ra + 1][(sb + 1) % PONY_SEGS];
        pt(a, c, b); pt(b, c, d);
      }
    }
    var last = rows[rows.length - 1], tip = [0, PONY_TIP_Y, PONY_RINGS[PONY_RINGS.length - 1][2]];
    var topC = [0, PONY_RINGS[0][0] + 0.02, PONY_RINGS[0][2]];
    for (var sc = 0; sc < PONY_SEGS; sc++) {
      pt(last[sc], tip, last[(sc + 1) % PONY_SEGS]);                  /* ponta */
      pt(rows[0][sc], rows[0][(sc + 1) % PONY_SEGS], topC);           /* tampa de cima (fica escondida dentro da casca do cabelo) */
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pv, 3));
    bake(pg, 0xffffff, new THREE.Vector3(0, -1.3, PONY_RINGS[3][2]), 0.06);   /* só claro/escuro; a cor vem do material */
    return pg;
  }
  var ponyG = new THREE.Group();
  ponyG.position.set(0, 0.3, -1.07);                    /* atrás da cabeça, um pouco acima do meio (coordenadas da cabeça) */
  ponyG.quaternion.copy(head.quaternion).invert();
  ponyG.scale.setScalar(1 / 0.92);
  var ponytail = new THREE.Mesh(buildPonytail(), hairM);
  ponytail.visible = false;
  ponyG.add(ponytail);
  head.add(ponyG);
  return { setHair: setHair, setBang: setBang };
}

/* ################ js/tenis.js ################ */
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

/* ################ js/personagem.js ################ */
/* ============================================================================
   personagem.js — a fábrica de personagem (corpo, rosto, roupas) e a troca de cor das peças.
   Define: createCharacter(variant), PART_DEFAULT, setPartColor()
   Usa:    THREE, M, mat/limb/lerp3/ico/box (ajudantes.js), createHair (cabelo.js), createShoe (tenis.js)
   ============================================================================ */

/* ---------- fábrica de personagem ----------
   Monta uma menina completa e devolve as partes que as animações mexem.
   Cada chamada gera uma cópia independente; o gerador aleatório é recriado
   aqui dentro para todas as cópias terem exatamente o mesmo cabelo. */
function createCharacter(variant) {
  /* variant = posição da aba (0 = Personagem 1, 1 = Personagem 2...); só muda detalhes de cada um */
  /* camiseta própria de cada personagem, para a cor poder mudar sem afetar os outros */
  var shirtM = mat(0xffffff), shirtD = mat(0xffffff);
  var shortsM = mat(0xffffff), shoeM = mat(0xffffff, { side: DS });   /* shoeM = cabedal do tênis */
  /* pele (cabeça lisa, corpo facetado e orelhas um pouco mais escuras) e cabelo: a cor vem do material,
     as facetas do cabelo só guardam claro/escuro */
  /* orelhas: mesmo acabamento liso da cabeça (sem facetas), só com o tom um pouco mais escuro */
  var skinM = mat(0xffffff), skinSmoothM = mat(0xffffff, { flatShading: false }), skinShadeM = mat(0xffffff, { flatShading: false });
  /* sobrancelhas: cada personagem tem a sua e a cor acompanha a do cabelo (um pouco mais escura) */
  var browM = mat(0xffffff);
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
    /* brilho branco: fica colado na superfície do olho. Procuro onde o olho (inclinado e facetado) realmente está
       naquele ponto, em vez de um z fixo, que deixava o brilho flutuando na frente do olho. */
    var hi = ico(0.035, 0, M.hi, 1, 1, 0.5);
    var hx = p.x + 0.05, hy = p.y + 0.07;
    e.updateMatrix();
    e.matrixWorld.copy(e.matrix);               /* aqui o "mundo" é o espaço da cabeça */
    ray.set(new THREE.Vector3(hx, hy, 5), new THREE.Vector3(0, 0, -1));
    var hit = ray.intersectObject(e, false)[0];
    hi.position.set(hx, hy, (hit ? hit.point.z : p.z + 0.06) + 0.008);
    hi.rotation.y = s * 0.35;                   /* acompanha a inclinação do olho */
    head.add(hi);
    var lid = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.05), browM);
    lid.position.set(p.x, p.y + 0.28, p.z - 0.005);
    lid.rotation.z = -s * 0.04;
    lid.rotation.y = s * 0.35;
    lid.position.z += 0.03;
    head.add(lid);
  });
  /* orelhas */
  [-1, 1].forEach(function (s) {
    var ear = ico(0.17, 2, skinShadeM, 0.5, 1, 0.8);       /* detalhe 2 (como a cabeça) + sombreamento suave = orelha lisa */
    ear.position.set(s * 0.93, -0.12, -0.02);
    head.add(ear);
  });

  head.position.set(0, HEAD_Y, 0.05);
  head.rotation.set(0.2, 0.1, -0.06);
  head.scale.setScalar(0.92);
  character.add(head);

  /* cabelo (cabelo.js): o objeto "result" é criado já aqui, vazio, porque o cabelo guarda nele o estilo e a franja;
     o resto (partes, funções) é colocado nele no fim, com Object.assign */
  var result = {};
  var hairCtl = createHair(head, hairM, result, variant);
  var setHair = hairCtl.setHair, setBang = hairCtl.setBang;

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


  /* ---------- mão simples low poly: luva de uma peça só, sem dedos ----------
     Origem no pulso, dedos para baixo; a palma olha para o corpo.
     s = +1 mão direita (x positivo), s = -1 mão esquerda. */
  function makeHand(s) {
    var g = new THREE.Group();
    var d = -s;                               /* lado da palma no eixo x */
    var body = ico(1, 2, skinSmoothM, 0.13, 0.4, 0.225);
    body.position.set(0, -0.28, 0);
    g.add(body);
    return g;
  }

  /* ---------- braço direito caído (à direita na imagem de frente) ---------- */
  var S = [0.7, 6.62, 0.05], E = [0.9, 5.65, 0.05], H1 = [1.1, 4.4, 0.05];
  /* grupo do braço que acena: gira em torno do ombro */
  var armRG = new THREE.Group(); armRG.position.set(S[0], S[1], S[2]); character.add(armRG);
  var armIn = new THREE.Group(); armIn.position.set(-S[0], -S[1], -S[2]); armRG.add(armIn);
  armIn.add(limb(lerp3(S, H1, 0.07), lerp3(S, H1, 1.11), 0.19, 0.077, skinM, 7));
  var sleeveShortR = limb([0.69, 6.7, 0.0], lerp3(S, E, 0.8), 0.26, 0.38, shirtM, 7);
  armIn.add(sleeveShortR);
  /* manga longa (opção "Manga longa", vale para qualquer roupa): vai do ombro até o pulso (a 93% do caminho
     ombro → mão, y ≈ 4,56) e fecha em punho (raio 0,22, maior que o do braço ali, ~0,10). Fica no grupo do braço, então acena e balança junto */
  var sleeveLongR = limb([0.69, 6.7, 0.0], lerp3(S, H1, 0.93), 0.26, 0.22, shirtM, 7);
  sleeveLongR.visible = false;
  armIn.add(sleeveLongR);
  var hand1 = makeHand(1);
  hand1.position.set(H1[0] + 0.03, H1[1] + 0.03, H1[2]);   /* bem de leve para fora, longe do corpo */
  hand1.scale.setScalar(0.95);
  /* a mão acompanha a inclinação do antebraço (~10° para fora) e gira em torno do eixo dele ao acenar */
  var FA = Math.atan2(H1[0] - S[0], S[1] - H1[1]);
  var handBaseQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), FA);
  var handUp = new THREE.Vector3(-Math.sin(FA), Math.cos(FA), 0);
  hand1.quaternion.copy(handBaseQ);
  armIn.add(hand1);

  /* ---------- braço esquerdo caído (à esquerda na imagem de frente) ---------- */
  var S2 = [-0.7, 6.62, 0.05], E2 = [-0.9, 5.65, 0.05], H2 = [-1.1, 4.4, 0.05];
  var armLG = new THREE.Group(); armLG.position.set(S2[0], S2[1], S2[2]); character.add(armLG);
  var armLIn = new THREE.Group(); armLIn.position.set(-S2[0], -S2[1], -S2[2]); armLG.add(armLIn);
  armLIn.add(limb(lerp3(S2, H2, 0.07), lerp3(S2, H2, 1.11), 0.19, 0.077, skinM, 7));
  var sleeveShortL = limb([-0.69, 6.7, 0.0], lerp3(S2, E2, 0.8), 0.26, 0.38, shirtM, 7);
  armLIn.add(sleeveShortL);
  var sleeveLongL = limb([-0.69, 6.7, 0.0], lerp3(S2, H2, 0.93), 0.26, 0.22, shirtM, 7);   /* mesma manga longa, do lado esquerdo */
  sleeveLongL.visible = false;
  armLIn.add(sleeveLongL);
  var hand2 = makeHand(-1);
  hand2.position.set(H2[0] - 0.03, H2[1] + 0.03, H2[2]);
  hand2.scale.setScalar(0.95);
  hand2.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -FA);
  armLIn.add(hand2);

  var bodyRoot = character;
  var legs = [];
  var shortsParts = [];        /* shorts e listras: aparecem só na roupa "camiseta e shorts" */
  var longShortsParts = [];    /* bermuda longa e listra: aparecem só na roupa "camiseta e bermuda longa" */
  /* ---------- bermuda, pernas, meias e tênis ---------- */
  [-1, 1].forEach(function (s) {
    /* cada perna fica num grupo que gira em torno do quadril (para andar) */
    var legG = new THREE.Group(); legG.position.set(s * 0.42, 4.0, 0); bodyRoot.add(legG);
    var legIn = new THREE.Group(); legIn.position.set(-s * 0.42, -4.0, 0); legG.add(legIn);
    var legEntry = { g: legG, s: s, shoe: null };
    legs.push(legEntry);
    /* bermuda: um cano por perna, com a listra branca na lateral */
    var sl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 1.1, 8, 1), shortsM);
    sl.scale.z = 0.85;
    sl.position.set(s * 0.42, 3.85, 0);   /* de 3,3 a 4,4 */
    legIn.add(sl);
    shortsParts.push(sl);
    /* listra colada na lateral da bermuda, inclinada para acompanhar o cano que alarga embaixo */
    var stripe = box(0.05, 1.12, 0.1, M.stripe, s * 0.92, 3.85, 0);
    stripe.rotation.z = s * 0.09;
    legIn.add(stripe);
    shortsParts.push(stripe);

    /* bermuda longa (masculino): sai do mesmo ponto do shorts (y = 4,4) mas desce até perto do joelho (y = 2,5),
       em vez de parar em y = 3,3. Cano mais reto (raio 0,46 → 0,52) para as duas pernas não se
       cruzarem demais ao andar. Fica dentro do grupo da perna, então balança junto com ela. */
    var slLong = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 1.9, 8, 1), shortsM);
    slLong.scale.z = 0.85;
    slLong.position.set(s * 0.42, 3.45, 0);   /* de 2,5 a 4,4 */
    slLong.visible = false;
    legIn.add(slLong);
    longShortsParts.push(slLong);
    var stripeLong = box(0.05, 1.92, 0.1, M.stripe, s * 0.91, 3.45, 0);
    stripeLong.rotation.z = s * 0.032;          /* acompanha a abertura do cano (0,06 em 1,9) */
    stripeLong.visible = false;
    legIn.add(stripeLong);
    longShortsParts.push(stripeLong);

    /* pernas */
    /* a perna termina na boca do tênis (y = 0,78): nada de perna dentro do tênis */
    var hipP = [s * 0.42, 3.6, 0], ankle = [s * 0.46, 0.78, 0];
    legIn.add(limb(hipP, ankle, 0.26, 0.14, skinM, 8));

    /* meia larga com a boca dobrada */
    /* a meia não vai mais até o fundo do tênis: ela só desce uns 0,1 abaixo da boca (y = 0,78) e para em y = 0,68.
       Esse pouquinho é de propósito: o tênis gira em torno do tornozelo (y = 0,7) quando a perna anda, e a borda da
       boca sobe e desce até uns 0,08; sem ele, aparecia uma fresta entre a meia e a borda. Não existe mais a meia
       separada dentro do tênis (aquela que girava junto com ele). */
    legIn.add(limb([s * 0.46, 0.68, 0], [s * 0.46, 1.4, 0], 0.241, 0.25, M.sock, 8));
    legIn.add(limb([s * 0.46, 1.25, 0], [s * 0.46, 1.55, 0], 0.29, 0.3, M.sock, 8));

    /* tênis (tenis.js) */
    var shoePivot = createShoe(s, shoeM);
    legEntry.shoe = shoePivot;
    legIn.add(shoePivot);
  });

  /* ---------- roupas: masculino (camiseta e shorts) · feminino (vestido ou camiseta e saia) ----------
     A saia começa onde a camiseta termina (y = 4,4, raio 1,0, mesma achatada em z) e abre um pouco até o meio da coxa.
     Vestido: a saia comprida usa o material da camiseta (mesma cor) e o shorts some.
     Camiseta e saia: a camiseta fica como está e uma saia mais curta (miniSkirt, abaixo) usa o material do shorts. */
  var skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.12, 1.3, 8, 1), shirtM);
  skirt.scale.z = 0.6;
  skirt.position.y = 3.75;          /* de 3,1 a 4,4 */
  skirt.visible = false;
  character.add(skirt);
  /* Saia (feminino, com camiseta): modelo próprio, diferente do vestido — mais curta (só até o meio da coxa)
     e bem mais aberta, com uma barra branca na bainha (como as listras do shorts).
     Tem os mesmos 8 lados da camiseta (alinhados com ela): com outro número de lados, os cantos da saia
     furavam a camiseta e a barra dela ficava com dentes. Começa uns 0,05 por dentro da barra da camiseta
     (y = 4,45, raio 0,97, menor que o da camiseta ali, 0,989) e abre até y = 3,4 (raio 1,3). */
  var miniSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 1.3, 1.05, 8, 1), shortsM);
  miniSkirt.scale.z = 0.6;
  miniSkirt.position.y = 3.925;
  miniSkirt.visible = false;
  character.add(miniSkirt);
  var skirtHem = new THREE.Mesh(new THREE.CylinderGeometry(1.272, 1.31, 0.12, 8, 1, true), M.stripe);
  skirtHem.scale.z = 0.6;
  skirtHem.position.y = 3.46;
  skirtHem.visible = false;
  character.add(skirtHem);
  /* manga longa: independente da roupa de baixo (masculino, feminino ou vestido); troca a manga curta pela longa */
  function setLongSleeve(on) {
    sleeveShortR.visible = sleeveShortL.visible = !on;
    sleeveLongR.visible = sleeveLongL.visible = !!on;
    result.longSleeve = !!on;
  }
  /* mode = 'masculino' (camiseta e shorts) | 'bermuda' (camiseta e bermuda longa) | 'vestido' | 'saia' (camiseta e saia) */
  function setOutfit(mode) {
    shortsParts.forEach(function (m) { m.visible = (mode === 'masculino'); });
    longShortsParts.forEach(function (m) { m.visible = (mode === 'bermuda'); });
    skirt.visible = (mode === 'vestido');
    miniSkirt.visible = skirtHem.visible = (mode === 'saia');
    result.outfit = mode;
  }

  Object.assign(result, { character: character, armRG: armRG, armLG: armLG, hand1: hand1, handBaseQ: handBaseQ, handUp: handUp, handX: H1[0], legs: legs,
                 parts: {                       /* peças que mudam de cor: materiais principais + os de tom mais escuro (k = quanto escurece) */
                   shirt: { main: [shirtM], dark: [shirtD], k: 0.72, hex: null },    /* a gola usa o tom escuro */
                   shorts: { main: [shortsM], dark: [], hex: null },
                   shoes: { main: [shoeM], dark: [], hex: null },
                   skin: { main: [skinM, skinSmoothM], dark: [skinShadeM], k: 0.87, hex: null },   /* as orelhas usam o tom escuro */
                   hair: { main: [hairM], dark: [browM], k: 0.75, hex: null }          /* as sobrancelhas usam o tom do cabelo, mais escuro */
                 },
                 hair: 1, bang: variant === 1, setHair: setHair, setBang: setBang, outfit: 'masculino', setOutfit: setOutfit, longSleeve: false, setLongSleeve: setLongSleeve });
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

return { createCharacter: createCharacter, setPartColor: setPartColor };
})();
