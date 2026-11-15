import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('abre a tela inicial', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Senhorio' })).toBeVisible();
});

test('rola os dados só com o teclado (como no controle da TV)', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Rolar dados de teste' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/^Resultado: [1-6] \+ [1-6] = \d+$/)).toBeVisible();
});

test('não tem problemas de acessibilidade detectáveis', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
