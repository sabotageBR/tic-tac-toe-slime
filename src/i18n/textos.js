// Todo texto visivel do prototipo (PT padrao: a avaliacao e em portugues; EN para comparar com
// ?lang=en). Os modos so emitem chaves; o HUD traduz. O codigo de src/jogo/ fica em ASCII.

/** @type {Record<string, Record<string, string>>} */
export const TEXTOS = {
  pt: {
    voce: 'Você', cpu: 'CPU', jogador1: 'Azul', jogador2: 'Laranja',
    suaVez: 'Sua vez', vezDe: 'Vez do {nome}', cpuPensa: 'CPU pensando…', encenando: '…',
    venceu: '{nome} venceu!', vocVenceu: 'Você venceu!', vocPerdeu: 'A CPU venceu', empate: 'Empate',
    // modelos
    'm0': 'Clássico',
    'm1': 'Engole-Engole', 'm2': 'Peteleco da Velha', 'm3': 'Velha Derrete', 'm4': 'Mega Velha', 'm5': 'Saga dos Poderes', 'm6': 'Potes da Velha',
    // submodos (nome curto do botao e a dica de uma linha)
    'classico': 'Clássico', 'classico.dica': 'Três gotas em linha vencem.',
    'engole': 'Engole', 'engole.dica': 'Toque numa gota da mão (ou sua no tabuleiro) e depois na casa. A maior engole a menor.',
    'fusao': 'Fusão', 'fusao.dica': 'Como o Engole, e duas suas iguais lado a lado viram uma maior.',
    'grande': '4×4', 'grande.dica': 'Tabuleiro 4×4: quatro em linha.',
    'desafio': 'Desafio do dia', 'desafio.dica': 'Vença em poucos lances a posição do dia.',
    'peteleco': 'Peteleco', 'peteleco.dica': 'Puxe para trás e solte: a casa é de quem tem mais gosma nela.',
    'sabao': 'Sabão', 'sabao.dica': 'Mesa ensaboada: tudo desliza mais longe.',
    'vento': 'Vento', 'vento.dica': 'O vento muda a cada vez (veja a seta).',
    'caos': 'Caos 2P', 'caos.dica': 'Os dois lançam ao mesmo tempo no "Já!". Segure 3 em linha.',
    'derrete': 'Derrete', 'derrete.dica': 'Só 3 gotas cada: a 4ª derrete a sua mais velha.',
    'calor': 'Onda de calor', 'calor.dica': 'A cada 4 lances a gota mais velha derrete.',
    'relampago': 'Relâmpago', 'relampago.dica': 'Derrete com 5 s por lance.',
    'melhor5': 'Melhor de 5', 'melhor5.dica': 'Derrete em melhor de 5.',
    'mega': 'Mega', 'mega.dica': 'Sua casa manda o rival para a velhinha de mesma posição. Feche 3 velhinhas em linha.',
    'megaRapida': 'Mega Rápida', 'megaRapida.dica': 'Mega com 45 s de relógio para cada um.',
    'saga': 'Saga', 'saga.dica': 'Vença a escada de rivais. Cada um traz um evento; escolha um poder antes.',
    'caos2p': 'Caos 2P', 'caos2p.dica': 'Eventos e poderes no 2 jogadores.',
    'encher': 'Encher', 'encher.dica': 'Despeje doses de gosma: o pote cheio é de quem tem mais.',
    'grandes': 'Potes Grandes', 'grandes.dica': 'O pote do meio pede 4 doses; os das bordas, 2.',
    'transborda': 'Transborda', 'transborda.dica': 'Despejar em pote cheio derrama: a sobra cai no pote de baixo e conta lá.',
    // eventos e poderes da Saga
    'ev.gelo': 'Gelo!', 'ev.terremoto': 'Terremoto!', 'ev.lava': 'Lava!', 'ev.vento': 'Ventania!', 'ev.gigante': 'Gigante!',
    'pd.missil': 'Míssil', 'pd.trocar': 'Trocar', 'pd.chacoalhar': 'Chacoalhar', 'pd.calor': 'Calor', 'pd.cola': 'Cola',
    'serie': 'Série!', 'sagaRival': 'Rival {n}/{total}: {nome}', 'escolhaPoder': 'Escolha um poder', 'rival': 'Rival: {nome}', 'ja': 'Já!', 'cheio': 'Cheio!',
    // Serie Tech (modelos 7 a 12)
    'tec.jogador1': 'Ciano', 'tec.jogador2': 'Magenta', 'tec.classico.dica': 'Três em linha vencem.',
    'm7': 'Velha Quântica', 'm8': 'Holo Cubo', 'm9': 'Sobrecarga', 'm10': 'Órbita', 'm11': 'Repulsor', 'm12': 'Sincronia',
    'quantica': 'Quântica', 'quantica.dica': 'Toque em 2 casas: a marca fica nas duas. Fechou um ciclo, o rival escolhe onde ela cai.',
    'cubo': 'Cubo 3D', 'cubo.dica': 'Toque numa coluna: o bloco cai e empilha. Três em linha em qualquer direção do cubo.',
    'cuboPontos': 'Pontos', 'cuboPontos.dica': 'Encham o cubo inteiro: vence quem fechar mais linhas.',
    'sobrecarga': 'Sobrecarga', 'sobrecarga.dica': 'Carregue um núcleo seu ou vazio. No limite ele descarrega e captura os vizinhos.',
    'sobrecarga4': 'Reator 4×4', 'sobrecarga4.dica': 'Sobrecarga no 4×4: quatro em linha.',
    'orbita': 'Órbita', 'orbita.dica': 'Toque numa coluna: o módulo cai. Depois de cada lance a estação gira e tudo cai de novo.',
    'orbita5': 'Órbita 5×5', 'orbita5.dica': 'Estação maior: quatro em linha.',
    'repulsor': 'Repulsor', 'repulsor.dica': 'A peça nova empurra as vizinhas uma casa. Quem sai do tabuleiro some. Três em linha.',
    'atrator': 'Atrator', 'atrator.dica': 'A peça nova puxa para perto quem está a duas casas. Três em linha.',
    'sincronia': 'Sincronia', 'sincronia.dica': 'Toque quando o feixe passar na casa que você quer. Casa ocupada: perde a vez.',
    'turbo': 'Turbo', 'turbo.dica': 'O feixe vai e volta, e bem mais rápido.',
    'tec.colapso': 'Colapso!', 'tec.escolha': 'Escolha onde a marca cai', 'tec.segunda': 'Agora a 2ª casa', 'tec.falha': 'Falha!', 'tec.giro': 'Giro!',
    'tec.ejetado': 'Ejetado!', 'tec.sobrecarga': 'Sobrecarga!', 'tec.cadeia': 'Cadeia ×{n}', 'tec.pontos': '{a} × {b}', 'tec.trave': 'Toque para travar',
  },
  en: {
    voce: 'You', cpu: 'CPU', jogador1: 'Blue', jogador2: 'Orange',
    suaVez: 'Your turn', vezDe: "{nome}'s turn", cpuPensa: 'CPU thinking…', encenando: '…',
    venceu: '{nome} wins!', vocVenceu: 'You win!', vocPerdeu: 'CPU wins', empate: 'Draw',
    'm0': 'Classic',
    'm1': 'Slime Gobble', 'm2': 'Slime Flick', 'm3': 'Melt Tac Toe', 'm4': 'Mega Tac Toe', 'm5': 'Power Saga', 'm6': 'Jar Tac Toe',
    'classico': 'Classic', 'classico.dica': 'Three in a row wins.',
    'engole': 'Gobble', 'engole.dica': 'Tap a slime in your hand (or yours on the board), then a cell. Bigger gobbles smaller.',
    'fusao': 'Merge', 'fusao.dica': 'Like Gobble, and two equal neighbors of yours merge into a bigger one.',
    'grande': '4×4', 'grande.dica': '4×4 board: four in a row.',
    'desafio': 'Daily', 'desafio.dica': 'Win the daily position in few moves.',
    'peteleco': 'Flick', 'peteleco.dica': 'Pull back and release: a cell belongs to whoever has the most goo in it.',
    'sabao': 'Soap', 'sabao.dica': 'Soapy table: everything slides farther.',
    'vento': 'Wind', 'vento.dica': 'The wind changes every turn (see the arrow).',
    'caos': 'Chaos 2P', 'caos.dica': 'Both flick at once on "Go!". Hold 3 in a row.',
    'derrete': 'Melt', 'derrete.dica': 'Only 3 slimes each: your 4th melts your oldest.',
    'calor': 'Heat wave', 'calor.dica': 'Every 4 moves the oldest slime melts.',
    'relampago': 'Blitz', 'relampago.dica': 'Melt with 5 s per move.',
    'melhor5': 'Best of 5', 'melhor5.dica': 'Melt, best of 5.',
    'mega': 'Mega', 'mega.dica': 'Your cell sends the rival to the matching small board. Win 3 small boards in a row.',
    'megaRapida': 'Mega Blitz', 'megaRapida.dica': 'Mega with a 45 s clock each.',
    'saga': 'Saga', 'saga.dica': 'Beat the rival ladder. Each brings an event; pick a power first.',
    'caos2p': 'Chaos 2P', 'caos2p.dica': 'Events and powers in 2 players.',
    'encher': 'Fill', 'encher.dica': 'Pour doses of goo: a full jar belongs to whoever has more.',
    'grandes': 'Big Jars', 'grandes.dica': 'The middle jar takes 4 doses; the edges, 2.',
    'transborda': 'Overflow', 'transborda.dica': 'Pouring into a full jar spills: what falls into the jar below counts there.',
    'ev.gelo': 'Ice!', 'ev.terremoto': 'Earthquake!', 'ev.lava': 'Lava!', 'ev.vento': 'Gale!', 'ev.gigante': 'Giant!',
    'pd.missil': 'Missile', 'pd.trocar': 'Swap', 'pd.chacoalhar': 'Shake', 'pd.calor': 'Heat', 'pd.cola': 'Glue',
    'serie': 'Series!', 'sagaRival': 'Rival {n}/{total}: {nome}', 'escolhaPoder': 'Pick a power', 'rival': 'Rival: {nome}', 'ja': 'Go!', 'cheio': 'Full!',
    'tec.jogador1': 'Cyan', 'tec.jogador2': 'Magenta', 'tec.classico.dica': 'Three in a row wins.',
    'm7': 'Quantum Tac Toe', 'm8': 'Holo Cube', 'm9': 'Overload', 'm10': 'Orbit', 'm11': 'Repulsor', 'm12': 'Sync',
    'quantica': 'Quantum', 'quantica.dica': 'Tap 2 cells: the mark lives in both. Close a loop and the rival picks where it lands.',
    'cubo': '3D Cube', 'cubo.dica': 'Tap a column: the block drops and stacks. Three in a row in any direction of the cube.',
    'cuboPontos': 'Points', 'cuboPontos.dica': 'Fill the whole cube: most lines wins.',
    'sobrecarga': 'Overload', 'sobrecarga.dica': 'Charge a core of yours or an empty one. At the limit it discharges and captures its neighbors.',
    'sobrecarga4': 'Reactor 4×4', 'sobrecarga4.dica': 'Overload on 4×4: four in a row.',
    'orbita': 'Orbit', 'orbita.dica': 'Tap a column: the module drops. After every move the station turns and everything falls again.',
    'orbita5': 'Orbit 5×5', 'orbita5.dica': 'Bigger station: four in a row.',
    'repulsor': 'Repulsor', 'repulsor.dica': 'The new piece pushes its neighbors one cell. Pushed off the board, gone. Three in a row.',
    'atrator': 'Attractor', 'atrator.dica': 'The new piece pulls in whoever is two cells away. Three in a row.',
    'sincronia': 'Sync', 'sincronia.dica': 'Tap when the beam is on the cell you want. Taken cell: you lose the turn.',
    'turbo': 'Turbo', 'turbo.dica': 'The beam goes back and forth, much faster.',
    'tec.colapso': 'Collapse!', 'tec.escolha': 'Pick where the mark lands', 'tec.segunda': 'Now the 2nd cell', 'tec.falha': 'Miss!', 'tec.giro': 'Spin!',
    'tec.ejetado': 'Ejected!', 'tec.sobrecarga': 'Overload!', 'tec.cadeia': 'Chain ×{n}', 'tec.pontos': '{a} × {b}', 'tec.trave': 'Tap to lock',
  },
};

/**
 * @param {string} lang @param {string} chave @param {Record<string, string|number>} [vars]
 */
export function texto(lang, chave, vars) {
  const tab = TEXTOS[lang] || TEXTOS.pt;
  let s = tab[chave] !== undefined ? tab[chave] : TEXTOS.pt[chave] !== undefined ? TEXTOS.pt[chave] : chave;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', String(v));
  return s;
}
