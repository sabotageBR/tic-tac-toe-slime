// Regras do Modelo 3, Velha Derrete: cada jogador tem no maximo 3 gotas no tabuleiro; no 4o lance a
// SUA mais velha derrete primeiro (e a casa dela fica proibida neste lance), a nova entra e so entao
// se confere a linha. Sem empate por tabuleiro cheio; empate so depois de MAX_LANCES.
// Onda de calor (submodo calor): sem o limite de 3, mas a cada 4 lances a gota mais velha do
// tabuleiro derrete.

import { vencedor, livres, outro, linhas } from '../tabuleiro.js';

export const MAX_LANCES = 40;

/**
 * @typedef {{ sub: string, donos: number[], filas: Record<number, Array<{ id: number, casa: number }>>,
 *   vez: number, lances: number, prox: number }} EstadoDerrete
 */

/** @param {string} sub @param {number} comeca @returns {EstadoDerrete} */
export function inicialDerrete(sub, comeca = 1) {
  return { sub, donos: new Array(9).fill(0), filas: { 1: [], 2: [] }, vez: comeca, lances: 0, prox: 1 };
}

const limite = (E) => (E.sub === 'calor' ? 99 : 3);

/** A gota da vez que derrete no proximo lance (ou null). @param {EstadoDerrete} E */
export function proximaADerreter(E) {
  const f = E.filas[E.vez];
  return f.length >= limite(E) ? f[0] : null;
}

/** @param {EstadoDerrete} E */
export function resultado(E) {
  const v = vencedor(E.donos, 3, 3);
  if (v) return { vencedor: v.jogador, linha: v.linha };
  if (E.lances >= MAX_LANCES) return { vencedor: 0 };
  if (!livres(E.donos).length) return { vencedor: 0 };
  return null;
}

/** @param {EstadoDerrete} E */
export function jogadas(E) {
  if (resultado(E)) return [];
  const velha = proximaADerreter(E);
  return livres(E.donos).filter((c) => !velha || c !== velha.casa).map((casa) => ({ casa }));
}

/** @param {EstadoDerrete} E @param {{ casa: number }} j */
export function aplicar(E, j) {
  const donos = E.donos.slice();
  const filas = { 1: E.filas[1].slice(), 2: E.filas[2].slice() };
  const efeitos = [];
  const eu = E.vez;
  if (filas[eu].length >= limite(E)) {
    const velha = /** @type {{ id: number, casa: number }} */ (filas[eu].shift());
    donos[velha.casa] = 0;
    efeitos.push({ tipo: 'derreter', id: velha.id, casa: velha.casa });
  }
  const id = E.prox;
  donos[j.casa] = eu;
  filas[eu].push({ id, casa: j.casa });
  efeitos.push({ tipo: 'pingar', id, casa: j.casa, jogador: eu });
  const F = { ...E, donos, filas, vez: outro(eu), lances: E.lances + 1, prox: id + 1 };
  // onda de calor: a cada 4 lances, a mais velha do tabuleiro (a que nasceu primeiro) derrete
  if (E.sub === 'calor' && F.lances % 4 === 0 && !vencedor(donos, 3, 3)) {
    const todas = [...filas[1], ...filas[2]].sort((a, b) => a.id - b.id);
    const v = todas[0];
    if (v && v.id !== id) {
      const dono = donos[v.casa];
      donos[v.casa] = 0;
      filas[dono] = filas[dono].filter((p) => p.id !== v.id);
      efeitos.push({ tipo: 'calor', id: v.id, casa: v.casa });
    }
  }
  return { E: F, efeitos };
}

/** @param {EstadoDerrete} E */
export function chave(E) {
  return E.vez + ':' + E.lances % 4 + ':' + E.donos.join('') + ':' + E.filas[1].map((p) => p.casa).join('') + '/' + E.filas[2].map((p) => p.casa).join('');
}

/**
 * Linhas abertas, sem contar a gota de cada lado que derrete no proximo lance dela.
 * @param {EstadoDerrete} E @param {number} j
 */
export function avaliar(E, j) {
  const d = E.donos.slice();
  for (const q of [1, 2]) {
    const f = E.filas[q];
    if (f.length >= limite(E)) d[f[0].casa] = 0;
  }
  let v = 0;
  const o = outro(j);
  for (const l of linhas(3, 3)) {
    let a = 0;
    let b = 0;
    for (const i of l) {
      if (d[i] === j) a++;
      else if (d[i] === o) b++;
    }
    if (a && !b) v += a === 2 ? 9 : 1;
    else if (b && !a) v -= b === 2 ? 9 : 1;
  }
  return v;
}

export const REGRAS_DERRETE = { id: 'derrete', jogadas, aplicar, resultado, chave, avaliar };
