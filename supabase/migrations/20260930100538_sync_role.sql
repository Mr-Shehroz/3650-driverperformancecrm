-- Keep profiles.role in sync with the role stored in the login token (app_metadata)
create or replace function public.sync_role_from_auth()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.raw_app_meta_data ? 'role'
     and (new.raw_app_meta_data->>'role') is distinct from (old.raw_app_meta_data->>'role') then
    update public.profiles
       set role = (new.raw_app_meta_data->>'role')::public.user_role
     where id = new.id;
  end if;
  return new;
end $$;

create trigger on_auth_user_role_changed
  after update of raw_app_meta_data on auth.users
  for each row execute function public.sync_role_from_auth();

-- Fix any existing users
update public.profiles p
set role = (u.raw_app_meta_data->>'role')::public.user_role
from auth.users u
where u.id = p.id
  and u.raw_app_meta_data ? 'role';