# Senhorio – Plano de testes (Roku)

> **Referência do Senhorio para Roku (v1.0.1).** Os cenários CT-01 a CT-45 são portados para a web com os mesmos números (docs/08-plano-de-testes.md). O roteiro manual na TV e os parâmetros de abertura (`testes=1`, `simular=`, `balancear=`) são do Roku.


O motor de regras é testado automaticamente, cenário por cenário, antes de qualquer tela; a TV só confere o que a máquina não vê: leitura, foco, ritmo e diversão.

## Estratégia

São quatro tipos de teste; quanto mais cedo no desenvolvimento, mais barato é achar o erro, por isso a maior parte do esforço fica nos testes automáticos do motor.

| Tipo | O que verifica | Quem executa | Quando |
| --- | --- | --- | --- |
| Automático do motor | Cada regra RN-xxx com dados fixos | O próprio app em modo DEBUG | A cada mudança no motor, antes de qualquer commit |
| Manual na TV | Telas, foco, textos, leitura a 3 m, botão Voltar | Você, com o controle | Ao fim de cada etapa do roadmap |
| Resistência | Memória em partidas longas, salvamento ao fechar ou desligar | Você, com o modo de estresse e o console | Antes da primeira partida em família |
| Balanceamento | Ritmo e diversão com pessoas reais | Família e amigos | Nas 3 primeiras partidas completas |

## Como rodar os testes do motor

Os testes são funções BrightScript em `source/testes/`, executadas por um pequeno executor próprio quando o app abre em modo DEBUG com o parâmetro `testes=1`.

Cada teste monta um estado, fixa os dados e confere o resultado:

```brightscript
' CT-12 · RN-043: rua com 3 casas cobra o valor da escada
function Teste_CT12_AluguelTresCasas() as object
    ctx = CriarContextoTeste([3, 2])          ' próximos dados: 3 e 2
    est = EstadoDeTeste({ jogadores: 2, posicao: [0, 0] })
    DefinirDono(est, 1, 0)                    ' Travessa do Porto é do jogador 0
    DefinirDono(est, 3, 0)                    ' Beco das Flores também
    DefinirCasas(est, 1, 3)
    est.jogadores[1].posicao = 36                 ' jogador 1 vai andar 5 casas
    r = Transicao(est, { tipo: "ROLAR" }, ctx)
    return Esperar(r.estado.jogadores[1].dinheiro, 1500 - 180 + 200, "paga R$ 180 e recebe a Partida")
end function
```

- **Executor:** percorre uma lista explícita das funções `Teste_*` (BrightScript não descobre funções pelo nome sozinho), roda uma a uma, isola erros (um teste quebrado não derruba os outros) e imprime no console `[TESTE] OK CT-12` ou `[TESTE] FALHOU CT-12: esperado 1520, obtido 1700`, com um resumo no fim.
- **Gerador fixo:** `CriarContextoTeste(t, [3, 2, ...])` recebe a sequência de faces dos dados (de dois em dois); os baralhos ficam na ordem do regras.json e `CartaNoTopo(est, "sorte", "S-01")` escolhe a carta do topo. Cada teste recebe `t` e registra as conferências com `Esperar(t, obtido, esperado, descrição)`; os arquivos ficam em `source/testes/` (Executor, TestesTurno, TestesAluguel, TestesConstrucao, TestesPrisaoCartas, TestesVendaDivida, TestesFimRegras e Simulacao).
- **Regras de teste:** os testes usam o regras.json real; se um valor mudar no balanceamento, o teste que depende dele mostra a diferença.
- **Como disparar:** instalar com DEBUG ligado e abrir o app com o parâmetro `testes=1` pela interface de controle da Roku (ECP): `curl -d '' "http://IP-do-Roku:8060/launch/dev?testes=1"`. Os parâmetros da URL chegam em `Main(args)` como `args.testes`. A saída sai no console da porta 8085 e termina com `[TESTE] Resumo: N OK, M falharam`.
- **Partida longa simulada:** `simular=200` no lugar de `testes=1` roda 200 rodadas com 6 jogadores automáticos e imprime `[SIMULACAO]` a cada 10 rodadas (base do teste de resistência).
- **Balanceamento simulado:** `balancear=50` (com `jogadores=` e `modo=rodadas&limite=30` ou `modo=classico`) joga 50 partidas automáticas e imprime as medidas do docs/05 como `[BALANCO]`; a linha de base está no docs/05.
- **Onde fica o DEBUG:** a chave é `bs_const=DEBUG=true` no `manifest`. Um `#const` declarado em `Log.brs` valeria só naquele arquivo ([documentação da Roku](https://developer.roku.com/docs/references/brightscript/language/conditional-compilation.md)). Os arquivos de `source/testes/` ficam inteiros dentro de `#if DEBUG`.
- **Fora da versão da família:** com `bs_const=DEBUG=false`, o executor e a simulação nem são compilados, e nenhum log `[TURNO]` é impresso.
- **Registro nos testes:** CT-42 e CT-43 usam a seção `tabuleiroTeste`, apagada no fim, e não tocam na partida salva de verdade.
- **Erros esperados no console:** o CT-44 carrega de propósito um JSON quebrado e um arquivo inexistente, então duas linhas `BRIGHTSCRIPT: ERROR` (ParseJSON e ReadAsciiFile) aparecem durante os testes.
- **CT-17:** usa a carta real S-06 (“Visita técnica”, avance até a Companhia de Energia).

## Cenários do motor

São 45 cenários automáticos, pelo menos um por regra com cálculo ou decisão; marque a Situação conforme o Claude Code os implementar.

| ID | Regra | Cenário | Resultado esperado | Situação |
| --- | --- | --- | --- | --- |
| CT-01 | RN-003 | Nova partida com 4 jogadores | Todos com R$ 1.500 na casa 0, ordem sorteada | Passou (Roku) |
| CT-02 | RN-013 | Dados 6 + 5 a partir da casa 35 | Passa pela Partida (+R$ 200) e para na casa 6 | Passou (Roku) |
| CT-03 | RN-015 | Dupla 3 + 3 | Resolve a casa e oferece nova jogada | Passou (Roku) |
| CT-04 | RN-016 | Terceira dupla seguida | Vai à prisão sem andar a soma e sem bônus | Passou (Roku) |
| CT-05 | RN-018 | Vez de um jogador falido | É pulado; joga o próximo ativo | Passou (Roku) |
| CT-06 | RN-032 | Comprar rua sem dono com dinheiro | Desconta o preço e define o dono | Passou (Roku) |
| CT-07 | RN-033 | Comprar sem dinheiro suficiente | Recusado com o motivo “Faltam R$ X” | Passou (Roku) |
| CT-08 | RN-034 | Não comprar | Propriedade continua com o banco | Passou (Roku) |
| CT-09 | RN-043 | Rua com dono, grupo incompleto | Cobra o aluguel básico | Passou (Roku) |
| CT-10 | RN-043 | Grupo completo sem casas | Cobra o básico dobrado | Passou (Roku) |
| CT-11 | RN-047 | Grupo completo com uma rua hipotecada | As outras ruas seguem com básico dobrado | Passou (Roku) |
| CT-12 | RN-043 | Travessa do Porto com 3 casas | Cobra R$ 180 | Passou (Roku) |
| CT-13 | RN-041 | Propriedade hipotecada | Não cobra aluguel | Passou (Roku) |
| CT-14 | RN-042, RP-03 | Dono preso com RP-03 ligada e desligada | Ligada: não cobra; desligada: cobra | Passou (Roku) |
| CT-15 | RN-044 | Dono com 3 estações | Cobra R$ 120 | Passou (Roku) |
| CT-16 | RN-045 | Dados 4 + 3, dono com as 2 companhias | Cobra R$ 84 | Passou (Roku) |
| CT-17 | RN-046 | Chegar à companhia por carta | Banco rola os dados só para o aluguel | Passou (Roku) |
| CT-18 | RN-050 | Construir sem grupo completo | Recusado | Passou (Roku) |
| CT-19 | RN-052 | Construir fora da ordem uniforme | Recusado; só ruas permitidas são oferecidas | Passou (Roku) |
| CT-20 | RN-053 | Construir com 4 casas em todo o grupo | A rua passa a ter hotel (casas = 5) | Passou (Roku) |
| CT-21 | RN-054 | Vender casa e vender hotel | Recebe 50% do custo; hotel volta a 4 casas | Passou (Roku) |
| CT-22 | RN-061 | Hipotecar rua com casas no grupo | Recusado | Passou (Roku) |
| CT-23 | RN-063 | Resgatar hipoteca de R$ 120 | Custa R$ 132 | Passou (Roku) |
| CT-24 | RN-070 | Parar na casa 30 | Vai à casa 10 sem bônus; o turno acaba | Passou (Roku) |
| CT-25 | RN-073 | Preso tira dupla | Sai e anda, sem nova jogada | Passou (Roku) |
| CT-26 | RN-074 | Terceira tentativa sem dupla | Paga R$ 50 e anda a soma | Passou (Roku) |
| CT-27 | RN-075 | Venda simples com um jogador preso | Preso não aparece como alvo nem propõe | Passou (Roku) |
| CT-28 | RN-083 | Carta S-01 a partir da casa 33 | Vai à Partida e recebe R$ 200 | Passou (Roku) |
| CT-29 | RN-083 | Carta R-12 a partir da casa 22 | Volta à casa 1 sem bônus | Passou (Roku) |
| CT-30 | RN-082 | Carta Saia da prisão | Sai do baralho até ser usada | Passou (Roku) |
| CT-31 | RN-080 | Carta R-07 com 3 casas e 1 hotel | Paga R$ 175 | Passou (Roku) |
| CT-32 | RN-092 | Vender rua com casas no grupo | Não elegível | Passou (Roku) |
| CT-33 | RN-095 | Proposta aceita | Transfere dinheiro e dono na hora | Passou (Roku) |
| CT-34 | RN-096 | Terceira proposta no turno | Recusada | Passou (Roku) |
| CT-35 | RN-100 | Aluguel maior que o caixa | Vai a LEVANTAR\_DINHEIRO com o valor que falta | Passou (Roku) |
| CT-36 | RN-102 | Bens não cobrem a dívida | Falência oferecida direto | Passou (Roku) |
| CT-37 | RN-103 | Falência para outro jogador | Casas vendidas; hipotecadas passam; credor paga 10% | Passou (Roku) |
| CT-38 | RN-104 | Falência para o banco | Propriedades voltam livres e sem casas | Passou (Roku) |
| CT-39 | RN-111 | Cálculo de patrimônio | Dinheiro + preços + casas − hipotecas | Passou (Roku) |
| CT-40 | RN-112 | Empate de patrimônio | Vence quem tem mais dinheiro | Passou (Roku) |
| CT-41 | RN-113 | Tempo zera no meio da rodada | A rodada termina antes do resultado | Passou (Roku) |
| CT-42 | Salvamento | Salvar e ler o estado | Estado lido é idêntico ao salvo | Passou (Roku) |
| CT-43 | Salvamento | Salvamento com outra versaoRegras | Recusado; só “Nova partida” | Passou (Roku) |
| CT-44 | Regras | regras.json com rua sem aluguel | Erro claro na abertura, sem travar | Passou (Roku) |
| CT-45 | RN-102 | Declarar falência quando vender casas e hipotecar cobrem a dívida | Recusado com o valor que ainda dá para levantar; hipotecando, a dívida é paga | Passou (Roku) |

## Roteiro manual na TV

Feito sentado no sofá, a cerca de 3 m da TV, ao fim de cada etapa; cada item vale para todas as telas daquela etapa.

**Etapa 2 (T-06 a T-21 e T-23): roteiro aprovado na TV em 31/10/2026**, incluindo a partida inteira e `autojogo=1` por 30 minutos com memória estável. O item de nomes com acento e 10 caracteres fica para a Etapa 3, quando os nomes passam a ser digitados.

**Etapa 3 (T-01 a T-05 e T-22): roteiro aprovado na TV em 31/10/2026**, incluindo a partida inteira nos três modos, nomes com acento e 10 caracteres digitados no teclado da tela, fechar o app no meio do turno e desligar a TV da tomada. As caixas abaixo continuam em branco para as próximas etapas.

**Leitura e visual**

- [ ] Todo texto de pergunta, botão e mensagem é legível do sofá sem esforço.
- [ ] Nenhum texto corta ou passa da borda do cartão ou da tela.
- [ ] Valores aparecem como R$ 1.234, sem centavos, em todas as telas.
- [ ] O jogador da vez é identificável em menos de 2 segundos (painel e cartão).
- [ ] Peões, donos e casas construídas são distinguíveis no tabuleiro.

**Controle e foco**

- [ ] Ao abrir qualquer tela, o foco já está na opção indicada no catálogo.
- [ ] O anel dourado de foco está sempre visível e nunca some.
- [ ] Opções desabilitadas são puladas pelo foco e mostram o motivo.
- [ ] Voltar nunca confirma nada; em decisões obrigatórias, só esconde e mostra o cartão.
- [ ] ✱ abre o menu só nos momentos previstos (D-02, D-03, D-04, D-05, D-08).
- [ ] Segurar ◀ ▶ no seletor de valor acelera o passo.

**Ritmo**

- [ ] Um turno simples (rolar e encerrar) leva no máximo 3 cliques e menos de 15 segundos.
- [ ] O peão anda casa a casa de forma fluida, sem travadas.
- [ ] As mensagens de resultado somem em 4 segundos e OK pula a espera.

**Textos**

- [ ] Todo texto na tela bate com o regras.json (nenhum texto fixo no código).
- [ ] Nomes de jogadores com acento e com 10 caracteres aparecem inteiros.

## Testes de resistência

O protótipo já passou no estresse de animação (3% de memória); estes testes repetem a verificação com o jogo completo e cobrem o salvamento.

| Teste | Como fazer | Critério de aprovação |
| --- | --- | --- |
| Partida longa simulada | Modo DEBUG com jogadas automáticas: `simular=200` (só o motor, 200 rodadas e 6 jogadores) e `autojogo=1` com `jogadores=6` (tela e animações reais) | Memória livre estável (sem queda contínua) e nenhum erro no console. Etapa 4: 3 simulações sem erro no emulador; autojogo aprovado no Roku (01/11/2026) |
| Memória por hora de uso | Deixar uma partida aberta por 2 horas, jogando de tempos em tempos; na Etapa 2, `autojogo=1` por 30 minutos; na Etapa 4, `autojogo=1&jogadores=6` por 2 horas, resumido com `scripts/resumo-memoria.py` | Variação de memória livre menor que 5 MB entre o início e o fim (média das 5 primeiras contra a das 5 últimas medições, por causa da coleta de lixo). Aprovado no Roku em 01/11/2026 (2 horas, números não guardados) |
| Fechar o app no meio do turno | Apertar Início no controle durante uma animação | Ao voltar, “Continuar partida” abre no início do turno interrompido (aprovado na Etapa 3) |
| Desligar a TV da tomada | Desligar após um FIM\_TURNO e religar | Partida salva intacta, com dinheiro e posições certos (aprovado na Etapa 3) |
| Salvamento cheio | Estado com 6 jogadores, todas as propriedades com dono e casas | Tamanho do JSON abaixo de 8 KB (metade do limite de 16 KB); medido na Etapa 3: cerca de 2,8 KB |
| Regras inválidas | Instalar `out/teste-regras-invalidas.zip` (`./scripts/package.sh --regras-invalidas`) | Mensagem clara na tela, sem travar o aparelho (aprovado no Roku em 01/11/2026) |

## Partidas de balanceamento

Roteiro das versões 1.x: a 1.0 saiu com a linha de base simulada (docs/05), e estas partidas trazem os ajustes seguintes.

As 3 primeiras partidas completas em família são o teste final: as impressões saem de uma conversa rápida ao fim de cada partida. A linha de base dos números já foi medida com robôs (`balancear=50`, docs/05); nas partidas em família, o que importa anotar é o que só pessoas mostram.

1. **Partida 1:** 4 jogadores, modo rodadas com 30 rodadas, regras como estão. Objetivo: medir o tempo real por turno e confirmar se 30 rodadas cabem numa noite.
2. **Partida 2:** 4 a 6 jogadores, modo tempo com 45 minutos. Objetivo: ver quantos grupos completos e casas surgem, e se a venda simples é usada.
3. **Partida 3:** modo clássico, com o ajuste de no máximo um valor sugerido pelas duas primeiras. Objetivo: ver em que rodada sai a primeira falência.

Ao fim de cada partida, anote em uma linha cada:

- [ ] Duração total e número de rodadas jogadas.
- [ ] O momento mais divertido e o mais chato, segundo os jogadores.
- [ ] Alguma tela em que alguém ficou perdido ou apertou o botão errado.
- [ ] Os números do log pedidos na tabela do documento Dados e balanceamento.
- [ ] A única mudança de valor para a próxima partida, registrada no registro de decisões.

## Critérios de pronto

Uma etapa só termina quando todos os itens da sua linha passam; as etapas em si serão detalhadas no documento Roadmap.

| Etapa | Pronta quando |
| --- | --- |
| Motor de regras | CT-01 a CT-41, CT-44 e CT-45 passando; nenhuma regra com valor fixo no código; motor sem nenhum nó SceneGraph |
| Telas do jogo | Roteiro manual na TV aprovado para T-06 a T-21 e T-23; uma partida completa jogável só com o controle |
| Telas cheias e salvamento | CT-42 a CT-44 passando; roteiro manual aprovado para T-01 a T-05 e T-22; testes de fechar o app e desligar a TV aprovados |
| Acabamento | Testes de resistência aprovados; DEBUG desligado na versão da família; logo e ícones finais no manifest |
| Versão 1.0 para a família | Aplicativo testado na TV e linha de base simulada registrada no docs/05 (critério mudado em 01/11/2026; as 3 partidas de balanceamento ficam para as versões 1.x) |

Em todas as etapas: código revisado nos diffs, commit com tag da etapa e nenhuma senha ou IP no repositório.
