// Etapa 4: sala com vários aparelhos (dois navegadores) contra o servidor local da
// Cloudflare (wrangler dev), que serve o site e as salas na mesma origem.
import { expect, test, type Browser, type Page } from '@playwright/test';

async function device(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  return context.newPage();
}

/** Entra na sala pela tela inicial, com o código ditado por quem criou. */
async function joinRoom(browser: Browser, code: string, name: string, host: string) {
  const page = await device(browser);
  await page.goto('/?speed=0');
  await page.getByRole('button', { name: 'Entrar com código' }).click();
  await page.getByLabel('Código da sala').fill(code.toLowerCase());
  await page.getByLabel('Seu apelido').fill(name);
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText(`Esperando ${host} começar a partida.`)).toBeVisible();
  return page;
}

/** Ana cria a sala; os convidados entram com o código; Ana começa. */
async function startRoom(browser: Browser, guests: string[] = ['Bruno']) {
  const ana = await device(browser);
  await ana.goto('/?speed=0');
  await ana.getByRole('button', { name: 'Criar sala' }).click();
  await ana.getByLabel('Seu apelido').fill('Ana');
  await ana.getByRole('button', { name: 'Criar sala' }).click();
  await expect(ana.getByRole('heading', { name: 'Sala de espera' })).toBeVisible();
  const code = (await ana.locator('.code-big .code').textContent())?.replace('·', '') ?? '';
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  const others: Page[] = [];
  for (const name of guests) {
    others.push(await joinRoom(browser, code, name, 'Ana'));
    await expect(ana.getByText(name, { exact: true })).toBeVisible();
  }

  await ana.getByRole('button', { name: 'Começar partida' }).click();
  for (const page of [ana, ...others])
    await expect(page.getByRole('group', { name: 'Tabuleiro' })).toBeVisible();
  return { ana, bruno: others[0] as Page, others, code };
}

/** A marca VOCÊ muda de aparelho para aparelho; o resto do painel é igual. */
function stripMe(text: string): string {
  return text.replace('VOCÊ', '').replace(/\s+/g, ' ').trim();
}

/** Joga pelo aparelho que tem a decisão agora (o outro vê quem está decidindo). */
async function playSteps(pages: Page[], steps: number) {
  for (let i = 0; i < steps; i++) {
    for (const page of pages) {
      const button = page.locator('.decision .card button[data-default]:not([disabled])').first();
      if (await button.isVisible()) {
        await button.click();
        break;
      }
    }
    await pages[0]?.waitForTimeout(30);
  }
}

test('três pessoas jogam na mesma sala, cada uma no seu aparelho', async ({ browser }) => {
  const { ana, others } = await startRoom(browser, ['Bruno', 'Carla']);
  const pages = [ana, ...others];
  // um aparelho decide, os outros acompanham (só os outros veem "está decidindo")
  const deciding = async () => {
    let n = 0;
    for (const page of pages) n += await page.getByText(/está decidindo/).count();
    return n;
  };
  await expect.poll(deciding).toBe(pages.length - 1);
  await playSteps(pages, 40);
  // todos os aparelhos chegam ao mesmo dinheiro e às mesmas marcas de vez
  const panel = async (page: Page) =>
    (await page.locator('ul.players li').allTextContents()).map(stripMe);
  for (const page of others) await expect.poll(() => panel(page)).toEqual(await panel(ana));
  await expect(ana.getByText('VOCÊ', { exact: true })).toBeVisible();
});

test('queda de conexão pausa a partida para todos; o aparelho volta pela tela inicial', async ({
  browser,
}) => {
  const { ana, bruno } = await startRoom(browser);
  const brunoBrowser = bruno.context();
  await bruno.close(); // a aba fecha; o navegador continua com o token guardado
  await expect(ana.getByRole('alertdialog', { name: 'Partida pausada' })).toBeVisible();
  await expect(ana.getByText('Bruno perdeu a conexão')).toBeVisible();
  await expect(ana.getByRole('button', { name: /Remover Bruno em/ })).toBeDisabled();

  const back = await brunoBrowser.newPage();
  await back.goto('/?speed=0');
  await expect(back.getByText(/Voltar para a sala/)).toBeVisible();
  await back.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(back.getByRole('group', { name: 'Tabuleiro' })).toBeVisible();
  await expect(ana.getByRole('alertdialog', { name: 'Partida pausada' })).toBeHidden();
});

test('código errado avisa sem entrar', async ({ browser }) => {
  const page = await device(browser);
  await page.goto('/?speed=0');
  await page.getByRole('button', { name: 'Entrar com código' }).click();
  await page.getByLabel('Código da sala').fill('ZZZZZZ');
  await expect(
    page.getByText('Não encontramos essa sala. Confira o código com quem criou.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeDisabled();
});
