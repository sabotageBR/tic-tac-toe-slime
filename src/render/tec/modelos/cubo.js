// Desenho do Modelo 8, Holo Cubo: um holograma 3x3x3 em arame sobre um projetor. Tres andares de
// grade, o nucleo neutro no centro, cada bloco como uma casa em arame fraco com o X ou O de frente
// para a camera (a leitura do jogo da velha) e os feixes das linhas fechadas. Tudo aditivo: o que
// esta na frente so soma luz, entao basta desenhar do fundo para a frente.

import { CORES, brilho, neon, rgba, texto, linha, marca } from '../kit.js';
import { projetar } from '../../../jogo/tec/proj3d.js';
import { ponto, LADO, ANDAR } from '../../../jogo/tec/cubo.js';

const ARESTAS_CUBO = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
const ARESTAS_OCTA = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];

/** Caminho em arame de um bloco centrado em (x, y, z) do cubo. */
function arame(ctx, x, y, z, h, jogador, yaw) {
  const vs = [];
  if (jogador === 1) {
    for (let k = 0; k < 8; k++) vs.push(projetar(x + (k & 1 ? h : -h), y + (k & 2 ? h : -h), z + (k & 4 ? h : -h), yaw));
  } else {
    const q = h * 1.35;
    for (const [dx, dy, dz] of [[q, 0, 0], [-q, 0, 0], [0, q, 0], [0, -q, 0], [0, 0, q], [0, 0, -q]]) vs.push(projetar(x + dx, y + dy, z + dz, yaw));
  }
  ctx.beginPath();
  for (const [a, b] of jogador === 1 ? ARESTAS_CUBO : ARESTAS_OCTA) {
    ctx.moveTo(vs[a][0], vs[a][1]);
    ctx.lineTo(vs[b][0], vs[b][1]);
  }
}

/** Centro projetado de uma casa do cubo (indice 0..26). */
function centro(casa, yaw) {
  return projetar(...ponto(casa % 9, Math.floor(casa / 9)), yaw);
}

export const desenhoCubo = {
  /** @param {any} g */
  fundo(g) {
    const { ctx, palco, tema, t, vivo } = g;
    const yaw = palco.yaw || 0;
    // projetor: aneis no chao e o cone de luz
    const [bx, by] = projetar(0, -ANDAR * 1.75, 0, yaw);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(1, 0.46);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(0, 0, LADO * (1.2 + k * 0.55), 0, Math.PI * 2);
      neon(ctx, tema.acento, 0.05, (0.5 - k * 0.13) * vivo, false);
    }
    const an = t * 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, LADO * 1.75, an, an + 1.1);
    neon(ctx, tema.acento, 0.09, 0.9 * vivo);
    ctx.restore();
    const [tx, ty] = projetar(0, ANDAR * 1.5, 0, yaw);
    const gr = ctx.createLinearGradient(0, by, 0, ty);
    gr.addColorStop(0, rgba(tema.acento, 0.2));
    gr.addColorStop(1, rgba(tema.acento, 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(bx - LADO * 0.5, by);
    ctx.lineTo(tx - LADO * 2.4, ty);
    ctx.lineTo(tx + LADO * 2.4, ty);
    ctx.lineTo(bx + LADO * 0.5, by);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },
  /** @param {any} g */
  topo(g) {
    const { ctx, cam, dpr, palco, vis, tema, t, vivo, modo } = g;
    const yaw = palco.yaw || 0;
    const m = LADO * 1.5;
    const P = (x, y, z) => projetar(x, y, z, yaw);
    // os tres andares (grade 3x3 em cada um) e as arestas verticais do cubo
    for (let z = 0; z < 3; z++) {
      const y = (z - 1) * ANDAR - ANDAR * 0.5;
      ctx.beginPath();
      for (let k = 0; k <= 3; k++) {
        const u = -m + k * LADO;
        const a = P(u, y, -m);
        const b = P(u, y, m);
        const c = P(-m, y, u);
        const d = P(m, y, u);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
      }
      neon(ctx, tema.acento, 0.025, 0.38 * vivo, false);
      // a placa do andar, bem de leve, separa os tres niveis
      const q = [P(-m, y, -m), P(m, y, -m), P(m, y, m), P(-m, y, m)];
      ctx.beginPath();
      q.forEach((v2, k) => (k ? ctx.lineTo(v2[0], v2[1]) : ctx.moveTo(v2[0], v2[1])));
      ctx.closePath();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(tema.acento, 0.045 * vivo);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.beginPath();
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const a = P(sx * m, -ANDAR * 1.5, sz * m);
      const b = P(sx * m, ANDAR * 1.5, sz * m);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    const topoY = ANDAR * 1.5;
    for (let k = 0; k < 4; k++) {
      const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const a = P(q[k][0] * m, topoY, q[k][1] * m);
      const b = P(q[(k + 1) % 4][0] * m, topoY, q[(k + 1) % 4][1] * m);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    neon(ctx, tema.acento, 0.03, 0.5 * vivo, false);
    // coluna sob o dedo: o fio aceso e o bloco fantasma onde ele vai parar
    if (vis.coluna) {
      const cor = CORES[vis.corVez];
      const a = projetar(...ponto(vis.coluna.col, -0.5), yaw);
      const b = projetar(...ponto(vis.coluna.col, 3.3), yaw);
      linha(ctx, a[0], a[1], b[0], b[1], cor, 0.05, 0.5 + 0.25 * Math.sin(t * 8));
      const [x, y, z] = ponto(vis.coluna.col, vis.coluna.z);
      arame(ctx, x, y, z, LADO * 0.36, 1, yaw);
      neon(ctx, cor, 0.035, 0.45 + 0.25 * Math.sin(t * 8), false);
      const [gx, gy, , gf] = projetar(x, y, z, yaw);
      marca(ctx, gx, gy, LADO * 0.3 * gf, vis.corVez, 0.3 + 0.15 * Math.sin(t * 8), 0.07);
      brilho(ctx, b[0], b[1], 0.5, cor, 0.9);
    }
    // itens ordenados do fundo para a frente: nucleo e blocos
    const itens = [];
    if (palco.nucleo) itens.push({ prof: centro(13, yaw)[2], nucleo: true });
    for (const p of palco.pecas.values()) {
      if (p.tipo !== 'bloco') continue;
      const [x, y, z] = ponto(p.dados.col, p.dados.z);
      itens.push({ prof: projetar(x, y, z, yaw)[2], p, x, y, z });
    }
    itens.sort((a, b) => b.prof - a.prof);
    const res = vis.linha;
    for (const it of itens) {
      if (it.nucleo) {
        const [x, y, , f] = centro(13, yaw);
        const pul = 0.75 + 0.25 * Math.sin(t * 3);
        brilho(ctx, x, y, LADO * 0.75 * pul * f, '#ffffff', 0.5 * vivo);
        brilho(ctx, x, y, LADO * 1.2 * f, tema.acento, 0.35 * vivo);
        arame(ctx, 0, 0, 0, LADO * 0.2 * pul, 2, yaw + t * 0.9);
        neon(ctx, '#ffffff', 0.03, 0.8 * vivo, false);
        continue;
      }
      const p = it.p;
      const venceu = res && res.casas.includes(p.casa) && p.jogador === res.jogador;
      const a = p.alfa * (res && !venceu ? 0.4 : 1) * (p.dados.some === undefined ? vivo : 1);
      const cor = CORES[p.jogador];
      const [sx, sy, , f] = projetar(it.x, it.y, it.z, yaw);
      // os de tras ficam um pouco mais fracos: ajuda a ler a profundidade
      const perto = Math.max(0.55, Math.min(1, 0.8 - it.prof * 0.07));
      const pul = venceu ? 1 + 0.08 * Math.sin(t * 12) : 1;
      // a casa em arame bem fraco (o volume) e o X ou O de frente para a camera (a leitura)
      arame(ctx, it.x, it.y, it.z, LADO * 0.36, 1, yaw);
      neon(ctx, cor, 0.022, 0.3 * a * perto, false);
      brilho(ctx, sx, sy, LADO * 0.7 * f, cor, 0.5 * a * perto);
      marca(ctx, sx, sy, LADO * 0.33 * f * pul, p.jogador, a * perto, 0.085 * f);
    }
    // linhas fechadas (modo Pontos) e a linha da vitoria
    const feixe3 = (casas, jogador, k) => {
      const a = centro(casas[0], yaw);
      const b = centro(casas[2], yaw);
      const x1 = a[0] + (b[0] - a[0]) * k;
      const y1 = a[1] + (b[1] - a[1]) * k;
      linha(ctx, a[0], a[1], x1, y1, CORES[jogador], 0.14, 0.95 * vivo);
      linha(ctx, a[0], a[1], x1, y1, '#ffffff', 0.05, 0.9 * vivo);
    };
    for (const L of palco.linhas || []) feixe3(L.casas, L.jogador, Math.min(1, (palco.t - L.t0) / 0.3));
    if (res) feixe3(res.casas, res.jogador, Math.min(1, vis.tFim / 0.35));
    // placar do modo Pontos por cima do cubo
    if (vis.pontos) {
      const y = modo.janela[3] - 0.55;
      texto(ctx, cam, dpr, -0.9, y, String(vis.pontos[1]), 0.8, CORES[1]);
      texto(ctx, cam, dpr, 0, y, '×', 0.5, '#9fb4d8', { halo: false });
      texto(ctx, cam, dpr, 0.9, y, String(vis.pontos[2]), 0.8, CORES[2]);
    }
  },
};
