begin;

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'avatars' and public and file_size_limit = 2097152
      and allowed_mime_types = array['image/jpeg', 'image/png']
  ) then
    raise exception 'Avatar bucket settings are incorrect';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into storage.objects (bucket_id, name, owner_id)
values ('avatars', '00000000-0000-0000-0000-00000000000a/own.png', '00000000-0000-0000-0000-00000000000a');

do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('avatars', '00000000-0000-0000-0000-00000000000b/other.png', '00000000-0000-0000-0000-00000000000a');
    raise exception 'User could write into another user folder';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
insert into storage.objects (bucket_id, name, owner_id)
values ('avatars', '00000000-0000-0000-0000-00000000000b/other.png', '00000000-0000-0000-0000-00000000000b');
set local role authenticated;

do $$
begin
  if (select count(*) from storage.objects where bucket_id = 'avatars') <> 1 then
    raise exception 'User can list another user avatar objects';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_delete_own'
      and cmd = 'DELETE' and roles = array['authenticated']::name[]
      and qual like '%foldername%' and qual like '%auth.uid()%'
  ) then
    raise exception 'Avatar delete policy is missing or not owner-scoped';
  end if;
end;
$$;

select 'avatar storage rules ok' as result;
rollback;
