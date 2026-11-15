# Senhorio Web – Arquitetura técnica

A arquitetura segue a do Roku: a interface só desenha e envia ações; o motor de regras decide tudo; os dados vêm do arquivo de regras e do salvamento. A diferença é que o motor agora roda em dois lugares: no navegador (um dispositivo) e no servidor da sala (vários dispositivos).

## Visão geral

```
                 ┌──────────────────────────────┐
                 │ packages/engine (TS puro)    │
                 │ transition(state, action,ctx)│
                 │ → { ok, state, events, ...}  │
                 └──────┬────────────────┬──────┘
                        │                │
        um dispositivo  │                │  vários dispositivos
                        ▼                ▼
┌────────────────────────────┐   ┌──────────────────────────────┐
│ apps/web (navegador)       │   │ apps/server (Cloudflare)     │
│ Svelte: telas e animações  │◄──┤ Worker: site e roteamento    │
│ motor local + IndexedDB    │ WS│ Durable Object por sala:     │
│ PWA offline                ├──►│ motor + estado + SQLite      │
└────────────────────────────┘   └──────────────────────────────┘
```

- **Um dispositivo:** a interface chama o motor diretamente e salva o estado no IndexedDB.
- **Vários dispositivos:** a interface envia a ação pela conexão WebSocket; o Durable Object da sala valida quem enviou, chama o mesmo motor, grava o estado e transmite o estado novo e os eventos a todos os jogadores. Os dados são sorteados no servidor, sem trapaça possível pelo navegador.
- **Não há informação secreta** no jogo (tudo à vista), então o servidor manda o mesmo estado para todos.

## Estrutura de pastas

Monorepo com pnpm workspaces. Nomes técnicos em inglês.

```
senhorio-web/
├── apps/
│   ├── web/                  ← Svelte 5 + Vite + PWA (interface)
│   │   └── src/
│   │       ├── lib/          ← componentes, telas, foco e entrada
│   │       └── main.ts
│   └── server/               ← Cloudflare Worker + Durable Objects (salas)
│       ├── src/
│       │   ├── index.ts      ← Worker: serve o site e roteia /room
│       │   └── room.ts       ← Durable Object: uma sala
│       └── wrangler.jsonc
├── packages/
│   └── engine/               ← motor de regras, sem dependência de navegador
│       ├── src/
│       │   ├── engine.ts     ← transition(state, action, ctx)
│       │   ├── state.ts      ← tipos e criação do estado
│       │   ├── rent.ts  building.ts  mortgage.ts  jail.ts
│       │   ├── cards.ts  trade.ts  debt.ts  random.ts
│       │   └── rules/        ← rules.json e validação
│       └── test/             ← CTs, propriedades e simulação
├── e2e/                      ← testes Playwright
├── docs/                     ← documentação em PT-BR
├── .github/workflows/ci.yml
├── CLAUDE.md  README.md
└── package.json  pnpm-workspace.yaml  tsconfig.base.json
```

## Tecnologias

| Camada | Escolha | Motivo |
| --- | --- | --- |
| Linguagem | TypeScript (modo estrito) | Tipagem no estado, nas ações e nos eventos |
| Gerenciador de pacotes | pnpm (workspaces) | Monorepo simples e instalação rápida |
| Build | Vite | Padrão do mercado |
| Interface | Svelte 5 | Pacote pequeno e rápido em TV e celular |
| Tabuleiro e animações | SVG/CSS + Web Animations API | Leve, nítido em qualquer resolução, fiel aos mockups |
| 3D (acabamento) | Three.js carregado sob demanda | Só nos dados (e talvez casas e hotéis), com reserva 2D |
| PWA | vite-plugin-pwa | Instalável e offline no modo de um dispositivo |
| Salvamento local | IndexedDB | Substitui o registro do Roku |
| Servidor | Cloudflare Workers + Durable Objects (SQLite), WebSocket com hibernação | Plano gratuito; sala ociosa não consome tempo de execução |
| Validação de dados | Esquema em TypeScript para o `rules.json` e para as mensagens da sala | Recusar arquivo ou mensagem inválida com motivo claro |
| Qualidade | ESLint, Prettier, `tsc --noEmit` | Mesmo padrão em todos os pacotes |

As versões exatas ficam nos `package.json` e só mudam com teste passando. Restrição conhecida: TypeScript na 6.0, a mais nova aceita pelo typescript-eslint.

O Worker (`apps/server`) serve o site gerado por `apps/web` (`apps/web/dist`) e responde primeiro só nas rotas `/api/*`; por isso `@senhorio/web` é dependência de desenvolvimento do servidor, o que garante que o site seja gerado antes no `pnpm build`. A telemetria do Wrangler fica desligada (`send_metrics: false`).

## Motor de regras

As diretrizes do docs/03-fluxo-do-turno.md continuam valendo, traduzidas para TypeScript:

1. **Estado único e serializável.** A partida inteira é um objeto que vira JSON sem perdas.
2. **Uma função de transição.** `transition(state, action, ctx)` devolve `{ ok, state, events, reason }`. Ação inválida é recusada com motivo e não muda o estado. O estado recebido nunca é alterado.
3. **A interface só desenha e envia ações.** Nenhum cálculo de regra fora do motor.
4. **Eventos para animação**, na ordem em que acontecem.
5. **Aleatoriedade injetável.** Dados e embaralhamento usam um gerador passado em `ctx`; nos testes, um gerador com resultados fixos.
6. **Valores só do arquivo de regras.** Nenhum preço, aluguel ou parâmetro no código.
7. **Sem dependência de plataforma.** O motor não usa APIs de navegador nem da Cloudflare, para rodar igual nos dois lados e nos testes.

Ações, eventos, fases e chaves do JSON passam a ter nomes em inglês (por exemplo `ROLL` → `ROLL_DICE`, `DadosRolados` → `DiceRolled`, `dinheiroInicial` → `startingMoney`). A tabela de correspondência com os nomes do Roku é criada na Etapa 1 e fica neste documento.

## Salas (vários dispositivos)

| Item | Definição |
| --- | --- |
| Código | 6 caracteres de um alfabeto de 32 sem letras ambíguas (sem 0/O e 1/I): cerca de 1 bilhão de combinações |
| Criação | Qualquer jogador cria; quem criou é o anfitrião (escolhe o modo de partida, inicia e pode remover jogador desconectado) |
| Entrada | Só pelo código, antes do início; depois do início, só reconexão de quem já estava |
| Identidade | Apelido + token aleatório gerado pelo servidor e guardado no navegador; sem conta |
| Autoridade | O servidor aceita de cada jogador só as ações que cabem a ele (a vez dele, ou a resposta a uma venda simples dirigida a ele) |
| Persistência | Estado gravado no SQLite do Durable Object em FIM_TURNO, como no Roku |
| Queda de conexão | Partida pausa; depois de {minutosParaRemover}, o anfitrião pode remover o jogador (RN-115) |
| Expiração | Sala apagada ao fim da partida ou depois de um tempo sem atividade (alarme do Durable Object) |
| Proteção | Limite de tentativas de entrada e de tamanho e frequência de mensagens; nenhuma listagem de salas |

O protocolo de mensagens entre navegador e sala é definido e documentado na Etapa 4.

## Salvamento

| Modo | Onde | Quando |
| --- | --- | --- |
| Um dispositivo | IndexedDB do navegador | Em FIM_TURNO, como no Roku; a partida terminada é apagada |
| Vários dispositivos | SQLite do Durable Object da sala | Em FIM_TURNO; o navegador guarda só o código da sala e o token |

O salvamento guarda a versão do arquivo de regras. Se a versão mudar, o jogo avisa e oferece só "Nova partida", como no Roku.

## Segurança e privacidade

| Risco | Medida |
| --- | --- |
| Segredos no repositório | Nenhuma chave, token ou senha no Git; credenciais da Cloudflare só no painel, no `wrangler secret` ou nos segredos do GitHub Actions |
| Trapaça no modo de vários dispositivos | Motor e sorteio só no servidor; cada ação validada contra o jogador que enviou |
| Entrada indevida em sala | Código longo, limite de tentativas, entrada fechada depois do início, expiração |
| Dados pessoais (LGPD) | Só apelidos; sem conta, sem rastreamento, sem analytics; sala apagada ao fim; política de privacidade publicada na Etapa 5 |
| Dependências de terceiros | Só bibliotecas conhecidas e mantidas; atualizações automáticas revisadas antes de entrar |
| Propriedade intelectual | Nome, regras, valores, textos e arte próprios; fontes com licença aberta (SIL OFL) |

## Convenções de código

- **Idioma:** pastas, arquivos, nomes no código, ações, eventos e chaves do JSON em inglês; comentários em PT-BR; textos do jogo em PT-BR (no arquivo de regras).
- **Nomes:** funções e variáveis em camelCase (`calculateRent`), tipos e componentes em PascalCase (`GameState`, `PlayerPanel.svelte`), constantes em maiúsculas (`MAX_PLAYERS`).
- **Um arquivo, um assunto.** Módulos do motor expõem funções puras.
- **Comentários** explicam o porquê e citam a regra: `// RN-052: construção uniforme`.
- **Commits** pequenos por funcionalidade, em PT-BR no imperativo ("Adiciona cálculo de aluguel de estações"); uma tag por etapa.
