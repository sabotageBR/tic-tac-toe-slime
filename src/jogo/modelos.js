// Registro dos modelos da avaliacao (?modelo=N). O 0 e o Classico puro (base dos testes).
import * as classico from './modos/classico.js';
import * as potes from './modos/potes.js';
import * as derrete from './modos/derrete.js';
import * as engole from './modos/engole.js';
import * as peteleco from './modos/peteleco.js';
import * as mega from './modos/mega.js';
import * as saga from './modos/saga.js';

/** @type {Record<string, { id: string, criarModo: (o: any) => any }>} */
export const MODELOS = {
  0: { id: 'classico', criarModo: classico.criarModo },
  1: { id: 'engole', criarModo: engole.criarModo },
  2: { id: 'peteleco', criarModo: peteleco.criarModo },
  3: { id: 'derrete', criarModo: derrete.criarModo },
  4: { id: 'mega', criarModo: mega.criarModo },
  5: { id: 'saga', criarModo: saga.criarModo },
  6: { id: 'potes', criarModo: potes.criarModo },
};
