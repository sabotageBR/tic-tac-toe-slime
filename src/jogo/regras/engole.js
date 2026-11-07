// Regras do Modelo 1, Engole-Engole: cada jogador tem pecas de 3 tamanhos (1 pequena, 2 media,
// 3 grande). Cada casa e uma pilha; a de cima manda. Na vez, poe uma peca da mao ou move uma sua de
// cima para outra casa; a maior pode cair em cima de uma menor (de qualquer cor) e engolir. Se a
// jogada revelar uma linha do rival, o rival vence (mesmo que a sua tambem feche).
// Fusao (submodo): a peca que voce poe ou move se junta a uma vizinha ortogonal sua de cima, do mesmo
// tamanho, e as duas viram uma do tamanho seguinte (a vizinha sai da casa dela; G + G nao funde).

import { linhasDe, outro, linhas } from '../tabuleiro.js';

/**
 * @typedef {{ id: number, jogador: number, tam: number }} Peca
 * @typedef {{ sub: string, n: number, k: number, pilhas: Peca[][], mao: Record<number, number[]>, vez: number,
 *   lances: number, prox: number }} EstadoEngole
 *   mao[j][t]: quantas pecas do tamanho t (1..3) o jogador j ainda tem
 */

/** @param {string} sub @param {number} comeca @returns {EstadoEngole} */
export function inicialEngole(sub, comeca = 1) {
  const n = sub === 'grande' ? 4 : 3;
  const q = sub === 'grande' ? 3 : 2;
  return {
    sub, n, k: n, pilhas: Array.from({ length: n * n }, () => []),
    mao: { 1: [0, q, q, q], 2: [0, q, q, q] }, vez: comeca, lances: 0, prox: 1,
  };
}

/** @param {EstadoEngole} E @param {number} i */
export const topo = (E, i) => E.pilhas[i][E.pilhas[i].length - 1] || null;

/** Donos de cima. @param {EstadoEngole} E */
export function donos(E) {
  return E.pilhas.map((p) => (p.length ? p[p.length - 1].jogador : 0));
}

/** @param {EstadoEngole} E */
export function resultado(E) {
  const d = donos(E);
  const ls = linhasDe(d, E.n, E.k);
  // quem acabou de jogar e outro(E.vez): linha do rival dele (E.vez) ganha primeiro
  if (ls[E.vez].length) return { vencedor: E.vez, linha: ls[E.vez][0] };
  const ant = outro(E.vez);
  if (ls[ant].length) return { vencedor: ant, linha: ls[ant][0] };
  if (E.lances >= 60) return { vencedor: 0 };
  return null;
}

/** @param {EstadoEngole} E */
export function jogadas(E) {
  if (resultado(E)) return [];
  const out = [];
  const N = E.n * E.n;
  const cabe = (i, t) => {
    const tp = topo(E, i);
    return !tp || tp.tam < t;
  };
  for (let t = 3; t >= 1; t--) {
    if (!E.mao[E.vez][t]) continue;
    for (let i = 0; i < N; i++) if (cabe(i, t)) out.push({ tam: t, para: i });
  }
  for (let i = 0; i < N; i++) {
    const tp = topo(E, i);
    if (!tp || tp.jogador !== E.vez) continue;
    for (let j = 0; j < N; j++) if (j !== i && cabe(j, tp.tam)) out.push({ de: i, para: j });
  }
  return out;
}

/** Vizinhas ortogonais na ordem cima, esquerda, direita, baixo. @param {number} i @param {number} n */
function vizinhas(i, n) {
  const r = (i / n) | 0;
  const c = i % n;
  const out = [];
  if (r > 0) out.push(i - n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  if (r < n - 1) out.push(i + n);
  return out;
}

/** @param {EstadoEngole} E @param {{ tam?: number, de?: number, para: number }} j */
export function aplicar(E, j) {
  const pilhas = E.pilhas.map((p) => p.slice());
  const mao = { 1: E.mao[1].slice(), 2: E.mao[2].slice() };
  const eu = E.vez;
  const efeitos = [];
  let prox = E.prox;
  const engolida = pilhas[j.para].length ? pilhas[j.para][pilhas[j.para].length - 1] : null;
  /** @type {Peca} */
  let peca;
  if (j.de === undefined) {
    peca = { id: prox++, jogador: eu, tam: /** @type {number} */ (j.tam) };
    mao[eu][peca.tam]--;
    efeitos.push({ tipo: 'pingar', id: peca.id, casa: j.para, jogador: eu, tam: peca.tam, engole: engolida ? engolida.id : 0 });
  } else {
    peca = /** @type {Peca} */ (pilhas[j.de].pop());
    const revela = pilhas[j.de].length ? pilhas[j.de][pilhas[j.de].length - 1] : null;
    efeitos.push({ tipo: 'mover', id: peca.id, de: j.de, para: j.para, engole: engolida ? engolida.id : 0, revela: revela ? revela.id : 0 });
  }
  pilhas[j.para].push(peca);
  if (E.sub === 'fusao' && peca.tam < 3) {
    for (const v of vizinhas(j.para, E.n)) {
      const tv = pilhas[v].length ? pilhas[v][pilhas[v].length - 1] : null;
      if (!tv || tv.jogador !== eu || tv.tam !== peca.tam) continue;
      pilhas[v].pop();
      const revela = pilhas[v].length ? pilhas[v][pilhas[v].length - 1] : null;
      const nova = { ...peca, tam: peca.tam + 1 };
      pilhas[j.para][pilhas[j.para].length - 1] = nova;
      efeitos.push({ tipo: 'fundir', id: peca.id, outro: tv.id, casa: j.para, de: v, tam: nova.tam, revela: revela ? revela.id : 0 });
      break;
    }
  }
  return { E: { ...E, pilhas, mao, vez: outro(eu), lances: E.lances + 1, prox }, efeitos };
}

/** @param {EstadoEngole} E */
export function chave(E) {
  let s = E.vez + ':';
  for (const p of E.pilhas) s += p.map((x) => x.jogador * 4 + x.tam).join('.') + '|';
  return s + E.mao[1].join('') + E.mao[2].join('');
}

/**
 * Heuristica: linhas visiveis abertas (a peca grande vale mais, e dificil de engolir) e as grandes
 * que ainda sobram na mao.
 * @param {EstadoEngole} E @param {number} j
 */
export function avaliar(E, j) {
  const o = outro(j);
  let v = 0;
  for (const l of linhas(E.n, E.k)) {
    let a = 0;
    let b = 0;
    for (const i of l) {
      const tp = topo(E, i);
      if (!tp) continue;
      if (tp.jogador === j) a += 1 + (tp.tam === 3 ? 0.5 : 0);
      else b += 1 + (tp.tam === 3 ? 0.5 : 0);
    }
    if (a && !b) v += a * a;
    else if (b && !a) v -= b * b;
  }
  v += 1.5 * (E.mao[j][3] - E.mao[o][3]);
  return v;
}

export const REGRAS_ENGOLE = { id: 'engole', jogadas, aplicar, resultado, chave, avaliar };
