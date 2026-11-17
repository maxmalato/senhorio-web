// Etapa 6: dados em 3D (Three.js sob demanda) com reserva 2D, em cada perfil de tela.
import { expect, test, type Page } from '@playwright/test';

/** Pedidos do arquivo dos dados 3D (Three.js), para conferir quando ele é baixado. */
function watchDice3D(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (/\/assets\/dice3d-[\w-]+\.js$/.test(request.url())) urls.push(request.url());
  });
  return urls;
}

/** Até a primeira jogada, com as animações normais (sem ?speed=0). */
async function firstRoll(page: Page, query: string) {
  await page.goto(`/?seed=7&${query}`);
  await page.getByRole('button', { name: 'Nova partida' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Começar partida' }).click();
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByRole('button', { name: 'Rolar dados' }).click();
}

test('dados 3D: o Three.js só é baixado na partida, e a jogada mostra os dados em 3D', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const downloads = watchDice3D(page);
  await page.goto('/?seed=7&dice=3d');
  await expect(page.getByRole('button', { name: 'Nova partida' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(downloads, 'a tela inicial não baixa o 3D').toEqual([]);

  await firstRoll(page, 'dice=3d');
  await expect(page.locator('.dice-pill canvas.dice-3d')).toBeVisible();
  expect(downloads.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('dados 2D: com ?dice=2d o 3D nem é baixado', async ({ page }) => {
  const downloads = watchDice3D(page);
  await firstRoll(page, 'dice=2d');
  await expect(page.locator('.dice-pill svg.die')).toHaveCount(2);
  expect(downloads).toEqual([]);
});

test('o jogador desliga os dados 3D na tela inicial, e a escolha fica guardada', async ({
  page,
}) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /^Dados em 3D:/ });
  await expect(toggle).toHaveText('Dados em 3D: ligados');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveText('Dados em 3D: desligados');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Dados em 3D: desligados' })).toBeVisible();

  // desligado: a partida usa os dados 2D e não baixa o 3D
  const downloads = watchDice3D(page);
  await page.getByRole('button', { name: 'Nova partida' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Começar partida' }).click();
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByRole('button', { name: 'Rolar dados' }).click();
  await expect(page.locator('.dice-pill svg.die')).toHaveCount(2);
  expect(downloads).toEqual([]);
});
