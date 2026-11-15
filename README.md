# Senhorio Web

Jogo de tabuleiro imobiliário por turnos para o navegador, de 2 a 6 jogadores, em que o computador faz o papel do banco. Versão web do Senhorio para Roku, com as mesmas regras.

> **Situação:** Etapa 0 (fundação) concluída; próxima: Etapa 1 (motor de regras). Ainda não há jogo jogável. Acompanhe em [docs/09-roadmap.md](docs/09-roadmap.md).

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
| `pnpm test` | Roda os testes de todos os pacotes |
| `pnpm test:coverage` | Testes com relatório de cobertura |
| `pnpm e2e` | Testes ponta a ponta (Playwright) |
| `pnpm lint` | ESLint e Prettier |
| `pnpm typecheck` | Checagem de tipos |
| `pnpm build` | Gera a versão de produção |

## Trabalhar em mais de um computador

O GitHub é a única fonte da verdade. Não copie nem sincronize a pasta do projeto (pendrive, OneDrive, Dropbox).

1. Ao começar: `git pull`.
2. Ao terminar: commit e `git push`, sem deixar nada pendente.

## Documentação

Comece por [docs/LEIA-ME.md](docs/LEIA-ME.md).
