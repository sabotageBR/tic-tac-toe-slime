// Modelo 6, Potes da Velha: a fisica decide (volume conservado, dono pela contagem, o ladrao do
// Transborda manda a sobra para o pote de baixo) e as regras logicas da CPU.
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarModo, contar, DOSE_N } from '../src/jogo/modos/potes.js';
import { REGRAS_POTES as R, inicialPotes, donoDe } from '../src/jogo/regras/potes.js';

/** Joga a sequencia de casas (2 jogadores, alternando) e espera assentar. */
function jogarSeq(sub, seq, extra = 0, quadrosMax = 60 * 40) {
  const M = criarModo({ semente: 3, regra: sub, doisJogadores: true });
  let k = 0;
  const tempos = [];
  let t0 = 0;
  for (let q = 0; q < quadrosMax && (k < seq.length || M.estado === 'encenando'); q++) {
    if (M.estado === 'vez' && k < seq.length) {
      if (k > 0) tempos.push(q - t0);
      assert.ok(M.jogar({ casa: seq[k] }), 'lance ' + k);
      t0 = q;
      k++;
    }
    M.passo(1 / 60);
    M.eventos.length = 0;
  }
  for (let q = 0; q < extra && M.estado !== 'fim'; q++) { M.passo(1 / 60); M.eventos.length = 0; }
  return { M, tempos };
}

test('potes: cada dose cai inteira no pote escolhido e o volume se conserva', () => {
  const { M } = jogarSeq('encher', [4, 0, 4]);
  const c = contar(M.mundo, M.potes());
  assert.equal(M.mundo.n, 3 * DOSE_N);
  assert.equal(c.a[4], 2 * DOSE_N);
  assert.equal(c.b[0], DOSE_N);
});

test('potes: o lance assenta em menos de 2,5 s', () => {
  const { tempos } = jogarSeq('encher', [4, 0, 4, 1, 2]);
  for (const t of tempos) assert.ok(t < 150, 'quadros: ' + t);
});

test('potes: pote cheio fecha com o dono da maioria das particulas (2 x 1)', () => {
  const { M } = jogarSeq('encher', [4, 4, 4]);
  assert.equal(M.E.dono[4], 1);
  const { M: N } = jogarSeq('encher', [4, 4, 0, 4]);
  assert.equal(N.E.dono[4], 2);
});

test('potes: no Classico uma dose fecha o pote e tres em linha vencem', () => {
  const { M } = jogarSeq('classico', [0, 3, 1, 4, 2]);
  assert.equal(M.E.dono[0], 1);
  const res = R.resultado(M.E);
  assert.ok(res && res.vencedor === 1);
});

test('potes: Transborda, a sobra sai pelo ladrao e cai no pote de baixo', () => {
  const { M } = jogarSeq('transborda', [1, 1, 1, 1, 1], 240);
  const c = contar(M.mundo, M.potes());
  const embaixo = c.a[4] + c.b[4];
  assert.ok(embaixo >= DOSE_N * 0.6, 'no pote de baixo: ' + embaixo);
  assert.ok(c.a[1] + c.b[1] <= DOSE_N * 3.8, 'no de cima: ' + (c.a[1] + c.b[1]));
  // nada some (a bandeja so pega a sobra da fileira de baixo)
  assert.equal(M.mundo.n, 5 * DOSE_N);
});

test('regras dos potes: dono, empate e cascata logica', () => {
  assert.equal(donoDe(2, 1), 1);
  assert.equal(donoDe(1, 1), 3);
  let E = inicialPotes('transborda', 1);
  for (let k = 0; k < 4; k++) E = R.aplicar(E, { casa: 1 }).E;
  assert.ok(E.dono[1]);
  assert.equal(E.a[4] + E.b[4], 1);
  let G = inicialPotes('grandes', 1);
  assert.equal(G.cap[4], 4);
  assert.equal(G.cap[1], 2);
  G = R.aplicar(G, { casa: 1 }).E;
  G = R.aplicar(G, { casa: 1 }).E;
  assert.equal(G.dono[1], 3);
});
