# Senhorio – Dados e balanceamento

> **Herdado do Senhorio para Roku (v1.0.1).** As regras valem para a versão web sem mudança. Referências a controle remoto, tecla ✱, OK, Voltar e ◀ ▶ descrevem a interface do Roku: na web elas viram ações de toque, mouse, teclado ou direcional, e o modo de vários dispositivos dispensa "passar o controle". A adaptação dos textos e telas acontece nas Etapas 1b e 2 (docs/09-roadmap.md).


Estes são os valores iniciais do Senhorio: 22 ruas, 4 estações, 2 companhias e 32 cartas. São números próprios, pensados para serem ajustados depois das primeiras partidas, e todos vão para o arquivo de regras (JSON).

## Como os valores foram definidos

Os preços sobem com a posição no tabuleiro (de R$ 60 a R$ 400) e cada escada de aluguel é uma fração fixa do aluguel com hotel daquela rua.

- **Preço:** cresce em passos de R$ 20 a R$ 50 conforme a rua fica mais longe da Partida; a última rua de cada grupo custa um pouco mais.
- **Aluguel básico:** cerca de 7% do preço (10% nas duas ruas azul-escuras, as mais nobres).
- **Escada com casas:** 2 casas = 13,5% do aluguel com hotel; 3 casas = 40%; 4 casas = 71%; hotel = 100%. O hotel vai de R$ 450 a R$ 1.800.
- **Primeira casa:** sempre pelo menos 2,5 vezes o aluguel básico, para construir valer mais que só completar o grupo (que dobra o básico).
- **Custo da casa:** R$ 50 (marrom e azul-claro), R$ 100 (rosa e laranja), R$ 150 (vermelho e amarelo) e R$ 200 (verde e azul-escuro).
- **Hipoteca:** 50% do preço, como define RN-060.

Os nomes são fictícios e genéricos, sem ruas reais conhecidas, para manter o jogo original.

## Ruas

As 22 ruas em ordem de tabuleiro; a mais cara é a Avenida do Senhorio, com hotel de R$ 1.800. Valores em R$.

| Pos. | Rua | Grupo | Preço | Casa custa | Básico | 1 casa | 2 casas | 3 casas | 4 casas | Hotel | Hipoteca |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Travessa do Porto | Marrom | 60 | 50 | 4 | 20 | 60 | 180 | 320 | 450 | 30 |
| 3 | Beco das Flores | Marrom | 60 | 50 | 4 | 20 | 60 | 180 | 320 | 450 | 30 |
| 6 | Rua da Fonte | Azul-claro | 100 | 50 | 6 | 25 | 80 | 240 | 425 | 600 | 50 |
| 8 | Rua do Mercado | Azul-claro | 100 | 50 | 6 | 25 | 80 | 240 | 425 | 600 | 50 |
| 9 | Rua da Escola | Azul-claro | 120 | 50 | 8 | 30 | 95 | 280 | 495 | 700 | 60 |
| 11 | Rua das Acácias | Rosa | 140 | 100 | 10 | 35 | 110 | 320 | 570 | 800 | 70 |
| 13 | Rua dos Ipês | Rosa | 140 | 100 | 10 | 35 | 110 | 320 | 570 | 800 | 70 |
| 14 | Alameda das Orquídeas | Rosa | 160 | 100 | 12 | 40 | 120 | 360 | 640 | 900 | 80 |
| 16 | Rua da Praça | Laranja | 180 | 100 | 14 | 45 | 130 | 380 | 675 | 950 | 90 |
| 18 | Rua do Coreto | Laranja | 180 | 100 | 14 | 45 | 130 | 380 | 675 | 950 | 90 |
| 19 | Avenida da Matriz | Laranja | 200 | 100 | 16 | 50 | 135 | 400 | 710 | 1.000 | 100 |
| 21 | Rua dos Coqueiros | Vermelho | 220 | 150 | 18 | 55 | 150 | 440 | 780 | 1.100 | 110 |
| 23 | Rua das Mangueiras | Vermelho | 220 | 150 | 18 | 55 | 150 | 440 | 780 | 1.100 | 110 |
| 24 | Rua das Palmeiras | Vermelho | 240 | 150 | 20 | 60 | 155 | 460 | 815 | 1.150 | 120 |
| 26 | Rua da Aurora | Amarelo | 260 | 150 | 22 | 65 | 160 | 480 | 850 | 1.200 | 130 |
| 27 | Rua do Horizonte | Amarelo | 260 | 150 | 22 | 65 | 160 | 480 | 850 | 1.200 | 130 |
| 29 | Rua do Sol | Amarelo | 280 | 150 | 24 | 70 | 170 | 500 | 890 | 1.250 | 140 |
| 31 | Avenida dos Bancos | Verde | 300 | 200 | 26 | 75 | 175 | 520 | 925 | 1.300 | 150 |
| 32 | Rua do Comércio | Verde | 300 | 200 | 26 | 75 | 175 | 520 | 925 | 1.300 | 150 |
| 34 | Avenida Central | Verde | 320 | 200 | 28 | 80 | 190 | 560 | 995 | 1.400 | 160 |
| 37 | Alameda dos Barões | Azul-escuro | 350 | 200 | 35 | 90 | 205 | 600 | 1.065 | 1.500 | 175 |
| 39 | Avenida do Senhorio | Azul-escuro | 400 | 200 | 40 | 120 | 245 | 720 | 1.280 | 1.800 | 200 |

Com o grupo completo e sem casas, o aluguel básico dobra (RN-043).

## Estações e companhias

As 4 estações custam R$ 200 cada e as 2 companhias R$ 150; nenhuma recebe casas.

| Pos. | Nome | Tipo | Preço (R$) | Hipoteca (R$) |
| --- | --- | --- | --- | --- |
| 5 | Estação Sul | Estação | 200 | 100 |
| 15 | Estação Oeste | Estação | 200 | 100 |
| 25 | Estação Norte | Estação | 200 | 100 |
| 35 | Estação Leste | Estação | 200 | 100 |
| 12 | Companhia de Energia | Companhia | 150 | 75 |
| 28 | Companhia de Água | Companhia | 150 | 75 |

- **Aluguel das estações:** R$ 30, 60, 120 ou 240 conforme o dono tenha 1, 2, 3 ou 4 estações (RN-044).
- **Aluguel das companhias:** soma dos dados × 5 com uma companhia, × 12 com as duas (RN-045). Exemplo: dados 4 + 3 com as duas companhias = R$ 84.

## Cartas de Sorte

São 16 cartas: 13 boas ou neutras e 3 ruins. O título traz o humor; o efeito é sempre direto.

| Código | Título | Efeito | Tipo |
| --- | --- | --- | --- |
| S-01 | Atalho pela ciclovia! | Avance até a Partida e receba R$ 200 | Ir para casa |
| S-02 | Sonhando alto | Avance até a Avenida do Senhorio | Ir para casa |
| S-03 | Passeio no centro | Avance até a Rua das Palmeiras | Ir para casa |
| S-04 | Hora de viajar | Avance até a Estação Norte | Ir para casa |
| S-05 | Pegue o próximo trem | Vá à estação mais próxima, à frente | Estação mais próxima |
| S-06 | Visita técnica | Avance até a Companhia de Energia | Ir para casa |
| S-07 | Melhor vizinho do ano | Receba R$ 150 | Receber do banco |
| S-08 | Restituição do imposto | Receba R$ 100 | Receber do banco |
| S-09 | Ganhou o bolão | Receba R$ 75 | Receber do banco |
| S-10 | Dinheiro no casaco velho | Receba R$ 50 | Receber do banco |
| S-11 | Vendeu bolo no condomínio | Receba R$ 25 | Receber do banco |
| S-12 | Seu aniversário! | Cada jogador lhe dá R$ 20 | Receber de cada jogador |
| S-13 | Bom comportamento | Saia da prisão de graça. Guarde esta carta | Saia da prisão |
| S-14 | Esqueceu a carteira | Volte 3 casas | Andar casas |
| S-15 | Vaquinha da festa | Pague R$ 15 a cada jogador | Pagar a cada jogador |
| S-16 | Estacionou na vaga errada | Vá direto para a prisão | Ir para a prisão |

## Cartas de Revés

São 16 cartas: 12 ruins e 4 boas, para que tirar Revés nunca seja uma derrota certa.

| Código | Título | Efeito | Tipo |
| --- | --- | --- | --- |
| R-01 | Pego no flagra | Vá direto para a prisão | Ir para a prisão |
| R-02 | Escola das crianças | Pague R$ 150 | Pagar ao banco |
| R-03 | Conserto do carro | Pague R$ 100 | Pagar ao banco |
| R-04 | Conta de luz nas alturas | Pague R$ 75 | Pagar ao banco |
| R-05 | Multa de trânsito | Pague R$ 50 | Pagar ao banco |
| R-06 | Lavou o carro e choveu | Pague R$ 30 | Pagar ao banco |
| R-07 | Reforma geral | Pague R$ 25 por casa e R$ 100 por hotel | Reparos |
| R-08 | Vistoria da prefeitura | Pague R$ 40 por casa e R$ 115 por hotel | Reparos |
| R-09 | Rodada de pizza | Pague R$ 25 a cada jogador | Pagar a cada jogador |
| R-10 | Eleito síndico | Pague R$ 50 a cada jogador | Pagar a cada jogador |
| R-11 | Pegou o ônibus errado | Volte 3 casas | Andar casas |
| R-12 | Mudança de planos | Volte até a Travessa do Porto, sem passar pela Partida | Ir para casa (para trás) |
| R-13 | Achou dinheiro na calçada | Receba R$ 50 | Receber do banco |
| R-14 | O seguro pagou | Receba R$ 100 | Receber do banco |
| R-15 | Advogado esperto | Saia da prisão de graça. Guarde esta carta | Saia da prisão |
| R-16 | Herdou um terreninho | Receba R$ 120 | Receber do banco |

R-12 é o único movimento para trás até uma casa específica; o motor precisa do tipo “Ir para casa” com a opção de direção, para não pagar o bônus da Partida (RN-083).

## Formato do arquivo de regras

Tudo deste documento, os parâmetros das regras e os textos do catálogo ficam em um único arquivo, `source/data/regras.json`, lido pelo motor na abertura do jogo. Trecho de exemplo:

```json
{
  "versao": 1,
  "parametros": {
    "dinheiroInicial": 1500, "bonusPartida": 200, "fianca": 50,
    "impostoRenda": 200, "taxaLuxo": 100,
    "estacao": [30, 60, 120, 240], "multCompanhia": [5, 12],
    "maxCasas": 4, "fatorVendaCasa": 0.5,
    "fatorHipoteca": 0.5, "jurosHipoteca": 0.1,
    "passoVenda": 10, "maxPropostasTurno": 2, "maxDuplasSeguidas": 3
  },
  "regrasProprias": { "RP-01": false, "RP-02": false, "RP-03": true, "RP-04": false, "RP-05": false },
  "grupos": {
    "marrom": { "cor": "#8B5A3C", "custoCasa": 50 }
  },
  "casas": [
    { "posicao": 0, "tipo": "partida", "nome": "Partida" },
    { "posicao": 1, "tipo": "rua", "nome": "Travessa do Porto", "grupo": "marrom",
      "preco": 60, "aluguel": [4, 20, 60, 180, 320, 450] },
    { "posicao": 2, "tipo": "sorte", "nome": "Sorte" },
    { "posicao": 5, "tipo": "estacao", "nome": "Estação Sul", "preco": 200 }
  ],
  "cartas": {
    "sorte": [
      { "id": "S-07", "titulo": "Melhor vizinho do ano", "efeito": "Receba R$ 150",
        "acao": { "tipo": "receberBanco", "valor": 150 } }
    ]
  },
  "textos": {
    "D-07": "{jogador}, quer comprar esta propriedade?",
    "M-04": "{jogador} pagou {valor} a {dono}. Tchau dinheiro!"
  }
}
```

- **rotulo:** texto curto mostrado no tabuleiro para as casas que não são ruas (ex.: “SORTE”, “ESTAÇÃO”, “ÁGUA”); as ruas mostram o preço.
- **aluguel:** lista de 6 valores na ordem básico, 1, 2, 3 e 4 casas e hotel.
- **hipoteca:** não é gravada; o motor calcula `preco × fatorHipoteca`.
- **acao.tipo:** um dos tipos das tabelas de cartas (`receberBanco`, `pagarBanco`, `receberCadaJogador`, `pagarCadaJogador`, `irPara` com `destino` e `paraTras`, `estacaoMaisProxima`, `andar`, `irPrisao`, `reparos`, `saiaPrisao`).
- **versao:** sobe a cada mudança de formato, para o salvamento recusar uma partida gravada com regras incompatíveis.

## Plano de balanceamento

Os valores só se provam jogando: as 3 primeiras partidas em família geram números no log do modo DEBUG, e os ajustes são feitos só no JSON.

| O que medir | Como o jogo registra | Sinal de problema | Ajuste provável |
| --- | --- | --- | --- |
| Tempo médio por turno | Início e fim de cada turno | Acima de 60 s | Menos cliques ou mensagens mais curtas, não valores |
| Rodada do primeiro grupo completo | Evento de grupo completo | Depois da rodada 20 | Ligar RP-05 ou baratear propriedades |
| Rodada da primeira falência | Evento de falência | Antes da rodada 10 | Reduzir aluguéis com casas ou aumentar o dinheiro inicial |
| Dinheiro médio no caixa por rodada | Saldo de cada jogador ao fim da rodada | Todos acima de R$ 3.000 após a rodada 20 | Aumentar aluguéis ou reduzir o bônus da Partida |
| Propriedades sem dono na rodada 15 | Contagem ao fim da rodada | Mais de 8 | Baratear as propriedades menos compradas |
| Vendas simples por partida | Evento de venda aceita | Nenhuma | Rever o valor inicial da proposta ou ligar RP-05 |

Regra de ouro: mudar um valor por vez entre partidas e anotar a mudança no registro de decisões do documento Visão e escopo.

### Linha de base simulada (01/11/2026)

Antes das partidas em família, o modo DEBUG `balancear=50` jogou 50 partidas com robôs em cada cenário, com o regras.json atual (veja o README). Os robôs compram toda propriedade que conseguem pagar, constroem quando sobram R$ 300 além do custo da casa e fazem uma proposta de venda simples ao acaso a cada ~10 vezes, sem mirar no grupo que falta. Os números mostram tendências; o ajuste só vem das partidas em família.

Valores: mediana (menor–maior) das 50 partidas; "sinal" conta as partidas com o sinal de problema da tabela acima.

| Medida | 4 jogadores, 30 rodadas | 6 jogadores, 30 rodadas | 4 jogadores, clássico |
| --- | --- | --- | --- |
| Rodadas jogadas | 30 | 30 | 174 (46–500); 6 partidas bateram o teto de 500 |
| 1º grupo completo | Rodada 13 (2–28); nenhum grupo em 18 partidas. Sinal: 25/50 | Rodada 17 (6–30); nenhum grupo em 28 partidas. Sinal: 35/50 | Rodada 19 (4–244). Sinal: 20/50 |
| 1ª falência | Só 2 partidas tiveram falência (rodadas 18 a 23). Sinal: 0/50 | Nenhuma. Sinal: 0/50 | Rodada 82 (39–319). Sinal: 0/50 |
| Dinheiro médio na rodada 20 | R$ 742 (451–1.110). Sinal: 0/50 | R$ 1.059 (830–1.249). Sinal: 0/50 | R$ 686 (401–926). Sinal: 0/50 |
| Sem dono na rodada 15 | 5 (0–9). Sinal: 3/50 | 2 (0–6). Sinal: 0/50 | 5 (2–9). Sinal: 1/50 |
| Vendas simples aceitas | 5 (0–8). Sinal: 1/50 | 8 (2–16). Sinal: 0/50 | 22 (8–56). Sinal: 0/50 |
| Tempo por turno | Só em família | Só em família | Só em família |

Leitura:
- **O sinal que mais acende é o do grupo completo:** em metade das partidas de 30 rodadas com 4 jogadores, ninguém completa um grupo até a rodada 20. Com 6 jogadores, isso acontece em 7 de cada 10 partidas, e sem grupo não há casas. Parte disso vem dos robôs, que não negociam para fechar grupos, e por isso a primeira medida a observar na família é se a venda simples é usada com esse fim.
- **O dinheiro fica apertado** (cerca de metade do inicial na rodada 20) e as falências são raras em 30 rodadas: não há sinal de jogo rico demais nem de falência cedo.
- **A versão 1.0 saiu sem mudar nenhum valor:** os ajustes ficam para as partidas em família, um valor por vez, nas versões 1.x. O primeiro ponto a observar é se a venda simples é usada para completar grupos.
- **O modo clássico com robôs é longo demais para uma noite** (mediana de 174 rodadas). Os modos rodadas e tempo continuam sendo a sugestão para a família.


### Linha de base da versão web (15/11/2026)

O motor em TypeScript jogou as mesmas 50 partidas por cenário com os mesmos robôs do Roku (`pnpm --filter @senhorio/engine balance`, sementes fixas, cerca de 7 s no total). Os dados sorteados são outros, então as partidas não se repetem; a comparação é por tendência.

| Medida | 4 jogadores, 30 rodadas | 6 jogadores, 30 rodadas | 4 jogadores, clássico |
| --- | --- | --- | --- |
| Rodadas jogadas | 30 | 30 | 181 (44–500); 5 partidas bateram o teto de 500 |
| 1º grupo completo | Rodada 14 (4–25); nenhum grupo em 15 partidas. Sinal: 23/50 | Rodada 11 (3–30); nenhum grupo em 27 partidas. Sinal: 31/50 | Rodada 22 (3–177). Sinal: 27/50 |
| 1ª falência | Só 1 partida teve falência (rodada 27). Sinal: 0/50 | 6 partidas tiveram falência (rodadas 16 a 27). Sinal: 0/50 | Rodada 87 (13–285). Sinal: 0/50 |
| Dinheiro médio na rodada 20 | R$ 673 (410–1.036). Sinal: 0/50 | R$ 1.013 (783–1.291). Sinal: 0/50 | R$ 710 (431–1.014). Sinal: 0/50 |
| Sem dono na rodada 15 | 5 (1–9). Sinal: 3/50 | 2 (0–5). Sinal: 0/50 | 5 (1–12). Sinal: 3/50 |
| Vendas simples aceitas | 5 (0–12). Sinal: 1/50 | 8 (3–12). Sinal: 0/50 | 24 (4–82). Sinal: 0/50 |
| Erros do motor | 0 | 0 | 0 |

Comparação com o Roku:
- **Batem:** rodadas do modo clássico, 1º grupo completo com 4 jogadores, falências com 4 jogadores e no clássico, dinheiro médio, propriedades sem dono e vendas simples. Os sinais de problema acendem nas mesmas medidas e em proporções parecidas.
- **Diferença a observar:** falências com 6 jogadores em 30 rodadas. Em 600 partidas com sementes espalhadas, a taxa da web fica em torno de 6 a 7% (contra cerca de 3% com 4 jogadores), e o Roku teve 0 em 50. Com essa taxa, 0 em 50 tem cerca de 3% de chance de acontecer: improvável, mas possível. Nenhuma diferença de regra foi encontrada (os 45 cenários do Roku passam, e as falências se distribuem por todos os jogadores e posições na ordem). Fica registrada para observar nas partidas reais.
- **Mediana do 1º grupo com 6 jogadores** (rodada 11 contra 17 no Roku): a mediana conta só as cerca de 20 partidas que completaram um grupo, por isso varia muito; a faixa e o número de partidas sem grupo são parecidos.

## Pendências

Responda abaixo de cada item, como nos documentos anteriores.

- [ ] Os nomes das ruas agradam, ou prefere outro tema (bairros fictícios, nomes de pessoas da família, cidades)?
  - [ ] Muito bom! Me agradou
- [ ] Algum título de carta não combina com a família ou poderia ser mais engraçado?
  - [ ] Está bom
- [ ] Dinheiro inicial de R$ 1.500 está bom para começar, ou prefere partidas mais rápidas com R$ 1.200?
  - [ ] Está bom
- [ ] Quer que eu gere agora o arquivo `regras.json` completo a partir deste documento, para entregar ao Claude Code junto com os outros?
  - [ ] Sim, por favor.
