import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const HASH_PREFIX = "scrypt:v1";
const KEY_LENGTH = 32;

export function isValidDeletePin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin.trim());
}

export function hashDeletePin(pin: string): string {
  const normalized = pin.trim();

  if (!isValidDeletePin(normalized)) {
    throw new Error("PIN invalido.");
  }

  const salt = randomBytes(16).toString("base64url");
  const derived = scryptSync(normalized, salt, KEY_LENGTH).toString("base64url");

  return `${HASH_PREFIX}:${salt}:${derived}`;
}

export function verifyDeletePin(pin: string, storedHash?: string): boolean {
  const normalized = pin.trim();
  const hash = storedHash?.trim();

  if (!isValidDeletePin(normalized) || !hash) {
    return false;
  }

  const [algorithm, version, salt, expected] = hash.split(":");

  if (`${algorithm}:${version}` !== HASH_PREFIX || !salt || !expected) {
    return false;
  }

  const actualBuffer = scryptSync(normalized, salt, KEY_LENGTH);
  const expectedBuffer = Buffer.from(expected, "base64url");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
