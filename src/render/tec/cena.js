// A cena da Serie Tech: Canvas 2D em duas camadas (fundo tematico + tabuleiro | pecas + efeitos),
// a mesma camera que enquadra a janela do modo dentro da #area do HUD e a mesma interface publica
// da cena do slime no que o main.js usa (desenhar, passo, paraMundo, vfx, definirQualidade).
// O canvas do slime (WebGL) nao e usado aqui: fica 1x1 e nunca ganha contexto.
// Nada desenha com canvas 0x0.

import { enquadrar, paraMundo, paraTela, aplicar, deslocada } from '../camera.js';
import { criarVfxTec } from './vfx.js';
import { criarFundo, temaDe } from './fundo.js';
import { DESENHOS_TEC } from './modelos/index.js';

/** So o dpr muda: o desenho e leve (tracos e sprites). */
export const QUALIDADES_TEC = [
  { nome: 'alta', dpr: 2 },
  { nome: 'media', dpr: 1.5 },
  { nome: 'baixa', dpr: 1 },
  { nome: 'minima', dpr: 1 },
];

/**
 * @param {{ fundo: HTMLCanvasElement, slime: HTMLCanvasElement, topo: HTMLCanvasElement, area: HTMLElement, tela?: HTMLCanvasElement|null }} el
 * @param {{ zoom?: number[]|null }} [o]
 */
export function criarCenaTec(el, o = {}) {
  const ctxFundo = /** @type {CanvasRenderingContext2D} */ (el.fundo.getContext('2d'));
  const ctxTopo = /** @type {CanvasRenderingContext2D} */ (el.topo.getContext('2d'));
  el.slime.width = 1;
  el.slime.height = 1;
  if (el.tela) { el.tela.width = 1; el.tela.height = 1; }
  const vfx = criarVfxTec();
  const fundo = criarFundo();
  let qual = 0;
  let W = 0;
  let H = 0;
  let dpr = 1;
  /** @type {import('../camera.js').Camera|null} */
  let cam = null;

  function medir(janela) {
    W = Math.max(0, window.innerWidth | 0);
    H = Math.max(0, window.innerHeight | 0);
    dpr = Math.min(QUALIDADES_TEC[qual].dpr, window.devicePixelRatio || 1);
    for (const c of [el.fundo, el.topo]) {
      const w = Math.max(1, Math.round(W * dpr));
      const h = Math.max(1, Math.round(H * dpr));
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
    }
    const r = el.area.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) cam = enquadrar(janela, { x: r.left, y: r.top, w: r.width, h: r.height });
  }

  /** @param {any} modo @param {number} t */
  function desenhar(modo, t) {
    medir(o.zoom && o.zoom.length === 4 ? o.zoom : modo.janela);
    if (!cam || W < 2 || H < 2) return;
    const vis = modo.visual ? modo.visual() : {};
    const D = DESENHOS_TEC[modo.regra === 'classico' ? 'classico' : modo.id] || DESENHOS_TEC.classico;
    const tema = temaDe(modo.id, modo.regra);
    const [tx, ty] = vfx.tremor;
    const cq = deslocada(cam, tx, ty);
    const g = { ctx: ctxFundo, cam: cq, dpr, t, modo, vis, palco: modo.palco, geo: modo.tabuleiro, W, H, tema, vivo: 1 - (modo.palco ? modo.palco.apagar : 0) };
    // fundo e tabuleiro
    fundo.desenhar(ctxFundo, tema, W, H, dpr, cam.sx, cam.sy, t);
    aplicar(ctxFundo, cq, dpr);
    if (D.fundo) D.fundo(g);
    // pecas e efeitos
    ctxTopo.setTransform(1, 0, 0, 1, 0, 0);
    ctxTopo.clearRect(0, 0, el.topo.width, el.topo.height);
    aplicar(ctxTopo, cq, dpr);
    g.ctx = ctxTopo;
    if (D.topo) D.topo(g);
    ctxTopo.globalAlpha = 1;
    ctxTopo.globalCompositeOperation = 'source-over';
    vfx.desenhar(ctxTopo, cq, dpr, t);
    vfx.desenharGlitch(ctxTopo, W, H, dpr, t);
  }

  return {
    desenhar,
    vfx,
    definirAparencias() {},
    /** @param {number} dt */
    passo(dt) { vfx.passo(dt); },
    /** No tech a "gosma na tela" vira uma explosao de faiscas. */
    respingarTela(x, y, cor, r) { vfx.explosao(x, y, cor, r); },
    set origemMissil(_f) { /* sem missil */ },
    paraMundo(px, py) { return cam ? paraMundo(cam, px, py) : null; },
    paraTela(x, y) { return cam ? paraTela(cam, x, y) : null; },
    get camera() { return cam; },
    get qualidade() { return QUALIDADES_TEC[qual].nome; },
    get usaGl() { return false; },
    definirVisual() {},
    get visual() { return {}; },
    /** @param {number} k */
    definirQualidade(k) { qual = Math.max(0, Math.min(QUALIDADES_TEC.length - 1, k)); },
    get nivelQualidade() { return qual; },
  };
}
