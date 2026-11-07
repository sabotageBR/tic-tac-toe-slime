// Estante de nichos: o "#" do jogo da velha feito de paredes-capsula (vista de lado, gravidade
// para baixo). Cada casa e um nicho fechado (piso, teto e duas divisorias); a gota pinga do bico
// no teto do nicho, cai e assenta no piso. Cada segmento e uma parede propria, para abrir um piso
// ou uma divisoria so (moverParede) nos eventos.
// Casa i = r * cols + c, com r = 0 a linha de CIMA (a ordem de leitura do jogo da velha).

import { ESPESSURA } from '../fisica/paredes.js';

/**
 * @typedef {{ i: number, r: number, c: number, x0: number, x1: number, y0: number, y1: number, cx: number, cy: number }} Celula
 *   x0..x1, y0..y1: o vao livre por dentro (entre as faces das paredes)
 */

/**
 * @param {{ cols?: number, rows?: number, vao?: number, r?: number, grupo?: number, rGrupo?: number, folga?: number, y0?: number }} [o]
 *   vao: largura e altura livres de cada nicho (u); grupo: a cada `grupo` casas uma linha grossa (Mega)
 *   folga: espaco extra entre grupos (u)
 */
export function criarEstante(o = {}) {
  const cols = o.cols || 3;
  const rows = o.rows || 3;
  const vao = o.vao || 4.4;
  const r = o.r || ESPESSURA;
  const grupo = o.grupo || 0;
  const rG = o.rGrupo || r;
  const folga = o.folga || 0;
  const base = o.y0 || 0;
  // posicoes das linhas (eixo das capsulas): cada vao mede `vao` entre as faces
  /** raio da linha j (grossa entre grupos e na moldura) */
  const raioV = (j, n) => (grupo && (j % grupo === 0 || j === n) ? rG : r);
  const xs = [0];
  for (let j = 1; j <= cols; j++) xs.push(xs[j - 1] + raioV(j - 1, cols) + vao + raioV(j, cols) + (grupo && j % grupo === 0 && j < cols ? folga : 0));
  const ys = [0];
  for (let k = 1; k <= rows; k++) ys.push(ys[k - 1] + raioV(k - 1, rows) + vao + raioV(k, rows) + (grupo && k % grupo === 0 && k < rows ? folga : 0));
  const meio = xs[cols] / 2;
  for (let j = 0; j <= cols; j++) xs[j] -= meio;
  for (let k = 0; k <= rows; k++) ys[k] += base;

  /** @type {Array<{ ax: number, ay: number, bx: number, by: number, r: number, tipo: string, linha: number, faixa: number, grossa: boolean }>} */
  const paredes = [];
  /** horiz[k][c]: a linha horizontal k (0 = chao) no trecho da coluna c */
  const horiz = [];
  for (let k = 0; k <= rows; k++) {
    horiz.push([]);
    const rr = raioV(k, rows);
    for (let c = 0; c < cols; c++) {
      horiz[k].push(paredes.length);
      paredes.push({ ax: xs[c], ay: ys[k], bx: xs[c + 1], by: ys[k], r: rr, tipo: 'h', linha: k, faixa: c, grossa: rr > r });
    }
  }
  /** vert[j][k]: a linha vertical j (0 = esquerda) no trecho da fileira k (0 = de baixo) */
  const vert = [];
  for (let j = 0; j <= cols; j++) {
    vert.push([]);
    const rr = raioV(j, cols);
    for (let k = 0; k < rows; k++) {
      vert[j].push(paredes.length);
      paredes.push({ ax: xs[j], ay: ys[k], bx: xs[j], by: ys[k + 1], r: rr, tipo: 'v', linha: j, faixa: k, grossa: rr > r });
    }
  }

  /** @type {Celula[]} */
  const celulas = [];
  for (let rIdx = 0; rIdx < rows; rIdx++) {
    const k = rows - 1 - rIdx;
    for (let c = 0; c < cols; c++) {
      const x0 = xs[c] + raioV(c, cols);
      const x1 = xs[c + 1] - raioV(c + 1, cols);
      const y0 = ys[k] + raioV(k, rows);
      const y1 = ys[k + 1] - raioV(k + 1, rows);
      celulas.push({ i: rIdx * cols + c, r: rIdx, c, x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
    }
  }

  /** @param {number} i */
  const idx = (i) => {
    const c = i % cols;
    const k = rows - 1 - ((i / cols) | 0);
    return { piso: horiz[k][c], teto: horiz[k + 1][c], esq: vert[c][k], dir: vert[c + 1][k] };
  };

  const x0 = xs[0] - rG;
  const x1 = xs[cols] + rG;
  const y0 = ys[0] - rG;
  const y1 = ys[rows] + rG;

  return {
    cols, rows, vao, r, xs, ys, paredes, horiz, vert, celulas, idx,
    /** caixa da estante inteira (u) */
    caixa: [x0, y0, x1, y1],
    /**
     * Casa sob o ponto (com a parede dividida ao meio entre os vizinhos), ou -1 fora.
     * @param {number} x @param {number} y
     */
    celulaEm(x, y) {
      if (x < xs[0] - rG || x > xs[cols] + rG || y < ys[0] - rG || y > ys[rows] + rG) return -1;
      let c = 0;
      while (c < cols - 1 && x > (xs[c + 1])) c++;
      let k = 0;
      while (k < rows - 1 && y > ys[k + 1]) k++;
      return (rows - 1 - k) * cols + c;
    },
    /**
     * Onde a gota nasce: logo abaixo do bico do teto do nicho.
     * @param {number} i @param {number} d diametro da gota
     */
    pingo(i, d) {
      const C = celulas[i];
      return [C.cx, C.y1 - d / 2 - 0.12];
    },
    /** A gota esta dentro do vao do nicho? (centroide, com uma margem) @param {number} i @param {number} x @param {number} y @param {number} [m] */
    dentro(i, x, y, m = 0.15) {
      const C = celulas[i];
      return x > C.x0 - m && x < C.x1 + m && y > C.y0 - m && y < C.y1 + m;
    },
  };
}
