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
