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
