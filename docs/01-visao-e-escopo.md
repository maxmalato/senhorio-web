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
| 23/11/2026 | O Worker passa a se chamar `senhorio`; endereço `senhorio.<subdomínio>.workers.dev` (o subdomínio da conta mudou para guardar vários jogos) | Com vários jogos no mesmo subdomínio, o nome do Worker identifica o jogo; "jogo" ficaria ambíguo |
| 17/11/2026 | "Como jogar" com as regras em oito seções (textos A-01 a A-09 no arquivo de regras, valores preenchidos pelos parâmetros), na tela inicial e no botão "?" da partida, em todos os modos; no modo um aparelho, abrir as regras pausa o cronômetro e o computador. Adversário do computador corrigido: com a RP-03, sai da prisão quando tem propriedade rendendo | Regras à mão a qualquer momento, sem depender da vez; textos sempre no arquivo de regras; o resumo acompanha qualquer mudança de valor; a estratégia anterior ignorava que o dono preso não cobra aluguel |
| 17/11/2026 | Modo mesa presencial: a sala de espera da mesa mostra só o QR Code e o código (sem Compartilhar link nem Copiar código) e orienta quem está longe a usar uma sala normal; o jogo não confere se todos estão na mesma rede | A mesa é para quem está diante da mesma tela; conferir a rede bloquearia celulares nos dados móveis e redes IPv6 e exigiria guardar o endereço de internet da mesa |
| 17/11/2026 | Modo mesa: "Criar mesa" só em tela grande (lado menor a partir de 600 px); a mesa cria a sala, não joga e comanda (começar, pausar, remover, jogar de novo); só a mesa encerra a sala, com confirmação, e os jogadores só saem; se a mesa cair, a partida segue e os jogadores comandam; a TV não entra em sala já criada; mesa com tela acesa (Wake Lock) e tela cheia | A mesa precisa de tela grande e serve também para notebook e tablet; evitar que um celular derrube a partida de todos; a partida não pode depender da TV; um fluxo só é mais simples na sala de casa |
| 17/11/2026 | QR Code para entrar na sala com a biblioteca `uqr` (dependência de produção aprovada pelo dono do projeto), gerado no aparelho; link `/?sala=CÓDIGO` com o código tirado da barra de endereço depois de lido; botão "Compartilhar link". Modo mesa a seguir, para TV, notebook ou tablet (não para celular). Na partida com mesa, a mesa toca os sons gerais e os celulares só o "sua vez" e o próprio dinheiro | `uqr` não tem dependências, é pequena e mantida; escrever o gerador seria arriscado; nenhum serviço de fora recebe o código da sala; a mesa precisa de tela grande; evitar vários celulares tocando o mesmo som |
| 17/11/2026 | Jogar contra o computador: adversário novo no motor (`ai/opponent.ts`), separado do robô da simulação; só no modo um aparelho, com pelo menos uma pessoa; jogadores marcados com `bot: true` no estado (vão no salvamento); sem "Passe o aparelho" quando só uma pessoa joga | O robô da simulação decide ao acaso e não serve contra pessoas; no motor, a estratégia fica testável e sem depender do navegador; nas salas cada pessoa já tem o próprio aparelho |
| 17/11/2026 | Endereço do jogo passa a ser `jogo.<subdomínio>.workers.dev`: o Worker se chama `jogo` em vez de `senhorio-web` | O endereço repetia "senhorio-web" (nome do Worker igual ao subdomínio da conta); mudar só o nome do Worker é grátis, fica no código e não depende de nome livre no painel |
| 17/11/2026 | Etapa 6: sons gerados pelo navegador (Web Audio), ligados por padrão e desligáveis na tela inicial junto com a vibração; aviso de "sua vez" só no modo de vários aparelhos, com som, vibração e título da aba piscando, sem notificações do sistema; casas e hotéis em 3D ficam de fora | Sem arquivos nem biblioteca nova e sem direitos autorais; no modo de vários aparelhos cada um se distrai enquanto os outros jogam; notificações do sistema pediriam autorização e não funcionam bem em todos os aparelhos; 3D no tabuleiro pesaria na TV e no celular fraco |
| 17/11/2026 | A partir da Etapa 6, cada tarefa em uma branch `develop/nome-da-tarefa` criada da `main`; o CI testa a branch sem publicar; o dono do projeto testa e faz o merge na `main`, que publica. Three.js aprovado como dependência de produção, só para os dados em 3D | A `main` virou a versão publicada: nada chega aos jogadores sem teste; Three.js é a biblioteca de 3D mais usada e mantida, carregada só quando os dados aparecem |
| 17/11/2026 | Etapa 5: publicação no endereço gratuito `workers.dev`, automática pelo CI a cada push na `main` depois de todos os testes; token da Cloudflare com o modelo "Edit Cloudflare Workers", só da conta, validade de 1 ano; registros de acesso do Worker desligados; política de privacidade e termos em página estática (`/privacidade.html`), com contato pela página de Issues do GitHub | Grátis e sem passos manuais; menor privilégio e troca periódica do token; LGPD sem coletar nada além de apelidos; a página abre sem JavaScript e pode ser lida antes de jogar; Issues evitam expor um e-mail pessoal |
| 16/11/2026 | Etapa 4: textos das salas W-01 a W-60 no catálogo; cada aparelho manda no máximo 40 mensagens a cada 10 s; partida das salas testada na rede local com `wrangler dev` até a publicação; com o foco perdido, o OK devolve o foco à opção padrão | Textos sempre no arquivo de regras; proteção contra excesso de mensagens sem atrapalhar quem joga; publicar só na Etapa 5; o controle remoto nunca pode ficar sem ação |
| 16/11/2026 | Etapa 4: remover jogador desconectado depois de 3 minutos (quem criou a sala; se também estiver fora, qualquer jogador conectado); cronômetro do modo tempo parado durante a pausa por queda; sem limite de tempo por decisão; sala apagada depois de 12 horas sem atividade. Nova ação do motor `REMOVE_PLAYER`: bens ao banco (RN-115), fora ou dentro da vez, cancelando proposta e encerrando dívida do removido | Propostas aprovadas nos mockups; o motor precisava tirar alguém da partida fora da própria vez |
| 16/11/2026 | Etapa 3: partida salva no IndexedDB a cada fim de turno; PWA com `vite-plugin-pwa` (Workbox), atualização só quando o jogador pede; textos novos I-92 a I-96 no catálogo | Mesmo ponto de salvamento do Roku; nunca recarregar no meio de uma partida; textos sempre no arquivo de regras |
| 16/11/2026 | "Começar partida" ignora um segundo toque enquanto a primeira gravação termina | Os testes acharam o início duplo da mesma partida quando o armazenamento estava lento |
| 16/11/2026 | Tabuleiro: botão Preços/Nomes (no celular, nome curto como "Palmeiras"), destaque no tabuleiro da propriedade escolhida nas listas, ícones nas casas especiais no celular e peões agrupados em grade quando dividem a casa | Primeiro teste em aparelho real: no celular as casas especiais ficavam sem nome, o jogador não sabia em qual rua construir e mais de 5 peões na mesma casa saíam do tabuleiro |
| 15/11/2026 | Etapa 2: nas listas (construir, vender casas, hipotecar, resgatar), escolher um item leva o foco ao botão de confirmar; o cartão de decisão fica montado durante as animações | Com o controle remoto, OK escolhe e OK de novo confirma, sem cliques escondidos; o menu não volta ao início depois de cada construção |
| 15/11/2026 | Textos do catálogo adaptados à web: "Passe o controle" virou "Passe o aparelho" (D-01, D-18) e as dicas de D-02 e D-03 falam em tocar no botão ou apertar OK; nenhum valor de regra mudou | O jogo roda em celular, tablet, computador e TV, não só com controle remoto |
| 15/11/2026 | Celular em pé com a variação B dos mockups (abas Tabuleiro e Jogadores) | Escolha do dono do projeto na revisão dos mockups |
| 15/11/2026 | Ícones desenhados como dados SVG por um componente, sem HTML cru (`{@html}` proibido pelo lint) | Evita qualquer brecha de injeção de HTML, mesmo com conteúdo fixo |
| 15/11/2026 | Etapa 1 (motor em TypeScript) concluída com a tag `v0.2-motor`: 45 cenários do Roku, CT-46 a CT-52, invariantes com fast-check e balanceamento próximo da linha de base do Roku; nenhum valor do arquivo de regras mudou | Única diferença: mais falências com 6 jogadores em 30 rodadas (cerca de 6 a 7% das partidas contra 0 em 50 no Roku), sem diferença de regra encontrada; fica para observar nas partidas reais (docs/05) |
| 15/11/2026 | Mockups da Etapa 1b em HTML responsivo (`docs/mockups/web/`), publicados como página privada no claude.ai, em vez do Figma | O plano gratuito do Figma limita o conector a poucas chamadas por mês; em HTML não há limite, o layout responsivo é real e pode ser aberto no celular e no navegador da Smart TV |
| 15/11/2026 | Motor do Roku portado inteiro para TypeScript (Partes 2 a 4 da Etapa 1 juntas), com os cenários CT-01 a CT-42 e CT-45 e os novos CT-46 a CT-52 para tipos de carta que não tinham cenário; `newGame` passa a recusar modo tempo ou rodadas sem limite válido (`invalidMode`) | Os módulos do Roku dependem uns dos outros; na web o servidor recebe a configuração da partida pela rede, então o motor confere o modo em vez de confiar na tela |
| 15/11/2026 | Etapa 0 (fundação) concluída com a tag `v0.1-fundacao`: monorepo pnpm, TypeScript 6.0, Svelte 5, Vite 8, Vitest 5, Playwright e CI no GitHub Actions | Testes do servidor com `@cloudflare/vitest-plugin`, novo nome do `vitest-pool-workers` (descontinuado); TypeScript fica na 6.0 porque o typescript-eslint ainda não aceita versão mais nova |
| 15/11/2026 | Testes com Vitest, fast-check, Testing Library (Svelte), @cloudflare/vitest-plugin, Playwright e axe-core; CI no GitHub Actions bloqueia etapa com teste falhando | Mesmo rigor do Roku (45 CTs), com mais automação: vários tamanhos de tela, vários jogadores e modo offline |
| 15/11/2026 | Nomes técnicos (pastas, arquivos, código, ações, eventos, chaves do JSON) em inglês; README, docs, comentários e textos do jogo em PT-BR; commits em PT-BR no imperativo | Pedido do dono do projeto; código em inglês combina com as bibliotecas, e a documentação continua em português |
| 15/11/2026 | Mockups (Etapa 1b) em paralelo com o motor e antes das telas (inicialmente no Figma; ver decisão acima) | O motor não tem tela; as telas da web precisam de layouts novos para celular, tablet, desktop, TV e salas |
| 15/11/2026 | Repositório novo; o repositório do Roku é só referência | Tecnologias diferentes; o Roku segue como produto próprio |
| 15/11/2026 | Regras e valores do `regras.json` v1 do Roku, abertos a mudanças | Regras já aprovadas e balanceadas; ajustes virão do uso |
| 15/11/2026 | Queda de conexão pausa a partida; depois de alguns minutos, quem criou a sala pode remover o jogador (RN-115) | Ninguém perde a partida por uma queda rápida, e ninguém fica preso esperando para sempre |
| 15/11/2026 | Cada jogador vê o tabuleiro inteiro no próprio aparelho | Mais simples; "TV como tabuleiro e celular como controle" fica para depois |
| 15/11/2026 | Visual 2D (SVG/CSS); 3D com Three.js só como acabamento, nos dados e talvez nas casas e hotéis | Leve em TV e celular simples e mais legível |
| 15/11/2026 | Cloudflare Workers + Durable Objects para o site e as salas | Plano gratuito sem cartão, um provedor só, motor rodando no servidor da sala; Firebase exigiria plano pago para lógica no servidor, Supabase pausa projetos ociosos e P2P acaba a partida se quem criou sair |
| 15/11/2026 | TypeScript, Vite, Svelte 5 e PWA | Tipagem no estado e nas ações; pacote pequeno e rápido em TV e celular |
| 15/11/2026 | Motor de regras portado do BrightScript para TypeScript puro, compartilhado entre navegador e servidor | Uma única fonte de verdade das regras para os dois modos de jogo |

## Em aberto

Nada no momento.

