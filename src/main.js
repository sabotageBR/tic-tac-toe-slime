// Liga tudo nos prototipos (Fase A): o modelo escolhido (?modelo=N ou window.__velhaModelo), a
// cena, o laco, a entrada, o audio e o SDK da Poki. O modo nunca toca DOM, audio nem SDK: ele
// empurra eventos e este arquivo os traduz (som, VFX, measure). Unico dono do SDK, do DOM e do save.

import { lerDepuracao } from './core/depuracao.js';
import { criarLaco, PASSO } from './core/laco.js';
import { criarEntrada } from './core/entrada.js';
import { criarAudio } from './core/audio.js';
import { criarMesa } from './som/mesa.js';
import { poki } from './core/poki.js';
import { criarArmazem } from './core/armazenamento.js';
import { vibrar } from './core/haptico.js';
import { criarCena, QUALIDADES } from './render/cena.js';
import { criarQualidade } from './render/qualidade.js';
import { texto } from './i18n/textos.js';
import { MODELOS } from './jogo/modelos.js';
import { DESENHOS } from './render/modelos/index.js';

const dep = lerDepuracao();
const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const lang = dep.lang || ((navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en');
const T = (/** @type {string} */ k, /** @type {any} */ v) => texto(lang, k, v);
const armazem = criarArmazem();
const toque = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
document.body.dataset.plataforma = 'poki';
if (dep.semHud) document.body.classList.add('semhud');

const idModelo = String(dep.modelo || /** @type {any} */ (globalThis).__velhaModelo || '6'); // modelo
const MOD = MODELOS[idModelo] || MODELOS['6'];
const salvo = armazem.ler('prefs', {}) || {};

/** estado do prototipo */
const J = {
  modo: /** @type {any} */ (null),
  regra: dep.regra || (salvo && salvo['regra' + idModelo]) || '',
  dois: dep.dois,
  t: 0,
  jogou: false,
  vistos: Number((salvo && salvo.vistos) || 0),
};

function salvar() {
  armazem.gravar('prefs', { ...(armazem.ler('prefs', {}) || {}), ['regra' + idModelo]: J.regra, vistos: J.vistos });
}

function novoModo() {
  J.modo = MOD.criarModo({
    semente: dep.semente || ((Date.now() / 1000) | 0),
    regra: J.regra,
    doisJogadores: J.dois,
    nivel: dep.nivel >= 0 ? dep.nivel : undefined,
    primeira: dep.primeira || J.vistos === 0,
    hoje: new Date().toISOString().slice(0, 10),
    lang,
  });
  J.regra = J.modo.regra;
  if (DESENHOS[idModelo]) J.modo.desenho = DESENHOS[idModelo](J.modo);
  montarSubmodos();
  atualizarHud(true);
}

// ------------------------------------------------------------------ cena, audio, laco
const cena = criarCena({ fundo: /** @type {any} */ ($('cFundo')), slime: /** @type {any} */ ($('cSlime')), topo: /** @type {any} */ ($('cTopo')), area: $('area'), tela: /** @type {any} */ ($('cTela')) },
  { forcar2d: dep.render === '2d', raio: dep.raio, limiar: dep.limiar, zoom: dep.zoom, expr: dep.expr });
const qualidade = criarQualidade({ niveis: QUALIDADES.length, inicial: dep.qualidade >= 0 ? dep.qualidade : toque ? 1 : 0 });
cena.definirQualidade(qualidade.nivel);
const audio = criarAudio();
const mesa = criarMesa(audio);
audio.definirMudo(!!(salvo && salvo.mudo));

/** Som de cada evento sonoro dos modos (receitas do slime-merge e do volei). */
const SONS = {
  pingo: ['pingo', {}], pulo: ['pulo', {}], derrete: ['gloop', {}], estouro: ['estouroSplash', {}], recusa: ['recusa', {}],
  venceu: ['fanfarra', {}], perdeu: ['ohh', {}], empate: ['tique', {}], fundir: ['fusaoBolha', { combo: 2 }], engolir: ['gelatina', { forca: 2 }],
  cuspir: ['gloop', {}], gelo: ['critico', {}], tremor: ['explodir', {}], vento: ['comboSwoosh', { combo: 4 }], tampa: ['yes', {}],
  despejar: ['bolhaSobe', {}], peteleco: ['squish', { forca: 2 }], batida: ['gelatina', { forca: 3 }], calha: ['descartar', {}],
  poder: ['completar', {}], aviso: ['tique', {}], botao: ['botao', {}],
};

function tratarEventos() {
  const ev = J.modo.eventos;
  for (const e of ev) {
    switch (e.tipo) {
      case 'som': {
        const s = SONS[/** @type {keyof typeof SONS} */ (e.nome)];
        if (s) mesa.tocar(s[0], { ...s[1], ...(e.p || {}) });
        break;
      }
      case 'voz': mesa.falar(e.id); break;
      case 'pouso':
        mesa.tocar('squish', { forca: e.forca || 1 });
        cena.vfx.respingo(e.x, e.y, e.cor || '#88c', 6, 3 + (e.forca || 1) * 2);
        break;
      case 'pingo': cena.vfx.brilho(e.x, e.y, '#ffffff'); break;
      case 'ralo': cena.vfx.respingo(e.x, e.y, e.cor || '#88c', 2, 2); break;
      case 'derrete': cena.vfx.respingo(e.x, e.y, e.cor || '#88c', 8, 3); break;
      case 'estouro':
        cena.vfx.explosao(e.x, e.y, e.cor || '#88c', e.r || 1.2);
        if (e.grande) cena.respingarTela(e.x, e.y, e.cor || '#88c', e.r || 1.2);
        vibrar(30);
        break;
      case 'fusao': cena.vfx.brilho(e.x, e.y, '#fff8c0'); mesa.tocar('fusaoBolha', { combo: 3 }); break;
      case 'texto': cena.vfx.texto(e.x, e.y, T(e.chave, e.vars), e.cor || '#ffffff', e.escala || 1); break;
      case 'tremor': vibrar(60); break;
      case 'fim':
        if (e.vencedor) vibrar([20, 40, 20]);
        J.vistos++;
        salvar();
        break;
      case 'nivel':
        poki.measure('level', `${MOD.id}-${e.regra || J.regra}`, e.acao);
        break;
      default: break;
    }
  }
  ev.length = 0;
}

let tAuto = 0;
function autoJogar() { if (J.modo.bot) J.modo.bot(); }

function passo(dt) {
  J.t += dt;
  if (dep.auto) {
    tAuto += dt * 1000;
    if (tAuto >= dep.auto) { tAuto = 0; autoJogar(); }
  }
  J.modo.passo(dt);
  cena.passo(dt);
  tratarEventos();
}

let ultimoMs = performance.now();
function desenhar(dtReal) {
  cena.desenhar(J.modo, J.t);
  atualizarHud(false);
  if (dep.qualidade < 0 && qualidade.quadro(dtReal)) cena.definirQualidade(qualidade.nivel);
  if (dep.debug) {
    const agora = performance.now();
    $('debug').hidden = false;
    $('debug').textContent = `fps ${laco.medidas.fps.toFixed(0)} | passo ${laco.medidas.passoMs.toFixed(2)} ms | desenho ${laco.medidas.desenhoMs.toFixed(2)} ms | particulas ${J.modo.mundo.n} | ${cena.qualidade} | ${(agora - ultimoMs).toFixed(0)}`;
    ultimoMs = agora;
  }
}
const laco = criarLaco({ passo, desenhar });

// ------------------------------------------------------------------ HUD
let hudChave = '';
function montarSubmodos() {
  const el = $('submodos');
  el.textContent = '';
  for (const s of J.modo.submodos) {
    const b = document.createElement('button');
    b.textContent = T(s.id);
    b.dataset.id = s.id;
    if (s.id === J.regra) b.classList.add('ativo');
    b.addEventListener('click', () => {
      if (s.id === J.regra) return;
      J.regra = s.id;
      salvar();
      mesa.tocar('botao');
      novoModo();
    });
    el.appendChild(b);
  }
  $('dica').textContent = T(J.regra + '.dica');
  $('titulo').textContent = T('m' + idModelo);
  $('btnDois').textContent = J.dois ? '2P' : '1P';
  const extra = J.modo.botoes ? J.modo.botoes() : null;
  if (extra) el.appendChild(extra);
}

/** @param {boolean} forcar */
function atualizarHud(forcar) {
  const h = J.modo.hud();
  const nome = (/** @type {number} */ j) => (h.cpu[j] ? T('cpu') : J.dois ? T('jogador' + j) : T('voce'));
  let vez = '';
  if (h.resultado) {
    const v = h.resultado.vencedor;
    vez = !v ? T('empate') : J.dois ? T('venceu', { nome: nome(v) }) : h.cpu[v] ? T('vocPerdeu') : T('vocVenceu');
  } else if (h.texto) vez = T(h.texto, h.textoVars);
  else if (h.estado === 'vez') vez = h.cpu[h.vez] ? T('cpuPensa') : J.dois ? T('vezDe', { nome: nome(h.vez) }) : T('suaVez');
  const poderes = h.poderes || [];
  const dica = h.dica ? T(h.dica.chave, h.dica.vars) : T(J.regra + '.dica');
  const chave = [h.vez, h.placar[1], h.placar[2], vez, J.dois, h.estado, dica, JSON.stringify(poderes)].join('|');
  if (!forcar && chave === hudChave) return;
  hudChave = chave;
  $('dica').textContent = dica;
  montarPoderes(poderes, h.minhaVez);
  $('nome1').textContent = nome(1);
  $('nome2').textContent = nome(2);
  $('pts1').textContent = String(h.placar[1]);
  $('pts2').textContent = String(h.placar[2]);
  $('j1').classList.toggle('da-vez', !h.resultado && h.vez === 1);
  $('j2').classList.toggle('da-vez', !h.resultado && h.vez === 2);
  $('vez').textContent = vez;
}

/** Botoes dos poderes (Saga): toque usa (ou arma, quando precisa de alvo). @param {any[]} lista @param {boolean} pode */
function montarPoderes(lista, pode) {
  const el = $('poderes');
  el.textContent = '';
  for (const p of lista) {
    const b = document.createElement('button');
    b.textContent = T('pd.' + p.id);
    if (p.usado) b.classList.add('usado');
    if (p.armado) b.classList.add('armado');
    b.disabled = !!p.usado || !pode;
    b.addEventListener('click', () => { if (J.modo.poder(p.id)) mesa.tocar('botao'); atualizarHud(true); });
    el.appendChild(b);
  }
}

$('btnReiniciar').addEventListener('click', () => { mesa.tocar('botao'); J.modo.reiniciar(); atualizarHud(true); });
$('btnDois').addEventListener('click', () => { J.dois = !J.dois; mesa.tocar('botao'); novoModo(); });
$('btnSom').addEventListener('click', () => {
  audio.definirMudo(!audio.mudo);
  $('btnSom').classList.toggle('mudo', audio.mudo);
  armazem.gravar('prefs', { ...(armazem.ler('prefs', {}) || {}), mudo: audio.mudo });
});
$('btnSom').classList.toggle('mudo', audio.mudo);

// ------------------------------------------------------------------ entrada
function orientar() {
  document.body.dataset.orient = window.innerWidth > window.innerHeight * 1.1 ? 'paisagem' : 'retrato';
}
window.addEventListener('resize', orientar);
orientar();

criarEntrada(window, {
  ponteiro(fase, x, y, e) {
    const p = cena.paraMundo(x, y);
    if (!p) return;
    if (fase === 'baixo' && !J.jogou) { J.jogou = true; poki.gameplayStart(); }
    J.modo.apontar(p[0], p[1], fase, e.pointerId);
  },
  tecla(codigo, baixo) {
    if (baixo && !J.jogou && codigo !== 'Escape') { J.jogou = true; poki.gameplayStart(); }
    if (baixo && codigo === 'KeyR') { J.modo.reiniciar(); return; }
    J.modo.tecla(codigo, baixo);
  },
  multi: () => !!(J.modo.multi && J.modo.multi()),
});

// ------------------------------------------------------------------ filme (GIFs deterministicos)
function filmar(n, cada) {
  const r = $('area').getBoundingClientRect();
  const mx = 8;
  const rx = Math.max(0, r.left - mx);
  const ry = Math.max(0, r.top - mx);
  const rw = Math.min(window.innerWidth - rx, r.width + 2 * mx);
  const rh = Math.min(window.innerHeight - ry, r.height + 2 * mx);
  const tela = document.createElement('canvas');
  const esc = Math.min(1, 640 / Math.max(rw, rh));
  tela.width = Math.round(rw * esc);
  tela.height = Math.round(rh * esc);
  const ctx = /** @type {CanvasRenderingContext2D} */ (tela.getContext('2d'));
  const linhas = [];
  for (let q = 0; q < n; q++) {
    for (let k = 0; k < cada; k++) passo(PASSO);
    cena.desenhar(J.modo, J.t);
    for (const id of ['cFundo', 'cSlime', 'cTopo', 'cTela']) {
      const c = /** @type {HTMLCanvasElement} */ ($(id));
      const kk = c.width / window.innerWidth;
      ctx.drawImage(c, rx * kk, ry * kk, rw * kk, rh * kk, 0, 0, tela.width, tela.height);
    }
    linhas.push(tela.toDataURL('image/jpeg', 0.82));
  }
  const pre = $('filme');
  pre.textContent = linhas.join('\n');
  pre.hidden = false;
  document.title = 'FILME ' + n;
}

// ------------------------------------------------------------------ inicio
novoModo();
for (let k = 0; k < dep.passos; k++) passo(PASSO);
poki.init().then(() => poki.gameLoadingFinished());
const carregando = $('carregando');
if (carregando) carregando.remove();
if (dep.ganchos) /** @type {any} */ (window).__velha = { J, cena, get laco() { return laco; }, avancar: (n) => { for (let k = 0; k < n; k++) passo(PASSO); cena.desenhar(J.modo, J.t); } };
if (dep.filme) {
  requestAnimationFrame(() => filmar(dep.filme, dep.cada));
} else {
  laco.iniciar();
}
