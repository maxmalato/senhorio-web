# Senhorio Web – Roadmap

Cada etapa termina com testes passando, commit e tag. Uma etapa só começa quando a anterior fechou, com exceção da 1b, que corre em paralelo com a 1.

## Situação

| Etapa | Situação | Tag |
| --- | --- | --- |
| 0 – Fundação | Concluída | `v0.1-fundacao` |
| 1 – Motor em TS | Concluída | `v0.2-motor` |
| 1b – Mockups (HTML) | Concluída (rodadas 1 e 2 aprovadas; celular em pé: variação B) | — |
| 2 – Telas (um dispositivo) | Concluída (aprovada no celular e no computador) | `v0.3-telas` |
| 3 – PWA e salvamento | Concluída | `v0.4-pwa` |
| 4 – Vários dispositivos | Concluída (testada com aparelhos diferentes na rede local) | `v0.5-salas` |
| 5 – Publicação | Concluída (publicada e testada em aparelhos reais) | `v1.0` |
| 6 – Acabamento | Em andamento (branch `develop/dados-3d`) | `v1.1` |

Atualize esta tabela sempre que uma etapa começar ou fechar.

## Etapa 0 – Fundação

Deixa o projeto pronto para receber código.

- `CLAUDE.md`, `README.md` e documentos em `docs/` (visão, arquitetura, testes, roadmap; regras herdadas do Roku).
- Monorepo pnpm com `packages/engine`, `apps/web` e `apps/server`, ainda sem lógica de jogo.
- TypeScript estrito, ESLint, Prettier e as ferramentas de teste configuradas, com um teste mínimo em cada pacote.
- CI no GitHub Actions: instalação, lint, tipos, testes e build.

**Pronto quando:** CI verde na `main`.

## Etapa 1 – Motor em TypeScript

Porta o motor do Roku (`source/motor/` e `source/servicos/Regras.brs`) para `packages/engine`.

| Parte | Conteúdo | Situação |
| --- | --- | --- |
| 1 | `rules.json` com chaves em inglês, tipos, validação na carga (CT-44) e correspondência de nomes no docs/07 | Concluída |
| 2 | Estado, `transition()`, as 15 fases do turno, dados, movimento, compra e aluguel | Concluída |
| 3 | Prisão, cartas, construção e hipoteca | Concluída |
| 4 | Venda simples, dívidas, falência e fim de partida (clássico, tempo e rodadas) | Concluída |
| 5 | Invariantes (fast-check), simulação e balanceamento comparado com o Roku | Concluída |

As Partes 2 a 4 foram feitas juntas: no motor do Roku a cobrança já depende da dívida, a dívida da construção e da hipoteca, e o aluguel por carta (CT-17) das cartas.

- `rules.json` com chaves em inglês e os mesmos valores e textos do `regras.json` v1, mais a validação na carga.
- `transition(state, action, ctx)` com as 15 fases, módulos de regra e gerador injetável.
- Tabela de correspondência de nomes Roku → web no docs/07.
- 45 CTs, invariantes com fast-check, simulação e balanceamento.

**Pronto quando:** todos os testes passam e o balanceamento fica próximo da linha de base do Roku.

## Etapa 1b – Mockups

Em paralelo com a Etapa 1. Feitos em HTML (`docs/mockups/web/`), publicados como página privada no claude.ai, e não no Figma: o plano gratuito do Figma limita o conector a poucas chamadas por mês, e em HTML o layout responsivo pode ser visto no próprio celular e na Smart TV.

- Identidade visual do Roku adaptada à web (cores, fontes Fredoka e Nunito, logo).
- Tela de jogo em celular retrato, tablet, desktop e TV.
- Telas novas: escolha do modo de jogo, criar sala, entrar com código, sala de espera, jogador desconectado e pausa.
- Componentes: cartão central, botões, listas, painel de jogadores, dados.
- Novo docs/06-telas-e-mockups.md com o inventário de telas.

**Pronto quando:** mockups aprovados pelo dono do projeto.

## Etapa 2 – Telas (um dispositivo)

- Telas e componentes seguindo os mockups, tabuleiro em SVG/CSS e animações.
- Toque, mouse, teclado e direcional, com o mesmo modelo de foco do Roku.
- Partida inteira de um dispositivo, do início ao fim.

**Pronto quando:** testes de componente e Playwright passam em todos os perfis de tela e o roteiro manual é aprovado em aparelhos reais.

## Etapa 3 – PWA e salvamento

- Salvamento em IndexedDB em FIM_TURNO e "Continuar partida".
- PWA instalável e offline no modo de um dispositivo; ícones e tela de abertura.

**Pronto quando:** a partida é retomada depois de fechar o navegador, inclusive sem internet.

## Etapa 4 – Vários dispositivos

- Worker e Durable Object por sala, com o motor no servidor.
- Criar sala, entrar com código, sala de espera, início pelo anfitrião.
- Reconexão por token, pausa por queda, remoção pelo anfitrião, expiração da sala.
- Protocolo de mensagens documentado no docs/07.

**Pronto quando:** testes do servidor e do Playwright com vários navegadores passam e uma partida real com aparelhos diferentes é concluída.

## Etapa 5 – Publicação

- Deploy na Cloudflare (`*.workers.dev`) pelo CI, com credenciais só nos segredos do GitHub.
- Conferência dos limites do plano gratuito, limites de tentativas e expiração das salas.
- Política de privacidade e termos de uso.

**Pronto quando:** o jogo está acessível pela internet dentro do plano gratuito.

## Etapa 6 – Acabamento

- Dados em 3D com Three.js carregado sob demanda e reserva 2D; casas e hotéis em 3D se valer a pena.
- Ajustes vindos das partidas reais.

**Pronto quando:** fluido na TV e no celular mais fraco disponível.
