import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_BYTES = 16;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const LEGACY_SHA256_RE = /^[0-9a-f]{64}$/i;
const HASH_SEPARATOR = '$';

export interface PasswordVerifyResult {
  valid: boolean;
  needsRehash: boolean;
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
      },
      (error: Error | null, derivedKey: Buffer) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) {
    return false;
  }
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function sha256Hex(password: string): string {
  return createHash('sha256').update(password, 'utf8').digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derivedKey = await deriveKey(password, salt);
  return [
    SCRYPT_PREFIX,
    salt.toString('hex'),
    derivedKey.toString('hex'),
  ].join(HASH_SEPARATOR);
}

async function verifyScryptHash(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split(HASH_SEPARATOR);
  if (parts.length !== 3) return false;

  const [, saltHex, expectedHex] = parts;
  if (!saltHex || !expectedHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  if (salt.length === 0) return false;

  const derivedKey = await deriveKey(password, salt);
  return safeEqualHex(derivedKey.toString('hex'), expectedHex);
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<PasswordVerifyResult> {
  if (storedHash.startsWith(`${SCRYPT_PREFIX}${HASH_SEPARATOR}`)) {
    const valid = await verifyScryptHash(password, storedHash);
    return { valid, needsRehash: false };
  }

  if (LEGACY_SHA256_RE.test(storedHash)) {
    const valid = safeEqualHex(sha256Hex(password), storedHash);
    return { valid, needsRehash: valid };
  }

  return { valid: false, needsRehash: false };
}
