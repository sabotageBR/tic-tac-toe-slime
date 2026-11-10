// Registro dos modelos da avaliacao (?modelo=N). O 0 e o Classico puro (base dos testes).
// 1 a 6: serie slime (fisica de particulas). 7 a 12: Serie Tech (`tec: true`: sem slime, cena propria).
import * as classico from './modos/classico.js';
import * as potes from './modos/potes.js';
import * as derrete from './modos/derrete.js';
import * as engole from './modos/engole.js';
import * as peteleco from './modos/peteleco.js';
import * as mega from './modos/mega.js';
import * as saga from './modos/saga.js';
import * as sobrecarga from './tec/sobrecarga.js';

/** @type {Record<string, { id: string, tec?: boolean, criarModo: (o: any) => any }>} */
export const MODELOS = {
  0: { id: 'classico', criarModo: classico.criarModo },
  1: { id: 'engole', criarModo: engole.criarModo },
  2: { id: 'peteleco', criarModo: peteleco.criarModo },
  3: { id: 'derrete', criarModo: derrete.criarModo },
  4: { id: 'mega', criarModo: mega.criarModo },
  5: { id: 'saga', criarModo: saga.criarModo },
  6: { id: 'potes', criarModo: potes.criarModo },
  9: { id: 'sobrecarga', tec: true, criarModo: sobrecarga.criarModo },
};
