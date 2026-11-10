// Acoes do palco da Serie Tech: no lugar da fisica, as pecas sao objetos com posicao, escala,
// alfa e rotacao animados por curvas. Uma acao e { nome, passo(dt) => terminou? } (o mesmo
// contrato da fila de src/jogo/gotas.js): o modo so devolve a vez quando a fila esvazia.
// Logica pura: o tempo entra por dt.

export { esperar, fazer, juntas } from '../gotas.js';

/** @typedef {import('../gotas.js').Acao} Acao */
/**
 * @typedef {{ id: number|string, jogador: number, casa: number, x: number, y: number, esc: number, alfa: number,
 *   rot: number, t: number, tipo: string, dados: Record<string, any> }} Peca
 */

export const CURVA = {
  /** @param {number} k */
  linear: (k) => k,
  /** @param {number} k */
  suave: (k) => k * k * (3 - 2 * k),
  /** @param {number} k */
  saida: (k) => 1 - (1 - k) * (1 - k) * (1 - k),
  /** @param {number} k */
  entrada: (k) => k * k * k,
  /** passa do alvo e volta (a peca que "encaixa") @param {number} k */
  mola: (k) => {
    const c = 2.2;
    const u = k - 1;
    return 1 + (c + 1) * u * u * u + c * u * u;
  },
  /** cai e quica uma vez @param {number} k */
  quique: (k) => {
    if (k < 0.62) { const u = k / 0.62; return u * u; }
    const u = (k - 0.62) / 0.38;
    return 1 - 0.14 * 4 * u * (1 - u);
  },
};

/**
 * Anima de 0 a 1 em `dur` s: fn(k ja com a curva, k cru).
 * @param {number} dur @param {(k: number, cru: number) => void} fn @param {(k: number) => number} [curva]
 * @returns {Acao}
 */
export function animar(dur, fn, curva = CURVA.suave) {
  let t = 0;
  return {
    nome: 'animar',
    passo(dt) {
      t += dt;
      const k = dur <= 0 ? 1 : Math.min(1, t / dur);
      fn(curva(k), k);
      return k >= 1;
    },
  };
}

/**
 * Peca nova no palco (ainda invisivel: quem cria anima a entrada).
 * @param {Map<any, Peca>} pecas
 * @param {{ id: number|string, jogador: number, casa?: number, x: number, y: number, tipo?: string, esc?: number, alfa?: number, dados?: any }} o
 * @returns {Peca}
 */
export function criarPeca(pecas, o) {
  /** @type {Peca} */
  const p = {
    id: o.id, jogador: o.jogador, casa: o.casa === undefined ? -1 : o.casa, x: o.x, y: o.y,
    esc: o.esc === undefined ? 0 : o.esc, alfa: o.alfa === undefined ? 1 : o.alfa, rot: 0, t: 0,
    tipo: o.tipo || 'marca', dados: o.dados || {},
  };
  pecas.set(o.id, p);
  return p;
}

/**
 * A peca se materializa (cresce com mola).
 * @param {Peca} p @param {number} [dur] @returns {Acao}
 */
export function surgir(p, dur = 0.28) {
  return animar(dur, (k, cru) => { p.esc = k; p.alfa = Math.min(1, cru * 3); }, CURVA.mola);
}

/**
 * Desliza ate (x, y).
 * @param {Peca} p @param {number} x @param {number} y @param {number} [dur] @param {(k: number) => number} [curva] @returns {Acao}
 */
export function mover(p, x, y, dur = 0.25, curva = CURVA.suave) {
  let x0 = 0;
  let y0 = 0;
  let ini = false;
  return animar(dur, (k) => {
    if (!ini) { ini = true; x0 = p.x; y0 = p.y; }
    p.x = x0 + (x - x0) * k;
    p.y = y0 + (y - y0) * k;
  }, curva);
}

/**
 * Desmaterializa e sai do palco.
 * @param {Map<any, Peca>} pecas @param {Peca} p @param {number} [dur] @returns {Acao}
 */
export function sumir(pecas, p, dur = 0.3) {
  let a0 = -1;
  return animar(dur, (k) => {
    if (a0 < 0) a0 = p.alfa;
    p.alfa = a0 * (1 - k);
    p.dados.some = k;
    if (k >= 1) pecas.delete(p.id);
  }, CURVA.linear);
}
