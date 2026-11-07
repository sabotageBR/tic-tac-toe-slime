// Modelo 3, Velha Derrete: o jogo da velha infinito com slime. Cada um tem no maximo 3 gotas; a mais
// velha da vez faz cara de susto e treme (aviso), e no 4o lance ela derrete, chora e escoa pelo
// ralo do piso enquanto a nova pinga. Relampago: 5 s por lance (acabou, o conta-gotas pinga sozinho
// numa casa sorteada). Melhor de 5: quem fizer 3 vitorias leva a serie.

import { criarModoVez } from './base.js';
import { REGRAS as CLASSICA } from '../regras/classica.js';
import { REGRAS_DERRETE, inicialDerrete, proximaADerreter } from '../regras/derrete.js';
import { derreter, pingar, juntas } from '../gotas.js';

const SUBMODOS = [
  { id: 'classico', nome: 'classico', desc: '' },
  { id: 'derrete', nome: 'derrete', desc: '' },
  { id: 'calor', nome: 'calor', desc: '' },
  { id: 'relampago', nome: 'relampago', desc: '' },
  { id: 'melhor5', nome: 'melhor5', desc: '' },
];
const TEMPO_LANCE = 5;

/** @param {any} o */
export function criarModo(o) {
  const G = {
    id: 'derrete',
    titulo: 'Velha Derrete',
    submodos: SUBMODOS,
    regras: (sub) => (sub === 'classico' ? CLASSICA : REGRAS_DERRETE),
    inicial: (sub, comeca) => (sub === 'classico' ? CLASSICA.inicial({ comeca }) : inicialDerrete(sub, comeca)),
    /** derrete e pinga ao mesmo tempo (o ritmo do infinito) */
    encenar(api, ef) {
      if (ef.tipo === 'derreter' || ef.tipo === 'calor') {
        const p = api.pecas.get(ef.id);
        if (!p) return [];
        api.pecas.delete(ef.id);
        if (ef.tipo === 'calor') {
          // a onda de calor vem depois do pingo: derrete na sequencia
          api.eventos.push({ tipo: 'texto', x: p.s.cx, y: p.s.cy + 1.4, chave: 'calor', cor: '#ff6a2a', escala: 1 });
          return [derreter(api.ctx, { s: p.s, dur: 0.7 })];
        }
        api.dados.derretendo = derreter(api.ctx, { s: p.s, dur: 0.7 });
        return [];
      }
      if (ef.tipo === 'pingar' && api.dados.derretendo) {
        const d = api.dados.derretendo;
        api.dados.derretendo = null;
        const [a] = api.padrao(ef);
        return [juntas([d, a])];
      }
      return null;
    },
    /** @param {any} api @param {number} dt */
    passo(api, dt) {
      const E = api.E;
      // aviso: a mais velha da vez tem cara de susto e treme
      const velha = api.sub === 'classico' ? null : proximaADerreter(E);
      for (const p of api.pecas.values()) {
        const s = p.s;
        if (!s.ativo || s.dados.derretendo) continue;
        const marcada = !!velha && api.vez.estado === 'vez' && api.pecas.get(velha.id) === p;
        s.dados.treme = marcada;
        if (marcada) { s.dados.expr = 'susto'; s.dados.exprT = 0.3; }
      }
      // relampago: relogio por lance
      if (api.sub === 'relampago') {
        if (api.vez.estado === 'vez') {
          api.dados.relogio = (api.dados.relogio === undefined ? TEMPO_LANCE : api.dados.relogio) - dt;
          if (api.dados.relogio <= 0 && api.minhaVez) {
            const js = api.vez.jogadas;
            api.vez.jogar(js[Math.floor(api.rng() * js.length) % js.length]);
          }
        } else api.dados.relogio = TEMPO_LANCE;
      }
      // melhor de 5: quem chega a 3 vitorias leva a serie; a partida seguinte comeca a serie nova
      if (api.sub === 'melhor5' && api.vez.estado === 'vez' && (api.placar[1] >= 3 || api.placar[2] >= 3)) {
        const campeao = api.placar[1] >= 3 ? 1 : 2;
        api.eventos.push({ tipo: 'texto', x: 0, y: api.est.caixa[3] - 1, chave: 'serie', vars: { j: campeao }, cor: '#ffd23a', escala: 1.4 });
        api.eventos.push({ tipo: 'voz', id: 'vozParabensSlime' });
        api.placar[1] = 0;
        api.placar[2] = 0;
        api.placar[0] = 0;
      }
    },
    visual(api) {
      const velha = api.sub === 'classico' ? null : proximaADerreter(api.E);
      const out = {};
      if (velha && api.vez.estado === 'vez') out.marcas = { [velha.casa]: 'rgba(255, 90, 60, 0.18)' };
      if (api.sub === 'relampago' && api.vez.estado === 'vez' && api.dados.relogio !== undefined) {
        out.rotulos = [{ casa: 1, texto: Math.max(0, Math.ceil(api.dados.relogio)) + 's', cor: api.dados.relogio < 2 ? '#e8303a' : '#17161c', y: api.est.caixa[3] + 0.6 }];
      }
      return out;
    },
  };
  return criarModoVez(/** @type {any} */ (G), o);
}
