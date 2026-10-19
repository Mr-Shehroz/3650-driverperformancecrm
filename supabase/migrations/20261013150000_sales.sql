-- File: supabase/migrations/20261013150000_sales.sql
-- (NEW file)
-- =========================================================
-- Sales: editable lead sources, weekly lead costs (with carry-forward),
-- Open / Booked only, and sample leads for review before Granot
-- =========================================================

-- =========================================================
-- LEAD SOURCES (admin-managed; names should match Granot)
-- =========================================================
create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index lead_sources_name_key on public.lead_sources (lower(name));

insert into public.lead_sources (name) values
  ('Google PPC'), ('TV Ad'), ('Google Lead'), ('Direct'), ('Referral'), ('Other');

-- =========================================================
-- LEADS: source → lead_sources, and only Open / Booked
-- =========================================================
alter table public.leads add column source_id uuid references public.lead_sources(id);
alter table public.leads add column is_sample boolean not null default false;

update public.leads l
   set source_id = s.id
  from public.lead_sources s
 where lower(s.name) = lower(case l.source
          when 'google_ppc' then 'Google PPC'
          when 'tv_ad' then 'TV Ad'
          when 'google_lead' then 'Google Lead'
          when 'direct' then 'Direct'
          when 'referral' then 'Referral'
          else 'Other' end);

update public.leads
   set source_id = (select id from public.lead_sources where name = 'Other')
 where source_id is null;

alter table public.leads alter column source_id set not null;

drop function if exists public.admin_set_lead_cost(public.lead_source, text, numeric);
drop index if exists public.leads_source_date_idx;
alter table public.leads drop column source;
create index leads_source_date_idx on public.leads (source_id, date);

-- Remove "lost": any lost lead becomes open
alter type public.lead_status rename to lead_status_old;
create type public.lead_status as enum ('open', 'booked');
alter table public.leads alter column status drop default;
alter table public.leads
  alter column status type public.lead_status
  using (case when status::text = 'booked' then 'booked' else 'open' end)::public.lead_status;
alter table public.leads alter column status set default 'open';
drop type public.lead_status_old;

-- =========================================================
-- WEEKLY LEAD COSTS (week = Monday)
-- =========================================================
drop table public.lead_costs;
drop type public.lead_source;

create table public.lead_costs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.lead_sources(id),
  week date not null check (extract(isodow from week) = 1),
  cost numeric(12, 2) not null check (cost >= 0),
  updated_at timestamptz not null default now(),
  unique (source_id, week)
);

create trigger lead_costs_updated_at before update on public.lead_costs
  for each row execute function public.set_updated_at();

-- Cost in effect for a source on a date: that week's cost, or the latest earlier week's
create or replace function public.lead_cost_for(p_source uuid, p_date date)
returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((
    select cost from public.lead_costs
     where source_id = p_source and week <= date_trunc('week', p_date)::date
     order by week desc
     limit 1
  ), 0)
$$;

-- New leads (e.g. from Granot) get their week's cost automatically
create or replace function public.stamp_lead_cost()
returns trigger language plpgsql set search_path = public as $$
begin
  if not new.cost_overridden then
    new.lead_cost := public.lead_cost_for(new.source_id, new.date);
  end if;
  return new;
end $$;

create trigger leads_stamp_cost before insert on public.leads
  for each row execute function public.stamp_lead_cost();

-- Re-applies weekly costs to a source's leads (skips manual overrides)
create or replace function public.recalc_lead_costs(p_source uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  update public.leads
     set lead_cost = public.lead_cost_for(source_id, date)
   where source_id = p_source
     and not cost_overridden
     and lead_cost is distinct from public.lead_cost_for(source_id, date);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Set (or clear, with null) one source's cost for one week. Returns leads updated.
create or replace function public.admin_set_weekly_cost(
  p_source uuid,
  p_week date,
  p_cost numeric
) returns integer
language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if extract(isodow from p_week) <> 1 then raise exception 'Week must start on a Monday'; end if;

  if p_cost is null then
    delete from public.lead_costs where source_id = p_source and week = p_week;
  else
    if p_cost < 0 then raise exception 'Cost must be 0 or more'; end if;
    insert into public.lead_costs (source_id, week, cost)
    values (p_source, p_week, p_cost)
    on conflict (source_id, week) do update set cost = excluded.cost;
  end if;

  return public.recalc_lead_costs(p_source);
end $$;

-- Override one lead's cost (null = back to the weekly cost)
create or replace function public.admin_override_lead_cost(p_lead uuid, p_cost numeric)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_cost is not null and p_cost < 0 then raise exception 'Cost must be 0 or more'; end if;

  update public.leads
     set cost_overridden = p_cost is not null,
         lead_cost = coalesce(p_cost, public.lead_cost_for(source_id, date))
   where id = p_lead
  returning id into v_id;

  if v_id is null then raise exception 'Lead not found'; end if;
  return v_id;
end $$;

-- =========================================================
-- SAMPLE LEADS (for reviewing the sales screens before Granot)
-- =========================================================
create or replace function public.seed_sample_leads_internal()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_rep record;
  v_sources uuid[];
  v_i integer;
  v_date date;
  v_booked boolean;
  v_count integer := 0;
  v_this_week date := date_trunc('week', current_date)::date;
begin
  select array_agg(id order by name) into v_sources from public.lead_sources where active;
  if v_sources is null then return 0; end if;

  -- Sample weekly costs, only if none were entered yet (some weeks only, so carry-forward shows)
  if not exists (select 1 from public.lead_costs) then
    insert into public.lead_costs (source_id, week, cost)
    select s.id, v_this_week - 77, c.cost
      from public.lead_sources s
      join (values ('Google PPC', 90), ('TV Ad', 120), ('Google Lead', 0),
                   ('Direct', 0), ('Referral', 100), ('Other', 40)) as c(name, cost)
        on lower(s.name) = lower(c.name);
    insert into public.lead_costs (source_id, week, cost)
    select s.id, v_this_week - 49, c.cost
      from public.lead_sources s
      join (values ('Google PPC', 95), ('Other', 45)) as c(name, cost) on lower(s.name) = lower(c.name);
    insert into public.lead_costs (source_id, week, cost)
    select s.id, v_this_week - 28, c.cost
      from public.lead_sources s
      join (values ('TV Ad', 135), ('Referral', 90)) as c(name, cost) on lower(s.name) = lower(c.name);
    insert into public.lead_costs (source_id, week, cost)
    select s.id, v_this_week - 7, c.cost
      from public.lead_sources s
      join (values ('Google PPC', 105)) as c(name, cost) on lower(s.name) = lower(c.name);
  end if;

  for v_rep in
    select id from public.profiles p
     where role = 'sales_rep' and active
       and not exists (select 1 from public.leads l where l.rep_id = p.id and l.is_sample)
  loop
    for v_i in 1..28 loop
      v_date := current_date - (floor(random() * 75))::int;
      v_booked := random() < 0.4;
      insert into public.leads (granot_id, date, rep_id, source_id, status, booked_date, job_value, is_sample)
      values (
        'SAMPLE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
        v_date,
        v_rep.id,
        v_sources[1 + floor(random() * array_length(v_sources, 1))::int],
        case when v_booked then 'booked'::public.lead_status else 'open'::public.lead_status end,
        case when v_booked then v_date else null end,
        case when v_booked then 2400 + floor(random() * 45) * 100 else null end,
        true
      );
      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end $$;

-- Admin buttons
create or replace function public.admin_seed_sample_leads()
returns integer
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return public.seed_sample_leads_internal();
end $$;

create or replace function public.admin_clear_sample_leads()
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  v_count integer;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  delete from public.leads where is_sample;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Add sample leads now for the reps that already exist, then apply weekly costs to every lead
select public.seed_sample_leads_internal();
select public.recalc_lead_costs(id) from public.lead_sources;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.lead_sources enable row level security;
alter table public.lead_costs enable row level security;

create policy lead_sources_select on public.lead_sources
  for select to authenticated using (true);
create policy lead_sources_admin_insert on public.lead_sources
  for insert to authenticated with check (public.is_admin());
create policy lead_sources_admin_update on public.lead_sources
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lead_costs_select on public.lead_costs
  for select to authenticated using (true);
create policy lead_costs_admin_write on public.lead_costs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- FUNCTION ACCESS (internal helpers are not callable from the app)
-- =========================================================
revoke execute on function public.seed_sample_leads_internal() from public, anon, authenticated;
grant execute on function public.lead_cost_for(uuid, date) to authenticated;
grant execute on function public.admin_set_weekly_cost(uuid, date, numeric) to authenticated;
grant execute on function public.admin_override_lead_cost(uuid, numeric) to authenticated;
grant execute on function public.admin_seed_sample_leads() to authenticated;
grant execute on function public.admin_clear_sample_leads() to authenticated;