-- Sunflow CRM database. Paste this whole file into Supabase -> SQL Editor -> Run. Safe to run again after updates.

create table if not exists public.records (
  id         text primary key,
  kind       text not null,
  data       jsonb not null,
  deleted    boolean not null default false,
  updated_at timestamptz not null
);

-- Allowed record types (customer, deal, task, note, campaign, staff, file, setting). Replaces the older, shorter list.
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('customer','deal','task','note','campaign','staff','file','setting'));

create index if not exists records_updated_idx on public.records (updated_at);
create index if not exists records_kind_idx on public.records (kind);

alter table public.records enable row level security;

-- Only signed-in staff can read or write. Turn OFF "Allow new users to sign up" in
-- Authentication -> Sign In / Providers, and add each staff member yourself under Authentication -> Users.
drop policy if exists "staff read" on public.records;
drop policy if exists "staff insert" on public.records;
drop policy if exists "staff update" on public.records;

create policy "staff read"   on public.records for select to authenticated using (true);
create policy "staff insert" on public.records for insert to authenticated with check (true);
create policy "staff update" on public.records for update to authenticated using (true) with check (true);
-- No delete policy: deletions are stored as deleted=true so every phone learns about them.

-- Secrets used by the server (the Xero connection). RLS on with no policies = nobody signed in can read it;
-- only the server's service-role key can.
create table if not exists public.private_settings (
  key   text primary key,
  value jsonb not null
);
alter table public.private_settings enable row level security;

-- Private storage for customer photos and documents. Not public: files are only reachable through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit)
values ('job-files', 'job-files', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;

drop policy if exists "staff read job files" on storage.objects;
drop policy if exists "staff add job files" on storage.objects;
drop policy if exists "staff delete job files" on storage.objects;

create policy "staff read job files"   on storage.objects for select to authenticated using (bucket_id = 'job-files');
create policy "staff add job files"    on storage.objects for insert to authenticated with check (bucket_id = 'job-files');
create policy "staff delete job files" on storage.objects for delete to authenticated using (bucket_id = 'job-files');
