<script lang="ts">
  // Sala de espera (mockups, rodada 1): código grande para ditar, jogadores e início.
  import { formatCode, TABLE_SEAT, type RoomView } from '@senhorio/protocol';
  import { brl, options, rules, t } from '../rules';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';
  import { canShare, copyText } from '../ui/clipboard';
  import { fullscreen } from '../ui/screen.svelte';
  import { roomLink } from './link';
  import QrCode from './QrCode.svelte';

  let {
    room,
    me,
    onstart,
    onleave,
    onremove,
    onclose,
  }: {
    room: RoomView;
    me: number | null;
    onstart: () => void;
    onleave: () => void;
    onremove: (seat: number) => void;
    /** Modo mesa: a mesa encerra a sala para todos (pede confirmação antes). */
    onclose?: () => void;
  } = $props();

  const p = rules.parameters;
  let copied = $state(false);
  let linkCopied = $state(false);
  /** Nada conseguiu copiar: mostra o texto para copiar à mão. */
  let manual: string | null = $state(null);
  const link = $derived(roomLink(room.code));
  const isHost = $derived(me === room.host);
  /** Modo mesa: este aparelho é a mesa. */
  const isTable = $derived(me === TABLE_SEAT);
  /** Sem a mesa conectada, qualquer jogador comanda a sala (o servidor confere). */
  const commands = $derived(
    isHost || (me !== null && me >= 0 && room.table !== null && !room.table.connected),
  );
  const hostName = $derived(room.table ? t('W-71') : (room.seats[room.host]?.name ?? ''));
  const allConnected = $derived(room.seats.every((s) => s.connected));
  const canStart = $derived(commands && room.seats.length >= p.minPlayers && allConnected);
  const modeText = $derived(
    room.mode.type === 'classic'
      ? t('I-78')
      : room.mode.type === 'time'
        ? t('I-79', { n: room.mode.limit ?? 0 })
        : t('I-80', { n: room.mode.limit ?? 0 }),
  );

  async function copy() {
    manual = null;
    if (await copyText(room.code)) {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } else manual = formatCode(room.code);
  }

  /** No celular (em https), o menu de compartilhar do sistema; nos outros casos, copia o link. */
  async function share() {
    manual = null;
    if (canShare()) {
      try {
        await navigator.share({
          title: t('I-01'),
          text: t('W-67', { code: formatCode(room.code) }),
          url: link,
        });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') return; // a pessoa desistiu
      }
    }
    if (await copyText(link)) {
      linkCopied = true;
      setTimeout(() => (linkCopied = false), 2000);
    } else manual = link;
  }

  /** Seleciona o texto do campo de cópia manual ao aparecer. */
  function selectAll(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<div class="full-screen">
  <div class="sheet split" use:focusDefault>
    <div class="span">
      <h1>{t('W-11')}</h1>
      <p class="lead">{t('I-77', { amount: brl(p.startingMoney), mode: modeText })}</p>
    </div>
    <div class="col invite">
      <div class="code-big">
        <QrCode text={link} label={t('W-66', { code: formatCode(room.code) })} large={isTable} />
        <span class="hint">{t('W-63')}</span>
        <span class="lab">{t('W-12')}</span>
        <span class="code" aria-label="{t('W-08')}: {room.code.split('').join(' ')}"
          >{formatCode(room.code)}</span
        >
        <div class="share">
          <button class="btn secondary" type="button" onclick={share}
            >{linkCopied ? t('W-65') : t('W-64')}</button
          >
          <button class="btn ghost" type="button" onclick={copy}
            >{copied ? t('W-14') : t('W-13')}</button
          >
        </div>
        {#if manual}
          <label class="manual">
            <span>{t('W-68')}</span>
            <input class="input" readonly value={manual} use:selectAll />
          </label>
        {/if}
      </div>
      <p class="footnote">{t('W-15')}</p>
    </div>
    <div class="col">
      <div class="count">
        <h2>{t('W-16')}</h2>
        <span>{t('W-17', { n: room.seats.length, max: p.maxPlayers })}</span>
      </div>
      <ul class="list">
        {#each room.seats as seat, i (seat.name)}
          <li class="row" class:offline={!seat.connected}>
            <span class="avatar" style:background={seat.color} aria-hidden="true"
              >{seat.name.slice(0, 1).toUpperCase()}</span
            >
            <span class="grow">
              {seat.name}
              {#if i === me}<span class="tag me">{t('W-23')}</span>{/if}
              {#if !seat.connected}<span class="tag off">{t('W-24')}</span>{/if}
            </span>
            <span class="meta">{i === room.host ? t('W-18') : ''}</span>
            {#if commands && i !== me && !seat.connected}
              <button class="btn ghost small" type="button" onclick={() => onremove(i)}
                >{t('I-08')}</button
              >
            {/if}
          </li>
        {/each}
        {#each Array.from({ length: Math.max(0, p.maxPlayers - room.seats.length) }, (_v, k) => k) as k (k)}
          <li class="row empty"><span class="avatar">+</span><span>{t('W-19')}</span></li>
        {/each}
      </ul>
      {#if commands}
        {#if !isHost}<p class="callout" role="status">
            <Icon name="info" /><span>{t('W-81')}</span>
          </p>{/if}
        <button
          class="btn gold"
          type="button"
          data-default="true"
          disabled={!canStart}
          onclick={onstart}>{options('D-25')[0]}</button
        >
        <p class="footnote">{allConnected ? t('W-20') : t('W-45')}</p>
      {:else}
        <p class="callout" role="status">
          <Icon name="info" /><span>{t('W-21', { player: hostName })}</span>
        </p>
      {/if}
      {#if isTable}
        {#if fullscreen.supported}
          <button class="btn secondary" type="button" onclick={() => fullscreen.toggle()}
            >{fullscreen.active ? t('W-78') : t('W-77')}</button
          >
        {/if}
        <button class="btn ghost" type="button" onclick={() => onclose?.()}>{t('W-73')}</button>
      {:else}
        <button class="btn ghost" type="button" onclick={onleave}>{t('W-22')}</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .col {
    display: grid;
    gap: 0.9em;
    align-content: start;
  }
  /* em duas colunas, o convite (QR Code e código) fica centralizado na altura dos jogadores */
  .col.invite {
    align-self: center;
  }
  .code-big {
    display: grid;
    justify-items: center;
    gap: 0.6em;
    background: var(--panel);
    border-radius: 1.1em;
    padding: 1.1em;
    text-align: center;
  }
  .hint {
    font-size: 0.85em;
    color: var(--text-2);
  }
  .manual {
    display: grid;
    gap: 0.4em;
    width: 100%;
    font-size: 0.85em;
    color: var(--text-2);
    text-align: left;
  }
  .share {
    display: grid;
    gap: 0.5em;
    width: 100%;
  }
  .lab {
    font-size: 0.75em;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--text-2);
  }
  .code {
    font: 600 2.6em/1 var(--font-display);
    letter-spacing: 0.14em;
    font-variant-numeric: tabular-nums;
  }
  .count {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .count h2 {
    margin: 0;
    font: 600 1.15em var(--font-display);
  }
  .count span {
    color: var(--text-2);
    font-size: 0.88em;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5em;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.75em;
    background: var(--panel);
    border-radius: 0.9em;
    padding: 0.6em 0.8em;
  }
  .row.offline {
    opacity: 0.8;
  }
  .grow {
    flex: 1;
    min-width: 0;
    font: 600 1.05em var(--font-display);
    display: flex;
    gap: 0.4em;
    align-items: center;
    flex-wrap: wrap;
  }
  .meta {
    color: var(--text-2);
    font-size: 0.82em;
  }
  .row.empty {
    background: transparent;
    border: 1.5px dashed var(--line);
    color: var(--text-2);
    font-weight: 700;
  }
  .row.empty .avatar {
    background: transparent;
    border: 1.5px dashed var(--line);
    color: var(--text-2);
  }
  .tag {
    font: 800 0.58em/1 var(--font-body);
    letter-spacing: 0.08em;
    padding: 0.35em 0.5em;
    border-radius: 0.5em;
  }
  .tag.me {
    background: var(--text);
    color: var(--ink);
  }
  .tag.off {
    background: var(--danger);
    color: #2a0f0d;
  }
  .btn.small {
    min-height: 2.2em;
    padding: 0.3em 0.8em;
    font-size: 0.85em;
  }
  .callout {
    margin: 0;
  }
</style>
