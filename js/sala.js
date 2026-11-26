/* ============================================================================
   sala.js — ambiente do jogo "Sala vazia": chão, paredes, teto, lâmpada e interruptor da luz.
   Define: room, ROOM_W/D/H, lampLight, lightOn, setLight(), nearSwitch(), overSwitch(), clickSwitch()...
   Usa:    scene, camera, canvas, THREE, M, mat (ajudantes.js), pl (jogo.js, só na hora do clique)
   ============================================================================ */

/* ---------- modo jogo: ambiente "Sala vazia" ----------
   Chão (xadrez), 4 paredes e teto com uma lâmpada pendurada que ilumina a sala.
   O piso fica em y = 0, então os pés da personagem ficam em y = 0. */
var ROOM_W = 40, ROOM_D = 40, ROOM_H = 18;
var room = new THREE.Group();
room.visible = false;
scene.add(room);

M.floor = mat(0xffffff, { vertexColors: true });
M.wall = mat(0xe6e1ec, { side: DS });
/* teto sem sombreamento (MeshBasic): a luz da lâmpada, que fica colada no teto, não forma uma mancha clara nele.
   A cor é trocada em setLight para o teto escurecer junto quando a luz é desligada. */
var CEIL_ON = 0xc9c5d0, CEIL_OFF = 0x26242c;
M.ceiling = new THREE.MeshBasicMaterial({ color: CEIL_ON, side: DS });
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
  return m;
}
var backWall = wall(ROOM_W, 0, -ROOM_D / 2, 0);
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

/* interruptor de parede (parede do fundo): placa + alavanca que vira para cima (ligado) ou para baixo (desligado) */
var SWITCH_POS = { x: 6, y: 5, z: -ROOM_D / 2 };
var SWITCH_REACH = 5;                       /* distância (no chão) para apertar com a tecla E */
M.switchPlate = mat(0xf4f1ea);
M.switchLever = mat(0xc9c3b4);
var wallSwitch = new THREE.Group();
wallSwitch.position.set(SWITCH_POS.x, SWITCH_POS.y, SWITCH_POS.z + 0.08);
room.add(wallSwitch);
var swPlate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2, 0.16), M.switchPlate);
wallSwitch.add(swPlate);
var swLever = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 0.22), M.switchLever);
swLever.position.z = 0.1;
wallSwitch.add(swLever);

/* espelho (parede do fundo, no meio, de frente para quem começa o jogo): uma segunda câmera, refletida pelo plano do espelho,
   desenha a sala numa textura (WebGLRenderTarget) e o espelho mostra essa textura. É o mesmo método do THREE.Reflector,
   escrito aqui porque o three.js r128 usado pela página não traz o Reflector. A parede de trás do espelho some só
   durante esse desenho (a câmera refletida fica atrás dela). O corpo da personagem, que a câmera em primeira pessoa
   não vê (camada 1), aparece no espelho. */
var MIRROR_W = 9, MIRROR_H = 12, MIRROR_Y = 8.5, MIRROR_TEX = 1536;
var mirrorTarget = new THREE.WebGLRenderTarget(MIRROR_TEX, MIRROR_TEX, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
var mirrorCam = new THREE.PerspectiveCamera();
mirrorCam.layers.enable(1);                 /* vê também a camada 1 (o corpo na vista de primeira pessoa) */
var mirrorTexMatrix = new THREE.Matrix4();
var mirror = new THREE.Mesh(
  new THREE.PlaneGeometry(MIRROR_W, MIRROR_H),
  new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: mirrorTarget.texture }, textureMatrix: { value: mirrorTexMatrix } },
    vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv;' +
      'void main() { vUv = textureMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec4 vUv;' +
      'void main() { vec4 c = texture2DProj(tDiffuse, vUv); gl_FragColor = vec4(c.rgb * vec3(0.95, 0.97, 1.0), 1.0); }'
  })
);
mirror.position.set(0, MIRROR_Y, -ROOM_D / 2 + 0.06);   /* de frente para +z, como a parede */
room.add(mirror);
M.mirrorFrame = mat(0x5a4636);
(function () {
  var t = 0.45, d = 0.3, z = -ROOM_D / 2 + 0.06 + d / 2 - 0.05;
  room.add(box(MIRROR_W + 2 * t, t, d, M.mirrorFrame, 0, MIRROR_Y + MIRROR_H / 2 + t / 2, z));
  room.add(box(MIRROR_W + 2 * t, t, d, M.mirrorFrame, 0, MIRROR_Y - MIRROR_H / 2 - t / 2, z));
  room.add(box(t, MIRROR_H, d, M.mirrorFrame, -(MIRROR_W / 2 + t / 2), MIRROR_Y, z));
  room.add(box(t, MIRROR_H, d, M.mirrorFrame, MIRROR_W / 2 + t / 2, MIRROR_Y, z));
})();
room.updateMatrixWorld(true);
var mrN = new THREE.Vector3(), mrP = new THREE.Vector3(), mrC = new THREE.Vector3(), mrV = new THREE.Vector3(), mrT = new THREE.Vector3();
var mrLook = new THREE.Vector3(), mrRot = new THREE.Matrix4(), mrPV = new THREE.Matrix4(), mrFrustum = new THREE.Frustum();
function renderMirror() {
  camera.updateMatrixWorld();
  mrPV.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  mrFrustum.setFromProjectionMatrix(mrPV);
  if (!mrFrustum.intersectsObject(mirror)) return;          /* espelho fora da tela: não gasta tempo desenhando */
  mrP.setFromMatrixPosition(mirror.matrixWorld);
  mrC.setFromMatrixPosition(camera.matrixWorld);
  mrRot.extractRotation(mirror.matrixWorld);
  mrN.set(0, 0, 1).applyMatrix4(mrRot);
  mrV.subVectors(mrP, mrC);
  if (mrV.dot(mrN) > 0) return;                              /* câmera atrás do espelho */
  mrV.reflect(mrN).negate().add(mrP);                        /* posição da câmera refletida */
  mrRot.extractRotation(camera.matrixWorld);
  mrLook.set(0, 0, -1).applyMatrix4(mrRot).add(mrC);
  mrT.subVectors(mrP, mrLook).reflect(mrN).negate().add(mrP);   /* ponto para onde a câmera refletida olha */
  mirrorCam.position.copy(mrV);
  mirrorCam.up.set(0, 1, 0).applyMatrix4(mrRot).reflect(mrN);
  mirrorCam.lookAt(mrT);
  mirrorCam.far = camera.far;
  mirrorCam.updateMatrixWorld();
  mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
  mirrorTexMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  mirrorTexMatrix.multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse).multiply(mirror.matrixWorld);
  mirror.visible = false; backWall.visible = false;
  var prev = renderer.getRenderTarget();
  renderer.setRenderTarget(mirrorTarget);
  renderer.render(scene, mirrorCam);
  renderer.setRenderTarget(prev);
  mirror.visible = true; backWall.visible = true;
}

/* luz da sala: liga/desliga a lâmpada (a luz ambiente fica bem fraca para a sala não sumir por completo) */
var lightOn = true;
var LAMP_INTENSITY = 1.15, AMBIENT_ON = 0.65, AMBIENT_OFF = 0.1;
function setLight(on) {
  lightOn = on;
  lampLight.intensity = on ? LAMP_INTENSITY : 0;
  if (playing) hemi.intensity = on ? AMBIENT_ON : AMBIENT_OFF;
  M.bulb.color.set(on ? 0xfff2c4 : 0x4a4a52);
  M.ceiling.color.set(on ? CEIL_ON : CEIL_OFF);
  swLever.rotation.x = on ? -0.4 : 0.4;
  swLever.position.y = on ? 0.18 : -0.18;
}
function nearSwitch() {
  var dx = pl.x - SWITCH_POS.x, dz = pl.z - SWITCH_POS.z;
  return Math.sqrt(dx * dx + dz * dz) <= SWITCH_REACH;
}
/* área de clique do interruptor: caixa invisível maior que a placa, para ficar fácil de acertar de longe */
var swHit = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
wallSwitch.add(swHit);
var raycaster = new THREE.Raycaster();
var ndc = new THREE.Vector2();
function overSwitch(e) {
  var r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObject(swHit, false).length > 0;
}
function clickSwitch(e) {
  if (!overSwitch(e)) return;
  if (nearSwitch()) { setLight(!lightOn); playUi('interruptor'); }
  else showNote('Chegue mais perto do interruptor para ligar ou desligar a luz.');
}
