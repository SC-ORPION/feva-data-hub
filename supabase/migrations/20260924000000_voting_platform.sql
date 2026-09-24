-- FEVA Vote: voting platform schema.
-- Replaces the old data-hub tables. Safe to run on a project that never had them.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Remove the old data-hub schema
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.update_wallet_balance(uuid, numeric) cascade;
drop table if exists public.transactions cascade;
drop table if exists public.wallets cascade;
drop table if exists public.pricing cascade;
drop table if exists public.broadcasts cascade;

-- Admin profiles. Kept from the old schema, emptied.
create table if not exists public.users (
  id uuid primary key,
  email varchar(255) unique not null,
  full_name varchar(255),
  phone varchar(20),
  created_at timestamp default now(),
  updated_at timestamp default now()
);
truncate public.users;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_id_fkey' and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  email_domain text,
  domain_verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members (user_id);

create table public.elections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  slug text not null check (slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$'),
  description text check (char_length(description) <= 2000),
  voter_method text not null check (voter_method in ('email', 'phone', 'member_id', 'code')),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  opened_at timestamptz,
  closed_at timestamptz,
  results_visibility text not null default 'after_close'
    check (results_visibility in ('live', 'after_close')),
  email_results boolean not null default false,
  results_emailed_at timestamptz,
  voter_data_deleted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, slug),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index elections_org_idx on public.elections (org_id);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  seats int not null default 1 check (seats between 1 and 50),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (id, election_id)
);
create index positions_election_idx on public.positions (election_id);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null,
  election_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  bio text check (char_length(bio) <= 600),
  photo_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  foreign key (position_id, election_id)
    references public.positions (id, election_id) on delete cascade
);
create index candidates_position_idx on public.candidates (position_id);

-- The voter list. Personal details can be wiped by the organization after the vote;
-- the rows stay so turnout numbers survive.
create table public.voters (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  name text check (char_length(name) <= 160),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 20),
  member_id text check (char_length(member_id) <= 64),
  access_code text check (char_length(access_code) <= 32),
  has_voted boolean not null default false,
  voted_at timestamptz,
  created_at timestamptz not null default now()
);
create index voters_election_idx on public.voters (election_id, has_voted);
create unique index voters_email_uq on public.voters (election_id, email) where email is not null;
create unique index voters_phone_uq on public.voters (election_id, phone) where phone is not null;
create unique index voters_member_uq on public.voters (election_id, member_id) where member_id is not null;
create unique index voters_code_uq on public.voters (election_id, access_code) where access_code is not null;

create table public.voter_otps (
  voter_id uuid primary key references public.voters (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null default now()
);

-- Secret ballots: nothing here points back to a voter, and there are no timestamps.
create table public.ballots (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  receipt_hash text not null unique
);
create index ballots_election_idx on public.ballots (election_id);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.ballots (id) on delete cascade,
  election_id uuid not null references public.elections (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  approve boolean not null default true
);
create index votes_candidate_idx on public.votes (candidate_id, approve);
create index votes_position_idx on public.votes (position_id, ballot_id);

create table public.election_events (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index election_events_idx on public.election_events (election_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members where org_id = p_org and user_id = auth.uid()
  );
$$;

create or replace function public.is_election_admin(p_election uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.elections e
    join public.org_members m on m.org_id = e.org_id
    where e.id = p_election and m.user_id = auth.uid()
  );
$$;

-- draft | scheduled | open | closed, taking the start and end times into account.
create or replace function public.election_phase(e public.elections)
returns text language sql stable as $$
  select case
    when e.status = 'draft' then 'draft'
    when e.status = 'closed' then 'closed'
    when e.ends_at is not null and now() >= e.ends_at then 'closed'
    when e.starts_at is not null and now() < e.starts_at then 'scheduled'
    else 'open'
  end;
$$;

create or replace function public.slugify(p text, p_max int default 60)
returns text language sql immutable as $$
  select trim(both '-' from substr(
    regexp_replace(regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'),
    1, p_max));
$$;

create or replace function public.normalize_phone(p text)
returns text language plpgsql immutable as $$
declare
  d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if d = '' then return null; end if;
  if d like '00%' then d := substr(d, 3); end if;
  if length(d) = 10 and d like '0%' then return '233' || substr(d, 2); end if;
  if length(d) = 9 then return '233' || d; end if;
  return d;
end;
$$;

create or replace function public.log_event(p_election uuid, p_kind text, p_detail text)
returns void language sql security definer set search_path = public as $$
  insert into public.election_events (election_id, actor_id, kind, detail)
  values (p_election, auth.uid(), p_kind, p_detail);
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  -- The very first account on a fresh install runs the platform.
  if not exists (select 1 from public.platform_admins) then
    insert into public.platform_admins (user_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Positions and candidates can't change once voting has started.
create or replace function public.guard_ballot_lock()
returns trigger language plpgsql as $$
declare
  v_status text;
begin
  select status into v_status from public.elections
  where id = coalesce(new.election_id, old.election_id);
  -- v_status is null while a parent election is being deleted.
  if v_status is not null and v_status <> 'draft' then
    raise exception 'ballot_locked' using hint = 'The ballot is locked because voting has started.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger positions_lock before insert or update or delete on public.positions
  for each row execute function public.guard_ballot_lock();
create trigger candidates_lock before insert or update or delete on public.candidates
  for each row execute function public.guard_ballot_lock();

create or replace function public.guard_election_update()
returns trigger language plpgsql as $$
begin
  if old.status <> 'draft' and new.voter_method is distinct from old.voter_method then
    raise exception 'voter_method_locked';
  end if;
  return new;
end;
$$;

create trigger elections_update_guard before update on public.elections
  for each row execute function public.guard_election_update();

create or replace function public.guard_election_delete()
returns trigger language plpgsql as $$
begin
  if old.status = 'open' then
    raise exception 'election_open' using hint = 'Close voting before deleting this election.';
  end if;
  return old;
end;
$$;

create trigger elections_delete_guard before delete on public.elections
  for each row execute function public.guard_election_delete();

create or replace function public.normalize_voter()
returns trigger language plpgsql as $$
begin
  new.name := nullif(trim(new.name), '');
  new.email := nullif(lower(trim(new.email)), '');
  new.phone := public.normalize_phone(new.phone);
  new.member_id := nullif(upper(trim(new.member_id)), '');
  new.access_code := nullif(upper(regexp_replace(coalesce(new.access_code, ''), '[\s-]', '', 'g')), '');
  return new;
end;
$$;

create trigger voters_normalize before insert or update on public.voters
  for each row execute function public.normalize_voter();

create or replace function public.guard_voter_change()
returns trigger language plpgsql as $$
declare
  v_deleted timestamptz;
begin
  select voter_data_deleted_at into v_deleted from public.elections
  where id = coalesce(new.election_id, old.election_id);

  if tg_op = 'INSERT' and v_deleted is not null then
    raise exception 'voter_data_deleted';
  end if;
  if tg_op = 'DELETE' and old.has_voted
     and exists (select 1 from public.elections where id = old.election_id) then
    raise exception 'voter_already_voted'
      using hint = 'This person already voted, so they stay on the list.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger voters_guard before insert or delete on public.voters
  for each row execute function public.guard_voter_change();

-- ---------------------------------------------------------------------------
-- Admin actions
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(p_name text)
returns public.organizations
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_domain text;
  v_free boolean;
  v_base text;
  v_slug text;
  v_n int := 1;
  v_org public.organizations;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;

  select o.* into v_org from public.organizations o
  join public.org_members m on m.org_id = o.id
  where m.user_id = v_uid limit 1;
  if found then return v_org; end if;

  select email, email_confirmed_at into v_email, v_confirmed from auth.users where id = v_uid;
  insert into public.users (id, email) values (v_uid, v_email) on conflict (id) do nothing;

  v_domain := lower(split_part(v_email, '@', 2));
  v_free := v_domain in (
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com', 'outlook.com',
    'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me',
    'protonmail.com', 'mail.com', 'gmx.com', 'zoho.com'
  );

  v_base := public.slugify(p_name, 34);
  if char_length(v_base) < 3 then v_base := 'group'; end if;
  if v_base in ('www', 'app', 'api', 'admin', 'mail', 'vote', 'dashboard', 'platform', 'help', 'status') then
    v_base := v_base || '-org';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.organizations (name, slug, email_domain, domain_verified, created_by)
  values (
    trim(p_name), v_slug,
    case when v_free then null else v_domain end,
    (not v_free and v_confirmed is not null),
    v_uid
  )
  returning * into v_org;

  insert into public.org_members (org_id, user_id, role) values (v_org.id, v_uid, 'owner');
  return v_org;
end;
$$;

create or replace function public.set_org_status(p_org uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'not_allowed'; end if;
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'bad_status'; end if;
  update public.organizations set status = p_status, reviewed_at = now() where id = p_org;
end;
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
    results_visibility, email_results, created_by
  ) values (
    p_org, trim(p ->> 'title'), v_slug, nullif(trim(p ->> 'description'), ''),
    p ->> 'voter_method',
    nullif(p ->> 'starts_at', '')::timestamptz,
    nullif(p ->> 'ends_at', '')::timestamptz,
    coalesce(p ->> 'results_visibility', 'after_close'),
    coalesce((p ->> 'email_results')::boolean, false),
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

-- Replaces every position and candidate on a draft ballot in one go.
create or replace function public.update_ballot(p_election uuid, p_positions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_pos jsonb;
  v_pos_id uuid;
  v_cand jsonb;
  v_pi int := 0;
  v_ci int;
begin
  if not public.is_election_admin(p_election) then raise exception 'not_allowed'; end if;
  select status into v_status from public.elections where id = p_election for update;
  if v_status <> 'draft' then raise exception 'ballot_locked'; end if;

  delete from public.positions where election_id = p_election;
  for v_pos in select value from jsonb_array_elements(coalesce(p_positions, '[]'::jsonb)) loop
    insert into public.positions (election_id, title, seats, sort_order)
    values (p_election, trim(v_pos ->> 'title'), coalesce((v_pos ->> 'seats')::int, 1), v_pi)
    returning id into v_pos_id;
    v_pi := v_pi + 1;
    v_ci := 0;
    for v_cand in select value from jsonb_array_elements(coalesce(v_pos -> 'candidates', '[]'::jsonb)) loop
      insert into public.candidates (position_id, election_id, name, bio, photo_url, sort_order)
      values (
        v_pos_id, p_election, trim(v_cand ->> 'name'),
        nullif(trim(v_cand ->> 'bio'), ''), nullif(v_cand ->> 'photo_url', ''), v_ci
      );
      v_ci := v_ci + 1;
    end loop;
  end loop;
end;
$$;

-- Adds voters in bulk. Duplicates (same email, phone, ID or code) are skipped.
create or replace function public.add_voters(p_election uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_added int;
  v_total int := jsonb_array_length(p_rows);
begin
  if not public.is_election_admin(p_election) then raise exception 'not_allowed'; end if;
  if v_total > 5000 then raise exception 'too_many_rows'; end if;

  with ins as (
    insert into public.voters (election_id, name, email, phone, member_id, access_code)
    select p_election, r.name, r.email, r.phone, r.member_id, r.access_code
    from jsonb_to_recordset(p_rows)
      as r(name text, email text, phone text, member_id text, access_code text)
    on conflict do nothing
    returning 1
  )
  select count(*) into v_added from ins;

  if v_added > 0 then
    perform public.log_event(p_election, 'voters_added', v_added::text);
  end if;
  return jsonb_build_object('added', v_added, 'skipped', v_total - v_added);
end;
$$;

create or replace function public.set_election_status(p_election uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_e public.elections;
  v_org_status text;
begin
  if not public.is_election_admin(p_election) then raise exception 'not_allowed'; end if;
  select * into v_e from public.elections where id = p_election for update;

  if p_status = 'open' then
    if v_e.status <> 'draft' then raise exception 'already_started'; end if;
    select status into v_org_status from public.organizations where id = v_e.org_id;
    if v_org_status <> 'approved' then raise exception 'org_not_approved'; end if;
    if not exists (select 1 from public.positions where election_id = p_election) then
      raise exception 'no_positions';
    end if;
    if exists (
      select 1 from public.positions p
      where p.election_id = p_election
        and not exists (select 1 from public.candidates c where c.position_id = p.id)
    ) then
      raise exception 'empty_position';
    end if;
    if not exists (select 1 from public.voters where election_id = p_election) then
      raise exception 'no_voters';
    end if;
    if v_e.ends_at is not null and v_e.ends_at <= now() then
      raise exception 'end_in_past';
    end if;
    update public.elections set status = 'open', opened_at = now() where id = p_election;
    perform public.log_event(p_election, 'opened', null);
  elsif p_status = 'closed' then
    if v_e.status <> 'open' then raise exception 'not_open'; end if;
    update public.elections
      set status = 'closed',
          closed_at = now(),
          ends_at = case when ends_at is null or ends_at > now() then now() else ends_at end
    where id = p_election;
    perform public.log_event(p_election, 'closed', null);
  else
    raise exception 'bad_status';
  end if;
end;
$$;

create or replace function public.wipe_voter_data(p_election uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_e public.elections;
begin
  if not public.is_election_admin(p_election) then raise exception 'not_allowed'; end if;
  select * into v_e from public.elections where id = p_election;
  if public.election_phase(v_e) <> 'closed' then raise exception 'not_closed'; end if;

  delete from public.voter_otps o using public.voters v
  where o.voter_id = v.id and v.election_id = p_election;
  update public.voters
    set name = null, email = null, phone = null, member_id = null, access_code = null
  where election_id = p_election;
  update public.elections set voter_data_deleted_at = now() where id = p_election;
  perform public.log_event(p_election, 'voter_data_deleted', null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Voting (called by the server with the service role only)
-- ---------------------------------------------------------------------------
create or replace function public.cast_ballot(p_voter uuid, p_choices jsonb, p_receipt_hash text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_voter public.voters;
  v_e public.elections;
  v_ballot uuid;
  v_choice jsonb;
  v_pos public.positions;
  v_ids uuid[];
  v_count int;
  v_seen uuid[] := '{}';
  v_approve boolean;
begin
  select * into v_voter from public.voters where id = p_voter for update;
  if not found then raise exception 'not_on_list'; end if;
  if v_voter.has_voted then raise exception 'already_voted'; end if;

  select * into v_e from public.elections where id = v_voter.election_id;
  if public.election_phase(v_e) <> 'open' then raise exception 'voting_not_open'; end if;
  if jsonb_typeof(p_choices) is distinct from 'array' then raise exception 'bad_ballot'; end if;

  insert into public.ballots (election_id, receipt_hash)
  values (v_e.id, p_receipt_hash) returning id into v_ballot;

  for v_choice in select value from jsonb_array_elements(p_choices) loop
    select * into v_pos from public.positions
    where id = (v_choice ->> 'position_id')::uuid and election_id = v_e.id;
    if not found or v_pos.id = any (v_seen) then raise exception 'bad_ballot'; end if;
    v_seen := v_seen || v_pos.id;

    select coalesce(array_agg(distinct x::uuid), '{}') into v_ids
    from jsonb_array_elements_text(coalesce(v_choice -> 'candidate_ids', '[]'::jsonb)) x;
    v_count := coalesce(array_length(v_ids, 1), 0);
    continue when v_count = 0;

    if v_count > v_pos.seats then raise exception 'too_many_choices'; end if;
    if (select count(*) from public.candidates
        where position_id = v_pos.id and id = any (v_ids)) <> v_count then
      raise exception 'bad_ballot';
    end if;

    -- "No" is only possible when one person is standing unopposed.
    v_approve := coalesce((v_choice ->> 'approve')::boolean, true);
    if not v_approve and (select count(*) from public.candidates where position_id = v_pos.id) <> 1 then
      raise exception 'bad_ballot';
    end if;

    insert into public.votes (ballot_id, election_id, position_id, candidate_id, approve)
    select v_ballot, v_e.id, v_pos.id, c, v_approve from unnest(v_ids) c;
  end loop;

  update public.voters set has_voted = true, voted_at = now() where id = p_voter;
end;
$$;

create or replace function public.ballot_by_receipt(p_election uuid, p_receipt_hash text)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when b.id is null then null else jsonb_build_object(
    'choices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', p.title, 'candidate', c.name, 'approve', v.approve
      ) order by p.sort_order, c.sort_order)
      from public.votes v
      join public.positions p on p.id = v.position_id
      join public.candidates c on c.id = v.candidate_id
      where v.ballot_id = b.id
    ), '[]'::jsonb)
  ) end
  from (select 1) one
  left join public.ballots b on b.election_id = p_election and b.receipt_hash = p_receipt_hash;
$$;

-- Full count for one election. Admins of the election and the server may call it;
-- the server decides whether voters get to see it yet.
create or replace function public.election_results(p_election uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (coalesce(auth.role(), '') = 'service_role' or public.is_election_admin(p_election)) then
    raise exception 'not_allowed';
  end if;

  return jsonb_build_object(
    'eligible', (select count(*) from public.voters where election_id = p_election),
    'voted', (select count(*) from public.voters where election_id = p_election and has_voted),
    'ballots', (select count(*) from public.ballots where election_id = p_election),
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'seats', p.seats,
        'ballots_with_choice',
          (select count(distinct v.ballot_id) from public.votes v where v.position_id = p.id),
        'candidates', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'photo_url', c.photo_url,
            'votes', (select count(*) from public.votes v where v.candidate_id = c.id and v.approve),
            'no_votes', (select count(*) from public.votes v where v.candidate_id = c.id and not v.approve)
          ) order by c.sort_order, c.created_at)
          from public.candidates c where c.position_id = p.id
        ), '[]'::jsonb)
      ) order by p.sort_order, p.created_at)
      from public.positions p where p.election_id = p_election
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.elections enable row level security;
alter table public.positions enable row level security;
alter table public.candidates enable row level security;
alter table public.voters enable row level security;
alter table public.voter_otps enable row level security;
alter table public.ballots enable row level security;
alter table public.votes enable row level security;
alter table public.election_events enable row level security;

drop policy if exists users_own_data on public.users;
drop policy if exists users_update_own_data on public.users;
create policy users_select_own on public.users for select to authenticated using (id = auth.uid());
create policy users_update_own on public.users for update to authenticated using (id = auth.uid());
create policy users_platform_read on public.users for select to authenticated
  using (public.is_platform_admin());

create policy platform_admins_self on public.platform_admins for select to authenticated
  using (user_id = auth.uid());

create policy orgs_select on public.organizations for select to authenticated
  using (public.is_org_admin(id) or public.is_platform_admin());
create policy orgs_update on public.organizations for update to authenticated
  using (public.is_org_admin(id));

create policy org_members_select on public.org_members for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

create policy elections_select on public.elections for select to authenticated
  using (public.is_org_admin(org_id));
create policy elections_update on public.elections for update to authenticated
  using (public.is_org_admin(org_id));
create policy elections_delete on public.elections for delete to authenticated
  using (public.is_org_admin(org_id));

create policy positions_all on public.positions for all to authenticated
  using (public.is_election_admin(election_id))
  with check (public.is_election_admin(election_id));
create policy candidates_all on public.candidates for all to authenticated
  using (public.is_election_admin(election_id))
  with check (public.is_election_admin(election_id));

create policy voters_select on public.voters for select to authenticated
  using (public.is_election_admin(election_id));
create policy voters_insert on public.voters for insert to authenticated
  with check (public.is_election_admin(election_id));
create policy voters_update on public.voters for update to authenticated
  using (public.is_election_admin(election_id));
create policy voters_delete on public.voters for delete to authenticated
  using (public.is_election_admin(election_id));

create policy events_select on public.election_events for select to authenticated
  using (public.is_election_admin(election_id));

-- voter_otps, ballots and votes have no policies: only the server can touch them.

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.users to authenticated;
grant update (full_name, phone) on public.users to authenticated;
grant select on public.platform_admins, public.org_members to authenticated;
grant select on public.organizations to authenticated;
grant update (name, slug) on public.organizations to authenticated;
grant select, delete on public.elections to authenticated;
grant update (title, description, slug, starts_at, ends_at, results_visibility, email_results, voter_method)
  on public.elections to authenticated;
grant select, insert, update, delete on public.positions, public.candidates to authenticated;
grant select, delete on public.voters to authenticated;
grant insert (election_id, name, email, phone, member_id, access_code) on public.voters to authenticated;
grant update (name, email, phone, member_id, access_code) on public.voters to authenticated;
grant select on public.election_events to authenticated;

grant all on all tables in schema public to service_role;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_platform_admin(),
  public.is_org_admin(uuid),
  public.is_election_admin(uuid),
  public.election_phase(public.elections),
  public.create_organization(text),
  public.set_org_status(uuid, text),
  public.create_election(uuid, jsonb),
  public.update_ballot(uuid, jsonb),
  public.add_voters(uuid, jsonb),
  public.set_election_status(uuid, text),
  public.wipe_voter_data(uuid),
  public.election_results(uuid)
to authenticated;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Candidate photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('candidate-photos', 'candidate-photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Org admins add candidate photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'candidate-photos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "Org admins remove candidate photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'candidate-photos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
