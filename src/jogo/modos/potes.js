// Modelo 6, Potes da Velha (pedido do usuario em 2026-11-07: "potes na posicao do jogo da velha e
// enche com slime", "com fisica bem feita"). Nove bequeres de vidro na grade 3x3, cada um com um
// funil em cima e uma torneira no funil. Na sua vez, a torneira do pote escolhido despeja uma dose
// de goo da sua cor (um filete de gotinhas): escorre pelo funil, cai no pote, assenta e toma a forma
// dele; a goo da mesma cor que se encosta vira uma massa so, e a do rival fica em camada.
// A FISICA decide: depois de assentar, conta-se quantas particulas de cada cor ficaram dentro de
// cada pote; o pote que passa da linha de cheio fecha e e de quem tem mais (empate: de ninguem).
// No Transborda nao ha tampa: despejar num pote cheio derrama pela borda, e a sobra cai de verdade
// no funil do pote de baixo (a fonte de tacas) e conta la; a do de baixo cai na bandeja e some.

import { criarModoVez } from './base.js';
import { REGRAS_POTES, inicialPotes, CAPACIDADES, donoDe } from '../regras/potes.js';
import { material } from '../../fisica/materiais.js';
import { PIGMENTOS, HEX } from '../cores.js';
import { esperar } from '../gotas.js';

/** Particulas por dose (4 gotinhas de 8). */
export const DOSE_N = 32;
const GOTINHA = 8;
/** u2 que cada particula de goo ocupa assentada (medido: test/potes.test.js) */
export const AREA_P = 0.092;
/** meia largura por dentro do pote */
const W = 1.45;
const R_VIDRO = 0.16;
const FT = 2.35;
const FN = 0.42;
const PASSO_X = 2 * FT + 1.1;
const GOO = material('goo', { k: 0.0012, coesao: 0.025, xsph: 0.16, atritoS: 0.1, atritoK: 0.07 });
/** no Transborda a goo escorre mais (a cupula acima da boca precisa desabar pela bica) */
const GOO_RALA = material('goo', { k: 0.0003, epsY: 0.02, lam: 10, coesao: 0.018, xsph: 0.12, atritoS: 0.04, atritoK: 0.03 });

/** Altura de uma dose dentro do pote (u). */
export const ALTURA_DOSE = (DOSE_N * AREA_P) / (2 * W);

/**
 * Geometria da prateleira de potes para o submodo.
 * @param {string} sub
 */
export function criarPotes(sub) {
  const cap = (CAPACIDADES[/** @type {keyof typeof CAPACIDADES} */ (sub)] || CAPACIDADES.encher).slice();
  const capMax = Math.max(...cap);
  const folga = sub === 'transborda' ? 1.5 : 0.55;
  const hMax = capMax * ALTURA_DOSE + folga;
  // no Transborda o funil fica mais alto: a goo que passa da boca precisa de espaco para escorrer
  // pela bica (com o funil perto, a coluna de goo ficava presa entre a boca e o gargalo)
  const vaoFunil = 0.5;
  const passoY = hMax + vaoFunil + 1.2 + 1.15;
  /** @type {any[]} */
  const paredes = [];
  /** @type {any[]} */
  const potes = [];
  const add = (ax, ay, bx, by, r = R_VIDRO, extra = {}) => { paredes.push({ ax, ay, bx, by, r, ...extra }); return paredes.length - 1; };
  for (let i = 0; i < 9; i++) {
    const rr = (i / 3) | 0;
    const c = i % 3;
    const cx = (c - 1) * PASSO_X;
    const yb = (2 - rr) * passoY;
    // no Transborda a boca fica rente a linha (a dose a mais derrama); nos outros, uma folga
    const Hj = cap[i] * ALTURA_DOSE + folga;
    const y0 = yb + R_VIDRO;
    // corpo: paredes, cantos chanfrados e fundo; aba para fora na boca. No Transborda, a parede
    // direita tem o LADRAO (um furo na linha de cheio com uma bica para baixo, como o de uma pia): a
    // goo que passa da linha sai por ele e cai no funil do pote de baixo.
    const k0 = paredes.length;
    const linhaY = y0 + cap[i] * ALTURA_DOSE;
    const xd = cx + W + R_VIDRO;
    add(cx - W - R_VIDRO, yb + Hj, cx - W - R_VIDRO, yb + 0.45);
    add(cx - W - R_VIDRO, yb + 0.45, cx - W + 0.35, yb);
    add(cx - W + 0.35, yb, cx + W - 0.35, yb);
    add(cx + W - 0.35, yb, xd, yb + 0.45);
    if (sub === 'transborda') {
      // furo de ~0,85 u livre logo acima da linha; a bica e um capuz que desce (canal de ~0,7 u)
      const furo = 1.0;
      add(xd, yb + 0.45, xd, linhaY - 0.15);
      add(xd, linhaY - 0.15, xd + 0.3, linhaY - 0.45);
      add(xd, linhaY + furo, xd + 1.1, linhaY + furo - 0.4);
      add(xd + 1.1, linhaY + furo - 0.4, xd + 1.1, linhaY - 1.0);
      add(xd, linhaY + furo, xd, yb + Hj);
    } else {
      add(xd, yb + 0.45, xd, yb + Hj);
    }
    add(cx - W - R_VIDRO, yb + Hj, cx - W - R_VIDRO - 0.28, yb + Hj + 0.22);
    add(xd, yb + Hj, xd + 0.28, yb + Hj + 0.22);
    // funil em cima (pega a dose da torneira e a sobra do pote de cima)
    const yn = yb + hMax + vaoFunil;
    const yt = yn + 1.2;
    const ft = sub === 'transborda' ? FT + 0.5 : FT;
    add(cx - FN - R_VIDRO, yn, cx - ft, yt, R_VIDRO, { funil: true });
    add(cx + FN + R_VIDRO, yn, cx + ft, yt, R_VIDRO, { funil: true });
    potes.push({
      i, r: rr, c, cx, yb, y0, Hj, cap: cap[i], linhaY, boca: yb + Hj, funil: { yn, yt }, ladrao: sub === 'transborda',
      torneira: { x: cx + FT * 0.62, y: yt + 0.42 }, paredes: [k0, paredes.length - 1],
    });
  }
  // bandeja no chao (a sobra da fileira de baixo para ali e escoa)
  const chao = -1.3;
  add(-PASSO_X * 1.5 - 0.4, chao, PASSO_X * 1.5 + 0.4, chao, 0.22, { oculta: true });
  const topo = 2 * passoY + hMax + vaoFunil + 1.2 + 0.9;
  const x0 = -PASSO_X * 1.5;
  const x1 = PASSO_X * 1.5;
  const celulas = potes.map((P) => {
    const a = P.yb - 0.5;
    return { i: P.i, r: P.r, c: P.c, x0: P.cx - PASSO_X / 2, x1: P.cx + PASSO_X / 2, y0: a, y1: a + passoY, cx: P.cx, cy: P.yb + P.Hj / 2 };
  });
  return {
    sub, cols: 3, rows: 3, vao: 2 * W, r: R_VIDRO, paredes, potes, celulas, chao, passoY,
    caixa: [x0, chao - 0.4, x1, topo],
    /** @param {number} x @param {number} y */
    celulaEm(x, y) {
      for (const C of celulas) if (x >= C.x0 && x < C.x1 && y >= C.y0 && y < C.y1) return C.i;
      return -1;
    },
    /** dentro do corpo do pote (para a contagem) @param {number} i @param {number} x @param {number} y @param {number} [m] */
    dentro(i, x, y, m = 0.05) {
      const P = potes[i];
      return x > P.cx - W - m && x < P.cx + W + m && y > P.yb && y < P.boca + m;
    },
    pingo(i) { return [potes[i].torneira.x, potes[i].torneira.y]; },
  };
}

/**
 * Junta goos da mesma cor que se encostam (a maior engole a menor, sem perder volume). Molde do
 * slime-merge (src/jogo/goo.js juntarGoo), so entre a mesma cor: a do rival fica em camada.
 * @param {any} m
 */
function juntarMesmaCor(m) {
  const usados = new Set();
  for (const [i, j, p] of m.contatos()) {
    if (p < 2 || usados.has(i) || usados.has(j)) continue;
    const a = m.slimes[i];
    const b = m.slimes[j];
    if (!a.ativo || !b.ativo || a.preso || b.preso) continue;
    if (!a.dados.goo || !b.dados.goo || a.dados.jogador !== b.dados.jogador) continue;
    // o pedaco que acabou de rasgar na bica cai antes de poder grudar de novo
    if (a.dados.sobra || b.dados.sobra) continue;
    if (m.tempo - (a.dados.rasgou || -9) < 0.8 || m.tempo - (b.dados.rasgou || -9) < 0.8) continue;
    // gotinha ainda caindo nao gruda (senao o filete vira uma coluna presa ao bico)
    if (a.vy < -3 || b.vy < -3) continue;
    usados.add(i);
    usados.add(j);
    const [gr, pe] = a.n >= b.n ? [a, b] : [b, a];
    const dados = gr.dados;
    m.fundir(gr, pe, { px: pe.cx, py: pe.cy, nAlvo: a.n + b.n, rampa: 1, manterForma: true });
    gr.dados = dados;
    gr.dados.semRosto = gr.n < 26;
  }
}

/** a sobra que escorre pelo ladrao: rala e sem forma (volta a ser goo quando cai no pote de baixo) */
const SOBRA = material('liquido', { coesao: 0.012, xsph: 0.1, atritoS: 0.02, atritoK: 0.01 });

/**
 * Transborda, o LADRAO: a goo acima da linha de cheio de um pote se separa da massa (dividir pela
 * reta da linha), vira sobra rala, corre pelo furo da parede direita, desce pela bica e cai no funil
 * do pote de baixo; quando chega la, volta a ser goo e se junta com a da mesma cor.
 * @param {any} m @param {ReturnType<typeof criarPotes>} G @param {number} dt
 * @returns {Array<{ x: number, y: number, cor: string }>} onde a sobra se separou (VFX)
 */
function ladrao(m, G, dt) {
  const out = [];
  for (const s of m.slimes) {
    if (!s.ativo || !s.dados.goo || s.preso) continue;
    if (s.dados.sobra) {
      // caiu abaixo do pote de origem: volta a ser goo
      if (s.cy < s.dados.sobra - 1.2) {
        s.mat = GOO_RALA;
        s.dados.sobra = 0;
        s.dados.rasgou = m.tempo - 0.5;
      }
      continue;
    }
    if (s.vy < -1 || m.tempo - (s.dados.rasgou || -9) < 0.3) continue;
    for (const P of G.potes) {
      if (s.cx < P.cx - W - 0.3 || s.cx > P.cx + W + 0.3 || s.cy < P.yb || s.cy > P.boca) continue;
      const corte = P.linhaY + 0.04;
      let acima = 0;
      let abaixo = 0;
      for (let a = m.iniSl[s.idx]; a < m.iniSl[s.idx + 1]; a++) {
        if (m.y[m.membros[a]] > corte) acima++;
        else abaixo++;
      }
      if (acima < 3) break;
      let sobra = s;
      if (abaixo >= 3) {
        const r = m.dividir(s, P.cx, corte, 0, 1);
        if (r.length < 2) break;
        sobra = r[1];
        sobra.dados = { ...s.dados };
        s.dados.rasgou = m.tempo;
      }
      sobra.mat = SOBRA;
      sobra.dados.sobra = P.yb;
      sobra.dados.semRosto = true;
      sobra.dados.rasgou = m.tempo;
      out.push({ x: P.cx + W, y: P.linhaY, cor: s.dados.hex });
      break;
    }
  }
  // a sobra corre para o furo e desce pela bica
  for (let k = 0; k < m.n; k++) {
    const s = m.slimes[m.sl[k]];
    if (!s || !s.dados.sobra) continue;
    const c = Math.round(m.x[k] / PASSO_X) + 1;
    if (c < 0 || c > 2) continue;
    for (let r = 0; r < 3; r++) {
      const P = G.potes[r * 3 + c];
      const dx = m.x[k] - P.cx;
      if (m.y[k] < P.linhaY - 1.2 || m.y[k] > P.boca || dx < -W - 0.2 || dx > W + 1.2) continue;
      if (dx > W + 0.15) m.vy[k] -= 60 * dt;
      else m.vx[k] += 90 * dt;
      break;
    }
  }
  return out;
}

/**
 * Contagem de particulas de cada cor dentro de cada pote.
 * @param {any} m @param {ReturnType<typeof criarPotes>} G
 */
export function contar(m, G) {
  const a = new Array(9).fill(0);
  const b = new Array(9).fill(0);
  for (let k = 0; k < m.n; k++) {
    const x = m.x[k];
    const y = m.y[k];
    const s = m.slimes[m.sl[k]];
    if (!s || !s.dados.goo) continue;
    for (const P of G.potes) {
      if (x > P.cx - W - 0.1 && x < P.cx + W + 0.1 && y > P.yb && y < P.boca + 0.1) {
        if (s.dados.jogador === 1) a[P.i]++;
        else b[P.i]++;
        break;
      }
    }
  }
  return { a, b };
}

const SUBMODOS = [
  { id: 'classico', nome: 'classico', desc: '' },
  { id: 'encher', nome: 'encher', desc: '' },
  { id: 'grandes', nome: 'grandes', desc: '' },
  { id: 'transborda', nome: 'transborda', desc: '' },
];

/** @param {any} o */
export function criarModo(o) {
  /** @type {ReturnType<typeof criarPotes>|null} */
  let geo = null;
  const G = {
    id: 'potes',
    titulo: 'Potes da Velha',
    submodos: SUBMODOS,
    semRede: true,
    regras: () => REGRAS_POTES,
    inicial: (sub, comeca) => inicialPotes(sub, comeca),
    geometria: (sub) => { geo = criarPotes(sub); return geo; },
    janela: (est) => {
      const [x0, y0, x1, y1] = est.caixa;
      return [x0 - 0.3, y0 - 0.2, x1 + 0.3, y1 + 0.2];
    },
    /**
     * @param {any} api @param {any} ef
     */
    encenar(api, ef) {
      if (ef.tipo !== 'despejar') return null;
      return [despejar(api, ef), assentar(api), medir(api)];
    },
    /** @param {any} api @param {number} dt */
    passo(api, dt) {
      const m = api.m;
      // goo nao dorme enquanto algo se mexe (duas massas da mesma cor paradas lado a lado precisam se
      // juntar); depois de assentar, dorme e a fisica fica barata
      if (api.vez.estado !== 'vez' || (api.dados.tCalmo || 0) < 1.2) m.acordarTodos();
      api.dados.tCalmo = api.vez.estado === 'vez' ? (api.dados.tCalmo || 0) + dt : 0;
      juntarMesmaCor(m);
      if (geo.sub === 'transborda') {
        for (const r of ladrao(m, geo, dt)) api.eventos.push({ tipo: 'ralo', x: r.x, y: r.y, cor: r.cor });
      }
      // o que caiu na bandeja escoa
      const fora = [];
      for (let k = 0; k < m.n; k++) if (m.y[k] < geo.chao + 0.45) fora.push(k);
      if (fora.length) {
        api.eventos.push({ tipo: 'ralo', x: m.x[fora[0]], y: geo.chao, cor: m.slimes[m.sl[fora[0]]].dados.hex });
        m.removerParticulas(fora);
      }
      api.dados.t = (api.dados.t || 0) + dt;
    },
    visual(api) {
      const E = api.E;
      const cont = api.dados.cont || { a: new Array(9).fill(0), b: new Array(9).fill(0) };
      return {
        semEstante: true,
        potes: geo.potes.map((P) => ({
          i: P.i, dono: E.dono[P.i], a: cont.a[P.i] / DOSE_N, b: cont.b[P.i] / DOSE_N, cap: P.cap,
          aberta: api.dados.torneira === P.i, tAberta: api.dados.tTorneira || 0,
        })),
        hoverPote: api.minhaVez && api.hover >= 0 && api.vez.jogadas.some((j) => j.casa === api.hover) ? api.hover : -1,
      };
    },
  };

  /** A torneira abre e despeja a dose em gotinhas. */
  function despejar(api, ef) {
    const m = api.m;
    const P = geo.potes[ef.casa];
    let t = 0;
    let saiu = 0;
    const total = DOSE_N / GOTINHA;
    return {
      nome: 'despejar',
      passo(dt) {
        if (t === 0) {
          api.dados.torneira = ef.casa;
          api.dados.tTorneira = 0;
          api.eventos.push({ tipo: 'som', nome: 'despejar' });
        }
        t += dt;
        api.dados.tTorneira = t;
        while (saiu < total && t >= 0.08 + saiu * 0.075) {
          const s = m.criarSlime({ x: P.torneira.x - 0.15, y: P.torneira.y - 0.1, n: GOTINHA, material: geo.sub === 'transborda' ? GOO_RALA : GOO, pigmento: PIGMENTOS[ef.jogador], vx: -2.4, vy: -1.5 });
          if (s) {
            s.dados.goo = true;
            s.dados.semRosto = true;
            s.dados.jogador = ef.jogador;
            s.dados.hex = HEX[ef.jogador];
            s.dados.dose = ef.id;
          }
          saiu++;
          api.eventos.push({ tipo: 'som', nome: 'pingo' });
        }
        if (saiu >= total && t > 0.08 + total * 0.075 + 0.1) {
          api.dados.torneira = -1;
          return true;
        }
        return false;
      },
    };
  }

  /** Espera a goo assentar (todas as massas devagar), com teto. */
  function assentar(api) {
    let t = 0;
    let calmo = 0;
    return {
      nome: 'assentar',
      passo(dt) {
        t += dt;
        let vmax = 0;
        let sobra = false;
        for (const s of api.m.slimes) {
          if (!s.ativo || !s.dados.goo) continue;
          if (s.dados.sobra) sobra = true;
          const v = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
          if (v > vmax) vmax = v;
        }
        // a sobra escorrendo pelo ladrao tambem segura a vez (o lance so termina quando ela cai)
        calmo = vmax < 0.35 && !sobra ? calmo + dt : 0;
        return (t > 0.7 && calmo > 0.3) || t > 4.5;
      },
    };
  }

  /** A fisica decide: conta o que ficou em cada pote e troca o estado logico pelo medido. */
  function medir(api) {
    return {
      nome: 'medir',
      passo() {
        const cont = contar(api.m, geo);
        api.dados.cont = cont;
        const E = api.E;
        const F = { ...E, a: cont.a.map((n) => n / DOSE_N), b: cont.b.map((n) => n / DOSE_N), dono: E.dono.slice() };
        for (let i = 0; i < 9; i++) {
          const tot = F.a[i] + F.b[i];
          // fechado nao reabre; abre so quando a fisica encheu ate a linha (com folga da perda)
          if (E.dono[i] && E.sub !== 'transborda') continue;
          if (tot >= E.cap[i] - 0.3) {
            const d = donoDe(F.a[i], F.b[i]);
            if (F.dono[i] !== d) {
              F.dono[i] = d;
              const P = geo.potes[i];
              api.eventos.push({ tipo: 'som', nome: 'tampa' });
              api.eventos.push({ tipo: 'texto', x: P.cx, y: P.boca + 0.9, chave: 'cheio', cor: d === 1 ? '#2f7fe0' : d === 2 ? '#f2862a' : '#888888' });
              // as massas do dono comemoram
              for (const s of api.m.slimes) {
                if (s.ativo && s.dados.goo && Math.abs(s.cx - P.cx) < W && s.cy > P.yb && s.cy < P.boca) {
                  s.dados.expr = s.dados.jogador === d ? 'feliz' : 'chorinho';
                  s.dados.exprT = 1.6;
                }
              }
            }
          } else if (E.sub === 'transborda') {
            F.dono[i] = 0;
          }
        }
        api.vez.trocar(F);
        return true;
      },
    };
  }

  const modo = criarModoVez(/** @type {any} */ (G), o);
  modo.potes = () => geo;
  return modo;
}

