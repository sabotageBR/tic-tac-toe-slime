// Base da Serie Tech (modelos 7 a 12): irma do criarModoVez sem mundo de particulas, estante nem
// gotas. Junta a grade, a maquina de vez, a CPU, o toque nas casas, o PALCO (pecas com posicao,
// escala e alfa animadas por acoes na fila) e o encadeamento das partidas sem tela no meio.
// Cada versao entra com ganchos (regras, geometria, encenacao dos efeitos, toque, passo, visual).
// O submodo "classico" de toda versao e o 3x3 comum, resolvido aqui.
// Logica pura: o modo nunca toca DOM, audio nem SDK; tudo sai por `eventos`.

import { criarRng } from '../../core/rng.js';
import { criarVez } from '../vez.js';
import { REGRAS as CLASSICA } from '../regras/classica.js';
import { criarGrade } from './grade.js';
import { criarPeca, surgir, sumir, animar, esperar, juntas, CURVA } from './acoes.js';

/** Teclado numerico: 7 8 9 em cima (casa 0 1 2). */
const NUMPAD = { 7: 0, 8: 1, 9: 2, 4: 3, 5: 4, 6: 5, 1: 6, 2: 7, 3: 8 };

/**
 * @typedef {Object} GanchoTec
 * @property {string} id
 * @property {Array<{ id: string }>} submodos  o primeiro e o classico
 * @property {(sub: string) => any} regras
 * @property {(sub: string) => any} [geometria]  grade (ou algo com cols, rows, celulas, caixa, celulaEm)
 * @property {(geo: any, sub: string) => number[]} [janela]
 * @property {(sub: string, comeca: number) => any} [inicial]
 * @property {(api: any, ef: any, antes: any, depois: any) => (import('./acoes.js').Acao[]|null)} [encenar]
 * @property {(api: any, casa: number) => any} [toque]  jogada do toque (ou null: so selecionou)
 * @property {(api: any, x: number, y: number, fase: string) => boolean} [apontar]  true = tratado
 * @property {(api: any, codigo: string) => boolean} [tecla]  true = tratado
 * @property {(api: any, dt: number) => void} [passo]
 * @property {(api: any) => void} [montar]  no comeco de cada partida (zera o visual proprio)
 * @property {(api: any) => any} [visual]
 * @property {(api: any) => any} [hud]
 * @property {(api: any) => boolean} [bot]
 * @property {(api: any, j: any) => number[][]} [toques]  pontos do mundo que fazem a jogada j
 * @property {(api: any, res: any) => number[]} [linhaCasas]
 * @property {boolean} [cpuManual]  a CPU joga pelo `passo` do gancho (Sincronia)
 * @property {boolean} [semPoupar]
 * @property {number} [orcamento]  nos da busca
 */

/** O classico de toda versao tech. */
const CLASSICO = {
  regras: () => CLASSICA,
};

/**
 * @param {GanchoTec} G0
 * @param {{ semente?: number, regra?: string, doisJogadores?: boolean, nivel?: number, primeira?: boolean }} o
 */
export function criarModoTec(G0, o = {}) {
  const semente = o.semente || 1;
  const rng = criarRng(semente * 7919 + 13);
  const sub = G0.submodos.some((s) => s.id === o.regra) ? /** @type {string} */ (o.regra) : (G0.submodos[1] || G0.submodos[0]).id;
  /** @type {GanchoTec} */
  const G = sub === 'classico' ? /** @type {any} */ ({ ...CLASSICO, id: G0.id, submodos: G0.submodos }) : G0;
  const R = G.regras(sub);
  const geo = G.geometria ? G.geometria(sub) : criarGrade({ cols: 3, rows: 3, vao: 3 });
  const [cx0, cy0, cx1, cy1] = geo.caixa;
  const janela = G.janela ? G.janela(geo, sub) : [cx0 - 0.8, cy0 - 0.8, cx1 + 0.8, cy1 + 0.8];
  /** @type {any[]} */
  const eventos = [];
  /** o que o desenho le: pecas e o estado visual proprio de cada versao */
  const palco = {
    /** @type {Map<any, import('./acoes.js').Peca>} */
    pecas: new Map(),
    /** tempo do palco (s) */
    t: 0,
    /** 0..1: a partida que acabou se desmaterializa */
    apagar: 0,
  };
  const placar = { 1: 0, 2: 0, 0: 0 };
  let partidas = 0;
  let comeca = 1;
  let hover = -1;
  let cursor = Math.floor((geo.cols * geo.rows) / 2);
  let limpando = false;
  let saindo = false;
  const dois = !!o.doisJogadores;
  let primeira = !!o.primeira;

  const inicial = (c) => (G.inicial ? G.inicial(sub, c) : R.inicial({ comeca: c }));
  /** @type {any} */
  let vez = null;

  /** @param {number} j */
  const cpu = (j) => !dois && j === 2;

  const api = {
    geo, est: geo, eventos, palco, pecas: palco.pecas, sub, R, rng, janela, placar, dois, cpu,
    nivel: o.nivel === undefined ? 2 : o.nivel,
    /** dados livres da versao */
    dados: /** @type {Record<string, any>} */ ({}),
    get vez() { return vez; },
    get E() { return vez.E; },
    get hover() { return hover; },
    /** a pessoa (nao a CPU) tem a vez agora */
    get minhaVez() { return vez.estado === 'vez' && !cpu(vez.E.vez); },
    /** encenacao padrao de um efeito */
    padrao: (ef) => encenarPadrao(ef),
    /** @param {string} nome @param {any} [p] */
    som(nome, p) { eventos.push({ tipo: 'som', nome, p }); },
  };

  /** @param {any} ef @returns {import('./acoes.js').Acao[]} */
  function encenarPadrao(ef) {
    if (ef.tipo === 'pingar') {
      const C = geo.celulas[ef.casa];
      const p = criarPeca(palco.pecas, { id: ef.id, jogador: ef.jogador, casa: ef.casa, x: C.cx, y: C.cy });
      eventos.push({ tipo: 'som', nome: 'tecMarca', p: { j: ef.jogador } });
      eventos.push({ tipo: 'faisca', x: C.cx, y: C.cy, j: ef.jogador, qtd: 8 });
      return [surgir(p, 0.26)];
    }
    if (ef.tipo === 'derreter' || ef.tipo === 'estourar') {
      const p = palco.pecas.get(ef.id);
      return p ? [sumir(palco.pecas, p, 0.25)] : [];
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
    vez = criarVez({
      R, E: inicial(comeca), rng, eventos, cpu: G.cpuManual ? () => false : cpu, nivel: api.nivel,
      poupar: primeira && !G.semPoupar, orcamento: G.orcamento, encenar,
    });
  }

  novaVez();
  if (G.montar) G.montar(api);
  eventos.push({ tipo: 'nivel', acao: 'start', modelo: G.id, regra: sub });

  /** Fim da partida: comemora, desmaterializa tudo e a proxima ja comeca (sem tela). */
  function cuidarDoFim() {
    const res = vez.resultado;
    if (!res) return;
    if (!limpando) {
      placar[res.vencedor]++;
      partidas++;
      if (res.vencedor) eventos.push({ tipo: 'som', nome: cpu(res.vencedor) ? 'tecPerdeu' : 'tecVenceu' });
      else eventos.push({ tipo: 'som', nome: 'tecEmpate' });
      eventos.push({ tipo: 'nivel', acao: res.vencedor === 1 || dois ? 'complete' : 'fail', modelo: G.id, regra: sub });
      limpando = true;
      return;
    }
    if (vez.tFim > 2.1 && vez.filaVazia && !saindo) {
      saindo = true;
      eventos.push({ tipo: 'som', nome: 'tecLimpa' });
      const lista = [animar(0.45, (k) => { palco.apagar = k; }, CURVA.linear)];
      for (const p of palco.pecas.values()) lista.push(sumir(palco.pecas, p, 0.4));
      vez.encenar(juntas(lista), esperar(0.12), {
        nome: 'nova',
        passo() {
          palco.pecas.clear();
          palco.apagar = 0;
          comeca = comeca === 1 ? 2 : 1;
          primeira = false;
          vez.poupar = false;
          api.dados = {};
          vez.reiniciar(inicial(comeca));
          if (G.montar) G.montar(api);
          limpando = false;
          saindo = false;
          eventos.push({ tipo: 'nivel', acao: 'start', modelo: G.id, regra: sub });
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
    if (!ok) eventos.push({ tipo: 'som', nome: 'tecRecusa' });
    return ok;
  }

  const modo = {
    id: G0.id,
    tec: true,
    submodos: G0.submodos,
    regra: sub,
    /** stub: os testes e o ?debug leem o mundo de particulas (aqui nao ha) */
    mundo: { paredes: [], slimes: [], n: 0 },
    janela,
    campoJanela: janela,
    eventos,
    tabuleiro: geo,
    palco,
    api,
    desenho: null,
    multi: () => false,
    /** @param {number} dt */
    passo(dt) {
      palco.t += dt;
      for (const p of palco.pecas.values()) p.t += dt;
      vez.passo(dt);
      if (G.passo) G.passo(api, dt);
      cuidarDoFim();
    },
    /** @param {number} x @param {number} y @param {'baixo'|'mover'|'cima'} fase */
    apontar(x, y, fase) {
      const casa = geo.celulaEm(x, y);
      hover = casa;
      if (G.apontar && G.apontar(api, x, y, fase)) return;
      if (fase === 'baixo') tocarCasa(casa);
    },
    /** @param {string} codigo @param {boolean} baixo */
    tecla(codigo, baixo) {
      if (!baixo) return;
      if (G.tecla && G.tecla(api, codigo)) return;
      const dig = /^(?:Digit|Numpad)(\d)$/.exec(codigo);
      const n = geo.cols;
      if (dig && n === 3 && geo.rows === 3) {
        const k = NUMPAD[/** @type {keyof typeof NUMPAD} */ (dig[1])];
        if (k !== undefined) { cursor = k; hover = k; tocarCasa(k); }
        return;
      }
      const tot = geo.cols * geo.rows;
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
      if (G.bot) return G.bot(api);
      if (!api.minhaVez) return false;
      return vez.jogar(vez.sugerir(1));
    },
    /** Pontos do mundo que, tocados em ordem, fazem a jogada j (tools/jogar.mjs). @param {any} j */
    toques(j) {
      if (G.toques) return G.toques(api, j);
      const C = geo.celulas[j.casa !== undefined ? j.casa : j.para];
      return C ? [[C.cx, C.cy]] : [];
    },
    hud() {
      const E = vez.E;
      return {
        regra: sub,
        vez: E.vez,
        cpu: { 1: cpu(1), 2: cpu(2) },
        estado: vez.estado,
        placar: { ...placar },
        partidas,
        resultado: vez.resultado,
        minhaVez: api.minhaVez,
        ...(sub === 'classico' ? { dica: { chave: 'tec.classico.dica' } } : {}),
        ...(G.hud ? G.hud(api) : {}),
      };
    },
    visual() {
      const res = vez.resultado;
      const livres = api.minhaVez ? new Set(vez.jogadas.map((j) => (j.casa !== undefined ? j.casa : j.para))) : new Set();
      return {
        realce: api.minhaVez && livres.has(hover) ? hover : -1,
        hover,
        corVez: vez.E.vez,
        estado: vez.estado,
        minhaVez: api.minhaVez,
        tFim: res ? vez.tFim : 0,
        linha: res && res.vencedor && res.linha ? { casas: G.linhaCasas ? G.linhaCasas(api, res) : res.linha, jogador: res.vencedor } : null,
        ...(G.visual ? G.visual(api) : {}),
      };
    },
    reiniciar() {
      palco.pecas.clear();
      palco.apagar = 0;
      comeca = 1;
      limpando = false;
      saindo = false;
      api.dados = {};
      novaVez();
      if (G.montar) G.montar(api);
      eventos.push({ tipo: 'nivel', acao: 'start', modelo: G.id, regra: sub });
    },
    poder() { return false; },
    salvar() { return null; },
    get estado() { return vez.estado; },
    get E() { return vez.E; },
    /** jogada direta (testes) @param {any} j */
    jogar(j) { return vez.jogar(j); },
  };
  return modo;
}
