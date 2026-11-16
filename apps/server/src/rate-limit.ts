// Limite de tentativas por endereço, para dificultar adivinhar códigos de sala (docs/07).
// Melhor esforço: conta só dentro desta instância do Worker. Com cerca de 1 bilhão de
// códigos possíveis e salas que expiram, adivinhar um código ativo continua inviável.

const WINDOW_MS = 60_000;
const counters = new Map<string, { count: number; start: number }>();

export function allow(key: string, limit: number, now = Date.now()): boolean {
  const entry = counters.get(key);
  if (!entry || now - entry.start >= WINDOW_MS) {
    counters.set(key, { count: 1, start: now });
    if (counters.size > 10_000) {
      for (const [k, v] of counters) if (now - v.start >= WINDOW_MS) counters.delete(k);
    }
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}
