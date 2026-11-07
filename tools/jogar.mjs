// Joga os modelos em tempo real no Chrome headless (DevTools Protocol, tools/cdp.mjs): toque nas
// casas (pelo mouse de verdade, convertendo a casa do mundo para a tela com o __velha.cena), o
// arrasto do Peteleco, 2 jogadores, reinicio e o Esc; confere erros do console e mede o fps.
// Uso: node tools/jogar.mjs [modelo...] [--tam=390x844] [--render=2d]
import { abrirChrome, espera } from './cdp.mjs';
import { servir } from './servir.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './servir.mjs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), ''] : [a.slice(2, i), a.slice(i + 1)]; }));
const lista = args.filter((a) => !a.startsWith('--'));
const modelos = lista.length ? lista : ['1', '2', '3', '4', '5', '6'];
const tams = (opt.tam || '390x844,1031x580').split(',');
const extra = opt.render ? `&render=${opt.render}` : '';
const saida = join(RAIZ, '.tmp/jogar');
mkdirSync(saida, { recursive: true });

const porta = 4391;
const fechar = await servir(porta);
let falhas = 0;
for (const tam of tams) {
  const [w, h] = tam.split('x').map(Number);
  const c = await abrirChrome({ largura: w, altura: h, porta: 9391 });
  for (const m of modelos) {
    c.erros.length = 0;
    await c.ir(`http://127.0.0.1:${porta}/index.html?modelo=${m}&semente=3&semanuncio${extra}`, 2200);
    const tela = (casa) => c.avaliar(`(() => { const V = window.__velha; const C = V.J.modo.tabuleiro.celulas[${casa}]; return V.cena.paraTela(C.cx, C.cy); })()`);
    const estado = () => c.avaliar('(() => { const h = window.__velha.J.modo.hud(); return { vez: h.vez, estado: h.estado, minha: h.minhaVez, lances: window.__velha.J.modo.eventos.length }; })()');
    let lances = 0;
    for (let k = 0; k < 6; k++) {
      const e = await estado();
      if (!e.minha) { await espera(700); continue; }
      if (m === '2') {
        // peteleco: puxa do trilho de baixo para tras e solta (lanca para cima)
        const p = await c.avaliar('(() => { const V = window.__velha; const M = V.J.modo.mesa; return [V.cena.paraTela(0, M.trilhoY(1)), V.cena.paraTela(0.4, M.trilhoY(1) - 3.2)]; })()');
        await c.arrastar(p[0][0], p[0][1], p[1][0], p[1][1], 12, 300);
      } else {
        // a primeira casa livre que aceita o toque (o Engole escolhe o maior tamanho que cabe)
        const livres = await c.avaliar('(() => { const M = window.__velha.J.modo; return (M.api ? M.api.vez.jogadas : []).map((j) => j.casa !== undefined ? j.casa : j.para); })()');
        const casa = livres.length ? livres[(k * 5) % livres.length] : 4;
        const [x, y] = await tela(casa);
        await c.clicar(x, y);
      }
      lances++;
      await espera(2200);
    }
    const fps = await c.avaliar('Math.round(window.__velha.laco.medidas.fps)');
    const passoMs = await c.avaliar('window.__velha.laco.medidas.passoMs.toFixed(2)');
    // 2 jogadores e reinicio pelos botoes; Esc nao quebra
    await c.avaliar("document.getElementById('btnDois').click()");
    await espera(600);
    await c.avaliar("document.getElementById('btnReiniciar').click()");
    await espera(600);
    await c.tecla('Escape');
    const png = await c.print();
    writeFileSync(join(saida, `m${m}-${tam}.png`), png);
    const ok = !c.erros.length;
    if (!ok) falhas++;
    process.stdout.write(`${tam} modelo ${m}: ${lances} lances, ${fps} fps, fisica ${passoMs} ms, erros: ${c.erros.length ? c.erros.join(' | ').slice(0, 300) : 'nenhum'}\n`);
  }
  await c.fechar();
}
await fechar();
process.exitCode = falhas ? 1 : 0;
