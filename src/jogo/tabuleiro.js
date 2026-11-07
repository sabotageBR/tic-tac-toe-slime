// Tabuleiro generico do jogo da velha: casas num vetor (indice r*n + c, r = 0 e a linha de cima),
// linhas de k em linha num tabuleiro n x n, vencedor e casas livres. Logica pura.

/** @type {Map<string, number[][]>} */
const CACHE = new Map();

/**
 * Todas as linhas de k casas seguidas (horizontais, verticais e as duas diagonais) num n x n.
 * @param {number} n @param {number} [k]
 * @returns {number[][]}
 */
export function linhas(n, k = n) {
  const chave = n + 'x' + k;
  const pronto = CACHE.get(chave);
  if (pronto) return pronto;
  /** @type {number[][]} */
  const out = [];
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      for (const [dr, dc] of dirs) {
        const rf = r + dr * (k - 1);
        const cf = c + dc * (k - 1);
        if (rf < 0 || rf >= n || cf < 0 || cf >= n) continue;
        const l = [];
        for (let a = 0; a < k; a++) l.push((r + dr * a) * n + (c + dc * a));
        out.push(l);
      }
    }
  }
  CACHE.set(chave, out);
  return out;
}

/** Linhas que passam por cada casa (para a heuristica e o realce). @param {number} n @param {number} [k] */
export function linhasDaCasa(n, k = n) {
  const ls = linhas(n, k);
  /** @type {number[][][]} */
  const por = Array.from({ length: n * n }, () => []);
  for (const l of ls) for (const i of l) por[i].push(l);
  return por;
}

/**
 * Vencedor de um vetor de donos (0 = vazio, 1 e 2 = jogadores).
 * @param {ArrayLike<number>} donos @param {number} n @param {number} [k]
 * @returns {{ jogador: number, linha: number[] }|null} a primeira linha completa (ou null)
 */
export function vencedor(donos, n, k = n) {
  for (const l of linhas(n, k)) {
    const j = donos[l[0]];
    if (!j) continue;
    let ok = true;
    for (let a = 1; a < l.length; a++) if (donos[l[a]] !== j) { ok = false; break; }
    if (ok) return { jogador: j, linha: l };
  }
  return null;
}

/**
 * Linhas completas de cada jogador (um lance pode fechar linha dos dois, nos eventos).
 * @param {ArrayLike<number>} donos @param {number} n @param {number} [k]
 */
export function linhasDe(donos, n, k = n) {
  /** @type {Record<number, number[][]>} */
  const out = { 1: [], 2: [] };
  for (const l of linhas(n, k)) {
    const j = donos[l[0]];
    if (!j) continue;
    if (l.every((i) => donos[i] === j)) out[j].push(l);
  }
  return out;
}

/** @param {ArrayLike<number>} donos @returns {number[]} */
export function livres(donos) {
  const out = [];
  for (let i = 0; i < donos.length; i++) if (!donos[i]) out.push(i);
  return out;
}

/** @param {ArrayLike<number>} donos */
export function cheio(donos) {
  for (let i = 0; i < donos.length; i++) if (!donos[i]) return false;
  return true;
}

/** O outro jogador. @param {number} j */
export function outro(j) {
  return j === 1 ? 2 : 1;
}

/**
 * Heuristica de linhas abertas: cada linha so com pecas de um jogador vale 3^qtd para ele.
 * @param {ArrayLike<number>} donos @param {number} n @param {number} k @param {number} j ponto de vista
 */
export function linhasAbertas(donos, n, k, j) {
  let v = 0;
  const o = outro(j);
  for (const l of linhas(n, k)) {
    let a = 0;
    let b = 0;
    for (const i of l) {
      if (donos[i] === j) a++;
      else if (donos[i] === o) b++;
    }
    if (a && !b) v += a === k - 1 ? 9 : a;
    else if (b && !a) v -= b === k - 1 ? 9 : b;
  }
  return v;
}
