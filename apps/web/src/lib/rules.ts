// Regras do jogo carregadas uma vez (rules.json do motor). A interface só lê valores e
// textos daqui; nenhuma regra é calculada na interface (docs/07).

import { loadDefaultRules, type Rules, type RulesIndex, type TextEntry } from '@senhorio/engine';

const loaded = loadDefaultRules();
if (!loaded.ok) throw new Error(`regras inválidas: ${loaded.errors.join('; ')}`);

export const RULES_RESULT = loaded;
export const rules: Rules = loaded.rules;
export const index: RulesIndex = loaded.index;

type Vars = Record<string, string | number>;

/** Substitui {marcadores} pelos valores; marcador sem valor fica como está. */
export function fill(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

function entry(code: string): TextEntry {
  const value = rules.texts[code];
  if (value === undefined || Array.isArray(value)) throw new Error(`texto inexistente: ${code}`);
  return value;
}

/** Texto principal de um código do catálogo (docs/04), já preenchido. */
export function t(code: string, vars: Vars = {}): string {
  const value = entry(code);
  return fill(typeof value === 'string' ? value : value.text, vars);
}

/** Opções (botões) de um código do catálogo. */
export function options(code: string, vars: Vars = {}): string[] {
  const value = entry(code);
  return typeof value === 'string' ? [] : (value.options ?? []).map((o) => fill(o, vars));
}

/** Campo complementar (subtitle, hint, disabledReason, sellText, after, limit). */
export function extra(
  code: string,
  field: 'subtitle' | 'hint' | 'disabledReason' | 'sellText' | 'after' | 'limit',
  vars: Vars = {},
): string {
  const value = entry(code);
  if (typeof value === 'string' || !value[field]) return '';
  return fill(value[field] as string, vars);
}

/** Valor em reais sem centavos (I-13 com o separador I-14): R$ 1.234. */
export function brl(amount: number): string {
  const sep = rules.texts['I-14'] as string;
  const digits = String(Math.abs(Math.round(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (amount < 0 ? '−' : '') + t('I-13', { amount: digits });
}

export const defaultNames = rules.texts.defaultNames;

/** Cores dos peões (docs/06 do Roku), sempre com a inicial do nome. */
export const PAWN_COLORS = ['#4FC3F7', '#FF8A65', '#B39DDB', '#81C784', '#F48FB1', '#4DB6AC'];

export function spaceName(position: number): string {
  return rules.spaces[position]?.name ?? '';
}

export function groupOf(position: number): { key: string; name: string; color: string } | null {
  const space = rules.spaces[position];
  if (!space || space.type !== 'street') return null;
  const group = rules.groups[space.group];
  return group ? { key: space.group, name: group.name, color: group.color } : null;
}

/** Cor da faixa da propriedade (grupo da rua, ou cinza para estação e companhia). */
export function propertyColor(position: number): string {
  return groupOf(position)?.color ?? '#9aa6bb';
}
