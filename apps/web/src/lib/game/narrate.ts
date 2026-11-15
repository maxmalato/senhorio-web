// Eventos do motor viram linhas do histórico (H-xx) e avisos centrais (M-xx),
// como no Eventos.brs do Roku (docs/04, "Mensagens de resultado" e "Histórico").
// Função pura: recebe o evento, a vista antes de aplicá-lo e o estado final.

import {
  mortgageValue,
  type EngineContext,
  type GameEvent,
  type GameState,
} from '@senhorio/engine';
import { brl, rules, spaceName, t } from '../rules';
import type { View } from './view';

export interface Narration {
  history?: string;
  toast?: string;
}

const BANK = -1;

/**
 * bankruptcyBatch: os eventos desta ação incluem uma falência ou abandono; nesse caso as
 * casas vendidas de uma vez não entram uma a uma no histórico (só a linha de quem saiu).
 */
export function narrate(
  event: GameEvent,
  view: View,
  finalState: GameState,
  ctx: EngineContext,
  bankruptcyBatch: boolean,
): Narration {
  const name = (i: number) => view.players[i]?.name ?? '';
  const current = view.current;
  const say = (history: string, toast: string, vars: Record<string, string | number>) => ({
    history: t(history, vars),
    ...(toast ? { toast: t(toast, vars) } : {}),
  });

  switch (event.type) {
    case 'Jailed': {
      const vars = { player: name(event.player) };
      return event.reason === 'threeDoubles'
        ? say('H-13', 'M-10', vars)
        : say('H-12', 'M-09', vars);
    }
    case 'ReleasedFromJail':
      return say('H-14', event.reason === 'doubles' ? 'M-11' : '', { player: name(event.player) });
    case 'MoneyTransferred': {
      const amount = brl(event.amount);
      switch (event.reason) {
        case 'passStart':
          return say('H-01', 'M-01', { player: name(event.to), amount });
        case 'rent': {
          // M-05 para aluguel alto (parâmetro highRentThreshold)
          const high = event.amount >= rules.parameters.highRentThreshold;
          return say('H-04', high ? 'M-05' : 'M-04', {
            player: name(event.from),
            amount,
            owner: name(event.to),
          });
        }
        case 'tax':
          return say('H-07', 'M-08', { player: name(event.from), amount });
        case 'card':
          if (event.from === BANK) return say('H-09', '', { player: name(event.to), amount });
          if (event.to === BANK) return say('H-10', '', { player: name(event.from), amount });
          return say('H-11', '', { player: name(event.from), amount, owner: name(event.to) });
        case 'bail':
          return say('H-15', '', { player: name(event.from), amount });
        case 'mortgageInterest':
          return say('H-26', '', { player: name(event.from), amount });
        default:
          // compra, construção, venda de casa, hipoteca, resgate, venda simples e falência
          // têm o próprio evento; aqui só o painel muda
          return {};
      }
    }
    case 'PropertyOwnerChanged':
      if (event.from === BANK && event.to !== BANK) {
        return say('H-02', 'M-02', { player: name(event.to), property: spaceName(event.position) });
      }
      return {};
    case 'PurchaseDeclined':
      return say('H-03', 'M-03', { player: name(current), property: spaceName(event.position) });
    case 'RentExempt': {
      const vars = {
        player: name(current),
        property: spaceName(event.position),
        owner: name(event.owner),
      };
      return event.reason === 'mortgaged' ? say('H-05', 'M-06', vars) : say('H-06', 'M-07', vars);
    }
    case 'CardRevealed': {
      const card = rules.cards[event.deck].find((c) => c.id === event.id);
      return say('H-08', '', { player: name(current), title: card?.title ?? '' });
    }
    case 'HousesChanged': {
      const before = view.properties[String(event.position)]?.houses ?? 0;
      const space = rules.spaces[event.position];
      const rent = space?.type === 'street' ? (space.rent[event.houses] ?? 0) : 0;
      const owner = view.properties[String(event.position)]?.owner ?? BANK;
      const vars = {
        player: name(owner),
        property: spaceName(event.position),
        houseCount: event.houses,
        amount: brl(rent),
      };
      if (event.houses > before) {
        return event.houses === rules.parameters.maxHouses + 1
          ? say('H-17', 'M-13', vars)
          : say('H-16', 'M-12', vars);
      }
      return bankruptcyBatch ? {} : say('H-18', '', vars);
    }
    case 'MortgageChanged': {
      const owner = view.properties[String(event.position)]?.owner ?? BANK;
      const vars = {
        player: name(owner),
        property: spaceName(event.position),
        amount: brl(mortgageValue(ctx, event.position)),
      };
      if (event.mortgaged) return say('H-19', 'M-14', vars);
      // na falência para o banco a hipoteca cai sem resgate
      if (finalState.properties[String(event.position)]?.owner !== BANK)
        return say('H-20', '', vars);
      return {};
    }
    case 'WentBankrupt': {
      const vars = { player: name(event.player) };
      return event.quit ? say('H-24', '', vars) : say('H-23', 'M-17', vars);
    }
    case 'TradeAnswered': {
      const property = spaceName(event.position);
      if (event.accepted) {
        const buyer = finalState.properties[String(event.position)]?.owner ?? BANK;
        return say('H-21', 'M-15', { property, buyer: name(buyer) });
      }
      return say('H-22', 'M-16', { property, owner: name(event.other) });
    }
    case 'TimeUp':
      return say('H-25', 'M-18', {});
    default:
      return {};
  }
}
