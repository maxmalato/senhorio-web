// Ponta a ponta do modo um aparelho, em cada perfil de tela do docs/08 (playwright.config.ts).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Início → jogadores → modo (rodadas, 20) → ordem sorteada, com sorteios fixos e sem esperas. */
async function startGame(page: Page) {
  await page.goto('/?seed=7&speed=0');
  await page.getByRole('button', { name: 'Nova partida' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Menos' }).click();
  await expect(page.getByText('20 rodadas')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Começar partida' }).click();
  await expect(page.getByRole('button', { name: 'Começar', exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await check('modo');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await check('ordem sorteada');
  await page.getByRole('button', { name: 'Começar partida' }).click();
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rolar dados' })).toBeVisible();
  await check('jogo');
});

test('a opção padrão já vem em foco em cada decisão', async ({ page }) => {
  await startGame(page);
  await expect(page.getByRole('button', { name: 'Começar', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Rolar dados' })).toBeFocused();
});

test('foco perdido: o OK devolve o foco à opção padrão', async ({ page }) => {
  await startGame(page);
  const start = page.getByRole('button', { name: 'Começar', exact: true });
  await expect(start).toBeFocused();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Enter');
  await expect(start).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Rolar dados' })).toBeFocused();
});

test('Voltar esconde a decisão para ver o tabuleiro e a traz de volta', async ({ page }) => {
  await startGame(page);
  await expect(page.getByRole('button', { name: 'Começar', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Rolar dados' })).toBeFocused();
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

test('privacidade e termos abrem pela tela inicial, legíveis e acessíveis', async ({ page }) => {
  await page.goto('/?speed=0');
  await page.getByRole('link', { name: 'Privacidade e termos de uso' }).click();
  await expect(page.getByRole('heading', { name: 'Privacidade e termos de uso' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  // sem rolagem para o lado no celular
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: '← Voltar ao jogo' }).first().click();
  await expect(page.getByRole('button', { name: 'Criar sala' })).toBeVisible();
});

test('o painel ao lado do tabuleiro tem espaço e o Menu fica à vista', async ({ page }) => {
  await startGame(page);
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('.players-area')?.getBoundingClientRect();
    const menu = document.querySelector('.brand .menu-btn:last-of-type')?.getBoundingClientRect();
    const tabs = document.querySelector('.tabs') as HTMLElement | null;
    return {
      sideBySide: !tabs || getComputedStyle(tabs).display === 'none',
      panelWidth: panel?.width ?? 0,
      menuInside:
        !!menu && menu.width > 0 && menu.right <= innerWidth && menu.bottom <= innerHeight,
      noScroll: document.documentElement.scrollWidth <= innerWidth,
    };
  });
  expect(layout.menuInside).toBe(true);
  expect(layout.noScroll).toBe(true);
  // celular em pé usa abas; nas outras telas, o painel não pode ficar espremido
  if (layout.sideBySide) expect(layout.panelWidth).toBeGreaterThanOrEqual(200);
});

test('Como jogar: pela tela inicial e durante a partida, legível e acessível', async ({ page }) => {
  await page.goto('/?seed=7&speed=0');
  await page.getByRole('button', { name: 'Como jogar' }).click();
  await expect(page.getByRole('heading', { name: 'Como jogar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dívidas e falência' })).toBeAttached();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Voltar' }).click();

  // na partida: botão "?" no cabeçalho; Voltar (Esc) fecha
  await startGame(page);
  await page.getByRole('button', { name: 'Como jogar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Como jogar' });
  await expect(dialog).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.help-sheet').analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Começar', exact: true })).toBeVisible();
});
