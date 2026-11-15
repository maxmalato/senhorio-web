import { describe, expect, it } from 'vitest';
import defaultRulesJson from '../src/rules/rules.json';
import { loadDefaultRules, parseRules } from '../src/rules/load';
import { validateRules } from '../src/rules/validate';

/** Cópia editável das regras padrão, para estragar um item por teste. */
function rulesCopy(): Record<string, any> {
  return structuredClone(defaultRulesJson) as Record<string, any>;
}

function errorsOf(raw: unknown): string[] {
  const result = validateRules(raw);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors;
}

describe('regras padrão (rules.json v1, igual ao regras.json v1 do Roku)', () => {
  const result = loadDefaultRules();

  it('carregam sem erros', () => {
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('montam os índices do tabuleiro', () => {
    if (!result.ok) throw new Error('regras inválidas');
    expect(result.index).toMatchObject({
      totalSpaces: 40,
      startPosition: 0,
      jailPosition: 10,
      stations: [5, 15, 25, 35],
      utilities: [12, 28],
    });
    // RN-030: 22 ruas, 4 estações e 2 companhias
    expect(result.index.properties).toHaveLength(28);
    expect(Object.keys(result.index.cardDeck)).toHaveLength(32);
  });

  it('mantêm os valores principais do Roku', () => {
    if (!result.ok) throw new Error('regras inválidas');
    const { parameters, houseRules, texts } = result.rules;
    expect(parameters.startingMoney).toBe(1500); // RN-003
    expect(parameters.passStartBonus).toBe(200); // RN-013
    expect(parameters.stationRent).toEqual([30, 60, 120, 240]); // RN-044
    expect(parameters.utilityMultiplier).toEqual([5, 12]); // RN-045
    expect(houseRules['RP-03']?.active).toBe(true);
    expect(texts.defaultNames).toEqual(['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio']);
    expect(texts['H-01']).toBe('{player} passou pela Partida (+{amount})');
  });

  it('não deixam alterar o arquivo importado', () => {
    if (!result.ok) throw new Error('regras inválidas');
    result.rules.parameters.startingMoney = 1;
    expect(defaultRulesJson.parameters.startingMoney).toBe(1500);
  });
});

describe('CT-44 · regras inválidas dão erro claro, sem travar', () => {
  it('recusa rua sem aluguel, citando a rua e o aluguel', () => {
    const rules = rulesCopy();
    delete rules.spaces[1].rent;
    const errors = errorsOf(rules);
    expect(errors[0]).toContain('Travessa do Porto');
    expect(errors[0]).toContain('aluguel');
  });

  it('recusa JSON quebrado', () => {
    const result = parseRules('{ isto não é json');
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(['o arquivo de regras não é um JSON válido']);
  });

  it('recusa regra própria ligada que o motor ainda não suporta', () => {
    const rules = rulesCopy();
    rules.houseRules['RP-01'].active = true;
    expect(errorsOf(rules)).toContain('RP-01 está ligada, mas ainda não é suportada pelo motor');
  });
});

describe('validação complementar do arquivo de regras', () => {
  it('aceita o arquivo padrão lido como texto', () => {
    expect(parseRules(JSON.stringify(defaultRulesJson)).ok).toBe(true);
  });

  it('recusa arquivo que não é objeto', () => {
    expect(errorsOf([])).toEqual(['o arquivo de regras não é um objeto JSON']);
  });

  it('recusa parâmetro obrigatório ausente', () => {
    const rules = rulesCopy();
    delete rules.parameters.bail;
    expect(errorsOf(rules)).toContain('parameters.bail ausente ou não numérico');
  });

  it('recusa casas fora de ordem e tipo desconhecido', () => {
    const rules = rulesCopy();
    rules.spaces[2].position = 7;
    rules.spaces[4].type = 'cassino';
    const errors = errorsOf(rules);
    expect(errors).toContain(
      'casa 2 (Sorte): "position" deve ser 2 (casas em ordem, a partir de 0)',
    );
    expect(errors).toContain('casa 4 (Imposto de Renda): tipo desconhecido "cassino"');
  });

  it('recusa rua de grupo inexistente', () => {
    const rules = rulesCopy();
    rules.spaces[1].group = 'roxo';
    expect(errorsOf(rules)).toContain(
      'casa 1 (Travessa do Porto): grupo "roxo" não existe em groups',
    );
  });

  it('recusa imposto com parâmetro inexistente', () => {
    const rules = rulesCopy();
    rules.spaces[4].taxParameter = 'iptu';
    expect(errorsOf(rules)).toContain(
      'casa 4 (Imposto de Renda): parâmetro de imposto "iptu" não existe',
    );
  });

  it('exige a Partida na casa 0', () => {
    const rules = rulesCopy();
    rules.spaces[0].type = 'rest';
    expect(errorsOf(rules)).toContain('a casa 0 deve ser do tipo "start"');
  });

  it('exige tabela de estações com um valor por estação (RN-044)', () => {
    const rules = rulesCopy();
    rules.parameters.stationRent = [30, 60];
    expect(errorsOf(rules)).toContain('parameters.stationRent deve ter 4 valores (um por estação)');
  });

  it('exige o padrão do modo dentro das opções', () => {
    const rules = rulesCopy();
    rules.modes.rounds.default = 25;
    expect(errorsOf(rules)).toContain('modes.rounds: options e default inválidos');
  });

  it('exige todos os textos do catálogo', () => {
    const rules = rulesCopy();
    delete rules.texts['D-17b'];
    expect(errorsOf(rules)).toContain('falta o texto D-17b');
  });

  it('confere as cartas: quantidade, id repetido, tipo e destino', () => {
    const rules = rulesCopy();
    rules.cards.chance[1].id = 'S-01';
    rules.cards.setback[0].action = { type: 'teletransporte' };
    rules.cards.setback[11].action.destination = 40;
    rules.cards.setback.pop();
    const errors = errorsOf(rules);
    expect(errors).toContain('carta S-01: id repetido');
    expect(errors).toContain('carta R-01: action.type desconhecido "teletransporte"');
    expect(errors).toContain('carta R-12: destino fora do tabuleiro');
    expect(errors).toContain('cards.setback deve ter 16 cartas');
  });

  it('exige campos numéricos de cada tipo de carta', () => {
    const rules = rulesCopy();
    delete rules.cards.setback[6].action.perHotel;
    expect(errorsOf(rules)).toContain('carta R-07: falta action.perHotel');
  });
});
