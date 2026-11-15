# Senhorio – Catálogo de decisões do banco

> **Herdado do Senhorio para Roku (v1.0.1).** As regras valem para a versão web sem mudança. Referências a controle remoto, tecla ✱, OK, Voltar e ◀ ▶ descrevem a interface do Roku: na web elas viram ações de toque, mouse, teclado ou direcional, e o modo de vários dispositivos dispensa "passar o controle". A adaptação dos textos e telas acontece nas Etapas 1b e 2 (docs/09-roadmap.md).


Cada pergunta que o banco faz tem um código (D-01 em diante), o texto exato da tela, as opções com a que vem em foco e a consequência. O tom é misto: direto nas decisões, bem-humorado nas cartas e nos resultados.

## Tom de voz e convenções

As perguntas são curtas e neutras; o humor aparece só depois da decisão, nas cartas e nas mensagens de resultado.

| Elemento | Regra | Exemplo |
| --- | --- | --- |
| Pergunta | Direta, até 45 caracteres, sempre com o nome do jogador | Ana, quer comprar esta propriedade? |
| Botão | Verbo no infinitivo, até 22 caracteres, com valor quando houver | Comprar por R$ 240 |
| Título de cartão | Até 30 caracteres | Rua das Palmeiras |
| Resultado | Uma frase, até 60 caracteres, pode ter humor | Bruno pagou R$ 180 a Ana. Doeu. |
| Carta | Título com humor + efeito em linguagem direta | Seu aniversário! Cada jogador lhe dá R$ 20. |

Convenções de interação:

- **Foco padrão:** a opção mais comum e segura vem em foco. Quando a escolha é irreversível e afeta outro jogador (aceitar venda, abandonar), o foco vai para a opção que não muda nada.
- **Botão Voltar:** nunca confirma nada. Em decisões obrigatórias, esconde o cartão para ver o tabuleiro e, apertado de novo, o traz de volta. Em menus, fecha e retorna ao estado anterior.
- **Opção desabilitada:** aparece esmaecida, com o motivo na linha de baixo (ex.: “Faltam R$ 40”), e o foco pula sobre ela.
- **Variáveis nos textos:** {jogador}, {dono}, {valor}, {casa}, {qtdCasas} e, quando o texto depende de um parâmetro, {max} ou {fianca}. Nenhum número de regra fica escrito no texto: ele vem dos parâmetros do regras.json. Valores sempre no formato R$ 1.234, sem centavos (texto I-13 e separador I-14).
- **Todos os textos ficam no arquivo de regras**, com o código da decisão, para revisar sem mexer no código.

## Decisões do turno

Um turno comum sem compra custa 3 cliques de OK: começar, rolar e encerrar. A opção em foco aparece em negrito.

| Código | Estado | Texto da tela | Opções | Consequência |
| --- | --- | --- | --- | --- |
| D-01 | INICIO\_TURNO | Vez de {jogador} · Passe o controle para {jogador} | **Começar** | PRE\_ROLAGEM, ou D-05 se estiver preso |
| D-02 | PRE\_ROLAGEM | {jogador}, sua vez de jogar | **Rolar dados** · ✱ Menu | ROLAR; o menu abre D-10 |
| D-03 | POS\_RESOLUCAO, com dupla | Dupla! Jogue de novo, {jogador} | **Rolar de novo** · ✱ Menu | ROLAR (RN-015) |
| D-04 | POS\_RESOLUCAO, sem dupla | {jogador}, algo mais antes de passar a vez? | **Encerrar turno** · ✱ Menu | FIM\_TURNO (RN-017) |

O menu ✱ não é um botão na tela: é a tecla ✱ do controle, indicada no rodapé da tela.

## Prisão, compra e cartas

São as decisões que aparecem no meio do turno; só a compra tem dinheiro em jogo e por isso mostra preço e aluguel antes da escolha.

| Código | Estado | Texto da tela | Opções | Consequência |
| --- | --- | --- | --- | --- |
| D-05 | PRESO\_DECISAO | {jogador}, você está preso ({n}ª tentativa de {max}) | **Tentar dupla** · Pagar {fianca} · Usar carta · ✱ Menu | Tentar: rola (RN-073). Pagar ou carta: sai e rola (RN-072) |
| D-06 | PRESO\_DECISAO, 3ª tentativa falhou | Sem dupla de novo. Fiança obrigatória de {valor} | **Pagar e andar** | Paga e anda a soma (RN-074); sem dinheiro, vai a D-19 |
| D-07 | DECISAO\_COMPRA | {jogador}, quer comprar esta propriedade? | **Comprar por {valor}** · Não comprar | Comprar: paga e vira dono. Não comprar: fica com o banco (RN-034) |
| D-08 | DECISAO\_COMPRA, sem dinheiro | {jogador}, quer comprar esta propriedade? | Comprar (desabilitado: “Faltam {valor}”) · **Não comprar** · ✱ Levantar dinheiro | O menu permite hipotecar ou vender casas e voltar a D-07 (RN-033) |
| D-09 | CARTA | Título da carta + efeito | **OK** | Aplica o efeito (RN-080) |

No D-05, “Usar carta” só aparece para quem tem a carta Saia da prisão. O cartão de compra mostra preço, aluguel básico, grupo e quantas ruas do grupo o jogador já tem.

## Menu ✱

O menu abre só para o jogador da vez, em D-02, D-03, D-04, D-05 e D-08; cada ação mostra o efeito em dinheiro antes de confirmar. No D-05 (preso), “Venda simples” fica desabilitada com o motivo (RN-075).

| Código | Tela | Texto da tela | Opções | Consequência |
| --- | --- | --- | --- | --- |
| D-10 | Menu principal | O que você quer fazer, {jogador}? | **Construir** · Vender casas · Hipotecar · Resgatar · Venda simples · Pausar · Abandonar | Abre a tela escolhida; ações sem item possível ficam desabilitadas com o motivo |
| D-11 | Construir | Onde construir? Casa custa {valor} | Lista de ruas permitidas (▲ ▼), **Construir** · Concluir | Mostra a escada de aluguel antes e depois; só lista ruas que respeitam a construção uniforme (RN-052) |
| D-12 | Vender casas | Vender casa por {valor}? | Lista de ruas com casas, **Vender** · Concluir | Recebe 50% do custo (RN-054) |
| D-13 | Hipotecar | Hipotecar {casa} por {valor}? | Lista de propriedades sem casas no grupo, **Hipotecar** · Concluir | Recebe 50% do preço; deixa de cobrar aluguel (RN-060 a RN-062) |
| D-14 | Resgatar | Resgatar {casa} por {valor}? | Lista de hipotecadas, **Resgatar** · Concluir | Paga hipoteca + 10% (RN-063) |
| D-15 | Pausa | Jogo pausado | **Continuar** · Salvar e sair | Para o cronômetro; salvar e sair grava a partida no ponto do último turno concluído |
| D-16 | Abandonar | {jogador}, sair da partida? Seus bens voltam ao banco | **Não, continuar** · Sim, abandonar | Sim: jogador sai (RN-115). Foco no Não para evitar saída acidental |

## Venda simples

A proposta tem 3 passos para quem propõe (tipo, propriedade, valor), mais a escolha do comprador quando o jogador vende, e 1 para quem responde; a troca de controle é sempre anunciada na tela.

| Código | Tela | Texto da tela | Opções | Consequência |
| --- | --- | --- | --- | --- |
| D-17a | Tipo de proposta | Comprar ou vender? | **Comprar de alguém** · Vender para alguém | Lista só propriedades elegíveis (RN-092) |
| D-17b | Escolher propriedade | Qual propriedade? | Lista com dono e preço de tabela (▲ ▼), **OK** | Jogadores presos não aparecem (RN-090) |
| I-49 | Escolher comprador (só ao vender) | Para quem vender {casa}? | Lista dos jogadores que podem negociar (▲ ▼), **OK** | Presos e falidos não aparecem (RN-075) |
| D-17c | Escolher valor | Quanto oferecer por {casa}? (ao vender: Por quanto vender {casa}?) | ◀ ▶ ajusta R$ 10 (segurando, R$ 50), **Enviar proposta** · Cancelar | Valor inicial = preço de tabela; limite = dinheiro de quem paga (RN-093) |
| D-18 | Resposta | Passe o controle para {dono} · {jogador} oferece {valor} por {casa} (ao vender: {jogador} quer vender {casa} por {valor}) | **Recusar** · Aceitar | Aceitar: transfere na hora (RN-095). Foco no Recusar para evitar aceite acidental |

Depois da resposta, a tela pede “Devolva o controle para {jogador}” e volta ao estado de onde o menu foi aberto. Na terceira proposta do turno, a opção aparece desabilitada com “Limite de 2 propostas por turno” (RN-096).

## Dívidas e falência

A tela de dívida mostra sempre quanto falta e quanto o jogador ainda consegue levantar; a falência só é oferecida quando não há saída.

| Código | Estado | Texto da tela | Opções | Consequência |
| --- | --- | --- | --- | --- |
| D-19 | LEVANTAR\_DINHEIRO | {jogador}, faltam {valor} para pagar {credor} | **Vender casas** · Hipotecar · Declarar falência | Abre D-12 ou D-13 em modo dívida; paga sozinho quando o caixa alcança o valor (RN-100, RN-101) |
| D-19b | LEVANTAR\_DINHEIRO, sem saída | Mesmo vendendo tudo, faltam {valor} | **Declarar falência** | Vai a D-20 (RN-102) |
| D-20 | FALENCIA | {jogador} faliu. Os bens vão para {credor} | **OK** | Transfere bens e retira o jogador (RN-103 a RN-105) |

Em D-19, “Declarar falência” fica desabilitado enquanto vender casas e hipotecar ainda cobrirem a dívida, para ninguém falir por engano.

## Início e fim de partida

Criar uma partida leva 3 telas: jogadores, modo e ordem sorteada; com um salvamento existente, a tela inicial já traz “Continuar” em foco.

| Código | Tela | Texto da tela | Opções | Consequência |
| --- | --- | --- | --- | --- |
| D-21 | Tela inicial | Senhorio | **Continuar partida** (se houver) · Nova partida | Continuar abre INICIO\_TURNO de quem tinha a vez |
| D-22 | Nova partida com salvamento | Começar outra partida? A atual será apagada | **Não, voltar** · Sim, começar | Sim: apaga o salvamento e abre D-23 |
| D-23 | Jogadores | Quantos jogadores? | ◀ ▶ de 2 a 6; depois nome (teclado da tela) e cor de cada um | Cores já escolhidas ficam desabilitadas (RN-002) |
| D-24 | Modo de partida | Como a partida termina? | **Clássico** · Tempo (◀ ▶ 30, 45, 60, 90 min) · Rodadas (◀ ▶ 20, 30, 40, 60) | Padrões: 45 min e 30 rodadas |
| D-25 | Ordem sorteada | O banco sorteou a ordem (os jogadores aparecem em cartões, na ordem) | **Começar partida** | Distribui o dinheiro inicial e abre D-01 (RN-003, RN-004) |
| D-26 | FIM\_PARTIDA | {vencedor} é o grande Senhorio! | **Jogar de novo** · Sair | Mostra a classificação com patrimônio; jogar de novo mantém jogadores e modo (RN-114) |

No modo tempo, quando o cronômetro zera, aparece o aviso “Tempo esgotado! Última rodada.” e a partida segue até o fim da rodada (RN-113).

## Mensagens de resultado

Cada evento mostra uma frase por 4 segundos (o OK pula a espera), em uma única versão por enquanto; é aqui que entra o humor. Os valores e nomes vêm sempre do banco.

| Código | Evento | Mensagem |
| --- | --- | --- |
| M-01 | Passou pela Partida | {jogador} passou pela Partida: +{valor}. Salário caiu! |
| M-02 | Comprou propriedade | {jogador} agora é dono de {casa}. Um senhorio em formação! |
| M-03 | Não comprou | {casa} continua à venda. Fica pra próxima. |
| M-04 | Pagou aluguel | {jogador} pagou {valor} a {dono}. Tchau dinheiro! |
| M-05 | Pagou aluguel de R$ 500 ou mais | {jogador} pagou {valor} a {dono}. Doeu no bolso. |
| M-06 | Sem aluguel: hipotecada | {casa} está hipotecada. Hoje a estadia é de graça! |
| M-07 | Sem aluguel: dono preso (RP-03) | {dono} está preso e não pode cobrar. Que sorte! |
| M-08 | Pagou imposto | {jogador} pagou {valor} de imposto. Obrigado! |
| M-09 | Foi para a prisão | {jogador} foi para a prisão. Comporte-se! |
| M-10 | Três duplas seguidas | Três duplas? Suspeito… {jogador} vai para a prisão. |
| M-11 | Saiu da prisão com dupla | Dupla! {jogador} está livre. |
| M-12 | Construiu casa | {casa} ganhou a {qtdCasas}ª casa. Aluguel agora: {valor}. |
| M-13 | Construiu hotel | Hotel inaugurado em {casa}! Diária: {valor}. |
| M-14 | Hipotecou | {jogador} hipotecou {casa} e recebeu {valor}. |
| M-15 | Venda simples aceita | Negócio fechado! {casa} agora é de {comprador}. |
| M-16 | Venda simples recusada | {dono} recusou. Quem sabe na próxima rodada. |
| M-17 | Falência | {jogador} faliu. Foi bom enquanto durou. |
| M-18 | Tempo esgotado | Tempo esgotado! Última rodada. |

Os textos das 32 cartas de Sorte e Revés seguem o mesmo tom e ficam no documento Dados e balanceamento.

## Histórico (últimos acontecimentos)

O painel mostra as 3 últimas linhas do histórico. São frases curtas e sem humor, uma por tipo de acontecimento, inclusive os que não têm mensagem M (carta, construção, hipoteca, venda simples, fiança). O humor fica no aviso central (M-xx).

| Código | Texto |
| --- | --- |
| H-01 | {jogador} passou pela Partida (+{valor}) |
| H-02 | {jogador} comprou {casa} |
| H-03 | {jogador} não comprou {casa} |
| H-04 | {jogador} pagou {valor} de aluguel a {dono} |
| H-05 | {jogador} não pagou: {casa} hipotecada |
| H-06 | {jogador} não pagou: {dono} está preso |
| H-07 | {jogador} pagou {valor} de imposto |
| H-08 | {jogador} tirou a carta {titulo} |
| H-09 | {jogador} recebeu {valor} do banco |
| H-10 | {jogador} pagou {valor} ao banco |
| H-11 | {jogador} pagou {valor} a {dono} |
| H-12 | {jogador} foi para a prisão |
| H-13 | {jogador} tirou três duplas e foi para a prisão |
| H-14 | {jogador} saiu da prisão |
| H-15 | {jogador} pagou a fiança de {valor} |
| H-16 | {jogador} construiu a {qtdCasas}ª casa em {casa} |
| H-17 | {jogador} construiu um hotel em {casa} |
| H-18 | {jogador} vendeu uma casa de {casa} |
| H-19 | {jogador} hipotecou {casa} |
| H-20 | {jogador} resgatou {casa} |
| H-21 | {casa} agora é de {comprador} |
| H-22 | {dono} recusou a proposta por {casa} |
| H-23 | {jogador} faliu |
| H-24 | {jogador} abandonou a partida |
| H-25 | Tempo esgotado: última rodada |
| H-26 | {jogador} pagou {valor} de juros de hipoteca |

## Textos de interface

Rótulos fixos da tela de jogo, legenda do controle, dicas dos cartões e formato de dinheiro. Também ficam no regras.json, para revisar sem mexer no código. As dicas de D-02 e D-03 (“Aperte OK para rolar os dados”) e o motivo de “Declarar falência” desabilitado em D-19 (“Ainda dá para levantar {valor}”) ficam junto da própria decisão.

| Código | Texto |
| --- | --- |
| I-01 | senhorio |
| I-02 | Rodada {n} · Banco: computador |
| I-03 | JOGANDO |
| I-04 | NA PRISÃO |
| I-05 | FALIU · RODADA {n} |
| I-06 | ÚLTIMOS ACONTECIMENTOS |
| I-07 | OK |
| I-08 | Voltar |
| I-09 | confirmar |
| I-10 | escolher |
| I-11 | menu |
| I-12 | ver tabuleiro |
| I-13 | R$ {valor} |
| I-14 | . |
| I-15 | GRUPO {grupo} · {n} DE {total} |
| I-16 | GRUPO {grupo} · COMPLETO |
| I-17 | ESTAÇÃO · {n} DE {total} |
| I-18 | COMPANHIA · {n} DE {total} |
| I-19 | Preço |
| I-20 | Aluguel base |
| I-21 | {jogador} tirou {d1} + {d2} = {soma} |
| I-22 | o banco |
| I-23 | + {valor} |
| I-24 | {posicao}º {jogador} |
| I-25 | Sem casas |
| I-26 | {n} casa |
| I-27 | {n} casas |
| I-28 | Hotel |
| I-29 | Cada casa custa {valor} · até {max} casas, depois hotel |
| I-30 | Com a {n}ª casa, o aluguel vai de {de} para {para} |
| I-31 | Com o hotel, o aluguel vai de {de} para {para} |
| I-32 | Vendendo, o aluguel vai de {de} para {para} |
| I-33 | Aluguel {valor} · hipoteca {hipoteca} |
| I-34 | HIPOTECADA |
| I-35 | Salvamento chega na próxima versão |
| I-36 | outra propriedade |
| I-37 | continuar |
| I-38 | Dono: {dono} · preço {valor} |
| I-39 | Aluguel por estação: {valores} |
| I-40 | Aluguel: dados × {mult1} (1 companhia) ou × {mult2} (as duas) |
| I-41 | Nenhum grupo completo para construir |
| I-42 | Sem casas para vender |
| I-43 | Nada para hipotecar |
| I-44 | Nada hipotecado |
| I-45 | Faltam {valor} |
| I-46 | {acao} · {valor} |
| I-47 | Quem está preso não negocia |
| I-48 | Ninguém disponível para negociar |
| I-49 | Para quem vender {casa}? |
| I-50 | Sem propriedades para negociar |
| I-51 | ajusta {passo} · segure para {rapido} |
| I-52 | CADA CASA, MAIS ALUGUEL |
| I-53 | Rodada {n} · {jogadores} jogadores · modo {modo} |
| I-54 | A partida salva é de outra versão das regras e não pode ser continuada |
| I-55 | Passo {n} de {total} |
| I-56 | Cor |
| I-57 | Jogador {n} (reserva, se a lista nomesPadrao for menor que o número de jogadores) |
| I-58 | quantidade |
| I-59 | jogador |
| I-60 | editar nome |
| I-61 | trocar cor |
| I-62 | Continuar |
| I-63 | modo |
| I-64 | ajustar valor |
| I-65 | continuar |
| I-66 | jogadores |
| I-67 | começar |
| I-68 | mudar o modo |
| I-69 | Até sobrar um só jogador. Quem fica sem dinheiro sai da partida. |
| I-70 | Quando o tempo acaba, a rodada termina e vence o maior patrimônio. |
| I-71 | Depois da última rodada completa, vence o maior patrimônio. |
| I-72 | Sem hora para acabar |
| I-73 | {n} min |
| I-74 | {n} rodadas |
| I-75 | {n} jogadores · cada um começa com {valor} |
| I-76 | {n}º |
| I-77 | Cada jogador começa na Partida com {valor} · {modo} |
| I-78 | modo clássico |
| I-79 | modo tempo, {n} minutos |
| I-80 | modo rodadas, {n} rodadas |
| I-81 | FIM DE PARTIDA · {modo} · {n} RODADAS |
| I-82 | Dinheiro {dinheiro} · Propriedades {propriedades} · Casas {casas} |
| I-83 | Faliu na rodada {n} |
| I-84 | — |
| I-85 | Rodada {n} · {min} min |
| I-86 | Rodada {n} de {total} |
| I-87 | Não foi possível salvar |
| I-88 | Nome do jogador {n} |
| I-89 | clássico |
| I-90 | tempo |
| I-91 | rodadas |

Nomes sugeridos na tela de jogadores quando não há nomes salvos: `textos.nomesPadrao` (Ana, Bruno, Carla, Diego, Elisa e Fábio), todos com iniciais diferentes para os peões. As teclas ▲ ▼ ◀ ▶ e ✱ aparecem como ícones (as fontes não têm esses símbolos); só a palavra ao lado vem do texto.

## Pendências

Pontos para sua revisão; responda logo abaixo de cada um, como no documento de regras.

- [ ] D-04 pede um OK em todo turno sem dupla para encerrar. Prefere assim, ou encerrar sozinho após 3 segundos se ninguém apertar ✱?
  - [ ] Pede um OK
- [ ] As mensagens de resultado (M-01 a M-18) ficam só 2 segundos na tela, ou esperam OK? Esperar OK dá tempo de ler, mas soma cliques.
  - [ ] Podemos aumentar para 4s
- [ ] O humor de M-05 (“quase um assalto”) e M-08 (“O Leão agradece”) está adequado para todas as idades da família?
  - [ ] Mudei os textos
- [ ] Quer duas versões de cada mensagem, sorteadas pelo banco, para não ficar repetitivo?
  - [ ] Por enquanto não.
