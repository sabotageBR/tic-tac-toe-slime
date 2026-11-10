// Modelo 12, Sincronia: o jogo da velha de tempo. Um feixe de scanner varre as casas; quem tem a vez
// toca (em qualquer lugar) para travar a casa em que o feixe esta. Casa livre: a marca entra. Casa
// ocupada: falha, perde a vez. O feixe acelera a cada marca no tabuleiro. No Turbo ele vai e volta
// e e bem mais rapido. A CPU escolhe a casa pela busca e erra o tempo conforme o nivel.

import { criarModoTec } from './base.js';
import { REGRAS, passar } from '../regras/sincronia.js';
import { esperar } from './acoes.js';

const SUBMODOS = [{ id: 'classico' }, { id: 'sincronia' }, { id: 'turbo' }];
/** a cobra: vai pela linha de cima, volta pela do meio, vai pela de baixo */
const COBRA = [0, 1, 2, 5, 4, 3, 6, 7, 8];
const VAIVEM = [...COBRA, 7, 6, 3, 4, 5, 2, 1];
/** chance de a CPU travar uma casa antes ou depois da que queria, por nivel */
const ERRO = [0.42, 0.3, 0.18, 0.09, 0.02];

/** casas por segundo: cresce com as marcas no tabuleiro @param {any} api */
function velocidade(api) {
  const marcas = api.E.lances;
  return (api.sub === 'turbo' ? 4.4 : 2.7) + marcas * (api.sub === 'turbo' ? 0.4 : 0.3);
}

/** Trava o feixe onde ele esta. @param {any} api */
function travar(api) {
  if (api.vez.estado !== 'vez') return false;
  const S = api.dados.scan;
  const casa = S.caminho[Math.floor(S.pos) % S.caminho.length];
  const C = api.geo.celulas[casa];
  const j = api.E.vez;
  api.dados.alvo = undefined;
  api.dados.alvoBot = undefined;
  if (!api.E.donos[casa]) {
    api.som('tecTrava');
    api.eventos.push({ tipo: 'onda', x: C.cx, y: C.cy, j, r: 1.8 });
    return api.vez.jogar({ casa });
  }
  // falha de sincronia: a vez passa
  api.palco.falha = { casa, t0: api.palco.t, j };
  api.som('tecFalha');
  api.eventos.push({ tipo: 'glitch', dur: 0.3 });
  api.eventos.push({ tipo: 'texto', x: C.cx, y: C.cy + 0.9, chave: 'tec.falha', j, escala: 0.9 });
  api.eventos.push({ tipo: 'lance', jogador: j, jogada: { falha: casa } });
  api.vez.trocar(passar(api.E));
  api.vez.encenar(esperar(0.55));
  return true;
}

/** @type {import('./base.js').GanchoTec} */
const G = {
  id: 'sincronia',
  submodos: SUBMODOS,
  cpuManual: true,
  regras: () => REGRAS,
  montar(api) {
    api.dados.scan = { pos: 0, caminho: api.sub === 'turbo' ? VAIVEM : COBRA, casa: -1 };
    api.dados.pensar = 0.5;
    api.palco.falha = null;
  },
  /** qualquer toque trava */
  apontar(api, _x, _y, fase) {
    if (fase === 'baixo' && api.minhaVez) travar(api);
    return true;
  },
  tecla(api, codigo) {
    if (codigo === 'Space' || codigo === 'Enter') { if (api.minhaVez) travar(api); return true; }
    return /^(Arrow|Digit|Numpad)/.test(codigo);
  },
  /** o bot marca o alvo; o passo trava quando o feixe chega */
  bot(api) {
    if (!api.minhaVez) return false;
    if (api.dados.alvoBot === undefined) {
      const j = api.vez.sugerir(1);
      if (!j) return false;
      api.dados.alvoBot = j.casa;
    }
    return true;
  },
  toques(api, j) {
    const C = api.geo.celulas[j.casa];
    return [[C.cx, C.cy]];
  },
  passo(api, dt) {
    const d = api.dados;
    const S = d.scan;
    if (!S || api.vez.estado !== 'vez') return;
    const antes = Math.floor(S.pos);
    S.pos += velocidade(api) * dt;
    const n = S.caminho.length;
    if (S.pos >= n * 1000) S.pos -= n * 1000;
    const idx = Math.floor(S.pos);
    S.casa = S.caminho[idx % n];
    if (idx !== antes) api.som('tecTique');
    const frac = S.pos - idx;
    const E = api.E;
    if (api.cpu(E.vez)) {
      // a CPU: pensa, escolhe a casa e (as vezes) erra o tempo por uma casa do caminho
      if (d.alvo === undefined) {
        d.pensar -= dt;
        if (d.pensar > 0) return;
        const j = api.vez.sugerir(api.nivel);
        if (!j) return;
        let alvo = j.casa;
        const erro = ERRO[Math.max(0, Math.min(4, api.nivel))] * (api.sub === 'turbo' ? 1.4 : 1);
        if (api.rng() < erro) {
          const k = S.caminho.indexOf(alvo);
          alvo = S.caminho[(k + (api.rng() < 0.5 ? 1 : n - 1)) % n];
        }
        d.alvo = alvo;
        d.pensar = 0.45 + api.rng() * 0.4;
        return;
      }
      if (S.casa === d.alvo && frac >= 0.4) travar(api);
    } else if (d.alvoBot !== undefined && S.casa === d.alvoBot && frac >= 0.35) {
      travar(api);
    }
  },
  visual(api) {
    const S = api.dados.scan;
    if (!S) return {};
    const n = S.caminho.length;
    const idx = Math.floor(S.pos);
    return {
      realce: -1,
      scan: {
        casa: S.caminho[idx % n], frac: S.pos - idx, proxima: S.caminho[(idx + 1) % n], anterior: S.caminho[(idx + n - 1) % n],
        ativo: api.vez.estado === 'vez', j: api.E.vez,
      },
      falha: api.palco.falha,
    };
  },
  hud(api) {
    return api.minhaVez ? { texto: 'tec.trave' } : {};
  },
};

/** @param {any} o */
export function criarModo(o) {
  return criarModoTec(G, o);
}
