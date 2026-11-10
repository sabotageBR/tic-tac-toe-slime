// Modelo 9, Sobrecarga: o tabuleiro e um reator. Cada casa e um nucleo; tocar carrega (+1) um nucleo
// vazio ou seu. No limite (2 no canto, 3 na borda, 4 no meio) ele descarrega nos vizinhos e os
// captura, em cadeia. Quem joga em segundo ja comeca com um nucleo ligado (compensacao medida por
// bot). O palco guarda o estado VISUAL dos nucleos, que anda atras do logico, onda por onda.

import { criarModoTec } from './base.js';
import { criarGrade } from './grade.js';
import { criarRegras } from '../regras/sobrecarga.js';
import { animar, esperar, fazer, CURVA } from './acoes.js';

const SUBMODOS = [{ id: 'classico' }, { id: 'sobrecarga' }, { id: 'sobrecarga4' }];
const R3 = criarRegras(3, 3, 0, 1);
const R4 = criarRegras(4, 4, 0, 5);

/** @param {any} api */
function sincronizar(api) {
  const E = api.E;
  api.palco.nucleos = E.donos.map((d, i) => ({ dono: d, carga: E.carga[i], flash: 0, inflar: 0 }));
  api.palco.limites = api.R.limites;
}

/** @type {import('./base.js').GanchoTec} */
const G = {
  id: 'sobrecarga',
  submodos: SUBMODOS,
  regras: (sub) => (sub === 'sobrecarga4' ? R4 : R3),
  geometria: (sub) => (sub === 'sobrecarga4' ? criarGrade({ cols: 4, rows: 4, vao: 2.4 }) : criarGrade({ cols: 3, rows: 3, vao: 3 })),
  montar: sincronizar,
  encenar(api, ef) {
    const N = api.palco.nucleos;
    const cel = api.geo.celulas;
    if (ef.tipo === 'carga') {
      return [fazer(() => {
        const n = N[ef.casa];
        n.dono = ef.jogador;
        n.carga = ef.carga;
        n.flash = 1;
        api.som('tecCarga', { n: ef.carga });
        api.eventos.push({ tipo: 'faisca', x: cel[ef.casa].cx, y: cel[ef.casa].cy, j: ef.jogador, qtd: 6 });
      }), esperar(0.2)];
    }
    if (ef.tipo === 'onda') {
      return [
        animar(0.2, (k) => { for (const i of ef.casas) N[i].inflar = k; }, CURVA.entrada),
        fazer(() => {
          for (let i = 0; i < N.length; i++) {
            const mudou = N[i].dono !== ef.donos[i] || N[i].carga !== ef.carga[i];
            N[i].dono = ef.donos[i];
            N[i].carga = ef.carga[i];
            N[i].inflar = 0;
            if (mudou) N[i].flash = 1;
          }
          for (const [de, para] of ef.raios) api.eventos.push({ tipo: 'arco', x0: cel[de].cx, y0: cel[de].cy, x1: cel[para].cx, y1: cel[para].cy, j: ef.jogador });
          for (const i of ef.casas) api.eventos.push({ tipo: 'onda', x: cel[i].cx, y: cel[i].cy, j: ef.jogador, r: api.geo.vao * 0.9 });
          api.som('tecDescarga', { n: ef.n });
          api.eventos.push({ tipo: 'tremor', forca: 0.5 });
        }),
        esperar(0.3),
      ];
    }
    return null;
  },
  passo(api, dt) {
    const N = api.palco.nucleos;
    if (!N) return;
    for (const n of N) if (n.flash > 0) n.flash = Math.max(0, n.flash - dt * 2.6);
  },
};

/** @param {any} o */
export function criarModo(o) {
  return criarModoTec(G, o);
}
