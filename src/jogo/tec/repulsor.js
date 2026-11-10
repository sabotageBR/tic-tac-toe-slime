// Modelo 11, Repulsor: pecas magneticas que flutuam sobre a placa. A peca nova solta um pulso que
// empurra as 4 vizinhas (cima, baixo e lados) uma casa para fora; quem sai do tabuleiro e ejetada.
// No Atrator (5x5, 4 em linha) o pulso puxa para perto quem esta a 2 casas. A previa mostra, na
// casa sob o dedo, para onde cada vizinha vai.

import { criarModoTec } from './base.js';
import { criarGrade } from './grade.js';
import { criarRegras } from '../regras/repulsor.js';
import { criarPeca, surgir, mover, sumir, esperar, fazer, juntas, animar, CURVA } from './acoes.js';

const SUBMODOS = [{ id: 'classico' }, { id: 'repulsor' }, { id: 'atrator' }];
const R_REP = criarRegras(4, 3, 'repulsor', { dirs: 4, teto: 36 });
const R_ATR = criarRegras(5, 4, 'atrator', { dirs: 4, teto: 36 });

/** @type {import('./base.js').GanchoTec} */
const G = {
  id: 'repulsor',
  submodos: SUBMODOS,
  regras: (sub) => (sub === 'atrator' ? R_ATR : R_REP),
  geometria: (sub) => (sub === 'atrator' ? criarGrade({ cols: 5, rows: 5, vao: 2 }) : criarGrade({ cols: 4, rows: 4, vao: 2.4 })),
  janela: (geo) => {
    const [x0, y0, x1, y1] = geo.caixa;
    // folga para a peca ejetada voar para fora
    return [x0 - geo.vao * 0.75, y0 - geo.vao * 0.75, x1 + geo.vao * 0.75, y1 + geo.vao * 0.75];
  },
  montar(api) { api.palco.pulso = null; },
  encenar(api, ef) {
    const cel = api.geo.celulas;
    const pecas = api.palco.pecas;
    if (ef.tipo === 'por') {
      const C = cel[ef.casa];
      const p = criarPeca(pecas, { id: ef.id, jogador: ef.jogador, casa: ef.casa, x: C.cx, y: C.cy, tipo: 'ima' });
      api.som('tecMarca', { j: ef.jogador });
      api.eventos.push({ tipo: 'faisca', x: C.cx, y: C.cy, j: ef.jogador, qtd: 6 });
      return [surgir(p, 0.22)];
    }
    if (ef.tipo === 'campo') {
      const C = cel[ef.casa];
      const puxa = api.R.modo === 'atrator';
      const lista = [animar(0.34, (k) => { api.palco.pulso = { x: C.cx, y: C.cy, k, j: ef.jogador, puxa }; }, CURVA.saida)];
      for (const m of ef.movs) {
        const p = pecas.get(m.id);
        if (!p) continue;
        if (m.fora) {
          // dr e a linha (para baixo na tela): no mundo o y cresce para cima
          const x = p.x + m.dc * api.geo.vao * 1.15;
          const y = p.y - m.dr * api.geo.vao * 1.15;
          lista.push(mover(p, x, y, 0.3, CURVA.entrada), sumir(pecas, p, 0.3), {
            nome: 'ejetado',
            passo: (() => {
              let t = 0;
              return (dt) => {
                t += dt;
                if (t < 0.3) return false;
                api.eventos.push({ tipo: 'pixels', x, y, j: m.jogador, qtd: 18, r: 0.7 });
                api.eventos.push({ tipo: 'texto', x, y, chave: 'tec.ejetado', j: m.jogador, escala: 0.8 });
                api.som('tecEjeta');
                return true;
              };
            })(),
          });
        } else {
          p.casa = m.para;
          lista.push(mover(p, cel[m.para].cx, cel[m.para].cy, 0.3, CURVA.saida));
        }
      }
      return [
        fazer(() => { api.som('tecEmpurra'); api.eventos.push({ tipo: 'onda', x: C.cx, y: C.cy, j: ef.jogador, r: api.geo.vao * 1.5 }); }),
        juntas(lista),
        fazer(() => { api.palco.pulso = null; }),
        esperar(0.08),
      ];
    }
    return null;
  },
  visual(api) {
    const out = {};
    // previa do campo na casa livre sob o dedo
    if (api.minhaVez && api.hover >= 0 && !api.E.donos[api.hover]) out.previa = { casa: api.hover, movs: api.R.prever(api.E, api.hover) };
    return out;
  },
};

/** @param {any} o */
export function criarModo(o) {
  return criarModoTec(G, o);
}
