// Invariantes do estado (docs/08): o que precisa ser verdade depois de qualquer ação aceita.
// Usados pelos testes com fast-check e pela simulação. Devolvem a lista de violações.

import { hotelLevel } from '../building';
import { isGroupComplete } from '../rent';
import { spaceAt } from '../state';
import { BANK, type EngineContext, type GameState } from '../types';

export function checkInvariants(state: GameState, ctx: EngineContext): string[] {
  const errors: string[] = [];
  const players = state.players;
  const hotel = hotelLevel(ctx);

  // dinheiro nunca fica negativo: cobrança só é paga quando o caixa alcança (RN-100)
  players.forEach((player, i) => {
    if (player.money < 0) errors.push(`jogador ${i} com dinheiro negativo (${player.money})`);
    if (player.bankrupt && player.inJail) errors.push(`jogador ${i} falido e preso`);
  });

  // vez e ordem
  if (!state.order.every((i) => i >= 0 && i < players.length))
    errors.push('ordem com jogador inexistente');
  if (new Set(state.order).size !== players.length)
    errors.push('ordem com jogador repetido ou faltando');
  const current = state.order[state.turn];
  if (current === undefined) errors.push(`vez fora da ordem (${state.turn})`);
  // a vez só passa adiante depois de concluir a falência e as cobranças pendentes
  else if (
    !['GAME_OVER', 'BANKRUPTCY'].includes(state.phase) &&
    state.pending === null &&
    players[current]?.bankrupt
  ) {
    errors.push('vez de um jogador falido');
  }
  if (state.lastDice.length !== 0 && state.lastDice.length !== 2)
    errors.push('últimos dados incompletos');

  // propriedades
  for (const position of ctx.index.properties) {
    const property = state.properties[String(position)];
    if (!property) {
      errors.push(`casa ${position} sem estado de propriedade`);
      continue;
    }
    const { owner, houses, mortgaged } = property;
    if (owner !== BANK && (owner < 0 || owner >= players.length))
      errors.push(`casa ${position}: dono inexistente`);
    if (owner !== BANK && players[owner]?.bankrupt) errors.push(`casa ${position}: dono falido`);
    if (owner === BANK && (houses !== 0 || mortgaged))
      errors.push(`casa ${position}: do banco com casas ou hipoteca`);
    if (!Number.isInteger(houses) || houses < 0 || houses > hotel)
      errors.push(`casa ${position}: ${houses} casas`);

    const space = spaceAt(ctx, position);
    if (space.type !== 'street') {
      if (houses !== 0) errors.push(`casa ${position}: casas fora de rua`);
      continue;
    }
    const group = ctx.rules.groups[space.group]?.positions ?? [];
    const groupHouses = group.map((p) => state.properties[String(p)]?.houses ?? 0);
    const anyHouse = groupHouses.some((h) => h > 0);
    // RN-050: casas só com o grupo completo
    if (houses > 0 && !isGroupComplete(state, space.group, owner, ctx))
      errors.push(`casa ${position}: casas sem grupo completo`);
    // RN-052: diferença de casas no grupo nunca passa de 1
    if (Math.max(...groupHouses) - Math.min(...groupHouses) > 1)
      errors.push(`grupo ${space.group}: construção desigual`);
    // RN-061: hipotecada não convive com casas no grupo
    if (mortgaged && anyHouse) errors.push(`casa ${position}: hipotecada com casas no grupo`);
  }

  // cartas: cada carta está em exatamente um lugar (baralho, mão de um jogador ou revelada)
  const seen = [
    ...state.decks.chance,
    ...state.decks.setback,
    ...players.flatMap((p) => p.jailCards),
    ...(state.currentCard ? [state.currentCard.id] : []),
  ];
  const allCards = Object.keys(ctx.index.cardDeck);
  if (seen.length !== allCards.length || new Set(seen).size !== allCards.length) {
    errors.push(`cartas perdidas ou repetidas (${seen.length} de ${allCards.length})`);
  }

  // pendência coerente com a fase
  if (
    state.phase === 'RAISE_MONEY' &&
    !(state.pending?.type === 'collection' && state.pending.debt)
  ) {
    errors.push('RAISE_MONEY sem dívida aberta');
  }
  if (state.phase === 'GAME_OVER' && !state.ranking)
    errors.push('fim de partida sem classificação');
  return errors;
}
