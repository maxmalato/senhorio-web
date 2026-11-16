// Chamadas HTTP à sala: criar e consultar antes de entrar.
import type { ModeConfig } from '@senhorio/protocol';

export interface RoomInfo {
  status: 'lobby' | 'playing' | 'over';
  seats: number;
  maxSeats: number;
  takenColors: string[];
  mode: ModeConfig;
}

export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function call<T>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(input, init);
    const body = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) return { ok: false, error: body.error ?? 'unavailable' };
    return { ok: true, value: body };
  } catch {
    return { ok: false, error: navigator.onLine === false ? 'offline' : 'unavailable' };
  }
}

export function createRoom(mode: ModeConfig): Promise<ApiResult<{ code: string }>> {
  return call('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
}

export function roomInfo(code: string): Promise<ApiResult<RoomInfo>> {
  return call(`/api/rooms/${encodeURIComponent(code)}`);
}
