-- ==========================================================
-- SEED DATA OUTLETS & BOOTHS (Amanda Brownies)
-- Siap dijalankan langsung di Supabase Dashboard > SQL Editor
-- ==========================================================

-- 1. Pastikan kolom pendukung tersedia
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS grab_url text;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS gofood_url text;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS shopeefood_url text;

-- 2. Upsert data outlet beserta booth counters
INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417474', 'Amanda Brownies Balikpapan', 'Balikpapan', 'Kota Balikpapan', 'Jl. MT Haryono No. 15, RT. 45, Kel. Damai, Balikpapan Selatan', '+6281241075981', '6281241075981', '07.00 - 22.00 WITA', 'https://www.google.com/maps/search/?api=1&query=Amanda%20Brownies%20Balikpapan%20Balikpapan', '', '', '', '1.0 km', '[{"id":"bth-1791633417673","wa":"6289675668175","name":"Point Sales Balikpapan - Karang Anyar","hours":"07.00 - 21.00 WITA","status":"Tersedia","grabUrl":"https://maps.app.goo.gl/9iiSM3kTeTUrX56t9","mapsUrl":"https://maps.app.goo.gl/9iiSM3kTeTUrX56t9","location":"Lantai Dasar Depan Informa / ACE Hardware"},{"id":"bth-1791633417774","wa":"62895385964263","name":"Point Sales Balikpapan - Manggar","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/w36rqSjBLAcvJmCL7","location":"Rest Area & Convenience SPBU"},{"id":"bth-1791633417875","wa":"6287872639025","name":"Point Sales Balikpapan - Sepinggan","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/KsScBdW8nnDdUEe7A","location":"RT 02 No.78, baru Sel, Jl. Ruhui Rahayu II, Sepinggan, Kecamatan Balikpapan Selatan, Kota Balikpapan, Kalimantan Timur 76115"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417478', 'Amanda Brownies Rapak Balikpapan', 'Balikpapan', 'Kota Balikpapan', 'Jl. Soekarno Hatta Km.2,5, No.96, Batu Ampar, Balikpapan Utara, Balikpapan City, East Kalimantan 76125', '+6282148048956', '6282148048956', '07.00 - 22.00 WITA', 'https://www.google.com/maps/search/?api=1&query=Amanda%20Brownies%20Rapak%20Balikpapan%20Balikpapan', '', '', '', '1.0 km', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417480', 'Amanda Brownies Samarinda', 'Samarinda', 'Kota Samarinda', 'Jl. Jenderal Ahmad Yani No.11, RT.18, Sungai Pinang, Kec. Samarinda Utara, Kota Samarinda, Kalimantan Timur 75117', '+6282155108713', '6282155108713', '07.00 - 22.00 WITA', 'https://www.google.com/maps/search/?api=1&query=Amanda%20Brownies%20Samarinda%20Samarinda', '', '', '', '1.0 km', '[{"id":"bth-1791633418174","wa":"6285165126643","name":"Point Sales Samarinda - SPBU Juanda","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/dfDM8rdaf1qSoztSA","location":"G48J+WRR, Air Hitam, Samarinda Ulu, Samarinda City, East Kalimantan, Indonesia"},{"id":"bth-1791633418275","wa":"6283877731007","name":"Point Sales Samarinda - Bhayangkara","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/y6ntNprpsBbrLRCW7","location":"Jl. Bhayangkara No.21, RT.004, Dadi Mulya, Kec. Samarinda Kota, Kota Samarinda, Kalimantan Timur 75242"},{"id":"bth-1791633418376","wa":"6285133814042","name":"Point Sales Samarinda - Loa Janan","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/TbTVB77zU6dhf8ba9","location":"Jl. Bung Tomo No.7, Sungai Keledang, Kec. Samarinda Seberang, Kota Samarinda, Kalimantan Timur 75242, Indonesia"},{"id":"bth-1791633418477","wa":"628134365613","name":"Point Sales Samarinda - Slamet Riyadi","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/GfEkW1ZhJNCDFMFt9","location":"Jl. Slamet Riyadi No.34, Tlk. Lerong Ulu, Kec. Sungai Kunjang, Kota Samarinda, Kalimantan Timur 75127"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417485', 'Amanda Samarinda Sebrang', 'Samarinda', 'Kota Samarinda', 'Jl. Bung Tomo No.7, Sungai Keledang, Kec. Samarinda Seberang, Kota Samarinda, Kalimantan Timur 75242', '+6282155108714', '6282155108714', '07.00 - 22.00 WITA', 'https://maps.app.goo.gl/mfvC84fTHY651Qa29', '', '', '', '1.0 km', '[{"id":"bth-1791633418674","wa":"6285194169832","name":"Point Sales Samarinda Sebrang - Palaran","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/nMwCkz7QDXC7hpAu6","location":"C5GH+GC4, Jl. Ampera, Rw. Makmur, Kec. Palaran, Kota Samarinda, Kalimantan Timur, Indonesia"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417487', 'Amanda Brownies Bontang', 'Bontang', 'Kota Bontang', 'Jl. MT. Haryono No.9, Api-Api, Kec. Bontang Utara, Kota Bontang, Kalimantan Timur 75325', '+6285245563469', '6285245563469', '07.00 - 22.00 WITA', 'https://www.google.com/maps/search/?api=1&query=Amanda%20Brownies%20Bontang%20Bontang', '', '', '', '1.0 km', '[{"id":"bth-1791633418874","wa":"6282254415770","name":"Point Sales Bontang - Sangatta","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.google.com/?cid=15044556716721119291","location":"Teluk Lingga, Sangatta Utara, East Kutai Regency, East Kalimantan 75683"},{"id":"bth-1791633418975","wa":"6289508135740","name":"Point Sales Bontang - Tanjung Laut","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.google.com/?cid=17738360774721580777","location":"Jalan WR. Supratman RT.27 Kel. Tanjung Laut Kec. Bontang Selatan Bontang"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417490', 'Amanda Brownies Banjarbaru', 'Banjarbaru', 'Kota Banjarbaru', 'Jl. A. Yani No.Km 34, Loktabat Utara, Kec. Banjarbaru Utara, Kota Banjar Baru, Kalimantan Selatan 70714', '+6281254184019', '6281254184019', '07.00 - 22.00 WITA', 'https://www.google.com/maps/search/?api=1&query=Amanda%20Brownies%20Banjarbaru%20Banjarbaru', '', '', '', '1.0 km', '[{"id":"bth-1791633419174","wa":"6285252477051","name":"Point Sales Banjarbaru - Landasan Ulin","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.google.com/?cid=12149999054557274581","location":"Jl. Ahmad Yani KM. 25, Kel. Syamsudin Noor, Kec. Landasan Ulin Banjarbaru"},{"id":"bth-1791633419275","wa":"62895335520156","name":"Point Sales Banjarbaru - Martapura","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.google.com/?cid=3556083070827758146","location":"Jl. Ahmad Yani No.KM 39, Cindai Alus, Kec. Martapura, Kabupaten Banjar, Kalimantan Selatan 70611"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417493', 'Amanda Brownies Banjarmasin', 'Banjarmasin', 'Kota Banjarmasin', 'Jl. Kuripan No.2, Kuripan, Kec. Banjarmasin Tim., Kota Banjarmasin, Kalimantan Selatan 70122', '+6281255333876', '6281255333876', '07.00 - 22.00 WITA', 'https://www.google.com/maps/search/?api=1&query=Amanda%20Brownies%20Banjarmasin%20Banjarmasin', '', '', '', '1.0 km', '[{"id":"bth-1791633419474","wa":"6285705003915","name":"Point Sales Banjarmasin - Kayu Tangi","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/QULDYHHkFFezeKx6A","location":"Alalak Utara, Banjarmasin Utara, Banjarmasin City, South Kalimantan 70123"},{"id":"bth-1791633419575","wa":"62895374029965","name":"Point Sales Banjarmasin - Pelaihari","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/Fit6XhP4cuqHk3Fg8","location":"Jl. H. Boejasin No.9, Angsau, Kec. Pelaihari, Kabupaten Tanah Laut, Kalimantan Selatan 70814, Indonesia"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417496', 'Amanda Brownies Palangkaraya', 'Palangkaraya', 'Kota Palangkaraya', 'Jl. G. Obos No.15 Kav. 5, Menteng, Kec. Jekan Raya, Kota Palangka Raya, Kalimantan Tengah 74874', '+6281256221450', '6281256221450', '07.00 - 22.00 WIB', 'https://maps.app.goo.gl/BHMvyh8ynMzJanab8', '', '', '', '1.0 km', '[{"id":"bth-1791633419774","wa":"6289512290604","name":"Point Sales Palangkaraya - Tjilik Riwut","hours":"07.00 - 21.00 WIB","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/oVHhxCwzsX3QXH1g8","location":"Jl. Cilik Riwut No.KM 2, Palangka, Kec. Jekan Raya, Kota Palangka Raya, Kalimantan Tengah 73111"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417498', 'Amanda Brownies Tenggarong', 'Tenggarong', 'Kota Balikpapan', 'Jl. K.H. Ahmad Muksin No.RT.06, Timbau, Kec. Tenggarong, Kabupaten Kutai Kartanegara, Kalimantan Timur 75513', '+6282155086503', '6282155086503', '07.00 - 22.00 WITA', 'https://www.google.com/maps/search/?api=1&query=Amanda%20Brownies%20Tenggarong%20Tenggarong', '', '', '', '1.0 km', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417499', 'Amanda Brownies Batulicin', 'Batulicin', 'Kota Balikpapan', 'HXPP+J5 Baroqah, Tanah Bumbu Regency, South Kalimantan, Indonesia', '+6285385391867', '6285385391867', '07.00 - 22.00 WITA', 'https://www.google.com/maps/search/?api=1&query=Amanda%20Brownies%20Batulicin%20Batulicin', '', '', '', '1.0 km', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417500', 'Amanda Brownies Tanjung Tbl', 'Tanjung Tabalong', 'Kota Balikpapan', 'Dekat Tugu Obor, Jl. A. Yani, Mabuun, Kec. Tj., Kabupaten Tabalong, Kalimantan Selatan 71571', '+6289512460352', '6289512460352', '07.00 - 22.00 WITA', 'https://www.google.com/maps/search/?api=1&query=Amanda%20Brownies%20Tanjung%20Tbl%20Tanjung%20Tabalong', '', '', '', '1.0 km', '[{"id":"bth-1791633420174","wa":"6282254205891","name":"Point Sales Tanjung - Barabai","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/m7C9jmMkZDVrSTbB7","location":"C98G+4VF, Jl. H. Moh. Syarkawi, Barabai Utara, Kec. Barabai, Kabupaten Hulu Sungai Tengah, Kalimantan Selatan 71352, Indonesia"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

INSERT INTO public.outlets (id, name, city, region, address, phone, wa, hours, maps_url, grab_url, gofood_url, shopeefood_url, distance, booths)
VALUES ('out-bpn-1791633417502', 'Amanda Brownies Tanah Grogot', 'Tanah Grogot', 'Kota Tanah Grogot', 'Jalan Gajah Mada RT. 07 RW.03 Kec. Tanah Grogot, Kab. Paser Kalimantan Timur', '+6282358037883', '6282358037883', '07.00 - 22.00 WITA', 'https://maps.app.goo.gl/W6BdTh3cRGhA9de46', '', '', '', '1.0 km', '[{"id":"bth-1791633420374","wa":"6282358037893","name":"Point Sales Tanah Grogot - Babulu","hours":"07.00 - 21.00 WITA","status":"Tersedia","mapsUrl":"https://maps.app.goo.gl/5zQC6c2UznKrGtEk8","location":"Jl. Penajam Kuaro RT. 03 Labangka. Kec. Babulu Kab. PPU"},{"id":"bth-1792205052612","wa":"6281241100053","name":"Amanda Brownies RM Alam IKN Sepaku (Mitra)","hours":"08.00 - 21.00 WITA","mapsUrl":"https://maps.app.goo.gl/9W5Aiu94NyT274RQ9","location":"2PWQ+4MR, Bumi Harapan, Kec. Sepaku, Kabupaten Penajam Paser Utara, Kalimantan Timur 76147"},{"id":"bth-1792205259488","wa":"6281315330987","name":"Amanda Brownies SBR Frozen (Mitra)","hours":"08.00 - 21.00 WITA","mapsUrl":"https://maps.app.goo.gl/QC7owbmb1AP1RN1t5","location":"JMR6+VPM, Jl. Penajam-Kuaro, Petung, Penajam, Kabupaten Penajam Paser Utara, Kalimantan Timur 76143"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  wa = EXCLUDED.wa,
  hours = EXCLUDED.hours,
  maps_url = EXCLUDED.maps_url,
  grab_url = EXCLUDED.grab_url,
  gofood_url = EXCLUDED.gofood_url,
  shopeefood_url = EXCLUDED.shopeefood_url,
  distance = EXCLUDED.distance,
  booths = EXCLUDED.booths;

