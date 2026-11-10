// Regras do Modelo 9, Sobrecarga: cada casa e um nucleo de energia. O lance carrega um nucleo vazio
// ou seu (+1). No limite (o numero de vizinhos ortogonais: 2 no canto, 3 na borda, 4 no meio) ele
// descarrega: perde o limite, manda 1 de carga a cada vizinho e os captura. As descargas vao em
// ondas simultaneas e em cadeia. k casas suas em linha vencem (confere depois de cada onda: a
// cascata para na vitoria, e por isso nunca roda sem fim). A carga total e o numero de lances,
// entao o tabuleiro satura e nao ha empate por casa cheia; o teto de lances e so uma garantia.
// Estado imutavel.

import { vencedor, outro, linhas } from '../tabuleiro.js';

export const MAX_ONDAS = 40;
export const MAX_LANCES = 80;

/** @type {Map<number, number[][]>} */
const VIZ = new Map();

/** Vizinhos ortogonais de cada casa num n x n. @param {number} n */
export function vizinhos(n) {
  const pronto = VIZ.get(n);
  if (pronto) return pronto;
  const out = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = [];
      if (r > 0) v.push((r - 1) * n + c);
      if (c < n - 1) v.push(r * n + c + 1);
      if (r < n - 1) v.push((r + 1) * n + c);
      if (c > 0) v.push(r * n + c - 1);
      out.push(v);
    }
  }
  VIZ.set(n, out);
  return out;
}

/** Limite de carga da casa. @param {number} n @param {number} casa */
export function limite(n, casa) {
  return vizinhos(n)[casa].length;
}

/**
 * @typedef {{ n: number, k: number, donos: number[], carga: number[], vez: number, lances: number }} EstadoSobrecarga
 */

/** @param {number} n @param {number} k */
export function criarRegras(n = 3, k = n, extra = 0, bonus = -1) {
  const V = vizinhos(n);
  /** limite de cada casa */
  const L = V.map((v) => v.length + extra);

  /** @param {{ comeca?: number }} [o] @returns {EstadoSobrecarga} */
  function inicial(o = {}) {
    const E = { n, k, donos: new Array(n * n).fill(0), carga: new Array(n * n).fill(0), vez: o.comeca || 1, lances: 0 };
    // compensacao de quem joga em segundo: ja comeca com um nucleo carregado
    if (bonus >= 0) { E.donos[bonus] = outro(E.vez); E.carga[bonus] = 1; }
    return E;
  }

  /** @param {EstadoSobrecarga} E */
  function resultado(E) {
    const v = vencedor(E.donos, n, k);
    if (v) return { vencedor: v.jogador, linha: v.linha };
    if (E.lances >= MAX_LANCES) return { vencedor: 0 };
    return null;
  }

  /** @param {EstadoSobrecarga} E */
  function jogadas(E) {
    if (resultado(E)) return [];
    const out = [];
    for (let i = 0; i < E.donos.length; i++) if (!E.donos[i] || E.donos[i] === E.vez) out.push({ casa: i });
    return out;
  }

  /** @param {EstadoSobrecarga} E @param {{ casa: number }} j */
  function aplicar(E, j) {
    const donos = E.donos.slice();
    const carga = E.carga.slice();
    const eu = E.vez;
    donos[j.casa] = eu;
    carga[j.casa]++;
    /** @type {any[]} */
    const efeitos = [{ tipo: 'carga', casa: j.casa, jogador: eu, carga: carga[j.casa] }];
    for (let onda = 0; onda < MAX_ONDAS; onda++) {
      const inst = [];
      for (let i = 0; i < carga.length; i++) if (carga[i] >= L[i]) inst.push(i);
      if (!inst.length) break;
      const raios = [];
      for (const i of inst) {
        carga[i] -= L[i];
        if (!carga[i]) donos[i] = 0;
      }
      for (const i of inst) {
        for (const v of V[i]) {
          carga[v]++;
          donos[v] = eu;
          raios.push([i, v]);
        }
      }
      efeitos.push({ tipo: 'onda', jogador: eu, casas: inst, raios, donos: donos.slice(), carga: carga.slice(), n: onda });
      if (vencedor(donos, n, k)) break;
    }
    return { E: { ...E, donos, carga, vez: outro(eu), lances: E.lances + 1 }, efeitos };
  }

  /** @param {EstadoSobrecarga} E */
  function chave(E) {
    return E.vez + ':' + E.donos.join('') + ':' + E.carga.join('');
  }

  /**
   * Linhas abertas, casas e nucleos no limite ao lado do rival (a ameaca de captura).
   * @param {EstadoSobrecarga} E @param {number} j
   */
  function avaliar(E, j) {
    const o = outro(j);
    let v = 0;
    for (const l of linhas(n, k)) {
      let a = 0;
      let b = 0;
      for (const i of l) {
        if (E.donos[i] === j) a++;
        else if (E.donos[i] === o) b++;
      }
      if (a && !b) v += a === k - 1 ? 9 : a;
      else if (b && !a) v -= b === k - 1 ? 9 : b;
    }
    for (let i = 0; i < E.donos.length; i++) {
      const d = E.donos[i];
      if (!d) continue;
      const s = d === j ? 1 : -1;
      v += s;
      if (E.carga[i] === L[i] - 1) {
        let rivais = 0;
        for (const w of V[i]) if (E.donos[w] && E.donos[w] !== d) rivais++;
        v += s * rivais * 2;
      }
    }
    return v;
  }

  return { id: 'sobrecarga', n, k, limites: L, inicial, jogadas, aplicar, resultado, chave, avaliar };
}
