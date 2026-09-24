// These mirror public.normalize_voter() in the database so lookups match what was stored.

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  let d = value.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('0')) return `233${d.slice(1)}`;
  if (d.length === 9) return `233${d}`;
  return d;
}

export function normalizeMemberId(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeCode(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isPhone(value: string): boolean {
  const d = normalizePhone(value);
  return d.length >= 11 && d.length <= 15;
}

export function formatPhone(stored: string): string {
  if (stored.startsWith('233') && stored.length === 12) {
    const local = `0${stored.slice(3)}`;
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return `+${stored}`;
}

export function formatCode(code: string): string {
  return code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const shown = user.length <= 2 ? user[0] : user.slice(0, 2);
  return `${shown}${'•'.repeat(Math.max(2, user.length - shown.length))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const pretty = formatPhone(phone);
  return pretty.replace(/\d(?=(?:\D*\d){3})/g, '•');
}
