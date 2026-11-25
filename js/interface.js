/* ============================================================================
   interface.js — abas dos personagens, seletor de cor, botões de cabelo e de roupa e o botão Episódios.
   Define: characters, active, selectCharacter(), updateCount(), curPart, PALETTES, syncColorUI/HairUI/OutfitUI...
   Usa:    createCharacter, setPartColor (personagem.js), rig, stage
   ============================================================================ */

/* ---------- personagens (abas) ----------
   Cria os personagens, mostra um por vez e monta as abas "Personagem 1..N".
   Por enquanto só existe o Personagem 1. */
var NUM_CHARACTERS = 1;
var characters = [];
var active = null;
var tabList = document.getElementById('personagens');
var charName = document.getElementById('charName');
var tabBtns = [];
var nf = new Intl.NumberFormat('pt-BR');

function triCount(root) {
  var n = 0;
  root.traverse(function (o) {
    if (o.isMesh && o.visible) {          /* peças escondidas (cabelo não escolhido) não contam */
      var g = o.geometry;
      n += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    }
  });
  return n;
}
function updateCount() {
  document.getElementById('count').textContent = nf.format(Math.round(triCount(active.character))) + ' triângulos';
}
function selectCharacter(i, focus) {
  active = characters[i];
  characters.forEach(function (c) { c.character.visible = (c === active); });
  tabBtns.forEach(function (b, j) {
    var on = j === i;
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
  });
  stage.setAttribute('aria-labelledby', tabBtns[i].id);
  if (focus) tabBtns[i].focus();
  charName.textContent = active.name;
  syncColorUI();
  syncHairUI();
  syncOutfitUI();
  updateCount();
}
for (var ci = 0; ci < NUM_CHARACTERS; ci++) {
  (function (i) {
    var c = createCharacter(i);
    c.name = 'Personagem ' + (i + 1);
    c.character.visible = false;
    rig.add(c.character);
    characters.push(c);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab';
    b.id = 'tab-personagem-' + (i + 1);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'stage');
    b.textContent = c.name;
    b.addEventListener('click', function () { selectCharacter(i); });
    tabList.appendChild(b);
    tabBtns.push(b);
  })(ci);
}
stage.setAttribute('role', 'tabpanel');
/* com um personagem só, as abas não têm o que escolher */
if (NUM_CHARACTERS === 1) {
  document.getElementById('personagens-label').hidden = true;
  tabList.hidden = true;
}
tabList.addEventListener('keydown', function (e) {
  var i = tabBtns.indexOf(document.activeElement);
  if (i < 0) return;
  var n = tabBtns.length, to = -1;
  if (e.key === 'ArrowRight') to = (i + 1) % n;
  else if (e.key === 'ArrowLeft') to = (i - 1 + n) % n;
  else if (e.key === 'Home') to = 0;
  else if (e.key === 'End') to = n - 1;
  if (to >= 0) { e.preventDefault(); selectCharacter(to, true); }
});

/* ---------- cor da camiseta, do shorts e do tênis (cada personagem tem as suas) ---------- */
var CLOTH_COLORS = [
  ['Azul-marinho', '#2f3366'], ['Vermelho', '#b3333a'], ['Laranja', '#d9772b'], ['Amarelo', '#e0b92f'],
  ['Verde', '#3f8a55'], ['Turquesa', '#2f9aa3'], ['Roxo', '#7a45a8'], ['Rosa', '#d9739c'],
  ['Branco', '#e9e9ee'], ['Cinza', '#7d7f8c'], ['Preto', '#1b1b20']
];
/* cada peça tem a sua paleta: roupas usam as cores acima; pele e cabelo, tons próprios */
var PALETTES = {
  shirt: CLOTH_COLORS, shorts: CLOTH_COLORS, shoes: CLOTH_COLORS,
  skin: [['Muito clara', '#f3d9c8'], ['Clara', '#e8c4aa'], ['Bege', '#d3c3bb'], ['Média', '#c99a78'],
         ['Morena', '#a8714f'], ['Escura', '#7a4b32'], ['Muito escura', '#4a2e20']],
  hair: [['Preto', '#1b1b20'], ['Castanho escuro', '#3a2a24'], ['Castanho', '#5a4a43'], ['Castanho claro', '#8a6a4a'],
         ['Loiro', '#d8b56a'], ['Ruivo', '#a8432a'], ['Grisalho', '#9a9aa4'], ['Branco', '#e9e9ee'],
         ['Rosa', '#d9739c'], ['Azul', '#3f6fd0'], ['Roxo', '#7a45a8'], ['Verde', '#3f8a55']]
};
var PARTS = [['shirt', 'Camiseta'], ['shorts', 'Shorts'], ['shoes', 'Tênis'], ['skin', 'Pele'], ['hair', 'Cabelo']];
var curPart = 'shirt';                 /* peça que o seletor está pintando */
var partBox = document.getElementById('partBtns');
var colorBox = document.getElementById('colorSwatches');
var colorCustom = document.getElementById('colorCustom');
var partBtns = [];
var swatchBtns = [];
function syncColorUI() {
  var hex = active.parts[curPart].hex.toLowerCase();
  partBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-part') === curPart ? 'true' : 'false'); });
  swatchBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-hex') === hex ? 'true' : 'false'); });
  colorCustom.value = hex;
}
function applyColor(hex) {
  setPartColor(active, curPart, hex);
  syncColorUI();
}
PARTS.forEach(function (pt) {
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'part';
  b.setAttribute('data-part', pt[0]);
  b.setAttribute('aria-pressed', 'false');
  b.textContent = pt[1];
  b.addEventListener('click', function () { curPart = pt[0]; buildSwatches(); syncColorUI(); });
  partBox.appendChild(b);
  partBtns.push(b);
});
/* refaz os botões de cor com a paleta da peça escolhida */
function buildSwatches() {
  colorBox.innerHTML = '';
  swatchBtns = [];
  PALETTES[curPart].forEach(function (sc) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.setAttribute('data-hex', sc[1]);
    b.setAttribute('aria-label', 'Cor ' + sc[0].toLowerCase());
    b.setAttribute('aria-pressed', 'false');
    b.title = sc[0];
    b.style.backgroundColor = sc[1];
    b.addEventListener('click', function () { applyColor(sc[1]); });
    colorBox.appendChild(b);
    swatchBtns.push(b);
  });
}
buildSwatches();
colorCustom.addEventListener('input', function () { applyColor(colorCustom.value); });

/* ---------- cabelo: só o Personagem 1 tem a opção ----------
   Masculino: Cabelo 1 e 2 (data-hair 1 e 5) · Feminino: Cabelo 1, 2 e 3 (data-hair 3, 6 e 7) · "Colocar franja" liga a franja comprida em qualquer um (data-hair = número do cabelo) */
var hairPicker = document.getElementById('hairPicker');
var btnHair = Array.prototype.slice.call(hairPicker.querySelectorAll('[data-hair]'));
var btnBang = document.getElementById('btnBang');
function syncHairUI() {
  hairPicker.hidden = (active !== characters[0]);
  btnHair.forEach(function (b) { b.setAttribute('aria-pressed', active.hair === Number(b.getAttribute('data-hair')) ? 'true' : 'false'); });
  btnBang.setAttribute('aria-pressed', active.bang ? 'true' : 'false');
  btnBang.textContent = active.bang ? 'Tirar franja' : 'Colocar franja';
}
btnHair.forEach(function (b) {
  b.addEventListener('click', function () { active.setHair(Number(b.getAttribute('data-hair'))); syncHairUI(); updateCount(); });
});
btnBang.addEventListener('click', function () { active.setBang(!active.bang); syncHairUI(); updateCount(); });
/* ---------- roupas (painel no canto direito) ----------
   Masculino: camiseta e shorts (a roupa original) ou camiseta e bermuda longa · Feminino: vestido (a camiseta vira o vestido e o shorts some)
   ou camiseta e saia (a saia ocupa o lugar do shorts e usa a cor dele) */
var outfitBtns = Array.prototype.slice.call(document.querySelectorAll('[data-outfit]'));
var btnSleeve = document.getElementById('btnSleeve');     /* manga longa: vale para qualquer roupa */
function syncOutfitUI() {
  var o = active.outfit;
  outfitBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-outfit') === o ? 'true' : 'false'); });
  btnSleeve.setAttribute('aria-pressed', active.longSleeve ? 'true' : 'false');
  btnSleeve.textContent = active.longSleeve ? 'Manga curta' : 'Manga longa';
  partBtns.forEach(function (b) {
    var k = b.getAttribute('data-part');
    if (k === 'shorts') {
      b.hidden = (o === 'vestido');                                     /* no vestido não há shorts nem saia separada para pintar */
      b.textContent = (o === 'saia') ? 'Saia' : (o === 'bermuda') ? 'Bermuda' : 'Shorts';
    }
    if (k === 'shirt') b.textContent = (o === 'vestido') ? 'Vestido' : active.longSleeve ? 'Camisa' : 'Camiseta';
  });
  if (o === 'vestido' && curPart === 'shorts') { curPart = 'shirt'; buildSwatches(); syncColorUI(); }
}
outfitBtns.forEach(function (b) {
  b.addEventListener('click', function () {
    active.setOutfit(b.getAttribute('data-outfit'));
    syncOutfitUI();
    updateCount();
  });
});
btnSleeve.addEventListener('click', function () {
  active.setLongSleeve(!active.longSleeve);
  syncOutfitUI();
  updateCount();
});
/* ---------- episódios ----------
   O botão (o primeiro da fila) abre a página episodios/index.html, com a lista de episódios.
   Uma espera bem curta antes de trocar de página deixa o som do clique começar a tocar. */
document.getElementById('btnEpisodios').addEventListener('click', function () {
  setTimeout(function () { window.location.href = 'episodios/index.html'; }, 200);
});
selectCharacter(0);
