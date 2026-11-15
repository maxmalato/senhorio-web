<script lang="ts">
  // Fluxo do modo "um aparelho": início → jogadores → modo → ordem sorteada → jogo → fim.
  import {
    createContext,
    createRandomizer,
    createSeededRandom,
    newGame,
    type EngineContext,
    type GameState,
    type RandomSource,
  } from '@senhorio/engine';
  import { Game, INSTANT_TIMINGS, NORMAL_TIMINGS, REDUCED_TIMINGS } from './lib/game/game.svelte';
  import GameScreen from './lib/game/GameScreen.svelte';
  import { defaultNames, PAWN_COLORS, RULES_RESULT, rules } from './lib/rules';
  import End from './lib/screens/End.svelte';
  import Home from './lib/screens/Home.svelte';
  import Mode, { type ModeSetup } from './lib/screens/Mode.svelte';
  import Order from './lib/screens/Order.svelte';
  import Players, { type PlayerSetup } from './lib/screens/Players.svelte';

  type Screen = 'home' | 'players' | 'mode' | 'order' | 'game' | 'end';

  // Parâmetros para testes: ?seed=N reproduz os sorteios; ?speed=0 tira as esperas.
  const params = new URLSearchParams(location.search);
  const seedParam = params.get('seed');
  const timings =
    params.get('speed') === '0'
      ? INSTANT_TIMINGS
      : matchMedia('(prefers-reduced-motion: reduce)').matches
        ? REDUCED_TIMINGS
        : NORMAL_TIMINGS;

  function randomSource(): RandomSource {
    if (seedParam !== null && Number.isFinite(Number(seedParam)))
      return createSeededRandom(Number(seedParam));
    // sorteio do navegador com qualidade criptográfica
    return () => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32;
  }

  let screen: Screen = $state('home');
  let players: PlayerSetup[] = $state(
    Array.from({ length: 4 }, (_, i) => ({
      name: defaultNames[i] ?? '',
      color: PAWN_COLORS[i] ?? '#fff',
    })),
  );
  let mode: ModeSetup = $state({
    type: 'rounds',
    minutes: rules.modes.time.defaultMinutes,
    rounds: rules.modes.rounds.default,
  });
  let ctx: EngineContext | null = $state.raw(null);
  let initial: GameState | null = $state.raw(null);
  let game: Game | null = $state.raw(null);

  function drawOrder() {
    ctx = createContext(RULES_RESULT, createRandomizer(randomSource()));
    const limit = mode.type === 'time' ? mode.minutes : mode.type === 'rounds' ? mode.rounds : null;
    const created = newGame(
      {
        players: players.map((p) => ({ name: p.name.trim(), color: p.color })),
        mode: { type: mode.type, limit },
      },
      ctx,
    );
    if (!created.ok) {
      screen = 'players';
      return;
    }
    initial = created.state;
    screen = 'order';
  }

  function start() {
    if (!initial || !ctx) return;
    game = new Game(initial, ctx, timings);
    screen = 'game';
  }
</script>

<main class="root">
  {#if screen === 'home'}
    <Home onnew={() => (screen = 'players')} />
  {:else if screen === 'players'}
    <Players bind:players onback={() => (screen = 'home')} onnext={() => (screen = 'mode')} />
  {:else if screen === 'mode'}
    <Mode bind:mode onback={() => (screen = 'players')} onnext={drawOrder} />
  {:else if screen === 'order' && initial}
    <Order state={initial} onback={() => (screen = 'mode')} onstart={start} />
  {:else if screen === 'game' && game}
    <GameScreen {game} onend={() => (screen = 'end')} />
  {:else if screen === 'end' && game && ctx}
    <End state={game.state} {ctx} onagain={drawOrder} onexit={() => (screen = 'home')} />
  {/if}
</main>

<style>
  .root {
    height: 100%;
  }
</style>
