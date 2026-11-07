// Jogo da velha classico (o "original" de todos os modelos): n x n, k em linha, cada lance pinga
// uma gota numa casa livre. Estado imutavel: aplicar devolve um estado novo e os efeitos (o
// roteiro da fisica que o modo encena).

import { vencedor, cheio, livres, outro, linhasAbertas } from '../tabuleiro.js';

/**
 * @typedef {{ n: number, k: number, donos: number[], vez: number, lances: number, prox: number,
 *   pecas: Array<{ id: number, jogador: number, casa: number }> }} EstadoClassico
 */

/**
 * @param {{ n?: number, k?: number, comeca?: number }} [o]
 * @returns {EstadoClassico}
 */
export function inicial(o = {}) {
  const n = o.n || 3;
  return { n, k: o.k || n, donos: new Array(n * n).fill(0), vez: o.comeca || 1, lances: 0, prox: 1, pecas: [] };
}

/** @param {EstadoClassico} E */
export function jogadas(E) {
  if (resultado(E)) return [];
  return livres(E.donos).map((casa) => ({ casa }));
}

/** @param {EstadoClassico} E @param {{ casa: number }} j */
export function aplicar(E, j) {
  const donos = E.donos.slice();
  donos[j.casa] = E.vez;
  const id = E.prox;
  const F = { ...E, donos, vez: outro(E.vez), lances: E.lances + 1, prox: id + 1, pecas: [...E.pecas, { id, jogador: E.vez, casa: j.casa }] };
  return { E: F, efeitos: [{ tipo: 'pingar', id, casa: j.casa, jogador: E.vez }] };
}

/** @param {EstadoClassico} E */
export function resultado(E) {
  const v = vencedor(E.donos, E.n, E.k);
  if (v) return { vencedor: v.jogador, linha: v.linha };
  if (cheio(E.donos)) return { vencedor: 0 };
  return null;
}

/** @param {EstadoClassico} E */
export function chave(E) {
  return E.vez + ':' + E.donos.join('');
}

/** @param {EstadoClassico} E @param {number} j */
export function avaliar(E, j) {
  return linhasAbertas(E.donos, E.n, E.k, j);
}

export const REGRAS = { id: 'classico', inicial, jogadas, aplicar, resultado, chave, avaliar };
