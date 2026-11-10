// Desenho do Modelo 10, Orbita: a estacao (anel externo com marcas, grade de baias) gira de verdade
// 90 graus a cada lance, com as pecas presas nela; o chao (para onde tudo cai) fica parado embaixo,
// com as setas da gravidade. Os modulos sao hexagonos com o X ou O no miolo.

import { CORES, brilho, neon, anel, marca, poligono, rgba, linha } from '../kit.js';
import { desenharFeixe } from './classico.js';

export const desenhoOrbita = {
  /** @param {any} g */
  fundo(g) {
    const { ctx, geo, palco, tema, t, vivo } = g;
    const [x0, y0, x1, y1] = geo.caixa;
    const v = geo.vao;
    const R = x1 * 1.42 + 0.12;
    const ang = (palco.angulo || 0) - (palco.giros || 0) * Math.PI * 0.5;
    // anel da estacao com marcas (gira junto e guarda os giros ja dados)
    anel(ctx, 0, 0, R, tema.acento, 0.05, 0.5 * vivo);
    ctx.beginPath();
    for (let k = 0; k < 24; k++) {
      const a = ang + (k / 24) * Math.PI * 2;
      const r0 = R - (k % 6 === 0 ? 0.45 : 0.18);
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    neon(ctx, tema.acento, 0.04, 0.6 * vivo, false);
    // propulsores acesos durante o giro
    if (palco.angulo) {
      for (let k = 0; k < 4; k++) {
        const a = ang + k * Math.PI * 0.5 + 0.2;
        brilho(ctx, Math.cos(a) * R, Math.sin(a) * R, 0.9, '#ffd9a0', 0.9);
        brilho(ctx, Math.cos(a + 0.12) * R, Math.sin(a + 0.12) * R, 0.6, '#ff8a3a', 0.8);
      }
    }
    // o chao parado e as setas da gravidade
    const p = (t * 0.9) % 1;
    for (let c = 0; c < geo.cols; c++) {
      const x = x0 + (c + 0.5) * v;
      const y = y0 - 0.28 - p * 0.3;
      ctx.beginPath();
      ctx.moveTo(x - 0.16, y + 0.14);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 0.16, y + 0.14);
      neon(ctx, tema.acento, 0.035, 0.5 * (1 - p), false);
    }
    linha(ctx, x0 - 0.1, y0 - 0.12, x1 + 0.1, y0 - 0.12, tema.acento, 0.07, 0.9 * vivo);
    // as baias giram com a estacao
    ctx.save();
    ctx.rotate(palco.angulo || 0);
    for (const C of geo.celulas) {
      const f = v * 0.05;
      ctx.beginPath();
      ctx.rect(C.x0 + f, C.y0 + f, v - 2 * f, v - 2 * f);
      ctx.fillStyle = 'rgba(6,10,26,0.62)';
      ctx.fill();
      neon(ctx, tema.acento, 0.03, 0.34 * vivo, false);
    }
    ctx.beginPath();
    ctx.rect(x0 - 0.08, y0 - 0.08, x1 - x0 + 0.16, y1 - y0 + 0.16);
    neon(ctx, tema.acento, 0.05, 0.7 * vivo, false);
    ctx.restore();
  },
  /** @param {any} g */
  topo(g) {
    const { ctx, geo, palco, vis, t, vivo } = g;
    const cel = geo.celulas;
    const v = geo.vao;
    // coluna sob o dedo: faixa de luz e o modulo fantasma onde ele vai pousar
    if (vis.coluna && !palco.angulo) {
      const cor = CORES[vis.corVez];
      const C0 = cel[vis.coluna.col];
      const P = cel[vis.coluna.pouso];
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(cor, 0.07 + 0.03 * Math.sin(t * 7));
      ctx.fillRect(C0.x0, geo.caixa[1], v, geo.caixa[3] - geo.caixa[1]);
      ctx.globalCompositeOperation = 'source-over';
      poligono(ctx, P.cx, P.cy, v * 0.36, 6, Math.PI / 6);
      neon(ctx, cor, v * 0.03, 0.4 + 0.2 * Math.sin(t * 7));
      const y = geo.caixa[3] + v * 0.45 + Math.sin(t * 6) * 0.08;
      ctx.beginPath();
      ctx.moveTo(C0.cx - 0.25, y + 0.2);
      ctx.lineTo(C0.cx, y - 0.1);
      ctx.lineTo(C0.cx + 0.25, y + 0.2);
      neon(ctx, cor, 0.07, 0.9);
    }
    ctx.save();
    ctx.rotate(palco.angulo || 0);
    const res = vis.linha;
    for (const p of palco.pecas.values()) {
      const venceu = res && res.casas.includes(p.casa) && p.jogador === res.jogador;
      const a = p.alfa * (res && !venceu ? 0.45 : 1) * (p.dados.some === undefined ? vivo : 1);
      const cor = CORES[p.jogador];
      const r = v * 0.38 * p.esc * (venceu ? 1 + 0.06 * Math.sin(t * 12) : 1);
      brilho(ctx, p.x, p.y, r * 1.9, cor, 0.26 * a);
      poligono(ctx, p.x, p.y, r, 6, Math.PI / 6);
      ctx.fillStyle = rgba(cor, 0.13 * a);
      ctx.fill();
      neon(ctx, cor, v * 0.035, a);
      // o miolo fica em pe enquanto a estacao gira
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-(palco.angulo || 0));
      marca(ctx, 0, 0, r * 0.52, p.jogador, a, v * 0.04);
      ctx.restore();
    }
    ctx.restore();
    if (!palco.angulo) desenharFeixe(g);
  },
};
