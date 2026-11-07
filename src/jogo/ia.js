// CPU dos modelos de vez: negamax com poda alfa-beta, tabela de transposicao e aprofundamento
// iterativo. O orcamento e em NOS visitados, nunca em tempo: a mesma posicao e a mesma semente
// dao sempre o mesmo lance (determinismo dos testes, GIFs e filmes).
// Cada regra (src/jogo/regras/*.js) expoe: jogadas(E), aplicar(E, j) -> { E }, resultado(E),
// chave(E) e avaliar(E, jogador). E.vez e quem joga.

/**
 * Niveis da CPU: chance de um lance sorteado (o erro de proposito) e profundidade da busca.
 * O 4 joga perfeito no 3x3.
 */
export const NIVEIS = Object.freeze([
  { erro: 0.55, prof: 1 },
  { erro: 0.35, prof: 2 },
  { erro: 0.2, prof: 4 },
  { erro: 0.08, prof: 6 },
  { erro: 0, prof: 12 },
]);

const VITORIA = 10000;

/**
 * @typedef {Object} Regras
 * @property {(E: any) => any[]} jogadas
 * @property {(E: any, j: any) => { E: any }} aplicar
 * @property {(E: any) => ({ vencedor: number, linha?: number[] }|null)} resultado vencedor 0 = empate
 * @property {(E: any) => string} chave
 * @property {(E: any, jogador: number) => number} avaliar
 */

/**
 * Valor da posicao para quem joga (E.vez), com orcamento de nos.
 * @param {Regras} R @param {any} E @param {number} prof @param {{ nos: number, max: number, tt: Map<string, any> }} ctx
 */
function negamax(R, E, prof, alfa, beta, ply, ctx) {
  ctx.nos++;
  const res = R.resultado(E);
  if (res) {
    if (!res.vencedor) return 0;
    return (res.vencedor === E.vez ? 1 : -1) * (VITORIA - ply);
  }
  if (prof <= 0 || ctx.nos > ctx.max) return R.avaliar(E, E.vez);
  const chave = R.chave(E);
  const tt = ctx.tt.get(chave);
  if (tt && tt.prof >= prof) {
    if (tt.tipo === 0) return tt.v;
    if (tt.tipo < 0 && tt.v <= alfa) return tt.v;
    if (tt.tipo > 0 && tt.v >= beta) return tt.v;
  }
  const js = R.jogadas(E);
  if (!js.length) return R.avaliar(E, E.vez);
  // o melhor lance da tabela primeiro (poda mais cedo)
  if (tt && tt.melhor > 0 && tt.melhor < js.length) {
    const m = js[tt.melhor];
    js[tt.melhor] = js[0];
    js[0] = m;
  }
  const a0 = alfa;
  let melhor = -Infinity;
  let im = 0;
  for (let i = 0; i < js.length; i++) {
    const v = -negamax(R, R.aplicar(E, js[i]).E, prof - 1, -beta, -alfa, ply + 1, ctx);
    if (v > melhor) { melhor = v; im = i; }
    if (v > alfa) alfa = v;
    if (alfa >= beta) break;
  }
  const tipo = melhor <= a0 ? -1 : melhor >= beta ? 1 : 0;
  ctx.tt.set(chave, { prof, v: melhor, tipo, melhor: im });
  return melhor;
}

/**
 * Valores de cada lance da raiz (aprofundamento iterativo ate `prof` ou o orcamento acabar).
 * @param {Regras} R @param {any} E @param {number} prof @param {number} [orcamento] nos
 * @returns {{ jogadas: any[], valores: number[] }}
 */
export function avaliarLances(R, E, prof, orcamento = 30000) {
  const js = R.jogadas(E);
  let valores = js.map(() => 0);
  const ctx = { nos: 0, max: orcamento, tt: new Map() };
  for (let p = 1; p <= prof; p++) {
    const vs = [];
    for (const j of js) vs.push(-negamax(R, R.aplicar(E, j).E, p - 1, -Infinity, Infinity, 1, ctx));
    // so aceita a profundidade completa (a incompleta mistura nos cortados)
    if (ctx.nos > ctx.max && p > 1) break;
    valores = vs;
    // vitoria forcada achada: nao precisa ir mais fundo
    if (vs.some((v) => v > VITORIA / 2)) break;
    if (ctx.nos > ctx.max) break;
  }
  return { jogadas: js, valores };
}

/**
 * Ameacas imediatas: lances de `jogador` que ganham ja (com a vez dele).
 * @param {Regras} R @param {any} E
 */
function ganhaJa(R, E) {
  const out = [];
  for (const j of R.jogadas(E)) {
    const res = R.resultado(R.aplicar(E, j).E);
    if (res && res.vencedor === E.vez) out.push(j);
  }
  return out;
}

/**
 * Lance da CPU.
 * @param {Regras} R @param {any} E
 * @param {{ nivel?: number, rng: () => number, poupar?: boolean, orcamento?: number, prof?: number, erro?: number }} o
 *   poupar: a 1a partida da vida (nao fecha linha e nao tapa a primeira ameaca do humano)
 * @returns {any} a jogada (ou null sem lances)
 */
export function escolher(R, E, o) {
  const N = NIVEIS[Math.max(0, Math.min(NIVEIS.length - 1, o.nivel === undefined ? 2 : o.nivel))];
  const erro = o.erro === undefined ? N.erro : o.erro;
  const prof = o.prof || N.prof;
  const js = R.jogadas(E);
  if (!js.length) return null;
  if (o.poupar) {
    // nao ganha e deixa a ameaca do outro de pe (quando ha alternativa)
    const outroE = { ...E, vez: E.vez === 1 ? 2 : 1 };
    const ameacas = ganhaJa(R, outroE).length;
    const bons = js.filter((j) => {
      const F = R.aplicar(E, j).E;
      const res = R.resultado(F);
      if (res && res.vencedor === E.vez) return false;
      if (!ameacas) return true;
      return ganhaJa(R, F).length > 0;
    });
    if (bons.length) return bons[Math.floor(o.rng() * bons.length) % bons.length];
  }
  if (o.rng() < erro) return js[Math.floor(o.rng() * js.length) % js.length];
  const { valores } = avaliarLances(R, E, prof, o.orcamento);
  let max = -Infinity;
  for (const v of valores) if (v > max) max = v;
  const melhores = [];
  for (let i = 0; i < js.length; i++) if (valores[i] >= max - 1e-9) melhores.push(js[i]);
  return melhores[Math.floor(o.rng() * melhores.length) % melhores.length];
}
