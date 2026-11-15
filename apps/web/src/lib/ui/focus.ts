// Foco como no controle remoto: ao abrir um cartão, a opção padrão já vem em foco
// (docs/04, "Foco padrão"), e as setas percorrem as opções habilitadas.

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), [tabindex="0"]';

/** Foca, dentro de node, o elemento com data-default ou o primeiro habilitado. */
export function focusInside(node: HTMLElement): void {
  const target =
    node.querySelector<HTMLElement>('[data-default]:not(:disabled)') ??
    node.querySelector<HTMLElement>(FOCUSABLE);
  target?.focus({ preventScroll: true });
}

/** Ação Svelte: ao montar, foca o elemento com data-default ou o primeiro habilitado. */
export function focusDefault(node: HTMLElement) {
  queueMicrotask(() => {
    if (!node.isConnected) return;
    // não rouba o foco de um campo de texto em edição
    if (document.activeElement instanceof HTMLInputElement && node.contains(document.activeElement))
      return;
    const target =
      node.querySelector<HTMLElement>('[data-default]:not(:disabled)') ??
      node.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus({ preventScroll: true });
  });
}

/** Move o foco para o próximo (step = 1) ou anterior (step = -1) dentro de scope. */
export function moveFocus(scope: HTMLElement, step: 1 | -1): void {
  const items = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null && !el.closest('[hidden]') && !el.dataset.skipArrows,
  );
  if (items.length === 0) return;
  const current = items.indexOf(document.activeElement as HTMLElement);
  const next =
    current === -1
      ? step === 1
        ? 0
        : items.length - 1
      : (current + step + items.length) % items.length;
  items[next]?.focus();
}
