// Copiar texto para a área de transferência. Em https e em localhost, o navegador libera a
// API moderna; pela rede local (http://IP) ela fica desligada, então usa o jeito antigo,
// que ainda funciona a partir de um toque ou clique. Devolve false se nada funcionou, para
// a tela mostrar o texto e a pessoa copiar à mão.

export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // permissão negada: tenta o jeito antigo
    }
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const previous = document.activeElement as HTMLElement | null;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok: boolean;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  previous?.focus({ preventScroll: true });
  return ok;
}

/** O menu de compartilhar do sistema está disponível (celular, e só em https). */
export function canShare(): boolean {
  return window.isSecureContext && typeof navigator.share === 'function';
}
