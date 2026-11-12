begin;

set local lock_timeout = '5s';

-- Preserve existing check-in history when a building or floor is retired.
-- This forward migration also updates databases that applied the original
-- BE-003 migration with cascading foreign keys. Use is_active to deactivate.
alter table public.floors
  drop constraint floors_location_id_fkey,
  add constraint floors_location_id_fkey
    foreign key (location_id) references public.locations(id) on delete restrict;

alter table public.checkins
  drop constraint checkins_floor_id_fkey,
  add constraint checkins_floor_id_fkey
    foreign key (floor_id) references public.floors(id) on delete restrict;

notify pgrst, 'reload schema';

commit;
