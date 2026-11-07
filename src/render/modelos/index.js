// Desenhos proprios de cada modelo (o modo e puro; o main.js liga o desenho ao modo criado).
import { desenhoPotes } from './potes.js';

/** @type {Record<string, (modo: any) => any>} */
export const DESENHOS = {
  6: desenhoPotes,
};
