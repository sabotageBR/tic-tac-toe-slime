// Modelo 2, Peteleco da Velha: o jogo da velha numa mesa vista de cima (gravidade zero, atrito de
// mesa). Na vez, voce puxa o slime para tras a partir do seu trilho e solta: ele desliza, se amassa,
// bate e para. A FISICA decide a casa: o slime e dono da casa onde esta >= 55% da massa dele; numa
// disputa, fica com quem tem mais particulas la. Bater no rival o empurra (para fora da casa ou da
// mesa: cai na calha e some); bater num seu funde os dois num maior (mais pesado, dificil de tirar).
// 5 lances cada; linha depois de assentar vence (os dois: quem lancou); sem linha, mais casas.
// Sabao: atrito baixo. Vento: sopro lateral sorteado a cada lance. Caos 2P: os dois lancam ao mesmo
// tempo no "Ja!". Classico: o toque poe o slime no meio da casa.
// O azul lanca de baixo; o laranja (ou a CPU), de cima.

import { criarMundo } from '../../fisica/mundo.js';
import { criarRng } from '../../core/rng.js';
import { criarGota, cuidar } from '../gotas.js';
import { linhasDe, outro, linhasAbertas } from '../tabuleiro.js';
import { particulasGirassol } from '../../fisica/forma.js';
import { ESPACO } from '../../fisica/mundo.js';

const SUBMODOS = [
  { id: 'classico', nome: 'classico', desc: '' },
  { id: 'peteleco', nome: 'peteleco', desc: '' },
  { id: 'sabao', nome: 'sabao', desc: '' },
  { id: 'vento', nome: 'vento', desc: '' },
  { id: 'caos', nome: 'caos', desc: '' },
];

/** lado da casa (u) e meia mesa */
export const CASA = 4.4;
export const MEIA = 1.5 * CASA;
/** distancia do trilho ate a borda da mesa */
const TRILHO = 2.6;
const D = 2.5;
const VMAX_LANCE = 24;
export const LANCES = 5;
const MU = { peteleco: 22, sabao: 7, vento: 22, caos: 22, classico: 22 };

/**
 * Dono de cada casa pela massa (particulas) de cada slime em cada casa.
 * @param {any} m
 * @returns {{ donos: number[], porSlime: Map<number, number> }}
 */
export function donosDaMesa(m) {
  /** contagem[slime][casa] */
  const cont = new Map();
  for (let k = 0; k < m.n; k++) {
    const s = m.slimes[m.sl[k]];
    if (!s || !s.ativo || !s.dados.jogador || s.preso) continue;
    const c = Math.floor((m.x[k] + MEIA) / CASA);
    const r = Math.floor((MEIA - m.y[k]) / CASA);
    if (c < 0 || c > 2 || r < 0 || r > 2) continue;
    if (!cont.has(s.idx)) cont.set(s.idx, new Array(9).fill(0));
    cont.get(s.idx)[r * 3 + c]++;
  }
  const donos = new Array(9).fill(0);
  const melhor = new Array(9).fill(0);
  const empate = new Array(9).fill(false);
  /** casa de cada slime (-1 = nenhuma) */
  const porSlime = new Map();
  for (const [idx, cs] of cont) {
    const s = m.slimes[idx];
    const tot = s.n || 1;
    let casa = -1;
    for (let i = 0; i < 9; i++) if (cs[i] >= 0.55 * tot) casa = i;
    porSlime.set(idx, casa);
    if (casa < 0) continue;
    const q = cs[casa];
    if (q > melhor[casa]) { melhor[casa] = q; donos[casa] = s.dados.jogador; empate[casa] = false; }
    else if (q === melhor[casa] && donos[casa] !== s.dados.jogador) empate[casa] = true;
  }
  for (let i = 0; i < 9; i++) if (empate[i]) donos[i] = 0;
  return { donos, porSlime };
}

/**
 * Previsao analitica do lance (a CPU): o disco desliza com atrito de Coulomb e para a v^2/(2 mu).
 * Devolve a velocidade para parar no alvo partindo de (x0, y0).
 * @param {number} x0 @param {number} y0 @param {number} tx @param {number} ty @param {number} mu @param {number} [alem] u alem do alvo
 */
export function lanceAte(x0, y0, tx, ty, mu, alem = 0) {
  const dx = tx - x0;
  const dy = ty - y0;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const v = Math.min(VMAX_LANCE, Math.sqrt(2 * mu * (d + alem)));
  return { vx: (dx / d) * v, vy: (dy / d) * v };
}

/** @param {any} o */
export function criarModo(o) {
  const semente = o.semente || 1;
  const rng = criarRng(semente * 31 + 7);
  const sub = SUBMODOS.some((s) => s.id === o.regra) ? o.regra : 'peteleco';
  const dois = sub === 'caos' ? true : !!o.doisJogadores;
  const nivel = o.nivel === undefined ? 2 : o.nivel;
  const mu = MU[/** @type {keyof typeof MU} */ (sub)] || 22;
  const m = criarMundo({ semente, limites: [-14, -14, 14, 14], config: { kAltura: 0 } });
  m.gy = 0;
  // cerca invisivel bem fora da mesa (o que passa da borda cai na calha antes de chegar nela)
  const F = MEIA + TRILHO + 2.2;
  m.definirParedes([
    { ax: -F, ay: -F, bx: F, by: -F, r: 0.3, oculta: true }, { ax: F, ay: -F, bx: F, by: F, r: 0.3, oculta: true },
    { ax: F, ay: F, bx: -F, by: F, r: 0.3, oculta: true }, { ax: -F, ay: F, bx: -F, by: -F, r: 0.3, oculta: true },
  ]);
  /** @type {any[]} */
  const eventos = [];
  const placar = { 1: 0, 2: 0, 0: 0 };
  const S = {
    vez: 1, comeca: 1, lances: { 1: 0, 2: 0 }, estado: /** @type {'vez'|'rolando'|'fim'} */ ('vez'), t: 0, pensar: 0.8,
    donos: new Array(9).fill(0), resultado: /** @type {any} */ (null), mira: /** @type {any} */ (null),
    vento: 0, jaT: 0, caosLancados: { 1: false, 2: false }, partidas: 0, hover: -1, tFim: 0, quieto: 0,
  };
  const cpu = (j) => !dois && j === 2;
  const trilhoY = (j) => (j === 1 ? -MEIA - TRILHO : MEIA + TRILHO);

  function sortearVento() {
    S.vento = sub === 'vento' ? (rng() < 0.5 ? -1 : 1) * (4 + rng() * 3) : 0;
  }

  /** Lanca um slime do jogador j de (x, trilho) com (vx, vy). */
  function lancar(j, x, vx, vy) {
    const s = criarGota(m, { x, y: trilhoY(j), d: D, jogador: j });
    if (!s) return;
    const v = Math.sqrt(vx * vx + vy * vy);
    const f = v > VMAX_LANCE ? VMAX_LANCE / v : 1;
    m.empurrar(vx * f, vy * f, s.idx);
    s.dados.lancado = m.tempo;
    s.dados.base = s.n;
    S.lances[j]++;
    eventos.push({ tipo: 'som', nome: 'peteleco' });
    eventos.push({ tipo: 'lance', jogador: j });
  }

  /** Classico: o slime aparece no meio da casa. */
  function porNaCasa(j, casa) {
    const c = casa % 3;
    const r = (casa / 3) | 0;
    const x = -MEIA + (c + 0.5) * CASA;
    const y = MEIA - (r + 0.5) * CASA;
    const s = criarGota(m, { x, y, d: D, jogador: j });
    if (s) { s.dados.base = s.n; m.escalarForma(s, 1); }
    S.lances[j]++;
    eventos.push({ tipo: 'som', nome: 'pingo' }, { tipo: 'pouso', x, y, forca: 1, cor: s ? s.dados.hex : '#888' });
  }

  function comecar() {
    S.estado = 'vez';
    S.pensar = 0.9;
    sortearVento();
    S.caosLancados = { 1: false, 2: false };
    S.jaT = sub === 'caos' ? 3 : 0;
    eventos.push({ tipo: 'vez', jogador: S.vez, cpu: cpu(S.vez) });
  }

  function novaPartida() {
    for (const s of m.slimes) if (s.ativo) m.remover(s);
    S.lances = { 1: 0, 2: 0 };
    S.donos = new Array(9).fill(0);
    S.resultado = null;
    S.comeca = S.comeca === 1 ? 2 : 1;
    S.vez = S.comeca;
    eventos.push({ tipo: 'nivel', acao: 'start', modelo: 'peteleco', regra: sub });
    comecar();
  }

  /** Atrito de mesa (Coulomb) e vento nos slimes que andam; fusao dos iguais que se batem; calha. */
  function fisicaDaMesa(dt) {
    m.gx = S.estado === 'rolando' ? S.vento : 0;
    for (const s of m.slimes) {
      if (!s.ativo || s.preso) continue;
      const v2 = s.vx * s.vx + s.vy * s.vy;
      if (v2 > 0.01) {
        const v = Math.sqrt(v2);
        m.atrair(s, s.cx - (s.vx / v) * 5, s.cy - (s.vy / v) * 5, mu, 0, dt);
      }
    }
    // dois do mesmo jogador que se batem com forca viram um so (ate 3x a massa de um)
    const nMax = 3 * particulasGirassol(D, ESPACO);
    for (const [i, j, p] of m.contatos()) {
      if (p < 3) continue;
      const a = m.slimes[i];
      const b = m.slimes[j];
      if (!a.ativo || !b.ativo || a.dados.jogador !== b.dados.jogador || a.n + b.n > nMax) continue;
      if (S.estado !== 'rolando') continue;
      const [gr, pe] = a.n >= b.n ? [a, b] : [b, a];
      const dados = gr.dados;
      m.fundir(gr, pe, { px: pe.cx, py: pe.cy, rampa: 0.4 });
      gr.dados = dados;
      gr.dados.expr = 'feliz';
      gr.dados.exprT = 1.2;
      eventos.push({ tipo: 'fusao', x: gr.cx, y: gr.cy });
    }
    // calha: quem saiu da mesa (centroide) cai e some
    for (const s of m.slimes) {
      if (!s.ativo || s.preso || !s.dados.jogador) continue;
      const fora = Math.abs(s.cx) > MEIA + 0.4 || Math.abs(s.cy) > MEIA + 0.4;
      const voltando = s.dados.lancado !== undefined && m.tempo - s.dados.lancado < 1.2;
      if (fora && !voltando) {
        eventos.push({ tipo: 'estouro', x: s.cx, y: s.cy, cor: s.dados.hex, r: 1 });
        eventos.push({ tipo: 'som', nome: 'calha' });
        m.remover(s);
      }
    }
  }

  function conferir() {
    const { donos } = donosDaMesa(m);
    S.donos = donos;
    const ls = linhasDe(donos, 3, 3);
    const lancou = outro(S.vez);
    /** @type {any} */
    let res = null;
    if (ls[1].length && ls[2].length) res = sub === 'caos' ? { vencedor: 0 } : { vencedor: lancou, linha: ls[lancou][0] };
    else if (ls[1].length) res = { vencedor: 1, linha: ls[1][0] };
    else if (ls[2].length) res = { vencedor: 2, linha: ls[2][0] };
    else if ((S.lances[1] >= LANCES && S.lances[2] >= LANCES) || (sub === 'classico' && donos.every((d) => d))) {
      const a = donos.filter((d) => d === 1).length;
      const b = donos.filter((d) => d === 2).length;
      res = { vencedor: a > b ? 1 : b > a ? 2 : 0 };
    }
    if (res) {
      S.resultado = res;
      S.estado = 'fim';
      S.tFim = 0;
      placar[res.vencedor]++;
      S.partidas++;
      eventos.push({ tipo: 'fim', vencedor: res.vencedor, linha: res.linha || null });
      eventos.push({ tipo: 'som', nome: !res.vencedor ? 'empate' : cpu(res.vencedor) ? 'perdeu' : 'venceu' });
      eventos.push({ tipo: 'voz', id: !res.vencedor ? 'vozCuidadoSlime' : cpu(res.vencedor) ? 'vozPerdeuSlime' : 'vozVenceuSlime' });
      eventos.push({ tipo: 'nivel', acao: res.vencedor === 1 || dois ? 'complete' : 'fail', modelo: 'peteleco', regra: sub });
      for (const s of m.slimes) {
        if (!s.ativo || !res.vencedor) continue;
        s.dados.expr = s.dados.jogador === res.vencedor ? 'feliz' : 'chorinho';
        s.dados.exprT = 2.5;
      }
      return;
    }
    comecar();
  }

  /** A CPU escolhe o lance: candidatos analiticos avaliados pela heuristica de linhas. */
  function lanceDaCpu() {
    const j = S.vez;
    const y0 = trilhoY(j);
    const { donos, porSlime } = donosDaMesa(m);
    /** @type {Array<{ x0: number, vx: number, vy: number, v: number }>} */
    const cand = [];
    for (let casa = 0; casa < 9; casa++) {
      const tx = -MEIA + ((casa % 3) + 0.5) * CASA;
      const ty = MEIA - (((casa / 3) | 0) + 0.5) * CASA;
      for (const x0 of [-2.5, 0, 2.5]) {
        const L = lanceAte(x0, y0, tx, ty, mu);
        const d = donos.slice();
        if (!d[casa]) d[casa] = j;
        cand.push({ x0, ...L, v: linhasAbertas(d, 3, 3, j) + (donos[casa] ? -3 : 0) + (casa === 4 ? 0.5 : 0) });
      }
    }
    // tirar um slime rival da casa dele: mira nele com sobra de velocidade
    for (const s of m.slimes) {
      if (!s.ativo || s.dados.jogador !== outro(j)) continue;
      const casa = porSlime.get(s.idx);
      if (casa === undefined || casa < 0) continue;
      const L = lanceAte(s.cx * 0.6, y0, s.cx, s.cy, mu, 3.5);
      const d = donos.slice();
      d[casa] = 0;
      cand.push({ x0: s.cx * 0.6, ...L, v: linhasAbertas(d, 3, 3, j) + 2 });
    }
    let melhor = cand[0];
    for (const c of cand) if (c.v > melhor.v || (c.v === melhor.v && rng() < 0.3)) melhor = c;
    const erroAng = [0.22, 0.14, 0.08, 0.04, 0.015][nivel] || 0.08;
    const erroV = [0.25, 0.16, 0.1, 0.06, 0.03][nivel] || 0.1;
    const a = (rng() * 2 - 1) * erroAng;
    const f = 1 + (rng() * 2 - 1) * erroV;
    const vx = (melhor.vx * Math.cos(a) - melhor.vy * Math.sin(a)) * f;
    const vy = (melhor.vx * Math.sin(a) + melhor.vy * Math.cos(a)) * f;
    return { x0: melhor.x0, vx, vy };
  }

  /** O bot (testes e ?auto): o lance da CPU para a pessoa da vez. */
  function jogarBot(j) {
    if (sub === 'classico') {
      const livres = [];
      for (let i = 0; i < 9; i++) if (!S.donos[i]) livres.push(i);
      if (livres.length) porNaCasa(j, livres[Math.floor(rng() * livres.length) % livres.length]);
      return;
    }
    const L = lanceDaCpu();
    lancar(j, L.x0, L.vx, L.vy);
  }

  function aposLance() {
    if (sub === 'caos') {
      if (S.caosLancados[1] && S.caosLancados[2]) { S.estado = 'rolando'; S.quieto = 0; S.t = 0; }
      return;
    }
    S.estado = 'rolando';
    S.quieto = 0;
    S.t = 0;
    S.vez = outro(S.vez);
  }

  comecar();
  eventos.push({ tipo: 'nivel', acao: 'start', modelo: 'peteleco', regra: sub });

  /** Uma "estante" de mentira para o toque e o realce (casas da mesa). */
  const tabuleiro = {
    cols: 3, rows: 3,
    celulas: Array.from({ length: 9 }, (_, i) => {
      const c = i % 3;
      const r = (i / 3) | 0;
      const x0 = -MEIA + c * CASA;
      const y1 = MEIA - r * CASA;
      return { i, r, c, x0, x1: x0 + CASA, y0: y1 - CASA, y1, cx: x0 + CASA / 2, cy: y1 - CASA / 2 };
    }),
    celulaEm(x, y) {
      const c = Math.floor((x + MEIA) / CASA);
      const r = Math.floor((MEIA - y) / CASA);
      return c < 0 || c > 2 || r < 0 || r > 2 ? -1 : r * 3 + c;
    },
    caixa: [-MEIA, -MEIA, MEIA, MEIA],
  };

  const modo = {
    id: 'peteleco',
    titulo: 'Peteleco da Velha',
    submodos: SUBMODOS,
    regra: sub,
    mundo: m,
    janela: [-MEIA - 1.2, -MEIA - TRILHO - 2.2, MEIA + 1.2, MEIA + TRILHO + 2.2],
    campoJanela: [-MEIA - TRILHO - 3, -MEIA - TRILHO - 3, MEIA + TRILHO + 3, MEIA + TRILHO + 3],
    eventos,
    tabuleiro,
    mesa: { CASA, MEIA, TRILHO, trilhoY, mu },
    multi: () => sub === 'caos',
    /** @param {number} dt */
    passo(dt) {
      m.avancar(4);
      m.medir(dt);
      fisicaDaMesa(dt);
      cuidar(m, eventos, dt);
      S.t += dt;
      if (S.estado === 'vez') {
        if (sub === 'caos') {
          S.jaT -= dt;
          if (S.jaT <= 0 && !S.caosLancados[2] && !dois) { /* sem CPU no caos */ }
          if (S.jaT <= -4) {
            // quem nao lancou na janela perde a vez desta rodada
            for (const j of [1, 2]) if (!S.caosLancados[j]) { S.caosLancados[j] = true; S.lances[j]++; }
            aposLance();
          }
        } else if (cpu(S.vez)) {
          S.pensar -= dt;
          if (S.pensar <= 0) { jogarBot(S.vez); aposLance(); }
        }
      } else if (S.estado === 'rolando') {
        let vmax = 0;
        for (const s of m.slimes) if (s.ativo) vmax = Math.max(vmax, Math.sqrt(s.vx * s.vx + s.vy * s.vy));
        S.quieto = vmax < 0.25 ? S.quieto + dt : 0;
        if ((S.quieto > 0.3 && S.t > 0.4) || S.t > 7) conferir();
      } else if (S.estado === 'fim') {
        S.tFim += dt;
        if (S.tFim > 2.8) novaPartida();
      }
    },
    /**
     * @param {number} x @param {number} y @param {'baixo'|'mover'|'cima'} fase @param {number} [quem] ponteiro
     */
    apontar(x, y, fase, quem) {
      S.hover = tabuleiro.celulaEm(x, y);
      if (S.estado !== 'vez') return;
      let j = S.vez;
      if (sub === 'caos') {
        if (S.jaT > 0) return;
        j = y < 0 ? 1 : 2;
        if (S.caosLancados[j]) return;
      } else if (cpu(j)) return;
      if (sub === 'classico') {
        if (fase !== 'baixo') return;
        const casa = S.hover;
        if (casa < 0) return;
        const { donos } = donosDaMesa(m);
        if (donos[casa]) { eventos.push({ tipo: 'som', nome: 'recusa' }); return; }
        porNaCasa(j, casa);
        aposLance();
        return;
      }
      const miras = S.miras || (S.miras = {});
      const chaveM = sub === 'caos' ? j : 0;
      if (fase === 'baixo') {
        // o ponto de partida no trilho (x do toque, limitado) e o puxao a partir dele
        const x0 = Math.max(-MEIA + 1, Math.min(MEIA - 1, x));
        miras[chaveM] = { j, x0, y0: trilhoY(j), px: x, py: y, quem };
        return;
      }
      const mi = miras[chaveM];
      if (!mi) return;
      if (fase === 'mover') { mi.px = x; mi.py = y; return; }
      // soltou: velocidade = do ponto puxado ate o trilho, vezes o ganho
      delete miras[chaveM];
      let vx = (mi.x0 - x) * 3.2;
      let vy = (mi.y0 - y) * 3.2;
      // so vale para dentro da mesa
      if ((j === 1 && vy < 2) || (j === 2 && vy > -2)) return;
      const v = Math.sqrt(vx * vx + vy * vy);
      if (v > VMAX_LANCE) { vx *= VMAX_LANCE / v; vy *= VMAX_LANCE / v; }
      // quantiza em 1/64 (o mesmo gesto da o mesmo lance: filmes e testes reproduziveis)
      vx = Math.round(vx * 64) / 64;
      vy = Math.round(vy * 64) / 64;
      lancar(j, mi.x0, vx, vy);
      if (sub === 'caos') S.caosLancados[j] = true;
      aposLance();
    },
    tecla() {},
    bot() {
      if (S.estado !== 'vez') return false;
      if (sub === 'caos') {
        if (S.jaT > 0) return false;
        for (const j of [1, 2]) if (!S.caosLancados[j]) { S.vez = j; jogarBot(j); S.caosLancados[j] = true; }
        aposLance();
        return true;
      }
      if (cpu(S.vez)) return false;
      jogarBot(S.vez);
      aposLance();
      return true;
    },
    hud() {
      return {
        titulo: 'Peteleco da Velha', regra: sub, vez: S.vez, cpu: { 1: cpu(1), 2: cpu(2) },
        estado: S.estado === 'rolando' ? 'encenando' : S.estado, placar: { ...placar }, partidas: S.partidas,
        resultado: S.resultado, minhaVez: S.estado === 'vez' && !cpu(S.vez),
        texto: sub === 'caos' && S.estado === 'vez' ? (S.jaT > 0 ? '' : 'ja') : '',
        lances: { ...S.lances },
      };
    },
    visual() {
      const miras = S.miras || {};
      return {
        semEstante: true,
        donos: S.donos,
        miras: Object.values(miras),
        corVez: S.vez,
        vento: S.vento,
        jaT: sub === 'caos' && S.estado === 'vez' ? S.jaT : null,
        lances: { ...S.lances },
        realce: sub === 'classico' && S.estado === 'vez' && !cpu(S.vez) ? S.hover : -1,
        linha: S.resultado && S.resultado.linha ? { casas: S.resultado.linha, jogador: S.resultado.vencedor } : null,
        estado: S.estado,
      };
    },
    reiniciar() {
      S.comeca = 2;
      placar[1] = 0;
      placar[2] = 0;
      placar[0] = 0;
      novaPartida();
    },
    poder() { return false; },
    salvar() { return null; },
    get estado() { return S.estado === 'rolando' ? 'encenando' : S.estado; },
  };
  return modo;
}
