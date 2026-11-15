-- Approved KMUTT building and floor reference data, November 15, 2026.
-- Blank building categories use the approved classroom category; S7 is inactive.
-- CSV row numbers are not database IDs. Stable building codes preserve identity.
-- Re-running the seed updates building/floor metadata while preserving IDs,
-- existing QR identifiers and detail keys outside description.
begin;

set local lock_timeout = '5s';
lock table public.locations, public.floors in share row exclusive mode;

create temporary table building_seed_source (
  source_order integer generated always as identity,
  name text not null,
  category text[] not null,
  building text primary key,
  aliases text[] not null,
  gps_lat double precision not null,
  gps_lng double precision not null,
  image_url text,
  details jsonb not null,
  is_active boolean not null
) on commit drop;

insert into building_seed_source (
  name, category, building, aliases, gps_lat, gps_lng, image_url, details, is_active
) values
  ('อาคารศูนย์การเรียนรู้เพื่อการค้นพบ', array['อาคารเรียน']::text[], 'S1', array[]::text[], 13.6505028, 100.4925398, 'https://bgm.kmutt.ac.th/MapNavi/images/S1.JPG', '{}'::jsonb, true),
  ('อาคารจอดรถ', array['อาคารเรียน']::text[], 'S2', array[]::text[], 13.6503946, 100.4952814, 'https://bgm.kmutt.ac.th/MapNavi/images/S2.jpg', '{"description": "ร้านStarbucks,ร้านU-Store,ร้านkamu,โรงแรมHeliconia House,ร้านชาพันธ์ไทย,kmutt bookstore,ไปรษณีย์ไทย,"}'::jsonb, true),
  ('อาคารสถาบันนวัตกรรมการเรียนรู้เฉลิมพระเกียรติ 80 พรรษา มูลนิธิไทยคม', array['อาคารเรียน']::text[], 'S3', array['โรงเรียนดรุณสิกขาลัย']::text[], 13.6502741, 100.4949143, 'https://bgm.kmutt.ac.th/MapNavi/images/S3.jpg', '{"description": "โรงเรียนดรุณสิกขาลัย"}'::jsonb, true),
  ('อาคารวิศววัฒนะ', array['อาคารเรียน']::text[], 'S4', array[]::text[], 13.6504989, 100.4945675, 'https://bgm.kmutt.ac.th/MapNavi/images/S4.jpg', '{"description": "อาคารคณะวิศวกรรม"}'::jsonb, true),
  ('บ้านธรรมรักษา 2', array['หอพักนักศึกษา', 'โรงอาหาร']::text[], 'S5', array['หอชาย']::text[], 13.6494298, 100.494528, 'https://bgm.kmutt.ac.th/MapNavi/images/S5.jpg', '{"description": "หอชาย"}'::jsonb, true),
  ('บ้านธรรมรักษา 1', array['หอพักนักศึกษา', 'โรงอาหาร']::text[], 'S6', array['หอหญิง']::text[], 13.6489711, 100.494439, 'https://bgm.kmutt.ac.th/MapNavi/images/S6.jpg', '{"description": "หอหญิง"}'::jsonb, true),
  ('อาคารพัฒนาเด็กเล็ก มจธ.', array['อาคารเรียน']::text[], 'S7', array[]::text[], 13.6488101, 100.4941403, 'https://bgm.kmutt.ac.th/MapNavi/images/S7.jpg', '{"description": "ไม่ได้ใช้แล้ว"}'::jsonb, false),
  ('อาคารโรงประลองเทคโนโลยีและวัสดุ', array['อาคารเรียน']::text[], 'S8', array[]::text[], 13.6489281, 100.4939243, 'https://bgm.kmutt.ac.th/MapNavi/images/S8.jpg', '{}'::jsonb, true),
  ('อาคารเรียนและปฏิบัติการคณะพลังงาน สิ่งแวดล้อมและวัสดุ', array['อาคารเรียน']::text[], 'S9', array[]::text[], 13.6491329, 100.4934584, 'https://bgm.kmutt.ac.th/MapNavi/images/S9.jpg', '{}'::jsonb, true),
  ('อาคารสังคมสีเขียว มจธ.', array['อาคารเรียน']::text[], 'S10', array[]::text[], 13.6495431, 100.4936803, 'https://bgm.kmutt.ac.th/MapNavi/images/S10.jpg', '{}'::jsonb, true),
  ('อาคารเรียนรวม 5', array['อาคารเรียน']::text[], 'S11', array['CB5']::text[], 13.6493138, 100.4937349, 'https://bgm.kmutt.ac.th/MapNavi/images/S11.jpg', '{}'::jsonb, true),
  ('อาคารเรียนรวม 4', array['อาคารเรียน']::text[], 'S12', array['CB4']::text[], 13.6495133, 100.4926911, 'https://bgm.kmutt.ac.th/MapNavi/images/S12.jpg', '{}'::jsonb, true),
  ('อาคารเรียนรวม 3', array['อาคารเรียน']::text[], 'S13', array['CB3']::text[], 13.6498019, 100.4924514, 'https://bgm.kmutt.ac.th/MapNavi/images/S13.jpg', '{}'::jsonb, true),
  ('อาคารพระจอมเกล้าราชานุสรณ์ 190 ปี', array['โรงอาหาร']::text[], 'S14', array['KFC', 'Fitness', 'โรงยิม']::text[], 13.6502589, 100.4918115, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS27ZdZuFZxVITBDrbXmjRWYkvNziWB-DB-0DNKH7XpNAWFuQjg2ljZw5c&s=10', '{"description": "โรงอาหาร kfc ชั้นบนคือโรงยิม"}'::jsonb, true),
  ('อาคารภาควิชาวิศวกรรมเคมี', array['อาคารเรียน']::text[], 'S15', array[]::text[], 13.6502915, 100.492802, 'https://www.kmutt.ac.th/wp-content/uploads/2025/11/%E0%B8%A7%E0%B8%A8.%E0%B9%80%E0%B8%84%E0%B8%A1%E0%B8%B5-%E0%B8%A1%E0%B8%88%E0%B8%98-3-1200x675.jpg', '{"description": "มีอาคาร 2 หลัง มีหลังที่เป็น 3 ชั้น กับ 5 ชั้น"}'::jsonb, true),
  ('อาคารศูนย์ต้อนรับ', array['อาคารเรียน']::text[], 'N1', array[]::text[], 13.6512506, 100.4950131, 'https://sustainable.kmutt.ac.th/wp-content/uploads/2019/09/p1100104-1024x768.jpg', '{}'::jsonb, true),
  ('อาคารสำนักงานอธิการบดี', array['อาคารเรียน']::text[], 'N2', array[]::text[], 13.6518228, 100.4949922, 'https://bgm.kmutt.ac.th/MapNavi/images/N2.jpg', '{}'::jsonb, true),
  ('อาคารภาควิชาเคมี', array['อาคารเรียน']::text[], 'N3', array[]::text[], 13.6525383, 100.4950401, 'https://bgm.kmutt.ac.th/MapNavi/images/N3.jpg', '{"description": "common เคมี"}'::jsonb, true),
  ('อาคารภาควิชาฟิสิกส์-คณิตศาสตร์', array['อาคารเรียน']::text[], 'N4', array[]::text[], 13.6525278, 100.4946001, 'https://bgm.kmutt.ac.th/MapNavi/images/N4.jpg', '{"description": "common ฟิสิกส์"}'::jsonb, true),
  ('อาคารศูนย์เครื่องมือวิทยาศาสตร์เพื่อมาตรฐานและอุตสาหกรรม', array['อาคารเรียน']::text[], 'N5', array[]::text[], 13.6521959, 100.493678, 'https://bgm.kmutt.ac.th/MapNavi/images/N5.jpg', '{}'::jsonb, true),
  ('อาคารภาควิชาจุลชีววิทยา', array['อาคารเรียน']::text[], 'N6', array[]::text[], 13.6529273, 100.4940493, 'https://bgm.kmutt.ac.th/MapNavi/images/N6.jpg', '{"description": "common จุลชีววิทยา"}'::jsonb, true),
  ('อาคารปฏิบัติการพื้นฐานทางวิทยาศาสตร์', array['อาคารเรียน']::text[], 'N7', array[]::text[], 13.6535864, 100.4948851, 'https://bgm.kmutt.ac.th/MapNavi/images/N7.jpg', '{"description": "slope 200 จุได้ 200 คน ส่วน 600 ก็จุได้ 600 อ้างอิง https://today.line.me/th/v3/article/XY2lGek"}'::jsonb, true),
  ('สถานีสูบน้ำ', array['อาคารเรียน']::text[], 'N8', array[]::text[], 13.6538029, 100.4949892, 'https://bgm.kmutt.ac.th/MapNavi/images/N8.jpg', '{}'::jsonb, true),
  ('อาคารสถาบันวิทยาการหุ่นยนต์ภาคสนาม', array['อาคารเรียน']::text[], 'N9', array['FIBO']::text[], 13.6544504, 100.4943839, 'https://bgm.kmutt.ac.th/MapNavi/images/N9.jpg', '{}'::jsonb, true),
  ('อาคารสำนักหอสมุด', array['อาคารเรียน']::text[], 'N10', array[]::text[], 13.652718, 100.4938312, 'https://bgm.kmutt.ac.th/MapNavi/images/N10.jpg', '{}'::jsonb, true),
  ('อาคารคณะเทคโนโลยีสารสนเทศ', array['อาคารเรียน']::text[], 'N11', array['IT']::text[], 13.6524597, 100.4937621, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdATure_buaNq6xGzaDZ0aCmR11S4Z90V9Tbnhr1UzIY9Nhe3g6nMYZqpi&s=10', '{}'::jsonb, true),
  ('อาคารอเนกประสงค์', array['อาคารเรียน']::text[], 'N12', array[]::text[], 13.6521282, 100.493159, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2Ih3WoJkAWH2NWTi_jZ8L58ESzcpC96-cj-ptB27xhn_yho07sC8UyoM&s=10', '{}'::jsonb, true),
  ('อาคาร Workshop&Green House', array['อาคารเรียน']::text[], 'N13', array[]::text[], 13.6521331, 100.4929434, 'https://bgm.kmutt.ac.th/MapNavi/images/N13.jpg', '{}'::jsonb, true),
  ('อาคารไฟฟ้าแรงสูง', array['อาคารเรียน']::text[], 'N14', array[]::text[], 13.6518134, 100.4926522, 'https://bgm.kmutt.ac.th/MapNavi/images/N14.jpg', '{}'::jsonb, true),
  ('อาคารเรียนและปฏิบัติการทางศิลปศาสตร์', array['อาคารเรียน']::text[], 'N15', array[]::text[], 13.6519923, 100.4928838, 'https://bgm.kmutt.ac.th/MapNavi/images/N15.jpg', '{}'::jsonb, true),
  ('อาคารการเรียนรู้พหุวิทยาการ', array['อาคารเรียน']::text[], 'N16', array['LX']::text[], 13.6519924, 100.4943266, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFKxUA3uiEV0v5xOdb1Vuu2-zFAHYcHIwVnd4taqNluQX421wFwiN1O5Y&s=10', '{}'::jsonb, true),
  ('อาคารเรียนรวม 2', array['อาคารเรียน']::text[], 'N17', array['CB2']::text[], 13.6514908, 100.4938225, 'https://upload.wikimedia.org/wikipedia/commons/a/a1/KMUTT_N17_20220927.jpg?utm_source=th.wikipedia.org&utm_campaign=index&utm_content=original', '{"description": "ห้องคอม"}'::jsonb, true),
  ('อาคารปฏิบัติการทางวิศวกรรมอุตสาหการ 4', array['อาคารเรียน']::text[], 'N18', array[]::text[], 13.6512299, 100.4937239, 'https://bgm.kmutt.ac.th/MapNavi/images/N18.jpg', '{}'::jsonb, true),
  ('อาคารบัณฑิตวิทยาลัยการจัดการและนวัตกรรม(GMI)', array['อาคารเรียน']::text[], 'N19', array['GMI']::text[], 13.6511605, 100.4932442, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7uBKZ-zjUz-HBDAS8gQdSZjo9JFrSTXAUFAFqX53sekWtIG-nx17DnYs&s=10', '{}'::jsonb, true),
  ('อาคารเรียนรวม 1', array['อาคารเรียน']::text[], 'N20', array['CB1']::text[], 13.6514747, 100.4935029, 'https://bgm.kmutt.ac.th/MapNavi/images/N20.jpg', '{}'::jsonb, true);

update public.locations l
set name = s.name,
  category = s.category,
  aliases = s.aliases,
  gps_lat = s.gps_lat,
  gps_lng = s.gps_lng,
  image_url = s.image_url,
  details = (l.details - 'description') || s.details,
  is_active = s.is_active
from building_seed_source s
where l.building = s.building;

insert into public.locations (
  name, category, building, aliases, gps_lat, gps_lng, image_url, details, is_active
)
select s.name, s.category, s.building, s.aliases, s.gps_lat, s.gps_lng,
  s.image_url, s.details, s.is_active
from building_seed_source s
where not exists (select 1 from public.locations l where l.building = s.building)
order by s.source_order;

-- One CSV row supplies the total floor count for a building. Blank counts
-- expand to one floor. Capacity and floor activity apply to every expanded row.
create temporary table floor_seed_source (
  building text primary key,
  total_floor integer check (total_floor > 0),
  capacity integer check (capacity > 0),
  is_active boolean not null
) on commit drop;

insert into floor_seed_source (building, total_floor, capacity, is_active) values
  ('S1', 2, 100, true),
  ('S2', 14, 100, true),
  ('S3', 15, 100, true),
  ('S4', 11, 100, true),
  ('S5', 11, 100, true),
  ('S6', 11, 100, true),
  ('S7', 2, 100, true),
  ('S8', null, 100, true),
  ('S9', 6, 100, true),
  ('S10', null, 100, true),
  ('S11', 10, 100, true),
  ('S12', 9, 100, true),
  ('S13', 9, 100, true),
  ('S14', 4, 100, true),
  ('S15', 5, 100, true),
  ('N1', 2, 100, true),
  ('N2', 9, 100, true),
  ('N3', 5, 100, true),
  ('N4', 5, 100, true),
  ('N5', 5, 100, true),
  ('N6', 6, 100, true),
  ('N7', 9, 100, true),
  ('N8', null, 100, true),
  ('N9', 9, 100, true),
  ('N10', 5, 100, true),
  ('N11', 4, 100, true),
  ('N12', 7, 100, true),
  ('N13', 1, 100, true),
  ('N14', 1, 100, true),
  ('N15', 9, 100, true),
  ('N16', 15, 100, true),
  ('N17', 6, 100, true),
  ('N18', 1, 100, true),
  ('N19', 8, 100, true),
  ('N20', 5, 100, true);

do $$
begin
  if exists (
    select 1 from floor_seed_source s
    left join public.locations l on l.building = s.building
    where l.id is null
  ) then
    raise exception 'Every floor source must match an existing building code';
  end if;
end;
$$;

create temporary table expanded_floor_seed on commit drop as
select l.id as location_id, n.floor_number, n.floor_number::text as floor_name,
  s.capacity, s.is_active
from floor_seed_source s
join public.locations l on l.building = s.building
cross join lateral generate_series(1, coalesce(s.total_floor, 1)) as n(floor_number);

-- Updates preserve existing IDs and printable QR identifiers.
update public.floors f
set capacity = s.capacity, is_active = s.is_active
from expanded_floor_seed s
where f.location_id = s.location_id and f.floor_name = s.floor_name;

-- Initial empty-table imports start at 1. Existing floor identities are retained.
do $$
begin
  if not exists (select 1 from public.floors) then
    alter table public.floors alter column id restart with 1;
  end if;
end;
$$;

insert into public.floors (location_id, floor_name, capacity, qr_code_id, is_active)
select s.location_id, s.floor_name, s.capacity, gen_random_uuid()::text, s.is_active
from expanded_floor_seed s
where not exists (
  select 1 from public.floors f
  where f.location_id = s.location_id and f.floor_name = s.floor_name
)
order by s.location_id, s.floor_number;

commit;
