/* ============================================================================
   cena.js — a cena 3D: cena, câmera, luzes e o "rig" (grupo que gira com o mouse e guarda os personagens).
   Define: scene, camera, hemi, key, fill, rim, VIEW_LIGHTS, rig
   Usa:    THREE
   ============================================================================ */

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

/* ---------- luzes (suaves para a pele não estourar) ---------- */
var hemi = new THREE.HemisphereLight(0xffffff, 0x8a8aa0, 0.62); scene.add(hemi);
var key = new THREE.DirectionalLight(0xfff4ea, 0.7); key.position.set(3, 8, 7); scene.add(key);
var fill = new THREE.DirectionalLight(0xb8c4ff, 0.3); fill.position.set(-6, 3, 3); scene.add(fill);
var rim = new THREE.DirectionalLight(0x9fb4ff, 0.35); rim.position.set(-4, 4, -6); scene.add(rim);
/* intensidades do visualizador, para restaurar ao sair do jogo */
var VIEW_LIGHTS = [[hemi, 0.62], [key, 0.7], [fill, 0.3], [rim, 0.35]];

var rig = new THREE.Group();          /* gira com o mouse; guarda os personagens */
scene.add(rig);
