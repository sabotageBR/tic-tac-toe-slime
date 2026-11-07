// Base dos modelos de vez (Classico, Engole, Derrete, Mega, Saga, Potes): o mundo com a estante de
// nichos, a maquina de vez, a CPU, o toque nas casas, as pecas logicas ligadas aos slimes, a rede de
// seguranca e o encadeamento das partidas sem tela no meio (quem venceu comemora, as gotas
// derretem e a partida nova ja comeca). Cada modelo entra com ganchos (regras, estante, encenacao
// dos efeitos, toque com selecao, desenho extra).
// Logica pura: o modo nunca toca DOM, audio nem SDK; tudo sai por `eventos`.

import { criarMundo } from '../../fisica/mundo.js';
import { criarRng } from '../../core/rng.js';
import { criarEstante } from '../estante.js';
import { criarVez } from '../vez.js';
import { pingar, saltar, derreter, estourar, esperar, juntas, cuidar, rede } from '../gotas.js';

/** Teclado numerico: 7 8 9 em cima (casa 0 1 2). */
const NUMPAD = { 7: 0, 8: 1, 9: 2, 4: 3, 5: 4, 6: 5, 1: 6, 2: 7, 3: 8 };

/**
 * @typedef {Object} Gancho
 * @property {string} id
 * @property {string} titulo
 * @property {Array<{ id: string, nome: string, desc: string }>} submodos  o primeiro e o Classico
 * @property {(sub: string) => any} regras
 * @property {(sub: string) => any} [estante]  opcoes de criarEstante
 * @property {(sub: string, comeca: number) => any} [inicial]
 * @property {(api: any, ef: any, antes: any, depois: any) => (import('../gotas.js').Acao[]|null)} [encenar] null = o padrao
 * @property {(api: any, casa: number) => any} [toque]  jogada do toque (ou null: so selecionou)
 * @property {(api: any) => any} [visual]
 * @property {(api: any, dt: number) => void} [passo]
 * @property {(api: any) => void} [montar]  depois de criar o mundo (paredes extras, mao de pecas)
 * @property {(sub: string, ef: any) => number} [diametro]
 * @property {(api: any) => any[]} [paredesExtras]
 * @property {(est: any) => number[]} [janela]
 * @property {boolean} [semRede]
 * @property {(sub: string) => any} [geometria]  tabuleiro proprio no lugar da estante (mesma interface)
 * @property {(api: any) => any} [desenho]  desenhos do modelo (fundo, atras, topo) para a cena
 * @property {(api: any) => any} [hud]
 * @property {(api: any, acao: string) => boolean} [poder]
 */

/**
 * @param {Gancho} G
 * @param {{ semente?: number, regra?: string, doisJogadores?: boolean, nivel?: number, primeira?: boolean }} o
 */
export function criarModoVez(G, o = {}) {
  const semente = o.semente || 1;
  const rng = criarRng(semente * 7919 + 13);
  const sub = G.submodos.some((s) => s.id === o.regra) ? /** @type {string} */ (o.regra) : (G.submodos[1] || G.submodos[0]).id;
  const R = G.regras(sub);
  const est = G.geometria ? G.geometria(sub) : criarEstante(G.estante ? G.estante(sub) : {});
  const [cx0, cy0, cx1, cy1] = est.caixa;
  const janela = G.janela ? G.janela(est) : [cx0 - 0.7, cy0 - 0.7, cx1 + 0.7, cy1 + 0.9];
  const m = criarMundo({ semente, limites: [Math.min(-16, janela[0] - 2), Math.min(-8, janela[1] - 2), Math.max(16, janela[2] + 2), Math.max(34, janela[3] + 4)] });
  /** @type {any[]} */
  const eventos = [];
  const ctx = { m, eventos };
  /** pecas logicas (id) -> slime e casa */
  /** @type {Map<number, { s: any, casa: number, jogador: number }>} */
  const pecas = new Map();
  const placar = { 1: 0, 2: 0, 0: 0 };
  let partidas = 0;
  let comeca = 1;
  let hover = -1;
  let cursor = 4;
  let limpando = false;
  let tempo = 0;
  const dois = !!o.doisJogadores;
  let primeira = !!o.primeira;

  const inicial = (c) => (G.inicial ? G.inicial(sub, c) : R.inicial({ comeca: c }));
  /** @type {any} */
  let vez = null;

  const api = {
    m, ctx, est, eventos, pecas, sub, R, rng, janela,
    /** dados livres do modelo */
    dados: /** @type {Record<string, any>} */ ({}),
    get vez() { return vez; },
    get E() { return vez.E; },
    get hover() { return hover; },
    /** a pessoa (nao a CPU) tem a vez agora */
    get minhaVez() { return vez.estado === 'vez' && !cpu(vez.E.vez); },
    diametro: (ef) => (G.diametro ? G.diametro(sub, ef) : Math.min(est.vao * 0.66, 3.0)),
    /** encenacao padrao de um efeito */
    padrao: (ef) => encenarPadrao(ef),
  };

  /** @param {number} j */
  function cpu(j) {
    return !dois && j === 2;
  }

  /** @param {any} ef @returns {import('../gotas.js').Acao[]} */
  function encenarPadrao(ef) {
    if (ef.tipo === 'pingar') {
      const d = api.diametro(ef);
      const [x, y] = est.pingo(ef.casa, d);
      const a = pingar(ctx, { x, y, d, jogador: ef.jogador, id: ef.id, apos: (s) => pecas.set(ef.id, { s, casa: ef.casa, jogador: ef.jogador }) });
      return [a];
    }
    if (ef.tipo === 'derreter') {
      const p = pecas.get(ef.id);
      if (!p) return [];
      pecas.delete(ef.id);
      return [derreter(ctx, { s: p.s })];
    }
    if (ef.tipo === 'estourar') {
      const p = pecas.get(ef.id);
      if (!p) return [];
      pecas.delete(ef.id);
      return [estourar(ctx, { s: p.s })];
    }
    if (ef.tipo === 'saltar') {
      const p = pecas.get(ef.id);
      if (!p) return [];
      p.casa = ef.casa;
      const C = est.celulas[ef.casa];
      return [saltar(ctx, { s: p.s, x: C.cx, y: C.y0 + p.s.raio0 + 0.3 })];
    }
    return [];
  }

  /** @param {any[]} efeitos @param {any} antes @param {any} depois */
  function encenar(efeitos, antes, depois) {
    const out = [];
    for (const ef of efeitos) {
      const proprio = G.encenar ? G.encenar(api, ef, antes, depois) : null;
      out.push(...(proprio || encenarPadrao(ef)));
    }
    return out;
  }

  function novaVez() {
    vez = criarVez({ R, E: inicial(comeca), rng, eventos, cpu, nivel: o.nivel === undefined ? 2 : o.nivel, poupar: primeira, encenar });
  }

  m.definirParedes([...est.paredes, ...(G.paredesExtras ? G.paredesExtras(api) : [])]);
  novaVez();
  if (G.montar) G.montar(api);
  eventos.push({ tipo: 'nivel', acao: 'start', modelo: G.id, regra: sub });

  /** Fim da partida: comemoracao, derrete tudo e a proxima ja comeca (sem tela). */
  function cuidarDoFim() {
    const res = vez.resultado;
    if (!res) return;
    if (vez.tFim < 0.02 && !limpando) {
      placar[res.vencedor]++;
      partidas++;
      for (const p of pecas.values()) {
        if (!p.s.ativo) continue;
        if (!res.vencedor) continue;
        const ganhou = p.jogador === res.vencedor;
        p.s.dados.expr = ganhou ? 'feliz' : 'chorinho';
        p.s.dados.exprT = 2.6;
      }
      if (res.vencedor) {
        eventos.push({ tipo: 'som', nome: cpu(res.vencedor) ? 'perdeu' : 'venceu' });
        eventos.push({ tipo: 'voz', id: dois ? 'vozVenceuSlime' : cpu(res.vencedor) ? 'vozPerdeuSlime' : 'vozVenceuSlime' });
      } else {
        eventos.push({ tipo: 'som', nome: 'empate' });
      }
      eventos.push({ tipo: 'nivel', acao: res.vencedor === 1 || dois ? 'complete' : 'fail', modelo: G.id, regra: sub });
      limpando = true;
      return;
    }
    if (limpando && vez.tFim > 2.2 && vez.filaVazia && !api.dados.derretendoTudo) {
      api.dados.derretendoTudo = true;
      const lista = [];
      for (const s of m.slimes) if (s.ativo && !s.dados.fixo) lista.push(derreter(ctx, { s, dur: 0.6 }));
      vez.encenar(juntas(lista), esperar(0.15), {
        nome: 'nova',
        passo() {
          pecas.clear();
          if (G.montar) G.montar(api);
          comeca = comeca === 1 ? 2 : 1;
          primeira = false;
          vez.poupar = false;
          vez.reiniciar(inicial(comeca));
          limpando = false;
          api.dados.derretendoTudo = false;
          eventos.push({ tipo: 'nivel', acao: 'start', modelo: G.id, regra: sub });
          eventos.push({ tipo: 'voz', id: 'vozProntoSlime' });
          return true;
        },
      });
    }
  }

  /** @param {number} casa */
  function tocarCasa(casa) {
    if (casa < 0 || !api.minhaVez) return false;
    const j = G.toque ? G.toque(api, casa) : { casa };
    if (!j) return false;
    const ok = vez.jogar(j);
    if (!ok) eventos.push({ tipo: 'som', nome: 'recusa' });
    return ok;
  }

  const modo = {
    id: G.id,
    titulo: G.titulo,
    submodos: G.submodos,
    regra: sub,
    mundo: m,
    janela,
    campoJanela: janela,
    eventos,
    tabuleiro: est,
    api,
    desenho: G.desenho ? G.desenho(api) : null,
    multi: () => false,
    /** @param {number} dt */
    passo(dt) {
      tempo += dt;
      m.avancar(4);
      m.medir(dt);
      cuidar(m, eventos, dt);
      vez.passo(dt);
      if (G.passo) G.passo(api, dt);
      if (!G.semRede) rede(m, [...pecas.values()], est, dt);
      cuidarDoFim();
    },
    /**
     * @param {number} x @param {number} y @param {'baixo'|'mover'|'cima'} fase
     */
    apontar(x, y, fase) {
      const casa = est.celulaEm(x, y);
      hover = casa;
      if (fase === 'baixo') tocarCasa(casa);
    },
    /** @param {string} codigo @param {boolean} baixo */
    tecla(codigo, baixo) {
      if (!baixo) return;
      const dig = /^(?:Digit|Numpad)(\d)$/.exec(codigo);
      const n = est.cols;
      if (dig && n === 3) {
        const k = NUMPAD[/** @type {keyof typeof NUMPAD} */ (dig[1])];
        if (k !== undefined) { cursor = k; hover = k; tocarCasa(k); }
        return;
      }
      const tot = est.cols * est.rows;
      if (codigo === 'ArrowLeft') cursor = (cursor + tot - 1) % tot;
      else if (codigo === 'ArrowRight') cursor = (cursor + 1) % tot;
      else if (codigo === 'ArrowUp') cursor = (cursor + tot - n) % tot;
      else if (codigo === 'ArrowDown') cursor = (cursor + n) % tot;
      else if (codigo === 'Enter' || codigo === 'Space') { tocarCasa(cursor); return; }
      else return;
      hover = cursor;
    },
    /** O bot (?auto, testes): joga pela pessoa da vez. */
    bot() {
      if (!api.minhaVez) return false;
      const j = vez.sugerir(1);
      return vez.jogar(j);
    },
    hud() {
      const E = vez.E;
      return {
        titulo: G.titulo,
        regra: sub,
        vez: E.vez,
        cpu: { 1: cpu(1), 2: cpu(2) },
        estado: vez.estado,
        placar: { ...placar },
        partidas,
        resultado: vez.resultado,
        minhaVez: api.minhaVez,
        ...(G.hud ? G.hud(api) : {}),
      };
    },
    visual() {
      const res = vez.resultado;
      const livres = api.minhaVez ? new Set(vez.jogadas.map((j) => (j.casa !== undefined ? j.casa : j.para))) : new Set();
      return {
        realce: api.minhaVez && livres.has(hover) ? hover : -1,
        corVez: vez.E.vez,
        linha: res && res.vencedor && res.linha ? { casas: res.linha, jogador: res.vencedor } : null,
        ...(G.visual ? G.visual(api) : {}),
      };
    },
    reiniciar() {
      for (const s of m.slimes) if (s.ativo) m.remover(s);
      pecas.clear();
      comeca = 1;
      limpando = false;
      api.dados = {};
      m.definirParedes([...est.paredes, ...(G.paredesExtras ? G.paredesExtras(api) : [])]);
      novaVez();
      if (G.montar) G.montar(api);
      eventos.push({ tipo: 'nivel', acao: 'start', modelo: G.id, regra: sub });
    },
    /** @param {string} acao */
    poder(acao) {
      if (G.poder) return G.poder(api, acao);
      return false;
    },
    salvar() { return null; },
    get estado() { return vez.estado; },
    get E() { return vez.E; },
    /** jogada direta (testes) @param {any} j */
    jogar(j) { return vez.jogar(j); },
  };
  return modo;
}
