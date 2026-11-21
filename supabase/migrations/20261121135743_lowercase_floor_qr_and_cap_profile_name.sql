begin;
set local lock_timeout = '5s';

update public.floors
set qr_code_id = pg_catalog.lower(qr_code_id)
where qr_code_id <> pg_catalog.lower(qr_code_id);

alter table public.floors
  add constraint floors_qr_code_id_lowercase
  check (qr_code_id = pg_catalog.lower(qr_code_id));

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  user_name text;
  user_avatar text;
begin
  user_name := coalesce(
    nullif(pg_catalog.btrim(pg_catalog.left(pg_catalog.btrim(new.raw_user_meta_data->>'name'), 50)), ''),
    nullif(pg_catalog.btrim(pg_catalog.left(pg_catalog.btrim(new.raw_user_meta_data->>'full_name'), 50)), ''),
    nullif(pg_catalog.left(pg_catalog.split_part(new.email, '@', 1), 50), ''),
    'user'
  );
  user_avatar := case
    when new.raw_user_meta_data->>'avatar_url' ~* '^https?://'
      then new.raw_user_meta_data->>'avatar_url'
    when new.raw_user_meta_data->>'picture' ~* '^https?://'
      then new.raw_user_meta_data->>'picture'
  end;

  insert into public.users (auth_id, name, email, avatar_url, points)
  values (new.id, user_name, new.email, user_avatar, 0)
  on conflict (auth_id) do update set
    name = excluded.name,
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
