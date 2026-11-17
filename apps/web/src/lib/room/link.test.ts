import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { clearCodeFromUrl, codeFromUrl, roomLink } from './link';
import QrCode from './QrCode.svelte';

describe('link de convite da sala', () => {
  afterEach(() => history.replaceState(null, '', '/'));

  it('monta o link com o código', () => {
    expect(roomLink('ABC234', 'https://jogo.exemplo.dev')).toBe(
      'https://jogo.exemplo.dev/?sala=ABC234',
    );
  });

  it('lê o código do endereço, aceitando minúsculas e separadores', () => {
    expect(codeFromUrl('?sala=abc-234')).toBe('ABC234');
    expect(codeFromUrl('?sala=ABC23')).toBeNull(); // curto demais
    expect(codeFromUrl('?sala=ABC10I')).toBeNull(); // 0, 1 e I não existem nos códigos
    expect(codeFromUrl('?seed=7')).toBeNull();
  });

  it('tira o código da barra de endereço e mantém o resto', () => {
    history.replaceState(null, '', '/?seed=7&sala=ABC234');
    clearCodeFromUrl();
    expect(location.search).toBe('?seed=7');
  });
});

describe('QR Code', () => {
  it('desenha o QR Code como imagem com descrição', () => {
    const { getByRole } = render(QrCode, {
      text: 'https://jogo.exemplo.dev/?sala=ABC234',
      label: 'Entrar',
    });
    const svg = getByRole('img', { name: 'Entrar' });
    const size = Number(svg.getAttribute('viewBox')?.split(' ')[2]);
    expect(size).toBeGreaterThanOrEqual(25); // versão 1 (21) + borda de 2 de cada lado
    expect(svg.querySelector('path')?.getAttribute('d')?.length).toBeGreaterThan(100);
  });

  it('links diferentes geram desenhos diferentes', () => {
    const a = render(QrCode, { text: 'https://x.dev/?sala=ABC234', label: 'a' });
    const b = render(QrCode, { text: 'https://x.dev/?sala=XYZ789', label: 'b' });
    expect(a.getByRole('img', { name: 'a' }).querySelector('path')?.getAttribute('d')).not.toBe(
      b.getByRole('img', { name: 'b' }).querySelector('path')?.getAttribute('d'),
    );
  });
});
