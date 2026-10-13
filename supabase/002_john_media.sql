-- John's uploads: photos, short videos and links that John, his mom or Dixon add from the site.
-- Files live in a PRIVATE storage bucket. Every function below is callable only by the
-- service role, i.e. only by the plan-media edge function, which checks the plan token first.
-- Private by default; photos and links can be made public, uploaded videos never directly
-- (they can carry location metadata; Martha publishes a cleaned copy on request).
-- Remove: drop the jn_media_* functions and jn_plan_id, drop table johnplan.media, delete bucket john-media.

create table if not exists johnplan.media (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references johnplan.plans(id) on delete cascade,
  kind text not null check (kind in ('photo', 'video', 'link')),
  title text check (title is null or length(title) <= 200),
  note text check (note is null or length(note) <= 2000),
  url text check (url is null or (length(url) <= 2000 and url ~ '^https://')),
  path text check (path is null or length(path) <= 300),
  mime text check (mime is null or length(mime) <= 100),
  bytes bigint check (bytes is null or bytes between 0 and 52428800),
  width int, height int,
  taken date,
  is_public boolean not null default false,
  added_by text check (added_by is null or length(added_by) <= 40),
  created_at timestamptz not null default now(),
  check ((kind = 'link' and url is not null and path is null) or (kind <> 'link' and path is not null and url is null)),
  check (not (kind = 'video' and is_public)),
  check (kind <> 'photo' or path ~ '\.(jpg|png|webp)$'),
  check (kind <> 'video' or path ~ '\.(mp4|mov|webm)$')
);
create unique index if not exists media_path_uniq on johnplan.media (path) where path is not null;
create index if not exists media_plan_idx on johnplan.media (plan_id, created_at desc);
alter table johnplan.media enable row level security;
revoke all on johnplan.media from public, anon, authenticated;

-- Plan id for a token (used to build the storage folder).
create or replace function public.jn_plan_id(p_token text)
returns uuid language sql stable security definer set search_path = '' as $$
  select p.id from johnplan.plans p where p_token is not null and length(p_token) >= 32 and p.token = p_token;
$$;

create or replace function public.jn_media_list(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(m) - 'plan_id' order by coalesce(m.taken, m.created_at::date) desc, m.created_at desc), '[]'::jsonb)
  from johnplan.media m
  join johnplan.plans p on p.id = m.plan_id
  where p_token is not null and length(p_token) >= 32 and p.token = p_token;
$$;

create or replace function public.jn_media_add(p_token text, p_item jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plan uuid; v_row johnplan.media; v_kind text := p_item ->> 'kind'; v_path text := p_item ->> 'path';
  v_mime text; v_size bigint;
begin
  v_plan := public.jn_plan_id(p_token);
  if v_plan is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if v_kind is null or v_kind not in ('photo', 'video', 'link') then raise exception 'bad kind' using errcode = '22023'; end if;
  if v_kind <> 'link' then
    -- Files must sit in this plan's own folder.
    if v_path is null or v_path not like v_plan::text || '/%' or v_path ~ '\.\.' then
      raise exception 'bad path' using errcode = '22023';
    end if;
    -- Trust the stored object, not the client: the real type decides photo vs video.
    select o.metadata ->> 'mimetype', (o.metadata ->> 'size')::bigint into v_mime, v_size
      from storage.objects o where o.bucket_id = 'john-media' and o.name = v_path;
    if v_mime is null then raise exception 'not found' using errcode = 'P0002'; end if;
    if (v_mime like 'image/%') <> (v_kind = 'photo') then raise exception 'kind mismatch' using errcode = '22023'; end if;
  end if;
  insert into johnplan.media (plan_id, kind, title, note, url, path, mime, bytes, width, height, taken, is_public, added_by)
  values (
    v_plan, v_kind,
    nullif(left(p_item ->> 'title', 200), ''), nullif(left(p_item ->> 'note', 2000), ''),
    case when v_kind = 'link' then p_item ->> 'url' end,
    case when v_kind <> 'link' then v_path end,
    case when v_kind <> 'link' then v_mime end, case when v_kind <> 'link' then v_size end,
    (p_item ->> 'width')::int, (p_item ->> 'height')::int,
    (p_item ->> 'taken')::date,
    coalesce((p_item ->> 'is_public')::boolean, false) and v_kind <> 'video',
    nullif(left(p_item ->> 'added_by', 40), '')
  ) returning * into v_row;
  return to_jsonb(v_row) - 'plan_id';
end; $$;

create or replace function public.jn_media_update(p_token text, p_id uuid, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plan uuid; v_row johnplan.media;
begin
  v_plan := public.jn_plan_id(p_token);
  if v_plan is null then raise exception 'not found' using errcode = 'P0002'; end if;
  update johnplan.media m set
    title = case when p_patch ? 'title' then nullif(left(p_patch ->> 'title', 200), '') else m.title end,
    note = case when p_patch ? 'note' then nullif(left(p_patch ->> 'note', 2000), '') else m.note end,
    taken = case when p_patch ? 'taken' then (p_patch ->> 'taken')::date else m.taken end,
    is_public = case when p_patch ? 'is_public' then coalesce((p_patch ->> 'is_public')::boolean, false) and m.kind <> 'video' else m.is_public end
  where m.id = p_id and m.plan_id = v_plan
  returning * into v_row;
  if v_row.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
  return to_jsonb(v_row) - 'plan_id';
end; $$;

-- Returns the storage path to remove (null for links).
create or replace function public.jn_media_delete(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plan uuid; v_path text; v_found boolean;
begin
  v_plan := public.jn_plan_id(p_token);
  if v_plan is null then raise exception 'not found' using errcode = 'P0002'; end if;
  delete from johnplan.media m where m.id = p_id and m.plan_id = v_plan returning m.path, true into v_path, v_found;
  if v_found is null then raise exception 'not found' using errcode = 'P0002'; end if;
  return jsonb_build_object('path', v_path);
end; $$;

-- What the public Media page may show: public photos and links only.
create or replace function public.jn_media_public()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'title', m.title, 'url', m.url, 'path', m.path, 'width', m.width, 'height', m.height, 'taken', m.taken, 'created_at', m.created_at)
    order by coalesce(m.taken, m.created_at::date) desc), '[]'::jsonb)
  from johnplan.media m where m.is_public and m.kind in ('photo', 'link');
$$;

-- Total bytes in the bucket (upload cap) and files no row points to (abandoned uploads).
create or replace function public.jn_media_bucket_bytes()
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0) from storage.objects o where o.bucket_id = 'john-media';
$$;
create or replace function public.jn_media_orphans()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(o.name), '{}') from storage.objects o
  where o.bucket_id = 'john-media' and o.created_at < now() - interval '1 day'
    and not exists (select 1 from johnplan.media m where m.path = o.name);
$$;

do $$ declare f text; begin
  foreach f in array array['public.jn_plan_id(text)', 'public.jn_media_list(text)', 'public.jn_media_add(text, jsonb)', 'public.jn_media_update(text, uuid, jsonb)', 'public.jn_media_delete(text, uuid)', 'public.jn_media_public()', 'public.jn_media_bucket_bytes()', 'public.jn_media_orphans()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- Private bucket, 50 MB per file (the free-plan ceiling), images and videos only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('john-media', 'john-media', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
