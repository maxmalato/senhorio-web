// Sons e vibração (Etapa 6): ligados por padrão; o jogador desliga na tela inicial.

const KEY = 'senhorio:sound';

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // sem armazenamento (navegação privada): vale só nesta visita
  }
}
