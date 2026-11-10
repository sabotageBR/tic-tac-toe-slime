// Kit de desenho da Serie Tech (Canvas 2D): cores, traco neon em camadas, brilho por sprite em
// cache (nada de shadowBlur no quadro: e caro no celular), texto em px por cima da camera e ruido
// por hash (o desenho nao sorteia: o filme e os prints sao deterministicos).
// As funcoes de traco e de forma esperam o contexto ja com a camera aplicada (unidades do mundo).

import { paraTela } from '../camera.js';

/** Jogador 1 ciano, jogador 2 magenta; 0 = neutro. */
export const CORES = { 0: '#7f93b8', 1: '#2fe6ff', 2: '#ff45dc' };
export const CLARAS = { 0: '#dfe8ff', 1: '#d6fbff', 2: '#ffd9f8' };
export const FONTE = "ui-monospace, 'SF Mono', 'Cascadia Mono', 'Roboto Mono', Menlo, Consolas, monospace";

/** @param {number} n @returns {number} 0..1 */
export function ruido(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** @param {string} hex '#rrggbb' @param {number} a */
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** @type {Map<string, HTMLCanvasElement>} */
const SPRITES = new Map();

/** Sprite de brilho radial (64 px) da cor. @param {string} cor */
function sprite(cor) {
  let c = SPRITES.get(cor);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const x = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(cor, 0.9));
  g.addColorStop(0.25, rgba(cor, 0.42));
  g.addColorStop(0.6, rgba(cor, 0.1));
  g.addColorStop(1, rgba(cor, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  SPRITES.set(cor, c);
  return c;
}

/**
 * Halo de luz (aditivo) centrado em (x, y) com raio r.
 * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {string} cor @param {number} [alfa]
 */
export function brilho(ctx, x, y, r, cor, alfa = 1) {
  if (alfa <= 0.003 || r <= 0) return;
  const op = ctx.globalCompositeOperation;
  const a = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alfa);
  ctx.drawImage(sprite(cor), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = op;
}

/**
 * Traco neon do caminho atual: halo largo, halo medio, a cor e o miolo branco.
 * @param {CanvasRenderingContext2D} ctx @param {string} cor @param {number} larg largura do traco (u)
 * @param {number} [alfa] @param {boolean} [miolo]
 */
export function neon(ctx, cor, larg, alfa = 1, miolo = true) {
  if (alfa <= 0.003) return;
  const op = ctx.globalCompositeOperation;
  const a0 = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = cor;
  ctx.globalAlpha = 0.09 * alfa;
  ctx.lineWidth = larg * 6;
  ctx.stroke();
  ctx.globalAlpha = 0.24 * alfa;
  ctx.lineWidth = larg * 2.6;
  ctx.stroke();
  ctx.globalAlpha = Math.min(1, alfa);
  ctx.lineWidth = larg;
  ctx.stroke();
  if (miolo) {
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.7 * Math.min(1, alfa);
    ctx.lineWidth = larg * 0.36;
    ctx.stroke();
  }
  ctx.globalAlpha = a0;
  ctx.globalCompositeOperation = op;
}

/** Traco fino sem halo (grades de fundo). */
export function fio(ctx, cor, larg, alfa = 1) {
  const a0 = ctx.globalAlpha;
  ctx.strokeStyle = cor;
  ctx.globalAlpha = alfa;
  ctx.lineWidth = larg;
  ctx.stroke();
  ctx.globalAlpha = a0;
}

/**
 * Segmento neon.
 * @param {CanvasRenderingContext2D} ctx
 */
export function linha(ctx, x0, y0, x1, y1, cor, larg, alfa = 1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  neon(ctx, cor, larg, alfa);
}

/** Anel (ou arco de a0 a a1) neon. */
export function anel(ctx, x, y, r, cor, larg, alfa = 1, a0 = 0, a1 = Math.PI * 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1);
  neon(ctx, cor, larg, alfa);
}

/** Poligono regular (caminho). */
export function poligono(ctx, x, y, r, lados, rot = 0) {
  ctx.beginPath();
  for (let k = 0; k < lados; k++) {
    const a = rot + (k / lados) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (k) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** Retangulo de cantos chanfrados (caminho). */
export function chanfrado(ctx, x0, y0, x1, y1, c) {
  ctx.beginPath();
  ctx.moveTo(x0 + c, y0);
  ctx.lineTo(x1 - c, y0);
  ctx.lineTo(x1, y0 + c);
  ctx.lineTo(x1, y1 - c);
  ctx.lineTo(x1 - c, y1);
  ctx.lineTo(x0 + c, y1);
  ctx.lineTo(x0, y1 - c);
  ctx.lineTo(x0, y0 + c);
  ctx.closePath();
}

/**
 * Marca X (jogador 1) ou O (jogador 2) em neon, do tamanho r, com a entrada animada por `esc`.
 * @param {CanvasRenderingContext2D} ctx
 */
export function marca(ctx, x, y, r, jogador, alfa = 1, larg = 0.13) {
  const cor = CORES[jogador] || CORES[0];
  if (jogador === 1) {
    const d = r * 0.72;
    ctx.beginPath();
    ctx.moveTo(x - d, y - d);
    ctx.lineTo(x + d, y + d);
    ctx.moveTo(x - d, y + d);
    ctx.lineTo(x + d, y - d);
    neon(ctx, cor, larg, alfa);
  } else {
    anel(ctx, x, y, r * 0.8, cor, larg, alfa);
  }
}

/**
 * Texto em px da tela numa posicao do mundo (a camera vira o y; o texto nao).
 * @param {CanvasRenderingContext2D} ctx @param {import('../camera.js').Camera} cam @param {number} dpr
 * @param {number} x @param {number} y @param {string} txt @param {number} tam altura em u
 * @param {string} cor @param {{ alfa?: number, alinhar?: CanvasTextAlign, peso?: number, halo?: boolean }} [o]
 */
export function texto(ctx, cam, dpr, x, y, txt, tam, cor, o = {}) {
  const [px, py] = paraTela(cam, x, y);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `${o.peso || 700} ${Math.max(6, tam * cam.s)}px ${FONTE}`;
  ctx.textAlign = o.alinhar || 'center';
  ctx.textBaseline = 'middle';
  const a = o.alfa === undefined ? 1 : o.alfa;
  if (o.halo !== false) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 * a;
    ctx.fillStyle = cor;
    for (const [dx, dy] of [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5]]) ctx.fillText(txt, px + dx, py + dy);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a;
  ctx.fillStyle = o.halo === false ? cor : '#ffffff';
  ctx.fillText(txt, px, py);
  ctx.restore();
}

/**
 * Grade do tabuleiro em neon (as divisorias internas e a moldura de cantos chanfrados).
 * @param {CanvasRenderingContext2D} ctx @param {any} geo @param {string} cor @param {number} [alfa]
 */
export function gradeNeon(ctx, geo, cor, alfa = 1, moldura = true) {
  const [x0, y0, x1, y1] = geo.caixa;
  const m = geo.vao * 0.08;
  ctx.beginPath();
  for (let c = 1; c < geo.cols; c++) {
    ctx.moveTo(x0 + c * geo.vao, y0 + m);
    ctx.lineTo(x0 + c * geo.vao, y1 - m);
  }
  for (let r = 1; r < geo.rows; r++) {
    ctx.moveTo(x0 + m, y0 + r * geo.vao);
    ctx.lineTo(x1 - m, y0 + r * geo.vao);
  }
  neon(ctx, cor, 0.07, alfa);
  if (moldura) {
    chanfrado(ctx, x0 - 0.12, y0 - 0.12, x1 + 0.12, y1 + 0.12, geo.vao * 0.16);
    neon(ctx, cor, 0.045, alfa * 0.55, false);
  }
}

/**
 * Realce da casa sob o dedo (cantoneiras pulsando na cor de quem joga).
 * @param {CanvasRenderingContext2D} ctx @param {any} C celula @param {string} cor @param {number} t
 */
export function mira(ctx, C, cor, t, folga = 0.22) {
  const p = 0.5 + 0.5 * Math.sin(t * 7);
  const f = folga - p * 0.05;
  const l = (C.x1 - C.x0) * 0.2;
  const x0 = C.x0 + f;
  const x1 = C.x1 - f;
  const y0 = C.y0 + f;
  const y1 = C.y1 - f;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + l); ctx.lineTo(x0, y0); ctx.lineTo(x0 + l, y0);
  ctx.moveTo(x1 - l, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + l);
  ctx.moveTo(x1, y1 - l); ctx.lineTo(x1, y1); ctx.lineTo(x1 - l, y1);
  ctx.moveTo(x0 + l, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - l);
  neon(ctx, cor, 0.06, 0.65 + p * 0.35);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(cor, 0.07 + p * 0.05);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Feixe da vitoria: atravessa os pontos, cresce do primeiro ao ultimo e pulsa.
 * @param {CanvasRenderingContext2D} ctx @param {number[][]} pontos @param {number} jogador @param {number} tFim s desde o fim
 */
export function feixe(ctx, pontos, jogador, tFim, t) {
  if (pontos.length < 2) return;
  const cor = CORES[jogador] || CORES[0];
  const k = Math.min(1, tFim / 0.35);
  const [ax, ay] = pontos[0];
  const [bx, by] = pontos[pontos.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const e = 0.9;
  const x0 = ax - (dx / d) * e;
  const y0 = ay - (dy / d) * e;
  const x1 = x0 + (dx + (dx / d) * e * 2) * k;
  const y1 = y0 + (dy + (dy / d) * e * 2) * k;
  const p = 0.75 + 0.25 * Math.sin(t * 14);
  linha(ctx, x0, y0, x1, y1, cor, 0.22 * p, 1);
  linha(ctx, x0, y0, x1, y1, '#ffffff', 0.07, 0.9);
  for (const [px, py] of pontos) brilho(ctx, px, py, 1.5 * p, cor, 0.5 * k);
  brilho(ctx, x1, y1, 1.1, '#ffffff', 0.8 * (1 - k) + 0.15);
}
