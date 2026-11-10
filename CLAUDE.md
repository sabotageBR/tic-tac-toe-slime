# CLAUDE.md

Guia do projeto para o Claude Code. Respostas e textos em português.

# Slime Tac Toe (nome provisório)

Jogo da velha com o **motor de slime do `../slime-merge`** (partículas PBD com shape matching plástico + pigmento
Kubelka-Munk + gosma em WebGL2), feito para a **Poki**. HTML + JavaScript puro: ES modules nativos, sem bundler, sem
`npm install`; ferramentas em Node 22 + `google-chrome` + `ffmpeg`.

- **Plano aprovado:** `~/.claude/plans/crie-um-jogo-tic-giggly-aho.md` (2026-11-07). **Fase A:** 6 protótipos
  jogáveis num hub (`?modelo=N`), o usuário joga e escolhe; a produção (metajogo, SDK completo, build) vem num plano novo.
- **Série Tech (2026-11-10, plano `~/.claude/plans/giggly-tickling-ritchie.md`):** mais 6 protótipos (`?modelo=7..12`)
  **sem slime e sem física de partículas**, pedidos como "mecânicas e temas totalmente diferentes de slime, ultra
  tecnológico". Mesmo hub, cena própria em Canvas 2D (neon, holograma), um tema por versão.
- **Regra do projeto (por causa da Poki):** a mecânica muda a jogada, não só a aparência (na série slime, é a física do
  slime que muda a jogada). Jogo da velha comum já existe no catálogo (o Slime Merge foi recusado por categoria saturada
  em 2026-10-19).
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

**Série Tech** (`tec: true` no registro; ciano × magenta; regras calibradas por bot, números em `docs/modelos.md`):
7. **Velha Quântica** — a marca fica em 2 casas (par emaranhado); fechou um ciclo, o rival escolhe o colapso, que
   decide tudo em cascata. A jogada `{ colapso }` **não troca a vez** (a `ia.js` trata).
8. **Holo Cubo** — cubo 3×3×3 com gravidade, 9 colunas, 49 linhas; o centro é um núcleo neutro; arrastar gira.
   Pontos: enche o cubo e vence quem fechou mais linhas.
9. **Sobrecarga** — tocar carrega o núcleo; no limite (= vizinhos) ele descarrega e captura em cadeia; sem empate; o
   segundo jogador começa com um núcleo ligado.
10. **Órbita** — módulos caem na coluna; depois de cada lance a estação gira 90° e tudo cai de novo; a linha vale
    depois do giro (5×5 com 4 em linha; 4×4 com 3).
11. **Repulsor** — a peça nova empurra as 4 vizinhas ortogonais (quem sai é ejetada); Atrator puxa quem está a 2 casas.
12. **Sincronia** — um feixe varre as casas e o toque trava onde ele está; casa ocupada = perde a vez (tempo real).

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
  - `tec/` (Série Tech, mesma pureza): `base.js` (`criarModoTec(gancho, o)`: grade + vez + CPU + **palco** de peças
    animadas + partidas encadeadas; `mundo` é um stub vazio), `grade.js`, `acoes.js` (curvas, `surgir`, `mover`,
    `sumir`; a fila é a do `gotas.js`), `proj3d.js` (projeção do cubo, usada pelo toque e pelo desenho) e um gancho por
    versão (`<id>.js`: `regras`, `geometria`, `encenar`, `toque`/`apontar`, `passo`, `visual`, `toques`). O submodo
    `classico` de toda versão tech é o 3×3 comum resolvido na base.
- `src/render/tec/` (Série Tech): `cena.js` (`criarCenaTec`, mesma interface da cena do slime; o `cSlime` fica 1×1 e
  nunca ganha contexto), `kit.js` (traço neon em camadas e brilho por sprite: **sem `shadowBlur` no quadro**; `CORES`),
  `fundo.js` (um padrão por tema, parte parada em cache), `vfx.js` (faísca, arco, onda, pixels, glitch, tremor) e
  `modelos/<id>.js` (cada desenho é `{ fundo(g), topo(g) }`). Sons em `src/som/tec.js` (todos sintetizados; sem as
  vozes de slime). Tema do HUD: `body[data-tema="tec"]` no `estilo.css`.
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
| `npm test` | física, cor, IA (nível 4 nunca perde no 3×3), potes (volume, dono, ladrão), fronteiras, regras e modos da Série Tech (`test/tec.test.js`)... |
| `npm run servir` | http://127.0.0.1:5390/ (jogo) e `/modelos/` (hub); `npm run lan` para o celular |
| `node tools/shot.mjs "<query>" LxA saida.png [ms]` | print no Chrome headless (porta 4390; `PORTA=` muda) |
| `npm run gifs -- [modelo...]` | filme determinístico `?filme=N&cada=K` → GIF/MP4/JPG em `docs/modelos/` (porta 4392) |
| `npm run jogar -- [modelo...] [--tam=390x844] [--render=2d]` | os modelos em tempo real pelo CDP (toque e arrasto de verdade, 2P, reinício, Esc; erros do console e fps; prints em `.tmp/jogar/`; porta 4391, depuração 9391). O fps do headless é o WebGL por software: o JS do quadro fica abaixo de 1 ms |
| `npm run artifact` | monta `.tmp/artifact/` (hub com `window.__velhaHub`, `jogo-N.html` sem SDK com `__velhaModelo`/`__velhaRegra`, `midia/`); publicar o `index.html` com `root: .tmp/artifact` (só com o OK do usuário) |

Portas deste projeto: 5390 (servir), 4390–4395, CDP 9390–9395 (os irmãos usam 537x, 538x, 9372–9382).

**Parâmetros de teste** (só localhost/LAN; lista no cabeçalho de `src/core/depuracao.js`): `?modelo=N`, `?regra=`,
`?dois`, `?nivel=0..4`, `?semente=`, `?passos=N`, `?auto=ms` (bot joga pela pessoa), `?filme=N&cada=K`,
`?semanuncio`, `?semhud`, `?render=2d`, `?qualidade=0..3`, `?expr=`, `?zoom=`, `?primeira`, `?debug`, `?lang=en`.

## Git
Commit no fim de cada marco (`A<n>:` em português sem acento), notas em `docs/marcos/A<n>.md`. Push só com o OK do usuário.

## Modelo tech novo (lista de conferência)
Regras em `src/jogo/regras/` → gancho em `src/jogo/tec/` → registro em `src/jogo/modelos.js` (`tec: true`) → desenho em
`src/render/tec/modelos/` (+ `index.js` e o tema em `fundo.js`) → textos `m<N>`, `<submodo>` e `<submodo>.dica` (os ids
de submodo são globais) → `ROTEIRO` do `tools/gif-modelos.mjs`, `JOGOS`/`VIDEOS` do `tools/artifact-modelos.mjs`, lista
do `tools/jogar.mjs` e a ficha em `modelos/index.html` (as ferramentas usam listas fixas). Calibrar por bot antes do
visual: nível 4 × 4 e 2 × 2, quem começa × segundo, lances por partida.
