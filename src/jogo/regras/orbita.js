// Regras do Modelo 10, Orbita: tabuleiro n x n com gravidade (r = n - 1 e o chao). O lance solta um
// modulo numa coluna e ele cai ate o fundo. Se fechou k em linha, vence na hora. Senao a estacao
// gira 90 graus no sentido horario, tudo cai de novo e as linhas sao conferidas: so de um lado =
// ele vence; dos dois = empate. Tabuleiro cheio ou teto de lances = empate. Estado imutavel.

import { vencedor, linhasDe, outro, linhasAbertas } from '../tabuleiro.js';

export const MAX_LANCES = 60;

/**
 * @typedef {{ n: number, k: number, donos: number[], ids: number[], vez: number, lances: number, prox: number,
 *   fim: { vencedor: number, linha?: number[] }|null }} EstadoOrbita
 */

/**
 * Gira 90 graus no sentido horario: (r, c) vai para (c, n - 1 - r).
 * @param {number[]} v @param {number} n
 */
export function girar(v, n) {
  const out = new Array(n * n).fill(0);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c * n + (n - 1 - r)] = v[r * n + c];
  return out;
}

/** Casa de (r, c) depois do giro. @param {number} casa @param {number} n */
export function casaGirada(casa, n) {
  const r = Math.floor(casa / n);
  const c = casa % n;
  return c * n + (n - 1 - r);
}

/**
 * @param {number} n @param {number} k
 * @param {{ direto?: boolean, bonus?: number[], cada?: number }} [op]  direto: linha antes do giro vence na hora;
 *   bonus: casas que ja comecam com um modulo de quem joga em segundo; cada: gira a cada N lances
 */
export function criarRegras(n = 4, k = 3, op = {}) {
  const DIRETO = op.direto !== false;
  const CADA = op.cada || 1;
  /** @param {{ comeca?: number }} [o] @returns {EstadoOrbita} */
  function inicial(o = {}) {
    const E = { n, k, donos: new Array(n * n).fill(0), ids: new Array(n * n).fill(0), vez: o.comeca || 1, lances: 0, prox: 1, fim: null };
    for (const casa of op.bonus || []) { E.donos[casa] = outro(E.vez); E.ids[casa] = E.prox++; }
    return E;
  }

  /** @param {EstadoOrbita} E */
  function resultado(E) {
    if (E.fim) return E.fim;
    if (E.lances >= MAX_LANCES) return { vencedor: 0 };
    for (let c = 0; c < n; c++) if (!E.donos[c]) return null;
    return { vencedor: 0 };
  }

  /** @param {EstadoOrbita} E */
  function jogadas(E) {
    if (resultado(E)) return [];
    const out = [];
    for (let c = 0; c < n; c++) if (!E.donos[c]) out.push({ col: c });
    return out;
  }

  /** Casa onde um modulo solto na coluna para. @param {number[]} donos @param {number} col */
  function fundo(donos, col) {
    let r = -1;
    while (r + 1 < n && !donos[(r + 1) * n + col]) r++;
    return r < 0 ? -1 : r * n + col;
  }

  /** @param {EstadoOrbita} E @param {{ col: number }} j */
  function aplicar(E, j) {
    let donos = E.donos.slice();
    let ids = E.ids.slice();
    const eu = E.vez;
    const id = E.prox;
    const casa = fundo(donos, j.col);
    donos[casa] = eu;
    ids[casa] = id;
    /** @type {any[]} */
    const efeitos = [{ tipo: 'cair', id, col: j.col, casa, jogador: eu }];
    const base = { ...E, vez: outro(eu), lances: E.lances + 1, prox: id + 1 };
    const direto = vencedor(donos, n, k);
    if (DIRETO && direto && direto.jogador === eu) return { E: { ...base, donos, ids, fim: { vencedor: eu, linha: direto.linha } }, efeitos };
    if (base.lances % CADA) {
      // lance sem giro: so confere as linhas
      const l0 = linhasDe(donos, n, k);
      const f0 = l0[1].length && l0[2].length ? { vencedor: 0 } : l0[1].length ? { vencedor: 1, linha: l0[1][0] } : l0[2].length ? { vencedor: 2, linha: l0[2][0] } : null;
      return { E: { ...base, donos, ids, fim: f0 }, efeitos };
    }
    // gira e assenta
    donos = girar(donos, n);
    ids = girar(ids, n);
    const movs = [];
    for (let c = 0; c < n; c++) {
      let livre = n - 1;
      for (let r = n - 1; r >= 0; r--) {
        const i = r * n + c;
        if (!donos[i]) continue;
        const para = livre * n + c;
        if (para !== i) {
          donos[para] = donos[i];
          ids[para] = ids[i];
          donos[i] = 0;
          ids[i] = 0;
          movs.push({ id: ids[para], de: i, para });
        }
        livre--;
      }
    }
    efeitos.push({ tipo: 'girar' }, { tipo: 'assentar', movs });
    const ls = linhasDe(donos, n, k);
    let fim = null;
    if (ls[1].length && ls[2].length) fim = { vencedor: 0 };
    else if (ls[1].length) fim = { vencedor: 1, linha: ls[1][0] };
    else if (ls[2].length) fim = { vencedor: 2, linha: ls[2][0] };
    return { E: { ...base, donos, ids, fim }, efeitos };
  }

  /** @param {EstadoOrbita} E */
  function chave(E) {
    return E.vez + ':' + E.donos.join('');
  }

  /** @param {EstadoOrbita} E @param {number} j */
  function avaliar(E, j) {
    return linhasAbertas(E.donos, n, k, j);
  }

  return { id: 'orbita', n, k, inicial, jogadas, aplicar, resultado, chave, avaliar, fundo };
}
