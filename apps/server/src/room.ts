import { DurableObject } from 'cloudflare:workers';
import type { Env } from './env';

/**
 * Uma sala do modo de vários dispositivos: guarda o estado da partida e roda o motor.
 * Por enquanto vazia; a lógica das salas chega na Etapa 4 (docs/09-roadmap.md).
 */
export class Room extends DurableObject<Env> {}
