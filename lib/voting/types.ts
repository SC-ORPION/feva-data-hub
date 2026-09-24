export type VoterMethod = 'email' | 'phone' | 'member_id' | 'code';
export type ElectionStatus = 'draft' | 'open' | 'closed';
export type ElectionPhase = 'draft' | 'scheduled' | 'open' | 'closed';
export type ResultsVisibility = 'live' | 'after_close';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email_domain: string | null;
  domain_verified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  created_by: string | null;
}

export interface Election {
  id: string;
  org_id: string;
  title: string;
  slug: string;
  description: string | null;
  voter_method: VoterMethod;
  status: ElectionStatus;
  starts_at: string | null;
  ends_at: string | null;
  opened_at: string | null;
  closed_at: string | null;
  results_visibility: ResultsVisibility;
  email_results: boolean;
  results_emailed_at: string | null;
  voter_data_deleted_at: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  position_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  sort_order: number;
}

export interface Position {
  id: string;
  election_id: string;
  title: string;
  seats: number;
  sort_order: number;
  candidates: Candidate[];
}

export interface Voter {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  member_id: string | null;
  access_code: string | null;
  has_voted: boolean;
  voted_at: string | null;
  created_at: string;
}

export interface VoterRow {
  name?: string;
  email?: string;
  phone?: string;
  member_id?: string;
  access_code?: string;
}

export interface ResultCandidate {
  id: string;
  name: string;
  photo_url: string | null;
  votes: number;
  no_votes: number;
}

export interface ResultPosition {
  id: string;
  title: string;
  seats: number;
  ballots_with_choice: number;
  candidates: ResultCandidate[];
}

export interface Results {
  eligible: number;
  voted: number;
  ballots: number;
  positions: ResultPosition[];
}

export interface BallotChoice {
  position_id: string;
  candidate_ids: string[];
  approve?: boolean;
}

export interface ElectionEvent {
  id: string;
  election_id: string;
  kind: string;
  detail: string | null;
  created_at: string;
}

export interface ReceiptChoice {
  position: string;
  candidate: string;
  approve: boolean;
}
