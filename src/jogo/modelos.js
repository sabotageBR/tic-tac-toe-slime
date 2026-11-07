// Registro dos modelos da avaliacao (?modelo=N). O 0 e o Classico puro (base dos testes).
import * as classico from './modos/classico.js';
import * as potes from './modos/potes.js';

/** @type {Record<string, { id: string, criarModo: (o: any) => any }>} */
export const MODELOS = {
  0: { id: 'classico', criarModo: classico.criarModo },
  6: { id: 'potes', criarModo: potes.criarModo },
};
