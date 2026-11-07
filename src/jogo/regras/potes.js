// Regras do Modelo 6, Potes da Velha: nove potes no lugar das casas; cada lance despeja uma dose
// de goo da sua cor num pote. O pote que chega na linha de cheio fecha e e de quem tem mais gosma
// dentro (empate: de ninguem). Tres potes seus em linha vencem.
// Este modulo e o modelo LOGICO (a CPU pensa com ele). Na partida, a fisica mede o que ficou em
// cada pote depois de assentar e o modo troca o estado pelo medido (medido()), entao quem decide
// e a fisica (no Transborda, a sobra que cai no pote de baixo conta la).

import { vencedor, outro, linhas } from '../tabuleiro.js';

/**
 * Capacidade de cada pote (em doses) por submodo.
 * classico: uma dose enche; encher: 3; grandes: o meio 4, cantos 3, bordas 2; transborda: 3.
 */
export const CAPACIDADES = Object.freeze({
  classico: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  encher: [3, 3, 3, 3, 3, 3, 3, 3, 3],
  grandes: [3, 2, 3, 2, 4, 2, 3, 2, 3],
  transborda: [3, 3, 3, 3, 3, 3, 3, 3, 3],
});

/**
 * @typedef {{ sub: string, cap: number[], a: number[], b: number[], dono: number[], vez: number, lances: number, prox: number }} EstadoPotes
 *   a, b: doses (fracionarias depois da medida) de cada jogador em cada pote; dono: 0 aberto, 1/2, 3 = fechado sem dono
 */

/** @param {string} sub @param {number} comeca @returns {EstadoPotes} */
export function inicialPotes(sub, comeca = 1) {
  const cap = (CAPACIDADES[/** @type {keyof typeof CAPACIDADES} */ (sub)] || CAPACIDADES.encher).slice();
  return { sub, cap, a: new Array(9).fill(0), b: new Array(9).fill(0), dono: new Array(9).fill(0), vez: comeca, lances: 0, prox: 1 };
}

/** Quem e dono de um pote cheio. @param {number} a @param {number} b */
export function donoDe(a, b) {
  if (Math.abs(a - b) < 0.34) return 3;
  return a > b ? 1 : 2;
}

/** @param {EstadoPotes} E */
function donos(E) {
  return E.dono.map((d) => (d === 1 || d === 2 ? d : 0));
}

/** @param {EstadoPotes} E */
export function resultado(E) {
  const v = vencedor(donos(E), 3, 3);
  if (v) return { vencedor: v.jogador, linha: v.linha };
  if (E.dono.every((d) => d)) return { vencedor: 0 };
  // ninguem consegue mais fazer linha: empate (todas as linhas tem dono dos dois ou pote sem dono)
  return null;
}

/** @param {EstadoPotes} E */
export function jogadas(E) {
  if (resultado(E)) return [];
  const out = [];
  for (let i = 0; i < 9; i++) {
    if (!E.dono[i]) out.push({ casa: i });
    else if (E.sub === 'transborda' && cascataTemVaga(E, i)) out.push({ casa: i });
  }
  return out;
}

/** No Transborda, despejar num pote cheio manda a sobra para o de baixo (se houver um aberto). */
function cascataTemVaga(E, i) {
  for (let k = i + 3; k < 9; k += 3) if (!E.dono[k]) return true;
  return false;
}

/**
 * Uma dose de `quem` no pote i (cascata no Transborda). Muda E no lugar.
 * @param {EstadoPotes} E @param {number} i @param {number} quem
 */
function despejarLogico(E, i, quem) {
  let k = i;
  while (k < 9 && E.dono[k]) {
    if (E.sub !== 'transborda') return;
    k += 3;
  }
  if (k >= 9) return;
  if (quem === 1) E.a[k] += 1;
  else E.b[k] += 1;
  if (E.a[k] + E.b[k] >= E.cap[k] - 0.05) E.dono[k] = donoDe(E.a[k], E.b[k]);
}

/** @param {EstadoPotes} E @param {{ casa: number }} j */
export function aplicar(E, j) {
  const F = { ...E, a: E.a.slice(), b: E.b.slice(), dono: E.dono.slice(), vez: outro(E.vez), lances: E.lances + 1, prox: E.prox + 1 };
  despejarLogico(F, j.casa, E.vez);
  return { E: F, efeitos: [{ tipo: 'despejar', id: E.prox, casa: j.casa, jogador: E.vez }] };
}

/** @param {EstadoPotes} E */
export function chave(E) {
  return E.vez + E.sub + ':' + E.a.map((x) => Math.round(x)).join('') + '|' + E.b.map((x) => Math.round(x)).join('') + '|' + E.dono.join('');
}

/**
 * Heuristica: linhas com potes seus fechados valem muito; os abertos contam pela vantagem de doses.
 * @param {EstadoPotes} E @param {number} jogador
 */
export function avaliar(E, jogador) {
  const o = outro(jogador);
  let v = 0;
  for (const l of linhas(3, 3)) {
    let meu = 0;
    let dele = 0;
    let morta = false;
    for (const i of l) {
      const d = E.dono[i];
      if (d === jogador) meu += 1;
      else if (d === o) dele += 1;
      else if (d === 3) morta = true;
      else {
        const vant = (jogador === 1 ? E.a[i] - E.b[i] : E.b[i] - E.a[i]) / E.cap[i];
        if (vant > 0) meu += vant * 0.5;
        else dele += -vant * 0.5;
      }
    }
    if (morta) continue;
    if (meu && !dele) v += meu * meu * 3;
    else if (dele && !meu) v -= dele * dele * 3;
  }
  return v;
}

export const REGRAS_POTES = { id: 'potes', jogadas, aplicar, resultado, chave, avaliar, inicial: (o = {}) => inicialPotes(o.sub || 'encher', o.comeca || 1) };
