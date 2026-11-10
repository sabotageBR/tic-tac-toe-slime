// Projecao do Holo Cubo: do espaco do cubo (x para a direita, y para cima, z para o fundo) para o
// plano do mundo, com giro em torno do eixo vertical (yaw), inclinacao fixa (pitch) e uma
// perspectiva leve. Usada pelo modo (o toque escolhe a coluna) e pelo desenho. Logica pura.

export const PITCH = 0.5;
/** distancia da camera (u): quanto maior, mais ortografica */
export const DIST = 22;

/**
 * @param {number} x @param {number} y @param {number} z @param {number} yaw
 * @returns {number[]} [x do mundo, y do mundo, profundidade (maior = mais longe), escala]
 */
export function projetar(x, y, z, yaw) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const xr = x * cy + z * sy;
  const zr = -x * sy + z * cy;
  const cp = Math.cos(PITCH);
  const sp = Math.sin(PITCH);
  const yr = y * cp + zr * sp;
  const prof = zr * cp - y * sp;
  const f = DIST / (DIST + prof);
  return [xr * f, yr * f, prof, f];
}

/**
 * Distancia de um ponto ao segmento (a, b).
 * @param {number} px @param {number} py @param {number} ax @param {number} ay @param {number} bx @param {number} by
 */
export function distSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const d2 = dx * dx + dy * dy;
  const u = d2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / d2)) : 0;
  const qx = ax + dx * u - px;
  const qy = ay + dy * u - py;
  return Math.sqrt(qx * qx + qy * qy);
}
