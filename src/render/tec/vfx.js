// Efeitos da Serie Tech por cima do tabuleiro: faiscas, clarao, onda de choque, arco eletrico,
// pixels que se desfazem, texto e glitch de tela. Coordenadas do mundo; o tempo vem de fora e o
// sorteio e um LCG proprio (o filme sai igual a cada vez).
// Mesma interface do vfx do slime no que o main.js usa (respingo, explosao, brilho, texto).

import { aplicar } from '../camera.js';
import { brilho, neon, texto as desenharTexto, rgba } from './kit.js';

/**
 * @typedef {{ tipo: 'faisca'|'clarao'|'onda'|'pixel', x: number, y: number, vx: number, vy: number, vida: number, total: number, r: number, cor: string }} Part
 * @typedef {{ x0: number, y0: number, x1: number, y1: number, cor: string, vida: number, total: number, semente: number }} Arco
 * @typedef {{ x: number, y: number, texto: string, cor: string, vida: number, total: number, escala: number }} Texto
 */

export function criarVfxTec() {
  /** @type {Part[]} */
  let parts = [];
  /** @type {Arco[]} */
  let arcos = [];
  /** @type {Texto[]} */
  let textos = [];
  let glitch = 0;
  let tremor = 0;
  let semente = 7;
  const rnd = () => {
    semente = (semente * 16807) % 2147483647;
    return semente / 2147483647;
  };

  const api = {
    /** Faiscas que voam e apagam. */
    faisca(x, y, cor, qtd = 8, forca = 5) {
      for (let k = 0; k < qtd; k++) {
        const a = rnd() * Math.PI * 2;
        const v = forca * (0.35 + rnd() * 0.9);
        const vida = 0.25 + rnd() * 0.35;
        parts.push({ tipo: 'faisca', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida, total: vida, r: 0.05 + rnd() * 0.05, cor });
      }
    },
    /** Clarao curto. */
    brilho(x, y, cor = '#ffffff', r = 1.6) {
      parts.push({ tipo: 'clarao', x, y, vx: 0, vy: 0, vida: 0.22, total: 0.22, r, cor });
    },
    /** Anel de choque que cresce ate r. */
    onda(x, y, cor, r = 2.4, dur = 0.42) {
      parts.push({ tipo: 'onda', x, y, vx: 0, vy: 0, vida: dur, total: dur, r, cor });
    },
    /** Raio entre dois pontos. */
    arco(x0, y0, x1, y1, cor, dur = 0.3) {
      arcos.push({ x0, y0, x1, y1, cor, vida: dur, total: dur, semente: 1 + Math.floor(rnd() * 1e6) });
      api.faisca(x1, y1, cor, 5, 4);
    },
    /** A peca se desfaz em pixels. */
    pixels(x, y, cor, qtd = 14, r = 0.8) {
      for (let k = 0; k < qtd; k++) {
        const vida = 0.35 + rnd() * 0.45;
        parts.push({ tipo: 'pixel', x: x + (rnd() - 0.5) * r * 2, y: y + (rnd() - 0.5) * r * 2, vx: (rnd() - 0.5) * 1.5, vy: 1 + rnd() * 3, vida, total: vida, r: 0.07 + rnd() * 0.09, cor });
      }
    },
    /** Alias do vfx do slime (o main.js chama os dois iguais). */
    respingo(x, y, cor, qtd = 10, forca = 6) { api.faisca(x, y, cor, qtd, forca); },
    explosao(x, y, cor, r = 1.2) {
      api.brilho(x, y, '#ffffff', r * 2.2);
      api.onda(x, y, cor, r * 2.6);
      api.faisca(x, y, cor, 22, 9);
    },
    texto(x, y, texto, cor = '#ffffff', escala = 1) {
      textos.push({ x, y, texto, cor, vida: 1.2, total: 1.2, escala });
    },
    /** Glitch de tela por `dur` s (faixas deslocadas). */
    glitch(dur = 0.25) { glitch = Math.max(glitch, dur); },
    /** Tremor curto da camera (0..1). */
    tremer(forca = 0.5) { tremor = Math.max(tremor, forca); },
    get glitchT() { return glitch; },
    /** deslocamento da camera em px CSS */
    get tremor() {
      if (tremor <= 0.01) return [0, 0];
      return [(rnd() - 0.5) * 9 * tremor, (rnd() - 0.5) * 9 * tremor];
    },
    /** @param {number} dt */
    passo(dt) {
      for (const p of parts) {
        p.vida -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.tipo === 'faisca') { p.vx *= 1 - 3.5 * dt; p.vy *= 1 - 3.5 * dt; }
      }
      parts = parts.filter((p) => p.vida > 0);
      for (const a of arcos) a.vida -= dt;
      arcos = arcos.filter((a) => a.vida > 0);
      for (const t of textos) { t.vida -= dt; t.y += dt * 1.1; }
      textos = textos.filter((t) => t.vida > 0);
      glitch = Math.max(0, glitch - dt);
      tremor = Math.max(0, tremor - dt * 2.4);
      if (parts.length > 600) parts.splice(0, parts.length - 600);
    },
    /**
     * @param {CanvasRenderingContext2D} ctx @param {import('../camera.js').Camera} cam @param {number} dpr @param {number} t
     */
    desenhar(ctx, cam, dpr, t) {
      aplicar(ctx, cam, dpr);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        const k = Math.max(0, p.vida / p.total);
        if (p.tipo === 'faisca') {
          ctx.strokeStyle = p.cor;
          ctx.globalAlpha = k;
          ctx.lineWidth = p.r;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
          ctx.stroke();
        } else if (p.tipo === 'clarao') {
          brilho(ctx, p.x, p.y, p.r * (1.2 - k * 0.4), p.cor, k);
        } else if (p.tipo === 'onda') {
          const r = p.r * (1 - k * k);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          neon(ctx, p.cor, 0.05 + 0.1 * k, k);
        } else {
          ctx.globalAlpha = k;
          ctx.fillStyle = p.cor;
          ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
        }
      }
      ctx.globalAlpha = 1;
      // raios: o ziguezague muda a cada 1/30 s
      for (const a of arcos) {
        const k = a.vida / a.total;
        let s = (a.semente + Math.floor(t * 30) * 7919) % 2147483647;
        const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
        const dx = a.x1 - a.x0;
        const dy = a.y1 - a.y0;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / d;
        const ny = dx / d;
        const N = 7;
        ctx.beginPath();
        ctx.moveTo(a.x0, a.y0);
        for (let i = 1; i < N; i++) {
          const u = i / N;
          const desvio = r() * d * 0.22 * Math.sin(u * Math.PI);
          ctx.lineTo(a.x0 + dx * u + nx * desvio, a.y0 + dy * u + ny * desvio);
        }
        ctx.lineTo(a.x1, a.y1);
        neon(ctx, a.cor, 0.09, k);
        brilho(ctx, a.x1, a.y1, 0.9, a.cor, k * 0.8);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const tx of textos) {
        const k = Math.min(1, tx.vida / 0.3);
        const e = Math.min(1, (tx.total - tx.vida) / 0.12);
        desenharTexto(ctx, cam, dpr, tx.x, tx.y, tx.texto, 0.62 * tx.escala * (0.6 + 0.4 * e), tx.cor, { alfa: k });
      }
    },
    /**
     * Faixas de glitch em px da tela (por cima de tudo).
     * @param {CanvasRenderingContext2D} ctx @param {number} W @param {number} H @param {number} dpr @param {number} t
     */
    desenharGlitch(ctx, W, H, dpr, t) {
      if (glitch <= 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      let s = (Math.floor(t * 40) * 48271 + 11) % 2147483647;
      const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const a = Math.min(1, glitch / 0.15);
      for (let k = 0; k < 7; k++) {
        const y = r() * H;
        const h = 2 + r() * 16;
        ctx.fillStyle = rgba(k % 2 ? '#2fe6ff' : '#ff45dc', (0.1 + r() * 0.22) * a);
        ctx.fillRect(r() * W * 0.4, y, W * (0.3 + r() * 0.7), h);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    get vazio() { return !parts.length && !arcos.length && !textos.length && glitch <= 0; },
  };
  return api;
}
