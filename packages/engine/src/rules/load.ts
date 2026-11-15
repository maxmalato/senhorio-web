// Carga do arquivo de regras: a partir de texto JSON ou do rules.json embutido no pacote.

import defaultRulesJson from './rules.json';
import type { RulesResult } from './types';
import { validateRules } from './validate';

/** Lê e valida regras a partir de um texto JSON (ex.: arquivo editado no balanceamento). */
export function parseRules(text: string): RulesResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['o arquivo de regras não é um JSON válido'] };
  }
  return validateRules(raw);
}

/** Regras padrão do jogo (rules.json do pacote, versão 1 = regras.json v1 do Roku). */
export function loadDefaultRules(): RulesResult {
  // Cópia profunda: quem usar as regras nunca altera o objeto importado
  return validateRules(structuredClone(defaultRulesJson));
}
