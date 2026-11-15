# Senhorio – Fluxo do turno

> **Herdado do Senhorio para Roku (v1.0.1).** As regras valem para a versão web sem mudança. Referências a controle remoto, tecla ✱, OK, Voltar e ◀ ▶ descrevem a interface do Roku: na web elas viram ações de toque, mouse, teclado ou direcional, e o modo de vários dispositivos dispensa "passar o controle". A adaptação dos textos e telas acontece nas Etapas 1b e 2 (docs/09-roadmap.md).


O turno é uma máquina de estados: cada estado faz uma coisa, espera no máximo uma decisão do jogador e passa para o próximo. As referências RN-xxx e RP-xx apontam para o documento Regras de negócio.

## Visão geral

&#91;embedded content: máquina de estados do turno · 15 estados\]

O caminho comum desce pela coluna central até FIM\_TURNO; as exceções à direita sempre terminam o turno mais cedo. RESOLVER\_CASA também vai direto a POS\_RESOLUCAO quando a casa não tem efeito, e a CARTA pode levar à cobrança ou à prisão, como detalhado nas tabelas abaixo.

## Estados do turno

São 11 estados principais e 4 de exceção; 6 pedem uma escolha de verdade e 3 só pedem OK para seguir.

| Estado | O que acontece | Decisão do jogador | Próximo estado | Regras |
| --- | --- | --- | --- | --- |
| INICIO\_TURNO | Mostra “Vez de \[nome\]” para passar o controle | OK para começar | PRESO\_DECISAO se preso; senão PRE\_ROLAGEM | RN-010 |
| PRE\_ROLAGEM | Tela de rolar dados; menu ✱ liberado | Rolar ou abrir ✱ | ROLAR | RN-011 |
| PRESO\_DECISAO | Pergunta como sair da prisão; menu ✱ liberado, sem venda simples | Tentar dupla, pagar, usar carta ou abrir ✱ | ROLAR (tentar ou após pagar) ou FIM\_TURNO | RN-071 a RN-074 |
| ROLAR | Rola dois dados e conta duplas seguidas | Nenhuma | MOVER; IR\_PRISAO na 3ª dupla | RN-012, RN-015, RN-016 |
| MOVER | Anima o peão casa a casa; paga o bônus ao passar pela Partida | Nenhuma | RESOLVER\_CASA | RN-013 |
| RESOLVER\_CASA | Decide o efeito da casa de destino | Nenhuma | Conforme a tabela de resolução | RN-014 |
| DECISAO\_COMPRA | Mostra o cartão da propriedade | Comprar ou não comprar | POS\_RESOLUCAO | RN-032 a RN-034 |
| COBRANCA | Transfere aluguel, imposto ou valor de carta | Nenhuma | POS\_RESOLUCAO; LEVANTAR\_DINHEIRO se faltar dinheiro | RN-040, RN-020 |
| CARTA | Mostra a carta e aplica o efeito após OK | OK | MOVER, COBRANCA, IR\_PRISAO ou POS\_RESOLUCAO | RN-080 a RN-084 |
| POS\_RESOLUCAO | Menu ✱ liberado; mostra se há nova jogada | Jogar de novo, encerrar ou abrir ✱ | ROLAR se dupla; senão FIM\_TURNO | RN-015, RN-017 |
| FIM\_TURNO | Salva a partida, verifica o fim e escolhe o próximo jogador ativo | Nenhuma | INICIO\_TURNO ou FIM\_PARTIDA | RN-017, RN-018, RN-110 |
| IR\_PRISAO | Move o peão à casa 10 sem bônus e zera as duplas | Nenhuma | FIM\_TURNO | RN-070 |
| LEVANTAR\_DINHEIRO | Mostra quanto falta e as opções de vender casas e hipotecar | Vender, hipotecar ou declarar falência | Volta ao estado de origem; FALENCIA se não alcançar | RN-100 a RN-102 |
| FALENCIA | Transfere bens ao credor e retira o jogador | OK | FIM\_TURNO | RN-103 a RN-105 |
| FIM\_PARTIDA | Calcula o patrimônio e mostra a classificação | Jogar de novo ou sair | — | RN-110 a RN-114 |

## Resolução da casa

Em RESOLVER\_CASA o banco olha o tipo da casa de destino e a situação do dono; a primeira linha que se aplica decide o próximo estado.

| Casa de destino | Situação | Ação do banco | Próximo estado |
| --- | --- | --- | --- |
| Propriedade | Sem dono (banco) | Mostra o cartão de compra | DECISAO\_COMPRA |
| Propriedade | Do próprio jogador | Nada | POS\_RESOLUCAO |
| Propriedade | De outro, hipotecada | Nada (sem aluguel) | POS\_RESOLUCAO |
| Propriedade | De outro, dono preso com RP-03 ligada | Nada (sem aluguel) | POS\_RESOLUCAO |
| Propriedade | De outro, demais casos | Calcula o aluguel (rua, estação ou companhia) | COBRANCA |
| Imposto de Renda / Taxa de Luxo | — | Calcula o valor | COBRANCA |
| Sorte / Revés | — | Tira a carta do topo | CARTA |
| Vá para a prisão | — | — | IR\_PRISAO |
| Partida, Prisão (só visitando), Descanso | — | Nada (o bônus da Partida já foi pago em MOVER) | POS\_RESOLUCAO |

Uma carta pode encadear uma nova resolução: “vá para” ou “volte casas” leva a MOVER e depois a RESOLVER\_CASA de novo, sem limite de encadeamento.

## Interrupções

Quatro situações interrompem o fluxo normal; todas devolvem o controle a um ponto bem definido.

- **Falta de dinheiro:** qualquer cobrança (aluguel, imposto, carta, fiança obrigatória, juros de hipoteca recebida) maior que o caixa leva a LEVANTAR\_DINHEIRO. Se o jogador alcançar o valor, a cobrança é paga e o fluxo volta ao estado de origem; se não, vai a FALENCIA.
- **Menu ✱:** abre em PRE\_ROLAGEM, POS\_RESOLUCAO e PRESO\_DECISAO, sempre para o jogador da vez. Ações: construir, vender casas, hipotecar, resgatar, venda simples, abandonar e pausar. Em PRESO\_DECISAO não há venda simples (RN-075). Em DECISAO\_COMPRA, o ✱ só levanta dinheiro (vender casas e hipotecar, RN-033). Ao fechar, volta ao mesmo estado.
- **Venda simples:** dentro do menu ✱, a proposta abre a tela “Passe o controle para \[dono\]” e espera Aceitar ou Recusar; depois volta ao jogador da vez, no mesmo estado.
- **Fim da partida:** verificado só em FIM\_TURNO, nunca no meio de um turno. No modo tempo, o cronômetro zerado só encerra a partida quando a rodada em andamento termina; no modo rodadas, após a última rodada completa; em qualquer modo, quando resta um jogador.

O cronômetro do modo tempo fica parado enquanto o menu ✱ está aberto e enquanto a partida está salva e fechada.

## Salvamento e retomada

A partida é salva em um único ponto, FIM\_TURNO, e retomada sempre em INICIO\_TURNO do próximo jogador.

- **Quando salva:** ao entrar em FIM\_TURNO, depois de todas as transferências do turno. Nada é salvo no meio do turno, para nunca retomar com um pagamento pela metade.
- **O que salva:** jogadores (nome, cor, dinheiro, posição, preso e turnos na prisão, cartas guardadas, falido), dono, casas e hipoteca de cada propriedade, ordem dos dois baralhos, modo de partida, rodada atual, tempo restante e de quem é a próxima vez.
- **Onde salva:** no registro do aparelho (`roRegistry`), numa seção com o identificador técnico `tabuleiro`, nunca com o nome comercial.
- **Retomada:** a tela inicial oferece “Continuar partida” quando existe um salvamento; ao continuar, o jogo abre em INICIO\_TURNO de quem tinha a vez.
- **Turno interrompido:** se o app fechar no meio de um turno, esse turno é perdido e refeito do início pelo mesmo jogador.
- **Nova partida:** começar outra partida pede confirmação e apaga o salvamento anterior.

## Diretrizes para o motor de regras

O motor é código BrightScript puro, sem nós SceneGraph: recebe o estado e uma ação, devolve o novo estado e uma lista de eventos para a tela.

1. **Estado único e serializável.** Toda a partida vive em um objeto (associative array) que vira JSON sem perdas; é ele que o salvamento grava.
2. **Uma função de transição.** `Transicao(estado, acao)` valida a ação, aplica as regras e devolve `{estado, eventos}`. Ação inválida no estado atual é recusada com motivo, sem alterar nada.
3. **A tela só desenha e envia ações.** A interface não calcula aluguel nem decide regra; ela mostra o estado e transforma os botões do controle em ações (ex.: `COMPRAR`, `ROLAR`, `HIPOTECAR casa=24`).
4. **Eventos para animação.** Cada transição lista o que aconteceu, na ordem: `DadosRolados`, `PeaoMoveu`, `DinheiroTransferido`, `CartaRevelada`, `FoiPreso`, `Faliu`. A tela anima os eventos em sequência.
5. **Aleatoriedade injetável.** Dados e embaralhamento usam um gerador passado ao motor; nos testes, um gerador com resultados fixos reproduz qualquer cenário.
6. **Valores só do arquivo de regras.** Nenhum preço, aluguel ou parâmetro escrito no código; tudo vem do JSON, incluindo as regras próprias ligadas.
7. **Log em modo DEBUG.** Cada transição registra `[TURNO] estado anterior → ação → estado novo` no console, além dos logs de memória já existentes.
