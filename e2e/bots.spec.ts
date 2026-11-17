// Jogar contra o computador (modo um aparelho), em cada perfil de tela.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Ana joga; Bruno, Carla e Diego são o computador; modo rodadas (20). */
async function setupAgainstComputer(page: Page, query = 'seed=7&speed=0') {
  await page.goto(`/?${query}`);
  await page.getByRole('button', { name: 'Nova partida' }).click();
  for (const name of ['Bruno', 'Carla', 'Diego']) {
    await page
      .getByRole('radiogroup', { name: `Quem joga: ${name}` })
      .getByRole('radio', { name: 'Computador' })
      .click();
  }
}

test('partida inteira contra o computador, a pessoa só com Enter', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setupAgainstComputer(page);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Menos' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Começar partida' }).click();
  await expect(page.getByText('COMPUTADOR', { exact: true })).toHaveCount(3);
  // sem "Passe o aparelho": só uma pessoa joga
  await expect(page.getByText(/Passe o aparelho/)).toHaveCount(0);
  for (let presses = 0; presses < 4000; presses++) {
    if (await page.getByText(/é o grande Senhorio!/).isVisible()) break;
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText(/é o grande Senhorio!/)).toBeVisible();
  await expect(page.getByText('FIM DE PARTIDA · RODADAS · 20 RODADAS')).toBeVisible();
  expect(errors).toEqual([]);
});

test('pelo menos uma pessoa precisa jogar', async ({ page }) => {
  await setupAgainstComputer(page);
  await page
    .getByRole('radiogroup', { name: 'Quem joga: Ana' })
    .getByRole('radio', { name: 'Computador' })
    .click();
  await expect(page.getByText('Pelo menos uma pessoa precisa jogar.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeDisabled();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page
    .getByRole('radiogroup', { name: 'Quem joga: Ana' })
    .getByRole('radio', { name: 'Pessoa' })
    .click();
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeEnabled();
});

test('a partida salva contra o computador continua com o computador', async ({ page }) => {
  await setupAgainstComputer(page);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Começar partida' }).click();
  // algumas jogadas (a da Ana com Enter; o computador joga sozinho)
  for (let i = 0; i < 30; i++) await page.keyboard.press('Enter');
  await page.reload();
  await expect(page.getByText('Continuar partida')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('COMPUTADOR', { exact: true })).toHaveCount(3);
});
