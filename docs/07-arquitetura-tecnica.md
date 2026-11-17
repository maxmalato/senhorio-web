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
| 3D (acabamento) | Three.js 0.187, carregado sob demanda | Só nos dados, com reserva 2D (ver "Dados em 3D") |
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
| Código | 6 caracteres de um alfabeto de 32 sem letras ambíguas (sem 0/O e 1/I): cerca de 1 bilhão de combinações. Aceito com minúsculas, espaços, traços ou ponto |
| Criação | `POST /api/rooms` com o modo de partida; quem entra primeiro é o anfitrião (inicia, começa outra partida no fim e pode remover jogador desconectado) |
| Entrada | Só pelo código, antes do início; depois do início, só reconexão de quem já estava |
| Identidade | Apelido + token aleatório gerado pelo servidor e guardado no navegador (`localStorage`, chave `senhorio:room`); o servidor guarda só o hash SHA-256 do token; sem conta |
| Autoridade | O servidor roda o motor, sorteia os dados e aceita de cada aparelho só as ações que cabem a ele (`actorsOf`: a vez dele, a resposta a uma venda simples dirigida a ele, o levantamento de dinheiro da dívida dele). `START_TURN`, `TIME_UP` e `REMOVE_PLAYER` só o servidor aplica |
| Persistência | Estado da sala gravado no armazenamento SQLite do Durable Object a cada mudança |
| Queda de conexão | Partida pausa para todos, e o cronômetro do modo tempo também; depois de 3 minutos o anfitrião pode remover o jogador; se o anfitrião também estiver fora, qualquer jogador conectado pode. A remoção devolve os bens ao banco (RN-115) |
| Expiração | Sala apagada depois de 12 horas sem atividade (alarme do Durable Object) |
| Proteção | Criar sala: 10 por minuto; consultar código: 60 por minuto (por endereço, melhor esforço); mensagens de até 4 KB e até 40 a cada 10 s por aparelho; nenhuma listagem de salas |

Convite: a sala de espera mostra um QR Code com o link `/?sala=CÓDIGO` e o botão "Compartilhar link" (menu de compartilhar do sistema no celular; no computador, copia o link). O QR Code é gerado no próprio aparelho com a biblioteca `uqr` (sem serviço de fora) e desenhado como SVG. Quem abre o link vai direto para "Entrar na sala" com o código preenchido; o jogo tira o código da barra de endereço assim que o lê (`apps/web/src/lib/room/link.ts`).

### Modo mesa

Uma tela grande (TV, notebook, computador ou tablet) cria a sala como **mesa**: mostra o tabuleiro para todos e não joga; cada pessoa joga pelo próprio celular.

| Item | Definição |
| --- | --- |
| Quem vê "Criar mesa" | Só telas com o lado menor a partir de 600 px (`LARGE_SCREEN_QUERY`); celulares não veem |
| Presencial | A sala de espera da mesa mostra o QR Code e o código, sem "Compartilhar link" nem "Copiar código", e avisa que quem está longe deve usar uma sala normal. A sala continua privada pelo código; o jogo não confere se todos estão na mesma rede (bloquearia celulares nos dados móveis e redes IPv6, e exigiria guardar o endereço de internet da mesa) |
| Internet | Mesmo na mesma rede Wi-Fi, todos os aparelhos falam com o servidor do jogo na internet: a mesa não funciona numa rede local sem internet |
| Criar | `POST /api/rooms { mode, table: true }` devolve `{ code, tableToken }`; a mesa entra com `hello { token }` e recebe `welcome { seat: TABLE_SEAT }` (-2). O servidor guarda só o hash do token; a mesa volta pelo mesmo token se recarregar |
| Lugar | A mesa não ocupa lugar de jogador (continuam até 6 jogadores) e não pode mandar ações do jogo (`tableCannotPlay`) |
| Quem comanda | Numa sala com mesa, `host` é `TABLE_SEAT`: a mesa começa, pausa, remove quem caiu e começa outra partida. Se a mesa cair, a partida **não** pausa e qualquer jogador conectado passa a comandar |
| Encerrar | Só a mesa (`close`), com confirmação ("Não, voltar" em foco); todos recebem `roomClosed`, voltam à tela inicial e a sala é apagada. Os jogadores só saem (`leave`) |
| Tela da mesa | Tabuleiro grande, jogadores, código da sala, dados e avisos; o cartão "Fulano está decidindo" diz que as decisões aparecem no celular dele. Cabeçalho com Nomes, Tela cheia e Pausar; sem menu de jogador nem dicas de teclado |
| Sons | A mesa toca todos os sons; com mesa, os celulares tocam só o "sua vez" e o próprio dinheiro |
| Tela acesa | Wake Lock enquanto a mesa estiver na sala, pedido de novo ao voltar para a aba; sem suporte, o jogo segue sem ele |
| Tela cheia | Botão na sala de espera e no cabeçalho da partida (Fullscreen API); some onde o navegador não oferece |

As constantes ficam em `packages/protocol` (`REMOVE_AFTER_MS`, `ROOM_TTL_MS`, `MAX_MESSAGE_BYTES`, `MESSAGE_LIMIT`), usadas pelo servidor e pela interface.

### Rotas

| Rota | O que faz |
| --- | --- |
| `GET /api/health` | Teste de saúde |
| `POST /api/rooms` | Corpo `{ "mode": { "type": "rounds", "limit": 30 } }`; devolve `201 { "code" }` |
| `GET /api/rooms/:code` | Situação da sala antes de entrar: fase, lugares ocupados e cores usadas; `404` se não existe |
| `GET /api/rooms/:code/ws` | WebSocket da sala (encaminhado ao Durable Object da sala) |

Todas as outras rotas servem o site (`apps/web/dist`), com a página inicial como reserva (aplicativo de página única).

### Protocolo (WebSocket, JSON)

Navegador → sala (`ClientMessage`; tudo passa por `parseClientMessage` antes de ser usado):

| Mensagem | Quando |
| --- | --- |
| `hello { name, color }` | Entrar na sala de espera |
| `hello { token }` | Voltar depois de uma queda (mesma aba ou "Voltar para a sala" na tela inicial) |
| `start` | Anfitrião começa a partida (2 ou mais jogadores, todos conectados) |
| `action { action }` | Uma ação do motor (docs/07, "Ações"), exceto as do servidor |
| `hello { token }` (mesa) | A mesa entra com o token recebido ao criar a sala |
| `pause { paused }` | Pausar ou continuar pelo menu (ou pela mesa) |
| `remove { seat }` | Remover jogador (na espera: o anfitrião, a qualquer momento; na partida: depois de 3 minutos sem conexão) |
| `again` | Anfitrião volta todos à sala de espera no fim da partida |
| `leave` | Sair da sala |
| `close` | Modo mesa: a mesa encerra a sala para todos |

Sala → navegador (`ServerMessage`):

| Mensagem | Conteúdo |
| --- | --- |
| `welcome { seat, token }` | Lugar deste aparelho e o token para voltar (vazio quando só o lugar mudou de número) |
| `room { room }` | Fotografia da sala (`RoomView`: código, fase, anfitrião, lugares, modo, pausa, cronômetro, relógio do servidor e estado da partida) |
| `update { room, events, by }` | Depois de uma ação: a sala nova e os eventos do motor, que cada aparelho anima igual ao modo um aparelho |
| `error { code }` | Recusa: `notFound`, `gameStarted`, `roomFull`, `colorTaken`, `nameTaken`, `invalidName`, `notYourTurn`, `tooManyRequests`, `removed`, `unknownToken`, `badMessage` e outras; a interface mostra os textos W-xx do catálogo |

### Desenvolvimento local

O `wrangler dev` (porta 8787) roda o Worker e as salas localmente, sem conta da Cloudflare, e serve o último build do site. O `vite` (`pnpm dev`) encaminha `/api` para a porta 8787, então a interface com recarga automática conversa com as salas locais. Os testes do servidor rodam no mesmo runtime da produção (workerd) com `@cloudflare/vitest-plugin`; o Playwright sobe os dois servidores sozinho.

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

## Como jogar

| Item | Definição |
| --- | --- |
| Onde | `apps/web/src/lib/help/HowToPlay.svelte`; textos A-01 a A-09 no `rules.json` (cada seção: título e lista de linhas) |
| Valores | Preenchidos pelos parâmetros do arquivo de regras (dinheiro inicial, fiança, impostos, aluguéis de estação, multiplicadores das companhias, casas, hipoteca, propostas por turno): mudou o valor, o resumo acompanha |
| Acesso | Tela inicial ("Como jogar", no rodapé) e, na partida, o botão "?" do cabeçalho, em todos os modos (inclusive na mesa), a qualquer momento |
| Pausa | No modo um aparelho, com as regras abertas, o cronômetro do modo tempo e o computador esperam (`Game.helpOpen`); nas salas, nada muda para os outros |
| Teclado e controle | O foco vai para o texto: as setas rolam; Voltar (Esc) fecha |

## Jogar contra o computador

| Item | Definição |
| --- | --- |
| Onde | Motor: `packages/engine/src/ai/opponent.ts` (`opponentDecision`, `decidingPlayer`, `fallbackActions`). Interface: `Game` (`isBot`, `canAct`, `handoff`), tela de jogadores e `Decision.svelte` |
| Quem é computador | `bot: true` no jogador (`NewGameConfig` e estado da partida); vai junto no salvamento. O motor não trata o computador de forma diferente: as regras são as mesmas |
| Escopo | Só no modo um aparelho, com pelo menos uma pessoa. As salas de vários aparelhos não têm computador |
| Estratégia | Compra guardando uma reserva (maior quando os outros têm casas); compra sem reserva o que completa o grupo dele ou impede outro de completar; constrói e resgata hipotecas com folga; de vez em quando propõe comprar a rua que falta num grupo; não vende barato a rua que completaria o grupo de outra pessoa; na dívida, hipoteca primeiro o que não é de grupo completo, depois vende casas; sai logo da prisão no começo da partida ou quando tem propriedade rendendo (com a RP-03, o dono preso não cobra aluguel); só fica preso no fim, sem nada para alugar. Os números ficam em `OPPONENT` (estratégia, não regra do jogo) |
| Sem trapaça | Só usa o que todos veem no tabuleiro; os dados continuam sorteados pelo motor |
| Força | Contra 3 robôs da simulação (que decidem ao acaso), ganhou 142 de 300 partidas (47%; 25% seria o acaso) |
| Ritmo | O computador "pensa" 900 ms antes de cada decisão (500 ms com menos animação; 0 nos testes) e espera durante a pausa ou com o menu aberto |
| Segurança | Se o motor recusasse a decisão (não deveria), o computador tenta uma ação segura da fase; a partida nunca para esperando por ele |
| Interface | Na vez do computador, o cartão mostra "Fulano está decidindo" e "O computador está jogando", com o botão Pausar (o foco fica no aviso, para o OK do controle não pausar sem querer). A marca COMPUTADOR aparece no painel. Sem "Passe o aparelho" quando só uma pessoa joga |

## Dados em 3D

| Item | Definição |
| --- | --- |
| Onde | `apps/web/src/lib/dice/`: `orientation.ts` (matemática), `dice3d.ts` (cena Three.js), `preference.ts` (quando usar), `load.ts` (carregamento), `Dice.svelte` (componente) |
| Resultado | Sempre do motor: a animação só gira cada dado até a face sorteada ficar para cima (faces opostas somam 7). Os sorteios do giro são só visuais |
| Carregamento | Import dinâmico: o Three.js vai no arquivo `assets/dice3d-*.js` (~130 KB comprimido), baixado no começo da partida, nunca na tela inicial. O pacote principal cresce cerca de 1 KB |
| Sem internet | O service worker não baixa esse arquivo na instalação; ele entra no cache (`senhorio-dice3d`) na primeira partida e depois funciona sem internet |
| Desempenho | Uma cena só, reaproveitada; desenha só durante a animação (sem laço contínuo); resolução até 2× |
| Reserva 2D | Sem WebGL, com "menos animação" pedido no sistema, falha ao baixar ou montar a cena, contexto WebGL perdido, ou quadros lentos (média acima de 50 ms na jogada: o aparelho passa a usar 2D) |
| Escolha do jogador | "Dados em 3D: ligados/desligados" na tela inicial (só aparece se o aparelho pode usar 3D), guardada no aparelho (`localStorage`, chave `senhorio:dice`) |
| Testes | `?dice=2d` e `?dice=3d` forçam um dos dois |

## Sons e aviso de "sua vez"

| Item | Definição |
| --- | --- |
| Onde | `apps/web/src/lib/sound/`: `events.ts` (evento → som), `synth.ts` (sons), `alert.ts` (aviso de "sua vez"), `preference.ts` |
| Sons | Gerados pelo navegador (Web Audio): notas curtas e ruídos filtrados, sem arquivos de áudio e sem biblioteca. Dados, moeda (recebe), pagamento, compra, construção, carta, prisão, falência, fim de partida e "sua vez" |
| Quem ouve o quê | Modo um aparelho: tudo. Vários aparelhos: dinheiro só no aparelho de quem recebe ou paga; o resto em todos |
| Repetição | O mesmo som em menos de 120 ms toca uma vez só (vários pagamentos seguidos) |
| Liberação do áudio | Os navegadores só tocam som depois do primeiro toque ou tecla; o áudio é liberado nesse momento (`unlockAudioOnFirstGesture`, em `main.ts`) |
| "Sua vez" | Só no modo de vários aparelhos, quando a decisão passa a ser deste aparelho (a vez dele, uma proposta para ele, uma dívida dele; `actorsOf`): som, vibração (`navigator.vibrate`, nos celulares que permitem) e, com a aba escondida, o título pisca "Sua vez! · Senhorio" até a pessoa voltar. Sem notificações do sistema: nada a autorizar |
| Escolha do jogador | "Sons e vibração: ligados/desligados" na tela inicial, ligado por padrão (`localStorage`, chave `senhorio:sound`); o título da aba avisa mesmo com os sons desligados |

## Publicação

| Item | Definição |
| --- | --- |
| Endereço | `jogo.<subdomínio da conta>.workers.dev` (nome do Worker `jogo` no `wrangler.jsonc`; plano gratuito; sem endereços de prévia: `preview_urls: false`). Trocar o nome do Worker cria outro Worker, com outras salas; o antigo é apagado à mão no painel |
| Quando publica | A cada push na `main`, pelo job `deploy` do CI, só depois de lint, tipos, testes, build e e2e passarem; nunca em pull request |
| Como | `pnpm --filter @senhorio/web build` e `wrangler deploy` (Worker, Durable Objects e site de `apps/web/dist` juntos) |
| Credenciais | Segredos do repositório `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`; o GitHub esconde os valores nos registros |
| Conferência | `scripts/smoke.mjs` (`pnpm smoke` com `SITE_URL`) no endereço publicado: saúde da API, tela inicial, manifesto, privacidade e sala inexistente; não cria salas |
| Renovação do token | O token vence 1 ano depois de criado (novembro de 2027): criar outro no mesmo modelo e trocar o segredo `CLOUDFLARE_API_TOKEN` |
| Desfazer | Painel da Cloudflare → Workers & Pages → jogo → Deployments → versão anterior → Rollback; ou reverter o commit na `main` |

Limites do plano gratuito que importam ao jogo (conferidos em novembro de 2026; podem mudar):

| Recurso | Limite por dia | Uso do jogo |
| --- | --- | --- |
| Requisições ao Worker | 100 mil (zera à meia-noite UTC) | Abrir o site, consultar e criar salas; arquivos do site em cache no aparelho depois do primeiro acesso |
| Requisições aos Durable Objects | 100 mil, contando mensagens do WebSocket e alarmes | Uma partida de 4 jogadores e 30 rodadas usa da ordem de mil mensagens |
| Linhas gravadas no SQLite | 100 mil | Uma gravação por mudança na sala |
| Armazenamento | 5 GB no total | Salas pequenas, apagadas em 12 horas |

Ao passar de um limite, o plano gratuito recusa as requisições até o dia seguinte, sem cobrança; o modo um aparelho continua funcionando pelo service worker. Fontes: [limites dos Workers](https://developers.cloudflare.com/workers/platform/limits/), [preços dos Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/).

O limite de tentativas por endereço (criar 10 salas e consultar 60 códigos por minuto) é por instância do Worker, de melhor esforço. Se houver abuso, a troca natural é a [vinculação de Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) da Cloudflare, depois de confirmar que está no plano gratuito.

## Segurança e privacidade

| Risco | Medida |
| --- | --- |
| Segredos no repositório | Nenhuma chave, token, senha ou ID de conta no Git; credenciais da Cloudflare só no painel, no `wrangler secret` ou nos segredos do GitHub Actions |
| Token de publicação | Modelo "Edit Cloudflare Workers" restrito à conta, validade de 1 ano, sem filtro de IP (o GitHub Actions muda de endereço); se vazar, revogar em My Profile → API Tokens |
| Trapaça no modo de vários dispositivos | Motor e sorteio só no servidor; cada ação validada contra o jogador que enviou |
| Entrada indevida em sala | Código longo, limite de tentativas, entrada fechada depois do início, expiração |
| Dados pessoais (LGPD) | Só apelidos; sem conta, sem cookies, sem rastreamento, sem analytics; registros de acesso do Worker desligados (`observability.enabled: false`); IP só na memória, por cerca de 1 minuto, para o limite de tentativas; sala apagada depois de 12 horas sem atividade; política de privacidade e termos em `/privacidade.html` |
| Dependências de terceiros | Só bibliotecas conhecidas e mantidas; atualizações automáticas revisadas antes de entrar |
| Propriedade intelectual | Nome, regras, valores, textos e arte próprios; fontes com licença aberta (SIL OFL) |

## Convenções de código

- **Idioma:** pastas, arquivos, nomes no código, ações, eventos e chaves do JSON em inglês; comentários em PT-BR; textos do jogo em PT-BR (no arquivo de regras).
- **Nomes:** funções e variáveis em camelCase (`calculateRent`), tipos e componentes em PascalCase (`GameState`, `PlayerPanel.svelte`), constantes em maiúsculas (`MAX_PLAYERS`).
- **Um arquivo, um assunto.** Módulos do motor expõem funções puras.
- **Comentários** explicam o porquê e citam a regra: `// RN-052: construção uniforme`.
- **Commits** pequenos por funcionalidade, em PT-BR no imperativo ("Adiciona cálculo de aluguel de estações"); uma tag por etapa.
