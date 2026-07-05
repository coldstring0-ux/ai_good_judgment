/**
 * Dev mode: in-memory global API key store.
 * Used in dev mode as a shared global variable for debugging.
 * Lost on server restart (intentional — dev mode).
 */

let devApiKey: string | null = null;

export function setDevApiKey(key: string | null) {
  devApiKey = key;
}

export function getDevApiKey(): string | null {
  return devApiKey;
}
