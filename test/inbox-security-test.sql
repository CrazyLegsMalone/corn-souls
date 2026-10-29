-- Run AFTER inbox-schema.sql on a disposable TEST project. Everything rolls back.
begin;
insert into auth.users(id,email) values
 ('19670000-0000-4000-8000-000000000001','cs-inbox-admin@example.invalid'),
 ('19670000-0000-4000-8000-000000000002','cs-inbox-player@example.invalid');
insert into public.cs_report_admins(user_id) values('19670000-0000-4000-8000-000000000001');
set local role anon;
select public.cs_submit_report('{"id":"19670000-0000-4000-8000-000000000003","kind":"bug","text":"security test","name":"tester","v":"test"}');
-- Retry must succeed without adding another row or changing its contents.
select public.cs_submit_report('{"id":"19670000-0000-4000-8000-000000000003","kind":"bug","text":"replacement attempt"}');
do $$ begin
  begin perform count(*) from public.cs_reports; raise exception 'FAIL: anon can read reports';
  exception when insufficient_privilege then null; end;
  begin insert into public.cs_report_admins values('19670000-0000-4000-8000-000000000002');
    raise exception 'FAIL: anon can grant admin'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"19670000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  if public.cs_is_report_admin() then raise exception 'FAIL: player is admin'; end if;
  if (select count(*) from public.cs_reports)<>0 then raise exception 'FAIL: player can read reports'; end if;
  update public.cs_reports set resolved=true;
  if found then raise exception 'FAIL: player can update reports'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"19670000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  if not public.cs_is_report_admin() then raise exception 'FAIL: approved admin denied'; end if;
  if (select count(*) from public.cs_reports where id='19670000-0000-4000-8000-000000000003')<>1
    then raise exception 'FAIL: admin cannot read report'; end if;
  if (select body from public.cs_reports where id='19670000-0000-4000-8000-000000000003')<>'security test'
    then raise exception 'FAIL: duplicate overwrote report'; end if;
  update public.cs_reports set resolved=true,read_at=now() where id='19670000-0000-4000-8000-000000000003';
  if not found then raise exception 'FAIL: admin cannot update status'; end if;
  begin update public.cs_reports set body='tamper'; raise exception 'FAIL: admin can alter body';
    exception when insufficient_privilege then null; end;
end $$;
rollback;
