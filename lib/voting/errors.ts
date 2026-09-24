// Turns database error codes into sentences people can act on.
const MESSAGES: Record<string, string> = {
  not_allowed: "You don't have access to this.",
  not_signed_in: 'Please sign in again.',
  org_not_approved:
    'Your organization is still waiting for approval. You can open voting as soon as it is approved.',
  no_positions: 'Add at least one position before you open voting.',
  empty_position: 'Every position needs at least one candidate.',
  no_voters: 'Add your voters before you open voting.',
  end_in_past: 'The closing time has already passed. Pick a later closing time.',
  already_started: 'Voting has already started.',
  not_open: 'Voting is not open.',
  ballot_locked: "The ballot can't change once voting has started.",
  voter_method_locked: "How people vote can't change once voting has started.",
  election_open: 'Close voting before you delete this election.',
  voter_already_voted: 'This person already voted, so they stay on the list.',
  voter_data_deleted: 'Voter details for this election were deleted, so no one can be added.',
  not_closed: 'You can delete voter details once voting has closed.',
  too_many_rows: 'Add up to 5,000 voters at a time.',
  already_voted: 'You have already voted.',
  voting_not_open: 'Voting is not open right now.',
  bad_ballot: 'Something on your ballot did not match this election. Reload the page and try again.',
  too_many_choices: 'You picked more people than this position allows.',
  not_on_list: 'You are not on the voter list for this election.',
  organizations_slug_key: 'That web address is already taken. Try another one.',
  elections_org_id_slug_key: 'Another election already uses that web address.',
};

export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const text =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
  for (const key of Object.keys(MESSAGES)) {
    if (text.includes(key)) return MESSAGES[key];
  }
  if (text.includes('Failed to fetch') || text.includes('NetworkError')) {
    return 'We could not reach the server. Check your internet connection and try again.';
  }
  return fallback;
}

export function errorCode(error: unknown): string | null {
  const text = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  return Object.keys(MESSAGES).find((key) => text.includes(key)) ?? null;
}
