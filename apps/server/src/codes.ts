// Código da sala: 6 símbolos de um alfabeto de 32 (sem 0/O e 1/I), cerca de 1 bilhão de
// combinações, sorteados com qualidade criptográfica e sem viés (32 divide 256).
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@senhorio/protocol';

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return [...bytes].map((b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
}
