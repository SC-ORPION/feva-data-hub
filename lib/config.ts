export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'FEVA Vote';

// When set (e.g. "fevavote.com"), each organization votes at <slug>.fevavote.com.
// Without it, voting pages live at /v/<slug>.
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';

export function orgVotingHome(orgSlug: string, origin: string): string {
  if (ROOT_DOMAIN) {
    const protocol = ROOT_DOMAIN.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${orgSlug}.${ROOT_DOMAIN}`;
  }
  return `${origin}/v/${orgSlug}`;
}

export function electionVotingUrl(orgSlug: string, electionSlug: string, origin: string): string {
  return `${orgVotingHome(orgSlug, origin)}/${electionSlug}`;
}
