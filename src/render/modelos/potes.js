// Desenho do Modelo 6 (Potes da Velha): o "#" de caneta no caderno atras, os bequeres de vidro
// (paredes rabiscadas como o pote do slime-merge, com vidro azulado), a linha de cheio com um tique
// por dose, os funis, as torneiras (abrem quando despejam) e, por cima do slime, as tampas dos
// potes fechados na cor do dono.

import { aplicar } from '../camera.js';
import { desenharPote, TINTA } from '../fundo.js';

const COR = { 1: '#2f7fe0', 2: '#f2862a', 3: '#9aa0ad' };

/** @param {any} m */
function paredesVisiveis(m) {
  const out = [];
  for (const p of m.paredes) {
    if (p.oculta) continue;
    out.push({ ax: p.ax + p.tx, ay: p.ay + p.ty, bx: p.bx + p.tx, by: p.by + p.ty, r: p.r });
  }
  return out;
}

/** @param {any} modo */
export function desenhoPotes(modo) {
  const geo = () => modo.potes();
  return {
    /** atras de tudo: o # de caneta e o vidro dos potes */
    fundo(ctx, cam, dpr, t, vis, m) {
      const G = geo();
      aplicar(ctx, cam, dpr);
      // o # do jogo da velha, de caneta azul, atras da prateleira
      const [x0, y0, x1, y1] = G.caixa;
      const dx = (x1 - x0) / 3;
      const dy = (y1 - y0) / 3;
      ctx.save();
      ctx.strokeStyle = 'rgba(40, 90, 200, 0.22)';
      ctx.lineWidth = 0.22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 1; k < 3; k++) {
        ctx.moveTo(x0 + dx * k, y0 + 0.3);
        ctx.lineTo(x0 + dx * k + 0.08, y1 - 0.3);
        ctx.moveTo(x0 + 0.3, y0 + dy * k);
        ctx.lineTo(x1 - 0.3, y0 + dy * k - 0.08);
      }
      ctx.stroke();
      ctx.restore();
      // vidro dos potes (por dentro) e o realce do pote da vez
      for (const P of G.potes) {
        const v = vis.potes && vis.potes[P.i];
        const sobre = vis.hoverPote === P.i;
        ctx.fillStyle = sobre ? (vis.corVez === 1 ? 'rgba(47,127,224,0.2)' : 'rgba(242,134,42,0.22)') : 'rgba(190, 228, 248, 0.32)';
        ctx.fillRect(P.cx - 1.45, P.yb + 0.1, 2.9, P.Hj - 0.1);
        // linha de cheio: tracejada, com um tique por dose
        ctx.save();
        ctx.setLineDash([0.22, 0.14]);
        ctx.lineWidth = 0.07;
        ctx.strokeStyle = v && v.dono ? 'rgba(23,22,28,0.25)' : 'rgba(220, 40, 60, 0.75)';
        ctx.beginPath();
        ctx.moveTo(P.cx - 1.45, P.linhaY);
        ctx.lineTo(P.cx + 1.45, P.linhaY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(23,22,28,0.45)';
        for (let k = 1; k < P.cap; k++) {
          const y = P.y0 + ((P.linhaY - P.y0) * k) / P.cap;
          ctx.beginPath();
          ctx.moveTo(P.cx - 1.45, y);
          ctx.lineTo(P.cx - 1.15, y);
          ctx.stroke();
        }
        ctx.restore();
        // torneira (cano que vem da direita, com o registro; abre quando despeja)
        const T = P.torneira;
        const aberta = v && v.aberta;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = TINTA;
        ctx.lineWidth = 0.42;
        ctx.beginPath();
        ctx.moveTo(T.x + 1.6, T.y + 0.25);
        ctx.lineTo(T.x + 0.2, T.y + 0.25);
        ctx.lineTo(T.x, T.y + 0.05);
        ctx.stroke();
        ctx.strokeStyle = sobre ? '#ffffff' : '#d9dee6';
        ctx.lineWidth = 0.26;
        ctx.stroke();
        // registro (gira quando abre)
        const ang = aberta ? Math.min(1, v.tAberta * 6) * 1.57 : 0;
        ctx.translate(T.x + 0.95, T.y + 0.62);
        ctx.rotate(ang);
        ctx.fillStyle = sobre ? (vis.corVez === 1 ? '#2f7fe0' : '#f2862a') : '#ef3e4f';
        ctx.strokeStyle = TINTA;
        ctx.lineWidth = 0.06;
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.42, 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // paredes (vidro rabiscado)
      desenharPote(ctx, cam, dpr, paredesVisiveis(m), { cor: '#eef8ff', listra: 'rgba(23,22,28,0.35)' });
      // bandeja
      aplicar(ctx, cam, dpr);
      ctx.fillStyle = 'rgba(23,22,28,0.12)';
      ctx.fillRect(x0 + 0.2, G.chao - 0.25, x1 - x0 - 0.4, 0.3);
    },
    /** por cima do slime: tampas e a contagem do pote */
    topo(ctx, cam, dpr, t, vis) {
      const G = geo();
      aplicar(ctx, cam, dpr);
      for (const P of G.potes) {
        const v = vis.potes && vis.potes[P.i];
        if (!v || !v.dono || G.sub === 'transborda') continue;
        const c = COR[/** @type {1|2|3} */ (v.dono)] || COR[3];
        const y = P.boca + 0.18;
        ctx.save();
        ctx.lineWidth = 0.08;
        ctx.strokeStyle = TINTA;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(P.cx - 1.85, y);
        ctx.lineTo(P.cx + 1.85, y);
        ctx.lineTo(P.cx + 1.7, y + 0.42);
        ctx.lineTo(P.cx - 1.7, y + 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(P.cx, y + 0.58, 0.32, 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (G.sub === 'transborda' && vis.potes) {
        // no Transborda, a cor do pote cheio vira uma faixa na boca
        for (const P of G.potes) {
          const v = vis.potes[P.i];
          if (!v || !v.dono) continue;
          ctx.fillStyle = COR[/** @type {1|2|3} */ (v.dono)] || COR[3];
          ctx.strokeStyle = TINTA;
          ctx.lineWidth = 0.06;
          ctx.fillRect(P.cx - 1.3, P.boca + 0.35, 2.6, 0.32);
          ctx.strokeRect(P.cx - 1.3, P.boca + 0.35, 2.6, 0.32);
        }
      }
    },
  };
}
