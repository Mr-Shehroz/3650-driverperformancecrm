-- File: supabase/migrations/20261026100000_pre_trip_wash.sql
-- (NEW file)
-- =========================================================
-- Truck wash is now part of the pre-trip:
-- "Has this truck been washed since the last trip?" Yes / No
-- Yes = clean-truck photo (required) + receipt (optional).
-- Saving the pre-trip also saves the wash in the same step, so the truck's
-- last wash date, wash history, overdue flag and scoring work as before.
-- =========================================================

alter table public.pre_trips
  add column washed boolean not null default false,
  add column wash_photo_path text,
  add column wash_receipt_path text;

alter table public.pre_trips
  add constraint pre_trips_wash_check check (
    (washed and wash_photo_path is not null)
    or (not washed and wash_photo_path is null and wash_receipt_path is null)
  );

-- Which pre-trip a wash came from (null for washes logged the old way)
alter table public.truck_washes
  add column pre_trip_id uuid unique references public.pre_trips(id);

-- After a pre-trip: open a ticket per flagged item, update the truck,
-- and log the wash when the driver answered "Yes"
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