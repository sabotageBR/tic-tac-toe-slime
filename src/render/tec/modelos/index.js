// Desenhos da Serie Tech, por id do modelo (o submodo "classico" de todos usa o desenhoClassico).
// Cada desenho e { fundo(g), topo(g) } com g = { ctx, cam, dpr, t, modo, vis, palco, geo, W, H,
// tema, vivo } e o contexto ja com a camera aplicada (unidades do mundo, y para cima).
import { desenhoClassico } from './classico.js';
import { desenhoSobrecarga } from './sobrecarga.js';

/** @type {Record<string, { fundo?: (g: any) => void, topo?: (g: any) => void }>} */
export const DESENHOS_TEC = {
  classico: desenhoClassico,
  sobrecarga: desenhoSobrecarga,
};
