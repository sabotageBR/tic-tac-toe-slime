// Regras do Modelo 7, Velha Quantica (3x3). Cada lance e uma marca em SUPERPOSICAO: ela fica em duas
// casas livres ao mesmo tempo (um par emaranhado). Quando um par novo fecha um ciclo de
// emaranhamento, ha um COLAPSO: o rival escolhe em qual das duas casas a marca que fechou o ciclo
// cai, e isso decide em cascata todas as marcas ligadas a ela (cada uma vai para a casa que sobrou).
// Casa colapsada e classica: ninguem mais joga ali. Tres classicas em linha vencem; se o mesmo
// colapso der linha aos dois, vence a linha que ficou pronta mais cedo (a de menor "maior lance").
// Quem escolhe o colapso joga em seguida (a vez NAO muda na jogada { colapso }).
// Menos de 2 casas livres sem linha = empate. Estado imutavel.

import { linhas, outro } from '../tabuleiro.js';

const LS = linhas(3, 3);

/**
 * @typedef {{ id: number, jogador: number, a: number, b: number }} Marca
 * @typedef {{ classicas: number[], ordem: number[], marcas: Marca[], colapso: { id: number, a: number, b: number }|null,
 *   vez: number, lances: number, prox: number }} EstadoQuantico
 */

/** @param {{ comeca?: number }} [o] @returns {EstadoQuantico} */
export function inicial(o = {}) {
  return { classicas: new Array(9).fill(0), ordem: new Array(9).fill(0), marcas: [], colapso: null, vez: o.comeca || 1, lances: 0, prox: 1 };
}

/** As casas ja estao ligadas por marcas? @param {Marca[]} marcas @param {number} a @param {number} b */
function ligadas(marcas, a, b) {
  const vistos = new Set([a]);
  const fila = [a];
  while (fila.length) {
    const x = /** @type {number} */ (fila.pop());
    if (x === b) return true;
    for (const m of marcas) {
      const y = m.a === x ? m.b : m.b === x ? m.a : -1;
      if (y >= 0 && !vistos.has(y)) { vistos.add(y); fila.push(y); }
    }
  }
  return false;
}

/** Casas do componente emaranhado que contem `a`. @param {Marca[]} marcas @param {number} a */
export function componente(marcas, a) {
  const vistos = new Set([a]);
  const fila = [a];
  while (fila.length) {
    const x = /** @type {number} */ (fila.pop());
    for (const m of marcas) {
      const y = m.a === x ? m.b : m.b === x ? m.a : -1;
      if (y >= 0 && !vistos.has(y)) { vistos.add(y); fila.push(y); }
    }
  }
  return [...vistos];
}

/**
 * A cascata de um colapso: a marca `id` cai em `casa` e as outras do componente vao para a casa
 * que sobra. Devolve a lista na ordem em que caem.
 * @param {EstadoQuantico} E @param {number} casa
 * @returns {Array<{ id: number, jogador: number, casa: number, outra: number }>}
 */
export function cascata(E, casa) {
  const c = /** @type {{ id: number }} */ (E.colapso);
  const ocupada = new Set();
  const feitas = new Set();
  /** @type {Array<{ id: number, jogador: number, casa: number, outra: number }>} */
  const out = [];
  const m0 = /** @type {Marca} */ (E.marcas.find((m) => m.id === c.id));
  const fila = [{ m: m0, casa }];
  while (fila.length) {
    const { m, casa: x } = /** @type {{ m: Marca, casa: number }} */ (fila.shift());
    if (feitas.has(m.id)) continue;
    feitas.add(m.id);
    ocupada.add(x);
    out.push({ id: m.id, jogador: m.jogador, casa: x, outra: m.a === x ? m.b : m.a });
    // toda outra marca que tocava a casa agora ocupada cai na outra ponta
    for (const q of E.marcas) {
      if (feitas.has(q.id)) continue;
      if (q.a === x) fila.push({ m: q, casa: q.b });
      else if (q.b === x) fila.push({ m: q, casa: q.a });
    }
  }
  return out;
}

/** @param {EstadoQuantico} E */
export function resultado(E) {
  if (E.colapso) return null;
  /** a melhor linha de cada jogador: [maior lance da linha, linha] */
  /** @type {Record<number, { t: number, linha: number[] }|null>} */
  const melhor = { 1: null, 2: null };
  for (const l of LS) {
    const j = E.classicas[l[0]];
    if (!j || E.classicas[l[1]] !== j || E.classicas[l[2]] !== j) continue;
    const t = Math.max(E.ordem[l[0]], E.ordem[l[1]], E.ordem[l[2]]);
    const m = melhor[j];
    if (!m || t < m.t) melhor[j] = { t, linha: l };
  }
  const a = melhor[1];
  const b = melhor[2];
  if (a && b) return a.t < b.t ? { vencedor: 1, linha: a.linha } : { vencedor: 2, linha: b.linha };
  if (a) return { vencedor: 1, linha: a.linha };
  if (b) return { vencedor: 2, linha: b.linha };
  let livres = 0;
  for (const c of E.classicas) if (!c) livres++;
  return livres < 2 ? { vencedor: 0 } : null;
}

/** @param {EstadoQuantico} E */
export function jogadas(E) {
  if (E.colapso) return [{ colapso: E.colapso.a }, { colapso: E.colapso.b }];
  if (resultado(E)) return [];
  const out = [];
  for (let a = 0; a < 9; a++) {
    if (E.classicas[a]) continue;
    for (let b = a + 1; b < 9; b++) if (!E.classicas[b]) out.push({ a, b });
  }
  return out;
}

/** @param {EstadoQuantico} E @param {{ a?: number, b?: number, colapso?: number }} j */
export function aplicar(E, j) {
  if (j.colapso !== undefined) {
    const lista = cascata(E, j.colapso);
    const classicas = E.classicas.slice();
    const ordem = E.ordem.slice();
    const caiu = new Set();
    for (const it of lista) {
      classicas[it.casa] = it.jogador;
      ordem[it.casa] = it.id;
      caiu.add(it.id);
    }
    // a vez nao muda: quem escolheu o colapso faz agora o seu lance
    return {
      E: { ...E, classicas, ordem, marcas: E.marcas.filter((m) => !caiu.has(m.id)), colapso: null },
      efeitos: [{ tipo: 'colapsar', lista, por: E.vez }],
    };
  }
  const a = /** @type {number} */ (j.a);
  const b = /** @type {number} */ (j.b);
  const id = E.prox;
  const ciclo = ligadas(E.marcas, a, b);
  const marcas = [...E.marcas, { id, jogador: E.vez, a, b }];
  /** @type {any[]} */
  const efeitos = [{ tipo: 'emaranhar', id, jogador: E.vez, a, b }];
  if (ciclo) efeitos.push({ tipo: 'ciclo', casas: componente(marcas, a), a, b, jogador: E.vez });
  return {
    E: { ...E, marcas, colapso: ciclo ? { id, a, b } : null, vez: outro(E.vez), lances: E.lances + 1, prox: id + 1 },
    efeitos,
  };
}

/** @param {EstadoQuantico} E */
export function chave(E) {
  const ms = E.marcas.map((m) => m.jogador + '' + m.a + m.b).sort().join(',');
  return E.vez + ':' + E.classicas.join('') + ':' + ms + ':' + (E.colapso ? E.colapso.a + '' + E.colapso.b : '');
}

/**
 * Presenca de cada um por casa (classica = 1; cada marca em superposicao = 0,5, ate 1) somada nas
 * linhas que o rival ainda nao travou com uma classica.
 * @param {EstadoQuantico} E @param {number} j
 */
export function avaliar(E, j) {
  const o = outro(j);
  const p = { [j]: new Array(9).fill(0), [o]: new Array(9).fill(0) };
  for (let c = 0; c < 9; c++) if (E.classicas[c]) p[E.classicas[c]][c] = 1;
  for (const m of E.marcas) {
    p[m.jogador][m.a] = Math.min(1, p[m.jogador][m.a] + 0.5);
    p[m.jogador][m.b] = Math.min(1, p[m.jogador][m.b] + 0.5);
  }
  let v = 0;
  for (const l of LS) {
    let meu = 0;
    let dele = 0;
    let travaMinha = false;
    let travaDele = false;
    for (const c of l) {
      meu += p[j][c];
      dele += p[o][c];
      if (E.classicas[c] === j) travaMinha = true;
      else if (E.classicas[c] === o) travaDele = true;
    }
    if (!travaDele) v += meu * meu;
    if (!travaMinha) v -= dele * dele;
  }
  return v;
}

export const REGRAS = { id: 'quantica', inicial, jogadas, aplicar, resultado, chave, avaliar };
