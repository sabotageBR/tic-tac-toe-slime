// Parametros de teste na URL. So valem em file://, localhost, 127.0.0.1 e na rede local
// (192.168.x, 10.x: o celular pela Wi-Fi). Na Poki nada disso existe.
// Unico modulo que le a URL (vigiado por test/estilo.test.js).
//   ?modelo=1..6       qual prototipo abre (sem ele: o hub escolhe; o jogo abre o 6, Potes)
//   ?regra=engole      submodo do modelo (cada modelo tem a lista dele; sem ele: o modo novo)
//   ?dois              2 jogadores no mesmo aparelho (sem ele: contra a CPU)
//   ?nivel=0..4        forca da CPU
//   ?debug             painel de desempenho (ms de fisica e de render, particulas)
//   ?semente=123       semente fixa da partida (prints e GIFs reprodutiveis)
//   ?passos=600        roda N quadros de fisica antes do primeiro desenho (prints deterministicos)
//   ?auto=700          joga sozinho (o bot faz a jogada de quem tiver a vez, a cada N ms)
//   ?semanuncio        nao pede intervalo comercial
//   ?lang=pt           forca o idioma (en, pt, es)
//   ?semhud            esconde o HUD (thumb, GIF)
//   ?render=2d         forca o renderizador de reserva (Canvas 2D)
//   ?raio=0.5&limiar=0.8   nucleo e limiar do campo do slime (ajuste do render)
//   ?zoom=x0,y0,x1,y1  enquadra so esse retangulo do mundo (prints de detalhe)
//   ?filme=120&cada=4  grava 120 quadros (4 passos de fisica entre eles) em <pre id="filme">
//                      para tools/gif-modelos.mjs (deterministico, sem depender do rAF)
//   ?expr=choro        forca a expressao de todos os rostos (prints)
//   ?qualidade=0..3    fixa a qualidade do render (alta, media, baixa, minima) e desliga a adaptativa
//   ?primeira          perfil novo (a 1a partida da vida, com a CPU que deixa ganhar)
//
// Fora disso, a pagina jogo-N.html do Artifact define window.__velhaModelo (sem ganchos de URL).

export function lerDepuracao() {
  const base = {
    local: false, ganchos: false, modelo: '', regra: '', dois: false, nivel: -1, debug: false, semente: 0,
    passos: 0, auto: 0, semAnuncio: false, lang: '', semHud: false, render: '', raio: 0, limiar: 0,
    zoom: /** @type {number[]|null} */ (null), filme: 0, cada: 4, expr: '', qualidade: -1, primeira: false,
  };
  let local = false;
  try {
    local = location.protocol === 'file:'
      || /^(127\.0\.0\.1|localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname);
  } catch {
    local = false;
  }
  if (!local) return base;
  const q = new URLSearchParams(location.search || location.hash.slice(1));
  const num = (k, d) => (q.has(k) ? Number(q.get(k)) || d : 0);
  return Object.assign(base, {
    local: true,
    ganchos: true,
    modelo: q.get('modelo') || '',
    regra: q.get('regra') || '',
    dois: q.has('dois'),
    nivel: q.has('nivel') ? Math.max(0, Math.min(4, Number(q.get('nivel')) | 0)) : -1,
    debug: q.has('debug'),
    semente: num('semente', 1) >>> 0,
    passos: Math.max(0, num('passos', 0) | 0),
    auto: q.has('auto') ? Math.max(120, num('auto', 700)) : 0,
    semAnuncio: q.has('semanuncio'),
    lang: q.get('lang') || '',
    semHud: q.has('semhud'),
    render: q.get('render') || '',
    raio: Number(q.get('raio')) || 0,
    limiar: Number(q.get('limiar')) || 0,
    zoom: q.has('zoom') ? (q.get('zoom') || '').split(',').map(Number) : null,
    filme: Math.max(0, num('filme', 0) | 0),
    cada: Math.max(1, num('cada', 4) | 0),
    expr: q.get('expr') || '',
    qualidade: q.has('qualidade') ? Math.max(0, Math.min(3, Number(q.get('qualidade')) | 0)) : -1,
    primeira: q.has('primeira'),
  });
}
