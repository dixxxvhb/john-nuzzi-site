-- John's shared plan: one row per plan, reached only by its secret link token.
-- Lives in the figgg Supabase project, isolated in its own schema that the API does not expose.
-- Access is only through the two SECURITY DEFINER functions below, which require the token.
-- Remove completely with: drop function public.jn_plan_get(text); drop function public.jn_plan_apply(text, jsonb); drop function public.jn_plan_feed(text); drop schema johnplan cascade;

create schema if not exists johnplan;
revoke all on schema johnplan from public, anon, authenticated;

create table if not exists johnplan.plans (
  id uuid primary key default gen_random_uuid(),
  token text not null unique check (length(token) >= 32),
  -- Read-only key for the calendar feed, so a calendar URL can never be used to edit the plan.
  feed_token text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  rev bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table johnplan.plans enable row level security;
-- No policies on purpose: nobody reads or writes the table directly.
revoke all on johnplan.plans from public, anon, authenticated;

create or replace function public.jn_plan_get(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', p.name, 'data', p.data, 'rev', p.rev, 'updated_at', p.updated_at, 'feed', p.feed_token)
  from johnplan.plans p
  where p_token is not null and length(p_token) >= 32 and p.token = p_token;
$$;

-- Calendar feed: read-only, by the separate feed key. Returns only what the feed needs.
create or replace function public.jn_plan_feed(p_feed text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  -- Statuses only: notes never leave through the calendar link.
  select jsonb_build_object(
    'name', p.name,
    'saved', coalesce(p.data -> 'saved', '{}'::jsonb),
    'status', coalesce((select jsonb_object_agg(t.key, t.value -> 'status') from jsonb_each(case when jsonb_typeof(p.data -> 'track') = 'object' then p.data -> 'track' else '{}'::jsonb end) t where jsonb_typeof(t.value) = 'object' and t.value ? 'status'), '{}'::jsonb),
    'steps', coalesce(p.data -> 'steps', '{}'::jsonb))
  from johnplan.plans p
  where p_feed is not null and length(p_feed) >= 32 and p.feed_token = p_feed;
$$;

-- p_ops: [{"path": ["track","c:fsu","status"], "value": "Applying"}, {"path": ["saved","c:fsu"], "value": null}]
-- A null or missing value deletes the key. Paths are 2 to 4 short keys under an allowed top-level key.
create or replace function public.jn_plan_apply(p_token text, p_ops jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_data jsonb;
  v_op jsonb;
  v_path text[];
  v_val jsonb;
  v_n int;
  i int;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if p_ops is null or jsonb_typeof(p_ops) <> 'array' or jsonb_array_length(p_ops) = 0 or jsonb_array_length(p_ops) > 50 then
    raise exception 'bad ops' using errcode = '22023';
  end if;

  select p.id, p.data into v_id, v_data from johnplan.plans p where p.token = p_token for update;
  if v_id is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  for v_op in select * from jsonb_array_elements(p_ops) loop
    if jsonb_typeof(v_op) is distinct from 'object' or jsonb_typeof(v_op -> 'path') is distinct from 'array' then
      raise exception 'bad op' using errcode = '22023';
    end if;
    v_n := jsonb_array_length(v_op -> 'path');
    if v_n < 2 or v_n > 4 then
      raise exception 'bad path' using errcode = '22023';
    end if;
    select array_agg(x order by o) into v_path
      from jsonb_array_elements_text(v_op -> 'path') with ordinality as t(x, o);
    if v_path[1] not in ('saved', 'track', 'steps', 'kit', 'film') then
      raise exception 'bad path' using errcode = '22023';
    end if;
    for i in 1 .. v_n loop
      if v_path[i] is null or v_path[i] !~ '^[A-Za-z0-9:_.-]{1,120}$' or v_path[i] in ('__proto__', 'constructor', 'prototype') then
        raise exception 'bad key' using errcode = '22023';
      end if;
    end loop;

    v_val := v_op -> 'value';
    if v_val is null or v_val = 'null'::jsonb then
      v_data := v_data #- v_path;
    else
      if jsonb_typeof(v_val) not in ('string', 'boolean', 'number') then
        raise exception 'bad value' using errcode = '22023';
      end if;
      if jsonb_typeof(v_val) = 'string' and length(v_val #>> '{}') > 4000 then
        raise exception 'value too long' using errcode = '22023';
      end if;
      -- Make sure every parent object exists, then set the leaf.
      for i in 1 .. v_n - 1 loop
        if jsonb_typeof(v_data #> v_path[1:i]) is distinct from 'object' then
          v_data := jsonb_set(v_data, v_path[1:i], '{}'::jsonb, true);
        end if;
      end loop;
      v_data := jsonb_set(v_data, v_path, v_val, true);
    end if;
  end loop;

  if pg_column_size(v_data) > 262144 then
    raise exception 'plan too large' using errcode = '22023';
  end if;

  update johnplan.plans set data = v_data, rev = rev + 1, updated_at = now() where id = v_id;
  return public.jn_plan_get(p_token);
end;
$$;

revoke all on function public.jn_plan_get(text) from public;
revoke all on function public.jn_plan_apply(text, jsonb) from public;
revoke all on function public.jn_plan_feed(text) from public;
grant execute on function public.jn_plan_get(text) to anon, authenticated;
grant execute on function public.jn_plan_apply(text, jsonb) to anon, authenticated;
grant execute on function public.jn_plan_feed(text) to anon, authenticated;
