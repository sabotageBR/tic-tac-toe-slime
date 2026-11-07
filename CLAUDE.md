# CLAUDE.md

Guia do projeto para o Claude Code. Respostas e textos em português.

# Slime Tac Toe (nome provisório)

Jogo da velha com o **motor de slime do `../slime-merge`** (partículas PBD com shape matching plástico + pigmento
Kubelka-Munk + gosma em WebGL2), feito para a **Poki**. HTML + JavaScript puro: ES modules nativos, sem bundler, sem
`npm install`; ferramentas em Node 22 + `google-chrome` + `ffmpeg`.

- **Plano aprovado:** `~/.claude/plans/crie-um-jogo-tic-giggly-aho.md` (2026-11-07). **Fase A:** 6 protótipos
  jogáveis num hub (`?modelo=N`), o usuário joga e escolhe; a produção (metajogo, SDK completo, build) vem num plano novo.
- **Regra do projeto (por causa da Poki):** a física do slime muda a jogada, não só a aparência. Jogo da velha comum já
  existe no catálogo (o Slime Merge foi recusado por categoria saturada em 2026-10-19).
- Modelos: `docs/modelos.md`. Marcos: `docs/marcos/`.

## Os modelos (`?modelo=N`, `src/jogo/modelos.js`)
Todos têm o **Clássico** (o original) e modos novos; CPU (nível 0–4, `src/jogo/ia.js`) ou 2 jogadores no mesmo aparelho.
0. Clássico puro (base dos testes).
1. **Engole-Engole** — 3 tamanhos, o maior engole o menor (o preso fica dentro), mover pecas, Fusão, 4×4.
2. **Peteleco da Velha** — mesa vista de cima (gy = 0), puxar e soltar; a casa é de quem tem mais massa nela.
3. **Velha Derrete** — 3 gotas cada; a 4ª derrete a mais velha (escoa pelo ralo).
4. **Mega Velha** — 9 velhinhas; fechou uma, as 3 gotas viram um slimão.
5. **Saga dos Poderes** — rivais com eventos físicos (gelo, terremoto, lava, vento, gigante) e poderes.
6. **Potes da Velha** (pedido do usuário em 2026-11-07, "com física bem feita") — 9 béqueres com funil e torneira; a dose
   é goo de verdade que escorre e toma a forma do pote; **a física decide** (contagem de partículas por pote, `contar`);
   Transborda com **ladrão** (furo na linha de cheio + bica: a sobra se separa por `dividir`, desce e cai no funil do
   pote de baixo).

## Como um quadro anda
`core/laco.js` → `modo.passo(1/60)` (a física faz 4 subpassos de 1/240 s) → o modo empurra eventos em
`modo.eventos` (`som`, `voz`, `pouso`, `pingo`, `estouro`, `texto`, `lance`, `vez`, `fim`, `nivel`...) →
`tratarEventos()` do `main.js` vira áudio, VFX e `poki.measure` → `cena.desenhar(modo)`. O modo nunca toca DOM,
áudio nem SDK.

## Estrutura
- `src/fisica/`, `src/cor/`: **cópia sem mudança** do slime-merge (ver o CLAUDE.md de lá para a física).
- `src/jogo/` (puro e determinístico: sem DOM, relógio nem `Math.random`; sorteio só por `core/rng.js`):
  - `tabuleiro.js` (linhas n×n/k, vencedor), `ia.js` (negamax alfa-beta com tabela e **orçamento em nós**, níveis,
    `poupar` da 1ª partida da vida), `vez.js` (máquina de vez: vez → encenando → fim; CPU pensa 0,45–0,9 s);
  - `estante.js` (o `#` de nichos em cápsulas; casa i = r*cols + c, r = 0 em cima; `celulaEm`, `pingo`, `dentro`);
  - `gotas.js` (ações físicas: `pingar`, `saltar`, `derreter`, `estourar`, fila; `cuidar` = pouso/caretas/humor;
    `rede` = a gota fora do nicho volta);
  - `regras/*.js` (estado lógico imutável: `jogadas`, `aplicar → { E, efeitos }`, `resultado`, `chave`, `avaliar`);
  - `modos/base.js` (`criarModoVez(gancho, o)`: mundo + tabuleiro + vez + encadeamento das partidas sem tela) e
    `modos/<modelo>.js` (ganchos: `regras`, `estante`/`geometria`, `encenar`, `toque`, `passo`, `visual`...);
  - `humor.js` (cópia do slime-merge), `cores.js` (azul × laranja em pigmento KM).
- `src/render/`: porte do slime-merge (`campo`, `composicao`, `fallback2d`, `rostos`, `vfx`, `gosma`, `missil`,
  `camera`, `fundo`, `cenarios`, `qualidade`); `paleta.js` (as 16 cores das skins, fora do `skins.js`); `cena.js`
  adaptada (estante no lugar dos cestos); `estante.js` (nichos, bico, realce, linha da vitória);
  `modelos/<id>.js` (desenho próprio de cada modelo; `modelos/index.js` registra, o `main.js` liga ao modo).
- `src/core/`: `poki.js` e `audio.js` do slime-voley; `rng`, `laco`, `entrada`, `haptico`, `armazenamento`
  (prefixo `velha.`), `depuracao.js` do slime-merge (enxuta). `src/som/`: `mesa.js` e as falas `*Slime` do slime-voley.
- `src/main.js`: único dono do SDK, do áudio, do save e do DOM.

## Fronteiras vigiadas (`test/estilo.test.js`)
- sem `console.log`; só o `main.js` importa `core/poki.js`; `localStorage` só no `armazenamento.js`; a URL só na
  `depuracao.js`; única URL externa = SDK da Poki;
- `jogo/`, `fisica/`, `cor/` sem `Math.random`, DOM ou relógio; `fisica/` só `+ - * /` e `sqrt`;
- `jogo/` e `fisica/` só importam de fora deles `core/rng.js` e `cor/*` (desenho de modelo fica em `render/modelos/`);
- `src/jogo/` em ASCII fora dos comentários (texto visível vai para `src/i18n/textos.js`);
- `gameplayStart` só no `pointerdown`/tecla.

## Comandos
| Comando | O que faz |
|---|---|
| `npm test` | física, cor, IA (nível 4 nunca perde no 3×3), potes (volume, dono, ladrão), fronteiras... |
| `npm run servir` | http://127.0.0.1:5390/ (jogo) e `/modelos/` (hub); `npm run lan` para o celular |
| `node tools/shot.mjs "<query>" LxA saida.png [ms]` | print no Chrome headless (porta 4390; `PORTA=` muda) |
| `npm run gifs -- [modelo...]` | filme determinístico `?filme=N&cada=K` → GIF/MP4/JPG em `docs/modelos/` (porta 4392) |
| `npm run jogar` | os modelos em tempo real pelo CDP (porta 4391, depuração 9391) |
| `npm run artifact` | monta `.tmp/artifact/` (hub + `jogo-N.html` sem SDK) para publicar no claude.ai |

Portas deste projeto: 5390 (servir), 4390–4395, CDP 9390–9395 (os irmãos usam 537x, 538x, 9372–9382).

**Parâmetros de teste** (só localhost/LAN; lista no cabeçalho de `src/core/depuracao.js`): `?modelo=N`, `?regra=`,
`?dois`, `?nivel=0..4`, `?semente=`, `?passos=N`, `?auto=ms` (bot joga pela pessoa), `?filme=N&cada=K`,
`?semanuncio`, `?semhud`, `?render=2d`, `?qualidade=0..3`, `?expr=`, `?zoom=`, `?primeira`, `?debug`, `?lang=en`.

## Git
Commit no fim de cada marco (`A<n>:` em português sem acento), notas em `docs/marcos/A<n>.md`. Push só com o OK do usuário.
