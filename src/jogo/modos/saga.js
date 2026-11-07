// Modelo 5, Saga dos Poderes: o jogo da velha classico contra uma escada de rivais slime; cada um
// traz um evento FISICO (o logico decide antes, a fisica mostra):
//   gelo      um bloco de gelo cai no nicho que voce mais quer (bloqueado por 4 lances);
//   terremoto a estante treme e as gotas caem de verdade ate a casa livre mais baixa da coluna;
//   lava      a sua gota mais perigosa derrete e escoa pelo ralo;
//   vento     as gotas andam uma casa no sentido do vento (a seta avisa antes);
//   gigante   um slimao do rival ocupa duas casas (a divisoria entre elas some).
// O evento e avisado um lance antes, sai depois do 2o lance do rival e depois a cada 4 (no maximo 2).
// Antes de cada partida voce recebe 3 poderes e usa 1: missil, trocar, chacoalhar, calor, cola.
// Venceu, sobe de rival; perdeu, repete. Caos 2P: os dois jogadores, eventos sorteados e um poder
// para cada um.

import { criarModoVez } from './base.js';
import { REGRAS as CLASSICA } from '../regras/classica.js';
import {
  REGRAS_SAGA, inicialSaga, RIVAIS, PODERES, gelo, terremoto, lava, vento, gigante, missil, trocar, chacoalhar, calor,
} from '../regras/saga.js';
import { saltar, derreter, estourar, fazer, juntas, esperar, criarGota } from '../gotas.js';

const SUBMODOS = [
  { id: 'classico', nome: 'classico', desc: '' },
  { id: 'saga', nome: 'saga', desc: '' },
  { id: 'caos2p', nome: 'caos2p', desc: '' },
];
const EVENTOS = ['gelo', 'terremoto', 'lava', 'vento', 'gigante'];
/** lances do rival (Saga) ou lances totais (Caos) em que o evento sai */
const QUANDO_SAGA = [2, 4];
const QUANDO_CAOS = [4, 8];

/** @param {any} o */
export function criarModo(o) {
  let fase = 0;
  const caos = o.regra === 'caos2p';
  const G = {
    id: 'saga',
    titulo: 'Saga dos Poderes',
    submodos: SUBMODOS,
    regras: (sub) => (sub === 'classico' ? CLASSICA : REGRAS_SAGA),
    inicial: (sub, comeca) => (sub === 'classico' ? CLASSICA.inicial({ comeca }) : inicialSaga(sub === 'saga' ? 1 : comeca)),
    montar(api) {
      if (api.sub === 'classico') return;
      // paredes de volta (o gigante tira uma divisoria) e o gelo da partida anterior some
      api.m.definirParedes(api.est.paredes);
      api.dados.gelos = {};
      api.dados.feitos = 0;
      api.dados.aviso = null;
      api.dados.armado = null;
      if (api.sub === 'saga') {
        const rv = RIVAIS[fase];
        api.vez.nivel = rv.nivel;
        api.dados.rival = rv;
        api.dados.faseAtual = fase;
        api.dados.oferta = sortearPoderes(api, 3);
        api.dados.usado = false;
        api.eventos.push({ tipo: 'texto', x: 0, y: api.est.caixa[3] - 1.2, chave: 'rival', vars: { nome: rv.nome }, cor: '#ffffff', escala: 1.1 });
      } else {
        api.dados.oferta = null;
        api.dados.poderDe = { 1: sortearPoderes(api, 1)[0], 2: sortearPoderes(api, 1)[0] };
        api.dados.usadoDe = { 1: false, 2: false };
      }
    },
    /** @param {any} api @param {number} dt */
    passo(api, dt) {
      if (api.sub === 'classico') return;
      const v = api.vez;
      const E = api.E;
      // gelo que acabou derrete
      for (const [casa, s] of Object.entries(api.dados.gelos || {})) {
        if (!E.bloq[+casa] && s && s.ativo && !s.dados.derretendo) v.encenar(derreter(api.ctx, { s, dur: 0.5 }));
      }
      // fim da partida: sobe de rival ou repete
      if (v.estado === 'fim' && !api.dados.contou) {
        api.dados.contou = true;
        if (api.sub === 'saga' && v.resultado.vencedor === 1) fase = Math.min(RIVAIS.length - 1, fase + 1);
        return;
      }
      if (v.estado !== 'fim') api.dados.contou = false;
      if (v.estado !== 'vez') return;
      // agenda dos eventos
      const quando = api.sub === 'saga' ? QUANDO_SAGA : QUANDO_CAOS;
      const conta = api.sub === 'saga' ? E.rivalLances : E.lances;
      const prox = quando[api.dados.feitos];
      if (prox === undefined) return;
      // na Saga o evento sai na vez da pessoa (depois do lance do rival)
      const vezCerta = api.sub === 'saga' ? E.vez === 1 : true;
      if (!api.dados.aviso && conta >= prox - 1) {
        const ev = escolherEvento(api);
        api.dados.aviso = { ev, dx: api.rng() < 0.5 ? -1 : 1 };
        api.eventos.push({ tipo: 'texto', x: 0, y: api.est.caixa[3] - 0.8, chave: 'ev.' + ev, cor: '#ffd23a', escala: 1.2 });
        api.eventos.push({ tipo: 'som', nome: 'aviso' });
        api.eventos.push({ tipo: 'voz', id: 'vozCuidadoSlime' });
      }
      if (api.dados.aviso && conta >= prox && vezCerta) {
        const { ev, dx } = api.dados.aviso;
        api.dados.aviso = null;
        api.dados.feitos++;
        disparar(api, ev, dx);
      }
    },
    /** toque com poder armado: o poder vai na casa */
    toque(api, casa) {
      if (api.dados.armado) {
        const id = api.dados.armado;
        api.dados.armado = null;
        usarPoder(api, id, casa);
        return null;
      }
      return { casa };
    },
    poder(api, acao) {
      if (api.sub === 'classico' || !api.minhaVez) return false;
      const meu = api.E.vez;
      const disp = api.sub === 'saga' ? (!api.dados.usado && (api.dados.oferta || []).includes(acao)) : (!api.dados.usadoDe[meu] && api.dados.poderDe[meu] === acao);
      if (!disp) return false;
      if (acao === 'missil' || acao === 'trocar' || acao === 'chacoalhar') {
        api.dados.armado = api.dados.armado === acao ? null : acao;
        api.eventos.push({ tipo: 'som', nome: 'botao' });
        return true;
      }
      return usarPoder(api, acao, -1);
    },
    visual(api) {
      if (api.sub === 'classico') return {};
      const E = api.E;
      const marcas = {};
      for (let i = 0; i < 9; i++) if (E.bloq[i]) marcas[i] = 'rgba(140, 200, 255, 0.28)';
      const out = { marcas };
      if (api.dados.aviso && api.dados.aviso.ev === 'vento') {
        out.rotulos = [{ casa: 1, texto: api.dados.aviso.dx > 0 ? '>>>' : '<<<', cor: '#3fa0e0', y: api.est.caixa[3] + 0.5 }];
      }
      if (api.dados.armado) out.armado = api.dados.armado;
      return out;
    },
    hud(api) {
      if (api.sub === 'classico') return {};
      const meu = api.E.vez;
      let poderes = [];
      if (api.sub === 'saga') {
        poderes = (api.dados.oferta || []).map((id) => ({ id, usado: api.dados.usado, armado: api.dados.armado === id }));
      } else if (api.dados.poderDe) {
        poderes = [{ id: api.dados.poderDe[meu], usado: api.dados.usadoDe[meu], armado: api.dados.armado === api.dados.poderDe[meu] }];
      }
      const rv = api.dados.rival;
      return {
        poderes,
        dica: api.sub === 'saga' && rv ? { chave: 'sagaRival', vars: { n: (api.dados.faseAtual || 0) + 1, total: RIVAIS.length, nome: rv.nome } } : null,
      };
    },
  };

  /** @param {any} api @param {number} n */
  function sortearPoderes(api, n) {
    const lista = PODERES.slice();
    const out = [];
    while (out.length < n && lista.length) out.push(lista.splice(Math.floor(api.rng() * lista.length) % lista.length, 1)[0]);
    return out;
  }

  /** @param {any} api */
  function escolherEvento(api) {
    if (api.sub === 'saga') {
      const evs = api.dados.rival.eventos;
      let ev = evs[api.dados.feitos % evs.length];
      if (ev === 'gigante' && api.E.gigante) ev = 'terremoto';
      return ev;
    }
    let ev = EVENTOS[Math.floor(api.rng() * EVENTOS.length) % EVENTOS.length];
    if (ev === 'gigante' && api.E.gigante) ev = 'gelo';
    return ev;
  }

  /** Pecas cujo slime ainda existe, pelo id. @param {any} api @param {number} id */
  const peca = (api, id) => api.pecas.get(id);

  /** Leva o slime da peca ate a casa (salto curto, cai solto). */
  function levar(api, id, casa, altura = 0.6, dur = 0.4) {
    const p = peca(api, id);
    if (!p || !p.s.ativo) return esperar(0);
    p.casa = casa;
    const C = api.est.celulas[casa];
    return saltar(api.ctx, { s: p.s, x: C.cx, y: C.y0 + p.s.raio0 + 0.25, altura, dur });
  }

  /**
   * Tremor de toda a estante: vai e volta algumas vezes (tremerParedes chega exatamente no alvo).
   * @param {any} api @param {number} dur @param {number} amp
   */
  function tremor(api, dur, amp) {
    const lista = api.m.paredes.map((_, k) => k);
    let t = 0;
    let lado = 1;
    let prox = 0;
    return {
      nome: 'tremor',
      passo(dt) {
        if (t === 0) api.eventos.push({ tipo: 'tremor' }, { tipo: 'som', nome: 'tremor' });
        t += dt;
        if (t >= prox) {
          lado = -lado;
          prox = t + 0.08;
          const a = t < dur ? amp * (1 - t / dur) : 0;
          api.m.tremerParedes(lista, lado * a, a * 0.4 * (lado > 0 ? 1 : -1), 0.08);
        }
        if (t >= dur + 0.1) { api.m.tremerParedes(lista, 0, 0, 0.05); return true; }
        return false;
      },
    };
  }

  /** O evento acontece: troca o logico e encena a fisica. @param {any} api @param {string} ev @param {number} dx */
  function disparar(api, ev, dx) {
    const v = api.vez;
    const E = api.E;
    const vitima = api.sub === 'saga' ? 1 : E.vez;
    if (ev === 'gelo') {
      const r = gelo(E, vitima);
      if (r.casa < 0) return;
      v.trocar(r.E);
      const C = api.est.celulas[r.casa];
      v.encenar(fazer(() => {
        // bloco de gelo: azul-claro quase branco, duro (estado gelo), sem rosto
        const s = criarGota(api.m, { x: C.cx, y: C.y1 - 1.6, d: 2.9, jogador: 0, material: 'gelatina', pigmento: [0.1, 0, 0.02, 0], hex: '#cfefff' });
        if (!s) return;
        s.estado = 'gelo';
        s.tEstado = 999;
        s.dados.semRede = true;
        s.dados.semRosto = true;
        s.dados.solto = api.m.tempo;
        api.dados.gelos[r.casa] = s;
        api.eventos.push({ tipo: 'som', nome: 'gelo' });
      }), esperar(0.6));
      return;
    }
    if (ev === 'terremoto') {
      const r = terremoto(E);
      v.trocar(r.E);
      v.encenar(juntas([tremor(api, 1.2, 0.35), ...r.quedas.map((q) => levar(api, q.id, q.para, 0.15, 0.35))]));
      return;
    }
    if (ev === 'lava') {
      const r = lava(E, vitima);
      if (r.casa < 0) return;
      v.trocar(r.E);
      const p = peca(api, r.id);
      if (p) {
        api.pecas.delete(r.id);
        p.s.dados.hex = '#ff5a1f';
        v.encenar(derreter(api.ctx, { s: p.s, dur: 0.8 }));
      }
      return;
    }
    if (ev === 'vento') {
      const r = vento(E, dx);
      v.trocar(r.E);
      v.encenar(fazer(() => { api.m.gx = dx * 18; api.eventos.push({ tipo: 'som', nome: 'vento' }); }),
        juntas(r.movidas.map((q) => levar(api, q.id, q.para, 0.35, 0.45))),
        fazer(() => { api.m.gx = 0; }));
      return;
    }
    if (ev === 'gigante') {
      const rival = api.sub === 'saga' ? 2 : (E.vez === 1 ? 2 : 1);
      const r = gigante(E, rival);
      if (!r.casas) return;
      v.trocar(r.E);
      const [a, b] = r.casas.map((i) => api.est.celulas[i]);
      // tira a divisoria entre as duas casas
      const ia = api.est.idx(r.casas[0]);
      const tirar = r.casas[1] === r.casas[0] + 1 ? ia.dir : ia.piso;
      api.m.definirParedes(api.est.paredes.filter((_, k) => k !== tirar));
      v.encenar(fazer(() => {
        const horiz = r.casas[1] === r.casas[0] + 1;
        const cx = (a.cx + b.cx) / 2;
        const cy = horiz ? a.y0 + 2.0 : (a.cy + b.cy) / 2;
        const s = criarGota(api.m, { x: cx, y: cy, d: 3.9, jogador: rival, id: r.id, nivel: 3 });
        if (!s) return;
        s.dados.semRede = true;
        s.dados.solto = api.m.tempo;
        s.dados.expr = 'furioso';
        s.dados.exprT = 2;
        api.pecas.set(r.id, { s, casa: r.casas[0], jogador: rival });
        api.eventos.push({ tipo: 'pouso', x: cx, y: cy, forca: 2, cor: s.dados.hex });
      }), esperar(0.8));
    }
  }

  /** Usa o poder (na casa, quando precisa de alvo). @param {any} api @param {string} id @param {number} casa */
  function usarPoder(api, id, casa) {
    const v = api.vez;
    const E = api.E;
    const quem = E.vez;
    let feito = false;
    if (id === 'missil') {
      const r = missil(E, casa);
      if (r) {
        v.trocar(r.E);
        const p = peca(api, r.id);
        api.pecas.delete(r.id);
        v.encenar(fazer(() => api.eventos.push({ tipo: 'som', nome: 'poder' })), esperar(0.25), estourar(api.ctx, { s: p && p.s, grande: true }), esperar(0.4));
        feito = true;
      }
    } else if (id === 'trocar') {
      const r = trocar(E, casa);
      if (r) {
        v.trocar(r.E);
        v.encenar(juntas([levar(api, r.a.id, r.a.para, 1.4, 0.5), levar(api, r.b.id, r.b.para, 0.8, 0.5)]));
        feito = true;
      }
    } else if (id === 'chacoalhar') {
      const r = chacoalhar(E, casa);
      if (r) {
        v.trocar(r.E);
        v.encenar(juntas([tremor(api, 0.6, 0.2), ...r.movidas.map((q) => levar(api, q.id, q.para, 0.9, 0.45))]));
        feito = true;
      }
    } else if (id === 'calor') {
      const r = calor(E);
      if (r) {
        v.trocar(r.E);
        const p = peca(api, r.id);
        api.pecas.delete(r.id);
        if (p) v.encenar(derreter(api.ctx, { s: p.s, dur: 0.7 }));
        feito = true;
      }
    } else if (id === 'cola') {
      v.trocar({ ...E, colaArmada: true });
      api.eventos.push({ tipo: 'texto', x: 0, y: api.est.caixa[3] - 1, chave: 'pd.cola', cor: '#ffd23a' });
      feito = true;
    }
    if (!feito) {
      api.eventos.push({ tipo: 'som', nome: 'recusa' });
      return false;
    }
    api.eventos.push({ tipo: 'som', nome: 'poder' }, { tipo: 'voz', id: 'vozPowerUpSlime' });
    if (api.sub === 'saga') api.dados.usado = true;
    else api.dados.usadoDe[quem] = true;
    return true;
  }

  // a CPU do Caos 2P nao existe; no Saga, a pessoa e sempre o azul (comeca)
  if (caos) o = { ...o, doisJogadores: true };
  return criarModoVez(/** @type {any} */ (G), o);
}
