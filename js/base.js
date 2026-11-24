/* ============================================================================
   base.js — ponto de entrada. Confere se o three.js e o WebGL funcionam e, só se funcionarem,
   cria o renderizador e carrega os outros arquivos, na ordem da lista SCRIPTS.
   Define: stage, THREE, renderer, canvas
   ============================================================================ */

/* Todos os arquivos de js/ são scripts comuns que dividem o mesmo escopo (como se fossem um arquivo só, cortado por assunto).
   Por isso a ORDEM importa: cada arquivo usa o que os de cima da lista definiram. */
var SCRIPTS = [
  'js/cena.js',         /* cena, câmera, luzes */
  'js/ajudantes.js',    /* materiais e ajudantes de geometria */
  'js/cabelo.js',       /* createHair: casca do cabelo, cortina de mechas e rabo de cavalo */
  'js/tenis.js',        /* createShoe: tênis */
  'js/personagem.js',   /* createCharacter: corpo, roupas e cores */
  'js/interface.js',    /* abas, seletor de cor, cabelo e roupas */
  'js/camera.js',       /* câmera e controles do visualizador */
  'js/sala.js',         /* sala do jogo: chão, paredes, lâmpada e interruptor */
  'js/jogo.js',         /* modo jogo: menu, vistas, tela cheia, teclado e movimento */
  'js/som.js',          /* sons: passos no jogo (andar e correr) e cliques dos botões */
  'js/animacao.js'      /* pés no chão e o laço de animação (sempre o último) */
];

var stage = document.getElementById('stage');
var THREE = window.THREE;
var renderer = null;
var canvas = null;
if (!THREE) {
  stage.textContent = 'Não foi possível carregar o motor 3D.';
} else {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (err) {
    stage.textContent = 'Este navegador não conseguiu abrir o 3D (WebGL indisponível).';
  }
}
if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Modelo 3D low poly de corpo inteiro de uma menina de cabelo castanho volumoso em facetas, camiseta larga, bermuda preta com listras, meias brancas e tênis, com mãos simples e lisas, sem dedos. Use as setas para girar.');
  stage.appendChild(canvas);

  /* async = false: os scripts criados assim rodam um depois do outro, na ordem em que foram adicionados */
  SCRIPTS.forEach(function (src) {
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    document.body.appendChild(s);
  });
}
