// Monta o hub de avaliacao no formato do Artifact do claude.ai em .tmp/artifact/ (porte do
// slime-merge):
//   index.html        o hub (modelos/index.html sem doctype/html/head/body: o publicador poe o
//                     esqueleto) com window.__velhaHub = true (links para jogo-N.html e midia/);
//   jogo-N.html       o jogo com window.__velhaModelo = 'N' (e __velhaRegra) e SEM a tag do SDK da
//                     Poki (no claude.ai nao ha Poki; o wrapper segue sem anuncios);
//   src/**, midia/*.mp4|jpg e as fontes.
// Imprime o mapa de arquivos (JSON) para o campo `files` do publish.
// Uso: node tools/artifact-modelos.mjs
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { RAIZ } from './servir.mjs';

const pasta = join(RAIZ, '.tmp/artifact');
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });
/** paginas de jogo: [nome, modelo, regra] */
const JOGOS = [['1', '1', ''], ['2', '2', ''], ['3', '3', ''], ['4', '4', ''], ['5', '5', ''], ['6', '6', ''], ['6-transborda', '6', 'transborda']];
const VIDEOS = ['1', '2', '3', '4', '5', '6', '6t'];

let h = readFileSync(join(RAIZ, 'modelos/index.html'), 'utf8');
h = h.replace(/<!doctype html>\s*/i, '')
  .replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*/i, '')
  .replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '')
  .replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/url\('\.\.\/src\/ui\/fontes\/([^']+)'\)/g, "url('$1')")
  .replace('<script>', '<script>window.__velhaHub = true;\n');
writeFileSync(join(pasta, 'index.html'), h);

const jogo = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const semSdk = jogo.replace(/<!-- Unico script externo permitido pela Poki. -->\s*<script src="https:\/\/game-cdn\.poki\.com\/scripts\/v2\/poki-sdk\.js"><\/script>\s*/, '');
if (semSdk === jogo) throw new Error('nao achei a tag do SDK no index.html');
for (const [nome, m, regra] of JOGOS) {
  writeFileSync(join(pasta, `jogo-${nome}.html`), semSdk.replace('<script type="module" src="src/main.js"></script>',
    `<script>window.__velhaModelo = '${m}';${regra ? ` window.__velhaRegra = '${regra}';` : ''}</script>\n<script type="module" src="src/main.js"></script>`));
}
cpSync(join(RAIZ, 'src'), join(pasta, 'src'), { recursive: true });
mkdirSync(join(pasta, 'midia'), { recursive: true });
for (const v of VIDEOS) {
  for (const ext of ['mp4', 'jpg']) {
    const p = join(RAIZ, `docs/modelos/${v}.${ext}`);
    if (!existsSync(p)) throw new Error(`sem docs/modelos/${v}.${ext} (rode npm run gifs -- ${v})`);
    cpSync(p, join(pasta, `midia/${v}.${ext}`));
  }
}
for (const f of ['fredoka-latin-700-normal.woff2', 'fredoka-latin-600-normal.woff2']) cpSync(join(RAIZ, 'src/ui/fontes', f), join(pasta, f));

/** @param {string} d @returns {string[]} */
const listar = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? listar(p) : [p];
});
const mapa = {};
let total = 0;
for (const p of listar(pasta)) {
  const r = relative(pasta, p);
  total += statSync(p).size;
  if (r !== 'index.html') mapa[r] = relative(RAIZ, p);
}
process.stdout.write(JSON.stringify(mapa) + '\n');
process.stderr.write(`${Object.keys(mapa).length + 1} arquivos, ${(total / 1024 / 1024).toFixed(2)} MB em ${relative(RAIZ, pasta)}\n`);
