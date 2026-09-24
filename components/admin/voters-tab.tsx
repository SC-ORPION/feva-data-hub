'use client';

import { Download, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button, buttonClass } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Spinner } from '@/components/ui/spinner';
import { downloadCsv, formatDate, formatDateTime, plural } from '@/lib/format';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { ImportResult } from '@/lib/voter-import';
import { uniqueCodes } from '@/lib/voting/codes';
import { friendlyError } from '@/lib/voting/errors';
import { formatCode, formatPhone } from '@/lib/voting/normalize';
import type { Election, ElectionPhase, Voter, VoterRow } from '@/lib/voting/types';
import { VoterImport } from './voter-import';

const PAGE = 50;
const COLUMNS = 'id, name, email, phone, member_id, access_code, has_voted, voted_at, created_at';

function contact(v: Voter, method: Election['voter_method']): string {
  if (method === 'email') return v.email ?? '';
  if (method === 'phone') return v.phone ? formatPhone(v.phone) : '';
  if (method === 'member_id') return [v.member_id, v.email ?? (v.phone ? formatPhone(v.phone) : '')].filter(Boolean).join(' · ');
  return v.access_code ? formatCode(v.access_code) : '';
}

const CONTACT_LABEL = { email: 'Email', phone: 'Phone', member_id: 'ID and contact', code: 'Voting code' };

interface Props {
  election: Election;
  phase: ElectionPhase;
  counts: { total: number; voted: number };
  onChanged: () => void;
}

export function VotersTab({ election, phase, counts, onChanged }: Props) {
  const supabase = supabaseBrowser();
  const [rows, setRows] = useState<Voter[] | null>(null);
  const [matching, setMatching] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'voted' | 'waiting'>('all');
  const [adding, setAdding] = useState(false);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [moreCodes, setMoreCodes] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [removing, setRemoving] = useState<Voter | null>(null);

  const method = election.voter_method;
  const wiped = Boolean(election.voter_data_deleted_at);

  const load = useCallback(async () => {
    let q = supabase.from('voters').select(COLUMNS, { count: 'exact' }).eq('election_id', election.id);
    if (filter === 'voted') q = q.eq('has_voted', true);
    if (filter === 'waiting') q = q.eq('has_voted', false);
    const term = query.trim().replace(/[,()%*\\]/g, '');
    if (term) {
      const like = `%${term}%`;
      // Phones are stored as 233XXXXXXXXX, so "0244" should find "233244…".
      const digits = term.replace(/[\s-]/g, '');
      const phoneLike = /^0\d+$/.test(digits) ? `%233${digits.slice(1)}%` : `%${digits}%`;
      q = q.or(
        `name.ilike.${like},email.ilike.${like},phone.ilike.${phoneLike},member_id.ilike.${like},access_code.ilike.%${digits.toUpperCase()}%`,
      );
    }
    const { data, count } = await q
      .order(filter === 'voted' ? 'voted_at' : 'created_at', { ascending: filter !== 'voted' })
      .order('id')
      .range(page * PAGE, page * PAGE + PAGE - 1);
    setRows((data ?? []) as Voter[]);
    setMatching(count ?? 0);
  }, [supabase, election.id, filter, query, page]);

  useEffect(() => {
    const t = setTimeout(load, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query, counts.voted]);

  async function allVoters(): Promise<Voter[]> {
    const all: Voter[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from('voters')
        .select(COLUMNS)
        .eq('election_id', election.id)
        .order('created_at')
        .order('id')
        .range(from, from + 999);
      all.push(...((data ?? []) as Voter[]));
      if (!data || data.length < 1000) return all;
    }
  }

  async function download() {
    setBusy('download');
    const all = await allVoters();
    downloadCsv(`${election.slug}-voters.csv`, [
      ['Name', 'Email', 'Phone', 'ID number', 'Voting code', 'Voted', 'Voted at'],
      ...all.map((v) => [
        v.name,
        v.email,
        v.phone ? formatPhone(v.phone) : '',
        v.member_id,
        v.access_code ? formatCode(v.access_code) : '',
        v.has_voted ? 'Yes' : 'No',
        v.voted_at ? new Date(v.voted_at).toLocaleString('en-GB') : '',
      ]),
    ]);
    setBusy(null);
  }

  async function add() {
    let newRows: VoterRow[] = [];
    if (method === 'code') {
      const existing = (await allVoters()).map((v) => v.access_code ?? '');
      if (imported?.voters.length) {
        const codes = uniqueCodes(imported.voters.length, existing);
        newRows = imported.voters.map((v, i) => ({ ...v, access_code: codes[i] }));
      } else {
        newRows = uniqueCodes(Math.max(1, Math.min(5000, moreCodes)), existing).map((access_code) => ({ access_code }));
      }
    } else {
      newRows = imported?.voters ?? [];
    }
    if (!newRows.length) return;
    setBusy('add');
    setMessage(null);
    let added = 0;
    let skipped = 0;
    for (let i = 0; i < newRows.length; i += 1000) {
      const { data, error } = await supabase.rpc('add_voters', { p_election: election.id, p_rows: newRows.slice(i, i + 1000) });
      if (error) {
        setBusy(null);
        return setMessage({ tone: 'danger', text: friendlyError(error) });
      }
      added += data.added;
      skipped += data.skipped;
    }
    setBusy(null);
    setAdding(false);
    setImported(null);
    setMessage({
      tone: 'success',
      text: `Added ${plural(added, 'voter')}.${skipped ? ` ${plural(skipped, 'person was', 'people were')} already on the list.` : ''}`,
    });
    onChanged();
  }

  async function remove(v: Voter) {
    setBusy('remove');
    const { error } = await supabase.from('voters').delete().eq('id', v.id);
    setBusy(null);
    setRemoving(null);
    if (error) return setMessage({ tone: 'danger', text: friendlyError(error) });
    setMessage({ tone: 'success', text: `Removed ${v.name || contact(v, method)} from the list.` });
    onChanged();
  }

  async function wipe() {
    setBusy('wipe');
    const { error } = await supabase.rpc('wipe_voter_data', { p_election: election.id });
    setBusy(null);
    setConfirmWipe(false);
    if (error) return setMessage({ tone: 'danger', text: friendlyError(error) });
    onChanged();
  }

  const pages = Math.max(1, Math.ceil(matching / PAGE));

  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-3 gap-3">
        {[
          ['On the list', counts.total],
          ['Voted', counts.voted],
          ['Not yet', counts.total - counts.voted],
        ].map(([label, n]) => (
          <div key={label} className="rounded-lg border border-line bg-card px-4 py-3">
            <dt className="text-sm text-ink-2">{label}</dt>
            <dd className="font-mono text-2xl font-bold tabular">{(n as number).toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      {wiped && (
        <Notice tone="info" title={`Voter details were deleted on ${formatDate(election.voter_data_deleted_at)}`}>
          Turnout numbers and results are kept. Names, emails, phone numbers, IDs and codes are gone.
        </Notice>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {!wiped && (
        <div className="flex flex-wrap gap-2">
          {phase !== 'closed' && (
            <Button variant={adding ? 'secondary' : 'primary'} onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
              {adding ? <X className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
              {adding ? 'Cancel' : method === 'code' ? 'Make more codes' : 'Add voters'}
            </Button>
          )}
          <Button variant="secondary" onClick={download} loading={busy === 'download'} disabled={!counts.total}>
            <Download className="size-4" aria-hidden="true" /> Download list
          </Button>
          {method === 'code' && counts.total > 0 && (
            <Link href={`/dashboard/elections/${election.id}/slips`} className={buttonClass('secondary')}>
              <Printer className="size-4" aria-hidden="true" /> Print code slips
            </Link>
          )}
        </div>
      )}

      {adding && (
        <div className="grid gap-4 rounded-lg border border-line bg-card p-5">
          {method === 'code' && (
            <label className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">Make</span>
              <Input
                type="number"
                min={1}
                max={5000}
                value={moreCodes}
                onChange={(e) => setMoreCodes(Number(e.target.value))}
                className="!w-28 tabular"
                disabled={Boolean(imported?.voters.length)}
              />
              <span className="text-sm font-semibold">new codes, or paste names below to make one each.</span>
            </label>
          )}
          <VoterImport method={method} onChange={setImported} />
          <div>
            <Button onClick={add} loading={busy === 'add'} disabled={method !== 'code' && !imported?.voters.length}>
              {method === 'code' && !imported?.voters.length
                ? `Make ${plural(Math.max(1, moreCodes), 'code')}`
                : `Add ${plural(imported?.voters.length ?? 0, 'voter')}`}
            </Button>
          </div>
        </div>
      )}

      {!wiped && counts.total > 0 && (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute top-3 left-3 size-5 text-ink-3" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search by name, email, number, ID or code"
                aria-label="Search voters"
                className="pl-10"
              />
            </div>
            <Select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as typeof filter);
                setPage(0);
              }}
              aria-label="Show"
              className="!w-auto"
            >
              <option value="all">Everyone</option>
              <option value="voted">Voted</option>
              <option value="waiting">Not voted yet</option>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-card">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-line bg-sunk text-left text-ink-2">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">{CONTACT_LABEL[method]}</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="w-12 px-2 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {!rows && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-ink-2">
                      <Spinner className="mr-2 inline size-4" /> Loading…
                    </td>
                  </tr>
                )}
                {rows?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-ink-2">
                      Nobody matches that.
                    </td>
                  </tr>
                )}
                {rows?.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2.5">{v.name || <span className="text-ink-3">No name</span>}</td>
                    <td className={`px-4 py-2.5 ${method === 'code' ? 'font-mono' : ''}`}>{contact(v, method)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {v.has_voted ? (
                        <span className="font-semibold text-accent">Voted {formatDateTime(v.voted_at)}</span>
                      ) : (
                        <span className="text-ink-2">Not yet</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {!v.has_voted && phase !== 'closed' && (
                        <Button variant="ghost" size="sm" onClick={() => setRemoving(v)} aria-label={`Remove ${v.name || contact(v, method)}`}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 text-sm text-ink-2">
              <span>
                Page {page + 1} of {pages} · {plural(matching, 'person', 'people')}
              </span>
              <span className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pages - 1}>
                  Next
                </Button>
              </span>
            </div>
          )}
        </div>
      )}

      {!wiped && phase === 'closed' && counts.total > 0 && (
        <div className="grid gap-3 rounded-lg border border-danger/40 p-5">
          <div>
            <h3 className="font-bold">Delete voter details</h3>
            <p className="mt-1 text-sm text-ink-2">
              Removes every name, email, phone number, ID and code from our servers. Turnout and results stay. Download the list
              first if you need a copy for your records. This can’t be undone.
            </p>
          </div>
          <Button variant="danger" onClick={() => setConfirmWipe(true)} className="justify-self-start">
            <Trash2 className="size-4" aria-hidden="true" /> Delete voter details
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmWipe}
        title="Delete all voter details?"
        confirmLabel="Yes, delete them"
        tone="danger"
        busy={busy === 'wipe'}
        onConfirm={wipe}
        onCancel={() => setConfirmWipe(false)}
      >
        {plural(counts.total, 'person’s', 'people’s')} details will be removed for good. You’ll still see how many voted and the
        results.
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this voter?"
        confirmLabel="Remove"
        tone="danger"
        busy={busy === 'remove'}
        onConfirm={() => removing && remove(removing)}
        onCancel={() => setRemoving(null)}
      >
        {removing?.name || (removing && contact(removing, method))} won’t be able to vote.
      </ConfirmDialog>
    </div>
  );
}
