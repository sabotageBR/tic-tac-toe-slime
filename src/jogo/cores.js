// Cores dos jogadores em pigmento de verdade (KM: [ciano, magenta, amarelo, preto]). Azul contra
// laranja: o par que mais se separa para quem nao ve vermelho/verde, e a costura entre os dois
// sai num verde-musgo bem visivel (a mistura KM). O cinza e o gelo/empate.

import { hexDaMistura } from '../cor/km.js';

export const PIGMENTOS = Object.freeze({
  1: Object.freeze([0.52, 0.06, 0, 0]),
  2: Object.freeze([0, 0.19, 0.8, 0]),
  /** cinza: empate no mini da Mega, slime congelado */
  0: Object.freeze([0.03, 0.03, 0.03, 0.12]),
});

/** @type {Readonly<Record<number, string>>} */
export const HEX = Object.freeze({
  1: hexDaMistura(PIGMENTOS[1]),
  2: hexDaMistura(PIGMENTOS[2]),
  0: hexDaMistura(PIGMENTOS[0]),
});

/** Cor de tinta (linha da vitoria, realce) de cada jogador, mais forte que a do corpo. */
export const TINTA_JOGADOR = Object.freeze({ 1: '#1f6fd6', 2: '#f07a1a', 0: '#6a6f7d' });
