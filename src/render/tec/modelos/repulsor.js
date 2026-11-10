// Desenho do Modelo 11, Repulsor: placas de levitacao magnetica, pecas que flutuam (disco com o X
// ou O no miolo e um anel de campo girando), o pulso em cruz que empurra (ou puxa, no Atrator) e a
// previa com as setas de para onde cada vizinha vai.

import { CORES, brilho, neon, anel, marca, chanfrado, mira, rgba } from '../kit.js';
import { desenharFeixe } from './classico.js';

/** Seta neon de (x0, y0) a (x1, y1). */
function seta(ctx, x0, y0, x1, y1, cor, alfa, larg = 0.07) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const p = 0.3;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.moveTo(x1 - ux * p - uy * p * 0.6, y1 - uy * p + ux * p * 0.6);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - ux * p + uy * p * 0.6, y1 - uy * p - ux * p * 0.6);
  neon(ctx, cor, larg, alfa);
}

export const desenhoRepulsor = {
  /** @param {any} g */
  fundo(g) {
    const { ctx, geo, tema, t, vivo } = g;
    for (const C of geo.celulas) {
      const f = geo.vao * 0.06;
      chanfrado(ctx, C.x0 + f, C.y0 + f, C.x1 - f, C.y1 - f, geo.vao * 0.12);
      ctx.fillStyle = 'rgba(6,16,16,0.7)';
      ctx.fill();
      neon(ctx, tema.acento, 0.035, 0.38 * vivo, false);
      // bobina da placa: dois aneis finos que respiram
      const p = 0.5 + 0.5 * Math.sin(t * 2 + C.i);
      ctx.beginPath();
      ctx.arc(C.cx, C.cy, geo.vao * 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(tema.acento, 0.1 + 0.08 * p);
      ctx.lineWidth = 0.03;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(C.cx, C.cy, geo.vao * 0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  /** @param {any} g */
  topo(g) {
    const { ctx, geo, palco, vis, t, vivo } = g;
    const cel = geo.celulas;
    const v = geo.vao;
    // previa: mira, fantasma e as setas do campo
    if (vis.previa) {
      const C = cel[vis.previa.casa];
      mira(ctx, C, CORES[vis.corVez], t, v * 0.1);
      marca(ctx, C.cx, C.cy, v * 0.2, vis.corVez, 0.25, v * 0.04);
      const anda = (t * 1.6) % 1;
      for (const m of vis.previa.movs) {
        const D = cel[m.de];
        const x1 = D.cx + m.dc * v * (m.fora ? 0.8 : 1);
        const y1 = D.cy - m.dr * v * (m.fora ? 0.8 : 1);
        seta(ctx, D.cx + m.dc * v * 0.3, D.cy - m.dr * v * 0.3, x1, y1, m.fora ? '#ffffff' : CORES[m.jogador], 0.55 + 0.35 * Math.sin(t * 9));
        brilho(ctx, D.cx + (x1 - D.cx) * anda, D.cy + (y1 - D.cy) * anda, v * 0.16, CORES[m.jogador], 0.8);
      }
    }
    // pulso do campo: anel e os quatro feixes em cruz
    const P = palco.pulso;
    if (P) {
      const k = P.puxa ? 1 - P.k : P.k;
      const cor = CORES[P.j];
      anel(ctx, P.x, P.y, v * (0.3 + 1.4 * k), cor, 0.09, 1 - P.k);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.beginPath();
        ctx.moveTo(P.x + dx * v * (0.3 + 1.1 * k), P.y + dy * v * (0.3 + 1.1 * k));
        ctx.lineTo(P.x + dx * v * (0.6 + 1.3 * k), P.y + dy * v * (0.6 + 1.3 * k));
        neon(ctx, cor, 0.12, 1 - P.k);
      }
    }
    const res = vis.linha;
    for (const p of palco.pecas.values()) {
      const venceu = res && res.casas.includes(p.casa) && p.jogador === res.jogador;
      const a = p.alfa * (res && !venceu ? 0.45 : 1) * (p.dados.some === undefined ? vivo : 1);
      const cor = CORES[p.jogador];
      const flutua = Math.sin(t * 2.6 + Number(p.id) * 1.7) * v * 0.025;
      const y = p.y + flutua;
      const r = v * 0.34 * p.esc * (venceu ? 1 + 0.07 * Math.sin(t * 12) : 1);
      // sombra de luz na placa e o disco
      brilho(ctx, p.x, p.y - v * 0.1, r * 1.9, cor, 0.28 * a);
      ctx.beginPath();
      ctx.arc(p.x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(cor, 0.12 * a);
      ctx.fill();
      neon(ctx, cor, v * 0.035, a);
      // campo: dois arcos que giram
      const an = t * 2.2 + Number(p.id);
      anel(ctx, p.x, y, r * 1.22, cor, v * 0.022, 0.6 * a, an, an + 1.3);
      anel(ctx, p.x, y, r * 1.22, cor, v * 0.022, 0.6 * a, an + Math.PI, an + Math.PI + 1.3);
      marca(ctx, p.x, y, r * 0.58, p.jogador, a, v * 0.04);
    }
    desenharFeixe(g);
  },
};
