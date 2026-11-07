// Modelo 1, Engole-Engole. As pecas sao slimes de 3 tamanhos. O grande que cai em cima do pequeno o
// ENGOLE: o pequeno vira `preso` (nao colide com nada) e segue o centro do grande, la dentro, de cara
// de choro; quando o grande sai pulando, o de dentro e CUSPIDO (volta a ser solto, cai e leva susto).
// Na Fusao, duas iguais vizinhas pulam uma na outra e viram a do tamanho seguinte.
// A mao de cada jogador e desenhada embaixo da estante (pequena, media, grande, com quantas faltam):
// toque no tamanho e depois na casa; ou toque numa peca sua de cima e depois no destino.
// Desafio do dia: a posicao vem da data (`hoje`), com vitoria forcada em ate 3 lances seus.

import { criarModoVez } from './base.js';
import { REGRAS as CLASSICA } from '../regras/classica.js';
import { REGRAS_ENGOLE, inicialEngole, topo } from '../regras/engole.js';
import { avaliarLances } from '../ia.js';
import { criarRng, hashTexto } from '../../core/rng.js';
import { pingar, saltar, fazer, criarGota } from '../gotas.js';
import { particulasGirassol } from '../../fisica/forma.js';
import { ESPACO } from '../../fisica/mundo.js';

const SUBMODOS = [
  { id: 'classico', nome: 'classico', desc: '' },
  { id: 'engole', nome: 'engole', desc: '' },
  { id: 'fusao', nome: 'fusao', desc: '' },
  { id: 'grande', nome: 'grande', desc: '' },
  { id: 'desafio', nome: 'desafio', desc: '' },
];

/** Diametro de cada tamanho (no 3x3; o 4x4 escala pelo vao). */
const DIAM = [0, 1.6, 2.6, 3.6];
const VAO3 = 4.6;

/**
 * Posicao do desafio do dia: jogadas sorteadas a partir do inicio ate achar uma em que o azul (1)
 * tem a vez e vence a forca em ate 3 lances (nao em 1).
 * @param {string} hoje AAAA-MM-DD
 */
export function desafioDoDia(hoje) {
  const rng = criarRng(hashTexto('engole:' + (hoje || '')));
  for (let tent = 0; tent < 400; tent++) {
    let E = inicialEngole('engole', 1);
    const plies = 4 + Math.floor(rng() * 6);
    let ok = true;
    for (let p = 0; p < plies; p++) {
      const js = REGRAS_ENGOLE.jogadas(E);
      if (!js.length) { ok = false; break; }
      E = REGRAS_ENGOLE.aplicar(E, js[Math.floor(rng() * js.length) % js.length]).E;
      if (REGRAS_ENGOLE.resultado(E)) { ok = false; break; }
    }
    if (!ok || E.vez !== 1) continue;
    const um = avaliarLances(REGRAS_ENGOLE, E, 1, 4000);
    if (Math.max(...um.valores) > 5000) continue;
    const tres = avaliarLances(REGRAS_ENGOLE, E, 3, 60000);
    if (Math.max(...tres.valores) > 5000) return { ...E, lances: 0, desafio: true };
  }
  return inicialEngole('engole', 1);
}

/** @param {any} o */
export function criarModo(o) {
  const hoje = o.hoje || '2026-11-07';
  /** @param {string} sub */
  const escala = (sub) => (sub === 'grande' ? 4.0 / VAO3 : 1);
  /** @param {string} sub @param {number} t */
  const diam = (sub, t) => DIAM[t] * escala(sub);

  const G = {
    id: 'engole',
    titulo: 'Engole-Engole',
    submodos: SUBMODOS,
    regras: (sub) => (sub === 'classico' ? CLASSICA : REGRAS_ENGOLE),
    inicial: (sub, comeca) => {
      if (sub === 'classico') return CLASSICA.inicial({ comeca });
      if (sub === 'desafio') return desafioDoDia(hoje);
      return inicialEngole(sub, comeca);
    },
    estante: (sub) => (sub === 'grande' ? { cols: 4, rows: 4, vao: 4.0 } : { vao: VAO3 }),
    janela: (est) => {
      const [x0, y0, x1, y1] = est.caixa;
      return [x0 - 0.6, y0 - 5.6, x1 + 0.6, y1 + 0.8];
    },
    diametro: (sub, ef) => (sub === 'classico' ? 3.0 : diam(sub, ef.tam || 2)),
    /** pecas ja no tabuleiro no comeco (desafio do dia) */
    montar(api) {
      api.dados.sel = { tam: 0, casa: -1 };
      const E = api.E;
      if (!E || !E.pilhas) return;
      for (let i = 0; i < E.pilhas.length; i++) {
        /** @type {any} */
        let fora = null;
        for (const p of E.pilhas[i]) {
          const C = api.est.celulas[i];
          const d = diam(api.sub, p.tam);
          const s = criarGota(api.m, { x: C.cx, y: C.y0 + d / 2 + 0.05, d, jogador: p.jogador, id: p.id, nivel: p.tam });
          if (!s) continue;
          if (fora) engolir(api, fora, s, true);
          api.pecas.set(p.id, { s, casa: i, jogador: p.jogador, tam: p.tam });
          fora = s;
        }
      }
    },
    /** @param {any} api @param {any} ef */
    encenar(api, ef) {
      if (api.sub === 'classico') return null;
      if (ef.tipo === 'pingar') {
        const d = diam(api.sub, ef.tam);
        const [x, y] = api.est.pingo(ef.casa, d);
        const engolida = ef.engole ? api.pecas.get(ef.engole) : null;
        return [pingar(api.ctx, {
          x, y, d, jogador: ef.jogador, id: ef.id, nivel: ef.tam,
          apos: (s) => {
            api.pecas.set(ef.id, { s, casa: ef.casa, jogador: ef.jogador, tam: ef.tam });
            if (engolida) engolir(api, engolida.s, s, false);
          },
        })];
      }
      if (ef.tipo === 'mover') {
        const p = api.pecas.get(ef.id);
        if (!p) return [];
        const out = [];
        const revela = ef.revela ? api.pecas.get(ef.revela) : null;
        const engolida = ef.engole ? api.pecas.get(ef.engole) : null;
        const C = api.est.celulas[ef.para];
        out.push(fazer(() => {
          if (revela) cuspir(api, revela.s);
          if (engolida) engolir(api, engolida.s, p.s, false);
        }));
        out.push(saltar(api.ctx, { s: p.s, x: C.cx, y: C.y1 - p.s.raio0 - 0.3, altura: 1.2, dur: 0.5 }));
        p.casa = ef.para;
        return out;
      }
      if (ef.tipo === 'fundir') {
        const a = api.pecas.get(ef.id);
        const b = api.pecas.get(ef.outro);
        if (!a || !b) return [];
        const revela = ef.revela ? api.pecas.get(ef.revela) : null;
        api.pecas.delete(ef.outro);
        return [
          fazer(() => { if (revela) cuspir(api, revela.s); }),
          saltar(api.ctx, { s: b.s, x: a.s.cx, y: a.s.cy + 0.4, altura: 1.0, dur: 0.4, soltar: false }),
          fazer(() => {
            const m = api.m;
            const dados = a.s.dados;
            if (!b.s.ativo || !a.s.ativo) return;
            b.s.preso = false;
            m.fundir(a.s, b.s, { px: a.s.cx, py: a.s.cy, rampa: 0.3 });
            a.s.dados = dados;
            const nAlvo = particulasGirassol(diam(api.sub, ef.tam), ESPACO);
            m.redimensionar(a.s, nAlvo, a.s.cx, a.s.cy);
            a.s.nivel = ef.tam;
            a.s.dados.expr = 'feliz';
            a.s.dados.exprT = 1.2;
            a.tam = ef.tam;
            api.eventos.push({ tipo: 'fusao', x: a.s.cx, y: a.s.cy });
            // quem estava dentro de b passa para dentro de a
            for (const q of api.pecas.values()) if (q.s.dados.dentroDe === b.s) q.s.dados.dentroDe = a.s;
          }),
        ];
      }
      return null;
    },
    /** @param {any} api @param {number} dt */
    passo(api, dt) {
      // quem foi engolido segue o centro de quem o engoliu (so depois que ele pousou)
      for (const p of api.pecas.values()) {
        const s = p.s;
        const dono = s.dados.dentroDe;
        if (!dono || !s.ativo) continue;
        if (!dono.ativo) { cuspir(api, s); continue; }
        if (dono.preso || dono.dados.pousou) {
          const k = Math.min(1, dt * 10);
          s.alvoX += (dono.cx - s.alvoX) * k;
          s.alvoY += (dono.cy - dono.raio0 * 0.34 - s.alvoY) * k;
          api.m.moverPreso(s, s.alvoX, s.alvoY);
        }
        if (s.dados.expr !== 'choro') { s.dados.expr = 'choro'; s.dados.exprT = 99; }
      }
    },
    /** toque: escolhe tamanho da mao, peca do tabuleiro ou o destino */
    apontar(api, x, y, fase) {
      if (api.sub === 'classico' || fase !== 'baixo' || !api.minhaVez) return false;
      const mao = maos(api).find((h) => h.jogador === api.E.vez && Math.hypot(x - h.x, y - h.y) < h.d * 0.6 + 0.35);
      if (mao) {
        if (mao.n > 0) { api.dados.sel = { tam: mao.tam, casa: -1 }; api.eventos.push({ tipo: 'som', nome: 'botao' }); }
        return true;
      }
      return false;
    },
    toque(api, casa) {
      if (api.sub === 'classico') return { casa };
      const E = api.E;
      const sel = api.dados.sel || { tam: 0, casa: -1 };
      const tp = topo(E, casa);
      // toque numa peca sua de cima: seleciona para mover (ou desmarca)
      if (tp && tp.jogador === E.vez && (sel.casa < 0 || sel.casa === casa) && !sel.tam) {
        api.dados.sel = sel.casa === casa ? { tam: 0, casa: -1 } : { tam: 0, casa };
        return null;
      }
      if (sel.casa >= 0) {
        api.dados.sel = { tam: 0, casa: -1 };
        return { de: sel.casa, para: casa };
      }
      // da mao: o tamanho escolhido, ou o maior que cabe
      let t = sel.tam;
      if (!t) {
        for (let k = 3; k >= 1; k--) if (E.mao[E.vez][k] && (!tp || tp.tam < k)) { t = k; break; }
      }
      if (!t) return null;
      if (!E.mao[E.vez][t] || (tp && tp.tam >= t)) {
        api.eventos.push({ tipo: 'som', nome: 'recusa' });
        return null;
      }
      return { tam: t, para: casa };
    },
    visual(api) {
      if (api.sub === 'classico') return {};
      const sel = api.dados.sel || { tam: 0, casa: -1 };
      const out = { maos: maos(api), selecao: sel.casa };
      if (api.minhaVez) {
        const js = api.vez.jogadas.filter((j) => (sel.casa >= 0 ? j.de === sel.casa : j.de === undefined && (!sel.tam || j.tam === sel.tam)));
        out.permitidas = [...new Set(js.map((j) => j.para))];
      }
      return out;
    },
  };

  /** A mao de cada jogador embaixo da estante (posicoes do mundo). @param {any} api */
  function maos(api) {
    const E = api.E;
    if (!E || !E.mao) return [];
    const [x0, y0, x1] = api.est.caixa;
    const meio = (x0 + x1) / 2;
    const sel = (api.dados.sel || {}).tam || 0;
    const out = [];
    for (const j of [1, 2]) {
      const base = j === 1 ? x0 + 0.6 : meio + 0.6;
      let x = base;
      for (let t = 1; t <= 3; t++) {
        const d = DIAM[t] * 0.62;
        x += d / 2;
        out.push({ jogador: j, tam: t, n: E.mao[j][t], x, y: y0 - 2.6, d, sel: j === E.vez && sel === t });
        x += d / 2 + 0.9;
      }
    }
    return out;
  }

  /**
   * O grande engole o pequeno: o pequeno fica preso, dentro, e segue o centro do grande.
   * @param {any} api @param {any} pequeno @param {any} grande @param {boolean} ja ja pousado (montar)
   */
  function engolir(api, pequeno, grande, ja) {
    if (!pequeno || !pequeno.ativo) return;
    api.m.refazerForma(pequeno);
    pequeno.preso = true;
    pequeno.alvoX = pequeno.cx;
    pequeno.alvoY = pequeno.cy;
    pequeno.dados.dentroDe = grande;
    pequeno.dados.dentro = true;
    pequeno.dados.peso = 2.6;
    pequeno.dados.expr = 'susto';
    pequeno.dados.exprT = 99;
    if (ja) grande.dados.pousou = true;
    if (!ja) {
      api.eventos.push({ tipo: 'som', nome: 'engolir' });
      grande.dados.expr = 'feliz';
      grande.dados.exprT = 1.6;
    }
  }

  /** O de dentro sai: volta a ser solto, cai e leva susto. @param {any} api @param {any} s */
  function cuspir(api, s) {
    if (!s || !s.ativo || !s.dados.dentroDe) return;
    s.dados.dentroDe = null;
    s.dados.dentro = false;
    s.dados.peso = 1;
    api.m.soltar(s, 3);
    s.dados.solto = api.m.tempo;
    s.dados.pousou = false;
    s.dados.caindo = false;
    s.dados.expr = 'susto';
    s.dados.exprT = 1.4;
    api.eventos.push({ tipo: 'som', nome: 'cuspir' });
  }

  return criarModoVez(/** @type {any} */ (G), o);
}
