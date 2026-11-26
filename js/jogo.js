/* ============================================================================
   jogo.js — modo jogo: menu de ambientes, vistas, tela cheia, teclado, movimento e câmera em terceira pessoa.
   Define: pl, camYaw, camPitch, keys, startGame(), stopGame(), setView(), toggleFullscreen(), updatePlay(), applyPlayCamera()...
   Usa:    room, setLight (sala.js), active, rig (cena/interface), playing, zoom, yaw, pitch (camera.js)
   ============================================================================ */

/* ---------- jogo: botão, menu de ambientes e controles ---------- */
var LIM_X = ROOM_W / 2 - 2.2, LIM_Z = ROOM_D / 2 - 2.2;   /* limite dos pés da personagem */
var WALK_SPEED = 8, RUN_SPEED = 15;
var pl = { x: 0, y: 0, vy: 0, z: 8, face: Math.PI };   /* posição, altura do pulo e direção que a personagem olha */
var JUMP_V = 16, GRAVITY = 42;            /* pulo de cerca de 3 unidades de altura, ~0,76 s no ar */
var camYaw = 0, camPitch = 0.4;
/* Três vistas (teclas 1, 2 e 3 ou botões):
   Vista 1 = câmera em terceira pessoa de antes: orbita a personagem sempre olhando para ela
             (camPitch de ORBIT_MIN até PITCH_MAX); as setas andam como W A S D.
   Vista 2 = vista da sala: abaixo de ORBIT_MIN a câmera fica baixa e só inclina o olhar para
             cima (até PITCH_MIN), para ver as paredes, o teto e a lâmpada.
   Vista 3 = primeira pessoa: a câmera fica na altura dos olhos da personagem (só a cabeça some, para não
             atrapalhar; o resto do corpo aparece) e olha para onde o mouse aponta; camPitch positivo = olhar para baixo. */
var PITCH_MIN = -1.1, PITCH_MAX = 1.2, ORBIT_MIN = 0.05;
var VIEW1_PITCH = 0.4, VIEW2_PITCH = -0.4, VIEW3_PITCH = 0;     /* inclinação ao trocar de vista */
var EYE_Y = 8.0;                               /* altura dos olhos na vista 3 (a cabeça fica em y = 7,92) */
var FOV_ORBIT = 35, FOV_FIRST = 75;            /* campo de visão: vistas 1 e 2 / vista 3 (primeira pessoa) */
var camView = 1;
function pitchMin() { return camView === 1 ? ORBIT_MIN : PITCH_MIN; }
var keys = {}, moving = false, sprint = false;
var MOVE_KEYS = {
  KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1,
  ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
  ShiftLeft: 1, ShiftRight: 1, Space: 1
};
var menu = document.getElementById('menuJogo');
var btnPlay = document.getElementById('btnPlay');
var VIEW_LABEL = canvas.getAttribute('aria-label');
var PLAY_LABEL = 'Sala vazia em 3D. Use as teclas W, A, S e D (ou as setas) para andar com a personagem, Shift para correr, Espaço para pular. Arraste o mouse para girar a câmera. As teclas 1, 2 e 3 trocam a vista; na vista 2, o mouse olha para cima, até o teto; a vista 3 é em primeira pessoa.';

var HINT_PLAY = 'W A S D (ou setas) para andar · Shift para correr · Espaço para pular · 1, 2 e 3 trocam a vista · F tela cheia · Esc para sair';
function setView(n) {
  camView = n;
  camPitch = n === 3 ? VIEW3_PITCH : (n === 2 ? VIEW2_PITCH : VIEW1_PITCH);
  document.getElementById('btnView1').setAttribute('aria-pressed', n === 1 ? 'true' : 'false');
  document.getElementById('btnView2').setAttribute('aria-pressed', n === 2 ? 'true' : 'false');
  document.getElementById('btnView3').setAttribute('aria-pressed', n === 3 ? 'true' : 'false');
  document.getElementById('playHint').textContent = HINT_PLAY;
  camera.fov = n === 3 ? FOV_FIRST : FOV_ORBIT;     /* primeira pessoa precisa de um campo de visão mais aberto */
  camera.updateProjectionMatrix();
  if (active && active.head) active.head.visible = n !== 3;   /* na primeira pessoa só a cabeça (e o cabelo) some; o resto do corpo aparece */
}
function setPlayUI(on) {
  document.getElementById('viewerBtns').hidden = on;
  document.getElementById('viewerHint').hidden = on;
  document.getElementById('tabsBar').hidden = on;
  document.getElementById('wardrobe').hidden = on;
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
  initSom();                                 /* som dos passos (som.js): começa aqui, dentro do clique que abriu o jogo */
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
  setLight(true);                            /* luz ambiente da sala + a lâmpada no teto (sempre começa acesa) */
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
  if (active.head) active.head.visible = true;
  camera.fov = FOV_ORBIT; camera.updateProjectionMatrix();
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
document.getElementById('btnView3').addEventListener('click', function () { setView(3); canvas.focus(); });

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
  if (e.code === 'Digit3' || e.code === 'Numpad3') { setView(3); e.preventDefault(); return; }
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
  /* W A S D e as setas andam, nas duas vistas; a câmera gira arrastando com o mouse */
  var f = ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0);
  var r = ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
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
/* câmera do jogo: vistas 1 e 2 orbitam a personagem (terceira pessoa); a vista 3 é em primeira pessoa */
function applyPlayCamera() {
  if (camView === 3) {                               /* primeira pessoa: nos olhos, olhando para onde camYaw/camPitch apontam */
    var ex = clamp(pl.x - Math.sin(camYaw) * 0.3, -(ROOM_W / 2 - 0.6), ROOM_W / 2 - 0.6);   /* um pouco à frente do pescoço */
    var ez = clamp(pl.z - Math.cos(camYaw) * 0.3, -(ROOM_D / 2 - 0.6), ROOM_D / 2 - 0.6);
    camera.position.set(ex, EYE_Y + pl.y, ez);
    camera.rotation.set(-camPitch, camYaw, 0, 'YXZ');   /* yaw 0 olha para -z, como W andando para frente */
    return;
  }
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
