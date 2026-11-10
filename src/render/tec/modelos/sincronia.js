// Desenho do Modelo 12, Sincronia: o 3x3 neon com o feixe do scanner por cima. A casa do feixe tem
// a moldura cheia na cor de quem joga e uma barra que anda (quanto falta para ele sair); a proxima
// acende aos poucos e a anterior apaga; duas linhas de mira cruzam o tabuleiro. Falha = a casa pisca
// riscada.

import { CORES, gradeNeon, neon, brilho, rgba, linha } from '../kit.js';
import { desenharMarcas, desenharFeixe } from './classico.js';

/** Moldura de uma casa. */
function moldura(ctx, C, cor, larg, alfa, f = 0.14) {
  ctx.beginPath();
  ctx.rect(C.x0 + f, C.y0 + f, C.x1 - C.x0 - 2 * f, C.y1 - C.y0 - 2 * f);
  neon(ctx, cor, larg, alfa);
}

export const desenhoSincronia = {
  /** @param {any} g */
  fundo(g) {
    gradeNeon(g.ctx, g.geo, g.tema.acento, 0.8 * g.vivo);
  },
  /** @param {any} g */
  topo(g) {
    const { ctx, geo, vis, t, palco } = g;
    const cel = geo.celulas;
    desenharMarcas(g, 0.3);
    const S = vis.scan;
    if (S && S.casa >= 0) {
      const cor = CORES[S.j];
      const C = cel[S.casa];
      const forca = S.ativo ? 1 : 0.25;
      // mira: duas linhas que atravessam o tabuleiro pelo centro da casa
      const [x0, y0, x1, y1] = geo.caixa;
      linha(ctx, x0 - 0.3, C.cy, x1 + 0.3, C.cy, cor, 0.03, 0.4 * forca);
      linha(ctx, C.cx, y0 - 0.3, C.cx, y1 + 0.3, cor, 0.03, 0.4 * forca);
      // anterior apagando, proxima acendendo
      if (S.ativo) {
        moldura(ctx, cel[S.anterior], cor, 0.05, 0.35 * (1 - S.frac));
        moldura(ctx, cel[S.proxima], cor, 0.05, 0.12 + 0.3 * S.frac * S.frac);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(cor, 0.16 * forca);
      ctx.fillRect(C.x0 + 0.14, C.y0 + 0.14, geo.vao - 0.28, geo.vao - 0.28);
      // a barra do tempo que resta na casa
      ctx.fillStyle = rgba(cor, 0.75 * forca);
      ctx.fillRect(C.x0 + 0.24, C.y0 + 0.22, (geo.vao - 0.48) * (1 - S.frac), 0.1);
      ctx.globalCompositeOperation = 'source-over';
      moldura(ctx, C, cor, 0.1, forca);
      brilho(ctx, C.cx, C.cy, geo.vao * 0.9, cor, 0.3 * forca);
    }
    const F = palco.falha;
    if (F && t >= 0) {
      const dt = palco.t - F.t0;
      if (dt < 0.6) {
        const C = cel[F.casa];
        const a = (1 - dt / 0.6) * (Math.sin(dt * 60) > 0 ? 1 : 0.4);
        moldura(ctx, C, '#ffffff', 0.09, a);
        linha(ctx, C.x0 + 0.3, C.y0 + 0.3, C.x1 - 0.3, C.y1 - 0.3, '#ffffff', 0.06, a);
        linha(ctx, C.x0 + 0.3, C.y1 - 0.3, C.x1 - 0.3, C.y0 + 0.3, '#ffffff', 0.06, a);
      }
    }
    desenharFeixe(g);
  },
};
