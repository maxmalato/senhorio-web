<script lang="ts">
  // Entrar com código (mockups, rodada 1): o código é conferido antes, para mostrar as cores livres.
  import { normalizeCode, ROOM_CODE_LENGTH } from '@senhorio/protocol';
  import { untrack } from 'svelte';
  import { defaultNames, PAWN_COLORS, rules, t } from '../rules';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';
  import { roomInfo, type RoomInfo } from './api';
  import ColorPicker from './ColorPicker.svelte';
  import { ROOM_ERROR_TEXT } from './connection.svelte';

  let {
    initialError = '',
    initialCode = '',
    onback,
    onjoin,
  }: {
    initialError?: string;
    /** Código vindo do link ou do QR Code da sala. */
    initialCode?: string;
    onback: () => void;
    onjoin: (setup: { code: string; name: string; color: string }) => void;
  } = $props();

  const p = rules.parameters;
  let raw = $state(untrack(() => initialCode));
  let name = $state(defaultNames[1] ?? '');
  let color = $state(PAWN_COLORS[1] ?? '');
  let info = $state<RoomInfo | null>(null);
  let checking = $state(false);
  // começa com o erro recebido (ex.: sala cheia ao entrar); a consulta do código sobrescreve
  let error = $derived(initialError);

  const code = $derived(normalizeCode(raw));
  const taken = $derived(info?.takenColors ?? []);

  // código completo: consulta a sala (existe? já começou? quais cores estão livres?)
  $effect(() => {
    const current = code;
    info = null;
    if (!current) return;
    checking = true;
    void roomInfo(current).then((result) => {
      if (current !== code) return;
      checking = false;
      if (!result.ok) {
        error = t(result.error === 'offline' ? 'W-59' : (ROOM_ERROR_TEXT[result.error] ?? 'W-60'));
        return;
      }
      info = result.value;
      error = info.status !== 'lobby' ? t('W-51') : info.seats >= info.maxSeats ? t('W-52') : '';
      if (info.takenColors.includes(color))
        color = PAWN_COLORS.find((c) => !info?.takenColors.includes(c)) ?? color;
    });
  });

  const canJoin = $derived(
    !!code &&
      !!info &&
      info.status === 'lobby' &&
      info.seats < info.maxSeats &&
      !taken.includes(color) &&
      name.trim().length > 0 &&
      name.trim().length <= p.maxNameLength,
  );
</script>

<div class="full-screen">
  <div class="sheet" use:focusDefault>
    <button class="back" type="button" onclick={onback}><Icon name="back" />{t('I-08')}</button>
    <h1>{t('W-07')}</h1>
    <div class="field">
      <label for="room-code">{t('W-08')}</label>
      <input
        id="room-code"
        class="input code"
        bind:value={raw}
        maxlength={ROOM_CODE_LENGTH + 2}
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        placeholder="K7P·4QX"
        data-default="true"
      />
    </div>
    {#if error}
      <p class="callout error" role="alert"><Icon name="info" /><span>{error}</span></p>
    {:else}
      <p class="callout"><Icon name="info" /><span>{checking ? t('W-40') : t('W-09')}</span></p>
    {/if}
    <div class="field">
      <label for="join-name">{t('W-04')}</label>
      <input
        id="join-name"
        class="input"
        bind:value={name}
        maxlength={p.maxNameLength}
        autocomplete="off"
      />
    </div>
    <div class="field">
      <span class="lab">{t('W-05')}</span>
      <ColorPicker bind:value={color} {taken} label={t('W-05')} />
    </div>
    <button
      class="btn gold"
      type="button"
      disabled={!canJoin}
      onclick={() => code && onjoin({ code, name: name.trim(), color })}
    >
      {t('W-10')}
    </button>
  </div>
</div>

<style>
  .code {
    font: 600 1.8em var(--font-display);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    text-align: center;
  }
  .callout {
    margin: 0;
  }
  .callout.error {
    background: #3a1f24;
    color: #ffd9d4;
  }
  .callout.error :global(svg) {
    color: var(--danger);
  }
</style>
