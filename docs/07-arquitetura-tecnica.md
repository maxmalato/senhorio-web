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

Ações, eventos, fases e chaves do JSON passam a ter nomes em inglês. A correspondência com os nomes do Roku está na seção abaixo.

## Correspondência de nomes: Roku → web

O arquivo `packages/engine/src/rules/rules.json` foi gerado a partir do `source/data/regras.json` v1 do Roku por conversão automática, que conferiu a mesma quantidade de casas, cartas e textos e os mesmos valores numéricos. Os textos em português não mudaram; só as chaves e os marcadores.

### Arquivo de regras

| Roku | Web |
| --- | --- |
| `versao` | `version` |
| `parametros` | `parameters` |
| `modos` | `modes` |
| `regrasProprias` (`ativa`, `descricao`) | `houseRules` (`active`, `description`) |
| `grupos` (`nome`, `cor`, `custoCasa`, `posicoes`) | `groups` (`name`, `color`, `houseCost`, `positions`) |
| `casas` (`posicao`, `tipo`, `nome`, `rotulo`, `grupo`, `preco`, `aluguel`, `parametro`) | `spaces` (`position`, `type`, `name`, `label`, `group`, `price`, `rent`, `taxParameter`) |
| `cartas` (`sorte`, `reves`) | `cards` (`chance`, `setback`) |
| carta: `id`, `titulo`, `efeito`, `acao` | `id`, `title`, `effect`, `action` |
| `textos` | `texts` |
| `textos.nomesPadrao` | `texts.defaultNames` |

### Parâmetros

| Roku | Web | Roku | Web |
| --- | --- | --- | --- |
| `dinheiroInicial` | `startingMoney` | `fatorHipoteca` | `mortgageFactor` |
| `bonusPartida` | `passStartBonus` | `jurosHipoteca` | `mortgageInterest` |
| `fianca` | `bail` | `passoVenda` | `tradeStep` |
| `turnosMaxPrisao` | `maxJailTurns` | `passoVendaRapido` | `tradeStepFast` |
| `impostoRenda` | `incomeTax` | `maxPropostasTurno` | `maxProposalsPerTurn` |
| `taxaLuxo` | `luxuryTax` | `maxDuplasSeguidas` | `maxConsecutiveDoubles` |
| `estacao` | `stationRent` | `facesDado` | `diceFaces` |
| `multCompanhia` | `utilityMultiplier` | `cartasPorBaralho` | `cardsPerDeck` |
| `maxCasas` | `maxHouses` | `aluguelAltoMensagem` | `highRentThreshold` |
| `multGrupoCompleto` | `fullGroupMultiplier` | `duracaoMensagemMs` | `messageDurationMs` |
| `fatorVendaCasa` | `houseSaleFactor` | `minJogadores` / `maxJogadores` | `minPlayers` / `maxPlayers` |
| | | `tamanhoMaxNome` | `maxNameLength` |

### Modos, grupos e tipos de casa

| Roku | Web |
| --- | --- |
| Modos `classico`, `tempo` (`opcoesMin`, `padraoMin`), `rodadas` (`opcoes`, `padrao`) | `classic`, `time` (`optionsMinutes`, `defaultMinutes`), `rounds` (`options`, `default`) |
| Grupos `marrom`, `azulClaro`, `rosa`, `laranja` | `brown`, `lightBlue`, `pink`, `orange` |
| Grupos `vermelho`, `amarelo`, `verde`, `azulEscuro` | `red`, `yellow`, `green`, `darkBlue` |
| Casas `partida`, `rua`, `estacao`, `companhia`, `imposto` | `start`, `street`, `station`, `utility`, `tax` |
| Casas `sorte`, `reves`, `prisao`, `descanso`, `vaParaPrisao` | `chance`, `setback`, `jail`, `rest`, `goToJail` |

### Cartas

| Roku (`acao.tipo`) | Web (`action.type`) | Campos |
| --- | --- | --- |
| `receberBanco` | `receiveFromBank` | `valor` → `amount` |
| `pagarBanco` | `payToBank` | `valor` → `amount` |
| `receberCadaJogador` | `collectFromEachPlayer` | `valor` → `amount` |
| `pagarCadaJogador` | `payEachPlayer` | `valor` → `amount` |
| `irPara` | `goTo` | `destino` → `destination`, `paraTras` → `backward` |
| `estacaoMaisProxima` | `nearestStation` | — |
| `andar` | `move` | `casas` → `spaces` |
| `irPrisao` | `goToJail` | — |
| `reparos` | `repairs` | `porCasa` → `perHouse`, `porHotel` → `perHotel` |
| `saiaPrisao` | `getOutOfJailFree` | — |

### Textos

Os códigos (D-xx, M-xx, H-xx, I-xx) não mudam. Campos dos textos com opções: `texto` → `text`, `opcoes` → `options`, `subtitulo` → `subtitle`, `dica` → `hint`, `motivoDesabilitado` → `disabledReason`, `textoVender` → `sellText`, `depois` → `after`, `limite` → `limit`.

Marcadores dentro dos textos (`{jogador}` vira `{player}`):

| Roku | Web | Roku | Web | Roku | Web |
| --- | --- | --- | --- | --- | --- |
| `jogador` | `player` | `casa` | `property` | `valor` | `amount` |
| `jogadores` | `players` | `casas` | `houses` | `valores` | `amounts` |
| `dono` | `owner` | `qtdCasas` | `houseCount` | `dinheiro` | `money` |
| `comprador` | `buyer` | `propriedades` | `properties` | `hipoteca` | `mortgage` |
| `credor` | `creditor` | `grupo` | `group` | `fianca` | `bail` |
| `vencedor` | `winner` | `posicao` | `position` | `soma` | `sum` |
| `de` / `para` | `from` / `to` | `modo` | `mode` | `acao` | `action` |
| `passo` | `step` | `rapido` | `fastStep` | `titulo` | `title` |

Iguais nos dois: `n`, `min`, `max`, `total`, `d1`, `d2`, `mult1`, `mult2`.

### Fases do turno

| Roku | Web | Roku | Web |
| --- | --- | --- | --- |
| `INICIO_TURNO` | `TURN_START` | `CARTA` | `CARD` |
| `PRE_ROLAGEM` | `PRE_ROLL` | `POS_RESOLUCAO` | `POST_RESOLUTION` |
| `PRESO_DECISAO` | `JAIL_DECISION` | `FIM_TURNO` | `TURN_END` |
| `ROLAR` | `ROLL` | `IR_PRISAO` | `GO_TO_JAIL` |
| `MOVER` | `MOVE` | `LEVANTAR_DINHEIRO` | `RAISE_MONEY` |
| `RESOLVER_CASA` | `RESOLVE_SPACE` | `FALENCIA` | `BANKRUPTCY` |
| `DECISAO_COMPRA` | `PURCHASE_DECISION` | `FIM_PARTIDA` | `GAME_OVER` |
| `COBRANCA` | `COLLECTION` | | |

### Ações (interface → motor)

| Roku | Web | Parâmetros na web |
| --- | --- | --- |
| `COMECAR_TURNO` | `START_TURN` | — |
| `ROLAR` | `ROLL_DICE` | — |
| `PAGAR_FIANCA` / `USAR_CARTA_SAIDA` | `PAY_BAIL` / `USE_JAIL_CARD` | — |
| `COMPRAR` / `NAO_COMPRAR` | `BUY` / `DECLINE_PURCHASE` | — |
| `CONFIRMAR` | `CONFIRM` | — |
| `ENCERRAR_TURNO` | `END_TURN` | — |
| `CONSTRUIR` / `VENDER_CASA` | `BUILD` / `SELL_HOUSE` | `position` |
| `HIPOTECAR` / `RESGATAR` | `MORTGAGE` / `REDEEM` | `position` |
| `PROPOR_VENDA` | `PROPOSE_TRADE` | `direction` (`buy` ou `sell`), `position`, `amount`, `otherPlayer` |
| `RESPONDER_VENDA` | `RESPOND_TRADE` | `accept` |
| `DECLARAR_FALENCIA` | `DECLARE_BANKRUPTCY` | — |
| `ABANDONAR` | `QUIT` | — |
| `TEMPO_ESGOTADO` | `TIME_UP` | — |

### Eventos (motor → interface)

| Roku | Web | Roku | Web |
| --- | --- | --- | --- |
| `OrdemSorteada` | `OrderDrawn` | `Faliu` | `WentBankrupt` |
| `DadosRolados` | `DiceRolled` | `PartidaTerminou` | `GameOver` |
| `PeaoMoveu` | `PawnMoved` | `OfertaCompra` | `PurchaseOffered` |
| `DinheiroTransferido` | `MoneyTransferred` | `PropriedadeNaoComprada` | `PurchaseDeclined` |
| `PropriedadeMudouDeDono` | `PropertyOwnerChanged` | `AluguelIsento` | `RentExempt` |
| `CasasMudaram` | `HousesChanged` | `FiancaObrigatoria` | `MandatoryBail` |
| `HipotecaMudou` | `MortgageChanged` | `DividaAberta` | `DebtOpened` |
| `CartaRevelada` | `CardRevealed` | `PropostaEnviada` | `TradeProposed` |
| `FoiPreso` | `Jailed` | `PropostaRespondida` | `TradeAnswered` |
| `SaiuDaPrisao` | `ReleasedFromJail` | `TempoEsgotado` | `TimeUp` |
| `TurnoEncerrado` | `TurnEnded` | | |

### Estado da partida

| Roku | Web | Roku | Web |
| --- | --- | --- | --- |
| `versaoRegras` | `rulesVersion` | `jogadores` | `players` |
| `fase` | `phase` | `propriedades` | `properties` |
| `modo` (`tipo`, `limite`, `tempoEsgotado`) | `mode` (`type`, `limit`, `timeUp`) | `baralhos` (`sorte`, `reves`) | `decks` (`chance`, `setback`) |
| `rodada` | `round` | `cartaAtual` (`id`, `baralho`) | `currentCard` (`id`, `deck`) |
| `vez` / `ordem` | `turn` / `order` | `pendente` | `pending` |
| `duplasSeguidas` | `consecutiveDoubles` | `classificacao` | `ranking` |
| `ultimosDados` | `lastDice` | `novaJogada` / `semNovaJogada` | `extraRoll` / `noExtraRoll` |
| `chegouPorCarta` | `arrivedByCard` | `propostasNoTurno` | `proposalsThisTurn` |
| jogador: `nome`, `cor`, `dinheiro`, `posicao` | `name`, `color`, `money`, `position` | jogador: `preso`, `turnosPreso`, `cartasSaida` | `inJail`, `jailTurns`, `jailCards` |
| jogador: `falido`, `rodadaSaida` | `bankrupt`, `exitRound` | propriedade: `dono`, `casas`, `hipotecada` | `owner`, `houses`, `mortgaged` |

Pendências: cobrança `{ tipo: "cobranca", fila, retorno, divida, falencia }` virou `{ type: "collection", queue, returnTo, debt, bankruptcy }`; proposta `{ tipo: "proposta", sentido ("comprar"/"vender"), posicao, valor, proponente, outro }` virou `{ type: "trade", direction ("buy"/"sell"), position, amount, proposer, other }`. O banco continua sendo `-1` (`BANK`).

### Motivos de recusa e de transferência

Recusas vêm como `{ code, ... }` (no Roku, `{ codigo, ... }`). Principais códigos: `faltaDinheiro` → `insufficientFunds` (`amount`), `acaoInvalidaNaFase` → `invalidActionForPhase`, `partidaTerminada` → `gameOver`, `propostaPendente` → `tradePending`, `semProposta` → `noTrade`, `semNovaJogada` / `temNovaJogada` → `noExtraRoll` / `hasExtraRoll`, `semSaida` → `noWayOut`, `dividaCobrivel` → `debtCoverable` (`max`), `grupoIncompleto` → `incompleteGroup`, `grupoHipotecado` → `mortgagedGroup`, `temHotel` → `hasHotel`, `construcaoUniforme` / `vendaUniforme` → `unevenBuilding` / `unevenSale`, `semCasas` → `noHouses`, `naoEhRua` → `notStreet`, `naoEhDono` → `notOwner`, `jaHipotecada` / `naoHipotecada` → `alreadyMortgaged` / `notMortgaged`, `grupoComCasas` → `groupHasHouses`, `semCartaSaida` → `noJailCard`, `limitePropostas` → `proposalLimit`, `presoNaoNegocia` → `jailedCannotTrade`, `alvoInvalido` → `invalidTarget`, `propriedadeNaoNegociavel` → `propertyNotTradable`, `valorInvalido` → `invalidAmount` (`min`, `max`), `posicaoInvalida` → `invalidPosition`, `modoSemTempo` → `modeWithoutTimer`. Novo na web: `invalidMode` (modo tempo ou rodadas sem limite válido).

Motivos de transferência: `bonusPartida` → `passStart`, `compra` → `purchase`, `aluguel` → `rent`, `imposto` → `tax`, `carta` → `card`, `fianca` → `bail`, `construcao` → `building`, `vendaCasa` → `houseSale`, `hipoteca` → `mortgage`, `resgate` → `redeem`, `vendaSimples` → `trade`, `falencia` → `bankruptcy`, `jurosHipoteca` → `mortgageInterest`. Isenção de aluguel: `hipotecada` → `mortgaged`, `donoPreso` → `ownerInJail`. Ida à prisão: `tresDuplas` → `threeDoubles`, `casa` → `space`, `carta` → `card`. Saída da prisão: `dupla` → `doubles`, `fiancaObrigatoria` → `mandatoryBail`, `fianca` → `bail`, `carta` → `card`.

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

Modo um dispositivo (Etapa 3, `apps/web/src/lib/save/`):

- **Onde:** IndexedDB do navegador, banco `senhorio`, tabela `saves`, chave `current`. Uma partida por navegador; nada sai do aparelho.
- **Registro:** `{ format, rulesVersion, savedAt, state, secondsLeft }`. `format` muda só se a estrutura do registro mudar; `secondsLeft` guarda o cronômetro do modo tempo, que fica na interface, fora do motor.
- **Quando grava:** ao começar a partida e a cada evento `TurnEnded` (FIM_TURNO), depois de todas as transferências. A partida terminada é apagada. "Salvar e sair" na pausa volta ao início; o turno em andamento é refeito do começo, como no Roku.
- **Falha:** sem IndexedDB (alguns modos privados) ou com erro de gravação, o jogo segue e mostra uma vez "Não foi possível salvar" (I-87).
- **Retomada:** "Continuar partida" mostra rodada, jogadores, modo e há quanto tempo foi salva; nova partida com uma salva pede confirmação (D-22).

## PWA

- **Ferramenta:** `vite-plugin-pwa` (Workbox). O service worker guarda no aparelho todos os arquivos do jogo, inclusive as fontes (cerca de 700 KB), e o modo um dispositivo funciona sem internet depois do primeiro acesso.
- **Atualização:** `registerType: "prompt"`. A versão nova fica esperando e a tela inicial mostra "Há uma versão nova do jogo · Atualizar agora". O jogo nunca recarrega sozinho no meio de uma partida.
- **Manifesto:** nome Senhorio, `display: standalone`, cor azul-noite, ícones de 192 e 512 px e ícone "maskable" com margem para o Android, gerados a partir da logo (`apps/web/public/icons/`).
- **Limite do navegador:** service worker e instalação só funcionam em https ou em `localhost`. Pela rede local (`http://192.168...`), o jogo e o salvamento funcionam, mas não a instalação nem o modo offline; no celular, isso é testado depois da publicação (Etapa 5).

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
