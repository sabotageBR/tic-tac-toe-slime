// Regras do Modelo 11, Repulsor: tabuleiro n x n, k em linha. A peca nova entra numa casa vazia e o
// campo dela mexe nas outras:
// - repulsor: empurra as 8 vizinhas uma casa para fora, se a casa de tras estiver livre; quem e
//   empurrada para fora do tabuleiro e ejetada (some);
// - atrator: puxa para a casa vizinha quem esta a 2 casas em linha reta ou diagonal, se a casa do
//   meio estiver livre.
// Os movimentos sao resolvidos sobre o tabuleiro de antes do lance: cada direcao leva a uma casa
// diferente, entao dois movimentos nunca disputam o mesmo destino.
// Linha depois do campo: so de um lado = ele vence; dos dois = vence quem jogou. Teto de lances
// (ou tabuleiro cheio) = empate. Estado imutavel.

import { linhasDe, outro, linhasAbertas } from '../tabuleiro.js';

export const MAX_LANCES = 40;
const DIRS8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIRS4 = [[-1, 0], [0, -1], [0, 1], [1, 0]];

/**
 * @typedef {{ n: number, k: number, donos: number[], ids: number[], vez: number, lances: number, prox: number }} EstadoRepulsor
 * @typedef {{ id: number, jogador: number, de: number, para: number, fora: boolean, dr: number, dc: number }} Movimento
 */

/**
 * @param {number} n @param {number} k @param {'repulsor'|'atrator'} modo
 * @param {{ dirs?: number, teto?: number, maioria?: boolean }} [op]  dirs: 4 (ortogonais) ou 8; maioria: no teto vence quem tem mais pecas
 */
export function criarRegras(n = 4, k = 3, modo = 'repulsor', op = {}) {
  const DIRS = op.dirs === 8 ? DIRS8 : DIRS4;
  const TETO = op.teto || MAX_LANCES;
  /** @param {{ comeca?: number }} [o] @returns {EstadoRepulsor} */
  function inicial(o = {}) {
    return { n, k, donos: new Array(n * n).fill(0), ids: new Array(n * n).fill(0), vez: o.comeca || 1, lances: 0, prox: 1 };
  }

  /**
   * O que o campo de uma peca posta em `casa` faria (sem aplicar): as setas da previa.
   * @param {EstadoRepulsor} E @param {number} casa @returns {Movimento[]}
   */
  function prever(E, casa) {
    const r = Math.floor(casa / n);
    const c = casa % n;
    /** @type {Movimento[]} */
    const movs = [];
    const dentro = (a, b) => a >= 0 && a < n && b >= 0 && b < n;
    for (const [dr, dc] of DIRS) {
      if (modo === 'atrator') {
        const r2 = r + dr * 2;
        const c2 = c + dc * 2;
        if (!dentro(r2, c2)) continue;
        const de = r2 * n + c2;
        const para = (r + dr) * n + c + dc;
        if (E.donos[de] && !E.donos[para]) movs.push({ id: E.ids[de], jogador: E.donos[de], de, para, fora: false, dr: -dr, dc: -dc });
        continue;
      }
      const r1 = r + dr;
      const c1 = c + dc;
      if (!dentro(r1, c1)) continue;
      const de = r1 * n + c1;
      if (!E.donos[de]) continue;
      const r2 = r1 + dr;
      const c2 = c1 + dc;
      if (!dentro(r2, c2)) movs.push({ id: E.ids[de], jogador: E.donos[de], de, para: -1, fora: true, dr, dc });
      else if (!E.donos[r2 * n + c2]) movs.push({ id: E.ids[de], jogador: E.donos[de], de, para: r2 * n + c2, fora: false, dr, dc });
    }
    return movs;
  }

  /** @param {EstadoRepulsor} E */
  function resultado(E) {
    const quem = outro(E.vez); // quem acabou de jogar
    const ls = linhasDe(E.donos, n, k);
    if (ls[quem].length) return { vencedor: quem, linha: ls[quem][0] };
    if (ls[E.vez].length) return { vencedor: E.vez, linha: ls[E.vez][0] };
    let livre = false;
    let saldo = 0;
    for (let i = 0; i < E.donos.length; i++) {
      if (!E.donos[i]) livre = true;
      else saldo += E.donos[i] === 1 ? 1 : -1;
    }
    if (livre && E.lances < TETO) return null;
    if (op.maioria && saldo) return { vencedor: saldo > 0 ? 1 : 2, maioria: true };
    return { vencedor: 0 };
  }

  /** @param {EstadoRepulsor} E */
  function jogadas(E) {
    if (resultado(E)) return [];
    const out = [];
    for (let i = 0; i < E.donos.length; i++) if (!E.donos[i]) out.push({ casa: i });
    return out;
  }

  /** @param {EstadoRepulsor} E @param {{ casa: number }} j */
  function aplicar(E, j) {
    const donos = E.donos.slice();
    const ids = E.ids.slice();
    const movs = prever(E, j.casa);
    for (const m of movs) { donos[m.de] = 0; ids[m.de] = 0; }
    for (const m of movs) if (!m.fora) { donos[m.para] = m.jogador; ids[m.para] = m.id; }
    const id = E.prox;
    donos[j.casa] = E.vez;
    ids[j.casa] = id;
    const efeitos = [{ tipo: 'por', id, casa: j.casa, jogador: E.vez }];
    if (movs.length) efeitos.push(/** @type {any} */ ({ tipo: 'campo', casa: j.casa, jogador: E.vez, movs }));
    return { E: { ...E, donos, ids, vez: outro(E.vez), lances: E.lances + 1, prox: id + 1 }, efeitos };
  }

  /** @param {EstadoRepulsor} E */
  function chave(E) {
    return E.vez + ':' + E.donos.join('');
  }

  /** @param {EstadoRepulsor} E @param {number} j */
  function avaliar(E, j) {
    let pecas = 0;
    for (const d of E.donos) if (d) pecas += d === j ? 1 : -1;
    return linhasAbertas(E.donos, n, k, j) + pecas * (op.maioria ? 2 : 0.5);
  }

  return { id: modo, n, k, modo, inicial, jogadas, aplicar, resultado, chave, avaliar, prever };
}
