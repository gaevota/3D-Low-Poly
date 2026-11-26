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
