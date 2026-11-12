-- File: supabase/migrations/20261112100000_final_fixes.sql
-- (NEW file)
-- =========================================================
-- Final client fixes before approval:
-- 1. Marking a maintenance ticket Fixed (note + date fixed) clears the
--    truck's "Repair soon" / "Do not drive" tag once nothing else is open.
--    The ticket stays in the truck's maintenance history.
-- 2. A pre-trip marked "Repair soon" / "Do not drive" with no flagged item
--    still opens a ticket, so the tag can always be cleared.
-- 3. Leads with "test" in the customer name or lead source are left out
--    of every sales number.
-- =========================================================

-- ---------- 1. Date fixed on tickets ----------
alter table public.maintenance_tickets add column fixed_on date;

update public.maintenance_tickets
   set fixed_on = (updated_at at time zone 'America/New_York')::date
 where status = 'fixed' and fixed_on is null;

create or replace function public.stamp_ticket_update()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.status = 'fixed' then
    if coalesce(char_length(trim(new.fix_note)), 0) < 3 then
      raise exception 'Add a short note about the fix';
    end if;
    new.fixed_on := coalesce(new.fixed_on, (now() at time zone 'America/New_York')::date);
  else
    new.fixed_on := null;
  end if;
  -- Only status, fix note and date fixed can change
  if (new.truck_id, new.inspection_id, new.driver_id, new.item_key, new.notes, new.photo_paths, new.severity, new.created_at)
     is distinct from
     (old.truck_id, old.inspection_id, old.driver_id, old.item_key, old.notes, old.photo_paths, old.severity, old.created_at) then
    raise exception 'Only the ticket status can be changed';
  end if;
  return new;
end $$;

-- Keeps the truck's tag in step with its tickets.
-- Fixing can only lower the tag (to the worst ticket still open, or Safe).
-- Reopening raises it back to that ticket's level.
create or replace function public.sync_truck_status_from_tickets()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_worst public.truck_status;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'fixed' then
    select max(severity) into v_worst
      from public.maintenance_tickets
     where truck_id = new.truck_id and status <> 'fixed';
    update public.trucks
       set status = least(status, coalesce(v_worst, 'safe'::public.truck_status))
     where id = new.truck_id;
  elsif old.status = 'fixed' then
    update public.trucks
       set status = greatest(status, new.severity)
     where id = new.truck_id;
  end if;

  return new;
end $$;

drop trigger if exists tickets_sync_truck on public.maintenance_tickets;
create trigger tickets_sync_truck after update of status on public.maintenance_tickets
  for each row execute function public.sync_truck_status_from_tickets();

-- ---------- 2. Pre-trip: always a ticket when the truck isn't Safe ----------
create or replace function public.after_pre_trip_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_flagged boolean := false;
  v_severity public.truck_status :=
    case when new.truck_status = 'safe' then 'repair_soon'::public.truck_status else new.truck_status end;
begin
  for v_item in select * from jsonb_array_elements(new.items) loop
    if v_item->>'status' = 'attention' then
      v_flagged := true;
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

  -- Marked "Repair soon" / "Do not drive" without flagging an item
  if not v_flagged and new.truck_status <> 'safe' then
    insert into public.maintenance_tickets
      (truck_id, inspection_id, driver_id, item_key, notes, severity)
    values (new.truck_id, new.id, new.driver_id, 'general', nullif(trim(coalesce(new.notes, '')), ''), new.truck_status);
  end if;

  update public.trucks
     set status = new.truck_status,
         odometer = greatest(coalesce(odometer, 0), new.odometer),
         last_inspection_at = new.received_at_server
   where id = new.truck_id;

  if new.washed then
    insert into public.truck_washes
      (truck_id, driver_id, photo_path, receipt_path, captured_at_device,
       synced_offline, lat, lng, pre_trip_id)
    values
      (new.truck_id, new.driver_id, new.wash_photo_path, new.wash_receipt_path, new.captured_at_device,
       new.synced_offline, new.lat, new.lng, new.id);
    -- truck_washes' own trigger then updates the truck's last wash date
  end if;

  return new;
end $$;

-- Trucks already tagged with nothing left to fix: open a ticket from their
-- latest pre-trip, so admin can mark it fixed and clear the tag
insert into public.maintenance_tickets (truck_id, inspection_id, driver_id, item_key, notes, severity)
select t.id, p.id, p.driver_id, 'general', nullif(trim(coalesce(p.notes, '')), ''), t.status
  from public.trucks t
  join lateral (
    select id, driver_id, notes from public.pre_trips
     where truck_id = t.id
     order by received_at_server desc
     limit 1
  ) p on true
 where t.status <> 'safe'
   and not exists (
     select 1 from public.maintenance_tickets m where m.truck_id = t.id and m.status <> 'fixed'
   );

-- ---------- 3. Test leads ----------
alter table public.leads
  add column is_test boolean generated always as (
    (coalesce(raw->>'first_name', '') || ' ' ||
     coalesce(raw->>'last_name', '') || ' ' ||
     coalesce(raw->>'name', '') || ' ' ||
     coalesce(granot_source, '')) ~* 'test'
  ) stored;