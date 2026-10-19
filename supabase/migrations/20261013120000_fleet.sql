-- File: supabase/migrations/20261013120000_fleet.sql
-- (NEW file)
-- =========================================================
-- Fleet: trucks, pre-trip inspections, maintenance tickets,
-- roadside (DOT) inspections and driver scoring
-- =========================================================

create type public.truck_status as enum ('safe', 'repair_soon', 'do_not_drive');
create type public.ticket_status as enum ('open', 'in_progress', 'fixed');
create type public.roadside_result as enum ('clean', 'violations', 'out_of_service');

-- =========================================================
-- TRUCKS
-- =========================================================
create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  unit_number text not null check (char_length(unit_number) between 1 and 20),
  description text check (description is null or char_length(description) <= 120),
  plate text check (plate is null or char_length(plate) <= 20),
  active boolean not null default true,
  status public.truck_status not null default 'safe',   -- from the latest pre-trip
  odometer integer check (odometer is null or odometer >= 0),
  last_inspection_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index trucks_unit_number_key on public.trucks (lower(unit_number));

create trigger trucks_updated_at before update on public.trucks
  for each row execute function public.set_updated_at();

-- =========================================================
-- PRE-TRIP INSPECTIONS (locked once saved: no update/delete policies)
-- items = [{ "key": "tires", "status": "ok" | "attention", "notes": "...", "photos": ["path", ...] }, ...]
-- =========================================================
create table public.pre_trips (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id),
  driver_id uuid not null references public.profiles(id),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) = 6),
  odometer integer not null check (odometer between 0 and 5000000),
  truck_status public.truck_status not null,
  notes text check (notes is null or char_length(notes) <= 1000),
  signature_path text not null,
  captured_at_device timestamptz not null,
  received_at_server timestamptz not null default now(),
  synced_offline boolean not null default false,
  lat double precision,
  lng double precision
);
create index pre_trips_driver_idx on public.pre_trips (driver_id, received_at_server desc);
create index pre_trips_truck_idx on public.pre_trips (truck_id, received_at_server desc);

-- =========================================================
-- MAINTENANCE TICKETS (created only by the pre-trip trigger)
-- =========================================================
create table public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id),
  inspection_id uuid not null references public.pre_trips(id),
  driver_id uuid not null references public.profiles(id),
  item_key text not null,
  notes text,
  photo_paths text[] not null default '{}',
  severity public.truck_status not null,
  status public.ticket_status not null default 'open',
  fix_note text check (fix_note is null or char_length(fix_note) <= 500),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tickets_status_idx on public.maintenance_tickets (status, created_at desc);
create index tickets_truck_idx on public.maintenance_tickets (truck_id, created_at desc);

create or replace function public.stamp_ticket_update()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.status = 'fixed' and coalesce(char_length(trim(new.fix_note)), 0) < 3 then
    raise exception 'Add a short note about the fix';
  end if;
  -- Only status and fix note can change
  if (new.truck_id, new.inspection_id, new.driver_id, new.item_key, new.notes, new.photo_paths, new.severity, new.created_at)
     is distinct from
     (old.truck_id, old.inspection_id, old.driver_id, old.item_key, old.notes, old.photo_paths, old.severity, old.created_at) then
    raise exception 'Only the ticket status can be changed';
  end if;
  return new;
end $$;

create trigger tickets_stamp_update before update on public.maintenance_tickets
  for each row execute function public.stamp_ticket_update();

-- Server-controlled fields on a new pre-trip
create or replace function public.stamp_pre_trip_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.driver_id := auth.uid();
  end if;
  new.received_at_server := now();   -- never trust the phone's clock
  return new;
end $$;

create trigger pre_trips_stamp before insert on public.pre_trips
  for each row execute function public.stamp_pre_trip_insert();

-- After a pre-trip: open a ticket per flagged item and update the truck
create or replace function public.after_pre_trip_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_severity public.truck_status :=
    case when new.truck_status = 'safe' then 'repair_soon'::public.truck_status else new.truck_status end;
begin
  for v_item in select * from jsonb_array_elements(new.items) loop
    if v_item->>'status' = 'attention' then
      insert into public.maintenance_tickets
        (truck_id, inspection_id, driver_id, item_key, notes, photo_paths, severity)
      values (
        new.truck_id,
        new.id,
        new.driver_id,
        v_item->>'key',
        nullif(v_item->>'notes', ''),
        coalesce(array(select jsonb_array_elements_text(coalesce(v_item->'photos', '[]'::jsonb))), '{}'),
        v_severity
      );
    end if;
  end loop;

  update public.trucks
     set status = new.truck_status,
         odometer = greatest(coalesce(odometer, 0), new.odometer),
         last_inspection_at = new.received_at_server
   where id = new.truck_id;

  return new;
end $$;

create trigger pre_trips_after_insert after insert on public.pre_trips
  for each row execute function public.after_pre_trip_insert();

-- =========================================================
-- ROADSIDE (DOT) INSPECTIONS
-- =========================================================
create table public.roadside_inspections (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id),
  truck_id uuid not null references public.trucks(id),
  date date not null,
  state char(2) not null,
  location text not null check (char_length(location) between 2 and 120),
  result public.roadside_result not null,
  violation_notes text check (violation_notes is null or char_length(violation_notes) <= 1000),
  report_path text,
  report_name text check (report_name is null or char_length(report_name) <= 200),
  report_type text check (report_type is null or report_type in ('image', 'pdf')),
  logged_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (result = 'clean' or violation_notes is not null)
);
create index roadside_driver_idx on public.roadside_inspections (driver_id, date desc);
create index roadside_truck_idx on public.roadside_inspections (truck_id, date desc);

create or replace function public.stamp_roadside_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.driver_id := auth.uid();     -- drivers log their own inspections
  end if;
  new.logged_by := coalesce(auth.uid(), new.logged_by);
  new.created_at := now();
  return new;
end $$;

create trigger roadside_stamp before insert on public.roadside_inspections
  for each row execute function public.stamp_roadside_insert();

-- =========================================================
-- SCORING (stored in settings; readable by everyone signed in)
-- =========================================================
alter table public.settings
  add column scoring jsonb not null
  default '{"baseScore":100,"clean":5,"violations":-10,"outOfService":-25}';

create or replace function public.get_scoring()
returns jsonb
language sql stable security definer set search_path = public as $$
  select scoring from public.settings where id = 1
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.trucks enable row level security;
alter table public.pre_trips enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.roadside_inspections enable row level security;

-- Trucks: everyone signed in can see them; only admins manage them
create policy trucks_select on public.trucks
  for select to authenticated using (true);
create policy trucks_admin_insert on public.trucks
  for insert to authenticated with check (public.is_admin());
create policy trucks_admin_update on public.trucks
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pre-trips: drivers add and see their own; admins see all; nobody edits or deletes
create policy pre_trips_select on public.pre_trips
  for select to authenticated using (public.is_admin() or driver_id = auth.uid());
create policy pre_trips_insert on public.pre_trips
  for insert to authenticated
  with check (public.app_role() = 'driver' and driver_id = auth.uid());

-- Tickets: drivers see tickets from their own checks; admins see and update all
create policy tickets_select on public.maintenance_tickets
  for select to authenticated using (public.is_admin() or driver_id = auth.uid());
create policy tickets_admin_update on public.maintenance_tickets
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Roadside: drivers add and see their own; admins add and see all
create policy roadside_select on public.roadside_inspections
  for select to authenticated using (public.is_admin() or driver_id = auth.uid());
create policy roadside_insert on public.roadside_inspections
  for insert to authenticated
  with check (public.is_admin() or (public.app_role() = 'driver' and driver_id = auth.uid()));

-- =========================================================
-- STORAGE: private fleet bucket
--   pre_trip/<driver_id>/<file>   (checklist photos + driver signature)
--   roadside/<user_id>/<file>     (inspection reports, photo or PDF)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fleet',
  'fleet',
  false,
  15728640,  -- 15 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

create policy fleet_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fleet'
    and (storage.foldername(name))[1] in ('pre_trip', 'roadside')
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

create policy fleet_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fleet'
    and (
      public.is_admin()
      or (storage.foldername(name))[2] = auth.uid()::text
      -- a report an admin uploaded for this driver
      or exists (
        select 1 from public.roadside_inspections r
        where r.report_path = name and r.driver_id = auth.uid()
      )
    )
  );
-- No update/delete policies: fleet files can never be replaced or removed.

-- =========================================================
-- FUNCTION ACCESS
-- =========================================================
grant execute on function public.get_scoring() to authenticated;