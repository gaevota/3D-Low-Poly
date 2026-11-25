# Episódios

A página `episodios/index.html` lista os episódios; o botão **Episódios** da página principal abre ela.
Cada episódio é uma pasta própria, com HTML, CSS e JS separados:

    episodios/
      index.html, episodios.css, episodios.js   a página com a lista (não precisa mexer)
      lista.js                                  a lista de episódios (é aqui que se acrescenta um)
      microondas/                               episódio 1
        index.html     a página do episódio
        estilo.css     estilo
        narracao.js    a narração (window.CUES): texto e tempo de cada frase
        episodio.js    cenas, câmera, motor 3D e player

## Como acrescentar um episódio

1. Copie a pasta `microondas/` com o nome do novo episódio (ex.: `episodios/arco-iris/`).
2. Troque a narração em `narracao.js`, as cenas em `episodio.js` (tabela `SCENES`) e o título em `index.html`.
3. Em `lista.js`, copie o item do episódio 1 e ajuste `n`, `titulo`, `resumo`, `duracao`, `emoji` e `pasta`.

Cada episódio usa só os próprios arquivos (nada compartilhado), então mexer em um não quebra os outros.
