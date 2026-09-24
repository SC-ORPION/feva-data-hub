import Papa from 'papaparse';
import { isEmail, isPhone, normalizeEmail, normalizeMemberId, normalizePhone } from './voting/normalize';
import type { VoterMethod, VoterRow } from './voting/types';

export type ColumnRole = 'email' | 'phone' | 'member_id' | 'name' | 'ignore';

export const ROLE_LABEL: Record<ColumnRole, string> = {
  email: 'Email',
  phone: 'Phone number',
  member_id: 'ID number',
  name: 'Name',
  ignore: "Don't use",
};

export interface Table {
  headers: string[] | null;
  rows: string[][];
}

function clean(cells: unknown[]): string[] {
  return cells.map((c) => (c == null ? '' : String(c).trim()));
}

export function parseText(text: string): Table {
  const trimmed = text.trim();
  if (!trimmed) return { headers: null, rows: [] };
  const parsed = Papa.parse<string[]>(trimmed, { skipEmptyLines: 'greedy' });
  return withHeaders(parsed.data.map(clean));
}

export async function parseFile(file: File): Promise<Table> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser');
    const data = await readSheet(file);
    return withHeaders(data.map((r) => clean(r as unknown[])).filter((r) => r.some(Boolean)));
  }
  if (name.endsWith('.xls') || name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')) {
    throw new Error('Save the file as .xlsx or .csv first, or copy the column and paste it below.');
  }
  return parseText(await file.text());
}

const HEADER_HINTS: [ColumnRole, RegExp][] = [
  ['email', /e-?mail/i],
  ['phone', /phone|mobile|tel\b|telephone|whats\s?app|momo|contact/i],
  ['member_id', /\bid\b|index|student|staff|member|matric|reg(istration)?\b|admission|\bno\.?$|number$/i],
  ['name', /name|surname|first|last|other/i],
];

function looksLikeHeader(row: string[]): boolean {
  return (
    row.some((cell) => HEADER_HINTS.some(([, re]) => re.test(cell))) &&
    !row.some((cell) => isEmail(cell) || (isPhone(cell) && /\d{6,}/.test(cell.replace(/\D/g, ''))))
  );
}

function withHeaders(rows: string[][]): Table {
  if (rows.length && looksLikeHeader(rows[0])) return { headers: rows[0], rows: rows.slice(1) };
  return { headers: null, rows };
}

export function guessRoles(table: Table, method: VoterMethod): ColumnRole[] {
  const width = Math.max(0, ...table.rows.slice(0, 50).map((r) => r.length), table.headers?.length ?? 0);
  const sample = table.rows.slice(0, 50);
  const roles: ColumnRole[] = [];
  for (let i = 0; i < width; i++) {
    const header = table.headers?.[i] ?? '';
    const byHeader = header ? HEADER_HINTS.find(([, re]) => re.test(header))?.[0] : undefined;
    if (byHeader) {
      roles.push(byHeader);
      continue;
    }
    const values = sample.map((r) => r[i] ?? '').filter(Boolean);
    const share = (test: (v: string) => boolean) => (values.length ? values.filter(test).length / values.length : 0);
    if (share(isEmail) > 0.6) roles.push('email');
    else if (share((v) => isPhone(v) && /^[\d\s+()-]+$/.test(v)) > 0.6) roles.push('phone');
    else if (method === 'member_id' && !roles.includes('member_id') && share((v) => /\d/.test(v) && !/\s/.test(v)) > 0.6) {
      roles.push('member_id');
    } else if (values.length) roles.push('name');
    else roles.push('ignore');
  }
  // Only one column per role, except names (first + last name columns get joined).
  const seen = new Set<ColumnRole>();
  return roles.map((r) => {
    if (r === 'name' || r === 'ignore') return r;
    if (seen.has(r)) return 'ignore';
    seen.add(r);
    return r;
  });
}

export interface ImportResult {
  voters: VoterRow[];
  skipped: { row: number; reason: string }[];
  duplicates: number;
}

export function requiredRoles(method: VoterMethod): ColumnRole[] {
  if (method === 'email') return ['email'];
  if (method === 'phone') return ['phone'];
  if (method === 'member_id') return ['member_id'];
  return ['name'];
}

export function buildVoters(table: Table, roles: ColumnRole[], method: VoterMethod): ImportResult {
  const voters: VoterRow[] = [];
  const skipped: ImportResult['skipped'] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  const first = table.headers ? 2 : 1;

  table.rows.forEach((row, index) => {
    const pick = (role: ColumnRole) =>
      roles
        .map((r, i) => (r === role ? (row[i] ?? '').trim() : ''))
        .filter(Boolean)
        .join(' ');
    const name = pick('name');
    const emailRaw = pick('email');
    const phoneRaw = pick('phone');
    const idRaw = pick('member_id');
    const email = emailRaw && isEmail(emailRaw) ? normalizeEmail(emailRaw) : '';
    const phone = phoneRaw && isPhone(phoneRaw) ? normalizePhone(phoneRaw) : '';
    const memberId = idRaw ? normalizeMemberId(idRaw) : '';
    const line = index + first;

    let key = '';
    if (method === 'email') {
      if (!email) return skipped.push({ row: line, reason: emailRaw ? `“${emailRaw}” is not a full email address` : 'no email' });
      key = email;
    } else if (method === 'phone') {
      if (!phone) return skipped.push({ row: line, reason: phoneRaw ? `“${phoneRaw}” is not a phone number` : 'no phone number' });
      key = phone;
    } else if (method === 'member_id') {
      if (!memberId) return skipped.push({ row: line, reason: 'no ID number' });
      if (!email && !phone) return skipped.push({ row: line, reason: 'no email or phone to send the code to' });
      key = memberId;
    } else {
      if (!name) return skipped.push({ row: line, reason: 'no name' });
      key = `${name.toLowerCase()}#${line}`;
    }

    if (seen.has(key)) {
      duplicates++;
      return;
    }
    seen.add(key);
    voters.push({
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(memberId ? { member_id: memberId } : {}),
    });
  });

  return { voters, skipped, duplicates };
}
