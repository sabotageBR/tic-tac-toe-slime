// Sons da Serie Tech, todos sintetizados (osciladores e ruido filtrado das primitivas de
// receitas.js): bipes, zaps, varreduras e arpejos digitais. Mesmo contrato das outras receitas:
// (v, t0, p) => duracao em s, sem sorteio.

import { tom, sopro, hz } from './receitas.js';

const LP = (f, q = 0.7) => ({ f, q });

export const RECEITAS_TEC = Object.freeze({
  /** marca colocada (p.j: 1 mais agudo, 2 mais grave) */
  tecMarca(v, t, p = {}) {
    const f = p.j === 2 ? 520 : 780;
    sopro(v, t, { f: 3200, q: 2, vol: 0.12, ataque: 0.001, queda: 0.02 });
    tom(v, t, { f, f2: f * 1.5, glide: 0.05, tipo: 'square', vol: 0.07, ataque: 0.002, queda: 0.09, filtro: LP(2600) });
    return tom(v, t + 0.05, { f: f * 2, tipo: 'sine', vol: 0.06, ataque: 0.002, queda: 0.12 }) - t;
  },
  /** selecao (primeiro toque de um lance de dois toques) */
  tecSelecao(v, t) {
    return tom(v, t, { f: 1100, f2: 1500, glide: 0.04, tipo: 'triangle', vol: 0.08, ataque: 0.002, queda: 0.06 }) - t;
  },
  /** carga subindo (p.n = carga do nucleo) */
  tecCarga(v, t, p = {}) {
    const n = Math.max(1, Math.min(6, p.n || 1));
    const f = hz(60 + n * 4);
    tom(v, t, { f, f2: f * 1.26, glide: 0.09, tipo: 'sawtooth', vol: 0.07, ataque: 0.004, queda: 0.14, filtro: { f: 900, f2: 3200, glide: 0.1, q: 4 } });
    return tom(v, t + 0.02, { f: f * 2, tipo: 'sine', vol: 0.07, ataque: 0.003, queda: 0.16 }) - t;
  },
  /** descarga eletrica (p.n = onda da cascata: cada uma mais aguda) */
  tecDescarga(v, t, p = {}) {
    const n = Math.max(0, Math.min(8, p.n || 0));
    const k = Math.pow(2, n / 6);
    sopro(v, t, { f: 5200, f2: 1400, glide: 0.16, q: 0.8, filtro: 'highpass', vol: 0.2, ataque: 0.001, queda: 0.2 });
    tom(v, t, { f: 1500 * k, f2: 110, glide: 0.2, tipo: 'sawtooth', vol: 0.1, ataque: 0.001, queda: 0.22, filtro: LP(3800, 1.2) });
    return tom(v, t, { f: 90, f2: 50, glide: 0.2, tipo: 'sine', vol: 0.2, ataque: 0.002, queda: 0.24 }) - t;
  },
  /** lance recusado */
  tecRecusa(v, t) {
    tom(v, t, { f: 150, tipo: 'square', vol: 0.07, ataque: 0.002, queda: 0.07, filtro: LP(900) });
    return tom(v, t + 0.09, { f: 120, tipo: 'square', vol: 0.07, ataque: 0.002, queda: 0.1, filtro: LP(900) }) - t;
  },
  /** vitoria: arpejo que sobe */
  tecVenceu(v, t) {
    let fim = t;
    [72, 76, 79, 84, 88].forEach((m, i) => {
      fim = tom(v, t + i * 0.085, { f: hz(m), tipo: 'square', vol: 0.065, ataque: 0.003, segurar: 0.03, queda: i === 4 ? 0.5 : 0.12, filtro: LP(3000) });
      tom(v, t + i * 0.085, { f: hz(m + 12), tipo: 'sine', vol: 0.04, ataque: 0.003, queda: 0.2 });
    });
    return fim - t;
  },
  /** derrota: desce e desliga */
  tecPerdeu(v, t) {
    tom(v, t, { f: hz(64), tipo: 'sawtooth', vol: 0.06, ataque: 0.004, queda: 0.16, filtro: LP(1600) });
    tom(v, t + 0.15, { f: hz(60), tipo: 'sawtooth', vol: 0.06, ataque: 0.004, queda: 0.16, filtro: LP(1400) });
    return tom(v, t + 0.3, { f: hz(55), f2: hz(43), glide: 0.5, tipo: 'sawtooth', vol: 0.07, ataque: 0.004, queda: 0.55, filtro: { f: 1400, f2: 200, glide: 0.5, q: 1 } }) - t;
  },
  tecEmpate(v, t) {
    tom(v, t, { f: hz(67), tipo: 'triangle', vol: 0.08, ataque: 0.003, queda: 0.12 });
    return tom(v, t + 0.14, { f: hz(67), tipo: 'triangle', vol: 0.08, ataque: 0.003, queda: 0.2 }) - t;
  },
  /** o tabuleiro se desmaterializa */
  tecLimpa(v, t) {
    return sopro(v, t, { f: 4200, f2: 300, glide: 0.4, q: 1.4, vol: 0.1, ataque: 0.01, queda: 0.42 }) - t;
  },
  /** colapso quantico: cascata de notas que cai e assenta */
  tecColapso(v, t) {
    let fim = t;
    [91, 86, 83, 79, 74, 71].forEach((m, i) => {
      fim = tom(v, t + i * 0.045, { f: hz(m), tipo: 'sine', vol: 0.07, ataque: 0.002, queda: 0.16, vib: { f: 22, prof: 14 } });
    });
    sopro(v, t, { f: 6000, f2: 900, glide: 0.3, q: 3, vol: 0.09, ataque: 0.005, queda: 0.32 });
    return fim - t;
  },
  /** a estacao gira */
  tecGiro(v, t) {
    sopro(v, t, { curva: [[0, 300], [0.3, 1900], [0.6, 260]], q: 2.2, vol: 0.14, ataque: 0.04, segurar: 0.3, queda: 0.3 });
    return tom(v, t, { curva: [[0, 70], [0.3, 130], [0.6, 60]], tipo: 'sawtooth', vol: 0.08, ataque: 0.05, segurar: 0.3, queda: 0.3, filtro: LP(500) }) - t;
  },
  /** modulo que cai e encaixa */
  tecCair(v, t) {
    tom(v, t, { f: 900, f2: 240, glide: 0.14, tipo: 'triangle', vol: 0.08, ataque: 0.003, queda: 0.15 });
    sopro(v, t + 0.14, { f: 700, q: 1.2, vol: 0.2, ataque: 0.001, queda: 0.05 });
    return tom(v, t + 0.14, { f: 130, f2: 70, glide: 0.1, vol: 0.2, ataque: 0.001, queda: 0.12 }) - t;
  },
  /** pulso magnetico que empurra */
  tecEmpurra(v, t) {
    tom(v, t, { f: 180, f2: 60, glide: 0.16, vol: 0.22, ataque: 0.002, queda: 0.2 });
    return sopro(v, t, { f: 400, f2: 2600, glide: 0.18, q: 1.6, vol: 0.12, ataque: 0.005, queda: 0.2 }) - t;
  },
  /** peca ejetada do tabuleiro */
  tecEjeta(v, t) {
    return tom(v, t, { f: 500, f2: 2600, glide: 0.2, tipo: 'square', vol: 0.06, ataque: 0.002, queda: 0.22, filtro: LP(3600) }) - t;
  },
  /** o scanner anda uma casa */
  tecTique(v, t) {
    return tom(v, t, { f: 1900, tipo: 'square', vol: 0.02, ataque: 0.001, queda: 0.018 }) - t;
  },
  /** casa travada pelo scanner */
  tecTrava(v, t) {
    sopro(v, t, { f: 2400, q: 3, vol: 0.2, ataque: 0.001, queda: 0.03 });
    tom(v, t, { f: 660, tipo: 'square', vol: 0.07, ataque: 0.002, queda: 0.06, filtro: LP(2400) });
    return tom(v, t + 0.07, { f: 1320, tipo: 'square', vol: 0.07, ataque: 0.002, queda: 0.14, filtro: LP(3000) }) - t;
  },
  /** falha de sincronia (glitch) */
  tecFalha(v, t) {
    for (let i = 0; i < 4; i++) sopro(v, t + i * 0.05, { f: 900 + i * 700, q: 6, vol: 0.14, ataque: 0.001, queda: 0.035 });
    return tom(v, t, { f: 220, f2: 70, glide: 0.25, tipo: 'sawtooth', vol: 0.09, ataque: 0.002, queda: 0.28, filtro: LP(1200), trem: { f: 38, prof: 0.45 } }) - t;
  },
  /** botao do HUD */
  tecBotao(v, t) {
    return tom(v, t, { f: 700, f2: 1000, glide: 0.03, tipo: 'square', vol: 0.05, ataque: 0.002, queda: 0.05, filtro: LP(2600) }) - t;
  },
});
