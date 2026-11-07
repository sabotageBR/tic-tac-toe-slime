// Regras do Modelo 4, Mega Velha (o "ultimate"): 9 velhinhas num 9x9. A casa local em que voce joga
// manda o rival para a velhinha de mesma posicao; se ela ja fechou, ele escolhe qualquer uma aberta.
// Fechou 3 em linha numa velhinha: ela e sua (as 3 gotas viram um slimao). Velhinha cheia sem linha:
// de ninguem. Vence quem fizer 3 velhinhas em linha; sem isso, quem tiver mais velhinhas.
// Casa i = R * 9 + C (R = 0 em cima); velhinha b = (R / 3) * 3 + C / 3; posicao local = (R % 3) * 3 + C % 3.

import { vencedor, outro, linhas } from '../tabuleiro.js';

/** @typedef {{ sub: string, donos: number[], minis: number[], vez: number, alvo: number, lances: number, prox: number, ids: number[] }} EstadoMega */

/** @param {number} i */
export const miniDe = (i) => ((((i / 9) | 0) / 3) | 0) * 3 + (((i % 9) / 3) | 0);
/** @param {number} i */
export const localDe = (i) => (((i / 9) | 0) % 3) * 3 + (i % 9) % 3;
/** casa global da posicao local l da velhinha b @param {number} b @param {number} l */
export const casaDe = (b, l) => (((b / 3) | 0) * 3 + ((l / 3) | 0)) * 9 + (b % 3) * 3 + (l % 3);

/** @param {string} sub @param {number} comeca @returns {EstadoMega} */
export function inicialMega(sub, comeca = 1) {
  return { sub, donos: new Array(81).fill(0), minis: new Array(9).fill(0), vez: comeca, alvo: -1, lances: 0, prox: 1, ids: new Array(81).fill(0) };
}

/** @param {EstadoMega} E @param {number} b */
function donosDaMini(E, b) {
  const out = [];
  for (let l = 0; l < 9; l++) out.push(E.donos[casaDe(b, l)]);
  return out;
}

/** @param {EstadoMega} E */
export function resultado(E) {
  const d = E.minis.map((x) => (x === 1 || x === 2 ? x : 0));
  const v = vencedor(d, 3, 3);
  if (v) return { vencedor: v.jogador, linha: v.linha, minis: true };
  if (E.minis.every((x) => x)) {
    const a = E.minis.filter((x) => x === 1).length;
    const b = E.minis.filter((x) => x === 2).length;
    return { vencedor: a > b ? 1 : b > a ? 2 : 0, minis: true };
  }
  return null;
}

/** Velhinhas onde a vez pode jogar. @param {EstadoMega} E */
export function minisPermitidas(E) {
  if (E.alvo >= 0 && !E.minis[E.alvo]) return [E.alvo];
  const out = [];
  for (let b = 0; b < 9; b++) if (!E.minis[b]) out.push(b);
  return out;
}

/** @param {EstadoMega} E */
export function jogadas(E) {
  if (resultado(E)) return [];
  const out = [];
  for (const b of minisPermitidas(E)) {
    for (let l = 0; l < 9; l++) {
      const casa = casaDe(b, l);
      if (!E.donos[casa]) out.push({ casa });
    }
  }
  return out;
}

/** @param {EstadoMega} E @param {{ casa: number }} j */
export function aplicar(E, j) {
  const donos = E.donos.slice();
  const minis = E.minis.slice();
  const ids = E.ids.slice();
  const eu = E.vez;
  const id = E.prox;
  donos[j.casa] = eu;
  ids[j.casa] = id;
  const efeitos = [{ tipo: 'pingar', id, casa: j.casa, jogador: eu }];
  const b = miniDe(j.casa);
  const F = { ...E, donos, minis, ids, vez: outro(eu), lances: E.lances + 1, prox: id + 1, alvo: localDe(j.casa) };
  const dm = donosDaMini(F, b);
  const v = vencedor(dm, 3, 3);
  if (v) {
    minis[b] = eu;
    const casas = [];
    for (let l = 0; l < 9; l++) casas.push(casaDe(b, l));
    efeitos.push({ tipo: 'fechar', mini: b, jogador: eu, linha: v.linha.map((l) => ids[casaDe(b, l)]), todas: casas.map((c) => ids[c]).filter(Boolean) });
  } else if (dm.every((x) => x)) {
    minis[b] = 3;
    const todas = [];
    for (let l = 0; l < 9; l++) todas.push(ids[casaDe(b, l)]);
    efeitos.push({ tipo: 'empateMini', mini: b, todas });
  }
  if (minis[F.alvo]) F.alvo = -1;
  return { E: F, efeitos };
}

/** @param {EstadoMega} E */
export function chave(E) {
  return E.vez + ':' + E.alvo + ':' + E.donos.join('');
}

const PESO_MINI = [2, 1, 2, 1, 3, 1, 2, 1, 2];

/**
 * Heuristica: velhinhas ganhas (centro 3, canto 2, borda 1), linhas de velhinhas, ameacas de 2 em
 * linha dentro das abertas e a liberdade de escolha dada ao rival.
 * @param {EstadoMega} E @param {number} j
 */
export function avaliar(E, j) {
  const o = outro(j);
  let v = 0;
  for (let b = 0; b < 9; b++) {
    if (E.minis[b] === j) v += 10 * PESO_MINI[b];
    else if (E.minis[b] === o) v -= 10 * PESO_MINI[b];
    else if (!E.minis[b]) {
      const dm = donosDaMini(E, b);
      for (const l of linhas(3, 3)) {
        let a = 0;
        let c = 0;
        for (const i of l) { if (dm[i] === j) a++; else if (dm[i] === o) c++; }
        if (a === 2 && !c) v += 2 * PESO_MINI[b];
        else if (c === 2 && !a) v -= 2 * PESO_MINI[b];
      }
    }
  }
  for (const l of linhas(3, 3)) {
    let a = 0;
    let c = 0;
    for (const b of l) { if (E.minis[b] === j) a++; else if (E.minis[b] === o) c++; else if (E.minis[b] === 3) { a = -9; c = -9; } }
    if (a === 2 && c === 0) v += 25;
    else if (c === 2 && a === 0) v -= 25;
  }
  // mandar o rival para uma velhinha fechada da a ele a escolha livre
  if (E.alvo < 0) v += E.vez === j ? 6 : -6;
  return v;
}

export const REGRAS_MEGA = { id: 'mega', jogadas, aplicar, resultado, chave, avaliar };
