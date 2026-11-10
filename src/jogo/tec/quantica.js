// Modelo 7, Velha Quantica: cada lance poe a marca em superposicao em DUAS casas (dois toques).
// Quando um par fecha um ciclo de emaranhamento, o rival escolhe em qual das duas casas a ultima
// marca cai, e o colapso decide em cascata todas as marcas ligadas. No palco, cada marca em
// superposicao e um par de fantasmas (um por casa) ligados por um arco; no colapso um vira a marca
// classica e o outro se desfaz.

import { criarModoTec } from './base.js';
import { REGRAS } from '../regras/quantica.js';
import { criarPeca, surgir, sumir, esperar, fazer, juntas, animar, CURVA } from './acoes.js';

const SUBMODOS = [{ id: 'classico' }, { id: 'quantica' }];

/** @type {import('./base.js').GanchoTec} */
const G = {
  id: 'quantica',
  submodos: SUBMODOS,
  semPoupar: true,
  regras: () => REGRAS,
  montar(api) {
    api.palco.ciclo = null;
    api.dados.sel = -1;
  },
  /** dois toques por lance; no colapso, um toque numa das duas casas da marca */
  toque(api, casa) {
    const E = api.E;
    if (E.colapso) {
      if (casa === E.colapso.a || casa === E.colapso.b) return { colapso: casa };
      api.som('tecRecusa');
      return null;
    }
    if (E.classicas[casa]) { api.som('tecRecusa'); return null; }
    const sel = api.dados.sel;
    if (sel === undefined || sel < 0) { api.dados.sel = casa; api.som('tecSelecao'); return null; }
    if (sel === casa) { api.dados.sel = -1; return null; }
    api.dados.sel = -1;
    return { a: Math.min(sel, casa), b: Math.max(sel, casa) };
  },
  toques(api, j) {
    const cel = api.geo.celulas;
    if (j.colapso !== undefined) return [[cel[j.colapso].cx, cel[j.colapso].cy]];
    return [[cel[j.a].cx, cel[j.a].cy], [cel[j.b].cx, cel[j.b].cy]];
  },
  encenar(api, ef) {
    const cel = api.geo.celulas;
    const pecas = api.palco.pecas;
    if (ef.tipo === 'emaranhar') {
      const lista = [];
      for (const [lado, casa, par] of [['a', ef.a, ef.b], ['b', ef.b, ef.a]]) {
        const C = cel[/** @type {number} */ (casa)];
        const p = criarPeca(pecas, { id: ef.id + lado, jogador: ef.jogador, casa: /** @type {number} */ (casa), x: C.cx, y: C.cy, tipo: 'fantasma', dados: { n: ef.id, par } });
        lista.push(surgir(p, 0.24));
      }
      api.som('tecMarca', { j: ef.jogador });
      return [juntas(lista), esperar(0.06)];
    }
    if (ef.tipo === 'ciclo') {
      return [
        fazer(() => {
          api.palco.ciclo = { casas: ef.casas, a: ef.a, b: ef.b, t0: api.palco.t };
          api.eventos.push({ tipo: 'texto', x: 0, y: api.geo.caixa[3] + 0.35, chave: 'tec.colapso', escala: 1.1 });
          api.eventos.push({ tipo: 'glitch', dur: 0.2 });
          api.som('tecFalha');
        }),
        esperar(0.45),
      ];
    }
    if (ef.tipo === 'colapsar') {
      /** @type {import('./acoes.js').Acao[]} */
      const seq = [fazer(() => { api.palco.ciclo = null; api.som('tecColapso'); })];
      for (const it of ef.lista) {
        const fica = pecas.get(it.id + (it.casa === /** @type {any} */ (pecas.get(it.id + 'a') || {}).casa ? 'a' : 'b'));
        const sai = pecas.get(it.id + (fica && String(fica.id).endsWith('a') ? 'b' : 'a'));
        const C = cel[it.casa];
        const lista = [];
        if (sai) {
          const D = cel[sai.casa];
          lista.push(sumir(pecas, sai, 0.2));
          seq.push(fazer(() => api.eventos.push({ tipo: 'pixels', x: D.cx, y: D.cy, j: it.jogador, qtd: 10, r: 0.6 })));
        }
        if (fica) {
          lista.push(animar(0.22, (k) => { fica.dados.real = k; }, CURVA.mola));
          seq.push(fazer(() => {
            fica.tipo = 'marca';
            fica.dados.par = -1;
            api.eventos.push({ tipo: 'clarao', x: C.cx, y: C.cy, j: it.jogador, r: 1.8 });
            api.eventos.push({ tipo: 'faisca', x: C.cx, y: C.cy, j: it.jogador, qtd: 10 });
          }));
        }
        seq.push(juntas(lista), esperar(0.07));
      }
      seq.push(esperar(0.15));
      return seq;
    }
    return null;
  },
  visual(api) {
    const E = api.E;
    const h = api.hover;
    const out = { sel: api.dados.sel === undefined ? -1 : api.dados.sel, realce: -1, colapso: null };
    if (api.vez.estado === 'vez' && E.colapso) {
      const m = E.marcas.find((q) => q.id === E.colapso.id);
      out.colapso = { a: E.colapso.a, b: E.colapso.b, jogador: m ? m.jogador : 0, minha: api.minhaVez };
      if (api.minhaVez && (h === E.colapso.a || h === E.colapso.b)) out.realce = h;
    } else if (api.minhaVez && h >= 0 && !E.classicas[h]) out.realce = h;
    return out;
  },
  hud(api) {
    if (!api.minhaVez) return {};
    if (api.E.colapso) return { texto: 'tec.escolha' };
    if (api.dados.sel >= 0) return { texto: 'tec.segunda' };
    return {};
  },
};

/** @param {any} o */
export function criarModo(o) {
  return criarModoTec(G, o);
}
