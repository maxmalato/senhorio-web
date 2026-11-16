<script lang="ts">
  // Escolhe o cartão central conforme a fase do turno (docs/03) e o catálogo de decisões
  // (docs/04, D-01 a D-20). Listas e valores vêm das consultas do motor; nada de regra aqui.
  import {
    allowedActions,
    buildableStreets,
    calculateRent,
    houseSaleValue,
    maxRaisable,
    mortgageableProperties,
    mortgageValue,
    redeemCost,
    streetsWithSellableHouse,
    tradableProperties,
    tradeTargets,
    transition,
    type Action,
    type TradeDirection,
  } from '@senhorio/engine';
  import { tick } from 'svelte';
  import {
    brl,
    extra,
    groupOf,
    index,
    options,
    propertyColor,
    rules,
    spaceName,
    t,
  } from '../rules';
  import Card from '../ui/Card.svelte';
  import Die from '../ui/Die.svelte';
  import Icon from '../ui/Icon.svelte';
  import OptionList, { type Option } from '../ui/OptionList.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import type { Game } from './game.svelte';
  import { menuAvailable as isMenuAvailable } from './menu';
  import { actorsOf } from '@senhorio/protocol';

  let {
    game,
    onminimize,
    marked = $bindable([]),
    onpause,
  }: {
    game: Game;
    onminimize: () => void;
    marked?: number[];
    /** Vários aparelhos: pausar vale para todos e passa pela sala. */
    onpause?: () => void;
  } = $props();

  type Mode =
    | 'main'
    | 'menu'
    | 'build'
    | 'sell'
    | 'mortgage'
    | 'redeem'
    | 'trade-direction'
    | 'trade-pick'
    | 'trade-buyer'
    | 'trade-amount'
    | 'quit';

  let mode: Mode = $state('main');
  let selected: number | null = $state(null);
  let trade = $state({ direction: 'buy' as TradeDirection, position: -1, other: -1, amount: 0 });

  const s = $derived(game.state);
  const p = rules.parameters;
  const current = $derived(s.order[s.turn] ?? 0);
  const debt = $derived(s.pending?.type === 'collection' ? s.pending.debt : null);
  const actor = $derived(s.phase === 'RAISE_MONEY' && debt ? debt.debtor : current);
  const allowed = $derived(allowedActions(s));
  const name = (i: number) => (i < 0 ? t('I-22') : (s.players[i]?.name ?? ''));
  const me = $derived(s.players[actor]);

  // ao mudar de fase, de vez ou de pendência, volta ao cartão principal
  const phaseKey = $derived(`${s.phase}|${s.turn}|${s.pending?.type ?? ''}`);
  $effect(() => {
    void phaseKey;
    mode = 'main';
    selected = null;
  });
  // o cronômetro do modo tempo para com o menu aberto (docs/03)
  $effect(() => {
    game.menuOpen = mode !== 'main';
  });

  function act(action: Action) {
    return game.act(action);
  }
  function open(next: Mode, first: number | null = null) {
    mode = next;
    selected = first;
  }

  /** Volta um passo (Voltar/Esc). Devolve false quando não há para onde voltar. */
  export function goBack(): boolean {
    const back: Partial<Record<Mode, Mode>> = {
      menu: 'main',
      quit: 'menu',
      'trade-direction': 'menu',
      'trade-pick': 'trade-direction',
      'trade-buyer': 'trade-pick',
      'trade-amount': trade.direction === 'sell' ? 'trade-buyer' : 'trade-pick',
    };
    if (mode === 'main') return false;
    if (s.phase === 'RAISE_MONEY' && (mode === 'sell' || mode === 'mortgage')) {
      open('main');
      return true;
    }
    open(back[mode] ?? 'menu');
    return true;
  }

  export function openMenu(): void {
    if (mode === 'main' && menuAvailable) open('menu');
  }

  // ---------- consultas ----------
  const housesLabel = (n: number) =>
    n === p.maxHouses + 1 ? t('I-28') : n === 0 ? t('I-25') : t(n === 1 ? 'I-26' : 'I-27', { n });
  const rentNow = (pos: number) => calculateRent(s, pos, 0, game.ctx).amount;
  const ownedMortgaged = $derived(
    Object.entries(s.properties)
      .filter(([, prop]) => prop.owner === actor && prop.mortgaged)
      .map(([pos]) => Number(pos)),
  );
  // vários aparelhos: só quem pode agir agora decide; os outros veem quem está decidindo
  const myTurn = $derived(game.me === null || actorsOf(s).includes(game.me));
  const menuAvailable = $derived(isMenuAvailable(s) && myTurn);

  function rentLine(pos: number): string {
    const space = rules.spaces[pos];
    if (space?.type === 'utility') {
      return t('I-40', { mult1: p.utilityMultiplier[0] ?? 0, mult2: p.utilityMultiplier[1] ?? 0 });
    }
    return t('I-33', { amount: brl(rentNow(pos)), mortgage: brl(mortgageValue(game.ctx, pos)) });
  }

  // ---------- menu (D-10) ----------
  const menuItems = $derived.by((): Option[] => {
    const labels = options('D-10', { player: name(actor) });
    const has = (a: string) => allowed.includes(a as never);
    const buildable = buildableStreets(s, actor, game.ctx);
    const sellable = streetsWithSellableHouse(s, actor, game.ctx);
    const mortgageable = mortgageableProperties(s, actor, game.ctx);
    const targets = tradeTargets(s);
    const anyTradable =
      tradableProperties(s, actor, game.ctx).length > 0 ||
      targets.some((o) => tradableProperties(s, o, game.ctx).length > 0);
    let tradeReason = '';
    if (s.players[actor]?.inJail || s.phase === 'JAIL_DECISION') tradeReason = t('I-47');
    else if (s.proposalsThisTurn >= p.maxProposalsPerTurn)
      tradeReason = extra('D-18', 'limit', { max: p.maxProposalsPerTurn });
    else if (targets.length === 0) tradeReason = t('I-48');
    else if (!anyTradable) tradeReason = t('I-50');

    const items: Option[] = [
      {
        id: 'build',
        icon: 'hammer',
        name: labels[0] ?? '',
        disabled: !has('BUILD') || !buildable.length,
        sub: buildable.length ? undefined : t('I-41'),
      },
      {
        id: 'sell',
        icon: 'tag',
        name: labels[1] ?? '',
        disabled: !has('SELL_HOUSE') || !sellable.length,
        sub: sellable.length ? undefined : t('I-42'),
      },
      {
        id: 'mortgage',
        icon: 'bank',
        name: labels[2] ?? '',
        disabled: !has('MORTGAGE') || !mortgageable.length,
        sub: mortgageable.length ? undefined : t('I-43'),
      },
      {
        id: 'redeem',
        icon: 'key',
        name: labels[3] ?? '',
        disabled: !has('REDEEM') || !ownedMortgaged.length,
        sub: ownedMortgaged.length ? undefined : t('I-44'),
      },
      {
        id: 'trade',
        icon: 'swap',
        name: labels[4] ?? '',
        disabled: !has('PROPOSE_TRADE') || !!tradeReason,
        sub: tradeReason || undefined,
      },
      { id: 'pause', icon: 'pause', name: labels[5] ?? '' },
      { id: 'quit', icon: 'exit', name: labels[6] ?? '', danger: true, disabled: !has('QUIT') },
    ];
    // RN-033: na compra, o menu só levanta dinheiro
    return s.phase === 'PURCHASE_DECISION'
      ? items.filter((i) => i.id === 'sell' || i.id === 'mortgage')
      : items;
  });

  function chooseMenu(item: Option) {
    switch (item.id) {
      case 'build':
        open('build', buildableStreets(s, actor, game.ctx)[0] ?? null);
        break;
      case 'sell':
        open('sell', streetsWithSellableHouse(s, actor, game.ctx)[0] ?? null);
        break;
      case 'mortgage':
        open('mortgage', mortgageableProperties(s, actor, game.ctx)[0] ?? null);
        break;
      case 'redeem':
        open('redeem', ownedMortgaged[0] ?? null);
        break;
      case 'trade':
        open('trade-direction');
        break;
      case 'pause':
        if (onpause) onpause();
        else game.paused = true;
        open('main');
        break;
      case 'quit':
        open('quit');
        break;
    }
  }

  // ---------- listas de construção, venda de casas, hipoteca e resgate ----------
  const buildItems = $derived(
    buildableStreets(s, actor, game.ctx).map((pos): Option => {
      const houses = s.properties[String(pos)]?.houses ?? 0;
      const space = rules.spaces[pos];
      const next = space?.type === 'street' ? (space.rent[houses + 1] ?? 0) : 0;
      const sub =
        houses + 1 === p.maxHouses + 1
          ? t('I-31', { from: brl(rentNow(pos)), to: brl(next) })
          : t('I-30', { n: houses + 1, from: brl(rentNow(pos)), to: brl(next) });
      return {
        id: pos,
        name: spaceName(pos),
        value: housesLabel(houses),
        sub,
        color: propertyColor(pos),
      };
    }),
  );
  const sellItems = $derived(
    streetsWithSellableHouse(s, actor, game.ctx).map((pos): Option => {
      const houses = s.properties[String(pos)]?.houses ?? 0;
      // aluguel depois da venda: o próprio motor calcula, numa cópia do estado
      const preview = transition(s, { type: 'SELL_HOUSE', position: pos }, game.ctx);
      const after = preview.ok
        ? calculateRent(preview.state, pos, 0, game.ctx).amount
        : rentNow(pos);
      return {
        id: pos,
        name: spaceName(pos),
        value: housesLabel(houses),
        sub: t('I-32', { from: brl(rentNow(pos)), to: brl(after) }),
        color: propertyColor(pos),
      };
    }),
  );
  const mortgageItems = $derived(
    mortgageableProperties(s, actor, game.ctx).map((pos): Option => ({
      id: pos,
      name: spaceName(pos),
      value: brl(mortgageValue(game.ctx, pos)),
      sub: rentLine(pos),
      color: propertyColor(pos),
    })),
  );
  const redeemItems = $derived(
    ownedMortgaged.map((pos): Option => ({
      id: pos,
      name: spaceName(pos),
      value: brl(redeemCost(game.ctx, pos)),
      sub: t('I-34'),
      color: propertyColor(pos),
    })),
  );

  let root: HTMLElement | undefined = $state();
  async function choose(item: Option) {
    selected = item.id as number;
    await tick();
    root?.querySelector<HTMLButtonElement>('.actions .btn.primary:not(:disabled)')?.focus();
  }

  function pick(list: Option[]): number | null {
    if (selected !== null && list.some((i) => i.id === selected)) return selected;
    return (list[0]?.id as number | undefined) ?? null;
  }

  async function runOn(type: 'BUILD' | 'SELL_HOUSE' | 'MORTGAGE' | 'REDEEM', list: Option[]) {
    const pos = pick(list);
    if (pos === null) return;
    await act({ type, position: pos });
  }

  // ---------- venda simples (D-17a, D-17b, I-49, D-17c) ----------
  const targets = $derived(tradeTargets(s));
  const buyChoices = $derived(
    targets.flatMap((o) =>
      tradableProperties(s, o, game.ctx).map((pos): Option => ({
        id: pos,
        name: spaceName(pos),
        value: name(o),
        sub: t('I-38', {
          owner: name(o),
          amount: brl(
            rules.spaces[pos] && 'price' in rules.spaces[pos] ? rules.spaces[pos].price : 0,
          ),
        }),
        color: propertyColor(pos),
      })),
    ),
  );
  const sellChoices = $derived(
    tradableProperties(s, actor, game.ctx).map((pos): Option => ({
      id: pos,
      name: spaceName(pos),
      value: brl(priceOf(pos)),
      color: propertyColor(pos),
    })),
  );
  const buyerChoices = $derived(
    targets.map((o): Option => ({
      id: o,
      name: name(o),
      value: brl(s.players[o]?.money ?? 0),
      color: s.players[o]?.color,
    })),
  );
  function priceOf(pos: number): number {
    const space = rules.spaces[pos];
    return space && 'price' in space ? space.price : 0;
  }
  const payer = $derived(trade.direction === 'buy' ? actor : trade.other);
  const payerMoney = $derived(s.players[payer]?.money ?? 0);

  function chooseDirection(direction: TradeDirection) {
    trade.direction = direction;
    open('trade-pick', ((direction === 'buy' ? buyChoices : sellChoices)[0]?.id as number) ?? null);
  }
  function chooseProperty(item: Option) {
    trade.position = item.id as number;
    if (trade.direction === 'buy') {
      trade.other = s.properties[String(trade.position)]?.owner ?? -1;
      startAmount();
    } else {
      open('trade-buyer', (buyerChoices[0]?.id as number) ?? null);
    }
  }
  function chooseBuyer(item: Option) {
    trade.other = item.id as number;
    startAmount();
  }
  function startAmount() {
    // valor inicial = preço de tabela, dentro do limite de quem paga (RN-093)
    const max = Math.max(p.tradeStep, payerMoney);
    trade.amount = Math.min(Math.max(priceOf(trade.position), p.tradeStep), max);
    open('trade-amount');
  }
  async function sendProposal() {
    await act({
      type: 'PROPOSE_TRADE',
      direction: trade.direction,
      position: trade.position,
      amount: trade.amount,
      otherPlayer: trade.other,
    });
  }
  async function answer(accept: boolean) {
    const proposal = s.pending?.type === 'trade' ? s.pending : null;
    if (!proposal) return;
    const refusal = await act({ type: 'RESPOND_TRADE', accept });
    // "Devolva o aparelho" só faz sentido com um aparelho só
    if (!refusal && !game.remote) {
      void game.notify(extra('D-18', 'after', { player: name(proposal.proposer) }));
    }
  }

  // ---------- destaque no tabuleiro da propriedade escolhida na lista ----------
  const markedNow = $derived.by((): number[] => {
    const one = (pos: number | null) => (pos === null || pos < 0 ? [] : [pos]);
    if (s.pending?.type === 'trade') return [s.pending.position];
    switch (mode) {
      case 'build':
        return one(pick(buildItems));
      case 'sell':
        return one(pick(sellItems));
      case 'mortgage':
        return one(pick(mortgageItems));
      case 'redeem':
        return one(pick(redeemItems));
      case 'trade-pick':
        return one(pick(trade.direction === 'buy' ? buyChoices : sellChoices));
      case 'trade-buyer':
      case 'trade-amount':
        return one(trade.position);
      default:
        return [];
    }
  });
  $effect(() => {
    marked = markedNow;
  });

  // ---------- compra ----------
  function propertyEyebrow(pos: number): string {
    const group = groupOf(pos);
    if (group) {
      const positions = rules.groups[group.key]?.positions ?? [];
      const n = positions.filter((q) => s.properties[String(q)]?.owner === current).length;
      const vars = { group: group.name.toUpperCase(), n, total: positions.length };
      return n === positions.length ? t('I-16', vars) : t('I-15', vars);
    }
    const list = rules.spaces[pos]?.type === 'station' ? index.stations : index.utilities;
    const code = rules.spaces[pos]?.type === 'station' ? 'I-17' : 'I-18';
    return t(code, {
      n: list.filter((q) => s.properties[String(q)]?.owner === current).length,
      total: list.length,
    });
  }
  function baseRent(pos: number): string {
    const space = rules.spaces[pos];
    if (space?.type === 'street') return brl(space.rent[0] ?? 0);
    if (space?.type === 'station') return brl(p.stationRent[0] ?? 0);
    return t('I-40', { mult1: p.utilityMultiplier[0] ?? 0, mult2: p.utilityMultiplier[1] ?? 0 });
  }
  const deckLabel = (deck: 'chance' | 'setback') =>
    rules.spaces.find((sp) => sp.type === deck)?.name.toUpperCase() ?? '';
</script>

{#snippet diceLine(player: number)}
  {#if s.lastDice.length === 2}
    <div class="dice">
      <Die value={s.lastDice[0] ?? 1} />
      <Die value={s.lastDice[1] ?? 1} />
      <span
        >{t('I-21', {
          player: name(player),
          d1: s.lastDice[0] ?? 0,
          d2: s.lastDice[1] ?? 0,
          sum: (s.lastDice[0] ?? 0) + (s.lastDice[1] ?? 0),
        })}</span
      >
    </div>
  {/if}
{/snippet}

{#snippet menuButton()}
  {#if menuAvailable}
    <button class="btn secondary" type="button" onclick={() => open('menu')}>
      <Icon name="menu" />{t('I-11').charAt(0).toUpperCase() + t('I-11').slice(1)}
    </button>
  {/if}
{/snippet}

{#snippet doneButton(
  label: string,
  primary: string,
  disabled: boolean,
  onrun: () => void,
  reason = '',
)}
  <div class="actions">
    <button class="btn primary" type="button" {disabled} onclick={onrun}>{primary}</button>
    {#if reason}<p class="reason">{reason}</p>{/if}
    <button class="btn secondary" type="button" onclick={() => goBack()}>{label}</button>
  </div>
{/snippet}

<div class="decision-root" bind:this={root}>
  {#if game.interstitial && (game.me === null || game.me === game.interstitial.player)}
    <!-- D-06: fiança obrigatória depois da terceira tentativa -->
    <Card eyebrow={t('I-04')} title={t('D-06', { amount: brl(game.interstitial.amount) })}>
      <div class="actions">
        <button
          class="btn primary"
          type="button"
          data-default="true"
          onclick={() => game.acknowledge()}
        >
          {options('D-06')[0]}
        </button>
      </div>
    </Card>
  {:else if !myTurn}
    {@const waitingFor = actorsOf(s)[0] ?? current}
    <!-- vários aparelhos: outra pessoa decide; este aparelho acompanha -->
    <Card
      title={s.pending?.type === 'trade'
        ? t('W-26', { player: name(waitingFor) })
        : s.phase === 'RAISE_MONEY'
          ? t('W-27', { player: name(waitingFor) })
          : t('W-25', { player: name(waitingFor) })}
      {onminimize}
    >
      {#if s.phase === 'PURCHASE_DECISION'}
        {@const pos = s.players[current]?.position ?? 0}
        <div class="prop-line">
          <span class="sw" style:background={propertyColor(pos)}></span>
          <b>{spaceName(pos)}</b>
          <span>{t('I-19')}: {brl(priceOf(pos))}</span>
        </div>
      {/if}
      {@render diceLine(current)}
      <p class="waiting" role="status">
        <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>{t('W-46', {
          player: name(game.me ?? 0),
        })} · {brl(s.players[game.me ?? 0]?.money ?? 0)}
      </p>
    </Card>
  {:else if s.pending?.type === 'trade'}
    {@const proposal = s.pending}
    {@const owner = proposal.direction === 'buy' ? proposal.other : proposal.proposer}
    <!-- D-18: resposta; Recusar em foco para evitar aceite sem querer -->
    <Card
      eyebrow={game.remote ? t('W-39') : extra('D-18', 'subtitle', { owner: name(proposal.other) })}
      title={proposal.direction === 'buy'
        ? t('D-18', {
            player: name(proposal.proposer),
            amount: brl(proposal.amount),
            property: spaceName(proposal.position),
          })
        : extra('D-18', 'sellText', {
            player: name(proposal.proposer),
            amount: brl(proposal.amount),
            property: spaceName(proposal.position),
          })}
      {onminimize}
    >
      <div class="prop-line">
        <span class="sw" style:background={propertyColor(proposal.position)}></span>
        <b>{spaceName(proposal.position)}</b>
        <span>{t('I-38', { owner: name(owner), amount: brl(priceOf(proposal.position)) })}</span>
      </div>
      <div class="actions">
        <button
          class="btn secondary"
          type="button"
          data-default="true"
          onclick={() => answer(false)}>{options('D-18')[0]}</button
        >
        <button class="btn primary" type="button" onclick={() => answer(true)}
          >{options('D-18')[1]}</button
        >
      </div>
    </Card>
  {:else if mode === 'menu'}
    <Card eyebrow={t('I-11')} title={t('D-10', { player: name(actor) })}>
      <OptionList
        label={t('D-10', { player: name(actor) })}
        items={menuItems}
        onselect={chooseMenu}
      />
      <div class="actions">
        <button class="btn secondary" type="button" onclick={() => goBack()}>{t('I-08')}</button>
      </div>
    </Card>
  {:else if mode === 'build'}
    {@const pos = pick(buildItems)}
    {@const space = pos !== null ? rules.spaces[pos] : undefined}
    <Card
      color={pos !== null ? propertyColor(pos) : ''}
      eyebrow={t('I-29', {
        amount: brl(pos !== null ? (rules.groups[groupOf(pos)?.key ?? '']?.houseCost ?? 0) : 0),
        max: p.maxHouses,
      })}
      title={t('D-11', {
        amount: brl(pos !== null ? (rules.groups[groupOf(pos)?.key ?? '']?.houseCost ?? 0) : 0),
      })}
    >
      <OptionList
        label={t('D-11', { amount: '' })}
        items={buildItems}
        selected={pos}
        onselect={choose}
      />
      {#if pos !== null && space?.type === 'street'}
        {@const houses = s.properties[String(pos)]?.houses ?? 0}
        <div>
          <div class="label">{t('I-52')} · {spaceName(pos).toUpperCase()}</div>
          <div class="ladder">
            {#each space.rent as rent, n (n)}
              <div class:now={n === houses} class:next={n === houses + 1}>
                <span>{n === 0 ? t('I-20') : housesLabel(n)}</span>
                <b>{n === houses ? brl(rentNow(pos)) : brl(rent)}</b>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      {@const cost = pos !== null ? (rules.groups[groupOf(pos)?.key ?? '']?.houseCost ?? 0) : 0}
      {@render doneButton(
        options('D-11')[1] ?? '',
        options('D-11')[0] ?? '',
        pos === null || (me?.money ?? 0) < cost,
        () => runOn('BUILD', buildItems),
        pos !== null && (me?.money ?? 0) < cost
          ? t('I-45', { amount: brl(cost - (me?.money ?? 0)) })
          : '',
      )}
    </Card>
  {:else if mode === 'sell'}
    {@const pos = pick(sellItems)}
    <Card
      color={pos !== null ? propertyColor(pos) : ''}
      title={t('D-12', { amount: brl(pos !== null ? houseSaleValue(game.ctx, pos) : 0) })}
    >
      <OptionList
        label={t('D-12', { amount: '' })}
        items={sellItems}
        selected={pos}
        onselect={choose}
      />
      {@render doneButton(options('D-12')[1] ?? '', options('D-12')[0] ?? '', pos === null, () =>
        runOn('SELL_HOUSE', sellItems),
      )}
    </Card>
  {:else if mode === 'mortgage'}
    {@const pos = pick(mortgageItems)}
    <Card
      title={t('D-13', {
        property: pos !== null ? spaceName(pos) : '',
        amount: brl(pos !== null ? mortgageValue(game.ctx, pos) : 0),
      })}
    >
      <OptionList
        label={options('D-13')[0] ?? ''}
        items={mortgageItems}
        selected={pos}
        onselect={choose}
      />
      {@render doneButton(options('D-13')[1] ?? '', options('D-13')[0] ?? '', pos === null, () =>
        runOn('MORTGAGE', mortgageItems),
      )}
    </Card>
  {:else if mode === 'redeem'}
    {@const pos = pick(redeemItems)}
    {@const cost = pos !== null ? redeemCost(game.ctx, pos) : 0}
    <Card title={t('D-14', { property: pos !== null ? spaceName(pos) : '', amount: brl(cost) })}>
      <OptionList
        label={options('D-14')[0] ?? ''}
        items={redeemItems}
        selected={pos}
        onselect={choose}
      />
      {@render doneButton(
        options('D-14')[1] ?? '',
        options('D-14')[0] ?? '',
        pos === null || (me?.money ?? 0) < cost,
        () => runOn('REDEEM', redeemItems),
        pos !== null && (me?.money ?? 0) < cost
          ? t('I-45', { amount: brl(cost - (me?.money ?? 0)) })
          : '',
      )}
    </Card>
  {:else if mode === 'trade-direction'}
    <Card eyebrow={t('I-55', { n: 1, total: 3 })} title={t('D-17a')}>
      <div class="actions">
        <button
          class="btn primary"
          type="button"
          disabled={!buyChoices.length}
          onclick={() => chooseDirection('buy')}>{options('D-17a')[0]}</button
        >
        <button
          class="btn secondary"
          type="button"
          disabled={!sellChoices.length || !targets.length}
          onclick={() => chooseDirection('sell')}>{options('D-17a')[1]}</button
        >
        <button class="btn secondary" type="button" onclick={() => goBack()}>{t('I-08')}</button>
      </div>
      <p class="hint">{extra('D-18', 'limit', { max: p.maxProposalsPerTurn })}</p>
    </Card>
  {:else if mode === 'trade-pick'}
    {@const list = trade.direction === 'buy' ? buyChoices : sellChoices}
    <Card eyebrow={t('I-55', { n: 2, total: 3 })} title={t('D-17b')}>
      <OptionList label={t('D-17b')} items={list} selected={pick(list)} onselect={chooseProperty} />
      <div class="actions">
        <button class="btn secondary" type="button" onclick={() => goBack()}>{t('I-08')}</button>
      </div>
    </Card>
  {:else if mode === 'trade-buyer'}
    <Card
      eyebrow={t('I-55', { n: 2, total: 3 })}
      title={t('I-49', { property: spaceName(trade.position) })}
    >
      <OptionList
        label={t('I-49', { property: spaceName(trade.position) })}
        items={buyerChoices}
        selected={pick(buyerChoices)}
        onselect={chooseBuyer}
      />
      <div class="actions">
        <button class="btn secondary" type="button" onclick={() => goBack()}>{t('I-08')}</button>
      </div>
    </Card>
  {:else if mode === 'trade-amount'}
    <Card
      eyebrow={t('I-55', { n: 3, total: 3 })}
      title={trade.direction === 'buy'
        ? t('D-17c', { property: spaceName(trade.position) })
        : extra('D-17c', 'sellText', { property: spaceName(trade.position) })}
    >
      <div class="prop-line">
        <span class="sw" style:background={propertyColor(trade.position)}></span>
        <b>{spaceName(trade.position)}</b>
        <span
          >{name(trade.direction === 'buy' ? trade.other : actor)} · {brl(
            priceOf(trade.position),
          )}</span
        >
      </div>
      <Stepper
        bind:value={trade.amount}
        min={p.tradeStep}
        max={Math.max(p.tradeStep, payerMoney)}
        step={p.tradeStep}
        fastStep={p.tradeStepFast}
        format={brl}
        label={t('I-64')}
        light
      />
      <p class="hint">{t('I-51', { step: brl(p.tradeStep), fastStep: brl(p.tradeStepFast) })}</p>
      <div class="actions">
        <button
          class="btn primary"
          type="button"
          data-default="true"
          disabled={payerMoney < p.tradeStep}
          onclick={sendProposal}>{options('D-17c')[0]}</button
        >
        <button class="btn secondary" type="button" onclick={() => goBack()}
          >{options('D-17c')[1]}</button
        >
      </div>
    </Card>
  {:else if mode === 'quit'}
    <!-- D-16: foco no "Não" para evitar saída acidental -->
    <Card title={t('D-16', { player: name(actor) })}>
      <div class="actions">
        <button class="btn primary" type="button" data-default="true" onclick={() => goBack()}
          >{options('D-16')[0]}</button
        >
        <button class="btn secondary" type="button" onclick={() => act({ type: 'QUIT' })}
          >{options('D-16')[1]}</button
        >
      </div>
    </Card>
  {:else if s.phase === 'TURN_START'}
    <Card title={t('D-01', { player: name(current) })}>
      <p class="big">{extra('D-01', 'subtitle', { player: name(current) })}</p>
      <div class="actions">
        <button
          class="btn primary"
          type="button"
          data-default="true"
          onclick={() => act({ type: 'START_TURN' })}>{options('D-01')[0]}</button
        >
      </div>
    </Card>
  {:else if s.phase === 'PRE_ROLL'}
    <Card title={t('D-02', { player: name(current) })} {onminimize}>
      <div class="actions">
        <button
          class="btn primary"
          type="button"
          data-default="true"
          onclick={() => act({ type: 'ROLL_DICE' })}>{options('D-02')[0]}</button
        >
        {@render menuButton()}
      </div>
      <p class="hint">{extra('D-02', 'hint')}</p>
    </Card>
  {:else if s.phase === 'POST_RESOLUTION'}
    {#if s.extraRoll}
      <Card title={t('D-03', { player: name(current) })} {onminimize}>
        {@render diceLine(current)}
        <div class="actions">
          <button
            class="btn primary"
            type="button"
            data-default="true"
            onclick={() => act({ type: 'ROLL_DICE' })}>{options('D-03')[0]}</button
          >
          {@render menuButton()}
        </div>
      </Card>
    {:else}
      <Card title={t('D-04', { player: name(current) })} {onminimize}>
        <div class="actions">
          <button
            class="btn primary"
            type="button"
            data-default="true"
            onclick={() => act({ type: 'END_TURN' })}>{options('D-04')[0]}</button
          >
          {@render menuButton()}
        </div>
      </Card>
    {/if}
  {:else if s.phase === 'JAIL_DECISION'}
    {@const player = s.players[current]}
    {@const short = (player?.money ?? 0) < p.bail}
    <Card
      eyebrow={t('I-04')}
      title={t('D-05', {
        player: name(current),
        n: (player?.jailTurns ?? 0) + 1,
        max: p.maxJailTurns,
      })}
      {onminimize}
    >
      <div class="actions">
        <button
          class="btn primary"
          type="button"
          data-default="true"
          onclick={() => act({ type: 'ROLL_DICE' })}>{options('D-05')[0]}</button
        >
        <button
          class="btn secondary"
          type="button"
          disabled={short}
          onclick={() => act({ type: 'PAY_BAIL' })}
          >{options('D-05', { bail: brl(p.bail) })[1]}</button
        >
        {#if short}<p class="reason">
            {t('I-45', { amount: brl(p.bail - (player?.money ?? 0)) })}
          </p>{/if}
        {#if (player?.jailCards.length ?? 0) > 0}
          <button class="btn secondary" type="button" onclick={() => act({ type: 'USE_JAIL_CARD' })}
            >{options('D-05')[2]}</button
          >
        {/if}
        {@render menuButton()}
      </div>
    </Card>
  {:else if s.phase === 'PURCHASE_DECISION'}
    {@const pos = s.players[current]?.position ?? 0}
    {@const price = priceOf(pos)}
    {@const money = s.players[current]?.money ?? 0}
    {@const short = money < price}
    <Card
      color={propertyColor(pos)}
      eyebrow={propertyEyebrow(pos)}
      title={spaceName(pos)}
      {onminimize}
    >
      {@render diceLine(current)}
      <dl class="facts">
        <dt>{t('I-19')}</dt>
        <dt>{t('I-20')}</dt>
        <dd>{brl(price)}</dd>
        <dd>{baseRent(pos)}</dd>
      </dl>
      <p class="question">{t(short ? 'D-08' : 'D-07', { player: name(current) })}</p>
      <div class="actions">
        {#if short}
          <button class="btn primary" type="button" disabled>{options('D-08')[0]}</button>
          <p class="reason">{extra('D-08', 'disabledReason', { amount: brl(price - money) })}</p>
          <button
            class="btn secondary"
            type="button"
            data-default="true"
            onclick={() => act({ type: 'DECLINE_PURCHASE' })}>{options('D-08')[1]}</button
          >
          {#if menuItems.some((i) => !i.disabled)}
            <button class="btn secondary" type="button" onclick={() => open('menu')}
              ><Icon name="bank" />Levantar dinheiro</button
            >
          {/if}
        {:else}
          <button
            class="btn primary"
            type="button"
            data-default="true"
            onclick={() => act({ type: 'BUY' })}
            >{options('D-07', { amount: brl(price) })[0]}</button
          >
          <button
            class="btn secondary"
            type="button"
            onclick={() => act({ type: 'DECLINE_PURCHASE' })}>{options('D-07')[1]}</button
          >
        {/if}
      </div>
    </Card>
  {:else if s.phase === 'CARD' && s.currentCard}
    {@const card = rules.cards[s.currentCard.deck].find((c) => c.id === s.currentCard?.id)}
    <Card
      tone={s.currentCard.deck}
      eyebrow={deckLabel(s.currentCard.deck)}
      title={card?.title ?? ''}
      {onminimize}
    >
      <p class="big">{card?.effect}</p>
      <div class="actions">
        <button
          class="btn primary"
          type="button"
          data-default="true"
          onclick={() => act({ type: 'CONFIRM' })}>{options('D-09')[0]}</button
        >
      </div>
    </Card>
  {:else if s.phase === 'RAISE_MONEY' && debt}
    {#if mode === 'main'}
      {#if debt.noWayOut}
        <Card
          title={t('D-19b', { amount: brl(debt.amount - maxRaisable(s, debt.debtor, game.ctx)) })}
          {onminimize}
        >
          <p class="sub">
            {t('D-19', {
              player: name(debt.debtor),
              amount: brl(debt.shortfall),
              creditor: name(debt.creditor),
            })}
          </p>
          <div class="actions">
            <button
              class="btn primary"
              type="button"
              data-default="true"
              onclick={() => act({ type: 'DECLARE_BANKRUPTCY' })}>{options('D-19b')[0]}</button
            >
          </div>
        </Card>
      {:else}
        {@const raisable =
          maxRaisable(s, debt.debtor, game.ctx) - (s.players[debt.debtor]?.money ?? 0)}
        {@const labels = options('D-19')}
        <Card
          title={t('D-19', {
            player: name(debt.debtor),
            amount: brl(debt.shortfall),
            creditor: name(debt.creditor),
          })}
          {onminimize}
        >
          <OptionList
            label={labels.join(', ')}
            items={[
              {
                id: 'sell',
                icon: 'tag',
                name: labels[0] ?? '',
                disabled: !streetsWithSellableHouse(s, debt.debtor, game.ctx).length,
                sub: streetsWithSellableHouse(s, debt.debtor, game.ctx).length
                  ? undefined
                  : t('I-42'),
              },
              {
                id: 'mortgage',
                icon: 'bank',
                name: labels[1] ?? '',
                disabled: !mortgageableProperties(s, debt.debtor, game.ctx).length,
                sub: mortgageableProperties(s, debt.debtor, game.ctx).length
                  ? undefined
                  : t('I-43'),
              },
              {
                id: 'bankrupt',
                icon: 'exit',
                name: labels[2] ?? '',
                danger: true,
                disabled: true,
                sub: extra('D-19', 'disabledReason', { amount: brl(raisable) }),
              },
            ]}
            onselect={(item) =>
              item.id === 'sell'
                ? open('sell', streetsWithSellableHouse(s, debt.debtor, game.ctx)[0] ?? null)
                : open('mortgage', mortgageableProperties(s, debt.debtor, game.ctx)[0] ?? null)}
          />
        </Card>
      {/if}
    {/if}
  {:else if s.phase === 'BANKRUPTCY' && s.pending?.type === 'collection' && s.pending.bankruptcy}
    {@const b = s.pending.bankruptcy}
    <Card title={t('D-20', { player: name(b.player), creditor: name(b.creditor) })} {onminimize}>
      <div class="actions">
        <button
          class="btn primary"
          type="button"
          data-default="true"
          onclick={() => act({ type: 'CONFIRM' })}>{options('D-20')[0]}</button
        >
      </div>
    </Card>
  {/if}
</div>

<style>
  .decision-root {
    display: contents;
  }
  .dice {
    display: flex;
    align-items: center;
    gap: 0.5em;
    color: var(--ink-2);
    font-size: 0.9em;
  }
  .waiting {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.6em;
    font-weight: 700;
    color: var(--ink-2);
  }
  .dots {
    display: inline-flex;
    gap: 0.25em;
  }
  .dots i {
    width: 0.45em;
    height: 0.45em;
    border-radius: 50%;
    background: var(--ink-2);
    animation: blink 1.2s infinite ease-in-out;
  }
  .dots i:nth-child(2) {
    animation-delay: 0.2s;
  }
  .dots i:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes blink {
    0%,
    80%,
    100% {
      opacity: 0.25;
    }
    40% {
      opacity: 1;
    }
  }
  .facts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.2em 1em;
    margin: 0;
  }
  .facts dt {
    font-size: 0.78em;
    color: var(--ink-2);
  }
  .facts dd {
    margin: 0;
    font: 600 1.3em var(--font-display);
    font-variant-numeric: tabular-nums;
  }
  .prop-line {
    display: flex;
    align-items: center;
    gap: 0.6em;
    background: var(--card-3);
    border-radius: 0.7em;
    padding: 0.55em 0.7em;
    flex-wrap: wrap;
  }
  .prop-line .sw {
    width: 0.8em;
    height: 1.9em;
    border-radius: 0.25em;
  }
  .prop-line b {
    font-weight: 800;
    flex: 1;
  }
  .prop-line span:last-child {
    color: var(--ink-2);
    font-size: 0.85em;
  }
  .label {
    font-size: 0.7em;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--ink-2);
    margin-bottom: 0.35em;
  }
  .ladder {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.25em;
  }
  .ladder div {
    background: var(--card-3);
    border-radius: 0.5em;
    padding: 0.35em 0.2em;
    text-align: center;
  }
  .ladder span {
    display: block;
    font-size: 0.66em;
    color: var(--ink-2);
    font-weight: 700;
  }
  .ladder b {
    font: 600 0.9em var(--font-display);
    font-variant-numeric: tabular-nums;
  }
  .ladder .now {
    outline: 2px solid var(--ink);
    background: #fff;
  }
  .ladder .next {
    background: var(--focus);
  }
</style>
