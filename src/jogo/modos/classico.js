// Classico puro (a base dos testes e o submodo "Classico" de quem nao tem outro desenho).
import { criarModoVez } from './base.js';
import { REGRAS } from '../regras/classica.js';

export const GANCHO_CLASSICO = {
  id: 'classico',
  titulo: 'Classico',
  submodos: [{ id: 'classico', nome: 'classico', desc: '' }],
  regras: () => REGRAS,
};

/** @param {any} o */
export function criarModo(o) {
  return criarModoVez(GANCHO_CLASSICO, { ...o, regra: 'classico' });
}
