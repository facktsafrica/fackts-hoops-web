-- FACKTS Africa Health Checkup Cup 2025 — complete historical competition seed.
-- Safe to rerun. Replaces only records created by this historical seed.

do $$
declare
  event_key constant text := 'fackts-africa-health-checkup-cup-2025';
begin
  update public.event_case_studies set
    title = 'FACKTS Africa Health Checkup Cup 2025',
    slug = 'fackts-africa-health-checkup-cup-2025',
    summary = 'A three-day men''s and women''s basketball tournament hosted at KMTC Upper Hill and documented by FACKTS Hoops.',
    venue = 'KMTC Upper Hill', location = 'Nairobi, Upper Hill', status = 'published',
    men_division = true, women_division = true, photo_count = greatest(photo_count, 500),
    is_public = true, updated_at = now()
  where event_id = event_key;

  -- Remove the earlier partial historical seed and rebuild it deterministically.
  delete from public.event_records
  where event_id = event_key and metadata->>'historical_seed_version' in ('1','complete-20260804');

  -- Correct earlier naming mistakes without deleting genuine manually-entered records.
  update public.event_records set title = 'Fun Society'
    where event_id = event_key and record_type = 'team' and lower(title) = 'facts society';
  update public.event_records set title = 'FACKTS Hoops'
    where event_id = event_key and record_type = 'team' and lower(title) in ('fackts wba','fackts nba','fackts africa');
  delete from public.event_records
    where event_id = event_key and record_type = 'team' and lower(title) in ('war dogs','wardogs');

  insert into public.event_records
    (event_id,record_type,title,division,team_name,details,status,is_public,sort_order,metadata)
  select event_key,'team',v.title,v.division,v.roster_summary,
    'Roster source: official tournament scoresheets supplied for the Health Checkup Cup.',
    'published',true,v.ord,
    jsonb_build_object('historical_seed_version','complete-20260804','roster_source',v.source,'roster_verified',true)
  from (values
    ('D Block Hoopers','Men','Official match roster captured',1,'Games 1 and 3 sheets'),
    ('Nairobi Chapel','Men','Official match roster captured',2,'Games 1 and 13 sheets'),
    ('Boys Odit','Men','Official match roster captured',3,'uploaded official scoresheets'),
    ('JBA','Men','Official match roster captured',4,'Games 2, 3 and 13 sheets'),
    ('Safe Spaces','Women','Official match roster captured',5,'uploaded official scoresheets'),
    ('Usiku SACCO','Women','Official match roster captured',6,'uploaded official scoresheets'),
    ('Outsiders','Men','Official match roster captured',7,'Games 4 and 14 sheets'),
    ('Eagles','Men','Official match roster captured',8,'uploaded official scoresheets'),
    ('Punishers','Men','Official match roster captured',9,'uploaded official scoresheets'),
    ('Kicks Kenya','Men','Official match roster captured',10,'uploaded official scoresheets'),
    ('Nuru','Women','Official match roster captured',11,'uploaded official scoresheets'),
    ('Tigers','Women','Official match roster captured',12,'uploaded official scoresheets'),
    ('Elites','Men','Official match roster captured',13,'uploaded official scoresheets'),
    ('Nexgen','Men','Official match roster captured',14,'Game 8 and knockout sheets'),
    ('Wizards','Men','Official match roster captured',15,'Game 8 sheet'),
    ('Eastside','Men','Official match roster captured',16,'Game 9 and knockout sheets'),
    ('Fun Society','Men','Official match roster captured',17,'Game 9 sheet'),
    ('FACKTS Hoops','Men','Official match roster captured',18,'Game 10 and knockout sheets'),
    ('Don Bosco / DP Savio','Men','Official match roster captured',19,'Game 10 sheet'),
    ('Aces','Women','Official match roster captured',20,'Game 11 and knockout sheets'),
    ('Holy Rams','Men','Official match roster captured',21,'Game 12 sheet'),
    ('Valhalla Brothers','Men','Registered; Day 2 walkover recorded',22,'Day 2 schedule')
  ) as v(title,division,roster_summary,ord,source)
  where not exists (select 1 from public.event_records e where e.event_id=event_key and e.record_type='team' and lower(e.title)=lower(v.title));

  -- Day 1, Day 2, and Day 3 in the exact supplied sequence.
  insert into public.event_records
    (event_id,record_type,title,subtitle,division,team_name,opponent_name,score_for,score_against,status,is_public,sort_order,metadata)
  select event_key,'result',v.a||' '||v.sa||'–'||v.sb||' '||v.b,
    'Day '||v.day||' • Game '||v.game_no,v.round,v.a,v.b,v.sa,v.sb,'verified',true,v.ord,
    jsonb_build_object('historical_seed_version','complete-20260804','day',v.day,'game_number',v.game_no,'round',v.round,'walkover',v.walkover,'winner',case when v.sa>v.sb then v.a when v.sb>v.sa then v.b else 'Draw' end)
  from (values
    (1,1,1,'Group stage','D Block Hoopers','Nairobi Chapel',18,25,false),
    (1,2,2,'Group stage','Boys Odit','JBA',29,22,false),
    (1,3,3,'Group stage','Safe Spaces','Usiku SACCO',18,30,false),
    (1,4,4,'Group stage','Outsiders','Eagles',16,27,false),
    (1,5,5,'Group stage','Punishers','Kicks Kenya',10,28,false),
    (1,6,6,'Group stage','Nuru','Tigers',11,4,false),
    (1,7,7,'Group stage / forfeit','War Dogs','Elites',23,33,false),
    (1,8,8,'Group stage','Nexgen','Wizards',27,25,false),
    (1,9,9,'Group stage','Eastside','Fun Society',20,22,false),
    (1,10,10,'Group stage','FACKTS Hoops','Don Bosco / DP Savio',17,10,false),
    (1,11,11,'Group stage','Aces','Usiku SACCO',13,14,false),
    (1,12,12,'Group stage','Holy Rams','Elites',17,25,false),
    (1,13,12,'Group stage','Safe Spaces','Nuru',24,10,false),
    (1,14,13,'Group stage','JBA','Nairobi Chapel',30,10,false),
    (1,15,14,'Group stage','Outsiders','Kicks Kenya',15,15,false),
    (2,1,101,'Group stage','Elites','Wizards',35,23,false),
    (2,2,102,'Group stage','Eastside','Valhalla Brothers',20,0,true),
    (2,3,103,'Group stage','JBA','D Block Hoopers',31,15,false),
    (2,4,104,'Group stage','Outsiders','Kicks Kenya',10,7,false),
    (2,5,105,'Group stage','Nuru','Usiku SACCO',15,31,false),
    (2,6,106,'Group stage','Nexgen','Holy Rams',26,20,false),
    (2,7,107,'Group stage','Eagles','Punishers',16,0,false),
    (2,8,108,'Group stage','Aces','Tigers',17,3,false),
    (2,9,109,'Group stage','Boys Odit','D Block Hoopers',30,16,false),
    (2,10,110,'Group stage','FACKTS Hoops','Fun Society',19,16,false),
    (2,11,111,'Group stage / forfeit','War Dogs','Holy Rams',20,0,true),
    (2,12,112,'Group stage','Outsiders','Punishers',18,12,false),
    (2,13,113,'Group stage','Eagles','Kicks Kenya',23,3,false),
    (2,14,114,'Group stage / forfeit','War Dogs','Nexgen',0,20,true),
    (2,15,115,'Group stage','Nuru','Aces',23,26,false),
    (2,16,116,'Group stage','Boys Odit','Nairobi Chapel',24,15,false),
    (2,17,117,'Group stage','Usiku SACCO','Tigers',27,12,false),
    (2,18,118,'Group stage','Aces','Safe Spaces',11,21,false),
    (3,1,201,'Quarterfinal','Elites','JBA',25,24,false),
    (3,2,202,'Quarterfinal','Eastside','Eagles',28,25,false),
    (3,3,203,'Quarterfinal','Nexgen','Boys Odit',31,32,false),
    (3,4,204,'Quarterfinal','FACKTS Hoops','Outsiders',28,19,false),
    (3,5,205,'Women semifinal','Usiku SACCO','Nuru',19,15,false),
    (3,6,206,'Men semifinal','Elites','Eastside',40,22,false),
    (3,7,207,'Men quarterfinal','FACKTS Hoops','Fun Society',25,22,false),
    (3,8,208,'Women semifinal','Safe Spaces','Aces',32,35,false),
    (3,9,209,'Men semifinal','FACKTS Hoops','Nexgen',12,28,false),
    (3,10,210,'Women final','Aces','Usiku SACCO',22,31,false),
    (3,11,211,'Men final','Elites','Nexgen',40,34,false)
  ) as v(day,game_no,ord,round,a,b,sa,sb,walkover);

  -- Champions.
  insert into public.event_records(event_id,record_type,title,subtitle,details,division,status,is_public,sort_order,metadata)
  values
    (event_key,'award','Men''s Champions','Elites','Defeated Nexgen 40–34 in the men''s final.','Men','published',true,1,jsonb_build_object('historical_seed_version','complete-20260804')),
    (event_key,'award','Women''s Champions','Usiku SACCO','Defeated Aces 31–22 in the women''s final.','Women','published',true,2,jsonb_build_object('historical_seed_version','complete-20260804'));
end $$;
