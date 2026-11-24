# Senhorio Web – Plano de testes

Todas as etapas têm testes automáticos, e o CI no GitHub Actions roda tudo a cada push. Etapa com teste falhando não fecha. Os testes em aparelho real continuam manuais, com roteiro.

## Ferramentas

| Ferramenta | Testa | Onde fica |
| --- | --- | --- |
| Vitest | Motor: cenários CT, regras isoladas e validação do `rules.json` | `packages/engine/test/` |
| @vitest/coverage-v8 | Cobertura do motor | Relatório gerado pelo `pnpm test:coverage` |
| fast-check | Propriedades: milhares de partidas aleatórias conferindo invariantes | `packages/engine/test/` |
| @testing-library/svelte | Componentes da interface: cartão central, listas, foco e teclas | `apps/web/src/**/*.test.ts` |
| @cloudflare/vitest-plugin | Servidor das salas, no mesmo runtime da produção (workerd) | `apps/server/test/` |
| Playwright | Ponta a ponta: tamanhos de tela, só teclado, vários jogadores, offline | `e2e/` |
| @axe-core/playwright | Acessibilidade: contraste, rótulos e foco | `e2e/` |

Todas são dependências de desenvolvimento; nenhuma vai para o pacote que o jogador baixa.

## Cenários do motor

Os 45 cenários do Roku (CT-01 a CT-45, em docs/referencia-roku/plano-de-testes-roku.md) são portados com os mesmos números, para comparar os dois motores. Cenários novos começam em CT-46.

| Cenários | Onde | Situação |
| --- | --- | --- |
| CT-01 a CT-08 (turno e compra) | `packages/engine/test/turn.test.ts` | Passando |
| CT-09 a CT-17 (aluguel) | `packages/engine/test/rent.test.ts` | Passando |
| CT-18 a CT-23 (construção e hipoteca) | `packages/engine/test/building.test.ts` | Passando |
| CT-24 a CT-26 e CT-28 a CT-31 (prisão e cartas) | `packages/engine/test/jail-cards.test.ts` | Passando |
| CT-27, CT-32 a CT-38 e CT-45 (venda simples, dívida e falência) | `packages/engine/test/trade-debt.test.ts` | Passando |
| CT-39 a CT-42 (fim de partida e estado serializável) | `packages/engine/test/end.test.ts` | Passando |
| CT-43 (salvamento de outra versão das regras) | `apps/web/src/lib/save/save.test.ts` e `resume.test.ts` | Passando |
| CT-44 (regras inválidas) | `packages/engine/test/rules.test.ts` | Passando |
| CT-46 a CT-52 (cartas sem cenário no Roku) | `packages/engine/test/cards.test.ts` | Passando |
| CT-53 a CT-58 (remover jogador desconectado) | `packages/engine/test/remove.test.ts` | Passando |
| CT-59 a CT-66 (adversário do computador) | `packages/engine/test/opponent.test.ts` | Passando |

Cenários novos da web:

| CT | Regra | Cenário | Resultado esperado |
| --- | --- | --- | --- |
| CT-46 | RN-080 | Carta S-07 (receber do banco) | Recebe R$ 150 |
| CT-47 | RN-080 | Carta R-05 (pagar ao banco) | Paga R$ 50 |
| CT-48 | RN-080 | Carta S-12 (receber de cada jogador) com um falido | Cada ativo paga R$ 20; o falido fica de fora |
| CT-49 | RN-106 | Carta R-09 (pagar a cada jogador), com e sem dinheiro | Paga R$ 25 a cada um; sem dinheiro, dívida única com o banco como credor |
| CT-50 | RN-084 | Carta S-05 (estação mais próxima) a partir da casa 33 | Vai à casa 35 e resolve a compra |
| CT-51 | RN-083 | Carta S-14 (volte 3 casas) a partir da casa 17 | Vai à casa 14, sem bônus |
| CT-52 | RN-070 | Carta R-01 (vá para a prisão) | Vai à casa 10 sem bônus; o turno acaba |
| CT-53 | RN-115 | Remover jogador fora da vez dele | Bens voltam ao banco; a vez continua |
| CT-54 | RN-115 | Remover o jogador da vez (inclusive na compra) | O turno passa para o próximo |
| CT-55 | RN-115 | Remover quem está levantando dinheiro | Bens vão ao banco, sem pagar o credor; o turno acaba |
| CT-56 | RN-110 | Remover e sobrar um jogador | A partida acaba |
| CT-57 | RN-095 | Remover com venda simples pendente | A proposta é cancelada |
| CT-59 | Computador | Comprar guardando a reserva; reserva cresce com as casas dos outros | Compra ou recusa conforme a folga |
| CT-60 | Computador | Comprar o que completa ou bloqueia um grupo | Compra mesmo sem reserva |
| CT-61 | Computador | Construir e resgatar | Constrói no grupo completo e resgata com folga |
| CT-62 | Computador | Responder a uma venda simples | Não vende barato a peça que completa o grupo de quem propõe; compra pelo preço justo |
| CT-63 | Computador | Levantar dinheiro | Hipoteca a avulsa antes de vender casas |
| CT-64 | Computador | Prisão | Sai logo no começo ou com propriedade rendendo (RP-03); fica no fim sem nada para alugar |
| CT-65 | Computador | Propor a compra da rua que falta | Oferece acima do preço |
| CT-66 | Computador | Partidas inteiras só com o computador (40 sementes) | Toda decisão aceita, invariantes valem, a partida termina |
| CT-58 | RN-082, RN-110 | Remover e sobrar um jogador enquanto quem fica tem uma carta revelada | A partida acaba e a carta volta ao baralho (achado pelo teste de invariantes) |

O CT-42 do Roku gravava no registro do aparelho; na web, o motor confere que o estado vira JSON e volta igual, e a gravação no IndexedDB é testada na Etapa 3.

## Invariantes (fast-check)

Valem depois de qualquer sequência de ações válidas:

- Nenhum jogador ativo com dinheiro negativo fora de LEVANTAR_DINHEIRO.
- Cada propriedade tem no máximo um dono; propriedade do banco não tem casas nem hipoteca.
- Casas entre 0 e 5 (5 = hotel); diferença de casas no mesmo grupo nunca passa de 1 (RN-052).
- Propriedade hipotecada não tem casas em nenhuma rua do grupo (RN-061).
- O estado sempre vira JSON e volta igual.
- Ação recusada não muda o estado.

## Simulação e balanceamento

Situação: invariantes em `packages/engine/test/invariants.test.ts` (fast-check, 60 partidas de robôs e 60 partidas com ações ao acaso a cada execução); simulação em `packages/engine/test/simulation.test.ts`; balanceamento completo em `packages/engine/balance/` (fora do `pnpm test`), com o resultado registrado no docs/05.

As invariantes ficam em `packages/engine/src/sim/invariants.ts`. Além das listadas acima, conferem que cada carta está em um só lugar (baralho, mão de jogador ou revelada), que a vez nunca fica com um jogador falido fora da falência e que RAISE_MONEY sempre tem uma dívida aberta. Um teste de sanidade quebrou de propósito a construção uniforme: as invariantes acusaram o erro em segundos.

A simulação de partidas automáticas do Roku (`simular=200` e `balancear=50`) é portada como comando do pacote do motor. Com o mesmo `rules.json`, os números (duração, falências, primeiro grupo completo) devem ficar próximos da linha de base do Roku; diferença grande é tratada como bug até prova em contrário.

## Tamanhos de tela (Playwright)

| Perfil | Tamanho | Entrada |
| --- | --- | --- |
| Celular retrato | 390×844 | Toque |
| Tablet | 820×1180 e 1180×820 | Toque |
| Tablet deitado | 1024×768 (iPad deitado, notebooks antigos) | Toque |
| Desktop | 1440×900 | Mouse e só teclado |
| Salas (vários navegadores) | 1280×800 | Mouse, contra o `wrangler dev` |
| TV HD | 1280×720 | Só setas, Enter e Voltar |
| TV Full HD | 1920×1080 | Só setas, Enter e Voltar |

## Testes por etapa

| Etapa | Testes automáticos | Pronto quando |
| --- | --- | --- |
| 0 – Fundação | Um teste mínimo em cada pacote, lint e checagem de tipos no CI | CI verde |
| 1 – Motor | 45 CTs, invariantes, simulação e balanceamento | Todos passam; balanceamento próximo do Roku |
| 2 – Telas | Componentes; partida inteira no Playwright em cada perfil de tela | Todos passam; roteiro manual aprovado em celular, desktop e TV reais |
| 3 – PWA | Salvar e continuar; jogar com o navegador offline | Todos passam |
| 4 – Salas | Motor (CT-53 a CT-57, remoção de jogador); servidor (@cloudflare/vitest-plugin); sala com 3 navegadores, queda e volta de conexão | Todos passam; partida real com aparelhos diferentes |
| 5 – Publicação | Fumaça no endereço publicado; privacidade com axe nos 5 perfis | Jogo acessível pela internet; roteiro manual aprovado |
| 6 – Acabamento | Orientação e reserva 2D dos dados; 3D sob demanda nos 5 perfis | Fluido na TV e no celular mais fraco disponível |

## Testes da interface (Etapa 2)

| Teste | Onde | O que confere |
| --- | --- | --- |
| Narração dos eventos | `apps/web/src/lib/game/narrate.test.ts` | Histórico (H-xx) e avisos (M-xx) iguais ao catálogo |
| Controlador | `apps/web/src/lib/game/game.test.ts` | Ação aplicada no motor, vista ao fim dos eventos, recusa sem mudança, histórico de 3 linhas |
| Menu, construção e venda simples | `apps/web/src/lib/game/Decision.test.ts` | Opções desabilitadas com o motivo, escada de aluguel, construção uniforme, foco no Recusar, minimizar a proposta para ver o tabuleiro |
| Fluxo do início ao jogo | `apps/web/src/App.test.ts` | Início, jogadores, modo, ordem sorteada e primeira jogada |
| Ponta a ponta (6 perfis de tela) | `e2e/game.spec.ts` | Partida inteira de 20 rodadas só com Enter, acessibilidade (axe) em 5 telas, foco padrão, Voltar, abas do celular, painel lateral com espaço e Menu à vista, app instalado no iPhone (áreas seguras simuladas: cabeçalho abaixo da barra de status, abas abaixo do cartão e até o rodapé) |

Parâmetros de teste da interface: `?seed=N` reproduz os sorteios e `?speed=0` tira as esperas das animações e dos avisos.

## Roteiro manual em aparelho real

Navegador de TV e celular simples não se simulam com perfeição. A partir da Etapa 2, cada etapa de interface tem um roteiro curto (abrir, jogar uma partida, testar foco e leitura) a ser feito em pelo menos um celular, um computador e uma Smart TV com navegador. O roteiro é escrito na própria etapa.

### Roteiro da Etapa 2 (modo um aparelho)

Fazer em pelo menos um celular, um computador e uma Smart TV com navegador (a TV pelo controle remoto, sem mouse). Endereço: o do `pnpm dev` ou do `pnpm build` + `vite preview` na rede local, até a publicação na Etapa 5.

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | Abrir o jogo | Tela inicial legível; "Nova partida" em foco (anel dourado) |
| 2 | Nova partida → mudar para 3 jogadores, trocar um nome e uma cor | Cor já escolhida fica desabilitada; nome com até 10 letras |
| 3 | Escolher o modo Tempo, 30 min → Continuar → Começar partida | Ordem sorteada aparece; cronômetro no topo durante o jogo |
| 4 | Jogar 2 rodadas tocando nos botões (celular) ou só com OK e setas (TV) | Dados, peão andando casa a casa, avisos centrais que somem sozinhos ou com OK |
| 5 | Abrir o Menu e entrar em Construir, Hipotecar e Venda simples | Opções sem item possível desabilitadas com o motivo; Voltar sai sem confirmar |
| 6 | Esconder o cartão (botão – ou Voltar) e trazer de volta | Tabuleiro inteiro visível; "Voltar à decisão" traz o cartão |
| 7 | No celular, alternar as abas Tabuleiro e Jogadores | Lista com dinheiro e propriedades; a decisão continua por cima |
| 8 | Pausar pelo Menu e continuar | Cronômetro parado durante a pausa |
| 9 | Jogar até o fim (pode ser uma partida de 20 rodadas) | Tela de fim com a classificação e "Jogar de novo" |
| 10 | Conferir leitura a cerca de 3 m na TV | Textos, valores e o foco dourado legíveis |

Anote aparelho, navegador e o que estranhou; os ajustes entram antes da tag `v0.3-telas`.

### Testes da Etapa 3 (salvamento e PWA)

| Teste | Onde | O que confere |
| --- | --- | --- |
| Salvamento | `apps/web/src/lib/save/save.test.ts` | CT-42 (salvar e ler), CT-43 (outra versão), registro estranho, apagar, falha na gravação |
| Ponto de salvamento e retomada | `apps/web/src/lib/save/resume.test.ts` | Grava só no fim do turno, apaga no fim da partida, aviso I-87 uma vez, Continuar partida, confirmação D-22, CT-43 na tela inicial |
| Ponta a ponta | `e2e/pwa.spec.ts` | Continuar depois de recarregar (IndexedDB real), Salvar e sair, manifesto e ícones, jogar sem internet (service worker) |

### Roteiro da Etapa 3

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | Jogar 2 ou 3 turnos e fechar a aba no meio de um turno | Ao abrir de novo, "Continuar partida" com rodada, jogadores e "Salva há …" |
| 2 | Continuar | Volta no começo do turno de quem tinha a vez, com o mesmo dinheiro e as mesmas propriedades |
| 3 | Modo tempo: anotar o cronômetro, fechar e continuar | O cronômetro volta de onde estava no fim do último turno |
| 4 | Menu → Pausar → Salvar e sair | Volta à tela inicial com "Continuar partida" |
| 5 | Nova partida com uma salva | Pede confirmação; "Não, voltar" mantém a salva |
| 6 | No computador, pelo `localhost`: abrir, recarregar e desligar a internet | O jogo abre e funciona sem internet |
| 7 | No computador, pelo `localhost`: instalar pelo ícone da barra de endereço | Abre em janela própria, com o ícone do Senhorio |

Instalação e modo offline no celular só funcionam em https: ficam para depois da publicação (Etapa 5).

### Testes da Etapa 4 (vários aparelhos)

| Teste | Onde | O que confere |
| --- | --- | --- |
| Remoção de jogador no motor | `packages/engine/test/remove.test.ts` | CT-53 a CT-57: bens ao banco, vez passa, dívida e carta em andamento, venda simples cancelada, fim com um jogador |
| Protocolo | `packages/protocol/test/protocol.test.ts` | Código normalizado, mensagens validadas, ações do servidor recusadas, `actorsOf` |
| Servidor | `apps/server/test/rooms.test.ts` | Criar e consultar sala, entrar, cor e nome repetidos, só o anfitrião começa, só o jogador da vez age, queda e volta pelo token, remoção depois de 3 minutos, cronômetro do servidor, mensagens inválidas e em excesso |
| Ponta a ponta | `e2e/rooms.spec.ts` (perfil `salas`) | Três navegadores na mesma sala com o mesmo painel; queda pausa para todos e o aparelho volta pela tela inicial; código errado |
| Foco perdido | `e2e/game.spec.ts` | O OK devolve o foco à opção padrão (rede de segurança do controle remoto) |

### Roteiro da Etapa 4

Até a publicação (Etapa 5), as salas rodam no computador e os outros aparelhos entram pela rede local (Wi-Fi). Comandos no README, "Testar salas na rede local".

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | No computador: Criar sala → apelido, cor e modo → Criar sala | Sala de espera com o código grande e o botão de copiar |
| 2 | No celular: Entrar com código → digitar o código (minúsculas valem) | Cores já usadas aparecem indisponíveis; ao entrar, "Esperando Ana começar a partida." |
| 3 | No computador: Começar partida | Os dois aparelhos mostram o tabuleiro; a marca VOCÊ no próprio jogador |
| 4 | Jogar 2 rodadas | Só quem tem a vez vê os botões; os outros veem "Fulano está decidindo"; dados e peões iguais nos dois |
| 5 | Venda simples para o outro jogador | A proposta aparece só no aparelho de quem recebe |
| 6 | Fechar a aba no celular | No computador: "Partida pausada", "perdeu a conexão" e a contagem para remover |
| 7 | Abrir o jogo de novo no celular → "Voltar para a sala" → Continuar | A partida segue do mesmo ponto nos dois aparelhos |
| 8 | Fechar a aba de novo e esperar 3 minutos | No computador o botão "Remover" fica disponível; ao remover, os bens voltam ao banco |
| 9 | Jogar até o fim (modo rodadas curto) | Tela de fim nos dois; só o anfitrião vê "Jogar de novo com a mesma sala" |
| 10 | Pausar pelo menu em um aparelho | O outro vê a pausa; o cronômetro do modo tempo para |

Anote aparelho, navegador e o que estranhou; os ajustes entram antes da tag `v0.5-salas`.

### Testes da Etapa 5 (publicação)

| Teste | Onde | O que confere |
| --- | --- | --- |
| Privacidade e termos | `e2e/game.spec.ts` (5 perfis) | Link na tela inicial, página legível, sem problemas do axe, sem rolagem lateral, volta ao jogo |
| Fumaça no endereço publicado | `scripts/smoke.mjs`, no job `deploy` do CI | Saúde da API, tela inicial, manifesto, privacidade e sala inexistente (404) |

### Roteiro da Etapa 5

Fazer pelo endereço publicado (https), em pelo menos um celular, um computador e uma Smart TV.

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | Abrir o endereço no celular, fora do Wi-Fi de casa (dados móveis) | Tela inicial; nenhum aviso de site inseguro |
| 2 | Instalar: Android "Instalar app"; iPhone Compartilhar → "Adicionar à Tela de Início" | Ícone do Senhorio; abre em tela cheia |
| 3 | Abrir o app instalado em modo avião e jogar uma partida no modo um aparelho | Funciona sem internet |
| 4 | Criar uma sala no computador e entrar pelo celular com dados móveis | Partida com dois aparelhos em redes diferentes |
| 5 | Jogar algumas rodadas; fechar e reabrir o app no celular | Volta para a sala |
| 6 | Abrir "Privacidade e termos de uso" | Página legível, com volta ao jogo |
| 7 | Smart TV: abrir o endereço no navegador da TV e jogar com o controle | Igual à Etapa 2 |
| 8 | Publicar uma mudança (push na `main`) com o jogo instalado aberto | A tela inicial avisa da versão nova; nada recarrega no meio da partida |

Anote aparelho, navegador e o que estranhou; os ajustes entram antes da tag `v1.0`.

### Testes da Etapa 6 (dados em 3D)

| Teste | Onde | O que confere |
| --- | --- | --- |
| Orientação | `apps/web/src/lib/dice/orientation.test.ts` | A face sorteada termina para cima em qualquer giro, faces opostas somam 7, materiais na face certa, pulo começa e termina no chão |
| Quando usar | `apps/web/src/lib/dice/preference.test.ts` | Ligado com WebGL; 2D sem WebGL, com menos animação, depois de falha ou lentidão; escolha guardada; `?dice=2d` |
| Reserva 2D | `apps/web/src/lib/dice/Dice.test.ts` | Sem WebGL ou com falha da cena, os dados 2D continuam |
| Ponta a ponta (5 perfis) | `e2e/dice.spec.ts` | O 3D não é baixado na tela inicial; a jogada mostra os dados 3D; `?dice=2d` não baixa o 3D; desligar na tela inicial fica guardado |

### Roteiro da Etapa 6

Fazer pela versão da branch (rede local, como no roteiro da Etapa 4) e repetir pelo endereço publicado depois do merge.

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | Começar uma partida e rolar os dados | Dados 3D girando e parando nos números do texto ao lado |
| 2 | Jogar 3 ou 4 rodadas no celular mais simples disponível | Rolagem fluida; se travar, o jogo passa sozinho para os dados 2D nas próximas jogadas |
| 3 | Mesma coisa na Smart TV, com o controle | Rolagem fluida ou troca para 2D; o resto do jogo igual |
| 4 | Tela inicial: "Dados em 3D: ligados" → desligar | A partida usa os dados 2D; a escolha continua depois de fechar e abrir |
| 5 | Ativar "reduzir movimento" no sistema (acessibilidade) | Dados 2D, sem a opção de 3D na tela inicial |
| 6 | Depois de uma partida com 3D, abrir em modo avião | Dados 3D continuam funcionando |

Anote aparelho, navegador e o que estranhou; os ajustes entram antes do merge na `main`.

### Testes de sons e avisos (Etapa 6)

| Teste | Onde | O que confere |
| --- | --- | --- |
| Som de cada evento | `apps/web/src/lib/sound/events.test.ts` | Dados, carta, prisão, falência, fim; compra sem som de pagamento junto; dinheiro só no aparelho de quem recebe ou paga |
| Sons | `apps/web/src/lib/sound/synth.test.ts` | Silêncio sem Web Audio; notas de cada som; repetição seguida toca uma vez; desligado fica em silêncio |
| Aviso | `apps/web/src/lib/sound/alert.test.ts` | Vibra; com a aba à vista não mexe no título; em outra aba o título pisca até voltar; desligado não vibra |
| Quando avisar | `apps/web/src/lib/game/turn-alert.test.ts` | Só quando a decisão passa a ser deste aparelho, sem repetir; nunca no modo um aparelho |
| Ponta a ponta | `e2e/sound.spec.ts` (5 perfis) e `e2e/rooms.spec.ts` | Escolha guardada na tela inicial; jogada com som sem erro; título "Sua vez!" com a aba escondida |

### Roteiro de sons e avisos

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | Jogar 2 rodadas no modo um aparelho, com som | Sons curtos nos dados, compra, aluguel, cartas e prisão; nada alto ou irritante |
| 2 | Tela inicial: "Sons e vibração" → desligados | Partida em silêncio; a escolha continua depois de fechar e abrir |
| 3 | Sala com dois celulares; no celular que espera, abrir outra aba ou outro app | Quando chega a vez: o título da aba pisca "Sua vez!" e o celular vibra (Android) |
| 4 | Voltar para a aba do jogo | O título volta ao normal; a decisão está na tela |
| 5 | Mandar uma venda simples para o outro celular | O outro celular avisa (é a vez dele responder) |
| 6 | iPhone | Sons depois do primeiro toque; sem vibração (o iPhone não deixa sites vibrarem) |

### Testes de jogar contra o computador

| Teste | Onde | O que confere |
| --- | --- | --- |
| Estratégia do adversário | `packages/engine/test/opponent.test.ts` | CT-59 a CT-66 |
| Controlador | `apps/web/src/lib/game/bots.test.ts` | O computador joga a vez dele e devolve a decisão à pessoa; espera durante a pausa; cartão "está decidindo" com Pausar; marca COMPUTADOR; sem "Passe o aparelho" com uma pessoa só |
| Ponta a ponta (5 perfis) | `e2e/bots.spec.ts` | Partida inteira de 20 rodadas contra 3 computadores, a pessoa só com Enter; pelo menos uma pessoa (com axe); partida salva continua com o computador |

### Roteiro de jogar contra o computador

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | Nova partida → marcar dois jogadores como "Computador" | A escolha aparece em cada linha; todos como computador desabilita o Continuar com o aviso |
| 2 | Jogar 3 ou 4 rodadas | O computador joga sozinho, num ritmo dá para acompanhar; os avisos contam o que ele fez |
| 3 | Pausar na vez do computador | Ele para; ao continuar, segue de onde estava |
| 4 | Propor uma venda simples para o computador (preço baixo e preço alto) | Recusa a oferta baixa; aceita uma oferta boa |
| 5 | Jogar até o fim (modo rodadas curto) | O computador compra, constrói e negocia como um jogador de verdade, sem travar a partida |
| 6 | Fechar no meio e continuar | A partida volta com os mesmos jogadores do computador |
| 7 | Na TV, só com o controle | Apertar OK na vez do computador não pausa; as setas chegam ao Pausar |

### Testes do QR Code da sala

| Teste | Onde | O que confere |
| --- | --- | --- |
| Link e QR Code | `apps/web/src/lib/room/link.test.ts` | Link com o código; leitura do endereço (minúsculas, separadores, código inválido); código tirado da barra de endereço; QR Code desenhado com descrição; links diferentes, desenhos diferentes |
| Ponta a ponta | `e2e/rooms.spec.ts` (perfil `salas`) | QR Code na sala de espera; "Compartilhar link" copia o link certo; quem abre o link entra com o código preenchido e o código sai da barra de endereço; sem permissão para copiar, aparece o link para copiar à mão |

Pela rede local (`http://IP`), o navegador desliga a área de transferência e o menu de compartilhar (só funcionam em https ou `localhost`). O jogo então copia do jeito antigo e, se nem isso der, mostra o texto para copiar à mão. No endereço publicado (https), tudo funciona normalmente.

Conferência extra feita na implementação: as capturas de tela da sala de espera no celular e na TV foram decodificadas por um leitor de QR Code independente, com o link exato da sala.

### Roteiro do QR Code

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | Criar uma sala no computador ou na TV | QR Code grande, código e "Compartilhar link" |
| 2 | Apontar a câmera do celular (Android e iPhone) | Abre o jogo em "Entrar na sala" com o código preenchido |
| 3 | Escolher apelido e entrar | Aparece na sala de espera do outro aparelho |
| 4 | No celular que criou a sala: "Compartilhar link" | Abre o menu do sistema (WhatsApp, mensagens...) com o link |
| 5 | No computador: "Compartilhar link" | "Link copiado"; colar mostra o link da sala |

### Testes do modo mesa

| Teste | Onde | O que confere |
| --- | --- | --- |
| Servidor | `apps/server/test/rooms.test.ts`, `index.test.ts` | Criar com mesa devolve o token; a mesa entra sem lugar e comanda; não joga; se cai, a partida segue e os jogadores comandam; volta pelo token; só a mesa encerra e a sala some |
| Sons | `apps/web/src/lib/game/table-sounds.test.ts` | A mesa toca tudo; com mesa, o celular só o próprio dinheiro; sem mesa, como antes |
| Tela acesa | `apps/web/src/lib/ui/screen.test.ts` | Pede a trava, pede de novo ao voltar para a aba, solta no fim; sem suporte, nada quebra |
| Ponta a ponta | `e2e/table.spec.ts` (perfil `salas`) | A mesa cria (sem apelido), mostra QR Code e código sem compartilhar o link, dois celulares entram pelo link, só a mesa começa, a mesa mostra quem decide sem botões de jogada, pausa para todos e encerra com confirmação; a mesa recarregada volta como mesa; "Criar mesa" não aparece no celular |

### Roteiro do modo mesa

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | Na TV, notebook ou tablet: "Criar mesa" → modo → Criar mesa | Sala de espera com QR Code grande, código, aviso de que a mesa é para quem está presente, Começar, Tela cheia e Encerrar sala; sem Compartilhar link nem Copiar código; não pede apelido |
| 2 | No celular, abrir o jogo | "Criar mesa" não aparece |
| 3 | Dois ou três celulares entram pelo QR Code | A mesa mostra quem entrou; nos celulares, "Esperando a mesa começar a partida." |
| 4 | Começar pela mesa (controle, mouse ou toque) | Tabuleiro grande na mesa; decisões só no celular de quem tem a vez |
| 5 | Jogar algumas rodadas | Sons gerais na mesa; nos celulares, só o "sua vez" e o próprio dinheiro |
| 6 | Deixar a mesa parada por alguns minutos | A tela não apaga (onde o navegador permitir) |
| 7 | Tela cheia | Ocupa a tela toda; o mesmo botão (ou Esc) sai |
| 8 | Recarregar a página da mesa | "Voltar para a mesa" na tela inicial; Continuar volta à mesma sala |
| 9 | Fechar a mesa no meio da partida | A partida segue nos celulares; um jogador consegue remover quem cair |
| 10 | Mesa: Pausar → Encerrar sala → confirmar | Todos voltam à tela inicial; nos celulares, "A mesa encerrou a sala." |

### Testes do Como jogar

| Teste | Onde | O que confere |
| --- | --- | --- |
| Conteúdo | `apps/web/src/lib/help/HowToPlay.test.ts` | As oito seções; valores vindos do arquivo de regras; nenhum marcador sem valor; título h2 dentro da partida |
| Pausa | `apps/web/src/lib/game/bots.test.ts` | Com as regras abertas, o computador espera |
| Ponta a ponta (6 perfis) | `e2e/game.spec.ts` | Pela tela inicial e pelo "?" na partida; acessibilidade (axe), sem rolagem lateral; Voltar fecha |

### Roteiro do Como jogar

| # | Passo | Esperado |
| --- | --- | --- |
| 1 | Tela inicial → "Como jogar" | Regras em oito seções, legíveis no celular e na TV |
| 2 | Na TV, só com o controle | As setas rolam o texto; Voltar volta à tela inicial |
| 3 | Na partida, botão "?" no cabeçalho | As regras abrem por cima do tabuleiro; Fechar ou Voltar fecham |
| 4 | Contra o computador ou no modo tempo, abrir as regras | O computador e o cronômetro esperam até fechar |
| 5 | Numa sala, abrir as regras fora da vez | A partida segue normalmente para os outros |
