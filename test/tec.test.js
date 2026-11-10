// Serie Tech (modelos 7 a 12): as regras de cada versao (invariantes e casos de borda), a CPU e o
// determinismo dos modos. O "joga ate o fim" de cada submodo (CPU e 2P) ja roda em
// test/modelos.test.js, que percorre o registro inteiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MODELOS } from '../src/jogo/modelos.js';
import { escolher } from '../src/jogo/ia.js';
import { criarRng } from '../src/core/rng.js';
import { criarRegras as sobrecarga, limite } from '../src/jogo/regras/sobrecarga.js';

/** Partida inteira entre dois niveis da CPU. @returns {{ res: any, lances: number, E: any }} */
function partida(R, nivelA, nivelB, semente, comeca = 1, aCada = null) {
  const rng = criarRng(semente);
  let E = R.inicial({ comeca });
  let lances = 0;
  while (!R.resultado(E) && lances < 400) {
    const j = escolher(R, E, { nivel: E.vez === 1 ? nivelA : nivelB, rng });
    assert.ok(j, 'sem jogada numa posicao que nao acabou');
    E = R.aplicar(E, j).E;
    lances++;
    if (aCada) aCada(E);
  }
  return { res: R.resultado(E), lances, E };
}

/** O nivel 4 ganha do nivel 0 na maioria (alternando quem comeca). */
function forteVence(R, partidas = 16) {
  let forte = 0;
  for (let g = 0; g < partidas; g++) {
    const { res } = partida(R, 4, 0, 50 + g * 3, (g % 2) + 1);
    assert.ok(res, 'a partida nao terminou');
    if (res.vencedor === 1) forte++;
  }
  assert.ok(forte >= partidas * 0.7, `nivel 4 venceu so ${forte} de ${partidas}`);
}

const soma = (a) => a.reduce((x, y) => x + y, 0);

// ------------------------------------------------------------------ 9, Sobrecarga
test('sobrecarga: o limite e o numero de vizinhos (2 canto, 3 borda, 4 meio)', () => {
  assert.deepEqual([0, 1, 4].map((c) => limite(3, c)), [2, 3, 4]);
  assert.deepEqual([0, 1, 5].map((c) => limite(4, c)), [2, 3, 4]);
});

test('sobrecarga: o canto descarrega no 2o toque, esvazia e captura os dois vizinhos', () => {
  const R = sobrecarga(3, 3);
  let E = R.inicial({ comeca: 1 });
  E = R.aplicar(E, { casa: 0 }).E; // 1
  E = R.aplicar(E, { casa: 8 }).E; // 2
  const r = R.aplicar(E, { casa: 0 });
  assert.equal(r.efeitos.filter((e) => e.tipo === 'onda').length, 1);
  assert.equal(r.E.donos[0], 0);
  assert.equal(r.E.carga[0], 0);
  assert.deepEqual([r.E.donos[1], r.E.donos[3]], [1, 1]);
  assert.deepEqual([r.E.carga[1], r.E.carga[3]], [1, 1]);
});

test('sobrecarga: a descarga toma a casa do rival e a carga total e o numero de lances', () => {
  const R = sobrecarga(3, 3);
  let E = R.inicial({ comeca: 1 });
  for (const casa of [0, 1, 0]) E = R.aplicar(E, { casa }).E; // 1 no canto, 2 na borda, 1 descarrega
  assert.equal(E.donos[1], 1, 'a borda do rival foi capturada');
  assert.equal(E.carga[1], 2);
  assert.equal(soma(E.carga), 3);
  assert.ok(!R.jogadas(E).some((j) => j.casa === 1), 'o rival nao pode carregar casa que nao e dele');
});

test('sobrecarga: partidas de CPU terminam com vencedor, sem empate, e conservam a carga', () => {
  for (const [n, k, bonus] of [[3, 3, 1], [4, 4, 5]]) {
    const R = sobrecarga(n, k, 0, bonus);
    for (let g = 0; g < 6; g++) {
      const { res, lances, E } = partida(R, 3, 3, 7 + g, (g % 2) + 1, (F) => {
        assert.equal(soma(F.carga), F.lances + 1, 'carga total = lances + o nucleo inicial do segundo');
        for (let i = 0; i < F.donos.length; i++) assert.equal(!!F.donos[i], F.carga[i] > 0, 'dono sem carga (ou carga sem dono)');
      });
      assert.ok(res && res.vencedor, `${n}x${n}: terminou sem vencedor em ${lances} lances`);
      assert.ok(E.lances < 60);
    }
  }
});

test('sobrecarga: o nivel 4 vence o nivel 0', () => forteVence(sobrecarga(3, 3, 0, 1)));

// ------------------------------------------------------------------ modos
test('tech: mesma semente e mesmos lances dao a mesma partida', () => {
  for (const id of Object.keys(MODELOS).filter((k) => MODELOS[k].tec)) {
    const rodar = () => {
      const M = MODELOS[id].criarModo({ semente: 11 });
      const fita = [];
      for (let q = 0; q < 900; q++) {
        if (q % 25 === 0) M.bot();
        M.passo(1 / 60);
        for (const e of M.eventos) if (e.tipo === 'lance') fita.push(JSON.stringify(e.jogada));
        M.eventos.length = 0;
      }
      return fita.join('|');
    };
    const a = rodar();
    assert.ok(a.length > 0, `modelo ${id}: nenhum lance`);
    assert.equal(a, rodar(), `modelo ${id}`);
  }
});

test('tech: o palco nunca tem NaN e as pecas somem entre as partidas', () => {
  for (const id of Object.keys(MODELOS).filter((k) => MODELOS[k].tec)) {
    for (const s of MODELOS[id].criarModo({ semente: 1 }).submodos) {
      const M = MODELOS[id].criarModo({ semente: 5, regra: s.id });
      let fins = 0;
      for (let q = 0; q < 60 * 240 && fins < 2; q++) {
        if (q % 20 === 0) M.bot();
        M.passo(1 / 60);
        for (const e of M.eventos) if (e.tipo === 'fim') fins++;
        M.eventos.length = 0;
        for (const p of M.palco.pecas.values()) {
          assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.esc) && Number.isFinite(p.alfa), `NaN na peca ${p.id} (${id} ${s.id})`);
        }
      }
      assert.equal(fins, 2, `${id} ${s.id}: nao encadeou duas partidas`);
      assert.ok(M.hud().partidas >= 2);
    }
  }
});

test('tech: toques(jogada) devolve pontos dentro da janela para toda jogada legal', () => {
  for (const id of Object.keys(MODELOS).filter((k) => MODELOS[k].tec)) {
    for (const s of MODELOS[id].criarModo({ semente: 1 }).submodos) {
      const M = MODELOS[id].criarModo({ semente: 2, regra: s.id, doisJogadores: true });
      const [x0, y0, x1, y1] = M.janela;
      const js = M.api.vez.jogadas;
      assert.ok(js.length > 0);
      for (const j of js) {
        const pts = M.toques(j);
        assert.ok(pts.length > 0, `${id} ${s.id}: sem toque para ${JSON.stringify(j)}`);
        for (const [x, y] of pts) assert.ok(x >= x0 && x <= x1 && y >= y0 && y <= y1, `${id} ${s.id}: toque fora da janela`);
      }
    }
  }
});
