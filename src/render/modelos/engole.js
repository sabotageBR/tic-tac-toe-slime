// Desenho do Modelo 1 (Engole-Engole): a mao de cada jogador embaixo da estante, tres gotas
// (pequena, media, grande) com quantas faltam; a escolhida pula e ganha um anel.

import { aplicar } from '../camera.js';
import { TINTA } from '../fundo.js';

const COR = { 1: '#3f8ce8', 2: '#f39a3c' };

/** @param {any} _modo */
export function desenhoEngole(_modo) {
  return {
    topo(ctx, cam, dpr, t, vis) {
      if (!vis.maos) return;
      aplicar(ctx, cam, dpr);
      for (const h of vis.maos) {
        const pulo = h.sel ? Math.abs(Math.sin(t * 7)) * 0.25 : 0;
        const r = h.d / 2;
        const y = h.y + pulo;
        ctx.save();
        ctx.globalAlpha = h.n > 0 ? (vis.corVez === h.jogador ? 1 : 0.55) : 0.18;
        // a gota (base achatada, topo redondo)
        ctx.fillStyle = COR[/** @type {1|2} */ (h.jogador)];
        ctx.strokeStyle = TINTA;
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        ctx.ellipse(h.x, y, r * 1.05, r * 0.88, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(h.x - r * 0.38, y + r * 0.38, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
        ctx.fill();
        // olhinhos
        ctx.fillStyle = TINTA;
        for (const dx of [-0.28, 0.28]) {
          ctx.beginPath();
          ctx.ellipse(h.x + dx * r, y + 0.1 * r, 0.11 * r + 0.04, 0.15 * r + 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (h.sel) {
          ctx.strokeStyle = '#ffd23a';
          ctx.lineWidth = 0.16;
          ctx.beginPath();
          ctx.ellipse(h.x, y, r * 1.05 + 0.25, r * 0.88 + 0.25, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        // quantas faltam
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const sx = (cam.sx + (h.x + r * 0.75 - cam.cx) * cam.s) * dpr;
        const sy = (cam.sy - (h.y - r * 0.85 - cam.cy) * cam.s) * dpr;
        ctx.font = `700 ${Math.max(10, cam.s * 0.5) * dpr}px Fredoka, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3 * dpr;
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = TINTA;
        ctx.globalAlpha = h.n > 0 ? 1 : 0.4;
        ctx.strokeText('×' + h.n, sx, sy);
        ctx.fillText('×' + h.n, sx, sy);
        ctx.restore();
      }
    },
  };
}
