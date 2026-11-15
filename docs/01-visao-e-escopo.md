# Senhorio Web – Visão e escopo

## Visão

O Senhorio Web leva para o navegador o jogo de tabuleiro imobiliário por turnos criado para o Roku. O computador continua sendo o banco: calcula valores, cobra, paga e pergunta o que cada jogador quer fazer. Os jogadores só decidem e conversam.

As regras, os valores, os textos e a identidade visual vêm do projeto do Roku (versão 1.0.1). Nome, regras, valores e arte são próprios, sem uso das marcas Banco Imobiliário ou Monopoly.

## Público e contexto de uso

Família e amigos, de 2 a 6 jogadores, com idades variadas. O jogo roda no navegador, sem instalação obrigatória, e pode ser instalado como aplicativo (PWA) onde o navegador permitir.

## Modos de jogo

| Modo | Como funciona | Internet |
| --- | --- | --- |
| **Um dispositivo** | Um aparelho só, passado de mão em mão, como no Roku. O motor de regras roda no próprio navegador. | Não precisa, depois do primeiro acesso (PWA offline) |
| **Vários dispositivos** | Um jogador cria uma sala e informa o código aos outros. Cada um joga no próprio aparelho e vê o tabuleiro inteiro. O motor roda no servidor da sala. | Precisa |

Regras do modo de vários dispositivos:

- **Nenhuma sala é pública.** Não existe lista de salas; só entra quem recebe o código de quem criou.
- **Sem conta nem login.** O jogador informa só um apelido. Um token guardado no navegador permite reconectar à mesma sala.
- **Queda de conexão:** a partida pausa esperando o jogador voltar. Depois de alguns minutos ({minutosParaRemover}, a definir), quem criou a sala pode removê-lo; ele sai como "abandonou" e as propriedades voltam ao banco (RN-115).
- **Venda simples:** a outra parte responde no próprio aparelho, sem a tela "Passe o controle".

Os modos de partida (clássico, tempo e rodadas) valem para os dois modos de jogo, como definido no docs/02-regras-de-negocio.md.

## Dispositivos

| Dispositivo | Entrada | Observação |
| --- | --- | --- |
| Celular | Toque | Layout próprio em retrato; o tabuleiro de paisagem não cabe de pé |
| Tablet | Toque | Retrato e paisagem |
| Desktop | Mouse e teclado | Navegação completa só pelo teclado |
| Smart TV com navegador | Direcional do controle remoto | Samsung (Tizen), LG (webOS) e Android/Google TV. Instalação como PWA geralmente indisponível; roda como site |

Aparelhos Roku não têm navegador. Para eles continua valendo o app do Roku.

## Princípios de design

Herdados do Roku, na mesma ordem de prioridade:

1. **O banco faz as contas.** Nenhum jogador calcula aluguel, troco ou patrimônio; o jogo mostra o resultado e o motivo.
2. **Poucos cliques.** No máximo 3 toques ou cliques por decisão, com a opção mais provável já em foco.
3. **Legível em qualquer tela.** Frases curtas, fonte grande, 2 a 4 opções por pergunta; legível a 3 m na TV e com uma mão no celular.
4. **Ritmo.** Animações curtas (cerca de 150 ms por casa) e partidas com fim previsível nos modos tempo e rodadas.
5. **Tudo à vista.** Dinheiro, propriedades, casas e de quem é a vez sempre visíveis.

E um princípio novo da web:

6. **Leve em aparelho fraco.** O jogo precisa rodar bem no navegador de TV e no celular simples; efeitos 3D são acabamento opcional, com versão 2D de reserva.

## Escopo

**Entra:**

- Todas as regras do Senhorio para Roku 1.0.1 (RN e RP), com o mesmo arquivo de regras.
- Modo de um dispositivo, com salvamento automático no navegador e "Continuar partida".
- Modo de vários dispositivos, com salas privadas por código, reconexão e pausa.
- Layouts para celular, tablet, desktop e TV; toque, mouse, teclado e direcional.
- PWA instalável e offline no modo de um dispositivo.
- Visual 2D; dados em 3D (e talvez casas e hotéis) como acabamento.
- Publicação gratuita na Cloudflare.

**Fica para depois** (herdado da lista do Roku, na ordem que o uso indicar):

| Item | Motivo para esperar |
| --- | --- |
| TV como tabuleiro principal e celulares como controle | Decidido que, por enquanto, cada jogador vê o tabuleiro inteiro no próprio aparelho |
| Leilão de propriedades não compradas | Não estava no Roku; avaliar depois das partidas reais |
| Negociação completa (vários itens, trocas) | A venda simples cobre o essencial |
| Efeitos sonoros e música | Acabamento; não muda as regras |
| Jogadores controlados pelo computador | Exige estratégia de decisão própria (os robôs de teste não servem para jogar contra pessoas) |
| Tabuleiro inteiro em 3D | Pesa em TV e celular simples e piora a leitura |

## Custos

O projeto precisa caber no plano gratuito:

| Item | Serviço | Custo |
| --- | --- | --- |
| Código e CI | GitHub e GitHub Actions | Gratuito |
| Site e salas | Cloudflare Workers + Durable Objects (versão com SQLite) | Plano gratuito, com limites diários; ao passar do limite as operações falham, sem cobrança |
| Endereço | `*.workers.dev` | Gratuito (domínio próprio é opcional e pago à parte) |

Os limites exatos do plano gratuito são conferidos na documentação oficial da Cloudflare antes da publicação (Etapa 5).

## Riscos e premissas

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Navegador de TV lento ou incompatível | Animações travando ou jogo sem abrir | Visual 2D leve, 3D opcional com reserva 2D, teste em aparelho real a cada etapa de tela |
| Diferença de regra entre o motor web e o do Roku | Partidas com resultado diferente do jogo aprovado | Portar os 45 CTs e comparar o balanceamento com a linha de base do Roku |
| Limites do plano gratuito | Salas param de funcionar no dia | Uso familiar fica muito abaixo do limite; salas ociosas hibernam; monitorar no painel |
| Código de sala adivinhado | Estranho entra na partida | Código de 6 caracteres (cerca de 1 bilhão de combinações), limite de tentativas, entrada fechada depois do início, expiração por inatividade |
| Dados pessoais (LGPD) | Exposição de dados | Só apelidos; nenhuma conta; sala apagada ao fim ou por inatividade |
| Trabalho em dois computadores | Perder alterações ou gerar conflitos | GitHub como única fonte da verdade: `git pull` ao começar, commit e push ao terminar (CLAUDE.md) |

## Registro de decisões

Uma decisão nova entra no topo da tabela com o motivo.

| Data | Decisão | Motivo |
| --- | --- | --- |
| 15/11/2026 | Testes com Vitest, fast-check, Testing Library (Svelte), vitest-pool-workers, Playwright e axe-core; CI no GitHub Actions bloqueia etapa com teste falhando | Mesmo rigor do Roku (45 CTs), com mais automação: vários tamanhos de tela, vários jogadores e modo offline |
| 15/11/2026 | Nomes técnicos (pastas, arquivos, código, ações, eventos, chaves do JSON) em inglês; README, docs, comentários e textos do jogo em PT-BR; commits em PT-BR no imperativo | Pedido do dono do projeto; código em inglês combina com as bibliotecas, e a documentação continua em português |
| 15/11/2026 | Mockups no Figma (Etapa 1b), em paralelo com o motor e antes das telas | O motor não tem tela; as telas da web precisam de layouts novos para celular, tablet, desktop, TV e salas |
| 15/11/2026 | Repositório novo; o repositório do Roku é só referência | Tecnologias diferentes; o Roku segue como produto próprio |
| 15/11/2026 | Regras e valores do `regras.json` v1 do Roku, abertos a mudanças | Regras já aprovadas e balanceadas; ajustes virão do uso |
| 15/11/2026 | Queda de conexão pausa a partida; depois de alguns minutos, quem criou a sala pode remover o jogador (RN-115) | Ninguém perde a partida por uma queda rápida, e ninguém fica preso esperando para sempre |
| 15/11/2026 | Cada jogador vê o tabuleiro inteiro no próprio aparelho | Mais simples; "TV como tabuleiro e celular como controle" fica para depois |
| 15/11/2026 | Visual 2D (SVG/CSS); 3D com Three.js só como acabamento, nos dados e talvez nas casas e hotéis | Leve em TV e celular simples e mais legível |
| 15/11/2026 | Cloudflare Workers + Durable Objects para o site e as salas | Plano gratuito sem cartão, um provedor só, motor rodando no servidor da sala; Firebase exigiria plano pago para lógica no servidor, Supabase pausa projetos ociosos e P2P acaba a partida se quem criou sair |
| 15/11/2026 | TypeScript, Vite, Svelte 5 e PWA | Tipagem no estado e nas ações; pacote pequeno e rápido em TV e celular |
| 15/11/2026 | Motor de regras portado do BrightScript para TypeScript puro, compartilhado entre navegador e servidor | Uma única fonte de verdade das regras para os dois modos de jogo |

## Em aberto

- Valor de {minutosParaRemover} e tempo de expiração de sala inativa (Etapa 4).
- Cronômetro do modo tempo no modo de vários dispositivos: além do menu, ele também para durante a pausa por queda de conexão? (proposta: sim).
- Jogador inativo que não sai da sala: haverá limite de tempo por decisão? (proposta: não no início).
