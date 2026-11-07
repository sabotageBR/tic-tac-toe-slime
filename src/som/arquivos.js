// Subconjunto do slime-merge 2.1.0 (src/som/arquivos.js, gerado por tools/sons.mjs la): so os
// arquivos que o volei toca (2026-10-22: sairam os que nunca tocavam; o empacotar tira da build o
// que nao esta aqui e falha se algum daqui faltar em src/som/arquivos/).
// Arquivos de som em src/som/arquivos/ (MP3 mono 56 kbps, loudnorm -18 LUFS, pico -1,5 dB).
// inicio: atraso do codificador no comeco do MP3, s (o start() pula ele); dur: sem o atraso, s.

/** @type {Readonly<Record<string, {arquivo: string, kb: number, dur: number, inicio: number, licenca: string}>>} */
export const ARQUIVOS = Object.freeze({
  vozCuidadoSlime: { arquivo: 'vozCuidadoSlime.mp3', kb: 3, dur: 0.418, inicio: 0.0262, licenca: 'CC0 Kenney Voiceover Pack' },
  vozNivelSlime: { arquivo: 'vozNivelSlime.mp3', kb: 4.1, dur: 0.575, inicio: 0.0254, licenca: 'CC0 Kenney Voiceover Pack' },
  vozParabensSlime: { arquivo: 'vozParabensSlime.mp3', kb: 7.7, dur: 1.099, inicio: 0.0247, licenca: 'CC0 Kenney Voiceover Pack' },
  vozPerdeuSlime: { arquivo: 'vozPerdeuSlime.mp3', kb: 7, dur: 0.994, inicio: 0.0249, licenca: 'CC0 Kenney Voiceover Pack' },
  vozPowerUpSlime: { arquivo: 'vozPowerUpSlime.mp3', kb: 4.1, dur: 0.576, inicio: 0.0249, licenca: 'CC0 Kenney Voiceover Pack' },
  vozProntoSlime: { arquivo: 'vozProntoSlime.mp3', kb: 3.6, dur: 0.497, inicio: 0.0254, licenca: 'CC0 Kenney Voiceover Pack' },
  vozVaiSlime: { arquivo: 'vozVaiSlime.mp3', kb: 3.2, dur: 0.448, inicio: 0.0226, licenca: 'CC0 Kenney Voiceover Pack' },
  vozVenceuSlime: { arquivo: 'vozVenceuSlime.mp3', kb: 5, dur: 0.707, inicio: 0.0249, licenca: 'CC0 Kenney Voiceover Pack' },
});
