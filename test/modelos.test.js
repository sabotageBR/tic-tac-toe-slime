// Os 6 modelos com o bot: cada submodo, contra a CPU e com 2 jogadores, joga ate o fim de uma
// partida sem excecao nem NaN, o hud() e o visual() saem validos, as pecas logicas assentam no
// nicho delas, e a mesma semente da o mesmo hash da fisica.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MODELOS } from '../src/jogo/modelos.js';

const QUADROS_MAX = 60 * 150;

/** @param {any} M @param {number} cada */
function jogarAteOFim(M, cada = 22) {
  for (let q = 0; q < QUADROS_MAX; q++) {
    if (q % cada === 0) M.bot();
    M.passo(1 / 60);
    let fim = null;
    for (const e of M.eventos) if (e.tipo === 'fim') fim = e;
    M.eventos.length = 0;
    for (const s of M.mundo.slimes) {
      if (s.ativo) assert.ok(Number.isFinite(s.cx) && Number.isFinite(s.cy), 'NaN no slime ' + s.idx);
    }
    if (q % 90 === 0) {
      const h = M.hud();
      assert.ok(h && h.placar && typeof h.vez === 'number', 'hud');
      assert.ok(M.visual(), 'visual');
      // pecas logicas assentadas dentro do nicho (modelos de estante)
      if (M.api && M.estado === 'vez' && M.tabuleiro.dentro) {
        for (const p of M.api.pecas.values()) {
          const s = p.s;
          if (!s.ativo || s.preso || s.dados.derretendo || s.dados.semRede || s.dados.dentroDe) continue;
          assert.ok(M.tabuleiro.dentro(p.casa, s.cx, s.cy, 0.5), `peca fora do nicho ${p.casa}`);
        }
      }
    }
    if (fim) return { q, fim };
  }
  return { q: QUADROS_MAX, fim: null };
}

for (const [id, MOD] of Object.entries(MODELOS)) {
  if (id === '0') continue;
  const subs = MOD.criarModo({ semente: 1 }).submodos.map((s) => s.id);
  for (const sub of subs) {
    for (const dois of [false, true]) {
      test(`modelo ${id} (${MOD.id}) ${sub} ${dois ? '2P' : 'CPU'}: joga ate o fim`, () => {
        const M = MOD.criarModo({ semente: 3, regra: sub, doisJogadores: dois, hoje: '2026-11-07' });
        const { fim } = jogarAteOFim(M);
        assert.ok(fim, 'a partida nao terminou');
      });
    }
  }
}

test('determinismo: mesma semente e mesmos lances dao o mesmo hash', () => {
  const rodar = () => {
    const M = MODELOS['6'].criarModo({ semente: 9, regra: 'encher' });
    for (let q = 0; q < 600; q++) { if (q % 30 === 0) M.bot(); M.passo(1 / 60); M.eventos.length = 0; }
    return M.mundo.hash();
  };
  assert.equal(rodar(), rodar());
});
