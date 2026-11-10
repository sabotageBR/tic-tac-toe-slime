// Grade da Serie Tech: casas cols x rows em coordenadas do mundo (y para cima), centrada na
// origem. Casa i = r * cols + c, com r = 0 em cima (a mesma convencao da estante do slime).
// Logica pura.

/**
 * @typedef {{ i: number, r: number, c: number, cx: number, cy: number, x0: number, y0: number, x1: number, y1: number }} Celula
 */

/**
 * @param {{ cols?: number, rows?: number, vao?: number, cx?: number, cy?: number }} [o]  vao = lado da casa (u)
 */
export function criarGrade(o = {}) {
  const cols = o.cols || 3;
  const rows = o.rows || cols;
  const vao = o.vao || 3;
  const ox = o.cx || 0;
  const oy = o.cy || 0;
  const x0 = ox - (cols * vao) / 2;
  const y1 = oy + (rows * vao) / 2;
  /** @type {Celula[]} */
  const celulas = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx0 = x0 + c * vao;
      const cy1 = y1 - r * vao;
      celulas.push({ i: r * cols + c, r, c, cx: cx0 + vao / 2, cy: cy1 - vao / 2, x0: cx0, y0: cy1 - vao, x1: cx0 + vao, y1: cy1 });
    }
  }
  return {
    cols, rows, vao, celulas,
    /** [x0, y0, x1, y1] do tabuleiro */
    caixa: [x0, y1 - rows * vao, x0 + cols * vao, y1],
    /** Casa em (x, y) do mundo, ou -1. @param {number} x @param {number} y */
    celulaEm(x, y) {
      const c = Math.floor((x - x0) / vao);
      const r = Math.floor((y1 - y) / vao);
      if (c < 0 || c >= cols || r < 0 || r >= rows) return -1;
      return r * cols + c;
    },
    /** Centro de uma casa de fora do tabuleiro (r e c podem passar da borda). @param {number} r @param {number} c */
    centro(r, c) {
      return [x0 + (c + 0.5) * vao, y1 - (r + 0.5) * vao];
    },
  };
}
