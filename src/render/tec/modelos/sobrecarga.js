// Desenho do Modelo 9, Sobrecarga: placas de reator ligadas por barramentos; cada nucleo mostra o
// dono (X ou O no miolo), a carga (orbes em orbita) e o limite (segmentos do anel). No ultimo
// degrau antes do limite o nucleo treme e pisca: o proximo toque descarrega.

import { CORES, CLARAS, brilho, neon, anel, marca, chanfrado, mira, rgba, ruido } from '../kit.js';
import { desenharFeixe } from './classico.js';

export const desenhoSobrecarga = {
  /** @param {any} g */
  fundo(g) {
    const { ctx, geo, palco, tema, t } = g;
    const N = palco.nucleos;
    if (!N) return;
    const cel = geo.celulas;
    // barramentos entre casas vizinhas (acendem quando os dois lados tem dono)
    for (const C of cel) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        if (C.c + dc >= geo.cols || C.r + dr >= geo.rows) continue;
        const D = cel[(C.r + dr) * geo.cols + C.c + dc];
        const a = N[C.i].dono;
        const b = N[D.i].dono;
        const cor = a && a === b ? CORES[a] : tema.acento;
        ctx.beginPath();
        ctx.moveTo(C.cx, C.cy);
        ctx.lineTo(D.cx, D.cy);
        neon(ctx, cor, 0.05, a && a === b ? 0.5 : 0.16, false);
        // pulso de energia correndo no barramento
        const u = (t * 0.6 + ruido(C.i * 3 + dr) * 5) % 1;
        brilho(ctx, C.cx + (D.cx - C.cx) * u, C.cy + (D.cy - C.cy) * u, 0.22, cor, 0.5);
      }
    }
    // placas
    for (const C of cel) {
      const n = N[C.i];
      const f = geo.vao * 0.07;
      chanfrado(ctx, C.x0 + f, C.y0 + f, C.x1 - f, C.y1 - f, geo.vao * 0.14);
      ctx.fillStyle = n.dono ? rgba(CORES[n.dono], 0.1 + n.flash * 0.18) : 'rgba(10,14,24,0.72)';
      ctx.fill();
      neon(ctx, n.dono ? CORES[n.dono] : tema.acento, 0.04, (n.dono ? 0.75 : 0.32) * g.vivo, false);
    }
  },
  /** @param {any} g */
  topo(g) {
    const { ctx, geo, palco, vis, t, vivo } = g;
    const N = palco.nucleos;
    if (!N) return;
    const L = palco.limites;
    const cel = geo.celulas;
    const R = geo.vao * 0.36;
    if (vis.realce >= 0) mira(ctx, cel[vis.realce], CORES[vis.corVez], t, geo.vao * 0.1);
    for (const C of cel) {
      const n = N[C.i];
      const lim = L[C.i];
      const critico = n.carga >= lim - 1 && n.carga > 0;
      // tremor de quem esta no limite
      const tr = critico ? 0.035 * geo.vao : 0;
      const x = C.cx + (ruido(Math.floor(t * 40) + C.i * 17) - 0.5) * tr;
      const y = C.cy + (ruido(Math.floor(t * 40) + C.i * 31 + 5) - 0.5) * tr;
      const cor = n.dono ? CORES[n.dono] : '#55607a';
      const esc = 1 + n.inflar * 0.55;
      // anel do limite: um segmento por unidade de carga que cabe
      const folga = 0.16;
      for (let s = 0; s < lim; s++) {
        const a0 = Math.PI / 2 - ((s + 1) / lim) * Math.PI * 2 + folga;
        const a1 = Math.PI / 2 - (s / lim) * Math.PI * 2 - folga;
        const cheio = s < n.carga;
        const proximo = vis.realce === C.i && s === n.carga;
        if (cheio) anel(ctx, x, y, R * esc, cor, 0.085, vivo, a0, a1);
        else if (proximo) anel(ctx, x, y, R, CORES[vis.corVez], 0.07, 0.35 + 0.35 * Math.sin(t * 9), a0, a1);
        else {
          ctx.beginPath();
          ctx.arc(x, y, R, a0, a1);
          ctx.strokeStyle = 'rgba(120,135,170,0.3)';
          ctx.lineWidth = 0.05;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
      if (!n.dono && !n.inflar) continue;
      // miolo: halo que cresce com a carga, o X ou O do dono e os orbes em orbita
      const pisca = critico ? 0.7 + 0.3 * Math.sin(t * 18) : 1;
      brilho(ctx, x, y, R * (1.5 + n.carga * 0.35) * esc, cor, (0.3 + 0.12 * n.carga) * pisca * vivo);
      if (n.flash > 0 || n.inflar > 0) brilho(ctx, x, y, R * 2.4 * esc, '#ffffff', Math.max(n.flash * 0.7, n.inflar * 0.9));
      if (n.dono) marca(ctx, x, y, R * 0.5 * esc, n.dono, vivo * pisca, geo.vao * 0.04);
      const vel = 1.4 + n.carga * 1.2;
      for (let k = 0; k < n.carga; k++) {
        const an = t * vel + (k / Math.max(1, n.carga)) * Math.PI * 2;
        const ox = x + Math.cos(an) * R * 0.74 * esc;
        const oy = y + Math.sin(an) * R * 0.74 * esc;
        brilho(ctx, ox, oy, R * 0.34, n.dono ? CLARAS[n.dono] : '#ffffff', vivo);
        brilho(ctx, ox, oy, R * 0.6, cor, 0.6 * vivo);
      }
    }
    desenharFeixe(g);
  },
};
