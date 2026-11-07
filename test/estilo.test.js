// Fronteiras do codigo que a Poki e o projeto cobram (ver CLAUDE.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
/** @param {string} dir @returns {string[]} */
const arquivos = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? arquivos(p) : [p];
});
const src = arquivos(join(raiz, 'src')).filter((p) => /\.(js|css)$/.test(p));
const ler = (p) => readFileSync(p, 'utf8');
const rel = (p) => relative(raiz, p);
/** @param {string} t */
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('sem console.log/info/debug no jogo', () => {
  for (const p of src) assert.ok(!/console\.(log|info|debug)\s*\(/.test(ler(p)), rel(p));
});

test('so src/main.js importa o SDK da Poki', () => {
  for (const p of src) {
    // o wrapper da CrazyGames e o dos portais reaproveitam o criarPoki (e so entram nas builds deles)
    if (['src/main.js', 'src/core/poki.js', 'src/core/crazygames.js', 'src/core/portal.js'].includes(rel(p))) continue;
    assert.ok(!/core\/poki\.js|\.\/poki\.js/.test(ler(p)), rel(p));
  }
});

test('so o armazenamento toca o localStorage', () => {
  for (const p of src) {
    // o GamePix.localStorage e o armazenamento do SDK da GamePix, nao o do navegador
    if (rel(p) === 'src/core/armazenamento.js' || rel(p) === 'src/core/portais/gamepix.js') continue;
    assert.ok(!/localStorage/.test(ler(p)), rel(p));
  }
});

test('so a depuracao le a URL', () => {
  for (const p of src) {
    if (rel(p) === 'src/core/depuracao.js') continue;
    assert.ok(!/location\.(search|hash)|URLSearchParams/.test(ler(p)), rel(p));
  }
});

test('logica pura (fisica, cor, jogo) nao usa Math.random, DOM nem relogio', () => {
  for (const p of src.filter((x) => /src\/(jogo|fisica|cor)\//.test(x))) {
    const t = semComentarios(ler(p));
    assert.ok(!/Math\.random|document\.|window\.|Date\.now|performance\.now|setTimeout/.test(t), rel(p));
  }
});

test('fisica so usa + - * / e sqrt (determinismo entre V8 e JSC)', () => {
  for (const p of src.filter((x) => /src\/fisica\//.test(x))) {
    const t = semComentarios(ler(p));
    assert.ok(!/Math\.(sin|cos|tan|exp|pow|log|atan|atan2|hypot|cbrt|expm1|log1p|sinh|cosh|tanh|asin|acos)\b|\*\*/.test(t), rel(p));
  }
});
test('src/ nao importa modelos/ nem tools/', () => {
  for (const p of src) assert.ok(!/from\s+['"][^'"]*(\.\.\/modelos|tools)\//.test(ler(p)), rel(p));
});

test('jogo/ e fisica/ so importam core/rng.js e cor/* de fora deles (o modo e puro)', () => {
  for (const p of src.filter((x) => /src\/(jogo|fisica)\//.test(x) && x.endsWith('.js'))) {
    const t = ler(p);
    for (const [, alvo] of t.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const abs = join(p, '..', alvo);
      const r = rel(abs);
      const ok = /^src\/(jogo|fisica|cor)\//.test(r) || r === 'src/core/rng.js';
      assert.ok(ok, `${rel(p)} importa ${r}`);
    }
  }
});

test('src/jogo/ em ASCII fora dos comentarios (texto com acento vai para o i18n)', () => {
  for (const p of src.filter((x) => /src\/jogo\//.test(x))) {
    const t = semComentarios(ler(p));
    assert.ok(!/[^\x00-\x7f]/.test(t), rel(p));
  }
});

test('pointermove nunca dispara gameplayStart', () => {
  const t = ler(join(raiz, 'src/main.js'));
  // o gameplayStart so sai no pointerdown (fase 'baixo') ou numa tecla
  for (const m of t.matchAll(/gameplayStart\(\)/g)) {
    const antes = t.slice(Math.max(0, (m.index || 0) - 160), m.index);
    assert.ok(/baixo/.test(antes), 'gameplayStart fora do baixo/tecla: ' + antes.slice(-80));
  }
});

test('unica URL externa e a do SDK da Poki', () => {
  const permitida = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
  for (const p of [...src, join(raiz, 'index.html')]) {
    const urls = ler(p).match(/https?:\/\/[^\s"'`)<>]+/g) || [];
    for (const u of urls) assert.equal(u, permitida, `${rel(p)}: ${u}`);
  }
  assert.ok(ler(join(raiz, 'index.html')).includes(permitida));
});

test('index.html pede viewport-fit=cover', () => {
  assert.ok(/viewport-fit=cover/.test(ler(join(raiz, 'index.html'))));
});
