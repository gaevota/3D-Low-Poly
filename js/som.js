/* ============================================================================
   som.js — sons: passos no modo jogo (andar e correr) e cliques dos botões da página.
   Define: initSom(), updateFootsteps(), playStep(), STEP_FILES, playUi(), UI_FILES
   Usa:    walkPh, runK, playing (camera.js / animacao.js), moving, pl (jogo.js)
   ============================================================================ */

/* Um som por vez que um pé toca o chão, no ritmo da animação: a passada é sin(walkPh) e a perna chega mais à frente
   (o calcanhar toca o chão) quando |sin| = 1, ou seja, a cada meio ciclo, em walkPh = π/2 + k·π. Correr gira walkPh mais rápido,
   então os passos aceleram sozinhos. Só toca dentro do jogo e com a personagem no chão (no pulo, não).

   Os sons vêm de arquivos em audio/ (gerados no ElevenLabs): passo-1.mp3, passo-2.mp3... Cada passo sorteia um deles, para não
   soar repetido, e varia um pouco o tom; correr toca mais alto e um pouco mais agudo. Arquivos que não existirem são ignorados e,
   se nenhum existir, toca um passo sintetizado aqui mesmo (estalo + baque), então o jogo nunca fica mudo. */
var STEP_FILES = ['audio/passo-1.mp3', 'audio/passo-2.mp3', 'audio/passo-3.mp3', 'audio/passo-4.mp3'];
var STEP_VOL_WALK = 0.45, STEP_VOL_RUN = 0.75;
var stepSamples = [];            /* os <audio> que carregaram */
var stepSamplesTried = false;
var stepLast = -1;               /* qual sample tocou por último (para não repetir em seguida) */
var stepIdx = 0;                 /* em que meio ciclo da passada estamos */
var audioCtx = null, noiseBuf = null;

/* Chamado quando o jogo começa (dentro do clique que abriu o jogo: o navegador só libera o som depois de um clique). */
function initSom() {
  if (!audioCtx) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (err) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') { try { audioCtx.resume(); } catch (err) {} }
  if (!stepSamplesTried) {                    /* só procura os arquivos na primeira vez que o jogo abre */
    stepSamplesTried = true;
    STEP_FILES.forEach(function (src) {
      var a = new Audio();
      a.preload = 'auto';
      a.addEventListener('canplaythrough', function () { if (stepSamples.indexOf(a) < 0) stepSamples.push(a); });
      a.src = src;
      a.load();
    });
  }
}

/* Chamado a cada quadro, com a fase da passada. onGround = andando e com os pés no chão; running = correndo. */
function updateFootsteps(phase, onGround, running) {
  var idx = Math.floor((phase - Math.PI / 2) / Math.PI);
  if (idx === stepIdx) return;
  if (onGround && idx > stepIdx) playStep(running);
  stepIdx = idx;                              /* no ar a contagem continua, mas sem som */
}

function playStep(running) {
  var vol = running ? STEP_VOL_RUN : STEP_VOL_WALK;
  var n = stepSamples.length;
  if (n) {
    var i = n > 1 ? (stepLast + 1 + Math.floor(Math.random() * (n - 1))) % n : 0;     /* qualquer um, menos o último */
    stepLast = i;
    var s = stepSamples[i].cloneNode(true);   /* cópia: passos seguidos podem se sobrepor */
    s.volume = vol * (0.9 + Math.random() * 0.1);
    s.playbackRate = (running ? 1.12 : 1) * (0.94 + Math.random() * 0.12);
    s.preservesPitch = s.mozPreservesPitch = s.webkitPreservesPitch = false;          /* velocidade muda o tom: mais variação */
    var p = s.play();
    if (p && p.catch) p.catch(function () {});
  } else {
    synthStep(running, vol);
  }
}

/* passo de reserva: um estalo curto (ruído filtrado) + um baque grave que desce */
function synthStep(running, vol) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  var t = audioCtx.currentTime;
  if (!noiseBuf) {
    noiseBuf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.15), audioCtx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  var k = 0.9 + Math.random() * 0.2;          /* varia o tom de cada passo */
  var src = audioCtx.createBufferSource();
  src.buffer = noiseBuf;
  var bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = (running ? 2600 : 2000) * k;
  bp.Q.value = 0.9;
  var g = audioCtx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol * 0.5, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, t + (running ? 0.05 : 0.07));
  src.connect(bp); bp.connect(g); g.connect(audioCtx.destination);
  src.start(t); src.stop(t + 0.15);
  var o = audioCtx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(130 * k, t);
  o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
  var g2 = audioCtx.createGain();
  g2.gain.setValueAtTime(vol * 0.4, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(g2); g2.connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.12);
}

/* ---------- sons dos botões ----------
   Cada tipo de botão tem o seu som, em audio/:
     roupas.mp3        botões do painel Roupas (roupa e manga)
     cores.mp3         botões de Cor (peça a pintar e as cores da paleta)
     botoes.mp3        todos os outros botões
     iniciar-jogo.mp3  Jogar e a escolha do ambiente
     interruptor.mp3   Colocar/Tirar franja e o interruptor de parede da sala (sala.js chama playUi('interruptor'))
   Um único ouvinte de clique na página inteira descobre de que tipo é o botão clicado (uiKind), então botões criados depois
   (como as cores, montadas em interface.js) já saem com o som certo. Arquivo que não existir é ignorado: o botão fica sem som. */
var UI_FILES = {
  roupas: 'audio/roupas.mp3',
  cores: 'audio/cores.mp3',
  botoes: 'audio/botoes.mp3',
  inicio: 'audio/iniciar-jogo.mp3',
  interruptor: 'audio/interruptor.mp3'
};
var UI_VOL = 0.6;
var uiSamples = {};              /* os <audio> que carregaram, por tipo */
Object.keys(UI_FILES).forEach(function (kind) {
  var a = new Audio();
  a.preload = 'auto';
  a.addEventListener('canplaythrough', function () { uiSamples[kind] = a; });
  a.src = UI_FILES[kind];
  a.load();
});

function playUi(kind) {
  var a = uiSamples[kind];
  if (!a) return;
  var s = a.cloneNode(true);     /* cópia: cliques rápidos podem se sobrepor */
  s.volume = UI_VOL;
  var p = s.play();
  if (p && p.catch) p.catch(function () {});
}

function uiKind(b) {
  if (b.id === 'btnBang') return 'interruptor';
  if (b.id === 'btnPlay' || b.classList.contains('env')) return 'inicio';
  if (b.closest('#wardrobe')) return 'roupas';
  if (b.closest('#partBtns') || b.closest('#colorSwatches')) return 'cores';
  return 'botoes';
}

document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('button');
  if (b) playUi(uiKind(b));
});
