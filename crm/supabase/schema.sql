-- Sunflow CRM database. Paste this whole file into Supabase -> SQL Editor -> Run. Safe to run again after updates.

create table if not exists public.records (
  id         text primary key,
  kind       text not null,
  data       jsonb not null,
  deleted    boolean not null default false,
  updated_at timestamptz not null
);

-- Allowed record types (customer, deal, task, note, campaign, staff, file, setting).
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('customer','deal','task','note','campaign','staff','file','setting'));

-- Who looks after a record (a staff id such as 'staff-name@company.com'). A customer's jobs, follow-ups, notes and files
-- all carry that customer's owner. Empty = not assigned yet: only admins and full staff can see it.
alter table public.records add column if not exists owner text;

create index if not exists records_updated_idx on public.records (updated_at);
create index if not exists records_kind_idx on public.records (kind);
create index if not exists records_owner_idx on public.records (owner);

alter table public.records enable row level security;

-- ---------------------------------------------------------------------------------------------------------------------
-- Roles (kept in the Team list inside the app):
--   admin    sees and does everything
--   staff    sees every customer; cannot change roles, settings or send specials
--   limited  sees ONLY customers assigned to them (and those customers' jobs, follow-ups, notes, photos and documents)
-- These functions look the signed-in person up by their login email.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.crm_role() returns text
language sql stable security definer set search_path = public as $$
  select r.data->>'role' from public.records r
  where r.kind = 'staff' and not r.deleted and lower(r.data->>'email') = lower(coalesce(auth.jwt()->>'email', ''))
  limit 1
$$;

create or replace function public.crm_staff_id() returns text
language sql stable security definer set search_path = public as $$
  select r.id from public.records r
  where r.kind = 'staff' and not r.deleted and lower(r.data->>'email') = lower(coalesce(auth.jwt()->>'email', ''))
  limit 1
$$;

-- Admin, or nobody has been made an admin yet (first-run setup, so the owner can never be locked out).
create or replace function public.crm_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.crm_role() = 'admin', false)
      or not exists (select 1 from public.records r where r.kind = 'staff' and not r.deleted and r.data->>'role' = 'admin')
$$;

create or replace function public.crm_sees_all() returns boolean
language sql stable security definer set search_path = public as $$
  select public.crm_is_admin() or coalesce(public.crm_role() = 'staff', false)
$$;

create or replace function public.crm_no_staff_yet() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.records r where r.kind = 'staff' and not r.deleted)
$$;

create or replace function public.crm_owns_customer(cid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.records r
    where r.kind = 'customer' and not r.deleted and r.id = cid and r.owner is not null and r.owner = public.crm_staff_id()
  )
$$;

-- These helpers are for signed-in staff only; anonymous visitors can't call them.
revoke execute on function public.crm_role(), public.crm_staff_id(), public.crm_is_admin(), public.crm_sees_all(),
                           public.crm_no_staff_yet(), public.crm_owns_customer(text) from public, anon;
grant execute on function public.crm_role(), public.crm_staff_id(), public.crm_is_admin(), public.crm_sees_all(),
                          public.crm_no_staff_yet(), public.crm_owns_customer(text) to authenticated;

-- Replace the earlier "everyone signed in sees everything" policies.
drop policy if exists "staff read" on public.records;
drop policy if exists "staff insert" on public.records;
drop policy if exists "staff update" on public.records;
drop policy if exists "crm read" on public.records;
drop policy if exists "crm insert" on public.records;
drop policy if exists "crm update" on public.records;

-- READ: the team list and settings are visible to everyone signed in (names, review links). Everything else: admins and
-- full staff see it all; a limited person sees only records they own.
create policy "crm read" on public.records for select to authenticated using (
  kind in ('staff', 'setting')
  or public.crm_sees_all()
  or owner = public.crm_staff_id()
);

-- WRITE (insert + update use the same test):
--   staff list / settings / specials history: admins only. The one exception: a person may add THEIR OWN team entry the first
--   time they sign in, but only as "limited" (or as the very first person ever, who becomes the admin).
--   everything else: admins and full staff; a limited person only for records they own (so they can't hand records to
--   someone else or take other people's).
create policy "crm insert" on public.records for insert to authenticated with check (
  case kind
    when 'staff' then
      public.crm_is_admin()
      or (lower(data->>'email') = lower(coalesce(auth.jwt()->>'email', ''))
          and (data->>'role' = 'limited' or public.crm_no_staff_yet()))
    when 'setting' then public.crm_is_admin()
    when 'campaign' then public.crm_is_admin()
    else public.crm_sees_all() or owner = public.crm_staff_id()
  end
);

create policy "crm update" on public.records for update to authenticated
using (
  case kind
    when 'staff' then public.crm_is_admin()
    when 'setting' then public.crm_is_admin()
    when 'campaign' then public.crm_is_admin()
    else public.crm_sees_all() or owner = public.crm_staff_id()
  end
)
with check (
  case kind
    when 'staff' then public.crm_is_admin()
    when 'setting' then public.crm_is_admin()
    when 'campaign' then public.crm_is_admin()
    else public.crm_sees_all() or owner = public.crm_staff_id()
  end
);
-- No delete policy: deletions are stored as deleted=true so every phone learns about them.

-- One-off tidy of existing data (safe to repeat): give each record the owner of its customer.
update public.records set owner = nullif(data->>'assignedTo', '')
 where kind = 'customer' and owner is null and nullif(data->>'assignedTo', '') is not null;

update public.records r set owner = c.owner
  from public.records c
 where r.kind in ('deal', 'task', 'note', 'file') and r.owner is null
   and c.kind = 'customer' and c.id = r.data->>'customerId' and c.owner is not null;

-- Secrets used by the server (the Xero connection). RLS on with no policies = nobody signed in can read it;
-- only the server's service-role key can.
create table if not exists public.private_settings (
  key   text primary key,
  value jsonb not null
);
alter table public.private_settings enable row level security;

-- Private storage for customer photos and documents. Not public: files are only reachable through short-lived signed links.
-- Files live at <customer id>/<file name>, so a limited person can open only files of customers they own.
insert into storage.buckets (id, name, public, file_size_limit)
values ('job-files', 'job-files', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;

drop policy if exists "staff read job files" on storage.objects;
drop policy if exists "staff add job files" on storage.objects;
drop policy if exists "staff delete job files" on storage.objects;

create policy "staff read job files" on storage.objects for select to authenticated using (
  bucket_id = 'job-files' and (public.crm_sees_all() or public.crm_owns_customer((storage.foldername(name))[1]))
);
create policy "staff add job files" on storage.objects for insert to authenticated with check (
  bucket_id = 'job-files' and (public.crm_sees_all() or public.crm_owns_customer((storage.foldername(name))[1]))
);
create policy "staff delete job files" on storage.objects for delete to authenticated using (
  bucket_id = 'job-files' and (public.crm_sees_all() or public.crm_owns_customer((storage.foldername(name))[1]))
);
