// Maquina de vez comum aos modelos de turno: vez -> encenando -> (resultado) -> vez do outro ou
// fim. O lance logico e aplicado na hora (o tabuleiro logico manda); a fila de acoes encena a
// fisica e so depois a vez passa. A CPU "pensa" um pouco antes de jogar (sorteio pelo rng).
// Logica pura.

import { escolher } from './ia.js';
import { criarFila } from './gotas.js';

/**
 * @param {{
 *   R: import('./ia.js').Regras & { aplicar: (E: any, j: any) => { E: any, efeitos: any[] } },
 *   E: any,
 *   rng: () => number,
 *   eventos: any[],
 *   cpu: (jogador: number) => boolean,
 *   nivel: number,
 *   poupar?: boolean,
 *   orcamento?: number,
 *   encenar: (efeitos: any[], antes: any, depois: any) => import('./gotas.js').Acao[],
 * }} o
 */
export function criarVez(o) {
  const R = o.R;
  let E = o.E;
  /** @type {'vez'|'encenando'|'fim'} */
  let estado = 'vez';
  let pensar = 0.7;
  let tFim = 0;
  /** @type {{ vencedor: number, linha?: number[] }|null} */
  let res = null;
  const fila = criarFila();
  let poupar = !!o.poupar;

  /** @param {any} a @param {any} b */
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /**
   * Faz o lance (do humano, da CPU ou do bot). Devolve se valeu.
   * @param {any} j
   */
  function jogar(j) {
    if (estado !== 'vez' || !j) return false;
    if (!R.jogadas(E).some((x) => igual(x, j))) return false;
    const antes = E;
    const r = R.aplicar(E, j);
    E = r.E;
    o.eventos.push({ tipo: 'lance', jogador: antes.vez, jogada: j });
    fila.por(...o.encenar(r.efeitos || [], antes, E));
    estado = 'encenando';
    return true;
  }

  /** Lance que a CPU faria agora para quem tem a vez. @param {number} [nivel] */
  function sugerir(nivel) {
    return escolher(R, E, { nivel: nivel === undefined ? o.nivel : nivel, rng: o.rng, poupar, orcamento: o.orcamento });
  }

  return {
    jogar,
    sugerir,
    /** @param {number} dt */
    passo(dt) {
      if (estado === 'vez') {
        if (o.cpu(E.vez)) {
          pensar -= dt;
          if (pensar <= 0) jogar(sugerir());
        }
      } else if (estado === 'encenando') {
        fila.passo(dt);
        if (fila.vazia) {
          res = R.resultado(E);
          if (res) {
            estado = 'fim';
            tFim = 0;
            o.eventos.push({ tipo: 'fim', vencedor: res.vencedor, linha: res.linha || null });
          } else {
            estado = 'vez';
            pensar = 0.45 + o.rng() * 0.45;
            o.eventos.push({ tipo: 'vez', jogador: E.vez, cpu: o.cpu(E.vez) });
          }
        }
      } else {
        tFim += dt;
        fila.passo(dt);
      }
    },
    /** Poe acoes na fila sem lance (eventos do rival, comemoracao). @param {...import('./gotas.js').Acao} a */
    encenar(...a) {
      fila.por(...a);
      if (estado === 'vez') estado = 'encenando';
    },
    /** Troca o estado logico (eventos que mexem no tabuleiro fora do lance). @param {any} F */
    trocar(F) { E = F; },
    /** Recomeca com um estado novo. @param {any} F */
    reiniciar(F) {
      E = F;
      estado = 'vez';
      pensar = 0.8;
      res = null;
      fila.limpar();
      o.eventos.push({ tipo: 'vez', jogador: E.vez, cpu: o.cpu(E.vez) });
    },
    /** @param {boolean} v */
    set poupar(v) { poupar = v; },
    get E() { return E; },
    get estado() { return estado; },
    get resultado() { return res; },
    get tFim() { return tFim; },
    get filaVazia() { return fila.vazia; },
    get jogadas() { return estado === 'vez' ? R.jogadas(E) : []; },
  };
}
