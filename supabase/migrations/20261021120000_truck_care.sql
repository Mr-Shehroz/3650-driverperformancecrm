-- File: supabase/migrations/20261021120000_truck_care.sql
-- (NEW file)
-- =========================================================
-- Truck wash and condition tracking
--  * trucks: assigned driver + last wash time
--  * pre_trips: 5 required condition photos
--  * truck_washes: wash log (photo + optional receipt)
--  * wash_overdue_events: one per overdue period, counted in driver scoring
-- =========================================================

-- =========================================================
-- TRUCKS
-- =========================================================
alter table public.trucks
  add column assigned_driver_id uuid references public.profiles(id) on delete set null,
  add column last_washed_at timestamptz;

-- =========================================================
-- PRE-TRIP CONDITION PHOTOS
-- {"front": "path", "rear": "path", "driver_side": "path", "passenger_side": "path", "cab": "path"}
-- Required on every new pre-trip (older rows are left as they are).
-- =========================================================
alter table public.pre_trips
  add column condition_photos jsonb not null default '{}'::jsonb;

alter table public.pre_trips
  add constraint pre_trips_condition_photos_check
  check (condition_photos ?& array['front', 'rear', 'driver_side', 'passenger_side', 'cab'])
  not valid;

-- =========================================================
-- WASH LOG (locked once saved: no update/delete policies)
-- =========================================================
create table public.truck_washes (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id),
  driver_id uuid not null references public.profiles(id),
  photo_path text not null,
  receipt_path text,
  notes text check (notes is null or char_length(notes) <= 500),
  captured_at_device timestamptz not null,
  received_at_server timestamptz not null default now(),
  synced_offline boolean not null default false,
  lat double precision,
  lng double precision
);
create index truck_washes_truck_idx on public.truck_washes (truck_id, received_at_server desc);
create index truck_washes_driver_idx on public.truck_washes (driver_id, received_at_server desc);

create or replace function public.stamp_wash_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.driver_id := auth.uid();
  end if;
  new.received_at_server := now();   -- never trust the phone's clock
  return new;
end $$;

create trigger truck_washes_stamp before insert on public.truck_washes
  for each row execute function public.stamp_wash_insert();

-- The wash time used for "overdue" is when the driver took the photo
create or replace function public.after_wash_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.trucks
     set last_washed_at = greatest(
           coalesce(last_washed_at, '-infinity'::timestamptz),
           least(new.captured_at_device, new.received_at_server)
         )
   where id = new.truck_id;
  return new;
end $$;

create trigger truck_washes_after_insert after insert on public.truck_washes
  for each row execute function public.after_wash_insert();

-- =========================================================
-- OVERDUE WASHES
-- One row per overdue period of a truck. "since" = the wash (or the date the
-- truck was added) the period started from, so a period is only counted once,
-- even if the interval setting changes later.
-- =========================================================
create table public.wash_overdue_events (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id),
  driver_id uuid references public.profiles(id),   -- who is charged (null = nobody)
  since timestamptz not null,
  due_date date not null,
  excused boolean not null default false,          -- admin excused it: no points
  excused_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (truck_id, since)
);
create index wash_overdue_driver_idx on public.wash_overdue_events (driver_id, due_date desc);
create index wash_overdue_truck_idx on public.wash_overdue_events (truck_id, due_date desc);

-- Who is responsible for a truck: the assigned driver, or else the driver
-- who did its most recent pre-trip
create or replace function public.truck_responsible_driver(p_truck uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select assigned_driver_id from public.trucks where id = p_truck),
    (select driver_id from public.pre_trips where truck_id = p_truck
      order by received_at_server desc limit 1)
  )
$$;

-- Records an overdue event for every active truck that is past its wash date.
-- Safe to call any time (it never adds the same period twice).
create or replace function public.flag_overdue_washes()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_days integer;
  v_count integer;
begin
  select greatest(1, coalesce((scoring->>'washIntervalDays')::int, 14))
    into v_days from public.settings where id = 1;
  v_days := coalesce(v_days, 14);

  insert into public.wash_overdue_events (truck_id, driver_id, since, due_date)
  select t.id,
         public.truck_responsible_driver(t.id),
         coalesce(t.last_washed_at, t.created_at),
         (coalesce(t.last_washed_at, t.created_at) + make_interval(days => v_days))::date
    from public.trucks t
   where t.active
     and coalesce(t.last_washed_at, t.created_at) + make_interval(days => v_days) < now()
  on conflict (truck_id, since) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- =========================================================
-- SCORING: wash interval + overdue points (kept with the other scoring values)
-- =========================================================
alter table public.settings
  alter column scoring
  set default '{"baseScore":100,"clean":5,"violations":-10,"outOfService":-25,"washIntervalDays":14,"overdueWash":-5}';

update public.settings
   set scoring = '{"washIntervalDays":14,"overdueWash":-5}'::jsonb || scoring;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.truck_washes enable row level security;
alter table public.wash_overdue_events enable row level security;

-- Washes: drivers add and see their own; admins see all; nobody edits
create policy truck_washes_select on public.truck_washes
  for select to authenticated using (public.is_admin() or driver_id = auth.uid());
create policy truck_washes_insert on public.truck_washes
  for insert to authenticated
  with check (public.app_role() = 'driver' and driver_id = auth.uid());

-- Overdue events: drivers see their own; admins see all and can excuse one
create policy wash_overdue_select on public.wash_overdue_events
  for select to authenticated using (public.is_admin() or driver_id = auth.uid());
create policy wash_overdue_admin_update on public.wash_overdue_events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Admins can only excuse (never change the truck, driver or dates)
create or replace function public.stamp_overdue_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if (new.truck_id, new.driver_id, new.since, new.due_date, new.created_at)
     is distinct from (old.truck_id, old.driver_id, old.since, old.due_date, old.created_at) then
    raise exception 'Only "excused" can be changed';
  end if;
  new.excused_by := case when new.excused then auth.uid() else null end;
  return new;
end $$;

create trigger wash_overdue_stamp_update before update on public.wash_overdue_events
  for each row execute function public.stamp_overdue_update();

-- =========================================================
-- STORAGE: allow wash/<driver_id>/<file> in the fleet bucket
-- (condition photos go in pre_trip/<driver_id>/ like the other pre-trip photos)
-- =========================================================
drop policy if exists fleet_upload on storage.objects;
create policy fleet_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fleet'
    and (storage.foldername(name))[1] in ('pre_trip', 'roadside', 'wash')
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

-- =========================================================
-- FUNCTION ACCESS
-- =========================================================
revoke execute on function public.truck_responsible_driver(uuid) from public, anon;
grant execute on function public.truck_responsible_driver(uuid) to authenticated;
revoke execute on function public.flag_overdue_washes() from public, anon;
grant execute on function public.flag_overdue_washes() to authenticated;