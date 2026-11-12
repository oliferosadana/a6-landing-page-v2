-- ==============================================================
-- MIGRATION: ADD SORT ORDER TO PROMOS TABLE
-- Amanda Brownies Balikpapan
-- ==============================================================

-- 1. Tambahkan kolom sort_order pada tabel public.promos jika belum ada
ALTER TABLE public.promos 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 1;

-- 2. Dokumentasi kolom
COMMENT ON COLUMN public.promos.sort_order IS 'Urutan prioritas tampil flyer promo (1 = posisi paling depan/atas)';

-- 3. Reload cache skema Supabase agar REST API langsung mengenali kolom baru
NOTIFY pgrst, 'reload schema';

