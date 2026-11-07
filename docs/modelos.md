# Os 6 modelos (protótipos 0.1.0, 2026-11-07)

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
