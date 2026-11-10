// Fundos da Serie Tech: uma base comum (escuro, vinheta, linhas de varredura) e um padrao por tema
// (grade em perspectiva, circuito, estrelas, malha hexagonal, ondas, radar). A parte parada fica num
// canvas em cache (refeito so quando a tela ou o tema mudam); por quadro so entram as luzes que andam.
// Tudo em px CSS (o chamador ja aplicou o dpr).

import { ruido, rgba } from './kit.js';

/** @typedef {{ c0: string, c1: string, acento: string, tipo: 'grade'|'circuito'|'estrelas'|'hex'|'ondas'|'radar' }} Tema */

/** @type {Record<string, Tema>} */
export const TEMAS = {
  classico: { c0: '#04060f', c1: '#0b1a3a', acento: '#3f86ff', tipo: 'grade' },
  quantica: { c0: '#070414', c1: '#1d0d44', acento: '#9d6bff', tipo: 'ondas' },
  cubo: { c0: '#02090f', c1: '#06303c', acento: '#35f0c8', tipo: 'grade' },
  sobrecarga: { c0: '#070608', c1: '#241405', acento: '#ffab2e', tipo: 'circuito' },
  orbita: { c0: '#010207', c1: '#0a1233', acento: '#6aa8ff', tipo: 'estrelas' },
  repulsor: { c0: '#030b0a', c1: '#072a22', acento: '#3dff9e', tipo: 'hex' },
  sincronia: { c0: '#0a0406', c1: '#2e0a14', acento: '#ff4d5e', tipo: 'radar' },
};

/** @param {string} id @param {string} regra */
export function temaDe(id, regra) {
  return regra === 'classico' ? { ...TEMAS.classico, acento: (TEMAS[id] || TEMAS.classico).acento } : TEMAS[id] || TEMAS.classico;
}

export function criarFundo() {
  /** @type {HTMLCanvasElement|null} */
  let cache = null;
  let chave = '';
  /** @type {Array<{ pts: number[][], comp: number }>} trilhas do circuito (para os pulsos) */
  let trilhas = [];
  /** @type {Array<{ x: number, y: number, r: number, f: number }>} */
  let estrelas = [];

  /**
   * @param {Tema} tema @param {number} W @param {number} H @param {number} dpr @param {number} cx @param {number} cy centro do tabuleiro (px)
   */
  function montar(tema, W, H, dpr, cx, cy) {
    const c = cache || document.createElement('canvas');
    cache = c;
    c.width = Math.max(1, Math.round(W * dpr));
    c.height = Math.max(1, Math.round(H * dpr));
    const x = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = Math.max(W, H) * 0.75;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, tema.c1);
    g.addColorStop(1, tema.c0);
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    trilhas = [];
    estrelas = [];
    const a = tema.acento;
    if (tema.tipo === 'grade') {
      // chao em perspectiva na metade de baixo e teto espelhado bem fraco
      const hz = cy;
      x.lineWidth = 1;
      for (const lado of [1, -1]) {
        for (let k = 1; k <= 12; k++) {
          const y = hz + lado * (H * 0.55) * Math.pow(k / 12, 2.2);
          x.strokeStyle = rgba(a, (lado > 0 ? 0.2 : 0.09) * (k / 12));
          x.beginPath();
          x.moveTo(0, y);
          x.lineTo(W, y);
          x.stroke();
        }
        for (let k = -14; k <= 14; k++) {
          x.strokeStyle = rgba(a, lado > 0 ? 0.11 : 0.05);
          x.beginPath();
          x.moveTo(cx + k * 12, hz + lado * 4);
          x.lineTo(cx + k * W * 0.16, hz + lado * H * 0.6);
          x.stroke();
        }
      }
    } else if (tema.tipo === 'circuito') {
      const passo = Math.max(26, Math.min(W, H) / 16);
      x.lineWidth = 1.4;
      for (let k = 0; k < 46; k++) {
        let px = Math.round((ruido(k * 3.1) * W) / passo) * passo;
        let py = Math.round((ruido(k * 5.7 + 2) * H) / passo) * passo;
        const pts = [[px, py]];
        let dir = Math.floor(ruido(k * 9.3) * 4);
        const n = 2 + Math.floor(ruido(k * 1.7) * 4);
        for (let s = 0; s < n; s++) {
          const len = passo * (1 + Math.floor(ruido(k * 13 + s * 7) * 4));
          px += [len, 0, -len, 0][dir];
          py += [0, len, 0, -len][dir];
          pts.push([px, py]);
          dir = (dir + (ruido(k * 17 + s * 3) < 0.5 ? 1 : 3)) % 4;
        }
        x.strokeStyle = rgba(a, 0.13);
        x.beginPath();
        pts.forEach(([qx, qy], i) => (i ? x.lineTo(qx, qy) : x.moveTo(qx, qy)));
        x.stroke();
        x.fillStyle = rgba(a, 0.22);
        for (const [qx, qy] of [pts[0], pts[pts.length - 1]]) {
          x.beginPath();
          x.arc(qx, qy, 2.6, 0, Math.PI * 2);
          x.fill();
        }
        let comp = 0;
        for (let i = 1; i < pts.length; i++) comp += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
        trilhas.push({ pts, comp });
      }
    } else if (tema.tipo === 'estrelas') {
      for (let k = 0; k < 150; k++) {
        const e = { x: ruido(k * 2.3) * W, y: ruido(k * 4.1 + 9) * H, r: 0.4 + ruido(k * 7.7) * 1.3, f: ruido(k * 11.1) };
        estrelas.push(e);
        x.fillStyle = rgba('#cfe0ff', 0.25 + e.f * 0.35);
        x.beginPath();
        x.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        x.fill();
      }
      // planeta no canto de baixo, com a atmosfera
      const pr = Math.max(W, H) * 0.62;
      const px = W * 0.82;
      const py = H + pr * 0.78;
      const gp = x.createRadialGradient(px, py, pr * 0.94, px, py, pr * 1.08);
      gp.addColorStop(0, rgba('#0a1a3a', 1));
      gp.addColorStop(0.5, rgba(a, 0.5));
      gp.addColorStop(1, rgba(a, 0));
      x.fillStyle = gp;
      x.beginPath();
      x.arc(px, py, pr * 1.08, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#050c1c';
      x.beginPath();
      x.arc(px, py, pr * 0.985, 0, Math.PI * 2);
      x.fill();
    } else if (tema.tipo === 'hex') {
      const r = Math.max(18, Math.min(W, H) / 20);
      const dx = r * Math.sqrt(3);
      x.strokeStyle = rgba(a, 0.1);
      x.lineWidth = 1;
      for (let j = -1; j * r * 1.5 < H + r; j++) {
        for (let i = -1; i * dx < W + dx; i++) {
          const hx = i * dx + (j % 2 ? dx / 2 : 0);
          const hy = j * r * 1.5;
          x.beginPath();
          for (let k = 0; k < 6; k++) {
            const an = Math.PI / 6 + (k * Math.PI) / 3;
            const qx = hx + Math.cos(an) * r;
            const qy = hy + Math.sin(an) * r;
            if (k) x.lineTo(qx, qy);
            else x.moveTo(qx, qy);
          }
          x.closePath();
          x.stroke();
        }
      }
    } else if (tema.tipo === 'ondas' || tema.tipo === 'radar') {
      x.lineWidth = 1;
      const passo = Math.max(30, Math.min(W, H) / 9);
      for (let k = 1; k * passo < R; k++) {
        x.strokeStyle = rgba(a, tema.tipo === 'radar' ? 0.14 : 0.07);
        x.beginPath();
        x.arc(cx, cy, k * passo, 0, Math.PI * 2);
        x.stroke();
      }
      if (tema.tipo === 'radar') {
        x.strokeStyle = rgba(a, 0.1);
        x.beginPath();
        x.moveTo(cx - R, cy); x.lineTo(cx + R, cy);
        x.moveTo(cx, cy - R); x.lineTo(cx, cy + R);
        x.stroke();
      }
    }
    // vinheta
    const v = x.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, R * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.62)');
    x.fillStyle = v;
    x.fillRect(0, 0, W, H);
    // linhas de varredura
    x.fillStyle = 'rgba(0,0,0,0.16)';
    for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  }

  return {
    /**
     * @param {CanvasRenderingContext2D} ctx @param {Tema} tema @param {number} W @param {number} H @param {number} dpr
     * @param {number} cx @param {number} cy @param {number} t
     */
    desenhar(ctx, tema, W, H, dpr, cx, cy, t) {
      const k = [tema.tipo, tema.acento, tema.c1, W, H, dpr, Math.round(cx), Math.round(cy)].join('|');
      if (k !== chave || !cache) { chave = k; montar(tema, W, H, dpr, cx, cy); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.drawImage(/** @type {HTMLCanvasElement} */ (cache), 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      const a = tema.acento;
      if (tema.tipo === 'circuito') {
        // pulsos de luz correndo pelas trilhas
        for (let i = 0; i < trilhas.length; i += 3) {
          const tr = trilhas[i];
          let d = ((t * 90 + i * 53) % (tr.comp + 260)) - 60;
          if (d < 0 || d > tr.comp) continue;
          for (let s = 1; s < tr.pts.length; s++) {
            const [ax, ay] = tr.pts[s - 1];
            const [bx, by] = tr.pts[s];
            const len = Math.abs(bx - ax) + Math.abs(by - ay);
            if (d <= len) {
              const u = d / len;
              ctx.fillStyle = rgba(a, 0.85);
              ctx.beginPath();
              ctx.arc(ax + (bx - ax) * u, ay + (by - ay) * u, 2.2, 0, Math.PI * 2);
              ctx.fill();
              break;
            }
            d -= len;
          }
        }
      } else if (tema.tipo === 'estrelas') {
        for (let i = 0; i < estrelas.length; i += 4) {
          const e = estrelas[i];
          const p = 0.5 + 0.5 * Math.sin(t * (1 + e.f * 3) + i);
          ctx.fillStyle = rgba('#ffffff', 0.5 * p);
          ctx.fillRect(e.x - e.r, e.y - 0.5, e.r * 2, 1);
          ctx.fillRect(e.x - 0.5, e.y - e.r, 1, e.r * 2);
        }
      } else if (tema.tipo === 'ondas') {
        const passo = Math.max(30, Math.min(W, H) / 9);
        const R = Math.max(W, H) * 0.75;
        for (let k2 = 0; k2 < 3; k2++) {
          const r = ((t * 36 + k2 * (R / 3)) % R);
          ctx.strokeStyle = rgba(a, 0.22 * (1 - r / R));
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r + passo * 0.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (tema.tipo === 'radar') {
        const R = Math.max(W, H) * 0.75;
        const an = t * 0.9;
        for (let k2 = 0; k2 < 14; k2++) {
          ctx.strokeStyle = rgba(a, 0.2 * (1 - k2 / 14));
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(an - k2 * 0.03) * R, cy + Math.sin(an - k2 * 0.03) * R);
          ctx.stroke();
        }
      } else if (tema.tipo === 'hex') {
        // uma faixa de luz varre a malha
        const y = ((t * 60) % (H + 240)) - 120;
        const g = ctx.createLinearGradient(0, y - 90, 0, y + 90);
        g.addColorStop(0, rgba(a, 0));
        g.addColorStop(0.5, rgba(a, 0.07));
        g.addColorStop(1, rgba(a, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, y - 90, W, 180);
      } else {
        // grade: o horizonte respira
        const p = 0.5 + 0.5 * Math.sin(t * 1.3);
        const g = ctx.createLinearGradient(0, cy - 60, 0, cy + 60);
        g.addColorStop(0, rgba(a, 0));
        g.addColorStop(0.5, rgba(a, 0.05 + 0.04 * p));
        g.addColorStop(1, rgba(a, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, cy - 60, W, 120);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}
