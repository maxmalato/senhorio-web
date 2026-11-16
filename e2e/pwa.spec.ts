// Etapa 3: salvamento no aparelho, retomada e PWA offline (docs/08).
import { expect, test, type Page } from '@playwright/test';

async function newGame(page: Page) {
  await page.getByRole('button', { name: 'Nova partida' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Começar partida' }).click();
  await expect(page.getByRole('button', { name: 'Começar', exact: true })).toBeVisible();
}

/** Joga com Enter até o turno do próximo jogador começar (ponto de salvamento). */
async function finishTurns(page: Page, turns: number) {
  for (let done = 0; done < turns;) {
    await page.keyboard.press('Enter');
    if (await page.getByRole('button', { name: 'Começar', exact: true }).isVisible()) done++;
  }
}

test('a partida continua depois de fechar e abrir o jogo de novo', async ({ page }) => {
  await page.goto('/?seed=7&speed=0');
  await newGame(page);
  await finishTurns(page, 3);
  const turnOf = await page.getByRole('heading', { name: /^Vez de / }).textContent();
  const money = await page.locator('ul.players').textContent();
  await page.reload();
  await expect(page.getByText('Continuar partida')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: turnOf ?? '' })).toBeVisible();
  expect(await page.locator('ul.players').textContent()).toBe(money);
});

test('Salvar e sair volta ao início com a partida pronta para continuar', async ({ page }) => {
  await page.goto('/?seed=7&speed=0');
  await newGame(page);
  await finishTurns(page, 1);
  await page.keyboard.press('Enter'); // começa o turno: o menu abre antes de rolar
  await expect(page.getByRole('button', { name: 'Rolar dados' })).toBeVisible();
  await page.keyboard.press('m');
  await page.getByRole('option', { name: /Pausar/ }).click();
  await page.getByRole('button', { name: 'Salvar e sair' }).click();
  await expect(page.getByText('Continuar partida')).toBeVisible();
});

test('o app instalável tem manifesto com nome e ícones', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: 'Senhorio', display: 'standalone', lang: 'pt-BR' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual([
    '192x192',
    '512x512',
    '512x512',
  ]);
  for (const icon of manifest.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
});

test('funciona sem internet depois do primeiro acesso', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'um perfil basta: o service worker é o mesmo');
  await page.goto('/?seed=7&speed=0');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload(); // a partir daqui o service worker controla a página
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Nova partida' })).toBeVisible();
  await newGame(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/tirou \d \+ \d|comprar|Encerrar turno|Dupla/).first()).toBeVisible();
  await context.setOffline(false);
});
