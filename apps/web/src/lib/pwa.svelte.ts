// Estado do aplicativo instalável (PWA): pronto para jogar sem internet e versão nova
// disponível. A versão nova só entra quando o jogador pede (botão na tela inicial), para
// nunca recarregar no meio de uma partida.

export const pwa = $state({
  offlineReady: false,
  updateReady: false,
  update: () => {},
});
