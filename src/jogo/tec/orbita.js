// Modelo 10, Orbita: uma estacao espacial que gira. O modulo solto numa coluna cai ate o fundo;
// depois de cada lance a estacao gira 90 graus no sentido horario e tudo cai de novo. A linha
// vale depois do giro (pense um giro a frente). Orbita = 5x5 com 4 em linha; a 4x4 e a rapida,
// com 3 em linha.

import { criarModoTec } from './base.js';
import { criarGrade } from './grade.js';
import { criarRegras, casaGirada } from '../regras/orbita.js';
import { criarPeca, mover, esperar, fazer, juntas, animar, CURVA } from './acoes.js';

const SUBMODOS = [{ id: 'classico' }, { id: 'orbita' }, { id: 'orbita4' }];
const R5 = criarRegras(5, 4, { direto: false });
const R4 = criarRegras(4, 3, { direto: false });
const MEIA_PI = 1.5707963267948966;

/** @type {import('./base.js').GanchoTec} */
const G = {
  id: 'orbita',
  submodos: SUBMODOS,
  regras: (sub) => (sub === 'orbita4' ? R4 : R5),
  geometria: (sub) => (sub === 'orbita4' ? criarGrade({ cols: 4, rows: 4, vao: 2.4 }) : criarGrade({ cols: 5, rows: 5, vao: 2 })),
  janela: (geo) => {
    // a diagonal do tabuleiro cabe na janela enquanto ele gira, e sobra o teto de onde o modulo cai
    const m = geo.caixa[2] * 1.42 + 0.3;
    return [-m, -m, m, m + geo.vao * 0.35];
  },
  montar(api) {
    api.palco.angulo = 0;
    api.palco.giros = 0;
    const E = api.E;
    for (let i = 0; i < E.donos.length; i++) {
      if (!E.donos[i]) continue;
      const C = api.geo.celulas[i];
      criarPeca(api.palco.pecas, { id: E.ids[i], jogador: E.donos[i], casa: i, x: C.cx, y: C.cy, tipo: 'modulo', esc: 1 });
    }
  },
  toque(api, casa) {
    return { col: casa % api.geo.cols };
  },
  toques(api, j) {
    const C = api.geo.celulas[j.col];
    return [[C.cx, C.cy]];
  },
  encenar(api, ef) {
    const cel = api.geo.celulas;
    const pecas = api.palco.pecas;
    if (ef.tipo === 'cair') {
      const C = cel[ef.casa];
      const topo = api.geo.caixa[3] + api.geo.vao * 0.75;
      const p = criarPeca(pecas, { id: ef.id, jogador: ef.jogador, casa: ef.casa, x: C.cx, y: topo, tipo: 'modulo', esc: 1, alfa: 0 });
      const dur = 0.16 + 0.07 * Math.floor(ef.casa / api.geo.cols);
      return [
        fazer(() => { p.alfa = 1; api.som('tecCair'); }),
        mover(p, C.cx, C.cy, dur, CURVA.quique),
        fazer(() => { api.eventos.push({ tipo: 'faisca', x: C.cx, y: C.y0, j: ef.jogador, qtd: 6, forca: 3 }); }),
        esperar(0.12),
      ];
    }
    if (ef.tipo === 'girar') {
      return [
        fazer(() => { api.som('tecGiro'); api.eventos.push({ tipo: 'texto', x: 0, y: api.geo.caixa[3] + api.geo.vao * 0.6, chave: 'tec.giro', escala: 0.9 }); }),
        // horario na tela = angulo negativo no mundo (y para cima)
        animar(0.6, (k) => { api.palco.angulo = -k * MEIA_PI; }, CURVA.suave),
        fazer(() => {
          const n = api.geo.cols;
          for (const p of pecas.values()) {
            p.casa = casaGirada(p.casa, n);
            p.x = cel[p.casa].cx;
            p.y = cel[p.casa].cy;
          }
          api.palco.angulo = 0;
          api.palco.giros++;
        }),
      ];
    }
    if (ef.tipo === 'assentar') {
      if (!ef.movs.length) return [esperar(0.1)];
      const lista = [];
      for (const m of ef.movs) {
        const p = pecas.get(m.id);
        if (!p) continue;
        lista.push({
          nome: 'assenta',
          passo: (() => {
            let a = null;
            return (dt) => {
              if (!a) { p.casa = m.para; a = mover(p, cel[m.para].cx, cel[m.para].cy, 0.24, CURVA.quique); }
              return a.passo(dt);
            };
          })(),
        });
      }
      return [juntas(lista), fazer(() => api.som('tecCair')), esperar(0.1)];
    }
    return null;
  },
  visual(api) {
    const out = {};
    if (api.minhaVez && api.hover >= 0) {
      const col = api.hover % api.geo.cols;
      const pouso = api.R.fundo(api.E.donos, col);
      if (pouso >= 0) out.coluna = { col, pouso };
    }
    return out;
  },
};

/** @param {any} o */
export function criarModo(o) {
  return criarModoTec(G, o);
}
