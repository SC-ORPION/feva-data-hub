'use client';

import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabaseBrowser } from './supabase/client';
import type { Organization } from './voting/types';

interface AdminState {
  loading: boolean;
  session: Session | null;
  org: Organization | null;
  isPlatformAdmin: boolean;
  refreshOrg: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminContext = createContext<AdminState | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [isPlatformAdmin, setPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFor = useCallback(async (s: Session | null) => {
    if (!s) {
      setOrg(null);
      setPlatformAdmin(false);
      return;
    }
    const supabase = supabaseBrowser();
    const uid = s.user.id;
    const [{ data: membership }, { data: admin }] = await Promise.all([
      supabase.from('org_members').select('organizations(*)').eq('user_id', uid).limit(1).maybeSingle(),
      supabase.from('platform_admins').select('user_id').eq('user_id', uid).maybeSingle(),
    ]);
    let found = (membership?.organizations as unknown as Organization | null) ?? null;

    // Accounts that confirmed their email get their organization created on first visit.
    const pendingName = s.user.user_metadata?.org_name as string | undefined;
    if (!found && pendingName) {
      const { data } = await supabase.rpc('create_organization', { p_name: pendingName });
      found = (data as Organization | null) ?? null;
    }
    setOrg(found);
    setPlatformAdmin(Boolean(admin));
  }, []);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadFor(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_OUT') {
        setOrg(null);
        setPlatformAdmin(false);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadFor]);

  const refreshOrg = useCallback(async () => {
    const { data } = await supabaseBrowser().auth.getSession();
    await loadFor(data.session);
  }, [loadFor]);

  const signOut = useCallback(async () => {
    await supabaseBrowser().auth.signOut();
  }, []);

  return (
    <AdminContext.Provider value={{ loading, session, org, isPlatformAdmin, refreshOrg, signOut }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminState {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}

// Calls one of our own admin API routes as the signed-in user.
export async function adminFetch<T>(url: string, body: unknown): Promise<T> {
  const { data } = await supabaseBrowser().auth.getSession();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json as T;
}
