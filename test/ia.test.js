// A CPU: o nivel maximo nunca perde no classico (contra todas as respostas, de X e de O), e o
// mesmo lance sai com a mesma semente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { REGRAS as R } from '../src/jogo/regras/classica.js';
import { escolher, avaliarLances } from '../src/jogo/ia.js';
import { criarRng } from '../src/core/rng.js';

/** Percorre todas as respostas do adversario; a CPU (cpu) escolhe com o nivel 4. */
function nuncaPerde(E, cpu, rng, cont) {
  const res = R.resultado(E);
  if (res) {
    cont.fins++;
    assert.notEqual(res.vencedor, cpu === 1 ? 2 : 1, 'a CPU perdeu: ' + E.donos.join(''));
    return;
  }
  if (E.vez === cpu) {
    const j = escolher(R, E, { nivel: 4, rng });
    nuncaPerde(R.aplicar(E, j).E, cpu, rng, cont);
  } else {
    for (const j of R.jogadas(E)) nuncaPerde(R.aplicar(E, j).E, cpu, rng, cont);
  }
}

test('classico: nivel 4 nunca perde jogando de X', () => {
  const cont = { fins: 0 };
  nuncaPerde(R.inicial({ comeca: 1 }), 1, criarRng(7), cont);
  assert.ok(cont.fins > 10);
});

test('classico: nivel 4 nunca perde jogando de O', () => {
  const cont = { fins: 0 };
  nuncaPerde(R.inicial({ comeca: 1 }), 2, criarRng(9), cont);
  assert.ok(cont.fins > 100);
});

test('classico: fecha a linha quando pode e tapa a do outro', () => {
  // X X . / O O . / . . .  com a vez do X: ganha em 2
  let E = R.inicial();
  for (const casa of [0, 3, 1, 4]) E = R.aplicar(E, { casa }).E;
  const j = escolher(R, E, { nivel: 4, rng: criarRng(1) });
  assert.equal(j.casa, 2);
  const { valores } = avaliarLances(R, E, 4);
  assert.ok(Math.max(...valores) > 1000);
});

test('ia: deterministica pela semente', () => {
  const E = R.inicial();
  const a = escolher(R, E, { nivel: 1, rng: criarRng(42) });
  const b = escolher(R, E, { nivel: 1, rng: criarRng(42) });
  assert.deepEqual(a, b);
});

test('ia: poupar deixa a ameaca do humano de pe', () => {
  // humano (1) com X X . na linha de cima; a CPU (2) poupa: nao joga na casa 2
  let E = R.inicial();
  E = R.aplicar(E, { casa: 0 }).E;
  E = R.aplicar(E, { casa: 4 }).E;
  E = R.aplicar(E, { casa: 1 }).E;
  for (let s = 1; s < 20; s++) {
    const j = escolher(R, E, { nivel: 4, rng: criarRng(s), poupar: true });
    assert.notEqual(j.casa, 2);
  }
});
