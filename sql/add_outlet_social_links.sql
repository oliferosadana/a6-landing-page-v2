-- ==============================================================
-- MIGRATION: ADD SOCIAL MEDIA LINKS TO OUTLETS TABLE
-- Amanda Brownies Balikpapan
-- ==============================================================

-- 1. Tambahkan kolom instagram_url, tiktok_url, threads_url jika belum ada
ALTER TABLE public.outlets
ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS tiktok_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS threads_url TEXT DEFAULT '';

-- 2. Berikan komentar dokumentasi kolom
COMMENT ON COLUMN public.outlets.instagram_url IS 'Tautan profil Instagram spesifik cabang/outlet (opsional, fallback ke akun utama)';
COMMENT ON COLUMN public.outlets.tiktok_url IS 'Tautan profil TikTok spesifik cabang/outlet (opsional, fallback ke akun utama)';
COMMENT ON COLUMN public.outlets.threads_url IS 'Tautan profil Threads spesifik cabang/outlet (opsional, fallback ke akun utama)';

-- 3. Reload cache schema Supabase agar langsung terbaca di REST API
NOTIFY pgrst, 'reload schema';
