<script lang="ts">
  // Fluxo do modo "um aparelho": início → jogadores → modo → ordem sorteada → jogo → fim.
  // A partida é salva no aparelho no fim de cada turno e pode ser continuada (Etapa 3).
  import {
    createContext,
    createRandomizer,
    createSeededRandom,
    newGame,
    type EngineContext,
    type GameState,
    type RandomSource,
  } from '@senhorio/engine';
  import { onMount } from 'svelte';
  import { Game, INSTANT_TIMINGS, NORMAL_TIMINGS, REDUCED_TIMINGS } from './lib/game/game.svelte';
  import GameScreen from './lib/game/GameScreen.svelte';
  import { pwa } from './lib/pwa.svelte';
  import { defaultNames, PAWN_COLORS, RULES_RESULT, rules } from './lib/rules';
  import { deleteGame, loadGame, saveGame, type SaveRecord } from './lib/save/save';
  import { createIndexedDbStore, createMemoryStore, type SaveStore } from './lib/save/store';
  import End from './lib/screens/End.svelte';
  import Home from './lib/screens/Home.svelte';
  import Mode, { type ModeSetup } from './lib/screens/Mode.svelte';
  import Order from './lib/screens/Order.svelte';
  import Players, { type PlayerSetup } from './lib/screens/Players.svelte';
  import type { ModeConfig } from '@senhorio/protocol';
  import { createRoom } from './lib/room/api';
  import { RoomConnection, savedSeat, ROOM_ERROR_TEXT } from './lib/room/connection.svelte';
  import CreateRoom from './lib/room/CreateRoom.svelte';
  import JoinRoom from './lib/room/JoinRoom.svelte';
  import { clearCodeFromUrl, codeFromUrl } from './lib/room/link';
  import RoomFlow from './lib/room/RoomFlow.svelte';
  import { t } from './lib/rules';
  import { clearTurnNotice } from './lib/sound/alert';
  import HowToPlay from './lib/help/HowToPlay.svelte';
  import Icon from './lib/ui/Icon.svelte';
  import { focusDefault } from './lib/ui/focus';

  type Screen =
    'home' | 'players' | 'mode' | 'order' | 'game' | 'end' | 'create' | 'join' | 'room' | 'help';

  let { store = defaultStore() }: { store?: SaveStore } = $props();

  function defaultStore(): SaveStore {
    // sem IndexedDB (alguns modos privados), o jogo funciona, mas não guarda a partida
    return typeof indexedDB === 'undefined' ? createMemoryStore() : createIndexedDbStore();
  }

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
    if (seedParam !== null && Number.isFinite(Number(seedParam))) {
      return createSeededRandom(Number(seedParam));
    }
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
  let saved: SaveRecord | null = $state.raw(null);
  let incompatible = $state(false);

  async function refreshSaved() {
    const loaded = await loadGame(store, rules.version);
    saved = loaded.status === 'ok' ? loaded.record : null;
    incompatible = loaded.status === 'incompatible';
  }
  onMount(() => {
    void refreshSaved();
  });

  function drawOrder() {
    ctx = createContext(RULES_RESULT, createRandomizer(randomSource()));
    const limit = mode.type === 'time' ? mode.minutes : mode.type === 'rounds' ? mode.rounds : null;
    const created = newGame(
      {
        players: players.map((p) => ({ name: p.name.trim(), color: p.color, bot: !!p.bot })),
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

  function play(state: GameState, context: EngineContext, secondsLeft: number | null = null) {
    game = new Game(state, context, timings, {
      persist: (st, seconds) => saveGame(store, st, seconds),
      forget: () => deleteGame(store),
      secondsLeft,
      botRandom: randomSource(),
    });
    screen = 'game';
  }

  // evita começar a mesma partida duas vezes (toque duplo enquanto a gravação termina)
  let starting = false;
  async function start() {
    if (!initial || !ctx || starting) return;
    starting = true;
    // primeira gravação logo ao começar (a anterior, se havia, é substituída)
    const seconds = initial.mode.type === 'time' ? (initial.mode.limit ?? 0) * 60 : null;
    try {
      await saveGame(store, initial, seconds);
      play(initial, ctx, seconds);
    } finally {
      starting = false;
    }
  }

  function resume() {
    if (!saved) return;
    const state = saved.state;
    // "Jogar de novo" no fim usa os mesmos jogadores e o mesmo modo
    players = state.players.map((p) => ({ name: p.name, color: p.color, bot: p.bot === true }));
    mode = {
      type: state.mode.type,
      minutes: state.mode.type === 'time' ? (state.mode.limit ?? mode.minutes) : mode.minutes,
      rounds: state.mode.type === 'rounds' ? (state.mode.limit ?? mode.rounds) : mode.rounds,
    };
    ctx = createContext(RULES_RESULT, createRandomizer(randomSource()));
    play(state, ctx, saved.secondsLeft);
  }

  async function startNew() {
    await deleteGame(store);
    saved = null;
    incompatible = false;
    screen = 'players';
  }

  // ---------- vários aparelhos ----------
  let connection: RoomConnection | null = $state.raw(null);
  let roomCode: string | null = $state(savedSeat()?.code ?? null);
  let roomIsTable = $state(savedSeat()?.table === true);
  /** Modo mesa: a tela de criar está criando uma mesa (sem apelido nem cor). */
  let tableCreate = $state(false);
  let roomError = $state('');

  // convite por link ou QR Code (?sala=ABC234): abre "Entrar na sala" já com o código.
  // Quem já está nessa sala vê o "Voltar para a sala" da tela inicial.
  let inviteCode = $state('');
  const invited = codeFromUrl();
  if (invited) {
    clearCodeFromUrl();
    if (invited !== savedSeat()?.code) {
      inviteCode = invited;
      screen = 'join';
    }
  }
  let creating = $state(false);
  let createError = $state('');

  async function onCreateRoom(setup: { name: string; color: string; mode: ModeConfig }) {
    creating = true;
    createError = '';
    const result = await createRoom(setup.mode);
    creating = false;
    if (!result.ok) {
      createError = t(
        result.error === 'offline' ? 'W-59' : (ROOM_ERROR_TEXT[result.error] ?? 'W-56'),
      );
      return;
    }
    connection = new RoomConnection(result.value.code, { name: setup.name, color: setup.color });
    screen = 'room';
  }

  function onJoinRoom(setup: { code: string; name: string; color: string }) {
    connection = new RoomConnection(setup.code, { name: setup.name, color: setup.color });
    screen = 'room';
  }

  function rejoin() {
    const seat = savedSeat();
    if (!seat) return;
    connection = new RoomConnection(seat.code, { token: seat.token });
    screen = 'room';
  }

  /** Modo mesa: esta tela cria a sala e entra como mesa, com o token que a sala devolveu. */
  async function onCreateTable(mode: ModeConfig) {
    creating = true;
    createError = '';
    const result = await createRoom(mode, true);
    creating = false;
    if (!result.ok || !result.value.tableToken) {
      const error = result.ok ? 'unavailable' : result.error;
      createError = t(error === 'offline' ? 'W-59' : (ROOM_ERROR_TEXT[error] ?? 'W-56'));
      return;
    }
    connection = new RoomConnection(result.value.code, { token: result.value.tableToken });
    screen = 'room';
  }

  function leaveRoom(error?: string) {
    clearTurnNotice();
    connection = null;
    roomCode = savedSeat()?.code ?? null;
    roomIsTable = savedSeat()?.table === true;
    roomError = error ?? '';
    screen = 'home';
  }

  async function backHome() {
    game?.stopClock();
    await refreshSaved();
    screen = 'home';
  }
</script>

<main class="root">
  {#if screen === 'home'}
    <Home
      {saved}
      {incompatible}
      updateReady={pwa.updateReady}
      offlineReady={pwa.offlineReady}
      onnew={startNew}
      onresume={resume}
      onupdate={() => pwa.update()}
      {roomCode}
      {roomIsTable}
      {roomError}
      oncreateroom={() => ((roomError = ''), (tableCreate = false), (screen = 'create'))}
      oncreatetable={() => ((roomError = ''), (tableCreate = true), (screen = 'create'))}
      onhelp={() => (screen = 'help')}
      onjoinroom={() => ((roomError = ''), (inviteCode = ''), (screen = 'join'))}
      onrejoin={rejoin}
    />
  {:else if screen === 'help'}
    <div class="full-screen">
      <div class="sheet" use:focusDefault>
        <button class="back" type="button" onclick={() => (screen = 'home')}
          ><Icon name="back" />{t('I-08')}</button
        >
        <HowToPlay />
      </div>
    </div>
  {:else if screen === 'create'}
    <CreateRoom
      busy={creating}
      error={createError}
      table={tableCreate}
      onback={() => (screen = 'home')}
      oncreate={(setup) => (tableCreate ? onCreateTable(setup.mode) : onCreateRoom(setup))}
    />
  {:else if screen === 'join'}
    <JoinRoom onback={() => (screen = 'home')} onjoin={onJoinRoom} initialCode={inviteCode} />
  {:else if screen === 'room' && connection}
    {#key connection}
      <RoomFlow {connection} {timings} onexit={leaveRoom} />
    {/key}
  {:else if screen === 'players'}
    <Players bind:players onback={backHome} onnext={() => (screen = 'mode')} />
  {:else if screen === 'mode'}
    <Mode bind:mode onback={() => (screen = 'players')} onnext={drawOrder} />
  {:else if screen === 'order' && initial}
    <Order state={initial} onback={() => (screen = 'mode')} onstart={start} />
  {:else if screen === 'game' && game}
    <GameScreen {game} onend={() => (screen = 'end')} onsaveexit={backHome} />
  {:else if screen === 'end' && game && ctx}
    <End state={game.state} {ctx} onagain={drawOrder} onexit={backHome} />
  {/if}
</main>

<style>
  .root {
    height: 100%;
  }
</style>
