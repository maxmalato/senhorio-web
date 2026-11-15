import type { Room } from './room';

/** Recursos que a Cloudflare entrega ao Worker (definidos no wrangler.jsonc). */
export interface Env {
  ROOMS: DurableObjectNamespace<Room>;
}
