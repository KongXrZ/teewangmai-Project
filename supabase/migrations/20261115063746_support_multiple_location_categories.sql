begin;

set local lock_timeout = '5s';

-- Preserve each existing category as one member; CSV category lists are parsed
-- before seeding. Blank legacy values use the owner-approved fallback.
alter table public.locations
  alter column category type text[] using (
    case when btrim(category) = '' then array['อาคารเรียน']::text[]
      else array[category]::text[] end
  );

comment on column public.locations.category is
  'Building categories. Approved import uses อาคารเรียน when the source category is blank.';

notify pgrst, 'reload schema';
commit;
