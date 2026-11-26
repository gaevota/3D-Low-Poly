/* sons.js — som dos botões e links da lista de episódios. Usa o mesmo som de botão da página principal (audio/botoes.mp3).
   Um único ouvinte de clique cobre todos os botões e links da página, inclusive os criados depois pelo código.
   Arquivo que não existir é ignorado: a página fica sem som, mas funciona normalmente. */
(function () {
  var UI_VOL = 0.6;
  var clique = new Audio('../audio/botoes.mp3');
  clique.preload = 'auto';

  function tocar() {
    var s = clique.cloneNode(true);   /* cópia: cliques rápidos podem se sobrepor */
    s.volume = UI_VOL;
    var p = s.play();
    if (p && p.catch) p.catch(function () {});
  }

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
