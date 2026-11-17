// Etapa 6: sons e vibração, ligados por padrão, com escolha guardada no aparelho.
import { expect, test } from '@playwright/test';

test('o jogador desliga sons e vibração na tela inicial, e a escolha fica guardada', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?speed=0');
  const toggle = page.getByRole('button', { name: /^Sons e vibração:/ });
  await expect(toggle).toHaveText('Sons e vibração: ligados');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveText('Sons e vibração: desligados');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sons e vibração: desligados' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('com sons ligados, uma jogada com dados não dá erro', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=7&dice=2d');
  await page.getByRole('button', { name: 'Nova partida' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Começar partida' }).click();
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByRole('button', { name: 'Rolar dados' }).click();
  await expect(page.locator('.dice-pill')).toBeVisible();
  expect(errors).toEqual([]);
});
