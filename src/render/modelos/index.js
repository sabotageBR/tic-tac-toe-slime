// Desenhos proprios de cada modelo (o modo e puro; o main.js liga o desenho ao modo criado).
import { desenhoPotes } from './potes.js';
import { desenhoEngole } from './engole.js';
import { desenhoPeteleco } from './peteleco.js';

/** @type {Record<string, (modo: any) => any>} */
export const DESENHOS = {
  1: desenhoEngole,
  2: desenhoPeteleco,
  6: desenhoPotes,
};
