// Regras do Modelo 12, Sincronia: o tabuleiro e o classico 3x3; o que muda e COMO se escolhe a casa
// (o scanner do modo, em tempo real). A regra so acrescenta a falha: travar o feixe numa casa
// ocupada passa a vez (`passar`). Teto de lances + falhas = empate. Estado imutavel.

import { REGRAS as CLASSICA } from './classica.js';
import { outro } from '../tabuleiro.js';

export const MAX_TENTATIVAS = 40;

/** @param {{ comeca?: number }} [o] */
export function inicial(o = {}) {
  return { ...CLASSICA.inicial({ comeca: o.comeca }), falhas: 0 };
}

/** @param {any} E */
export function resultado(E) {
  const r = CLASSICA.resultado(E);
  if (r) return r;
  return E.lances + E.falhas >= MAX_TENTATIVAS ? { vencedor: 0 } : null;
}

/** @param {any} E */
export function jogadas(E) {
  return resultado(E) ? [] : CLASSICA.jogadas(E);
}

/** Falha de sincronia: a vez passa sem marca. @param {any} E */
export function passar(E) {
  return { ...E, vez: outro(E.vez), falhas: E.falhas + 1 };
}

export const REGRAS = { id: 'sincronia', inicial, jogadas, aplicar: CLASSICA.aplicar, resultado, chave: CLASSICA.chave, avaliar: CLASSICA.avaliar, passar };
