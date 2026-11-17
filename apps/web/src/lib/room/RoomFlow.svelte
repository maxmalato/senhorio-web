<script lang="ts">
  // Modo de vários aparelhos: sala de espera → partida → fim, tudo pela conexão com a sala.
  // O estado da partida vem sempre da sala; este aparelho só anima os eventos e envia ações.
  import { createContext, createRandomizer } from '@senhorio/engine';
  import type { RoomView } from '@senhorio/protocol';
  import { Game, type Timings } from '../game/game.svelte';
  import GameScreen from '../game/GameScreen.svelte';
  import { RULES_RESULT, t } from '../rules';
  import End from '../screens/End.svelte';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';
  import { keepScreenAwake } from '../ui/screen.svelte';
  import ConfirmClose from './ConfirmClose.svelte';
  import { ROOM_ERROR_TEXT, type RoomConnection } from './connection.svelte';
  import Lobby from './Lobby.svelte';

  let {
    connection,
    timings,
    onexit,
  }: { connection: RoomConnection; timings: Timings; onexit: (error?: string) => void } = $props();

  // contexto só para consultas da tela (valores de hipoteca, aluguel); o sorteio é na sala
  const ctx = createContext(
    RULES_RESULT,
    createRandomizer(() => 0.5),
  );
  let game: Game | null = $state.raw(null);
  let showEnd = $state(false);
  /** Modo mesa: pedindo confirmação para encerrar a sala. */
  let confirmClose = $state(false);

  // modo mesa: a tela da mesa não apaga durante a sala (onde o navegador permitir)
  $effect(() => {
    if (connection.isTable) return keepScreenAwake();
  });

  function ensureGame(room: RoomView): Game | null {
    if (!room.game || connection.seat === null) return null;
    if (!game || game.me !== connection.seat) {
      game = new Game(room.game, ctx, timings, {
        send: (action) => connection.action(action),
        me: connection.seat,
        // modo mesa: a mesa toca todos os sons; os celulares, só o próprio dinheiro
        table: connection.isTable,
        quiet: room.table !== null && !connection.isTable,
      });
      game.startClock();
    }
    return game;
  }

  function syncTimer(room: RoomView) {
    if (game && room.timer) game.syncTimer(room.timer.secondsLeft, room.timer.running);
  }

  $effect(() =>
    connection.listen({
      onRoom(room) {
        if (room.status === 'lobby') {
          game?.stopClock();
          game = null;
          showEnd = false;
          return;
        }
        const current = game;
        const created = ensureGame(room);
        // retrato completo (reconexão, pausa): põe a tela em dia sem animar nada
        if (created && current === created && room.game && !created.busy)
          void created.receive(room.game, []);
        syncTimer(room);
      },
      onUpdate(room, events) {
        const existing = game;
        const target = ensureGame(room);
        if (target && room.game) {
          // partida que acabou de começar: anima a partir do estado antes dos eventos
          if (existing === target) void target.receive(room.game, events);
        }
        syncTimer(room);
      },
      onError(code) {
        if (code === 'removed' || code === 'unknownToken')
          onexit(t(ROOM_ERROR_TEXT[code] ?? 'W-58'));
        // a mesa encerrou a sala: a própria mesa volta em silêncio; os celulares, com aviso
        if (code === 'roomClosed') onexit(connection.isTable ? undefined : t('W-72'));
      },
    }),
  );

  const room = $derived(connection.room);
  const error = $derived(
    connection.error && connection.seat === null
      ? t(ROOM_ERROR_TEXT[connection.error] ?? 'W-60')
      : '',
  );

  /** Pode comandar a sala: quem criou, ou qualquer jogador se a mesa caiu. */
  function commands(room: RoomView): boolean {
    if (connection.seat === room.host) return true;
    return (connection.seat ?? -1) >= 0 && room.table !== null && !room.table.connected;
  }

  function leaveForGood() {
    connection.leave();
    onexit();
  }
  function stepOut() {
    // durante a partida, sair é só desconectar: dá para voltar pelo mesmo aparelho
    connection.close(false);
    onexit();
  }
</script>

{#if error}
  <div class="full-screen">
    <div class="sheet" use:focusDefault>
      <p class="callout error" role="alert"><Icon name="info" /><span>{error}</span></p>
      <button class="btn gold" type="button" data-default="true" onclick={() => onexit(error)}
        >{t('I-08')}</button
      >
    </div>
  </div>
{:else if !room || connection.seat === null}
  <div class="full-screen">
    <div class="sheet"><p class="lead" role="status">{t('W-40')}</p></div>
  </div>
{:else if room.status === 'lobby'}
  <Lobby
    {room}
    me={connection.seat}
    onstart={() => connection.send({ type: 'start' })}
    onleave={leaveForGood}
    onremove={(seat) => connection.send({ type: 'remove', seat })}
    onclose={() => (confirmClose = true)}
  />
{:else if game && (room.status === 'playing' || !showEnd)}
  <GameScreen
    {game}
    {room}
    clockOffset={connection.clockOffset}
    onend={() => (showEnd = true)}
    onpause={(paused) => connection.send({ type: 'pause', paused })}
    onremove={(seat) => connection.send({ type: 'remove', seat })}
    onleave={stepOut}
    onclose={() => (confirmClose = true)}
  />
{:else if game}
  <End
    state={game.state}
    {ctx}
    multi={{
      isHost: commands(room),
      hostName: room.table ? t('W-71') : (room.seats[room.host]?.name ?? ''),
      exitLabel: connection.isTable ? t('W-73') : undefined,
    }}
    onagain={() => connection.send({ type: 'again' })}
    onexit={connection.isTable ? () => (confirmClose = true) : leaveForGood}
  />
{/if}

{#if confirmClose}
  <ConfirmClose
    oncancel={() => (confirmClose = false)}
    onconfirm={() => {
      confirmClose = false;
      connection.send({ type: 'close' });
    }}
  />
{/if}

{#if connection.status === 'retrying'}
  <p class="banner" role="status">{t('W-41')}</p>
{/if}

<style>
  .callout {
    margin: 0;
  }
  .callout.error {
    background: #3a1f24;
    color: #ffd9d4;
  }
  .banner {
    position: fixed;
    left: 50%;
    top: calc(8px + env(safe-area-inset-top, 0px));
    transform: translateX(-50%);
    margin: 0;
    background: var(--danger);
    color: #2a0f0d;
    font-weight: 800;
    padding: 0.5em 1em;
    border-radius: 0.8em;
    z-index: 30;
  }
</style>
