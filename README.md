# Senhorio Web

Jogo de tabuleiro imobiliário por turnos para o navegador, de 2 a 6 jogadores, em que o computador faz o papel do banco. Versão web do Senhorio para Roku, com as mesmas regras.

> **Situação:** modo "um aparelho" jogável do início ao fim, com salvamento automático e funcionamento sem internet (Etapas 2 e 3), e salas com vários aparelhos em teste na rede local (Etapa 4). Próxima: publicação na Cloudflare (Etapa 5). Acompanhe em [docs/09-roadmap.md](docs/09-roadmap.md).

## Modos de jogo

- **Um dispositivo:** um aparelho passado de mão em mão. Funciona sem internet depois do primeiro acesso (PWA).
- **Vários dispositivos:** um jogador cria uma sala privada e informa o código; cada um joga no próprio aparelho.

Roda em celular, tablet, desktop e Smart TV com navegador (Samsung, LG, Android/Google TV).

## Tecnologias

TypeScript, Svelte 5, Vite, PWA e Cloudflare Workers + Durable Objects, num monorepo pnpm:

| Pasta | Conteúdo |
| --- | --- |
| `packages/engine` | Motor de regras em TypeScript puro, usado pelo navegador e pelo servidor |
| `apps/web` | Interface (Svelte + Vite + PWA) |
| `apps/server` | Site e salas na Cloudflare (Worker + Durable Objects) |
| `e2e` | Testes ponta a ponta (Playwright) |
| `docs` | Documentação em PT-BR |

Detalhes em [docs/07-arquitetura-tecnica.md](docs/07-arquitetura-tecnica.md).

## Requisitos

- Node.js 22 (LTS)
- pnpm 10 (`corepack enable` instala a versão definida no `package.json`)

## Comandos

```bash
pnpm install
```

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Abre a interface em modo de desenvolvimento |
| `pnpm --filter @senhorio/server dev` | Servidor das salas local (Cloudflare, porta 8787), sem conta |
| `pnpm test` | Roda os testes de todos os pacotes |
| `pnpm test:coverage` | Testes com relatório de cobertura |
| `pnpm e2e` | Testes ponta a ponta (Playwright) |
| `pnpm lint` | ESLint e Prettier |
| `pnpm typecheck` | Checagem de tipos |
| `pnpm build` | Gera a versão de produção |
| `SITE_URL=https://… pnpm smoke` | Teste de fumaça num endereço publicado (ou `http://localhost:8787`) |
| `pnpm --filter @senhorio/engine balance` | Balanceamento: 50 partidas de robôs por cenário (docs/05); `BALANCE_GAMES=200` muda a quantidade |

## Publicação

O jogo é publicado na Cloudflare (plano gratuito, endereço `workers.dev`) pelo próprio CI, a cada push na `main`, depois de todos os testes passarem. Ninguém publica do próprio computador. O token e o ID da conta ficam só nos segredos do repositório; detalhes, limites e como desfazer em [docs/07](docs/07-arquitetura-tecnica.md#publicação).

## Testar salas na rede local

Até a publicação (Etapa 5), as salas rodam no computador. Em um terminal, gere o site e suba o servidor das salas aberto para a rede:

```bash
pnpm build
```

```bash
pnpm --filter @senhorio/server dev --ip 0.0.0.0
```

Abra `http://<IP do computador na rede>:8787` no computador e nos outros aparelhos, na mesma rede Wi-Fi. Para mexer na interface com recarga automática, deixe o servidor das salas rodando e, em outro terminal, use `pnpm dev` (o Vite encaminha `/api` para a porta 8787).

Instalação como aplicativo e modo offline só funcionam em https ou `localhost`; pela rede local o jogo funciona, mas sem esses dois recursos.

## Trabalhar em mais de um computador

O GitHub é a única fonte da verdade. Não copie nem sincronize a pasta do projeto (pendrive, OneDrive, Dropbox).

1. Ao começar: `git pull`.
2. Ao terminar: commit e `git push`, sem deixar nada pendente.

## Documentação

Comece por [docs/LEIA-ME.md](docs/LEIA-ME.md).
