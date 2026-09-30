-- =========================================================
-- DRS Performance Portal — initial schema
-- =========================================================
create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type public.user_role as enum ('admin', 'driver', 'sales_rep');
create type public.delivered_by as enum ('drs', 'partner');
create type public.review_platform as enum ('google', 'bbb', 'trustpilot', 'facebook', 'other');
create type public.upsell_type as enum ('packing', 'storage', 'materials', 'other');
create type public.lead_source as enum ('google_ppc', 'tv_ad', 'google_lead', 'direct', 'referral', 'other');
create type public.lead_status as enum ('open', 'booked', 'lost');

-- ---------- Generic helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  email text not null,
  phone text check (phone is null or char_length(phone) <= 30),
  role public.user_role not null default 'driver',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_role_idx on public.profiles (role, active);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers (security definer so RLS policies can call them)
create or replace function public.app_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and active), false)
$$;

-- New auth user → profile. Role comes from app_metadata (only the server can set it).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'driver')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users can edit their own name/phone only
create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.active is distinct from old.active
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    raise exception 'You can only change your name and phone';
  end if;
  return new;
end $$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- =========================================================
-- JOBS
-- =========================================================
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_number text not null check (char_length(job_number) between 1 and 40),
  date date not null,
  origin_city text not null check (char_length(origin_city) between 1 and 80),
  origin_state char(2) not null,
  dest_city text not null check (char_length(dest_city) between 1 and 80),
  dest_state char(2) not null,
  driver_id uuid not null references public.profiles(id),
  crew_ids uuid[] not null default '{}',
  delivered_by public.delivered_by not null default 'drs',
  on_time_pickup boolean,
  on_time_delivery boolean,
  created_at timestamptz not null default now()
);
create unique index jobs_job_number_key on public.jobs (lower(job_number));
create index jobs_driver_date_idx on public.jobs (driver_id, date desc);
create index jobs_date_idx on public.jobs (date desc);

create or replace function public.owns_job(p_job uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jobs where id = p_job and driver_id = auth.uid())
$$;

-- Drivers always create jobs as themselves, and are always on the crew
create or replace function public.stamp_job_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.driver_id := auth.uid();
    if not (auth.uid() = any(new.crew_ids)) then
      new.crew_ids := array_prepend(auth.uid(), new.crew_ids);
    end if;
  end if;
  new.created_at := now();
  return new;
end $$;

create trigger jobs_stamp_insert
  before insert on public.jobs
  for each row execute function public.stamp_job_insert();

-- Drivers may only record on-time status once; everything else is admin-only
create or replace function public.guard_job_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if (new.job_number, new.date, new.origin_city, new.origin_state, new.dest_city, new.dest_state,
      new.driver_id, new.crew_ids, new.delivered_by, new.created_at)
     is distinct from
     (old.job_number, old.date, old.origin_city, old.origin_state, old.dest_city, old.dest_state,
      old.driver_id, old.crew_ids, old.delivered_by, old.created_at) then
    raise exception 'Only an admin can change job details';
  end if;

  if old.on_time_pickup is not null and new.on_time_pickup is distinct from old.on_time_pickup then
    raise exception 'Pickup status is already recorded';
  end if;
  if old.on_time_delivery is not null and new.on_time_delivery is distinct from old.on_time_delivery then
    raise exception 'Delivery status is already recorded';
  end if;

  return new;
end $$;

create trigger jobs_guard_update
  before update on public.jobs
  for each row execute function public.guard_job_update();

-- =========================================================
-- EVIDENCE TABLES
-- =========================================================
create table public.pre_damages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  item text not null check (char_length(item) between 1 and 120),
  location text not null check (char_length(location) between 1 and 120),
  description text not null check (char_length(description) between 1 and 1000),
  notes text check (notes is null or char_length(notes) <= 1000),
  photo_paths text[] not null check (cardinality(photo_paths) between 1 and 5),
  customer_shown boolean not null check (customer_shown),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  signature_path text not null,
  captured_at_device timestamptz not null,
  received_at_server timestamptz not null default now(),
  synced_offline boolean not null default false,
  lat double precision,
  lng double precision,
  locked boolean not null default true,
  created_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index pre_damages_job_idx on public.pre_damages (job_id);

create table public.damage_incidents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  item text not null check (char_length(item) between 1 and 120),
  description text not null check (char_length(description) between 1 and 1000),
  photo_paths text[] not null check (cardinality(photo_paths) between 1 and 5),
  claim_filed boolean not null,
  estimated_cost numeric(12, 2) not null check (estimated_cost >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index damage_incidents_job_idx on public.damage_incidents (job_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  platform public.review_platform not null,
  stars smallint not null check (stars between 1 and 5),
  driver_mentioned boolean not null,
  link text check (link is null or char_length(link) <= 2000),
  screenshot_path text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  deleted_at timestamptz,
  check (link is not null or screenshot_path is not null)
);
create index reviews_job_idx on public.reviews (job_id);

create table public.upsells (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  type public.upsell_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  deleted_at timestamptz
);
create index upsells_job_idx on public.upsells (job_id);

-- Server-controlled fields on insert
create or replace function public.stamp_evidence_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  new.deleted_at := null;

  if tg_table_name = 'pre_damages' then
    new.received_at_server := now();   -- never trust the phone's clock
    new.locked := true;
  else
    new.created_at := now();
  end if;

  if tg_table_name in ('reviews', 'upsells') and not public.is_admin() then
    new.verified := false;             -- only admins verify
  end if;

  return new;
end $$;

create trigger pre_damages_stamp before insert on public.pre_damages
  for each row execute function public.stamp_evidence_insert();
create trigger damage_incidents_stamp before insert on public.damage_incidents
  for each row execute function public.stamp_evidence_insert();
create trigger reviews_stamp before insert on public.reviews
  for each row execute function public.stamp_evidence_insert();
create trigger upsells_stamp before insert on public.upsells
  for each row execute function public.stamp_evidence_insert();

-- Locked pre-damage records: evidence can never change; text corrections need a reason
create or replace function public.guard_pre_damage_update()
returns trigger language plpgsql set search_path = public as $$
declare
  v_reason text := nullif(current_setting('app.change_reason', true), '');
begin
  if new.job_id is distinct from old.job_id
     or new.photo_paths is distinct from old.photo_paths
     or new.signature_path is distinct from old.signature_path
     or new.captured_at_device is distinct from old.captured_at_device
     or new.received_at_server is distinct from old.received_at_server
     or new.synced_offline is distinct from old.synced_offline
     or new.lat is distinct from old.lat
     or new.lng is distinct from old.lng
     or new.created_by is distinct from old.created_by
     or new.locked is distinct from old.locked then
    raise exception 'Evidence on a locked record cannot be changed';
  end if;

  if (new.item, new.location, new.description, new.notes, new.customer_name, new.customer_shown)
     is distinct from
     (old.item, old.location, old.description, old.notes, old.customer_name, old.customer_shown)
     and v_reason is null then
    raise exception 'A reason is required to correct this record';
  end if;

  if old.deleted_at is null and new.deleted_at is not null and v_reason is null then
    raise exception 'A reason is required to delete this record';
  end if;

  return new;
end $$;

create trigger pre_damages_guard before update on public.pre_damages
  for each row execute function public.guard_pre_damage_update();

-- =========================================================
-- SALES
-- =========================================================
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  granot_id text not null unique,
  date date not null,
  rep_id uuid references public.profiles(id),
  source public.lead_source not null default 'other',
  lead_cost numeric(12, 2) not null default 0 check (lead_cost >= 0),
  cost_overridden boolean not null default false,
  status public.lead_status not null default 'open',
  booked_date date,
  job_value numeric(12, 2) check (job_value is null or job_value >= 0),
  raw jsonb,                                  -- original Granot payload, for troubleshooting
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_rep_date_idx on public.leads (rep_id, date desc);
create index leads_date_idx on public.leads (date desc);
create index leads_source_date_idx on public.leads (source, date);

create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create table public.lead_costs (
  id uuid primary key default gen_random_uuid(),
  source public.lead_source not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  cost numeric(12, 2) not null check (cost >= 0),
  unique (source, month)
);

-- =========================================================
-- AUDIT LOG (written only by triggers)
-- =========================================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  job_id uuid,
  action text not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now(),
  before jsonb,
  after jsonb,
  reason text
);
create index audit_job_idx on public.audit_log (job_id, changed_at desc);
create index audit_time_idx on public.audit_log (changed_at desc);

create or replace function public.audit_row()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_entity text := tg_argv[0];
  v_old jsonb;
  v_new jsonb := to_jsonb(new);
  v_before jsonb;
  v_after jsonb;
  v_action text;
  v_reason text := nullif(current_setting('app.change_reason', true), '');
  v_job uuid;
begin
  v_job := case when v_entity = 'job' then new.id else (v_new->>'job_id')::uuid end;

  if tg_op = 'INSERT' then
    v_action := 'create';
    v_before := null;
    v_after := v_new - array['photo_paths', 'signature_path', 'screenshot_path', 'created_at', 'updated_at', 'deleted_at'];
  else
    v_old := to_jsonb(old);
    select
      coalesce(jsonb_object_agg(k.key, v_old->k.key), '{}'::jsonb),
      coalesce(jsonb_object_agg(k.key, v_new->k.key), '{}'::jsonb)
    into v_before, v_after
    from jsonb_object_keys(v_new) as k(key)
    where k.key <> 'updated_at' and (v_new->k.key) is distinct from (v_old->k.key);

    if v_after = '{}'::jsonb then
      return new;   -- nothing actually changed
    end if;

    if v_after ? 'deleted_at' then
      v_action := case when new_deleted_is_null(v_new) then 'restore' else 'delete' end;
    elsif v_after ? 'verified' and (select count(*) from jsonb_object_keys(v_after)) = 1 then
      v_action := case when (v_after->>'verified')::boolean then 'verify' else 'unverify' end;
    else
      v_action := 'update';
    end if;
  end if;

  insert into public.audit_log (entity_type, entity_id, job_id, action, changed_by, before, after, reason)
  values (v_entity, new.id, v_job, v_action, auth.uid(), v_before, v_after, v_reason);

  return new;
end $$;

-- small helper used above
create or replace function public.new_deleted_is_null(p jsonb)
returns boolean language sql immutable as $$
  select (p->>'deleted_at') is null
$$;

create trigger pre_damages_audit after insert or update on public.pre_damages
  for each row execute function public.audit_row('pre_damage');
create trigger damage_incidents_audit after update on public.damage_incidents
  for each row execute function public.audit_row('damage');
create trigger reviews_audit after update on public.reviews
  for each row execute function public.audit_row('review');
create trigger upsells_audit after update on public.upsells
  for each row execute function public.audit_row('upsell');
create trigger jobs_audit after update on public.jobs
  for each row execute function public.audit_row('job');

-- =========================================================
-- SETTINGS (single row) + OFFLINE SYNC RECEIPTS
-- =========================================================
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  company jsonb not null,
  damage_alert_emails text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (id, company, damage_alert_emails)
values (
  1,
  '{"name":"Direct Relocation Services","usdot":"3000931","mc":"24036","address":"Fort Lauderdale, FL","phone":"855-378-3110","email":"justin@directrelocate.com"}',
  '{}'
);

create table public.sync_receipts (
  client_id text primary key,
  user_id uuid not null references public.profiles(id),
  result jsonb not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ADMIN FUNCTIONS (reason is passed to the audit trigger)
-- =========================================================
create or replace function public.admin_correct_pre_damage(
  p_id uuid,
  p_item text,
  p_location text,
  p_description text,
  p_notes text,
  p_customer_name text,
  p_reason text
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_job uuid;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if coalesce(char_length(trim(p_reason)), 0) < 3 then raise exception 'A reason is required'; end if;

  perform set_config('app.change_reason', trim(p_reason), true);

  update public.pre_damages
     set item = p_item,
         location = p_location,
         description = p_description,
         notes = nullif(trim(coalesce(p_notes, '')), ''),
         customer_name = p_customer_name
   where id = p_id
  returning job_id into v_job;

  if v_job is null then raise exception 'Record not found'; end if;
  return v_job;
end $$;

create or replace function public.admin_set_deleted(
  p_kind text,
  p_id uuid,
  p_deleted boolean,
  p_reason text default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_table text;
  v_job uuid;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;

  v_table := case p_kind
    when 'pre_damage' then 'pre_damages'
    when 'damage' then 'damage_incidents'
    when 'review' then 'reviews'
    when 'upsell' then 'upsells'
  end;
  if v_table is null then raise exception 'Invalid record type'; end if;

  if p_deleted and coalesce(char_length(trim(p_reason)), 0) < 3 then
    raise exception 'A reason is required';
  end if;

  perform set_config('app.change_reason', coalesce(trim(p_reason), ''), true);

  execute format(
    'update public.%I set deleted_at = %s where id = $1 returning job_id',
    v_table,
    case when p_deleted then 'now()' else 'null' end
  ) into v_job using p_id;

  if v_job is null then raise exception 'Record not found'; end if;
  return v_job;
end $$;

create or replace function public.admin_set_lead_cost(
  p_source public.lead_source,
  p_month text,
  p_cost numeric
) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  v_count integer;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;

  insert into public.lead_costs (source, month, cost)
  values (p_source, p_month, p_cost)
  on conflict (source, month) do update set cost = excluded.cost;

  update public.leads
     set lead_cost = p_cost
   where source = p_source
     and to_char(date, 'YYYY-MM') = p_month
     and not cost_overridden;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.pre_damages enable row level security;
alter table public.damage_incidents enable row level security;
alter table public.reviews enable row level security;
alter table public.upsells enable row level security;
alter table public.leads enable row level security;
alter table public.lead_costs enable row level security;
alter table public.audit_log enable row level security;
alter table public.settings enable row level security;
alter table public.sync_receipts enable row level security;

-- Profiles: everyone signed in can see names (crew picker, leaderboards)
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Jobs
create policy jobs_select on public.jobs
  for select to authenticated using (public.is_admin() or driver_id = auth.uid());
create policy jobs_insert on public.jobs
  for insert to authenticated
  with check (public.is_admin() or (public.app_role() = 'driver' and driver_id = auth.uid()));
create policy jobs_update on public.jobs
  for update to authenticated
  using (public.is_admin() or driver_id = auth.uid())
  with check (public.is_admin() or driver_id = auth.uid());

-- Evidence tables: drivers see/add their own; only admins update; nobody deletes
do $$
declare
  t text;
begin
  foreach t in array array['pre_damages', 'damage_incidents', 'reviews', 'upsells'] loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated
         using (public.is_admin() or (deleted_at is null and public.owns_job(job_id)))', t);
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated
         with check (public.is_admin() or (public.app_role() = ''driver'' and public.owns_job(job_id)))', t);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Leads: reps see their own; admins manage all (Granot import uses the service key)
create policy leads_select on public.leads
  for select to authenticated using (public.is_admin() or rep_id = auth.uid());
create policy leads_admin_write on public.leads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lead_costs_select on public.lead_costs
  for select to authenticated using (true);
create policy lead_costs_admin_write on public.lead_costs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Audit log: admins read; rows only come from triggers
create policy audit_select on public.audit_log
  for select to authenticated using (public.is_admin());

-- Settings
create policy settings_select on public.settings
  for select to authenticated using (public.is_admin());
create policy settings_update on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Offline sync receipts: each user sees their own
create policy sync_receipts_select on public.sync_receipts
  for select to authenticated using (user_id = auth.uid());
create policy sync_receipts_insert on public.sync_receipts
  for insert to authenticated with check (user_id = auth.uid());

-- =========================================================
-- STORAGE: private evidence bucket  (path: <job_id>/<kind>/<file>)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  15728640,  -- 15 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy evidence_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidence'
    and (public.is_admin() or public.owns_job(((storage.foldername(name))[1])::uuid))
  );

create policy evidence_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and (public.is_admin() or public.owns_job(((storage.foldername(name))[1])::uuid))
  );
-- No update/delete policies: evidence files can never be replaced or removed.

-- =========================================================
-- FUNCTION ACCESS
-- =========================================================
grant execute on function public.app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.owns_job(uuid) to authenticated;
grant execute on function public.admin_correct_pre_damage(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_set_deleted(text, uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_lead_cost(public.lead_source, text, numeric) to authenticated;