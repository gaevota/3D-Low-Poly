/* episodios.js — monta os cards da página Episódios a partir de EPISODIOS (lista.js). */
(function () {
  var ol = document.getElementById('episodios');
  EPISODIOS.slice().sort(function (a, b) { return a.n - b.n; }).forEach(function (ep) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.className = 'episodio';
    a.href = ep.pasta + '/index.html';
    a.innerHTML = '<span class="num">' + ep.n + '</span>' +
      '<span class="info"><strong></strong><span class="resumo"></span></span>' +
      '<span class="dur"></span>';
    a.querySelector('strong').textContent = ep.titulo;
    a.querySelector('.resumo').textContent = ep.resumo;
    a.querySelector('.dur').textContent = ep.duracao;
    li.appendChild(a);
    ol.appendChild(li);
  });
})();
