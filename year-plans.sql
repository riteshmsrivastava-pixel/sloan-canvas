-- Existing three-account exclusion, enforced on the private records API as well as sign-in.
create or replace function public.mf_year_access()
returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null
    and lower(coalesce(auth.jwt()->>'email','')) like '%@mit.edu'
    and encode(extensions.digest(lower(trim(coalesce(auth.jwt()->>'email',''))),'sha256'),'hex') not in (
      '3fcb1a583e682b7e713297b1abc151e5177290f280828cc8aa6b8856501d6448',
      'ad6cac907fefa0d85e67ac92a49303f75655da82fd1a46bcd8cc87fbb43fb08d',
      '11261b614b714919b6a77b2a0ab65a9028fe5509c3287f8a1bae4f6da6dd86e5');
$$;
revoke all on function public.mf_year_access() from public,anon;
grant execute on function public.mf_year_access() to authenticated;

-- Private whole-year records. Shared course enrollment behavior remains unchanged.
create table public.mf_degree_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.mf_degree_plans enable row level security;
revoke all on public.mf_degree_plans from anon, public;
grant select, insert, update on public.mf_degree_plans to authenticated;
create policy mf_degree_select on public.mf_degree_plans for select to authenticated using ((select auth.uid()) = user_id and (select public.mf_year_access()));
create policy mf_degree_insert on public.mf_degree_plans for insert to authenticated with check ((select auth.uid()) = user_id and (select public.mf_year_access()));
create policy mf_degree_update on public.mf_degree_plans for update to authenticated using ((select auth.uid()) = user_id and (select public.mf_year_access())) with check ((select auth.uid()) = user_id and (select public.mf_year_access()));

create or replace function public.mf_save_year_plan(plan_payload jsonb, expected_revision integer, shared_courses jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); next_revision integer;
begin
  if uid is null or not public.mf_year_access() then raise exception 'Access unavailable'; end if;
  if jsonb_typeof(plan_payload) <> 'object' or jsonb_typeof(plan_payload->'plan') <> 'array' or octet_length(plan_payload::text) > 1000000 then raise exception 'Invalid plan'; end if;
  if jsonb_typeof(shared_courses) <> 'array' or jsonb_array_length(shared_courses) > 1500 then raise exception 'Invalid courses'; end if;
  insert into public.mf_degree_plans (user_id, payload, revision)
    values (uid, plan_payload, 1)
  on conflict (user_id) do update set payload=excluded.payload,
    revision=public.mf_degree_plans.revision+1, updated_at=now()
    where public.mf_degree_plans.revision=expected_revision
  returning revision into next_revision;
  if next_revision is null then raise exception 'MF_CONFLICT'; end if;
  delete from public.mf_enrollments where user_id=uid;
  insert into public.mf_enrollments (user_id,course_id,title,half,sched,status)
    select uid, x->>'course_id', x->>'title', x->>'half', x->>'sched', x->>'status'
    from jsonb_array_elements(shared_courses) x;
  return next_revision;
end;
$$;
revoke all on function public.mf_save_year_plan(jsonb,integer,jsonb) from public,anon;
grant execute on function public.mf_save_year_plan(jsonb,integer,jsonb) to authenticated;
