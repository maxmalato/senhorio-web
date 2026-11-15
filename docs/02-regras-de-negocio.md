# Senhorio – Regras de negócio

> **Herdado do Senhorio para Roku (v1.0.1).** As regras valem para a versão web sem mudança. Referências a controle remoto, tecla ✱, OK, Voltar e ◀ ▶ descrevem a interface do Roku: na web elas viram ações de toque, mouse, teclado ou direcional, e o modo de vários dispositivos dispensa "passar o controle". A adaptação dos textos e telas acontece nas Etapas 1b e 2 (docs/09-roadmap.md).


As regras do MVP do Senhorio estão numeradas de RN-001 em diante; valores entre chaves, como {dinheiroInicial}, vêm do arquivo de regras (JSON) e mudam sem alterar o código. O banco é sempre o computador.

## Preparação da partida

Cada jogador começa na Partida com {dinheiroInicial} = R$ 1.500, e a ordem de jogo é sorteada pelo banco.

- **RN-001** A partida tem de 2 a 6 jogadores, todos humanos.
- **RN-002** Cada jogador informa um nome (até 10 caracteres) e escolhe uma cor de peão; duas pessoas não podem ter a mesma cor.
- **RN-003** Cada jogador recebe {dinheiroInicial} do banco.
- **RN-004** O banco sorteia a ordem de jogo e a mostra na tela antes do primeiro turno; a ordem não muda durante a partida.
- **RN-005** Todos os peões começam na casa 0 (Partida), sem receber o bônus de passagem.
- **RN-006** O banco tem dinheiro ilimitado; ele nunca fica sem saldo para pagar.
- **RN-007** Uma partida salva pode ser retomada exatamente do ponto do último turno concluído.
- **RN-008 Valores em dinheiro:** todo valor em R$ é inteiro. Quando um cálculo der fração (porcentagens de hipoteca, juros e venda de casas), arredonda-se ao inteiro mais próximo, com 0,5 para cima. Exemplos: hipoteca de R$ 75 tem juros de R$ 7,50 → R$ 8, então o resgate custa R$ 83 (RN-063); o credor que recebe essa propriedade na falência paga R$ 8 (RN-103).

## Turno, dados e movimento

No seu turno o jogador rola dois dados, anda a soma no sentido horário e resolve a casa onde parou; dupla dá nova jogada.

- **RN-010** O turno começa com a tela “Vez de \[nome\]”, para o controle ser passado ao jogador certo.
- **RN-011** Antes de rolar, o jogador pode abrir o menu ✱ para construir, vender casas, hipotecar, resgatar ou propor venda simples.
- **RN-012** O banco rola dois dados de 6 faces, com resultado aleatório e independente, e move o peão casa a casa pela soma.
- **RN-013** Ao passar ou parar na Partida (casa 0), o jogador recebe {bonusPartida} = R$ 200 do banco. Isso não vale quando ele vai para a prisão.
- **RN-014** Depois de mover, o banco resolve a casa de destino (compra, aluguel, carta, imposto ou prisão) antes de qualquer outra ação.
- **RN-015** Se os dois dados forem iguais (dupla), o jogador joga de novo após resolver a casa.
- **RN-016** A terceira dupla seguida no mesmo turno manda o jogador direto para a prisão, sem mover pela soma.
- **RN-017** Após resolver a casa (e sem nova dupla), o jogador ainda pode usar o menu ✱ e depois encerra o turno; o banco salva a partida e passa a vez.
- **RN-018** Jogador falido não joga mais e é pulado na ordem.

## Casas especiais do tabuleiro

O tabuleiro tem 40 casas: 22 ruas, 4 estações, 2 companhias e 12 casas especiais, cujo efeito está na tabela.

| Casa | Posição | Efeito ao parar |
| --- | --- | --- |
| Partida | 0 | Recebe {bonusPartida} (RN-013) |
| Prisão / só visitando | 10 | Nada; quem apenas para aqui está só visitando |
| Descanso | 20 | Nada (ver regra opcional RP-01) |
| Vá para a prisão | 30 | Vai direto para a prisão (RN-070) |
| Imposto de Renda | 4 | Paga {impostoRenda} = R$ 200 ao banco |
| Taxa de Luxo | 38 | Paga {taxaLuxo} = R$ 100 ao banco |
| Sorte | 2, 17, 33 | Compra uma carta de Sorte (RN-080) |
| Revés | 7, 22, 36 | Compra uma carta de Revés (RN-080) |

- **RN-020** Impostos são cobrados automaticamente; se o jogador não tiver dinheiro, aplica-se a regra de dívidas (RN-100).
- **RN-021** As posições seguem o tabuleiro do mockup; o arquivo de regras define nome e tipo de cada casa.

## Propriedades e compra

Quem para numa propriedade sem dono pode comprá-la pelo preço de tabela; se não comprar, ela continua com o banco.

- **RN-030** Há três tipos de propriedade: ruas (22, em 8 grupos de cor), estações (4) e companhias (2: Energia e Água).
- **RN-031** Grupos de ruas: marrom e azul-escuro têm 2 ruas; os outros seis grupos têm 3.
- **RN-032** Ao parar numa propriedade do banco, o jogador vê o cartão com preço e aluguel e escolhe “Comprar” ou “Não comprar”. “Comprar” vem em foco.
- **RN-033** Se o dinheiro não alcançar o preço, “Comprar” aparece desabilitado com o motivo (“Faltam R$ 40”). O jogador pode abrir o menu ✱ para hipotecar ou vender casas e então comprar.
- **RN-034** “Não comprar” deixa a propriedade com o banco, disponível para o próximo que parar nela (leilão só depois do MVP).
- **RN-035** Parar na própria propriedade não tem efeito.
- **RN-036** Preços, aluguéis e custos de construção de cada propriedade ficam no arquivo de regras e serão definidos no documento de Dados e balanceamento.

## Aluguel

O banco cobra o aluguel automaticamente de quem para numa propriedade de outro jogador e mostra o cálculo na tela.

- **RN-040** O aluguel é transferido do visitante para o dono sem perguntar; a tela mostra quem pagou, quanto e por quê (ex.: “R$ 180 — 3 casas”).
- **RN-041** Propriedade hipotecada não cobra aluguel.
- **RN-042** Com a regra própria RP-03 ligada (configuração atual), o dono preso não cobra aluguel; com RP-03 desligada, cobra normalmente.
- **RN-043 Ruas:** sem casas, cobra o aluguel básico; com o grupo completo e sem casas, o aluguel básico dobra; com casas ou hotel, vale a escada de aluguel da rua.
- **RN-044 Estações:** o aluguel depende de quantas estações o dono tem: 1 = {estacao1} R$ 30, 2 = R$ 60, 3 = R$ 120, 4 = R$ 240.
- **RN-045 Companhias:** o aluguel é a soma dos dados que trouxeram o visitante multiplicada por {multCompanhia1} = 5 (dono tem 1 companhia) ou {multCompanhia2} = 12 (dono tem as 2).
- **RN-046** Se o visitante chegou por carta, sem rolar dados, o banco rola os dados só para calcular o aluguel da companhia.
- **RN-047** O grupo continua completo mesmo com uma rua hipotecada: as ruas não hipotecadas seguem com aluguel básico dobrado.

## Construção de casas e hotéis

Só constrói quem tem o grupo de cor completo, sem ruas hipotecadas, e sempre de forma uniforme entre as ruas do grupo.

- **RN-050** Construir exige: grupo completo, nenhuma rua do grupo hipotecada e dinheiro para pagar o custo da casa do grupo.
- **RN-051** A construção é feita no menu ✱, no próprio turno, antes de rolar ou depois de resolver a casa.
- **RN-052 Construção uniforme:** a diferença de casas entre duas ruas do mesmo grupo nunca passa de 1. O jogo só oferece as ruas em que a próxima casa é permitida.
- **RN-053** Cada rua aceita até {maxCasas} = 4 casas. Com 4 casas em todas as ruas do grupo, a próxima construção troca as 4 casas por 1 hotel, pagando o custo de mais uma casa.
- **RN-054** Vender ao banco devolve {fatorVendaCasa} = 50% do custo pago, também de forma uniforme. Vender um hotel o converte de volta em 4 casas.
- **RN-055** O estoque de casas e hotéis do banco é ilimitado no MVP.
- **RN-056** A tela de construção mostra a escada de aluguel e o novo valor antes de confirmar, como no mockup.

## Hipoteca

Hipotecar dá ao jogador metade do preço da propriedade na hora; para recuperá-la, ele devolve esse valor com 10% de juros.

- **RN-060** O jogador pode hipotecar uma propriedade sua pelo menu ✱ e recebe {fatorHipoteca} = 50% do preço de compra.
- **RN-061** Uma rua só pode ser hipotecada se não houver casas nem hotel em nenhuma rua do seu grupo; o jogo oferece vender as casas antes.
- **RN-062** Propriedade hipotecada continua do dono, não cobra aluguel (RN-041) e aparece marcada no tabuleiro e no painel.
- **RN-063** O resgate custa o valor recebido mais {jurosHipoteca} = 10% (ex.: hipoteca de R$ 120 → resgate de R$ 132).
- **RN-064** Não há prazo para resgatar; a hipoteca pode durar a partida inteira.
- **RN-065** Propriedade hipotecada não pode entrar na venda simples entre jogadores no MVP.

## Prisão

O jogador preso fica até 3 turnos tentando dupla; pode sair antes pagando {fianca} = R$ 50 ou usando a carta de saída.

- **RN-070** Vai para a prisão quem: para na casa 30, tira uma carta que manda para a prisão ou faz três duplas seguidas (RN-016). O peão vai direto para a casa 10, sem passar pela Partida e sem bônus, e o turno acaba.
- **RN-071** No início de cada turno preso, o banco pergunta: “Tentar dupla” (em foco), “Pagar R$ 50” ou “Usar carta” (só aparece se o jogador tiver a carta).
- **RN-072** Pagando ou usando a carta, o jogador sai e rola normalmente no mesmo turno.
- **RN-073** Tentando dupla: se conseguir, sai e anda a soma, mas não joga de novo por essa dupla. Se não conseguir, continua preso e o turno acaba.
- **RN-074** No terceiro turno sem dupla, o jogador paga a fiança obrigatoriamente e anda a soma da última rolagem.
- **RN-075** Preso pode construir, vender casas e hipotecar, mas não propõe nem recebe vendas simples; a cobrança de aluguel segue RN-042.
- **RN-076** Quem só para na casa 10 pela soma dos dados está “só visitando” e não fica preso.

## Cartas de Sorte e Revés

São dois baralhos de 16 cartas cada, embaralhados no início; a carta lida volta para o fundo do baralho.

- **RN-080** Ao parar em Sorte ou Revés, o banco mostra a carta do topo do baralho correspondente e aplica o efeito depois que o jogador aperta OK.
- **RN-081** Sorte tem mais cartas de ganho; Revés tem mais cartas de perda. Os textos são próprios e ficam no arquivo de regras.
- **RN-082** A carta “Saia da prisão” (uma em cada baralho) fica com o jogador até ser usada; enquanto isso, não volta ao baralho.
- **RN-083** Movimento por carta para a frente que passe pela Partida dá o bônus (RN-013); movimento para trás nunca dá.
- **RN-084** Depois de mover por carta, o banco resolve a nova casa normalmente (compra, aluguel, outra carta etc.).

Tipos de efeito que o motor precisa suportar:

| Tipo | Exemplo de carta |
| --- | --- |
| Receber do banco | Seu aluguel atrasado foi pago: receba R$ 100 |
| Pagar ao banco | Multa de trânsito: pague R$ 50 |
| Receber de cada jogador | Seu aniversário: cada jogador lhe dá R$ 20 |
| Pagar a cada jogador | Rodada de pizza: pague R$ 25 a cada jogador |
| Ir para uma casa | Avance até a Partida |
| Ir à estação mais próxima | Vá à estação mais próxima |
| Andar casas | Volte 3 casas |
| Ir para a prisão | Vá direto para a prisão |
| Reparos | Reforma geral: pague R$ 25 por casa e R$ 100 por hotel |
| Saia da prisão | Guarde esta carta e use quando quiser |

## Venda simples entre jogadores

Na sua vez, o jogador pode propor comprar ou vender uma propriedade por dinheiro; a outra parte pega o controle e aceita ou recusa.

- **RN-090** Só o jogador da vez propõe, pelo menu ✱, antes de rolar ou depois de resolver a casa. Jogadores presos não propõem nem recebem propostas (RN-075).
- **RN-091** A proposta envolve exatamente uma propriedade e um valor em dinheiro: “comprar de” outro jogador ou “vender para” outro jogador.
- **RN-092** Só entram propriedades sem hipoteca e sem casas em nenhuma rua do grupo.
- **RN-093** O valor é escolhido com ◀ ▶ em passos de {passoVenda} = R$ 10 (segurando, R$ 50), entre R$ 10 e o dinheiro de quem paga.
- **RN-094** A tela pede para passar o controle à outra parte, que vê a proposta e escolhe “Recusar” (em foco) ou “Aceitar”. Recusar em foco evita aceite acidental.
- **RN-095** Aceita, o banco transfere dinheiro e propriedade na hora e mostra o resultado; recusada, nada muda.
- **RN-096** Cada jogador pode fazer no máximo {maxPropostasTurno} = 2 propostas por turno, para não travar a partida.
- **RN-097** O banco não avalia se o preço é justo; negociação é entre os jogadores.

## Dívidas e falência

Quem deve mais do que tem em caixa precisa levantar o dinheiro vendendo casas e hipotecando; se nem assim alcançar, vai à falência.

- **RN-100** Quando uma cobrança passa do dinheiro em caixa, o banco abre a tela “Levantar dinheiro”, mostrando quanto falta e o quanto cada ação rende.
- **RN-101** Nessa tela só há duas ações: vender casas ao banco (RN-054) e hipotecar (RN-060). A dívida é paga assim que o caixa alcança o valor.
- **RN-102** Se o valor máximo que o jogador consegue levantar não cobre a dívida, o banco declara a falência logo, sem obrigar a vender tudo antes. Enquanto vender casas e hipotecar ainda cobrirem a dívida, declarar falência é recusado (D-19, CT-45).
- **RN-103 Credor é outro jogador:** recebe todo o dinheiro do falido e suas propriedades. Casas são vendidas ao banco antes, e o valor entra no que o credor recebe. Propriedades hipotecadas passam ainda hipotecadas, e o credor paga na hora {jurosHipoteca} = 10% do valor de cada hipoteca recebida; se não tiver o dinheiro, aplica-se RN-100.
- **RN-104 Credor é o banco:** as propriedades do falido voltam ao banco sem hipoteca e sem casas, disponíveis para compra.
- **RN-105** O jogador falido sai da partida; o painel o mostra como “Faliu” com a rodada em que saiu.
- **RN-106** Uma única ação pode gerar várias dívidas (ex.: pagar a cada jogador); elas são tratadas como uma só e, na falência, o banco é o credor.

## Fim da partida

A partida termina conforme o modo escolhido (clássico, tempo ou rodadas), definido no documento Visão e escopo.

- **RN-110** Em qualquer modo, se restar um único jogador sem falência, ele vence e a partida acaba.
- **RN-111** Nos modos tempo e rodadas, vence o maior patrimônio: dinheiro + preço de compra das propriedades + custo pago por casas e hotéis; propriedade hipotecada conta pelo preço menos o valor da hipoteca.
- **RN-112** Desempate: mais dinheiro em caixa; persistindo, mais propriedades.
- **RN-113** No modo tempo, ao zerar o cronômetro, a rodada em andamento é concluída antes do resultado.
- **RN-114** A tela final mostra a classificação com o patrimônio de cada jogador e a opção de jogar de novo com os mesmos jogadores.
- **RN-115** Um jogador pode abandonar pelo menu ✱; as propriedades dele voltam ao banco, como na falência para o banco (RN-104).

## Regras próprias do Senhorio

As regras próprias começam desligadas; ligue as que quiser na coluna Situação e acrescente as suas como RP-06 em diante.

| Código | Regra | Efeito no jogo | Situação |
| --- | --- | --- | --- |
| RP-01 | Pote do Descanso: impostos, fianças e multas pagos ao banco vão para um pote; quem para no Descanso leva tudo | Mais sorte e reviravoltas; partidas um pouco mais longas | Desligada |
| RP-02 | Partida em dobro: parar exatamente na Partida paga R$ 400 em vez de R$ 200 | Mais dinheiro em circulação | Desligada |
| RP-03 | Dono preso não cobra aluguel (substitui RN-042) | Prisão vira castigo real | Ligada |
| RP-04 | Imposto de Renda: o jogador escolhe pagar R$ 200 ou 10% do patrimônio | Decisão extra; favorece quem está atrás | Desligada |
| RP-05 | Bônus de grupo: completar um grupo de cor rende R$ 100 do banco | Incentiva vendas simples e acelera a construção | Desligada |

## Parâmetros configuráveis

Estes valores ficam no arquivo de regras (JSON) e podem ser ajustados no balanceamento sem mudar o código.

| Parâmetro | Valor proposto | Regra |
| --- | --- | --- |
| dinheiroInicial | R$ 1.500 | RN-003 |
| bonusPartida | R$ 200 | RN-013 |
| impostoRenda | R$ 200 | Casas especiais |
| taxaLuxo | R$ 100 | Casas especiais |
| fianca | R$ 50 | RN-071 |
| turnosMaxPrisao | 3 | RN-074 |
| estacao1 / 2 / 3 / 4 | R$ 30 / 60 / 120 / 240 | RN-044 |
| multCompanhia1 / 2 | 5× / 12× os dados | RN-045 |
| maxCasas | 4 (depois hotel) | RN-053 |
| fatorVendaCasa | 50% | RN-054 |
| fatorHipoteca | 50% do preço | RN-060 |
| jurosHipoteca | 10% | RN-063 |
| passoVenda | R$ 10 (R$ 50 segurando) | RN-093 |
| maxPropostasTurno | 2 | RN-096 |
| cartasPorBaralho | 16 | RN-080 |
| maxDuplasSeguidas | 3 | RN-016 |
| facesDado | 6 | RN-012 |
| multGrupoCompleto | 2× o aluguel básico | RN-043 |

## Questões em aberto

Pontos que precisam da sua decisão antes de as regras virarem código:

- [ ] Quais regras próprias (RP-01 a RP-05) ficam ligadas, e quais regras suas entram como RP-06 em diante?
  - [ ] Fica ligada apenas a RP-03
- [ ] Quem recebe propriedades hipotecadas na falência (RN-103) paga 10% de juros na hora, como no jogo clássico, ou não paga nada?
  - [ ] Sim, igual ao clássico
- [ ] Estoque ilimitado de casas (RN-055) está bom, ou o banco deve ter limite para criar disputa por construção?
  - [ ] Está bom
- [ ] Jogador preso pode fazer venda simples (RN-075)?
  - [ ] Não
- [ ] Quem abandona a partida (RN-115) devolve tudo ao banco, ou as propriedades são divididas entre os outros?
  - [ ] Devolve tudo para o banco
- [ ] Nomes das ruas, preços, escadas de aluguel e textos das 32 cartas ficam para o documento Dados e balanceamento.
  - [ ] OK
