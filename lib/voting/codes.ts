// No 0/O, 1/I/L: codes are often read off paper.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomCode(length = 10): string {
  const out: string[] = [];
  const bytes = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      // Reject the top of the byte range so every character is equally likely.
      if (b < 248 && out.length < length) out.push(ALPHABET[b % ALPHABET.length]);
    }
  }
  return out.join('');
}

export function uniqueCodes(count: number, taken: Iterable<string> = []): string[] {
  const seen = new Set(taken);
  const codes: string[] = [];
  while (codes.length < count) {
    const code = randomCode();
    if (!seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}
