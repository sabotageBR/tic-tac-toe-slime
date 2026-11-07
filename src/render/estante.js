// Desenho da estante de nichos (o "#" do jogo da velha no caderno): o fundo de vidro de cada nicho,
// o realce da casa sob o dedo, as paredes rabiscadas (fundo.js desenharPote), o bico no teto de cada
// nicho e, por cima do slime, a linha da vitoria riscada de caneta e os extras de cada modelo.

import { aplicar } from './camera.js';
import { desenharPote, TINTA } from './fundo.js';

const COR_VEZ = { 1: 'rgba(40, 120, 230, ', 2: 'rgba(245, 130, 30, ', 0: 'rgba(110, 115, 130, ' };
const CANETA = { 1: '#1f6fd6', 2: '#e8691a', 0: '#555b66' };

/**
 * Paredes do mundo com o tremor aplicado (as que nao sao ocultas).
 * @param {any} m
 */
function paredesVisiveis(m) {
  const out = [];
  for (const p of m.paredes) {
    if (p.oculta) continue;
    out.push({ ax: p.ax + p.tx, ay: p.ay + p.ty, bx: p.bx + p.tx, by: p.by + p.ty, r: p.r });
  }
  return out;
}

/**
 * Fundo: vidro dos nichos, realce e paredes.
 * @param {CanvasRenderingContext2D} ctx @param {any} cam @param {number} dpr
 * @param {any} est estante (src/jogo/estante.js) @param {any} m mundo @param {any} vis visual() do modo @param {number} t
 */
export function desenharEstante(ctx, cam, dpr, est, m, vis, t) {
  aplicar(ctx, cam, dpr);
  // vidro de cada nicho (bem leve) e a casa realcada / as casas marcadas pelo modelo
  for (const C of est.celulas) {
    const marca = vis.marcas && vis.marcas[C.i];
    ctx.fillStyle = marca ? marca : 'rgba(170, 215, 240, 0.16)';
    ctx.fillRect(C.x0, C.y0, C.x1 - C.x0, C.y1 - C.y0);
  }
  if (vis.realce >= 0 && est.celulas[vis.realce]) {
    const C = est.celulas[vis.realce];
    const pulso = 0.16 + 0.08 * Math.sin(t * 6);
    ctx.fillStyle = (COR_VEZ[vis.corVez] || COR_VEZ[0]) + pulso + ')';
    ctx.fillRect(C.x0, C.y0, C.x1 - C.x0, C.y1 - C.y0);
  }
  if (vis.permitidas) {
    // casas onde a jogada vale (mini ativo da Mega, destinos do Engole)
    ctx.save();
    ctx.setLineDash([0.25, 0.2]);
    ctx.lineWidth = 0.08;
    ctx.strokeStyle = (COR_VEZ[vis.corVez] || COR_VEZ[0]) + '0.75)';
    for (const i of vis.permitidas) {
      const C = est.celulas[i];
      if (!C) continue;
      ctx.strokeRect(C.x0 + 0.12, C.y0 + 0.12, C.x1 - C.x0 - 0.24, C.y1 - C.y0 - 0.24);
    }
    ctx.restore();
  }
  desenharPote(ctx, cam, dpr, paredesVisiveis(m));
  // bico no teto de cada nicho (de onde a gota pinga)
  aplicar(ctx, cam, dpr);
  ctx.lineWidth = 0.06;
  ctx.strokeStyle = TINTA;
  for (const C of est.celulas) {
    if (vis.semBico) break;
    const x = C.cx;
    const y = C.y1;
    const w = Math.min(0.32, (C.x1 - C.x0) * 0.08);
    ctx.fillStyle = vis.realce === C.i ? '#ffffff' : '#e9eef3';
    ctx.beginPath();
    ctx.moveTo(x - w, y + 0.02);
    ctx.lineTo(x - w * 0.45, y - w * 1.1);
    ctx.lineTo(x + w * 0.45, y - w * 1.1);
    ctx.lineTo(x + w, y + 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Por cima do slime: linha da vitoria, cursor/selecao e textos curtos nas casas.
 * @param {CanvasRenderingContext2D} ctx @param {any} cam @param {number} dpr
 * @param {any} est @param {any} vis @param {number} t
 */
export function desenharEstanteTopo(ctx, cam, dpr, est, vis, t) {
  aplicar(ctx, cam, dpr);
  if (vis.selecao !== undefined && vis.selecao >= 0 && est.celulas[vis.selecao]) {
    const C = est.celulas[vis.selecao];
    ctx.save();
    ctx.lineWidth = 0.14;
    ctx.strokeStyle = (COR_VEZ[vis.corVez] || COR_VEZ[0]) + (0.65 + 0.3 * Math.sin(t * 8)) + ')';
    ctx.strokeRect(C.x0 + 0.1, C.y0 + 0.1, C.x1 - C.x0 - 0.2, C.y1 - C.y0 - 0.2);
    ctx.restore();
  }
  if (vis.linha) {
    const cs = vis.linha.casas.map((i) => est.celulas[i]).filter(Boolean);
    if (cs.length >= 2) {
      const a = cs[0];
      const b = cs[cs.length - 1];
      // estende meio nicho para fora nas duas pontas, como o risco de caneta no caderno
      const dx = b.cx - a.cx;
      const dy = b.cy - a.cy;
      const L = Math.hypot(dx, dy) || 1;
      const ext = (a.x1 - a.x0) * 0.42;
      const ux = dx / L;
      const uy = dy / L;
      const prog = Math.min(1, (vis.linha.t === undefined ? 1 : vis.linha.t) / 0.35);
      const x0 = a.cx - ux * ext;
      const y0 = a.cy - uy * ext;
      const x1 = x0 + (b.cx + ux * ext - x0) * prog;
      const y1 = y0 + (b.cy + uy * ext - y0) * prog;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = CANETA[vis.linha.jogador] || TINTA;
      ctx.lineWidth = 0.34;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (vis.rotulos) {
    ctx.save();
    for (const r of vis.rotulos) {
      const C = est.celulas[r.casa];
      if (!C) continue;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const [sx, sy] = [cam.sx + (C.cx - cam.cx) * cam.s, cam.sy - ((r.y !== undefined ? r.y : C.y1 - 0.5) - cam.cy) * cam.s];
      ctx.font = `700 ${Math.max(11, Math.min(22, cam.s * 0.55)) * dpr}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.fillStyle = r.cor || TINTA;
      ctx.strokeText(r.texto, sx * dpr, sy * dpr);
      ctx.fillText(r.texto, sx * dpr, sy * dpr);
    }
    ctx.restore();
  }
}
