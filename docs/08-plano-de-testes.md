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
| CT-43 (salvamento de outra versão das regras) | Etapa 3, junto com o salvamento no IndexedDB | A fazer |
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

## Roteiro manual em aparelho real

Navegador de TV e celular simples não se simulam com perfeição. A partir da Etapa 2, cada etapa de interface tem um roteiro curto (abrir, jogar uma partida, testar foco e leitura) a ser feito em pelo menos um celular, um computador e uma Smart TV com navegador. O roteiro é escrito na própria etapa.
