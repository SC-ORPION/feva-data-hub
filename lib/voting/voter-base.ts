import { headers } from 'next/headers';
import { ROOT_DOMAIN } from '@/lib/config';

// Links on voting pages must work both at /v/<org>/… and on <org>.<root domain>.
export async function voterBase(orgSlug: string): Promise<string> {
  if (!ROOT_DOMAIN) return `/v/${orgSlug}`;
  const host = ((await headers()).get('host') ?? '').toLowerCase();
  return host === `${orgSlug}.${ROOT_DOMAIN}` ? '' : `/v/${orgSlug}`;
}
