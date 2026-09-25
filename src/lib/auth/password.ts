import "server-only";
import { randomBytes, scrypt as scryptCb, scryptSync, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt, stored as "scrypt$N$r$p$saltB64$hashB64" so parameters can be
// raised later without breaking existing hashes.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );

function encode(salt: Buffer, key: Buffer) {
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return encode(salt, await scrypt(password, salt, KEYLEN, { N, r: R, p: P }));
}

/** Synchronous variant, only for seeding demo data at startup. */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  return encode(salt, scryptSync(password, salt, KEYLEN, { N, r: R, p: P }));
}

// Checked when an email has no account, so a miss costs the same time as a
// wrong password and response timing doesn't reveal which emails exist.
const DUMMY = hashPasswordSync(randomBytes(16).toString("hex"));

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const parts = (stored ?? DUMMY).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return stored !== null && timingSafeEqual(actual, expected);
}
