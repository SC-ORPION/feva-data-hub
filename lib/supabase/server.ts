import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

let admin: SupabaseClient | null = null;

// Service-role client. Bypasses row level security, so only use it on the server.
export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

// A client that acts as the signed-in admin who made the request, so row level security applies.
export async function supabaseForRequest(
  req: Request,
): Promise<{ user: User; db: SupabaseClient } | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  const db = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { user: data.user, db };
}
