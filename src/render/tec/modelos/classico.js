// O 3x3 holografico do submodo Classico de toda versao tech: grade neon na cor do tema, X ciano e
// O magenta que se materializam, mira na casa sob o dedo e o feixe da vitoria.

import { CORES, gradeNeon, marca, brilho, mira, feixe } from '../kit.js';

/** Pecas do palco como X e O (usado tambem por versoes que so mudam a regra). @param {any} g */
export function desenharMarcas(g, raio = 0.33) {
  const { ctx, palco, geo, vis, t } = g;
  const res = vis.linha;
  for (const p of palco.pecas.values()) {
    const venceu = res && res.casas.includes(p.casa) && p.jogador === res.jogador;
    const apagada = res && !venceu ? 0.45 : 1;
    const pulso = venceu ? 1 + 0.08 * Math.sin(t * 12) : 1;
    const r = geo.vao * raio * p.esc * pulso;
    brilho(ctx, p.x, p.y, r * 2.4, CORES[p.jogador], 0.32 * p.alfa * apagada);
    marca(ctx, p.x, p.y, r, p.jogador, p.alfa * apagada, geo.vao * 0.045);
  }
}

/** Mira e marca fantasma na casa livre sob o dedo. @param {any} g */
export function desenharMira(g) {
  const { ctx, geo, vis, t } = g;
  if (vis.realce < 0 || !geo.celulas[vis.realce]) return;
  const C = geo.celulas[vis.realce];
  mira(ctx, C, CORES[vis.corVez], t);
  marca(ctx, C.cx, C.cy, geo.vao * 0.3, vis.corVez, 0.22, geo.vao * 0.04);
}

/** Feixe pelos centros das casas da linha. @param {any} g */
export function desenharFeixe(g) {
  const { ctx, geo, vis, t } = g;
  if (!vis.linha) return;
  feixe(ctx, vis.linha.casas.map((i) => [geo.celulas[i].cx, geo.celulas[i].cy]), vis.linha.jogador, vis.tFim, t);
}

export const desenhoClassico = {
  /** @param {any} g */
  fundo(g) {
    gradeNeon(g.ctx, g.geo, g.tema.acento, 0.95);
  },
  /** @param {any} g */
  topo(g) {
    desenharMira(g);
    desenharMarcas(g);
    desenharFeixe(g);
  },
};
