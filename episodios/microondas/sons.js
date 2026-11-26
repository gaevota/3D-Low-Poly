/* sons.js — sons do episódio: botões e links (audio/botoes.mp3) e passos do personagem (audio/passo-3.mp3)
   etiquetas do vídeo (audio/botoes.mp3)
   e destaques: magnetron e sinais + e − (audio-videos/etiqueta.mp3).
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

  /* passos do personagem: um dos sons de passo do jogo da página principal (passo-3.mp3, que não tem silêncio no começo,
     então sai na hora em que o pé toca o chão). */
  var PASSO_VOL = 0.45;
  var passo = new Audio('../../audio/passo-3.mp3');
  passo.preload = 'auto';
  window.tocarPasso = function () {
    var s = passo.cloneNode(true);
    s.volume = PASSO_VOL;
    var p = s.play();
    if (p && p.catch) p.catch(function () {});
  };

  /* sons do vídeo, chamados por episodio.js.
     inicio = silêncio no começo do mp3 (em s), pulado para o som sair na hora certa */
  function somDoVideo(arquivo, volume, inicio) {
    var a = new Audio(arquivo);
    a.preload = 'auto';
    return function () {
      var s = a.cloneNode(true);
      s.volume = volume;
      s.currentTime = inicio;
      var p = s.play();
      if (p && p.catch) p.catch(function () {});
    };
  }
  /* etiquetas (os textos com linha): o mesmo som dos botões */
  window.tocarEtiqueta = somDoVideo('../../audio/botoes.mp3', 0.4, 0.1);
  /* magnetron começando a piscar em amarelo e sinais + e − da molécula */
  window.tocarDestaque = somDoVideo('../../audio-videos/etiqueta.mp3', 0.25, 0);

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
