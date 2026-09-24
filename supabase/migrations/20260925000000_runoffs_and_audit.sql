-- Majority (50% + 1) rule with run-offs, confirm-only receipts with public fingerprints,
-- and reminder tracking.

alter table public.elections
  add column majority_rule boolean not null default false,
  add column runoff_of uuid references public.elections (id) on delete set null,
  add column reminded_at timestamptz;

grant update (majority_rule) on public.elections to authenticated;

-- A public, short fingerprint of a ballot's receipt. It proves a ballot was counted without
-- revealing its choices, so a voter can't use it to show anyone how they voted.
create or replace function public.ballot_fingerprint(p_receipt_hash text)
returns text language sql immutable as $$
  select upper(substr(encode(extensions.digest(p_receipt_hash, 'sha256'), 'hex'), 1, 10));
$$;

-- Receipts now only confirm that a ballot is in the count.
create or replace function public.ballot_by_receipt(p_election uuid, p_receipt_hash text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('fingerprint', public.ballot_fingerprint(b.receipt_hash))
  from public.ballots b
  where b.election_id = p_election and b.receipt_hash = p_receipt_hash;
$$;

create or replace function public.ballot_fingerprints(p_election uuid)
returns setof text language sql stable security definer set search_path = public as $$
  select public.ballot_fingerprint(receipt_hash) from public.ballots
  where election_id = p_election
  order by 1;
$$;

create or replace function public.create_election(p_org uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_base text;
  v_slug text;
  v_n int := 1;
  v_pos jsonb;
  v_pos_id uuid;
  v_cand jsonb;
  v_pi int := 0;
  v_ci int;
begin
  if not public.is_org_admin(p_org) then raise exception 'not_allowed'; end if;

  v_base := public.slugify(p ->> 'title', 50);
  if v_base = '' then v_base := 'vote'; end if;
  v_slug := v_base;
  while exists (select 1 from public.elections where org_id = p_org and slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.elections (
    org_id, title, slug, description, voter_method, starts_at, ends_at,
    results_visibility, email_results, majority_rule, created_by
  ) values (
    p_org, trim(p ->> 'title'), v_slug, nullif(trim(p ->> 'description'), ''),
    p ->> 'voter_method',
    nullif(p ->> 'starts_at', '')::timestamptz,
    nullif(p ->> 'ends_at', '')::timestamptz,
    coalesce(p ->> 'results_visibility', 'after_close'),
    coalesce((p ->> 'email_results')::boolean, false),
    coalesce((p ->> 'majority_rule')::boolean, false),
    auth.uid()
  ) returning id into v_id;

  for v_pos in select value from jsonb_array_elements(coalesce(p -> 'positions', '[]'::jsonb)) loop
    insert into public.positions (election_id, title, seats, sort_order)
    values (v_id, trim(v_pos ->> 'title'), coalesce((v_pos ->> 'seats')::int, 1), v_pi)
    returning id into v_pos_id;
    v_pi := v_pi + 1;
    v_ci := 0;
    for v_cand in select value from jsonb_array_elements(coalesce(v_pos -> 'candidates', '[]'::jsonb)) loop
      insert into public.candidates (position_id, election_id, name, bio, photo_url, sort_order)
      values (
        v_pos_id, v_id, trim(v_cand ->> 'name'),
        nullif(trim(v_cand ->> 'bio'), ''), nullif(v_cand ->> 'photo_url', ''), v_ci
      );
      v_ci := v_ci + 1;
    end loop;
  end loop;

  perform public.log_event(v_id, 'created', null);
  return v_id;
end;
$$;

-- Creates a draft run-off from a closed election: the chosen positions with the chosen
-- candidates (usually the top two), and the same voter list. Codes carry over, so printed
-- slips keep working.
create or replace function public.create_runoff(p_election uuid, p_positions jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_e public.elections;
  v_id uuid;
  v_base text;
  v_slug text;
  v_n int := 1;
  v_item jsonb;
  v_pos public.positions;
  v_new_pos uuid;
  v_ids uuid[];
  v_pi int := 0;
begin
  if not public.is_election_admin(p_election) then raise exception 'not_allowed'; end if;
  select * into v_e from public.elections where id = p_election;
  if public.election_phase(v_e) <> 'closed' then raise exception 'not_closed'; end if;
  if v_e.voter_data_deleted_at is not null then raise exception 'voter_data_deleted'; end if;
  if jsonb_array_length(coalesce(p_positions, '[]'::jsonb)) = 0 then raise exception 'no_positions'; end if;

  v_base := public.slugify(v_e.title || ' run-off', 50);
  v_slug := v_base;
  while exists (select 1 from public.elections where org_id = v_e.org_id and slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.elections (
    org_id, title, slug, description, voter_method, results_visibility, email_results,
    majority_rule, runoff_of, created_by
  ) values (
    v_e.org_id, left(v_e.title || ' run-off', 140), v_slug, v_e.description, v_e.voter_method,
    v_e.results_visibility, v_e.email_results, false, v_e.id, auth.uid()
  ) returning id into v_id;

  for v_item in select value from jsonb_array_elements(p_positions) loop
    select * into v_pos from public.positions
    where id = (v_item ->> 'position_id')::uuid and election_id = p_election;
    if not found then raise exception 'bad_runoff'; end if;

    select array_agg(x::uuid) into v_ids
    from jsonb_array_elements_text(coalesce(v_item -> 'candidate_ids', '[]'::jsonb)) x;
    if coalesce(array_length(v_ids, 1), 0) < 2
       or (select count(*) from public.candidates where position_id = v_pos.id and id = any (v_ids))
          <> array_length(v_ids, 1) then
      raise exception 'bad_runoff';
    end if;

    insert into public.positions (election_id, title, seats, sort_order)
    values (v_id, v_pos.title, 1, v_pi) returning id into v_new_pos;
    v_pi := v_pi + 1;

    insert into public.candidates (position_id, election_id, name, bio, photo_url, sort_order)
    select v_new_pos, v_id, c.name, c.bio, c.photo_url, c.sort_order
    from public.candidates c where c.id = any (v_ids);
  end loop;

  insert into public.voters (election_id, name, email, phone, member_id, access_code)
  select v_id, name, email, phone, member_id, access_code
  from public.voters where election_id = p_election;

  perform public.log_event(v_id, 'runoff_created_from', v_e.title);
  perform public.log_event(p_election, 'runoff_created', null);
  return v_id;
end;
$$;

revoke execute on function public.ballot_fingerprint(text) from public, anon, authenticated;
revoke execute on function public.ballot_fingerprints(uuid) from public, anon, authenticated;
revoke execute on function public.ballot_by_receipt(uuid, text) from public, anon, authenticated;
revoke execute on function public.create_runoff(uuid, jsonb) from public, anon;
grant execute on function public.create_runoff(uuid, jsonb) to authenticated;
grant execute on function public.ballot_fingerprint(text), public.ballot_fingerprints(uuid),
  public.ballot_by_receipt(uuid, text), public.create_runoff(uuid, jsonb) to service_role;
