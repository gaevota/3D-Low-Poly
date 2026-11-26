/* sons.js — sons do episódio: botões e links (audio/botoes.mp3) e passos do personagem (audio/passo-1.mp3 a passo-4.mp3).
   Um único ouvinte de clique cobre todos os botões e links da página, inclusive os criados depois pelo código.
   Arquivo que não existir é ignorado: a página fica sem som, mas funciona normalmente. */
(function () {
  var UI_VOL = 0.6;
  var clique = new Audio('../../audio/botoes.mp3');
  clique.preload = 'auto';

  function tocar() {
    var s = clique.cloneNode(true);   /* cópia: cliques rápidos podem se sobrepor */
    s.volume = UI_VOL;
    var p = s.play();
    if (p && p.catch) p.catch(function () {});
  }

  /* passos do personagem: os mesmos sons do jogo da página principal. Cada pisada sorteia um (sem repetir o último). */
  var PASSO_VOL = 0.45;
  /* silêncio no começo de cada mp3 (em s): é pulado, para o som sair na hora em que o pé toca o chão.
     Se trocar os arquivos de passo, ajuste estes valores. */
  var PASSO_INICIO = [0.27, 0.25, 0, 0.40];
  var passos = [1, 2, 3, 4].map(function (n) {
    var a = new Audio('../../audio/passo-' + n + '.mp3');
    a.preload = 'auto';
    return a;
  });
  var ultimo = -1;
  window.tocarPasso = function () {
    var i = (ultimo + 1 + Math.floor(Math.random() * (passos.length - 1))) % passos.length;
    ultimo = i;
    var s = passos[i].cloneNode(true);
    s.volume = PASSO_VOL;
    s.currentTime = PASSO_INICIO[i];
    var p = s.play();
    if (p && p.catch) p.catch(function () {});
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('button, a[href]');
    if (!el) return;
    tocar();
    /* link: uma espera bem curta antes de trocar de página deixa o som começar a tocar.
       Cliques que abrem em outra aba (Ctrl, Cmd, Shift, Alt) seguem o comportamento normal. */
    if (el.tagName === 'A' && !el.target && !e.defaultPrevented &&
        !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) {
      e.preventDefault();
      setTimeout(function () { window.location.href = el.href; }, 200);
    }
  });
})();
