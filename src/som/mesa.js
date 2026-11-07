// Mesa de som do Volei de Gosma: cada evento do jogo vira uma receita sintetizada (receitas do
// slime-merge e as do volei aqui) ou uma fala gravada (as falas *Slime da Kenney, CC0, do catalogo arquivos.js). Sem
// musica (escolha do usuario no slime-merge: "nenhuma"). Os arquivos carregam depois do
// primeiro gesto (audio.pronto()); enquanto nao chegam, a fala fica quieta.
//
// Falas: no maximo uma a cada INTERVALO_FALA s (a de prioridade maior passa na frente). As falas
// em balao (src/jogo/falas.js) usam o balbucio sintetizado de src/som/falas.js (balbuciar).

import { ARQUIVOS } from './arquivos.js';
import { tom, sopro } from './receitas.js';
import { falar as balbucio } from './falas.js';

export const INTERVALO_FALA = 1.2;
const VOL_ARQUIVO = 0.5;

/** Receitas do volei (v = { ctx, destino, ruido }, t0, p). Cada uma devolve a duracao. */
export const RECEITAS_VOLEI = Object.freeze({
  /** toque na gosma: plop + squish (forca 0..1,5) */
  toque(v, t, p = {}) {
    const f = Math.max(0.3, Math.min(1.5, p.forca || 0.6));
    tom(v, t, { f: 240 + 120 * f, f2: 120, glide: 0.09, vol: 0.18 * f, ataque: 0.003, queda: 0.11 });
    sopro(v, t, { f: 900, f2: 300, glide: 0.08, q: 1.4, vol: 0.12 * f, ataque: 0.002, queda: 0.08, filtro: 'bandpass' });
    tom(v, t + 0.012, { f: 520, f2: 760, glide: 0.05, vol: 0.06 * f, ataque: 0.002, queda: 0.06 });
    return 0.16;
  },
  /** bola no poste da rede: metal */
  rede(v, t, p = {}) {
    const k = Math.min(1, (p.forca || 0.5));
    for (const [f, a] of [[880, 1], [1320, 0.5], [2140, 0.25]]) tom(v, t, { f, vol: 0.07 * a * k, ataque: 0.001, queda: 0.35 });
    return 0.4;
  },
  /** bola na placa: batida oca */
  placa(v, t, p = {}) {
    const k = Math.min(1, (p.forca || 0.5));
    tom(v, t, { f: 170, f2: 110, glide: 0.08, vol: 0.2 * k, ataque: 0.002, queda: 0.12 });
    sopro(v, t, { f: 600, q: 0.8, vol: 0.08 * k, queda: 0.05 });
    return 0.15;
  },
  /** rede de protecao: "fump" macio */
  fundo(v, t) {
    sopro(v, t, { f: 380, f2: 160, glide: 0.12, q: 0.7, filtro: 'lowpass', vol: 0.16, ataque: 0.01, queda: 0.16 });
    return 0.18;
  },
  /** bola no chao (areia): baque abafado */
  chao(v, t, p = {}) {
    const k = Math.max(0.3, Math.min(1.2, p.forca || 0.7));
    tom(v, t, { f: 95, f2: 55, glide: 0.1, vol: 0.32 * k, ataque: 0.002, queda: 0.16 });
    sopro(v, t, { f: 1400, f2: 500, glide: 0.18, q: 0.6, filtro: 'lowpass', vol: 0.14 * k, ataque: 0.003, queda: 0.22 });
    return 0.25;
  },
  /** apito do juiz (dois toques, o segundo longo) */
  apito(v, t) {
    const vib = { f: 32, prof: 90 };
    tom(v, t, { f: 2650, vol: 0.075, ataque: 0.01, segurar: 0.06, queda: 0.03, vib, tipo: 'sine' });
    tom(v, t + 0.12, { f: 2650, vol: 0.085, ataque: 0.01, segurar: 0.28, queda: 0.08, vib, tipo: 'sine' });
    sopro(v, t + 0.12, { f: 2600, q: 6, vol: 0.03, ataque: 0.01, segurar: 0.28, queda: 0.08 });
    return 0.5;
  },
  /** torcida: rugido (ruido de banda larga que sobe e cai) */
  rugido(v, t, p = {}) {
    const k = p.forca || 1;
    sopro(v, t, { f: 900, f2: 1500, glide: 0.4, q: 0.35, vol: 0.12 * k, ataque: 0.12, segurar: 0.5 * k, queda: 0.9 });
    sopro(v, t + 0.05, { f: 2400, q: 0.6, vol: 0.05 * k, ataque: 0.2, segurar: 0.4, queda: 0.7 });
    return 1.6;
  },
  /** "ohh" da plateia (a CPU marcou) */
  ohh(v, t) {
    sopro(v, t, { f: 520, f2: 330, glide: 0.6, q: 1.6, vol: 0.09, ataque: 0.08, segurar: 0.25, queda: 0.4 });
    tom(v, t, { f: 210, f2: 150, glide: 0.6, vol: 0.04, ataque: 0.08, segurar: 0.25, queda: 0.4, filtro: { f: 700 } });
    return 0.8;
  },
  /** fanfarra curta nossa (3 notas que sobem) */
  fanfarra(v, t) {
    const n = [523.25, 659.25, 783.99, 1046.5];
    n.forEach((f, i) => tom(v, t + i * 0.075, { f, tipo: 'triangle', vol: 0.09, ataque: 0.004, queda: i === 3 ? 0.42 : 0.11, filtro: { f: 4200 } }));
    return 0.7;
  },
  /** camera lenta: swell reverso e grave que cai */
  lentaEntra(v, t) {
    sopro(v, t, { f: 300, f2: 2600, glide: 0.1, q: 0.8, vol: 0.12, ataque: 0.09, queda: 0.06 });
    tom(v, t, { f: 180, f2: 60, glide: 0.25, vol: 0.16, ataque: 0.01, queda: 0.4 });
    return 0.45;
  },
  /** batida do coracao na mira (a cada 450 ms) */
  tum(v, t) {
    tom(v, t, { f: 70, f2: 45, glide: 0.08, vol: 0.18, ataque: 0.004, queda: 0.12 });
    return 0.15;
  },
  /** soltura da cortada: estalo + grave + swoosh */
  lentaSolta(v, t) {
    sopro(v, t, { f: 3200, q: 0.9, vol: 0.2, ataque: 0.001, queda: 0.05 });
    tom(v, t, { f: 70, f2: 40, glide: 0.2, vol: 0.34, ataque: 0.002, queda: 0.3 });
    sopro(v, t + 0.02, { f: 600, f2: 3200, glide: 0.25, q: 1.2, vol: 0.12, ataque: 0.04, queda: 0.22 });
    return 0.4;
  },
  /** pulo: blup curto */
  pulo(v, t) {
    tom(v, t, { f: 300, f2: 620, glide: 0.07, vol: 0.06, ataque: 0.003, queda: 0.07 });
    return 0.08;
  },
  /** manchete perfeita: toque macio + sininhos */
  perfeita(v, t) {
    tom(v, t, { f: 330, f2: 260, glide: 0.08, vol: 0.12, ataque: 0.003, queda: 0.12 });
    [1318.5, 1760, 2093].forEach((f, i) => tom(v, t + 0.04 + i * 0.05, { f, vol: 0.05, ataque: 0.002, queda: 0.3 }));
    return 0.5;
  },
  /** Gosmao inchando: bloop que sobe com squish de gelatina */
  inflar(v, t) {
    tom(v, t, { f: 140, f2: 420, glide: 0.22, vol: 0.2, ataque: 0.01, queda: 0.16 });
    tom(v, t + 0.05, { f: 280, f2: 760, glide: 0.18, vol: 0.08, ataque: 0.01, queda: 0.14, tipo: 'triangle' });
    sopro(v, t + 0.02, { f: 500, f2: 1400, glide: 0.2, q: 2.2, vol: 0.07, ataque: 0.02, queda: 0.16, filtro: 'bandpass' });
    tom(v, t + 0.3, { f: 520, f2: 380, glide: 0.08, vol: 0.06, ataque: 0.004, queda: 0.1 });
    return 0.45;
  },
  /** bolada no juiz: "bonk" de desenho animado (oco, que cai) com um boing curto */
  bonk(v, t, p = {}) {
    const k = Math.max(0.5, Math.min(1, p.forca || 0.7));
    tom(v, t, { f: 620, f2: 210, glide: 0.09, vol: 0.2 * k, ataque: 0.002, queda: 0.14, tipo: 'triangle' });
    sopro(v, t, { f: 1800, q: 1.2, vol: 0.08 * k, ataque: 0.001, queda: 0.04 });
    tom(v, t + 0.06, { f: 300, f2: 520, glide: 0.18, vol: 0.06 * k, ataque: 0.01, queda: 0.22, vib: { f: 14, prof: 40 } });
    return 0.35;
  },
  /** botao da UI */
  botao(v, t) {
    tom(v, t, { f: 620, f2: 880, glide: 0.04, vol: 0.06, ataque: 0.002, queda: 0.06 });
    return 0.08;
  },
});

/**
 * @param {ReturnType<typeof import('../core/audio.js').criarAudio>} audio
 * @param {{ base?: string|URL, buscar?: (url: string) => Promise<any> }} [o]
 */
export function criarMesa(audio, o = {}) {
  const base = String(o.base || new URL('./arquivos/', import.meta.url));
  const buscar = o.buscar || ((url) => fetch(url));
  /** @type {Map<string, any>} */
  const buffers = new Map();
  let tFala = -Infinity;
  let pronto = false;

  async function carregarUm(id) {
    const info = ARQUIVOS[id];
    const ctx = audio.ctx;
    if (!info || !ctx || buffers.has(id)) return;
    buffers.set(id, 'carregando');
    try {
      const r = await buscar(base.replace(/\/?$/, '/') + info.arquivo);
      if (!r || r.ok === false) throw new Error(id);
      const dados = await r.arrayBuffer();
      const buf = await new Promise((ok, falha) => {
        try {
          const p = ctx.decodeAudioData(dados, ok, falha);
          if (p && p.then) p.then(ok, falha);
        } catch (e) { falha(e); }
      });
      buffers.set(id, buf);
    } catch {
      buffers.set(id, 'falhou');
    }
  }

  audio.pronto().then((ok) => {
    pronto = !!ok;
    // P1 depois do primeiro gesto: as falas, em fila
    if (pronto) (async () => { for (const id of Object.keys(ARQUIVOS)) await carregarUm(id); })();
  });

  /** @param {string} nome @param {any} [p] @param {{ chave?: string, max?: number, destino?: 'sfx'|'voz', atraso?: number }} [op] */
  function tocar(nome, p = {}, op = {}) {
    const r = RECEITAS_VOLEI[nome];
    if (r) return audio.tocarReceita(r, p, { chave: op.chave || nome, max: op.max || 3, destino: op.destino, atraso: op.atraso });
    return audio.tocarReceita(nome, p, { chave: op.chave || nome, max: op.max || 3, destino: op.destino, atraso: op.atraso });
  }

  /**
   * Fala gravada (id de ARQUIVOS, ex.: 'vozVenceuSlime'). Respeita o intervalo, a nao ser que force.
   * @param {string} id @param {{ forcar?: boolean, atraso?: number }} [op]
   */
  function falar(id, op = {}) {
    const agora = audio.agora();
    if (!op.forcar && agora - tFala < INTERVALO_FALA) return 0;
    const buf = buffers.get(id);
    if (!buf || typeof buf === 'string') {
      if (pronto && !buffers.has(id)) carregarUm(id);
      return 0;
    }
    const d = audio.vozBuffer(buf, { inicio: ARQUIVOS[id].inicio || 0, destino: 'voz', vol: VOL_ARQUIVO, chave: 'fala', max: 1, atraso: op.atraso || 0 });
    if (d) tFala = agora + (op.atraso || 0);
    return d;
  }

  /**
   * Balbucio sintetizado de slime (src/som/falas.js, 0 KB) para as falas em balao. Divide a vaga
   * de voz com as gravacoes (chave 'fala', uma por vez); a gravacao recente tem prioridade.
   * @param {string} frase chave de FRASES @param {{ nivel?: number, f0?: number, vol?: number }} [p]
   */
  function balbuciar(frase, p = {}) {
    const agora = audio.agora();
    if (agora - tFala < INTERVALO_FALA * 0.5) return 0;
    const d = audio.tocarReceita((v, t, q) => balbucio(v, t, frase, q), { vol: 0.26, ...p }, { destino: 'voz', chave: 'fala', max: 1 });
    if (d) tFala = agora;
    return d;
  }

  return {
    tocar,
    falar,
    balbuciar,
    /** arquivos de UI (fichas, clique) */
    ui(id) {
      const buf = buffers.get(id);
      if (!buf || typeof buf === 'string') return tocar('botao');
      return audio.vozBuffer(buf, { inicio: ARQUIVOS[id].inicio || 0, destino: 'sfx', vol: 0.45, chave: 'ui', max: 2 });
    },
    get prontos() { return [...buffers.values()].filter((b) => b && typeof b !== 'string').length; },
  };
}
