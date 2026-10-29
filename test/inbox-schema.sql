-- Apply once in the connected Supabase TEST project. No LIVE game changes.
begin;
create schema if not exists cs_private;
revoke all on schema cs_private from public;
grant usage on schema cs_private to anon, authenticated;
create table if not exists public.cs_report_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.cs_report_admins enable row level security;
revoke all on public.cs_report_admins from public, anon, authenticated;

create table if not exists public.cs_reports (
  id uuid primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('bug','idea','msg')),
  name text not null check (length(name)<=40),
  body text not null check (length(btrim(body)) between 1 and 2000),
  build text not null check (length(build)<=32),
  device text not null check (length(device)<=80),
  location text not null check (length(location)<=160),
  held text check (length(held)<=80),
  screenshot text check (screenshot is null or
    (length(screenshot)<=700000 and screenshot ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$')),
  read_at timestamptz,
  resolved boolean not null default false
);
create index if not exists cs_reports_created_idx on public.cs_reports(created_at desc,id desc);
alter table public.cs_reports enable row level security;
revoke all on public.cs_reports from public, anon, authenticated;

-- Only SQL/project administrators can edit the allowlist. Users cannot self-enroll.
create or replace function cs_private.is_report_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and
    exists(select 1 from public.cs_report_admins where user_id=(select auth.uid()));
$$;
revoke all on function cs_private.is_report_admin() from public, anon, authenticated;
grant execute on function cs_private.is_report_admin() to authenticated;
create or replace function public.cs_is_report_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select cs_private.is_report_admin();
$$;
revoke all on function public.cs_is_report_admin() from public, anon, authenticated;
grant execute on function public.cs_is_report_admin() to authenticated;
grant select on public.cs_reports to authenticated;
grant update(read_at,resolved) on public.cs_reports to authenticated;
drop policy if exists cs_reports_admin_read on public.cs_reports;
create policy cs_reports_admin_read on public.cs_reports for select to authenticated
using ((select public.cs_is_report_admin()));
drop policy if exists cs_reports_admin_update on public.cs_reports;
create policy cs_reports_admin_update on public.cs_reports for update to authenticated
using ((select public.cs_is_report_admin())) with check ((select public.cs_is_report_admin()));

-- Public callers can submit through this bounded function, but cannot read reports,
-- insert directly, modify report contents, or choose read/resolved status.
create or replace function cs_private.submit_report(report jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare report_id uuid;
begin
  if report is null or jsonb_typeof(report)<>'object' or octet_length(report::text)>750000 then
    raise exception 'Report is too large or invalid.';
  end if;
  report_id := (report->>'id')::uuid;
  if report_id is null then raise exception 'A report ID is required.'; end if;
  -- Serialize admission checks so simultaneous submissions cannot exceed the cap.
  perform pg_catalog.pg_advisory_xact_lock(1967001);
  -- Retry is idempotent. Never return existing contents or modify another report.
  if exists(select 1 from public.cs_reports where id=report_id) then return report_id; end if;
  if (select count(*) from public.cs_reports where created_at>now()-interval '1 hour')>=50
    or (select count(*) from public.cs_reports where created_at>now()-interval '1 day')>=200 then
    raise exception 'Report limit reached. Try again later.';
  end if;
  insert into public.cs_reports(id,kind,name,body,build,device,location,held,screenshot)
  values(report_id,report->>'kind',coalesce(report->>'name',''),report->>'text',
    coalesce(report->>'v',''),coalesce(report->>'dev',''),coalesce(report->>'where',''),
    report->>'held',report->>'img');
  return report_id;
end;
$$;
revoke all on function cs_private.submit_report(jsonb) from public, anon, authenticated;
grant execute on function cs_private.submit_report(jsonb) to anon, authenticated;
-- Only invoker wrappers are exposed through the public REST schema.
-- Submission deliberately supports unauthenticated players; the definer's sole
-- capability is a validated, rate-bounded insert, never reading report contents.
create or replace function public.cs_submit_report(report jsonb) returns uuid
language sql security invoker set search_path = '' as $$
  select cs_private.submit_report(report);
$$;
revoke all on function public.cs_submit_report(jsonb) from public, anon, authenticated;
grant execute on function public.cs_submit_report(jsonb) to anon, authenticated;
commit;

-- After creating your developer user in Supabase Authentication, run separately:
-- insert into public.cs_report_admins(user_id)
-- select id from auth.users where email='YOUR_DEVELOPER_EMAIL'
-- on conflict do nothing;
