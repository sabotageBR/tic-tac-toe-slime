// Modelo 4, Mega Velha: 81 nichos em 9 velhinhas (as divisorias entre velhinhas sao grossas). Fechou
// uma velhinha: as 3 gotas da linha saltam para o meio dela, as outras 6 estouram, as divisorias de
// dentro somem e as 3 viram UM slimao que incha e cai ocupando a velhinha inteira (a fusao em grupo
// do slime-merge). Velhinha empatada: as gotas ficam cinza e congelam. Mega Rapida: 45 s de relogio
// para cada um (zerou, perdeu).

import { criarModoVez } from './base.js';
import { REGRAS as CLASSICA } from '../regras/classica.js';
import { REGRAS_MEGA, inicialMega, casaDe, minisPermitidas } from '../regras/mega.js';
import { saltar, fazer, juntas, estourar } from '../gotas.js';
import { particulasGirassol } from '../../fisica/forma.js';
import { ESPACO } from '../../fisica/mundo.js';
import { pintar } from '../../cor/difusao.js';
import { PIGMENTOS, HEX } from '../cores.js';

const SUBMODOS = [
  { id: 'classico', nome: 'classico', desc: '' },
  { id: 'mega', nome: 'mega', desc: '' },
  { id: 'megaRapida', nome: 'megaRapida', desc: '' },
];
const RELOGIO = 45;
const D_GOTA = 1.55;
const D_SLIMAO = 5.0;

/** @param {any} o */
export function criarModo(o) {
  const G = {
    id: 'mega',
    titulo: 'Mega Velha',
    submodos: SUBMODOS,
    regras: (sub) => (sub === 'classico' ? CLASSICA : REGRAS_MEGA),
    inicial: (sub, comeca) => (sub === 'classico' ? CLASSICA.inicial({ comeca }) : inicialMega(sub, comeca)),
    estante: (sub) => (sub === 'classico' ? {} : { cols: 9, rows: 9, vao: 2.1, r: 0.12, grupo: 3, rGrupo: 0.26, folga: 0.45 }),
    diametro: (sub) => (sub === 'classico' ? 3.0 : D_GOTA),
    montar(api) {
      api.dados.removidas = new Set();
      api.m.definirParedes(api.est.paredes);
      api.dados.relogio = { 1: RELOGIO, 2: RELOGIO };
    },
    /** @param {any} api @param {any} ef */
    encenar(api, ef) {
      if (ef.tipo === 'fechar') return fechar(api, ef);
      if (ef.tipo === 'empateMini') {
        return [fazer(() => {
          for (const id of ef.todas) {
            const p = api.pecas.get(id);
            if (!p || !p.s.ativo) continue;
            pintar(api.m, p.s, PIGMENTOS[0]);
            p.s.dados.hex = HEX[0];
            p.s.estado = 'gelo';
            p.s.tEstado = 999;
            p.s.dados.expr = 'apatico';
            p.s.dados.exprT = 999;
          }
          api.eventos.push({ tipo: 'som', nome: 'gelo' });
        })];
      }
      return null;
    },
    /** @param {any} api @param {number} dt */
    passo(api, dt) {
      if (api.sub !== 'megaRapida') return;
      const v = api.vez;
      if (v.estado !== 'vez') return;
      const q = v.E.vez;
      api.dados.relogio[q] -= dt;
      if (api.dados.relogio[q] <= 0) {
        api.dados.relogio[q] = 0;
        v.forcar({ vencedor: q === 1 ? 2 : 1 });
      }
    },
    visual(api) {
      if (api.sub === 'classico') return { semBico: false };
      const E = api.E;
      const out = { semBico: true };
      if (api.vez.estado === 'vez') {
        const marcas = {};
        const cor = E.vez === 1 ? 'rgba(47,127,224,0.13)' : 'rgba(242,134,42,0.15)';
        for (const b of minisPermitidas(E)) for (let l = 0; l < 9; l++) if (!E.donos[casaDe(b, l)]) marcas[casaDe(b, l)] = cor;
        out.marcas = marcas;
      }
      if (api.sub === 'megaRapida') {
        const r = api.dados.relogio;
        out.rotulos = [
          { casa: 0, texto: Math.ceil(r[1]) + 's', cor: '#1f6fd6', y: api.est.caixa[3] + 0.55 },
          { casa: 8, texto: Math.ceil(r[2]) + 's', cor: '#e8691a', y: api.est.caixa[3] + 0.55 },
        ];
      }
      return out;
    },
    /** a linha da vitoria da Mega e de velhinhas: o risco passa pela casa do meio de cada uma */
    linhaCasas: (api, res) => (res.minis ? res.linha.map((b) => casaDe(b, 4)) : res.linha),
  };

  /**
   * Fecha a velhinha: as 3 da linha saltam juntas para o meio, as outras estouram, as divisorias de
   * dentro somem, as 3 viram um slimao que incha e cai.
   * @param {any} api @param {any} ef
   */
  function fechar(api, ef) {
    const est = api.est;
    const b = ef.mini;
    const meio = est.celulas[casaDe(b, 4)];
    const da = ef.linha.map((id) => api.pecas.get(id)).filter(Boolean);
    const outras = ef.todas.filter((id) => !ef.linha.includes(id)).map((id) => api.pecas.get(id)).filter(Boolean);
    const cy = meio.cy + 0.6;
    return [
      juntas(da.map((p) => saltar(api.ctx, { s: p.s, x: meio.cx, y: cy, altura: 1.4, dur: 0.45, soltar: false }))),
      fazer(() => {
        for (const p of outras) estourar(api.ctx, { s: p.s }).passo(0);
        for (const id of ef.todas) api.pecas.delete(id);
        // as divisorias de dentro da velhinha somem
        const R0 = ((b / 3) | 0) * 3;
        const C0 = (b % 3) * 3;
        const rows = est.rows;
        for (const r of [R0, R0 + 1]) {
          const k = rows - 1 - r;
          for (let c = C0; c < C0 + 3; c++) api.dados.removidas.add(est.horiz[k][c]);
        }
        for (const j of [C0 + 1, C0 + 2]) {
          for (let r = R0; r < R0 + 3; r++) api.dados.removidas.add(est.vert[j][rows - 1 - r]);
        }
        api.m.definirParedes(est.paredes.filter((_, k) => !api.dados.removidas.has(k)));
        const [a, ...resto] = da.map((p) => p.s);
        if (!a) return;
        const dados = a.dados;
        api.m.fundir(a, resto, { px: meio.cx, py: cy, rampa: 0.3 });
        a.dados = dados;
        api.m.redimensionar(a, particulasGirassol(D_SLIMAO, ESPACO), meio.cx, cy);
        a.preso = true;
        a.alvoX = meio.cx;
        a.alvoY = cy;
        a.nivel = 3;
        a.dados.semRede = true;
        a.dados.expr = 'feliz';
        a.dados.exprT = 2;
        api.eventos.push({ tipo: 'fusao', x: meio.cx, y: cy });
        api.eventos.push({ tipo: 'texto', x: meio.cx, y: cy + 3.2, chave: 'mega', cor: ef.jogador === 1 ? '#2f7fe0' : '#f2862a', escala: 1.2 });
        api.dados.slimao = a;
      }),
      {
        nome: 'cair',
        passo() {
          const a = api.dados.slimao;
          if (a && a.ativo) {
            api.m.soltar(a, -1);
            a.dados.solto = api.m.tempo;
            a.dados.pousou = false;
          }
          return true;
        },
      },
    ];
  }

  return criarModoVez(/** @type {any} */ (G), o);
}
