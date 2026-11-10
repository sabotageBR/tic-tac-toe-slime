// Regras do Modelo 8, Holo Cubo: cubo 3x3x3 com gravidade. O lance escolhe uma das 9 colunas e o
// bloco cai e empilha (ate 3). Casa = z * 9 + col, com col = r * 3 + c (r = 0 no fundo da vista)
// e z = 0 embaixo. Ha 49 linhas de 3 no cubo (13 direcoes).
// - linha: a primeira linha vence; cubo cheio sem linha = empate;
// - pontos: joga ate encher (27 blocos); vence quem fechou mais linhas.
// Estado imutavel.

import { outro } from '../tabuleiro.js';

/** @type {number[][]} */
export const LINHAS = (() => {
  const out = [];
  const dirs = [];
  for (let dz = -1; dz <= 1; dz++) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    // uma de cada par de direcoes opostas
    if (dz > 0 || (dz === 0 && (dr > 0 || (dr === 0 && dc > 0)))) dirs.push([dz, dr, dc]);
  }
  for (let z = 0; z < 3; z++) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    for (const [dz, dr, dc] of dirs) {
      const z2 = z + dz * 2;
      const r2 = r + dr * 2;
      const c2 = c + dc * 2;
      if (z2 < 0 || z2 > 2 || r2 < 0 || r2 > 2 || c2 < 0 || c2 > 2) continue;
      out.push([0, 1, 2].map((a) => (z + dz * a) * 9 + (r + dr * a) * 3 + (c + dc * a)));
    }
  }
  return out;
})();

/**
 * @typedef {{ donos: number[], alt: number[], vez: number, lances: number, prox: number }} EstadoCubo
 */

/** Linhas completas de cada jogador. @param {number[]} donos */
export function linhasDe(donos) {
  /** @type {Record<number, number[][]>} */
  const out = { 1: [], 2: [] };
  for (const l of LINHAS) {
    const j = donos[l[0]];
    if ((j === 1 || j === 2) && donos[l[1]] === j && donos[l[2]] === j) out[j].push(l);
  }
  return out;
}

/** Casa do centro do cubo (o nucleo neutro). */
export const CENTRO = 13;

/**
 * @param {'linha'|'pontos'} modo
 * @param {{ nucleo?: boolean }} [op]  nucleo: o centro do cubo e um bloco neutro fixo (tira a casa mais forte)
 */
export function criarRegras(modo = 'linha', op = {}) {
  const NUCLEO = !!op.nucleo;
  const TOTAL = NUCLEO ? 26 : 27;
  /** quantos blocos cabem na coluna e em que andar cai o proximo */
  const cabe = (col) => (NUCLEO && col === 4 ? 2 : 3);
  const andar = (col, alt) => (NUCLEO && col === 4 && alt === 1 ? 2 : alt);
  /** @param {{ comeca?: number }} [o] @returns {EstadoCubo} */
  function inicial(o = {}) {
    const E = { donos: new Array(27).fill(0), alt: new Array(9).fill(0), vez: o.comeca || 1, lances: 0, prox: 1 };
    if (NUCLEO) E.donos[CENTRO] = 3;
    return E;
  }

  /** @param {EstadoCubo} E */
  function resultado(E) {
    if (modo === 'linha') {
      for (const l of LINHAS) {
        const j = E.donos[l[0]];
        if ((j === 1 || j === 2) && E.donos[l[1]] === j && E.donos[l[2]] === j) return { vencedor: j, linha: l };
      }
      return E.lances >= TOTAL ? { vencedor: 0 } : null;
    }
    if (E.lances < TOTAL) return null;
    const ls = linhasDe(E.donos);
    const a = ls[1].length;
    const b = ls[2].length;
    return { vencedor: a > b ? 1 : b > a ? 2 : 0, pontos: { 1: a, 2: b }, linhas: ls };
  }

  /** @param {EstadoCubo} E */
  function jogadas(E) {
    if (resultado(E)) return [];
    const out = [];
    // o centro primeiro: a poda corta mais cedo
    for (const col of [4, 0, 2, 6, 8, 1, 3, 5, 7]) if (E.alt[col] < cabe(col)) out.push({ col });
    return out;
  }

  /** @param {EstadoCubo} E @param {{ col: number }} j */
  function aplicar(E, j) {
    const donos = E.donos.slice();
    const alt = E.alt.slice();
    const z = andar(j.col, alt[j.col]);
    const casa = z * 9 + j.col;
    donos[casa] = E.vez;
    alt[j.col]++;
    const id = E.prox;
    /** @type {any[]} */
    const efeitos = [{ tipo: 'cair', id, col: j.col, z, casa, jogador: E.vez }];
    if (modo === 'pontos') {
      for (const l of LINHAS) if (l.includes(casa) && l.every((i) => donos[i] === E.vez)) efeitos.push({ tipo: 'linha', casas: l, jogador: E.vez });
    }
    return { E: { ...E, donos, alt, vez: outro(E.vez), lances: E.lances + 1, prox: id + 1 }, efeitos };
  }

  /** @param {EstadoCubo} E */
  function chave(E) {
    return E.vez + ':' + E.donos.join('');
  }

  /** @param {EstadoCubo} E @param {number} j */
  function avaliar(E, j) {
    const o = outro(j);
    let v = 0;
    for (const l of LINHAS) {
      let a = 0;
      let b = 0;
      for (const i of l) {
        if (E.donos[i] === j) a++;
        else if (E.donos[i] === o) b++;
        else if (E.donos[i]) { a = 9; b = 9; }
      }
      if (a && !b) v += a === 3 ? 30 : a === 2 ? 6 : 1;
      else if (b && !a) v -= b === 3 ? 30 : b === 2 ? 6 : 1;
    }
    return v;
  }

  return { id: 'cubo', modo, nucleo: NUCLEO, inicial, jogadas, aplicar, resultado, chave, avaliar, cabe, andar };
}
