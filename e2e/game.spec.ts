// Ponta a ponta do modo um aparelho, em cada perfil de tela do docs/08 (playwright.config.ts).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Início → jogadores → modo (rodadas, 20) → ordem sorteada, com sorteios fixos e sem esperas. */
async function startGame(page: Page) {
  await page.goto('/?seed=7&speed=0');
  await page.getByRole('button', { name: 'Nova partida' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Menos' }).click();
  await expect(page.getByText('20 rodadas')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Começar partida' }).click();
  await expect(page.getByRole('button', { name: 'Começar' })).toBeVisible();
}

test('partida inteira só com o teclado (Enter, como o OK do controle)', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startGame(page);
  for (let presses = 0; presses < 4000; presses++) {
    if (await page.getByText(/é o grande Senhorio!/).isVisible()) break;
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText(/é o grande Senhorio!/)).toBeVisible();
  await expect(page.getByText('FIM DE PARTIDA · RODADAS · 20 RODADAS')).toBeVisible();
  expect(errors).toEqual([]);
});

test('telas sem problemas de acessibilidade detectáveis', async ({ page }) => {
  const check = async (name: string) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, name).toEqual([]);
  };
  await page.goto('/?seed=7&speed=0');
  await check('início');
  await page.getByRole('button', { name: 'Nova partida' }).click();
  await check('jogadores');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await check('modo');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await check('ordem sorteada');
  await page.getByRole('button', { name: 'Começar partida' }).click();
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.getByRole('button', { name: 'Rolar dados' })).toBeVisible();
  await check('jogo');
});

test('a opção padrão já vem em foco em cada decisão', async ({ page }) => {
  await startGame(page);
  await expect(page.getByRole('button', { name: 'Começar' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Rolar dados' })).toBeFocused();
});

test('Voltar esconde a decisão para ver o tabuleiro e a traz de volta', async ({ page }) => {
  await startGame(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Rolar dados' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Voltar à decisão' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Rolar dados' })).toBeVisible();
});

test('celular em pé: a aba Jogadores mostra a lista com o dinheiro', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'só no celular em pé');
  await startGame(page);
  await page.getByRole('button', { name: 'Jogadores' }).click();
  await expect(page.getByRole('list', { name: 'Jogadores' })).toBeVisible();
  await expect(page.getByText('R$ 1.500').first()).toBeVisible();
  await page.getByRole('button', { name: 'Tabuleiro' }).click();
  await expect(page.getByRole('group', { name: 'Tabuleiro' })).toBeVisible();
});
