// Desenho do Modelo 7, Velha Quantica: as marcas em superposicao sao fantasmas pequenos (X ou O
// que tremeluz, com o numero do lance) espalhados na casa, ligados ao par por um arco com um foton
// correndo. No ciclo, as casas envolvidas pulsam; as duas opcoes do colapso ganham moldura e "?".
// A marca colapsada e o X ou O cheio do classico.

import { CORES, gradeNeon, marca, brilho, mira, neon, rgba, texto, ruido } from '../kit.js';
import { desenharFeixe } from './classico.js';

export const desenhoQuantica = {
  /** @param {any} g */
  fundo(g) {
    const { ctx, geo, tema, t, vivo } = g;
    gradeNeon(ctx, geo, tema.acento, 0.9 * vivo);
    // pocos quanticos: um halo que respira no fundo de cada casa
    for (const C of geo.celulas) brilho(ctx, C.cx, C.cy, geo.vao * 0.62, tema.acento, 0.1 + 0.05 * Math.sin(t * 1.7 + C.i * 1.3));
  },
  /** @param {any} g */
  topo(g) {
    const { ctx, cam, dpr, geo, palco, vis, t, vivo } = g;
    const cel = geo.celulas;
    const v = geo.vao;
    // posicao de cada fantasma: os da mesma casa se espalham num circulo, na ordem dos lances
    /** @type {Map<number, any[]>} */
    const porCasa = new Map();
    for (const p of palco.pecas.values()) {
      if (p.tipo !== 'fantasma') continue;
      const l = porCasa.get(p.casa) || [];
      l.push(p);
      porCasa.set(p.casa, l);
    }
    /** @type {Map<any, number[]>} */
    const pos = new Map();
    for (const [casa, l] of porCasa) {
      l.sort((a, b) => a.dados.n - b.dados.n);
      const C = cel[casa];
      const R = l.length === 1 ? 0 : v * (l.length <= 4 ? 0.21 : 0.27);
      l.forEach((p, k) => {
        const a = Math.PI / 2 - (k / l.length) * Math.PI * 2 + t * 0.25;
        pos.set(p.id, [C.cx + Math.cos(a) * R, C.cy + Math.sin(a) * R, l.length]);
      });
    }
    if (vis.realce >= 0) mira(ctx, cel[vis.realce], CORES[vis.corVez], t);
    if (vis.sel >= 0) {
      const C = cel[vis.sel];
      mira(ctx, C, '#ffffff', t * 1.6, 0.12);
      marca(ctx, C.cx, C.cy, v * 0.16, vis.corVez, 0.5 + 0.3 * Math.sin(t * 10), v * 0.035);
    }
    // arcos de emaranhamento (um por par: desenha a partir do lado "a")
    for (const p of palco.pecas.values()) {
      if (p.tipo !== 'fantasma' || !String(p.id).endsWith('a')) continue;
      const q = palco.pecas.get(String(p.id).slice(0, -1) + 'b');
      const A = pos.get(p.id);
      const B = q && pos.get(q.id);
      if (!A || !B) continue;
      const cor = CORES[p.jogador];
      const mx = (A[0] + B[0]) / 2;
      const my = (A[1] + B[1]) / 2;
      const dx = B[0] - A[0];
      const dy = B[1] - A[1];
      // a barriga do arco alterna de lado com o lance, para os arcos nao se cobrirem
      const s = (p.dados.n % 2 ? 1 : -1) * 0.22;
      const cx = mx - dy * s;
      const cy = my + dx * s;
      const a = Math.min(p.alfa, q.alfa) * vivo;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.quadraticCurveTo(cx, cy, B[0], B[1]);
      neon(ctx, cor, v * 0.018, 0.5 * a, false);
      const u = (t * 0.7 + p.dados.n * 0.37) % 1;
      const w = 1 - u;
      brilho(ctx, w * w * A[0] + 2 * w * u * cx + u * u * B[0], w * w * A[1] + 2 * w * u * cy + u * u * B[1], v * 0.11, cor, a);
    }
    // fantasmas e marcas colapsadas
    const res = vis.linha;
    for (const p of palco.pecas.values()) {
      const cor = CORES[p.jogador];
      if (p.tipo === 'fantasma') {
        const P = pos.get(p.id);
        if (!P) continue;
        const tre = 0.55 + 0.3 * Math.sin(t * 6 + p.dados.n * 2.1) + (ruido(Math.floor(t * 20) + p.dados.n) > 0.92 ? -0.4 : 0);
        const r = v * (P[2] > 4 ? 0.1 : 0.13) * p.esc;
        const a = Math.max(0.15, tre) * p.alfa * vivo;
        brilho(ctx, P[0], P[1], r * 2.6, cor, 0.3 * a);
        marca(ctx, P[0], P[1], r, p.jogador, a, v * 0.028);
        texto(ctx, cam, dpr, P[0] + r * 1.15, P[1] - r * 1.1, String(p.dados.n), v * 0.085, cor, { alfa: 0.8 * a, halo: false });
      } else {
        const venceu = res && res.casas.includes(p.casa) && p.jogador === res.jogador;
        const a = p.alfa * (res && !venceu ? 0.45 : 1) * (p.dados.some === undefined ? vivo : 1);
        const k = p.dados.real === undefined ? 1 : p.dados.real;
        const r = v * 0.33 * Math.max(0.3, k) * (venceu ? 1 + 0.08 * Math.sin(t * 12) : 1);
        brilho(ctx, p.x, p.y, r * 2.4, cor, 0.32 * a);
        marca(ctx, p.x, p.y, r, p.jogador, a, v * 0.045);
      }
    }
    // ciclo fechado: as casas envolvidas pulsam ate o colapso
    const Ci = palco.ciclo;
    if (Ci) {
      const p = 0.5 + 0.5 * Math.sin((palco.t - Ci.t0) * 16);
      for (const i of Ci.casas) {
        const C = cel[i];
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba('#ffffff', 0.05 + 0.08 * p);
        ctx.fillRect(C.x0 + 0.12, C.y0 + 0.12, v - 0.24, v - 0.24);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // as duas opcoes do colapso
    const K = vis.colapso;
    if (K) {
      const cor = CORES[K.jogador];
      const p = 0.5 + 0.5 * Math.sin(t * 8);
      for (const i of [K.a, K.b]) {
        const C = cel[i];
        ctx.beginPath();
        ctx.rect(C.x0 + 0.16, C.y0 + 0.16, v - 0.32, v - 0.32);
        neon(ctx, cor, 0.08, (K.minha ? 0.6 : 0.35) + 0.4 * p);
        texto(ctx, cam, dpr, C.cx, C.y1 - v * 0.2, '?', v * 0.26, cor, { alfa: 0.6 + 0.4 * p });
      }
    }
    desenharFeixe(g);
  },
};
