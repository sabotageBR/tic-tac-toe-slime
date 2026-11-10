// Modelo 8, Holo Cubo: um cubo 3x3x3 holografico que gira. O toque escolhe uma das 9 colunas e o
// bloco cai e empilha; o centro do cubo e um nucleo neutro (tira a casa mais forte: equilibrio
// medido por bot). Arrastar gira o cubo; parado, ele balanca devagar para o 3D se ler.
// Cubo = a primeira linha vence; Pontos = enche o cubo e vence quem fechou mais linhas.

import { criarModoTec } from './base.js';
import { criarRegras } from '../regras/cubo.js';
import { projetar, distSegmento } from './proj3d.js';
import { criarPeca, animar, esperar, fazer, CURVA } from './acoes.js';

const SUBMODOS = [{ id: 'classico' }, { id: 'cubo' }, { id: 'cuboPontos' }];
const R_LINHA = criarRegras('linha', { nucleo: true });
const R_PONTOS = criarRegras('pontos', { nucleo: true });

/** lado de uma casa do cubo e a distancia entre os andares (u) */
export const LADO = 1.7;
export const ANDAR = 2.05;
const YAW0 = 0.62;

/** Posicao no espaco do cubo da casa (col, z); z pode ser fracionario (o bloco caindo). */
export function ponto(col, z) {
  const r = Math.floor(col / 3);
  const c = col % 3;
  return [(c - 1) * LADO, (z - 1) * ANDAR, (1 - r) * LADO];
}

/** Geometria com a interface da grade (9 colunas), mas projetada com o giro atual. */
function criarGeo() {
  const geo = {
    cols: 3, rows: 3, vao: LADO, yaw: YAW0,
    caixa: [-4.5, -4.7, 4.5, 4.9],
    /** @type {any[]} */
    celulas: [],
    /** Coluna sob (x, y): a de segmento projetado mais perto. @param {number} x @param {number} y */
    celulaEm(x, y) {
      let melhor = -1;
      let dMin = 0.95;
      for (let col = 0; col < 9; col++) {
        const [ax, ay] = projetar(...ponto(col, -0.2), geo.yaw);
        const [bx, by] = projetar(...ponto(col, 2.2), geo.yaw);
        const d = distSegmento(x, y, ax, ay, bx, by);
        if (d < dMin) { dMin = d; melhor = col; }
      }
      return melhor;
    },
  };
  for (let col = 0; col < 9; col++) {
    geo.celulas.push({
      i: col, r: Math.floor(col / 3), c: col % 3,
      get cx() { return projetar(...ponto(col, 1), geo.yaw)[0]; },
      get cy() { return projetar(...ponto(col, 1), geo.yaw)[1]; },
    });
  }
  return geo;
}

/** @type {import('./base.js').GanchoTec} */
const G = {
  id: 'cubo',
  submodos: SUBMODOS,
  orcamento: 20000,
  regras: (sub) => (sub === 'cuboPontos' ? R_PONTOS : R_LINHA),
  geometria: () => criarGeo(),
  janela: (geo) => geo.caixa,
  montar(api) {
    api.palco.linhas = [];
    api.palco.nucleo = api.R.nucleo;
    // o giro que a pessoa deixou continua de uma partida para a outra (o palco nao e zerado)
    if (api.palco.base === undefined) api.palco.base = YAW0;
  },
  toque(api, casa) {
    return { col: casa };
  },
  toques(api, j) {
    const [x, y] = projetar(...ponto(j.col, 1), api.geo.yaw);
    return [[x, y]];
  },
  /** arrastar gira; o toque (soltar sem arrastar) joga na coluna */
  apontar(api, x, y, fase) {
    const d = api.dados;
    if (fase === 'baixo') { d.preso = true; d.x0 = x; d.xAnt = x; d.arrastou = false; return true; }
    if (fase === 'mover') {
      if (d.preso) {
        if (Math.abs(x - d.x0) > 0.45) d.arrastou = true;
        if (d.arrastou) api.palco.base += (x - d.xAnt) * 0.32;
        d.xAnt = x;
      }
      return true;
    }
    if (fase === 'cima') {
      const tocou = d.preso && !d.arrastou;
      d.preso = false;
      if (!tocou) return true;
      const col = api.geo.celulaEm(x, y);
      if (col < 0 || !api.minhaVez) return true;
      if (!api.vez.jogar({ col })) api.som('tecRecusa');
      return true;
    }
    return true;
  },
  tecla(api, codigo) {
    if (codigo === 'KeyQ' || codigo === 'KeyA') { api.palco.base -= 0.5; return true; }
    if (codigo === 'KeyE' || codigo === 'KeyD') { api.palco.base += 0.5; return true; }
    return false;
  },
  passo(api) {
    // balanco lento; a geometria (toque) e o desenho leem o mesmo giro
    api.geo.yaw = (api.palco.base === undefined ? YAW0 : api.palco.base) + 0.2 * Math.sin(api.palco.t * 0.55);
    api.palco.yaw = api.geo.yaw;
  },
  encenar(api, ef) {
    if (ef.tipo === 'cair') {
      const p = criarPeca(api.palco.pecas, { id: ef.id, jogador: ef.jogador, casa: ef.casa, x: 0, y: 0, tipo: 'bloco', esc: 1, alfa: 0, dados: { col: ef.col, z: 4.4 } });
      return [
        fazer(() => { p.alfa = 1; api.som('tecCair'); }),
        animar(0.3 + 0.05 * (2 - ef.z), (k) => { p.dados.z = 4.4 + (ef.z - 4.4) * k; }, CURVA.quique),
        fazer(() => {
          const [x, y] = projetar(...ponto(ef.col, ef.z), api.geo.yaw);
          api.eventos.push({ tipo: 'faisca', x, y, j: ef.jogador, qtd: 7, forca: 3 });
        }),
        esperar(0.1),
      ];
    }
    if (ef.tipo === 'linha') {
      return [fazer(() => {
        api.palco.linhas.push({ casas: ef.casas, jogador: ef.jogador, t0: api.palco.t });
        const [x, y] = projetar(...ponto(ef.casas[1] % 9, Math.floor(ef.casas[1] / 9)), api.geo.yaw);
        api.eventos.push({ tipo: 'onda', x, y, j: ef.jogador, r: 2.6 });
        api.som('tecTrava');
      }), esperar(0.25)];
    }
    return null;
  },
  visual(api) {
    const out = {};
    const h = api.hover;
    if (api.minhaVez && h >= 0 && api.E.alt[h] < api.R.cabe(h)) out.coluna = { col: h, z: api.R.andar(h, api.E.alt[h]) };
    if (api.sub === 'cuboPontos') {
      const L = api.palco.linhas || [];
      out.pontos = { 1: L.filter((l) => l.jogador === 1).length, 2: L.filter((l) => l.jogador === 2).length };
    }
    return out;
  },
};

/** @param {any} o */
export function criarModo(o) {
  return criarModoTec(G, o);
}
