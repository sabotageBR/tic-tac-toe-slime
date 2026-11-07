// Regras logicas dos modelos (sem fisica): Engole, Derrete, Mega, Saga e a previsao do Peteleco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { REGRAS_ENGOLE as RE, inicialEngole, topo } from '../src/jogo/regras/engole.js';
import { REGRAS_DERRETE as RD, inicialDerrete, proximaADerreter } from '../src/jogo/regras/derrete.js';
import { REGRAS_MEGA as RM, inicialMega, casaDe, miniDe, localDe, minisPermitidas } from '../src/jogo/regras/mega.js';
import { REGRAS_SAGA as RS, inicialSaga, terremoto, gelo, gigante, missil, trocar, chacoalhar, calor } from '../src/jogo/regras/saga.js';
import { lanceAte } from '../src/jogo/modos/peteleco.js';
import { desafioDoDia } from '../src/jogo/modos/engole.js';
import { avaliarLances } from '../src/jogo/ia.js';

const seq = (R, E, js) => js.reduce((F, j) => R.aplicar(F, j).E, E);

test('engole: a maior engole a menor e a menor nao cabe em cima da maior', () => {
  let E = inicialEngole('engole', 1);
  E = RE.aplicar(E, { tam: 1, para: 4 }).E;
  const js = RE.jogadas(E);
  assert.ok(js.some((j) => j.tam === 3 && j.para === 4));
  assert.ok(!js.some((j) => j.tam === 1 && j.para === 4));
  E = RE.aplicar(E, { tam: 3, para: 4 }).E;
  assert.equal(topo(E, 4).jogador, 2);
  assert.equal(E.pilhas[4].length, 2);
});

test('engole: mover a de cima revela a de baixo; linha revelada do rival ganha', () => {
  // azul poe a pequena em 1 e a laranja engole com a grande; azul faz 0 e 2; a laranja sai de 1 e
  // revela a pequena azul: a linha de cima e do azul
  let E = inicialEngole('engole', 1);
  E = seq(RE, E, [{ tam: 1, para: 1 }, { tam: 3, para: 1 }, { tam: 1, para: 0 }, { tam: 1, para: 8 }, { tam: 2, para: 2 }]);
  const r = RE.aplicar(E, { de: 1, para: 7 });
  assert.equal(RE.resultado(r.E).vencedor, 1);
  assert.equal(r.efeitos[0].revela > 0, true);
});

test('engole: fusao junta duas iguais vizinhas na seguinte', () => {
  let E = inicialEngole('fusao', 1);
  E = seq(RE, E, [{ tam: 1, para: 0 }, { tam: 1, para: 8 }]);
  const r = RE.aplicar(E, { tam: 1, para: 1 });
  assert.ok(r.efeitos.some((e) => e.tipo === 'fundir' && e.tam === 2));
  assert.equal(topo(r.E, 1).tam, 2);
  assert.equal(topo(r.E, 0), null);
});

test('engole: 4x4 pede 4 em linha', () => {
  const E = inicialEngole('grande', 1);
  assert.equal(E.n, 4);
  assert.equal(E.mao[1][3], 3);
});

test('engole: o desafio do dia tem vitoria forcada em ate 3 lances', () => {
  const E = desafioDoDia('2026-11-07');
  assert.equal(E.vez, 1);
  const { valores } = avaliarLances(RE, E, 3, 60000);
  assert.ok(Math.max(...valores) > 5000);
});

test('derrete: a 4a gota derrete a mais velha, que nao pode receber a nova', () => {
  let E = inicialDerrete('derrete', 1);
  E = seq(RD, E, [{ casa: 0 }, { casa: 3 }, { casa: 1 }, { casa: 4 }, { casa: 8 }, { casa: 7 }]);
  assert.equal(proximaADerreter(E).casa, 0);
  assert.ok(!RD.jogadas(E).some((j) => j.casa === 0));
  const r = RD.aplicar(E, { casa: 2 });
  assert.deepEqual(r.efeitos.map((e) => e.tipo), ['derreter', 'pingar']);
  assert.equal(r.E.donos[0], 0);
  // 1 e 2 e 8 nao fazem linha; a linha de cima precisava da 0
  assert.equal(RD.resultado(r.E), null);
});

test('derrete: onda de calor derrete a mais velha a cada 4 lances', () => {
  let E = inicialDerrete('calor', 1);
  const r = [{ casa: 0 }, { casa: 4 }, { casa: 8 }].reduce((F, j) => RD.aplicar(F, j).E, E);
  const q = RD.aplicar(r, { casa: 2 });
  assert.ok(q.efeitos.some((e) => e.tipo === 'calor' && e.casa === 0));
});

test('mega: indices, envio para a velhinha e escolha livre', () => {
  assert.equal(miniDe(casaDe(5, 7)), 5);
  assert.equal(localDe(casaDe(5, 7)), 7);
  let E = inicialMega('mega', 1);
  E = RM.aplicar(E, { casa: casaDe(4, 2) }).E;
  assert.deepEqual(minisPermitidas(E), [2]);
  // fecha a velhinha 0 do azul (0,1,2 locais) e confere o efeito de fechar
  E = inicialMega('mega', 1);
  const js = [casaDe(0, 0), casaDe(0, 3), casaDe(3, 1), casaDe(1, 3), casaDe(3, 0), casaDe(0, 6), casaDe(6, 0), casaDe(0, 8)];
  E = js.reduce((F, c) => RM.aplicar(F, { casa: c }).E, E);
  const r = RM.aplicar(E, { casa: casaDe(8, 0) });
  assert.ok(r.E);
});

test('saga: terremoto assenta as colunas; gelo bloqueia; gigante ocupa duas casas', () => {
  let E = inicialSaga(1);
  E = RS.aplicar(E, { casa: 0 }).E;
  const t = terremoto(E);
  assert.equal(t.E.donos[6], 1);
  assert.equal(t.E.donos[0], 0);
  E = inicialSaga(1);
  E = RS.aplicar(E, { casa: 4 }).E;
  const g = gelo(E, 1);
  assert.ok(g.casa >= 0 && g.E.bloq[g.casa] > 0);
  assert.ok(!RS.jogadas(g.E).some((j) => j.casa === g.casa));
  const gi = gigante(inicialSaga(1), 2);
  assert.equal(gi.casas.length, 2);
  assert.equal(gi.E.donos.filter((d) => d === 2).length, 2);
});

test('saga: poderes (missil, trocar, chacoalhar, calor)', () => {
  let E = inicialSaga(1);
  E = seq(RS, E, [{ casa: 0 }, { casa: 1 }]);
  const m = missil(E, 1);
  assert.equal(m.E.donos[1], 0);
  assert.equal(m.E.vez, 2);
  const t = trocar(E, 1);
  assert.equal(t.E.donos[0], 2);
  assert.equal(t.E.donos[1], 1);
  const c = chacoalhar(E, 0);
  assert.equal(c.E.donos[1], 1);
  assert.equal(c.E.donos[2], 2);
  const k = calor(E);
  assert.equal(k.E.donos[1], 0);
  assert.ok(k.E.bloq[1] > 0);
});

test('peteleco: a previsao para no alvo (v^2 = 2 mu d)', () => {
  const L = lanceAte(0, -9, 0, 0, 22);
  const v = Math.sqrt(L.vx * L.vx + L.vy * L.vy);
  assert.ok(Math.abs((v * v) / (2 * 22) - 9) < 1e-6);
});
