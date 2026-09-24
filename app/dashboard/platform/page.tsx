'use client';

import { BadgeCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { PageLoading } from '@/components/ui/spinner';
import { useAdmin } from '@/lib/admin-context';
import { formatDateTime } from '@/lib/format';
import { supabaseBrowser } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/voting/errors';
import type { Organization } from '@/lib/voting/types';

type Row = Organization & { creator: { email: string; full_name: string | null } | null };

async function fetchOrgs(filter: 'pending' | 'all'): Promise<Row[]> {
  const supabase = supabaseBrowser();
  let q = supabase.from('organizations').select('*').order('created_at', { ascending: false }).limit(200);
  if (filter === 'pending') q = q.eq('status', 'pending');
  const { data } = await q;
  const list = (data ?? []) as Organization[];
  const ids = [...new Set(list.map((o) => o.created_by).filter(Boolean))] as string[];
  const { data: people } = ids.length ? await supabase.from('users').select('id, email, full_name').in('id', ids) : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  return list.map((o) => ({ ...o, creator: (o.created_by && byId.get(o.created_by)) || null }));
}

export default function PlatformPage() {
  const { isPlatformAdmin, refreshOrg } = useAdmin();
  const [orgs, setOrgs] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    let active = true;
    fetchOrgs(filter).then((rows) => {
      if (active) setOrgs(rows);
    });
    return () => {
      active = false;
    };
  }, [isPlatformAdmin, filter, version]);

  async function decide(org: Row, status: 'approved' | 'rejected' | 'pending') {
    setBusy(org.id + status);
    setError(null);
    const { error: e } = await supabaseBrowser().rpc('set_org_status', { p_org: org.id, p_status: status });
    setBusy(null);
    if (e) return setError(friendlyError(e));
    setVersion((v) => v + 1);
    await refreshOrg();
  }

  if (!isPlatformAdmin) return <Notice tone="warn">Only the people who run this platform can see this page.</Notice>;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Approvals</h1>
          <p className="mt-1 max-w-2xl text-ink-2">
            Check each organization is real before it can open voting. An official email domain is a good sign; a Gmail address
            deserves a quick call.
          </p>
        </div>
        <div className="flex gap-1 rounded-md bg-sunk p-1" role="group" aria-label="Show">
          {(['pending', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded px-3 py-1.5 text-sm font-semibold ${filter === f ? 'bg-card text-ink shadow-sm' : 'text-ink-2'}`}
            >
              {f === 'pending' ? 'Waiting' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}
      {!orgs && <PageLoading />}
      {orgs?.length === 0 && <Notice tone="success">Nothing is waiting for approval.</Notice>}

      {orgs && orgs.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line bg-card">
          {orgs.map((o) => (
            <li key={o.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="font-bold">
                  {o.name} <span className="font-mono text-sm font-normal text-ink-3">/{o.slug}</span>
                </p>
                <p className="text-sm text-ink-2">
                  {o.creator ? `${o.creator.full_name ? `${o.creator.full_name}, ` : ''}${o.creator.email}` : 'Unknown creator'} · signed up {formatDateTime(o.created_at)}
                </p>
                {o.domain_verified && (
                  <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                    <BadgeCheck className="size-4" aria-hidden="true" /> Confirmed email at {o.email_domain}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {o.status !== 'approved' && (
                  <Button size="sm" onClick={() => decide(o, 'approved')} loading={busy === o.id + 'approved'}>
                    Approve
                  </Button>
                )}
                {o.status !== 'rejected' && (
                  <Button size="sm" variant="secondary" onClick={() => decide(o, 'rejected')} loading={busy === o.id + 'rejected'}>
                    Reject
                  </Button>
                )}
                {o.status !== 'pending' && (
                  <span className={`self-center text-sm font-semibold ${o.status === 'approved' ? 'text-accent' : 'text-danger'}`}>
                    {o.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
