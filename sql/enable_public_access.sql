-- ==========================================================
-- SCRIPT PERMISSION & RLS POLICY UNTUK AKSES PUBLIK / ANON
-- Jalankan skrip ini di: Supabase Dashboard > SQL Editor > Run
-- ==========================================================

-- 1. Berikan hak akses penuh schema public untuk anon & authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 2. Pasang Policy Full Access (SELECT, INSERT, UPDATE, DELETE) untuk semua tabel public
DO $$ 
DECLARE 
    tbl RECORD;
BEGIN 
    FOR tbl IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        -- Aktifkan RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
        
        -- Hapus policy lama jika ada
        EXECUTE format('DROP POLICY IF EXISTS "Public full access" ON public.%I;', tbl.tablename);
        
        -- Buat policy baru yang mengizinkan anon & authenticated membaca dan menulis
        EXECUTE format('CREATE POLICY "Public full access" ON public.%I FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);', tbl.tablename);
    END LOOP;
END $$;
