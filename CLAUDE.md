# CLAUDE.md

Instruções para o Claude Code neste repositório. Leia antes de qualquer tarefa.

## O projeto

Senhorio Web: versão para navegador do jogo de tabuleiro Senhorio, criado antes para Roku (BrightScript, repositório `maxmalato/senhorio`, só referência). O computador é o banco; 2 a 6 jogadores; modos "um dispositivo" (passado de mão em mão, offline) e "vários dispositivos" (sala privada por código, um aparelho por jogador).

- Especificação: `docs/` (comece por `docs/LEIA-ME.md`).
- Situação das etapas: `docs/09-roadmap.md`. Confira antes de começar e atualize ao começar ou fechar uma etapa.
- Decisões: registro no fim de `docs/01-visao-e-escopo.md`. Decisão nova entra no topo, com data e motivo.
- Regras do jogo: `docs/02` a `docs/05`, herdados do Roku. As regras valem sem mudança; textos sobre controle remoto e tecla ✱ descrevem a interface do Roku.

## Idioma

| Item | Idioma |
| --- | --- |
| Pastas, arquivos, nomes no código, ações, eventos, chaves do JSON | Inglês |
| README, `docs/`, comentários no código, textos do jogo | PT-BR |
| Mensagens de commit | PT-BR no imperativo ("Adiciona cálculo de aluguel") |
| Códigos das regras (RN-xxx, RP-xx, CT-xx, D-xx, M-xx) | Mantidos como nos docs |

Respostas ao dono do projeto em PT-BR.

## Arquitetura (resumo de docs/07)

- `packages/engine`: motor de regras em TypeScript puro. `transition(state, action, ctx)` devolve `{ ok, state, events, reason }`. Sem APIs de navegador ou da Cloudflare; aleatoriedade só pelo gerador em `ctx`; nenhum valor de regra no código, tudo do `rules.json`.
- `apps/web`: Svelte 5 + Vite + PWA. Só desenha o estado, envia ações e anima eventos. Nunca calcula regra.
- `apps/server`: Cloudflare Worker + um Durable Object por sala. Roda o mesmo motor, sorteia os dados e valida quem envia cada ação.
- Visual 2D (SVG/CSS); Three.js só como acabamento (dados), carregado sob demanda, com reserva 2D.

## Comandos

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm e2e
pnpm --filter @senhorio/engine balance   # balanceamento (fora do pnpm test)
```

## Regras de trabalho

- **Testes obrigatórios.** Toda mudança no motor vem com teste (Vitest; cenários CT com o número do Roku; novos a partir de CT-46). Rode `pnpm lint`, `pnpm typecheck` e `pnpm test` antes de cada commit. Etapa com teste falhando não fecha.
- **Commits pequenos** por funcionalidade; uma tag por etapa (ver roadmap).
- **Tags e releases são criadas manualmente pelo dono do projeto.** As sessões do Claude Code na nuvem não conseguem criar tags nem releases (o ambiente recusa). Ao fechar uma etapa, ou sempre que uma tag ou release precisar mudar, avise o dono e passe o passo a passo: nome da tag, commit (hash curto), título e descrição sugeridos, e o caminho no site do GitHub (Releases → Draft a new release).
- **Dois computadores:** o dono do projeto alterna entre dois computadores. O GitHub é a única fonte da verdade. No início de cada sessão, confira se a cópia local está atualizada (`git pull`); ao terminar, deixe tudo commitado e enviado. Nunca deixe trabalho só na cópia local.
- **Dependências:** só bibliotecas conhecidas e mantidas; ferramentas de teste e build como dependências de desenvolvimento. Peça aprovação antes de adicionar uma dependência de produção nova.

## Segurança e privacidade

- Nenhum segredo no repositório (chaves, tokens, senhas, IDs de conta da Cloudflare). Credenciais só no painel da Cloudflare, no `wrangler secret` ou nos segredos do GitHub Actions.
- Exemplos e testes com dados fictícios (nomes sugeridos do jogo: Ana, Bruno, Carla, Diego, Elisa, Fábio).
- O jogo guarda só apelidos; sem contas, analytics ou rastreamento (LGPD).
