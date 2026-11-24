/* ============================================================================
   camera.js — câmera e controles do visualizador (girar, zoom, aceno, andar no lugar, aramado).
   Define: yaw, pitch, zoom, auto, drag, playing, waveT0, walking, running, applyCamera(), resize(), clamp()...
   Usa:    camera, renderer, canvas, stage, characters, active (interface.js)
   ============================================================================ */

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
  if (e.button !== 0) return;             /* só o botão esquerdo gira a câmera; o direito é ignorado */
  drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, btn: e.button };
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
canvas.addEventListener('pointerup', function (e) {
  /* um clique do botão esquerdo (quase sem arrastar) no interruptor da parede liga/desliga a luz */
  if (drag && playing && drag.btn === 0 && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) clickSwitch(e);
  endDrag();
});
/* cursor de "mão" ao passar o mouse no interruptor quando estiver perto dele */
canvas.addEventListener('pointermove', function (e) {
  if (drag) return;
  canvas.style.cursor = (playing && nearSwitch() && overSwitch(e)) ? 'pointer' : '';
});
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); endDrag(); });
window.addEventListener('blur', endDrag);
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
