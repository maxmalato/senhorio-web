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
| Desktop | 1440×900 | Mouse e só teclado |
| TV HD | 1280×720 | Só setas, Enter e Voltar |
| TV Full HD | 1920×1080 | Só setas, Enter e Voltar |

## Testes por etapa

| Etapa | Testes automáticos | Pronto quando |
| --- | --- | --- |
| 0 – Fundação | Um teste mínimo em cada pacote, lint e checagem de tipos no CI | CI verde |
| 1 – Motor | 45 CTs, invariantes, simulação e balanceamento | Todos passam; balanceamento próximo do Roku |
| 2 – Telas | Componentes; partida inteira no Playwright em cada perfil de tela | Todos passam; roteiro manual aprovado em celular, desktop e TV reais |
| 3 – PWA | Salvar e continuar; jogar com o navegador offline | Todos passam |
| 4 – Salas | Servidor (@cloudflare/vitest-plugin); sala com 3 ou mais navegadores, queda e volta de conexão, remoção de jogador | Todos passam; partida real com aparelhos diferentes |
| 5 – Publicação | Fumaça no endereço publicado; acessibilidade | Jogo acessível pela internet |
| 6 – Acabamento | Desempenho do 3D com reserva 2D | Fluido na TV e no celular mais fraco disponível |

## Testes da interface (Etapa 2)

| Teste | Onde | O que confere |
| --- | --- | --- |
| Narração dos eventos | `apps/web/src/lib/game/narrate.test.ts` | Histórico (H-xx) e avisos (M-xx) iguais ao catálogo |
| Controlador | `apps/web/src/lib/game/game.test.ts` | Ação aplicada no motor, vista ao fim dos eventos, recusa sem mudança, histórico de 3 linhas |
| Menu, construção e venda simples | `apps/web/src/lib/game/Decision.test.ts` | Opções desabilitadas com o motivo, escada de aluguel, construção uniforme, foco no Recusar |
| Fluxo do início ao jogo | `apps/web/src/App.test.ts` | Início, jogadores, modo, ordem sorteada e primeira jogada |
| Ponta a ponta (5 perfis de tela) | `e2e/game.spec.ts` | Partida inteira de 20 rodadas só com Enter, acessibilidade (axe) em 5 telas, foco padrão, Voltar, abas do celular |

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

