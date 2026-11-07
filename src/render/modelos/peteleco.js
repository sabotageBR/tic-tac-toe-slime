// Desenho do Modelo 2 (Peteleco): a mesa vista de cima (tampo de papel-cartao com o # rabiscado),
// a cor de quem e dono de cada casa, os trilhos de lancamento (azul embaixo, laranja em cima) com os
// lances que faltam, a seta da mira (direcao e forca), o vento e a contagem do "Ja!" do Caos.

import { aplicar } from '../camera.js';
import { TINTA } from '../fundo.js';

const COR = { 1: '#2f7fe0', 2: '#f2862a' };
const TINTE = { 1: 'rgba(47,127,224,0.2)', 2: 'rgba(242,134,42,0.22)' };

/** @param {any} modo */
export function desenhoPeteleco(modo) {
  const { CASA, MEIA, trilhoY } = modo.mesa;
  return {
    fundo(ctx, cam, dpr, t, vis) {
      aplicar(ctx, cam, dpr);
      // sombra e tampo
      ctx.fillStyle = 'rgba(23,22,28,0.12)';
      ctx.fillRect(-MEIA - 0.3, -MEIA - 0.55, 2 * MEIA + 0.9, 2 * MEIA + 0.6);
      ctx.fillStyle = '#fbf7ec';
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 0.14;
      ctx.fillRect(-MEIA, -MEIA, 2 * MEIA, 2 * MEIA);
      ctx.strokeRect(-MEIA, -MEIA, 2 * MEIA, 2 * MEIA);
      // dono de cada casa
      for (let i = 0; i < 9; i++) {
        const d = vis.donos && vis.donos[i];
        const c = i % 3;
        const r = (i / 3) | 0;
        const x0 = -MEIA + c * CASA;
        const y1 = MEIA - r * CASA;
        if (d) {
          ctx.fillStyle = TINTE[/** @type {1|2} */ (d)];
          ctx.fillRect(x0 + 0.08, y1 - CASA + 0.08, CASA - 0.16, CASA - 0.16);
        }
        if (vis.realce === i) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillRect(x0 + 0.1, y1 - CASA + 0.1, CASA - 0.2, CASA - 0.2);
        }
      }
      // o # de caneta grossa
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(23,22,28,0.75)';
      ctx.lineWidth = 0.2;
      ctx.beginPath();
      for (const k of [-0.5, 0.5]) {
        ctx.moveTo(k * CASA + 0.05, -MEIA + 0.35);
        ctx.lineTo(k * CASA - 0.05, MEIA - 0.35);
        ctx.moveTo(-MEIA + 0.35, k * CASA - 0.04);
        ctx.lineTo(MEIA - 0.35, k * CASA + 0.04);
      }
      ctx.stroke();
      ctx.restore();
      // trilhos e lances que faltam
      for (const j of [1, 2]) {
        const y = trilhoY(j);
        ctx.fillStyle = vis.corVez === j && vis.estado === 'vez' ? COR[j] : 'rgba(23,22,28,0.18)';
        ctx.globalAlpha = vis.corVez === j && vis.estado === 'vez' ? 0.35 + 0.15 * Math.sin(t * 6) : 1;
        ctx.fillRect(-MEIA + 0.6, y - 0.45, 2 * MEIA - 1.2, 0.9);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = TINTA;
        ctx.lineWidth = 0.08;
        ctx.strokeRect(-MEIA + 0.6, y - 0.45, 2 * MEIA - 1.2, 0.9);
        const falta = Math.max(0, 5 - ((vis.lances && vis.lances[j]) || 0));
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.arc(MEIA + 0.55, y + (j === 1 ? -1 : 1) * (k * 0.55 - 1.1), 0.2, 0, Math.PI * 2);
          ctx.fillStyle = k < falta ? COR[j] : 'rgba(23,22,28,0.12)';
          ctx.fill();
          ctx.lineWidth = 0.05;
          ctx.stroke();
        }
      }
      // vento: setas que andam
      if (vis.vento) {
        ctx.save();
        ctx.strokeStyle = 'rgba(60,150,220,0.55)';
        ctx.lineWidth = 0.12;
        ctx.lineCap = 'round';
        const dx = vis.vento > 0 ? 1 : -1;
        for (let k = 0; k < 4; k++) {
          const y = -MEIA + 1.2 + k * 3.2;
          const x = ((((t * 2.5 * dx + k * 1.7) % (2 * MEIA)) + 2 * MEIA) % (2 * MEIA)) - MEIA;
          ctx.beginPath();
          ctx.moveTo(x - dx * 0.9, y);
          ctx.lineTo(x, y);
          ctx.lineTo(x - dx * 0.35, y + 0.3);
          ctx.moveTo(x, y);
          ctx.lineTo(x - dx * 0.35, y - 0.3);
          ctx.stroke();
        }
        ctx.restore();
      }
    },
    topo(ctx, cam, dpr, t, vis) {
      aplicar(ctx, cam, dpr);
      // a mira: do ponto do trilho, para onde o slime vai, comprimento = forca
      for (const mi of vis.miras || []) {
        const vx = (mi.x0 - mi.px) * 3.2;
        const vy = (mi.y0 - mi.py) * 3.2;
        const v = Math.sqrt(vx * vx + vy * vy);
        if (v < 0.5) continue;
        const L = Math.min(24, v) * 0.28;
        const ux = vx / v;
        const uy = vy / v;
        ctx.save();
        ctx.setLineDash([0.3, 0.22]);
        ctx.strokeStyle = COR[/** @type {1|2} */ (mi.j)];
        ctx.lineWidth = 0.16;
        ctx.beginPath();
        ctx.moveTo(mi.x0, mi.y0);
        ctx.lineTo(mi.x0 + ux * L, mi.y0 + uy * L);
        ctx.stroke();
        ctx.setLineDash([]);
        // elastico do puxao
        ctx.strokeStyle = 'rgba(23,22,28,0.45)';
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        ctx.moveTo(mi.x0, mi.y0);
        ctx.lineTo(mi.px, mi.py);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mi.x0, mi.y0, 1.25, 0, Math.PI * 2);
        ctx.fillStyle = COR[/** @type {1|2} */ (mi.j)];
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.restore();
      }
      if (vis.linha) {
        const a = vis.linha.casas[0];
        const b = vis.linha.casas[2];
        const p = (i) => [-MEIA + ((i % 3) + 0.5) * CASA, MEIA - (((i / 3) | 0) + 0.5) * CASA];
        const [x0, y0] = p(a);
        const [x1, y1] = p(b);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.strokeStyle = COR[/** @type {1|2} */ (vis.linha.jogador)] || TINTA;
        ctx.lineWidth = 0.36;
        ctx.stroke();
        ctx.restore();
      }
      if (vis.jaT !== null && vis.jaT !== undefined && vis.jaT > -0.6) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const txt = vis.jaT > 0 ? String(Math.ceil(vis.jaT)) : '!';
        ctx.font = `700 ${cam.s * 2.6 * dpr}px Fredoka, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 6 * dpr;
        ctx.strokeStyle = TINTA;
        ctx.fillStyle = '#ffd23a';
        ctx.strokeText(txt, cam.sx * dpr, (cam.sy + cam.cy * cam.s) * dpr);
        ctx.fillText(txt, cam.sx * dpr, (cam.sy + cam.cy * cam.s) * dpr);
        ctx.restore();
      }
    },
  };
}
