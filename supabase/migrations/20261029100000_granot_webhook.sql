-- File: supabase/migrations/20261029100000_granot_webhook.sql
-- (NEW file)
-- =========================================================
-- Granot webhook: every event Granot posts is saved here first
-- (raw, for checking and troubleshooting), then applied to leads.
-- =========================================================

create table public.granot_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  event_type text not null,              -- new_lead | booked | unbooked | priority | unknown
  job_number text,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'error')),
  message text,                          -- what happened, in plain words
  lead_id uuid references public.leads(id) on delete set null
);
create index granot_events_received_idx on public.granot_events (received_at desc);
create index granot_events_job_idx on public.granot_events (job_number);

-- Granot's own lead source text and rep name, kept on the lead
alter table public.leads
  add column granot_source text,
  add column granot_rep text;

-- The rep's name exactly as it appears in Granot (if it differs from their portal name)
alter table public.profiles
  add column granot_name text check (granot_name is null or char_length(granot_name) <= 80);

-- Only admins can read the event log; the webhook writes with the service key
alter table public.granot_events enable row level security;
create policy granot_events_admin_select on public.granot_events
  for select to authenticated using (public.is_admin());