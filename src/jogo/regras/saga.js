// Regras do Modelo 5, Saga dos Poderes: o jogo da velha classico com casas bloqueadas (gelo, calor)
// e pecas que os eventos e poderes mexem fora do lance. Os eventos e poderes sao funcoes puras sobre o
// estado (o modo encena a fisica de cada um). Linha criada por evento: se so um lado tem, vence; os
// dois, empate.

import { livres, outro, linhasDe, linhasAbertas, linhasDaCasa } from '../tabuleiro.js';

/**
 * @typedef {{ n: number, k: number, donos: number[], ids: number[], vez: number, lances: number, prox: number,
 *   bloq: number[], imune: number[], rivalLances: number, eventos: number, gigante: boolean }} EstadoSaga
 *   bloq[i]: lances que a casa ainda fica bloqueada (gelo/calor); imune: ids que eventos e poderes nao tocam
 */

/** Escada de rivais do prototipo: nivel da CPU e o evento de cada um. */
export const RIVAIS = Object.freeze([
  { id: 'gotaGelada', nome: 'Gota Gelada', nivel: 0, eventos: ['gelo'], pig: [0.3, 0, 0.05, 0] },
  { id: 'tremelique', nome: 'Tremelique', nivel: 1, eventos: ['terremoto'], pig: [0, 0.35, 0.6, 0] },
  { id: 'magma', nome: 'Magma', nivel: 2, eventos: ['lava'], pig: [0, 0.7, 0.4, 0.05] },
  { id: 'ventania', nome: 'Ventania', nivel: 2, eventos: ['vento'], pig: [0.25, 0, 0.35, 0] },
  { id: 'gigante', nome: 'Gigante', nivel: 3, eventos: ['gigante'], pig: [0.2, 0.5, 0, 0] },
  { id: 'reiGosma', nome: 'Rei Gosma', nivel: 4, eventos: ['gigante', 'terremoto'], pig: [0.05, 0.05, 0.85, 0.02] },
]);

export const PODERES = Object.freeze(['missil', 'trocar', 'chacoalhar', 'calor', 'cola']);

/** @param {number} comeca @returns {EstadoSaga} */
export function inicialSaga(comeca = 1) {
  return { n: 3, k: 3, donos: new Array(9).fill(0), ids: new Array(9).fill(0), vez: comeca, lances: 0, prox: 1, bloq: new Array(9).fill(0), imune: [], rivalLances: 0, eventos: 0, gigante: false };
}

/** @param {EstadoSaga} E */
export function resultado(E) {
  const ls = linhasDe(E.donos, 3, 3);
  if (ls[1].length && ls[2].length) return { vencedor: 0 };
  if (ls[1].length) return { vencedor: 1, linha: ls[1][0] };
  if (ls[2].length) return { vencedor: 2, linha: ls[2][0] };
  // sem casa livre que nao esteja bloqueada: empate (o gelo nunca tranca a partida)
  if (!livres(E.donos).some((i) => !E.bloq[i])) return { vencedor: 0 };
  if (E.lances > 30) return { vencedor: 0 };
  return null;
}

/** @param {EstadoSaga} E */
export function jogadas(E) {
  if (resultado(E)) return [];
  return livres(E.donos).filter((i) => !E.bloq[i]).map((casa) => ({ casa }));
}

/** @param {EstadoSaga} E */
function copia(E) {
  return { ...E, donos: E.donos.slice(), ids: E.ids.slice(), bloq: E.bloq.slice(), imune: E.imune.slice() };
}

/** O tempo dos bloqueios anda um lance. @param {EstadoSaga} F */
function passarBloqueios(F) {
  for (let i = 0; i < 9; i++) if (F.bloq[i] > 0) F.bloq[i]--;
}

/** @param {EstadoSaga} E @param {{ casa: number }} j */
export function aplicar(E, j) {
  const F = copia(E);
  const id = F.prox++;
  F.donos[j.casa] = E.vez;
  F.ids[j.casa] = id;
  if (E.vez === 2) F.rivalLances++;
  F.vez = outro(E.vez);
  F.lances++;
  passarBloqueios(F);
  if (E.colaArmada && E.vez === 1) { F.imune.push(id); F.colaArmada = false; }
  return { E: F, efeitos: [{ tipo: 'pingar', id, casa: j.casa, jogador: E.vez }] };
}

/** @param {EstadoSaga} E */
export function chave(E) {
  return E.vez + ':' + E.donos.join('') + ':' + E.bloq.map((b) => (b ? 1 : 0)).join('');
}

/** @param {EstadoSaga} E @param {number} j */
export function avaliar(E, j) {
  return linhasAbertas(E.donos, 3, 3, j);
}

export const REGRAS_SAGA = { id: 'saga', jogadas, aplicar, resultado, chave, avaliar };

// ------------------------------------------------------------------ eventos (puros)

/** A casa vazia que `quem` mais quer (a de mais linhas abertas dele), para o gelo. @param {EstadoSaga} E @param {number} quem */
export function casaMaisQuerida(E, quem) {
  const por = linhasDaCasa(3, 3);
  let melhor = -1;
  let mv = -Infinity;
  for (const i of livres(E.donos)) {
    if (E.bloq[i]) continue;
    let v = 0;
    for (const l of por[i]) {
      if (l.some((c) => E.donos[c] === outro(quem))) continue;
      v += 1 + l.filter((c) => E.donos[c] === quem).length * 3;
    }
    if (v > mv) { mv = v; melhor = i; }
  }
  return melhor;
}

/** Gelo: a casa vira bloco por 4 lances. */
export function gelo(E, quem = 1) {
  const F = copia(E);
  // com 2 casas livres ou menos o gelo nao cai (nao decide a partida no tapetao)
  if (livres(E.donos).filter((i) => !E.bloq[i]).length <= 2) return { E: F, casa: -1 };
  const casa = casaMaisQuerida(E, quem);
  if (casa >= 0) F.bloq[casa] = 4;
  return { E: F, casa };
}

/**
 * Terremoto: cada coluna assenta (as pecas caem ate a casa livre mais baixa), menos as imunes, que
 * ficam onde estao e servem de piso.
 * @param {EstadoSaga} E
 */
export function terremoto(E) {
  const F = copia(E);
  const quedas = [];
  for (let c = 0; c < 3; c++) {
    for (let r = 1; r >= 0; r--) {
      const de = r * 3 + c;
      if (!F.donos[de] || F.imune.includes(F.ids[de])) continue;
      let para = de;
      while (para + 3 < 9 && !F.donos[para + 3] && !F.bloq[para + 3]) para += 3;
      if (para === de) continue;
      F.donos[para] = F.donos[de];
      F.ids[para] = F.ids[de];
      F.donos[de] = 0;
      F.ids[de] = 0;
      quedas.push({ id: F.ids[para], de, para });
    }
  }
  return { E: F, quedas };
}

/** Lava: derrete a peca de `vitima` que esta em mais linhas abertas (nao a imune). @param {EstadoSaga} E @param {number} vitima */
export function lava(E, vitima = 1) {
  const por = linhasDaCasa(3, 3);
  let alvo = -1;
  let mv = -1;
  for (let i = 0; i < 9; i++) {
    if (E.donos[i] !== vitima || E.imune.includes(E.ids[i])) continue;
    const v = por[i].filter((l) => !l.some((c) => E.donos[c] === outro(vitima))).length;
    if (v > mv) { mv = v; alvo = i; }
  }
  const F = copia(E);
  let id = 0;
  if (alvo >= 0) { id = F.ids[alvo]; F.donos[alvo] = 0; F.ids[alvo] = 0; F.bloq[alvo] = 2; }
  return { E: F, casa: alvo, id };
}

/**
 * Vento: cada peca anda uma casa no sentido do vento (dx = -1 ou 1) se a vizinha estiver vazia; a
 * ordem comeca pelo lado para onde o vento sopra.
 * @param {EstadoSaga} E @param {number} dx
 */
export function vento(E, dx) {
  const F = copia(E);
  const movidas = [];
  const cols = dx > 0 ? [1, 0] : [1, 2];
  for (const c of cols) {
    for (let r = 0; r < 3; r++) {
      const de = r * 3 + c;
      const para = de + dx;
      if (!F.donos[de] || F.donos[para] || F.bloq[para] || F.imune.includes(F.ids[de])) continue;
      F.donos[para] = F.donos[de];
      F.ids[para] = F.ids[de];
      F.donos[de] = 0;
      F.ids[de] = 0;
      movidas.push({ id: F.ids[para], de, para });
    }
  }
  return { E: F, movidas };
}

/**
 * Gigante: um slime do rival ocupa duas casas vizinhas vazias (o melhor par para ele).
 * @param {EstadoSaga} E @param {number} rival
 */
export function gigante(E, rival = 2) {
  let melhor = null;
  let mv = -Infinity;
  for (let i = 0; i < 9; i++) {
    for (const d of [1, 3]) {
      const j = i + d;
      if (j > 8 || (d === 1 && i % 3 === 2)) continue;
      if (E.donos[i] || E.donos[j] || E.bloq[i] || E.bloq[j]) continue;
      const t = E.donos.slice();
      t[i] = rival;
      t[j] = rival;
      const ls = linhasDe(t, 3, 3);
      // nao fecha a linha sozinho (o gigante ajuda, nao ganha de graca)
      if (ls[rival].length) continue;
      const v = linhasAbertas(t, 3, 3, rival);
      if (v > mv) { mv = v; melhor = [i, j]; }
    }
  }
  const F = copia(E);
  if (!melhor) return { E: F, casas: null, id: 0 };
  const id = F.prox++;
  for (const c of melhor) { F.donos[c] = rival; F.ids[c] = id; }
  F.gigante = true;
  return { E: F, casas: melhor, id };
}

// ------------------------------------------------------------------ poderes (puros)

/** Missil: remove a peca rival da casa. */
export function missil(E, casa) {
  if (!E.donos[casa] || E.donos[casa] === E.vez || E.imune.includes(E.ids[casa])) return null;
  const F = copia(E);
  const id = F.ids[casa];
  // o gigante ocupa duas casas: o missil tira as duas
  for (let i = 0; i < 9; i++) if (F.ids[i] === id) { F.donos[i] = 0; F.ids[i] = 0; }
  F.vez = outro(E.vez);
  F.lances++;
  passarBloqueios(F);
  return { E: F, id };
}

/** Trocar: a peca rival da casa troca de lugar com a sua vizinha ortogonal (a primeira). */
export function trocar(E, casa) {
  if (!E.donos[casa] || E.donos[casa] === E.vez || E.imune.includes(E.ids[casa])) return null;
  const r = (casa / 3) | 0;
  const c = casa % 3;
  const viz = [];
  if (r > 0) viz.push(casa - 3);
  if (c > 0) viz.push(casa - 1);
  if (c < 2) viz.push(casa + 1);
  if (r < 2) viz.push(casa + 3);
  const minha = viz.find((v) => E.donos[v] === E.vez && E.ids[v] !== E.ids[casa]);
  if (minha === undefined) return null;
  // o gigante nao troca
  if (E.ids.filter((x) => x === E.ids[casa]).length > 1) return null;
  const F = copia(E);
  [F.donos[casa], F.donos[minha]] = [F.donos[minha], F.donos[casa]];
  [F.ids[casa], F.ids[minha]] = [F.ids[minha], F.ids[casa]];
  F.vez = outro(E.vez);
  F.lances++;
  passarBloqueios(F);
  return { E: F, a: { id: F.ids[casa], para: casa }, b: { id: F.ids[minha], para: minha } };
}

/** Chacoalhar: a linha da casa gira uma casa para a direita (as imunes e o gigante ficam). */
export function chacoalhar(E, casa) {
  const r = (casa / 3) | 0;
  const F = copia(E);
  const cs = [r * 3, r * 3 + 1, r * 3 + 2];
  const fixas = cs.filter((c) => E.imune.includes(E.ids[c]) || (E.ids[c] && E.ids.filter((x) => x === E.ids[c]).length > 1));
  if (fixas.length) return null;
  const d = cs.map((c) => E.donos[c]);
  const ids = cs.map((c) => E.ids[c]);
  const movidas = [];
  for (let k = 0; k < 3; k++) {
    const para = cs[(k + 1) % 3];
    F.donos[para] = d[k];
    F.ids[para] = ids[k];
    if (ids[k]) movidas.push({ id: ids[k], para });
  }
  F.vez = outro(E.vez);
  F.lances++;
  passarBloqueios(F);
  return { E: F, movidas };
}

/** Calor: derrete a peca rival mais velha e bloqueia a casa por 2 lances. */
export function calor(E) {
  let alvo = -1;
  let menor = Infinity;
  for (let i = 0; i < 9; i++) {
    if (E.donos[i] !== outro(E.vez) || E.imune.includes(E.ids[i])) continue;
    if (E.ids.filter((x) => x === E.ids[i]).length > 1) continue;
    if (E.ids[i] < menor) { menor = E.ids[i]; alvo = i; }
  }
  if (alvo < 0) return null;
  const F = copia(E);
  const id = F.ids[alvo];
  F.donos[alvo] = 0;
  F.ids[alvo] = 0;
  F.vez = outro(E.vez);
  F.lances++;
  passarBloqueios(F);
  F.bloq[alvo] = 2;
  return { E: F, id, casa: alvo };
}
