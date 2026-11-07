// As acoes fisicas que os modelos encenam (pingar do bico, saltar de nicho em nicho, derreter e
// escoar pelo ralo, estourar, encher de goo) e o cuidado de cada quadro com os slimes (pouso,
// caretas com prazo, humor e a rede de seguranca). Uma acao e { passo(dt) => terminou? }; o modo
// roda a fila delas e so devolve a vez quando a fila esvazia.
// Logica pura: sem DOM, relogio ou Math.random (o tempo entra por dt; sorteios pelo rng).

import { MATERIAIS } from '../fisica/materiais.js';
import { sentir, pancada, PANCADA } from './humor.js';
import { PIGMENTOS, HEX } from './cores.js';

/**
 * @typedef {{ m: any, eventos: any[] }} Ctx
 * @typedef {{ nome: string, passo: (dt: number) => boolean, s?: any }} Acao
 */

/**
 * Gota de um jogador (ou cinza com jogador 0).
 * @param {any} m mundo
 * @param {{ x: number, y: number, d: number, jogador: number, preso?: boolean, material?: any, id?: number, nivel?: number, pontos?: number[], pigmento?: number[], hex?: string }} o
 */
export function criarGota(m, o) {
  const s = m.criarSlime({
    x: o.x, y: o.y, diametro: o.d, pigmento: o.pigmento || PIGMENTOS[o.jogador] || PIGMENTOS[0], preso: !!o.preso,
    material: o.material || 'gelatina', nivel: o.nivel || o.jogador || 1, pontos: o.pontos,
  });
  if (!s) return null;
  s.dados.hex = o.hex || HEX[o.jogador] || HEX[0];
  s.dados.jogador = o.jogador;
  if (o.id !== undefined) s.dados.id = o.id;
  return s;
}

/**
 * Pinga uma gota do bico do teto do nicho: nasce pequena e presa, incha, solta e cai.
 * @param {Ctx} ctx
 * @param {{ x: number, y: number, d: number, jogador: number, id?: number, material?: any, nivel?: number, apos?: (s: any) => void }} o
 * @returns {Acao}
 */
export function pingar(ctx, o) {
  const { m, eventos } = ctx;
  let t = 0;
  /** @type {any} */
  let s = null;
  let escala = 0.45;
  let solto = false;
  return {
    nome: 'pingar',
    get s() { return s; },
    passo(dt) {
      if (!s) {
        s = criarGota(m, { ...o, preso: true });
        if (!s) return true;
        m.escalarForma(s, escala);
        s.dados.expr = 'contente';
        eventos.push({ tipo: 'som', nome: 'pingo', x: o.x, y: o.y });
        eventos.push({ tipo: 'pingo', x: o.x, y: o.y + o.d * 0.5, cor: s.dados.hex });
        if (o.apos) o.apos(s);
      }
      t += dt;
      if (!solto) {
        // incha ate o tamanho todo em ~0,2 s (a gota escorrendo do bico)
        const alvo = Math.min(1, 0.45 + (t / 0.2) * 0.55);
        if (alvo > escala + 1e-6) {
          m.escalarForma(s, alvo / escala);
          escala = alvo;
        }
        if (t >= 0.26) {
          if (escala < 1) { m.escalarForma(s, 1 / escala); escala = 1; }
          m.soltar(s, -3);
          s.dados.solto = m.tempo;
          s.dados.queda = 0;
          s.dados.pousou = false;
          s.dados.caindo = false;
          solto = true;
        }
        return false;
      }
      return !s.ativo || !!s.dados.pousou || t > 1.6;
    },
  };
}

/**
 * Salto de um slime ate (x, y): fica preso (atravessa vidro e gente), faz um arco e cai solto.
 * @param {Ctx} ctx
 * @param {{ s: any, x: number, y: number, dur?: number, altura?: number, soltar?: boolean, atras?: boolean }} o
 * @returns {Acao}
 */
export function saltar(ctx, o) {
  const { m, eventos } = ctx;
  const s = o.s;
  const dur = o.dur || 0.45;
  const alt = o.altura === undefined ? 1.6 : o.altura;
  let t = -1;
  let x0 = 0;
  let y0 = 0;
  let solto = false;
  let tSolto = 0;
  return {
    nome: 'saltar',
    s,
    passo(dt) {
      if (!s || !s.ativo) return true;
      if (t < 0) {
        t = 0;
        x0 = s.cx;
        y0 = s.cy;
        // a forma de repouso vira a de agora (sem estalo para o disco ao ficar preso)
        m.refazerForma(s);
        s.preso = true;
        s.alvoX = x0;
        s.alvoY = y0;
        s.dados.pousou = true;
        eventos.push({ tipo: 'som', nome: 'pulo', x: x0, y: y0 });
      }
      if (!solto) {
        t += dt;
        const u = Math.min(1, t / dur);
        // arco: sobe acima dos dois pontos e desce (parabola em u)
        const topo = Math.max(y0, o.y) + alt;
        const a = u < 0.5 ? y0 + (topo - y0) * (1 - (1 - 2 * u) * (1 - 2 * u)) : topo + (o.y - topo) * ((2 * u - 1) * (2 * u - 1));
        m.moverPreso(s, x0 + (o.x - x0) * u, a);
        if (u >= 1) {
          if (o.soltar === false) return true;
          m.soltar(s, -2);
          s.dados.solto = m.tempo;
          s.dados.pousou = false;
          s.dados.caindo = false;
          s.dados.queda = 0;
          solto = true;
        }
        return false;
      }
      tSolto += dt;
      return !!s.dados.pousou || tSolto > 1.2;
    },
  };
}

/**
 * Derrete e escoa pelo ralo do piso: calor (amolece), vira liquido e as particulas mais baixas
 * somem aos poucos. Chora enquanto derrete.
 * @param {Ctx} ctx @param {{ s: any, dur?: number }} o
 * @returns {Acao}
 */
export function derreter(ctx, o) {
  const { m, eventos } = ctx;
  const s = o.s;
  const dur = o.dur || 0.9;
  let t = -1;
  let n0 = 0;
  let saiu = 0;
  return {
    nome: 'derreter',
    s,
    passo(dt) {
      if (!s || !s.ativo) return true;
      if (t < 0) {
        t = 0;
        n0 = s.n || 1;
        s.preso = false;
        s.estado = 'calor';
        s.tEstado = 0.5;
        s.dados.expr = 'choro';
        s.dados.exprT = 9;
        s.dados.derretendo = true;
        m.amolecer(s, 0.15, 0);
        eventos.push({ tipo: 'som', nome: 'derrete', x: s.cx, y: s.cy });
        eventos.push({ tipo: 'derrete', x: s.cx, y: s.base, cor: s.dados.hex });
      }
      t += dt;
      if (t > 0.3 && s.mat !== MATERIAIS.liquido) {
        s.mat = MATERIAIS.liquido;
        s.dados.semRosto = true;
      }
      if (t > 0.35) {
        // escoa: tira as mais baixas, na proporcao do tempo
        const alvo = Math.min(n0, Math.ceil((n0 * (t - 0.35)) / dur));
        const tirar = alvo - saiu;
        if (tirar > 0) {
          const lista = [];
          for (let i = 0; i < m.n; i++) if (m.sl[i] === s.idx) lista.push(i);
          lista.sort((a, b) => (m.y[a] - m.y[b]) || (a - b));
          const sai = lista.slice(0, Math.min(tirar, lista.length));
          if (sai.length >= lista.length) {
            m.remover(s);
            return true;
          }
          const out = m.removerParticulas(sai);
          saiu += sai.length;
          if (out.length) eventos.push({ tipo: 'ralo', x: out[0], y: out[1], cor: s.dados.hex });
        }
      }
      if (t > dur + 0.6) {
        if (s.ativo) m.remover(s);
        return true;
      }
      return false;
    },
  };
}

/**
 * Estoura o slime (respingo e som). Instantaneo.
 * @param {Ctx} ctx @param {{ s: any, grande?: boolean }} o
 * @returns {Acao}
 */
export function estourar(ctx, o) {
  return {
    nome: 'estourar',
    passo() {
      const s = o.s;
      if (s && s.ativo) {
        ctx.eventos.push({ tipo: 'estouro', x: s.cx, y: s.cy, cor: s.dados.hex, r: s.raio0, grande: !!o.grande });
        ctx.m.remover(s);
      }
      return true;
    },
  };
}

/** Espera t segundos. @param {number} dur @returns {Acao} */
export function esperar(dur) {
  let t = 0;
  return { nome: 'esperar', passo(dt) { t += dt; return t >= dur; } };
}

/** Roda uma funcao uma vez (passo instantaneo da encenacao). @param {() => void} fn @returns {Acao} */
export function fazer(fn) {
  return { nome: 'fazer', passo() { fn(); return true; } };
}

/**
 * Varias acoes ao mesmo tempo; termina quando todas terminam.
 * @param {Acao[]} lista @returns {Acao}
 */
export function juntas(lista) {
  const vivas = lista.slice();
  return {
    nome: 'juntas',
    passo(dt) {
      for (let k = vivas.length - 1; k >= 0; k--) if (vivas[k].passo(dt)) vivas.splice(k, 1);
      return !vivas.length;
    },
  };
}

/**
 * Fila de acoes em sequencia (a encenacao de um lance).
 */
export function criarFila() {
  /** @type {Acao[]} */
  const fila = [];
  return {
    /** @param {...Acao} a */
    por(...a) { fila.push(...a); },
    get vazia() { return !fila.length; },
    get tamanho() { return fila.length; },
    limpar() { fila.length = 0; },
    /** @param {number} dt */
    passo(dt) {
      // varias instantaneas no mesmo quadro
      let guarda = 0;
      while (fila.length && guarda++ < 16) {
        if (!fila[0].passo(dt)) return;
        fila.shift();
        dt = 0;
      }
    },
  };
}

/**
 * Cuidado de cada quadro com todos os slimes: careta com prazo, pouso (som, respingo e a pancada
 * de quem cai em cima), humor de base.
 * @param {any} m @param {any[]} eventos @param {number} dt
 */
export function cuidar(m, eventos, dt) {
  /** @type {Map<number, any[]>} */
  const encostados = new Map();
  for (const [i, j] of m.contatos()) {
    if (!encostados.has(i)) encostados.set(i, []);
    if (!encostados.has(j)) encostados.set(j, []);
    encostados.get(i).push(m.slimes[j]);
    encostados.get(j).push(m.slimes[i]);
  }
  for (const s of m.slimes) {
    if (!s.ativo) continue;
    const d = s.dados;
    if (d.exprT > 0) {
      d.exprT -= dt;
      if (d.exprT <= 0 && (d.expr === 'feliz' || d.expr === 'susto' || d.expr === 'medo' || PANCADA.includes(d.expr))) d.expr = '';
    }
    if (d.solto !== undefined && !d.pousou && !s.preso) {
      if (-s.vy > (d.queda || 0)) d.queda = -s.vy;
      if (s.vy < -2) d.caindo = true;
      else if (d.caindo && s.vy > -0.6) {
        d.pousou = true;
        eventos.push({ tipo: 'pouso', x: s.cx, y: s.base, forca: Math.min(2, 0.5 + (d.queda || 0) * 0.08), cor: d.hex, jogador: d.jogador });
        pancada(s, d.queda || 0, encostados.get(s.idx) || [], () => false);
      } else if (!d.caindo && m.tempo - d.solto > 0.5) {
        // pousou sem cair de verdade (nasceu quase no piso)
        d.pousou = true;
      }
    }
    if (!s.preso && !d.derretendo) sentir(s, (encostados.get(s.idx) || []).length, dt);
  }
}

/**
 * Rede de seguranca: a gota de uma casa que ficou fora do nicho por `tMax` s volta para dentro
 * (o tabuleiro logico manda; a fisica so mostra).
 * @param {any} m
 * @param {Array<{ s: any, casa: number }>} pecas
 * @param {ReturnType<typeof import('./estante.js').criarEstante>} est
 * @param {number} dt @param {number} [tMax]
 * @returns {number} quantas voltaram
 */
export function rede(m, pecas, est, dt, tMax = 0.5) {
  let n = 0;
  for (const p of pecas) {
    const s = p.s;
    if (!s || !s.ativo || s.preso || s.dados.derretendo || s.dados.dentroDe || s.dados.semRede) continue;
    if (est.dentro(p.casa, s.cx, s.cy)) { s.dados.foraT = 0; continue; }
    s.dados.foraT = (s.dados.foraT || 0) + dt;
    if (s.dados.foraT >= tMax) {
      const C = est.celulas[p.casa];
      m.recolocar(s, C.cx, C.y0 + s.raio0 + 0.05);
      s.dados.foraT = 0;
      n++;
    }
  }
  return n;
}
