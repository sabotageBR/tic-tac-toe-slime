// Serie Tech (modelos 7 a 12): as regras de cada versao (invariantes e casos de borda), a CPU e o
// determinismo dos modos. O "joga ate o fim" de cada submodo (CPU e 2P) ja roda em
// test/modelos.test.js, que percorre o registro inteiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MODELOS } from '../src/jogo/modelos.js';
import { escolher } from '../src/jogo/ia.js';
import { criarRng } from '../src/core/rng.js';
import { criarRegras as sobrecarga, limite } from '../src/jogo/regras/sobrecarga.js';
import { REGRAS as QUANTICA, cascata } from '../src/jogo/regras/quantica.js';
import { criarRegras as cubo, LINHAS as LINHAS_CUBO, CENTRO } from '../src/jogo/regras/cubo.js';
import { criarRegras as orbita, girar, casaGirada } from '../src/jogo/regras/orbita.js';
import { criarRegras as repulsor } from '../src/jogo/regras/repulsor.js';
import { REGRAS as SINCRONIA, passar } from '../src/jogo/regras/sincronia.js';

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

// ------------------------------------------------------------------ 7, Quantica
/** @param {any} R @param {any[]} js */
const jogar = (R, js, E = R.inicial({ comeca: 1 })) => js.reduce((F, j) => R.aplicar(F, j).E, E);

test('quantica: o par emaranha duas casas e nao ocupa nenhuma', () => {
  const E = jogar(QUANTICA, [{ a: 0, b: 1 }]);
  assert.equal(E.marcas.length, 1);
  assert.deepEqual(E.classicas, new Array(9).fill(0));
  assert.equal(E.vez, 2);
  assert.equal(QUANTICA.jogadas(E).length, 36, 'as duas casas continuam livres para novos pares');
});

test('quantica: fechar o ciclo pede o colapso ao rival, que escolhe e joga em seguida', () => {
  // 1: 0-1, 2: 1-2, 1: 2-0 fecha o triangulo
  const E = jogar(QUANTICA, [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 0, b: 2 }]);
  assert.deepEqual(E.colapso, { id: 3, a: 0, b: 2 });
  assert.equal(E.vez, 2, 'quem escolhe e o rival de quem fechou');
  assert.deepEqual(QUANTICA.jogadas(E), [{ colapso: 0 }, { colapso: 2 }]);
  assert.equal(QUANTICA.resultado(E), null);
  const F = QUANTICA.aplicar(E, { colapso: 0 }).E;
  // a marca 3 (do 1) caiu na 0; a 1 (do 1) vai para a 1; a 2 (do 2) vai para a 2
  assert.deepEqual(F.classicas.slice(0, 3), [1, 1, 2]);
  assert.deepEqual(F.ordem.slice(0, 3), [3, 1, 2]);
  assert.equal(F.marcas.length, 0);
  assert.equal(F.colapso, null);
  assert.equal(F.vez, 2, 'a vez nao muda no colapso');
  assert.ok(QUANTICA.jogadas(F).every((j) => j.a > 2 && j.b > 2), 'casa classica sai do jogo');
  // a outra escolha gira o ciclo para o outro lado: a 3 (do 1) na 2, a 2 (do 2) na 1, a 1 (do 1) na 0
  const G2 = QUANTICA.aplicar(E, { colapso: 2 }).E;
  assert.deepEqual(G2.classicas.slice(0, 3), [1, 2, 1]);
});

test('quantica: o colapso leva junto a marca pendurada no ciclo e deixa as outras', () => {
  // ciclo 0-1 / 0-1 (duas marcas no mesmo par), uma pendurada 1-4 e uma solta 7-8
  let E = jogar(QUANTICA, [{ a: 0, b: 1 }, { a: 1, b: 4 }, { a: 7, b: 8 }, { a: 0, b: 1 }]);
  assert.ok(E.colapso);
  const lista = cascata(E, 0);
  assert.equal(lista.length, 3);
  E = QUANTICA.aplicar(E, { colapso: 0 }).E;
  assert.deepEqual([E.classicas[0], E.classicas[1], E.classicas[4]], [2, 1, 2]);
  assert.equal(E.marcas.length, 1, 'o par 7-8 continua em superposicao');
  assert.equal(E.classicas[7] + E.classicas[8], 0);
});

test('quantica: duas linhas no mesmo colapso, vence a que ficou pronta mais cedo', () => {
  const E = { ...QUANTICA.inicial({ comeca: 1 }), classicas: [1, 1, 1, 2, 2, 2, 0, 0, 0], ordem: [1, 3, 9, 2, 4, 6, 0, 0, 0] };
  assert.equal(QUANTICA.resultado(E).vencedor, 2, 'a linha do 2 fechou no lance 6; a do 1, no 9');
});

test('quantica: toda partida termina e nenhuma casa recebe duas marcas', () => {
  for (let g = 0; g < 10; g++) {
    const { res } = partida(QUANTICA, 2, 1, 300 + g, (g % 2) + 1, (F) => {
      for (let c = 0; c < 9; c++) assert.equal(!!F.classicas[c], F.ordem[c] > 0);
      for (const m of F.marcas) assert.ok(!F.classicas[m.a] && !F.classicas[m.b], 'marca em casa classica');
    });
    assert.ok(res, 'nao terminou');
  }
});

test('quantica: o nivel 4 vence o nivel 0', () => forteVence(QUANTICA, 12));

// ------------------------------------------------------------------ 8, Holo Cubo
test('cubo: 49 linhas de 3, todas retas e sem repeticao', () => {
  assert.equal(LINHAS_CUBO.length, 49);
  assert.equal(new Set(LINHAS_CUBO.map((l) => [...l].sort((a, b) => a - b).join(','))).size, 49);
  for (const l of LINHAS_CUBO) assert.equal(l[1] - l[0], l[2] - l[1]);
});

test('cubo: o bloco empilha na coluna e a coluna do meio pula o nucleo', () => {
  const R = cubo('linha', { nucleo: true });
  let E = R.inicial({ comeca: 1 });
  assert.equal(E.donos[CENTRO], 3);
  E = jogar(R, [{ col: 0 }, { col: 0 }, { col: 0 }], E);
  assert.deepEqual([E.donos[0], E.donos[9], E.donos[18]], [1, 2, 1]);
  assert.ok(!R.jogadas(E).some((j) => j.col === 0), 'coluna cheia');
  E = jogar(R, [{ col: 4 }, { col: 4 }], E);
  assert.deepEqual([E.donos[4], E.donos[13], E.donos[22]], [2, 3, 1]);
  assert.ok(!R.jogadas(E).some((j) => j.col === 4));
});

test('cubo: linha vertical vence; o nucleo nao fecha linha de ninguem', () => {
  const R = cubo('linha', { nucleo: true });
  const E = jogar(R, [{ col: 0 }, { col: 1 }, { col: 0 }, { col: 1 }, { col: 0 }].slice(0, 5), R.inicial({ comeca: 1 }));
  // 1 em 0 (z0), 2 em 1 (z0), 1 em 0 (z1), 2 em 1 (z1), 1 em 0 (z2)
  assert.deepEqual(R.resultado(E), { vencedor: 1, linha: [0, 9, 18] });
  const F = { ...R.inicial({ comeca: 1 }), donos: Object.assign(new Array(27).fill(0), { 4: 1, 13: 3, 22: 1 }) };
  assert.equal(R.resultado(F), null);
});

test('cubo: no modo Pontos a partida vai ate encher e conta as linhas', () => {
  const R = cubo('pontos', { nucleo: true });
  const { res, lances } = partida(R, 2, 2, 5);
  assert.equal(lances, 26);
  assert.ok(res.pontos && res.pontos[1] >= 0 && res.pontos[2] >= 0);
  assert.equal(res.vencedor, res.pontos[1] > res.pontos[2] ? 1 : res.pontos[2] > res.pontos[1] ? 2 : 0);
});

test('cubo: o nivel 4 vence o nivel 0', () => forteVence(cubo('linha', { nucleo: true }), 10));

// ------------------------------------------------------------------ 10, Orbita
test('orbita: girar 4 vezes volta ao comeco e casaGirada segue a mesma conta', () => {
  const v = Array.from({ length: 16 }, (_, i) => i);
  let w = v;
  for (let k = 0; k < 4; k++) w = girar(w, 4);
  assert.deepEqual(w, v);
  const g = girar(v, 4);
  for (let i = 0; i < 16; i++) assert.equal(g[casaGirada(i, 4)], i);
  assert.equal(casaGirada(0, 4), 3, 'o canto de cima a esquerda vai para cima a direita (horario)');
});

test('orbita: o modulo cai ate o fundo, a estacao gira e ele cai de novo', () => {
  const R = orbita(4, 3, { direto: false });
  const r = R.aplicar(R.inicial({ comeca: 1 }), { col: 3 });
  assert.deepEqual(r.efeitos.map((e) => e.tipo), ['cair', 'girar', 'assentar']);
  assert.equal(r.efeitos[0].casa, 15, 'caiu no canto de baixo a direita');
  // (3, 3) gira para (3, 0): ja esta no fundo
  assert.equal(r.E.donos[12], 1);
  assert.equal(r.E.donos.filter(Boolean).length, 1);
  // o segundo na coluna 0 cai em cima dele; no giro os dois vao para a linha 0 e 1 da... coluna 0 e caem
  const F = R.aplicar(r.E, { col: 0 }).E;
  assert.equal(F.donos.filter(Boolean).length, 2);
  for (let c = 0; c < 4; c++) {
    let vazio = false;
    for (let rr = 3; rr >= 0; rr--) {
      if (!F.donos[rr * 4 + c]) vazio = true;
      else assert.ok(!vazio, 'modulo flutuando depois de assentar');
    }
  }
});

test('orbita: partidas terminam, nada flutua e os ids acompanham os donos', () => {
  for (const [n, k] of [[5, 4], [4, 3]]) {
    const R = orbita(n, k, { direto: false });
    for (let g = 0; g < 6; g++) {
      const { res } = partida(R, 2, 2, 90 + g, (g % 2) + 1, (F) => {
        for (let i = 0; i < n * n; i++) assert.equal(!!F.donos[i], !!F.ids[i]);
        assert.equal(new Set(F.ids.filter(Boolean)).size, F.ids.filter(Boolean).length, 'id repetido');
      });
      assert.ok(res, 'nao terminou');
    }
  }
});

test('orbita: o nivel 4 vence o nivel 0', () => forteVence(orbita(5, 4, { direto: false }), 12));

// ------------------------------------------------------------------ 11, Repulsor
test('repulsor: empurra a vizinha livre, nao empurra a travada e ejeta a da borda', () => {
  const R = repulsor(4, 3, 'repulsor', { dirs: 4 });
  let E = R.inicial({ comeca: 1 });
  // 1 na casa 5 (linha 1, coluna 1); 2 na casa 4 (a esquerda dela): empurra a 5 para a 6
  E = jogar(R, [{ casa: 5 }, { casa: 4 }], E);
  assert.equal(E.donos[5], 0);
  assert.equal(E.donos[6], 1);
  assert.equal(E.donos[4], 2);
  // 1 na casa 5: empurra a 4 para fora (borda esquerda) e a 6 para a 7
  const r = R.aplicar(E, { casa: 5 });
  const campo = r.efeitos.find((e) => e.tipo === 'campo');
  assert.equal(campo.movs.length, 2);
  assert.ok(campo.movs.some((m) => m.fora && m.de === 4), 'a peca da borda foi ejetada');
  assert.equal(r.E.donos[4], 0);
  assert.deepEqual([r.E.donos[5], r.E.donos[6], r.E.donos[7]], [1, 0, 1]);
  // travada: com a 7 ocupada, a 6 nao anda
  const T = { ...R.inicial({ comeca: 1 }), donos: Object.assign(new Array(16).fill(0), { 6: 2, 7: 1 }), ids: Object.assign(new Array(16).fill(0), { 6: 1, 7: 2 }), prox: 3 };
  assert.equal(R.prever(T, 5).length, 0);
});

test('repulsor: a previa bate com o lance e a diagonal nao e empurrada', () => {
  const R = repulsor(4, 3, 'repulsor', { dirs: 4 });
  const E = jogar(R, [{ casa: 0 }, { casa: 15 }, { casa: 10 }], R.inicial({ comeca: 1 }));
  // 2 joga na 5: a 0 e a 10 sao diagonais dela e ficam
  const F = R.aplicar(E, { casa: 5 }).E;
  assert.deepEqual([F.donos[0], F.donos[10], F.donos[5]], [1, 1, 2]);
  assert.deepEqual(R.prever(E, 5), []);
});

test('atrator: puxa para a casa vizinha quem esta a 2 casas em linha reta', () => {
  const R = repulsor(5, 4, 'atrator', { dirs: 4 });
  const E = jogar(R, [{ casa: 10 }], R.inicial({ comeca: 1 }));
  // 2 joga na 12 (mesma linha, 2 casas a direita): a 10 vem para a 11
  const F = R.aplicar(E, { casa: 12 }).E;
  assert.deepEqual([F.donos[10], F.donos[11], F.donos[12]], [0, 1, 2]);
});

test('repulsor e atrator: partidas terminam e os ids acompanham os donos', () => {
  for (const R of [repulsor(4, 3, 'repulsor', { dirs: 4, teto: 36 }), repulsor(5, 4, 'atrator', { dirs: 4, teto: 36 })]) {
    for (let g = 0; g < 6; g++) {
      const { res, lances } = partida(R, 2, 2, 400 + g, (g % 2) + 1, (F) => {
        for (let i = 0; i < F.donos.length; i++) assert.equal(!!F.donos[i], !!F.ids[i]);
      });
      assert.ok(res, 'nao terminou');
      assert.ok(lances <= 36);
    }
  }
});

test('repulsor: o nivel 4 vence o nivel 0', () => forteVence(repulsor(4, 3, 'repulsor', { dirs: 4, teto: 36 }), 12));

// ------------------------------------------------------------------ 12, Sincronia
test('sincronia: a falha passa a vez sem marca e o teto de tentativas da empate', () => {
  let E = SINCRONIA.inicial({ comeca: 1 });
  E = passar(E);
  assert.equal(E.vez, 2);
  assert.equal(E.falhas, 1);
  assert.deepEqual(E.donos, new Array(9).fill(0));
  for (let k = 0; k < 39; k++) E = passar(E);
  assert.deepEqual(SINCRONIA.resultado(E), { vencedor: 0 });
  assert.equal(SINCRONIA.jogadas(E).length, 0);
});

test('sincronia: travar em casa ocupada e falha; o feixe so anda na vez', () => {
  const M = MODELOS['12'].criarModo({ semente: 4, regra: 'sincronia', doisJogadores: true });
  const lances = [];
  const rodar = (n) => { for (let q = 0; q < n; q++) { M.passo(1 / 60); for (const e of M.eventos) if (e.tipo === 'lance') lances.push(e.jogada); M.eventos.length = 0; } };
  rodar(3);
  M.apontar(0, 0, 'baixo'); // trava na casa 0 (o feixe acabou de comecar)
  rodar(2);
  assert.deepEqual(lances, [{ casa: 0 }]);
  const casa = M.visual().scan.casa;
  rodar(20); // encenando: o feixe fica parado
  assert.equal(M.visual().scan.casa, casa);
  // espera o feixe dar a volta e trava de novo na casa 0, agora ocupada
  for (let q = 0; q < 2000 && !(M.estado === 'vez' && M.visual().scan.casa === 0 && M.visual().scan.frac > 0.2); q++) rodar(1);
  M.apontar(0, 0, 'baixo');
  rodar(2);
  assert.deepEqual(lances[1], { falha: 0 });
  assert.equal(M.E.falhas, 1);
  assert.equal(M.E.vez, 1, 'a vez passou de volta');
});

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
