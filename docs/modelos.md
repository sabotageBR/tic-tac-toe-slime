# Os 12 modelos (protótipos: série slime 0.1.0 de 2026-11-07, Série Tech de 2026-11-10)

Hub: `modelos/index.html` (local, `npm run servir` → http://127.0.0.1:5390/modelos/) e o Artifact (quando
publicado; `npm run artifact` monta `.tmp/artifact/`). Vídeos e capas em `docs/modelos/` (`npm run gifs`).

Todos têm o **Clássico** (o original) e modos novos; CPU (níveis 0–4) ou 2 jogadores no mesmo aparelho; partidas
encadeadas sem tela (quem venceu comemora, as gotas derretem, a próxima começa).

| # | Modelo | Gancho | Onde a física decide | Modos novos | Partida (bot) | Física (Node) | Risco |
|---|---|---|---|---|---|---|---|
| 6 | **Potes da Velha** | goo que escorre pelo funil e toma a forma do pote; cores em camadas | o dono é a contagem de partículas no pote; Transborda com ladrão (a sobra cai no pote de baixo) | Encher, Potes Grandes, Transborda | 50–80 s | 1–4,6 ms (até ~930 partículas) | ritmo mais lento |
| 1 | **Engole-Engole** | o grande engole o pequeno, que chora lá dentro | engolir, cuspir, pular de nicho, fundir | Engole, Fusão, 4×4, Desafio do dia | 10–15 s (4×4: 25–45 s) | 2,2 ms (4×4: 3,6) | física mais vistosa que decisiva |
| 2 | **Peteleco da Velha** | puxar e soltar; trombadas roubam casas | tudo: atrito, colisão, calha, fusão dos iguais; dono pela massa (55%) | Peteleco, Sabão, Vento, Caos 2P | 15–20 s | 0,4–0,8 ms | precisão no celular |
| 3 | **Velha Derrete** | a 4ª gota derrete a mais velha | derreter e escoar pelo ralo | Derrete, Onda de calor, Relâmpago, Melhor de 5 | ~15 s | ~1,2 ms | estratégia rasa |
| 4 | **Mega Velha** | fechou a velhinha, nasce um slimão | fusão em grupo; as divisórias somem | Mega, Mega Rápida | ~50 s | 2–3 ms (até ~1.540 partículas) | C2P (regra complexa); gotas pequenas no retrato |
| 5 | **Saga dos Poderes** | rivais com eventos físicos e poderes | gelo, terremoto (as gotas caem), lava, vento, gigante | Saga (6 rivais), Caos 2P | ~12 s | ~0,9 ms | muito conteúdo para balancear |

Minha ordem para a Poki: **5 → 2 → 1** (o 6 depende do ritmo: é o mais "físico" e o mais bonito, mas o mais lento).

## O que foi medido
- `npm test`: física, cor, IA (o nível 4 nunca perde no 3×3, de X e de O), potes (volume conservado, dose
  inteira no pote, dono 2×1, ladrão manda a sobra ao pote de baixo), regras de todos os modelos, os 6 modelos com o
  bot (cada submodo, CPU e 2P, até o fim, sem NaN, peças dentro do nicho), determinismo e fronteiras.
- `npm run jogar`: os 6 em tempo real no Chrome headless (toque, arrasto do Peteleco, 2P, reinício, Esc), em
  390×844 e 1031×580: **nenhum erro no console**. Física de 0,4 a 2,2 ms por quadro; o JavaScript inteiro do quadro
  (física + campo + desenho) fica abaixo de 1 ms. O fps do headless (14–33) é o WebGL por software do Chrome sem GPU:
  com `?render=2d` o mesmo jogo roda a 60 fps. Fps de verdade só no celular.
- `npm run gifs`: filme determinístico de cada um (`?filme=140&cada=4`).

## Pendências (para a produção do escolhido)
- Celular real (GPU e fps de verdade); zoom no mini ativo da Mega no retrato.
- Metajogo (gotas, skins, desafio diário, sequência), SDK completo, `empacotar`, thumb.
- Potes: deixar a dose mais rápida (hoje ~1,7 s por lance, ~5 s quando transborda).

---

# Série Tech (modelos 7 a 12, 2026-11-10)

Pedido: "várias versões desse jogo, com mecânicas e temas totalmente diferentes de slime, ultra tecnológico". Sem slime
e sem física de partículas: cena própria em Canvas 2D (neon, holograma), ciano × magenta, sons sintetizados. Cada versão
tem o **Clássico** (3×3 neon) e os modos novos; CPU (níveis 0–4) ou 2 jogadores; partidas encadeadas sem tela.

| # | Versão | Tema | O que muda a jogada | Modos novos | Lances por partida | Risco |
|---|---|---|---|---|---|---|
| 9 | **Sobrecarga** | reator, núcleos de energia | carregar o núcleo; no limite ele descarrega e captura os vizinhos em cadeia; sem empate | Sobrecarga 3×3, Reator 4×4 | 7–8 (4×4: 11–13) | cascata difícil de prever |
| 8 | **Holo Cubo** | holograma 3D que gira | cubo 3×3×3 com gravidade: 9 colunas, 49 linhas, núcleo neutro no centro | Cubo 3D, Pontos | ~10 (Pontos: 26) | leitura do 3D no celular |
| 11 | **Repulsor** | maglev, campo magnético | a peça nova empurra as 4 vizinhas; quem sai é ejetada | Repulsor 4×4, Atrator 5×5 | ~13 (CPU forte: ~25) | partidas longas entre defensores |
| 10 | **Órbita** | estação espacial | gravidade + giro de 90° depois de cada lance; a linha vale depois do giro | Órbita 5×5, Órbita 4×4 | ~15 (4×4: ~8) | 4×4 favorece quem começa |
| 7 | **Velha Quântica** | computador quântico | marca em 2 casas; ciclo de pares = colapso que o rival escolhe | Quântica | ~11 | pede tutorial |
| 12 | **Sincronia** | scanner, mira laser | o toque trava a casa onde o feixe está; casa ocupada = perde a vez | Sincronia, Turbo | não medido | estratégia rasa (arcade) |

Minha ordem para a Poki: **9 → 8 → 11** (a Sobrecarga é a mais fácil de entender sem texto e nunca empata; o Holo Cubo é
o mais vistoso; o Repulsor tem a melhor profundidade). A Quântica é a mais original, mas depende de tutorial.

## Calibragem por bot (CPU × CPU, quem começa alterna; 30 a 80 partidas por linha)

A regra final de cada versão saiu destes números (antes do visual). "Começa" = vitórias de quem começou. As linhas do
Repulsor e do Atrator foram medidas com teto de 40 lances; o jogo ficou com 36.

| Versão (regra final) | Nível 2 × 2: começa / segundo / empate | Nível 4 × 4 | Nível 4 × 1 |
|---|---|---|---|
| Sobrecarga 3×3 (o segundo começa com um núcleo na borda) | 28 / 32 / 0 | 0 / 40 / 0 | — |
| Sobrecarga 4×4, 4 em linha (núcleo inicial no miolo) | 27 / 33 / 0 | 26 / 14 / 0 | — |
| Holo Cubo, 1ª linha (núcleo neutro no centro) | 45 / 15 / 0 | 20 / 0 / 0 | o 4 vence 20 de 20 |
| Holo Cubo, Pontos (núcleo neutro) | 24 / 21 / 15 | 0 / 15 / 5 | o 4 vence 15 de 20 |
| Repulsor 4×4, 3 em linha, empurrão ortogonal | 27 / 22 / 1 | 18 / 10 / 2 | o 4 vence 30 de 30 |
| Atrator 5×5, 4 em linha | 24 / 15 / 11 | 20 / 0 / 10 | o 4 vence 29 de 30 |
| Órbita 5×5, 4 em linha, a linha vale depois do giro | 30 / 38 / 12 | 30 / 0 / 0 | — |
| Órbita 4×4, 3 em linha | 39 / 10 / 1 | 30 / 0 / 0 | — |
| Quântica | 34 / 15 / 11 | 21 / 4 / 5 | o 4 vence 26 de 30 |

O que foi descartado pelos números:
- Sobrecarga sem o núcleo inicial do segundo: quem começa vencia 40 de 40 no nível 4 e 31 de 40 no nível 2.
- Holo Cubo sem o núcleo neutro: quem começa vencia 53 de 60 no nível 2.
- Repulsor empurrando as 8 vizinhas: 40 empates em 40 no nível 4 (ninguém fecha linha). Desempate por maioria de peças
  no teto: favorecia quem joga por último (17 a 0).
- Atrator no 4×4 com 3 em linha: quem começa vencia em 5 lances.
- Órbita com vitória direta antes do giro (4×4 e 5×5): quem começa vencia 40 de 50 e 37 de 50 no nível 2.

Jogos sem empate e de árvore pequena (Sobrecarga, Órbita 4×4) são sempre ganhos por um dos lados no nível máximo; o
equilíbrio que importa é o do nível padrão (2), e quem começa alterna a cada partida.

## O que foi medido na Série Tech
- `npm test` (175 testes): os testes da série slime continuam verdes; `test/tec.test.js` cobre as regras de cada versão
  (colapso e cascata, 49 linhas do cubo, giro e assentamento, empurrão, ejeção, falha de sincronia), o nível 4 contra o
  nível 0, o determinismo por semente, o palco sem NaN com duas partidas encadeadas e os `toques` dentro da janela; o
  `test/modelos.test.js` joga cada submodo até o fim, contra a CPU e em 2 jogadores.
- `npm run jogar -- 7 8 9 10 11 12` (390×844 e 1031×580): **nenhum erro no console**, 60 fps no Chrome headless (a cena
  tech é Canvas 2D: não depende do WebGL por software) e menos de 0,05 ms de lógica por quadro. Em 2 jogadores, 5 de 5
  cliques de verdade viraram lance em cada versão.
- `npm run gifs -- 7 8 9 10 11 12`: filme determinístico de cada uma em `docs/modelos/`.

## Pendências da Série Tech (para a produção da escolhida)
- Celular real: fps e leitura (Holo Cubo em pé, fantasmas pequenos da Quântica).
- Tutorial sem texto (Quântica e Sobrecarga), metajogo, SDK completo, thumb.
- A tela de carregamento ainda é a do slime (papel claro) por um instante antes do tema escuro.
- A Sincronia não tem calibragem por bot (a habilidade é o tempo do toque): acertar a velocidade do feixe com gente.
