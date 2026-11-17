// Modo mesa: uma tela grande (TV, notebook, tablet) cria a sala e mostra a partida; cada
// pessoa joga pelo celular. Roda no perfil "salas", contra o servidor local da Cloudflare.
import { devices, expect, test, type Browser, type Page } from '@playwright/test';

async function createTable(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  const table = await context.newPage();
  await table.goto('/?speed=0');
  await table.getByRole('button', { name: 'Criar mesa' }).click();
  await expect(table.getByRole('heading', { name: 'Criar mesa' })).toBeVisible();
  await expect(table.getByLabel('Seu apelido')).toHaveCount(0); // a mesa não joga
  await table.getByRole('button', { name: 'Criar mesa' }).click();
  await expect(table.getByRole('heading', { name: 'Sala de espera' })).toBeVisible();
  await table.getByRole('button', { name: 'Compartilhar link' }).click();
  const link = await table.evaluate(() => navigator.clipboard.readText());
  return { table, link };
}

async function joinByLink(browser: Browser, link: string, name: string): Promise<Page> {
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();
  await page.goto(`${link}&speed=0`);
  await page.getByLabel('Seu apelido').fill(name);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Esperando a mesa começar a partida.')).toBeVisible();
  return page;
}

test('a mesa cria a sala, os celulares jogam e a mesa encerra', async ({ browser }) => {
  const errors: string[] = [];
  const { table, link } = await createTable(browser);
  table.on('pageerror', (e) => errors.push(e.message));
  await expect(table.getByRole('button', { name: 'Encerrar sala' })).toBeVisible();
  await expect(table.getByRole('button', { name: 'Sair da sala' })).toHaveCount(0);

  const ana = await joinByLink(browser, link, 'Ana');
  const bruno = await joinByLink(browser, link, 'Bruno');
  await expect(table.getByText('Bruno', { exact: true })).toBeVisible();

  // só a mesa começa
  await expect(ana.getByRole('button', { name: 'Começar partida' })).toHaveCount(0);
  await table.getByRole('button', { name: 'Começar partida' }).click();
  for (const page of [table, ana, bruno])
    await expect(page.getByRole('group', { name: 'Tabuleiro' })).toBeVisible();

  // a mesa mostra quem está decidindo, sem botões de jogada
  await expect(table.getByText(/está decidindo/)).toBeVisible();
  await expect(table.getByRole('button', { name: 'Rolar dados' })).toHaveCount(0);
  await expect(table.getByRole('button', { name: 'Pausar' })).toBeVisible();

  // um celular joga; a mesa acompanha
  const player = (await ana.getByRole('button', { name: 'Rolar dados' }).count()) ? ana : bruno;
  await player.getByRole('button', { name: 'Rolar dados' }).click();
  await expect(table.locator('.dice-pill, .decision').first()).toBeVisible();

  // a mesa pausa para todos e encerra a sala
  await table.getByRole('button', { name: 'Pausar' }).click();
  await expect(ana.getByText('Jogo pausado pela mesa')).toBeVisible();
  await table.getByRole('button', { name: 'Encerrar sala' }).click();
  await expect(
    table.getByRole('alertdialog', { name: 'Encerrar a sala para todos?' }),
  ).toBeVisible();
  await expect(table.getByRole('button', { name: 'Não, voltar' })).toBeFocused();
  await table.getByRole('button', { name: 'Sim, encerrar' }).click();
  for (const page of [ana, bruno])
    await expect(page.getByText('A mesa encerrou a sala.')).toBeVisible();
  await expect(table.getByRole('button', { name: 'Criar mesa' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a mesa recarregada volta para a mesma sala como mesa', async ({ browser }) => {
  const { table } = await createTable(browser);
  await table.reload();
  await expect(table.getByText(/Voltar para a mesa/)).toBeVisible();
  await table.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(table.getByRole('button', { name: 'Encerrar sala' })).toBeVisible();
});

test('no celular não aparece "Criar mesa"', async ({ browser }) => {
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  await page.goto('/?speed=0');
  await expect(page.getByRole('button', { name: 'Criar sala' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar mesa' })).toHaveCount(0);
});
