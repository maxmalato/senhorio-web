// Controlador da partida no modo "um aparelho": envia ações ao motor e anima os eventos.
// A interface nunca decide regra (docs/07): ela só chama transition() e mostra o resultado.

import {
  transition,
  type Action,
  type EngineContext,
  type GameEvent,
  type GameState,
  type Reason,
} from '@senhorio/engine';
import { actorsOf } from '@senhorio/protocol';
import { index, rules, t } from '../rules';
import { notifyTurn } from '../sound/alert';
import { soundFor } from '../sound/events';
import { playSound } from '../sound/synth';
import { narrate } from './narrate';
import { viewFrom, type View } from './view';

/** Tempos das animações em ms (docs/01: cerca de 150 ms por casa). */
export interface Timings {
  dice: number;
  step: number;
  jail: number;
  toast: number;
}

export const NORMAL_TIMINGS: Timings = {
  dice: 650,
  step: 150,
  jail: 450,
  toast: rules.parameters.messageDurationMs,
};
export const REDUCED_TIMINGS: Timings = {
  dice: 200,
  step: 40,
  jail: 150,
  toast: NORMAL_TIMINGS.toast,
};
/** Testes automáticos: sem espera nenhuma (parâmetro ?speed=0). */
export const INSTANT_TIMINGS: Timings = { dice: 0, step: 0, jail: 0, toast: 0 };

export interface DiceShown {
  d1: number;
  d2: number;
  double: boolean;
  rentOnly: boolean;
}

/** Pausa no meio dos eventos que pede um OK do jogador (D-06, fiança obrigatória). */
export interface Interstitial {
  kind: 'mandatoryBail';
  player: number;
  amount: number;
}

const HISTORY_SIZE = 3;

export interface GameOptions {
  /** Grava a partida; devolve false se não conseguiu. */
  persist?: (state: GameState, secondsLeft: number | null) => Promise<boolean>;
  /** Apaga a partida salva (fim de partida). */
  forget?: () => Promise<void>;
  /** Modo tempo: segundos restantes de uma partida retomada. */
  secondsLeft?: number | null;
  /**
   * Vários aparelhos: a ação vai para a sala em vez do motor local; o resultado volta por
   * receive(), igual para todos os aparelhos.
   */
  send?: (action: Action) => void;
  /** Vários aparelhos: o lugar deste aparelho na sala. */
  me?: number;
}

export class Game {
  readonly ctx: EngineContext;
  readonly timings: Timings;
  /** Estado do motor (sempre o mais recente). */
  state: GameState = $state.raw() as unknown as GameState;
  /** O que a tela mostra agora (anda junto com as animações). */
  view: View = $state() as unknown as View;
  history: string[] = $state([]);
  toast: string | null = $state(null);
  dice: DiceShown | null = $state(null);
  interstitial: Interstitial | null = $state(null);
  /** true enquanto eventos ou avisos estão sendo mostrados: a decisão fica escondida. */
  busy = $state(false);
  refusal: Reason | null = $state(null);
  /** Modo tempo: segundos restantes; o cronômetro para com o menu ou a pausa abertos. */
  secondsLeft: number | null = $state(null);
  menuOpen = $state(false);
  paused = $state(false);

  #toastQueue: string[] = [];
  #skip: (() => void) | null = null;
  #ack: (() => void) | null = null;
  #clock: ReturnType<typeof setInterval> | null = null;
  #timeUpSent = false;
  #persist: GameOptions['persist'];
  #forget: GameOptions['forget'];
  #saveWarned = false;
  #send: GameOptions['send'];
  #remoteQueue: Promise<void> = Promise.resolve();
  /** Vários aparelhos: lugar deste aparelho (null no modo um aparelho). */
  readonly me: number | null;
  /** Vários aparelhos: o cronômetro do servidor está correndo. */
  timerRunning = $state(true);
  /** Vários aparelhos: a decisão já era deste aparelho na atualização anterior. */
  #myTurnBefore = false;

  constructor(
    state: GameState,
    ctx: EngineContext,
    timings: Timings = NORMAL_TIMINGS,
    options: GameOptions = {},
  ) {
    this.ctx = ctx;
    this.timings = timings;
    this.state = state;
    this.view = viewFrom(state);
    this.#persist = options.persist;
    this.#forget = options.forget;
    this.#send = options.send;
    this.me = options.me ?? null;
    if (state.mode.type === 'time' && state.mode.limit) {
      this.secondsLeft = options.secondsLeft ?? state.mode.limit * 60;
    }
  }

  get over(): boolean {
    return this.state.phase === 'GAME_OVER';
  }

  /** Envia uma ação ao motor; recusa volta com o motivo e não muda nada. */
  get remote(): boolean {
    return this.#send !== undefined;
  }

  async act(action: Action): Promise<Reason | null> {
    if (this.busy) return { code: 'busy' };
    if (this.#send) {
      // vários aparelhos: quem decide é a sala; o resultado chega por receive()
      this.refusal = null;
      this.#send(action);
      return null;
    }
    const result = transition(this.state, action, this.ctx);
    if (!result.ok) {
      this.refusal = result.reason;
      return result.reason;
    }
    this.refusal = null;
    this.busy = true;
    try {
      this.state = result.state;
      await this.#play(result.events);
      this.view = viewFrom(this.state);
      await this.#afterTurn(result.events);
      await this.#showToasts();
    } finally {
      this.busy = false;
    }
    return null;
  }

  /** Vários aparelhos: estado e eventos que a sala mandou, animados em ordem de chegada. */
  receive(state: GameState, events: GameEvent[]): Promise<void> {
    this.#remoteQueue = this.#remoteQueue.then(async () => {
      this.busy = true;
      try {
        this.state = state;
        await this.#play(events);
        this.view = viewFrom(this.state);
        await this.#showToasts();
      } finally {
        this.busy = false;
      }
      this.#alertTurn();
    });
    return this.#remoteQueue;
  }

  /**
   * Vários aparelhos: quando a decisão passa a ser deste aparelho (a vez dele, uma proposta
   * para ele, uma dívida dele), avisa com som, vibração e o título da aba (Etapa 6).
   */
  #alertTurn(): void {
    if (this.me === null) return;
    const mine = !this.over && actorsOf(this.state).includes(this.me);
    if (mine && !this.#myTurnBefore) notifyTurn(t('W-62'));
    this.#myTurnBefore = mine;
  }

  /** Vários aparelhos: o servidor manda o tempo restante e se o cronômetro corre. */
  syncTimer(secondsLeft: number | null, running: boolean): void {
    if (secondsLeft !== null) this.secondsLeft = secondsLeft;
    this.timerRunning = running;
  }

  /** Pula a espera do aviso atual (OK, Enter, toque). */
  skipToast(): void {
    this.#skip?.();
  }

  /** Confirma a pausa no meio dos eventos (D-06). */
  acknowledge(): void {
    this.interstitial = null;
    this.#ack?.();
    this.#ack = null;
  }

  /** Mensagem avulsa no aviso central (ex.: "Devolva o aparelho para Ana"). */
  async notify(text: string): Promise<void> {
    this.#toastQueue.push(text);
    if (this.busy) return;
    this.busy = true;
    try {
      await this.#showToasts();
    } finally {
      this.busy = false;
    }
  }

  startClock(): void {
    if (this.secondsLeft === null || this.#clock) return;
    this.#clock = setInterval(() => this.#tick(), 1000);
  }

  stopClock(): void {
    if (this.#clock) clearInterval(this.#clock);
    this.#clock = null;
  }

  #tick(): void {
    if (this.#send) {
      // vários aparelhos: só conta na tela; quem marca o tempo esgotado é a sala
      if (this.timerRunning && this.secondsLeft !== null && this.secondsLeft > 0)
        this.secondsLeft--;
      return;
    }
    if (this.secondsLeft === null || this.over || this.paused || this.menuOpen) return;
    if (this.secondsLeft > 0) this.secondsLeft--;
    // RN-113: ao zerar, só marca; a partida acaba quando a rodada fechar
    if (this.secondsLeft === 0 && !this.#timeUpSent && !this.busy) {
      this.#timeUpSent = true;
      void this.act({ type: 'TIME_UP' });
    }
  }

  /**
   * Ponto de salvamento: fim do turno (evento TurnEnded), depois de todas as transferências.
   * Partida terminada é apagada, para não aparecer em "Continuar partida" (docs/03).
   */
  async #afterTurn(events: GameEvent[]): Promise<void> {
    if (events.some((e) => e.type === 'GameOver')) {
      await this.#forget?.();
      return;
    }
    if (!events.some((e) => e.type === 'TurnEnded') || !this.#persist) return;
    const saved = await this.#persist(this.state, this.secondsLeft);
    if (!saved && !this.#saveWarned) {
      // I-87: avisa uma vez por partida; o jogo continua normalmente
      this.#saveWarned = true;
      const text = t('I-87');
      this.history = [text, ...this.history].slice(0, HISTORY_SIZE);
      this.#toastQueue.push(text);
    }
  }

  async #play(events: GameEvent[]): Promise<void> {
    const bankruptcyBatch = events.some((e) => e.type === 'WentBankrupt');
    for (const event of events) {
      const said = narrate(event, this.view, this.state, this.ctx, bankruptcyBatch);
      if (said.history) this.history = [said.history, ...this.history].slice(0, HISTORY_SIZE);
      if (said.toast) this.#toastQueue.push(said.toast);
      const sound = soundFor(event, this.me);
      if (sound) playSound(sound);
      await this.#apply(event);
    }
  }

  async #apply(event: GameEvent): Promise<void> {
    const view = this.view;
    switch (event.type) {
      case 'DiceRolled':
        this.dice = {
          d1: event.d1,
          d2: event.d2,
          double: event.double,
          rentOnly: event.rentOnly === true,
        };
        await this.#wait(this.timings.dice);
        break;
      case 'PawnMoved': {
        const player = view.players[event.player];
        if (!player) break;
        const direction = event.steps < 0 ? -1 : 1;
        for (let k = 1; k <= Math.abs(event.steps); k++) {
          player.position =
            (((event.from + k * direction) % index.totalSpaces) + index.totalSpaces) %
            index.totalSpaces;
          await this.#wait(this.timings.step);
        }
        player.position = event.to;
        break;
      }
      case 'Jailed': {
        const player = view.players[event.player];
        if (player) {
          player.position = index.jailPosition;
          player.inJail = true;
        }
        await this.#wait(this.timings.jail);
        break;
      }
      case 'ReleasedFromJail': {
        const player = view.players[event.player];
        if (player) player.inJail = false;
        break;
      }
      case 'MandatoryBail':
        this.interstitial = { kind: 'mandatoryBail', player: event.player, amount: event.amount };
        // vários aparelhos: só o próprio jogador confirma; os outros só veem o aviso
        if (this.timings.toast > 0 && (this.me === null || this.me === event.player)) {
          await new Promise<void>((resolve) => (this.#ack = resolve));
        } else this.interstitial = null;
        break;
      case 'MoneyTransferred': {
        const from = view.players[event.from];
        const to = view.players[event.to];
        if (from) from.money -= event.amount;
        if (to) to.money += event.amount;
        break;
      }
      case 'PropertyOwnerChanged': {
        const property = view.properties[String(event.position)];
        if (property) property.owner = event.to;
        break;
      }
      case 'HousesChanged': {
        const property = view.properties[String(event.position)];
        if (property) property.houses = event.houses;
        break;
      }
      case 'MortgageChanged': {
        const property = view.properties[String(event.position)];
        if (property) property.mortgaged = event.mortgaged;
        break;
      }
      case 'WentBankrupt': {
        const player = view.players[event.player];
        if (player) {
          player.bankrupt = true;
          player.inJail = false;
          player.exitRound = this.state.players[event.player]?.exitRound ?? view.round;
        }
        break;
      }
      case 'TurnEnded':
        view.current = event.next;
        view.round = event.round;
        this.dice = null;
        break;
      default:
        break;
    }
  }

  async #showToasts(): Promise<void> {
    while (this.#toastQueue.length > 0) {
      const text = this.#toastQueue.shift() as string;
      if (this.timings.toast <= 0) continue;
      this.toast = text;
      await this.#wait(this.timings.toast, true);
      this.toast = null;
    }
  }

  /** Espera em ms; skippable = o jogador pode pular (aviso central). */
  #wait(ms: number, skippable = false): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms);
      function done() {
        clearTimeout(timer);
        resolve();
      }
      if (skippable) this.#skip = done;
    });
  }
}
