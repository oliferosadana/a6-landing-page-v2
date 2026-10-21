-- ==========================================================
-- TABEL DATABASE KONFIGURASI WAHA (WHATSAPP HTTP API)
-- Amanda Brownies Balikpapan - Platform Management
-- ==========================================================

-- 1. Buat Tabel waha_config jika belum ada
CREATE TABLE IF NOT EXISTS public.waha_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    server_url TEXT NOT NULL DEFAULT 'http://143.198.219.167:3000',
    api_key TEXT DEFAULT '',
    session_name TEXT NOT NULL DEFAULT 'default',
    admin_phone TEXT DEFAULT '6281241075981',
    auto_notify_admin_new BOOLEAN DEFAULT true,
    auto_notify_cs_new BOOLEAN DEFAULT false,
    auto_notify_cs_progress BOOLEAN DEFAULT true,
    auto_notify_cs_resolved BOOLEAN DEFAULT true,
    mock_mode BOOLEAN DEFAULT false,
    sender_name TEXT DEFAULT 'Amanda Brownies Balikpapan',
    templates JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Nonaktifkan Row Level Security (RLS) agar dapat diakses dari Admin Panel
ALTER TABLE public.waha_config DISABLE ROW LEVEL SECURITY;

-- 3. Masukkan Data Konfigurasi Default (Seed)
INSERT INTO public.waha_config (
    id,
    server_url,
    api_key,
    session_name,
    admin_phone,
    auto_notify_admin_new,
    auto_notify_cs_new,
    auto_notify_cs_progress,
    auto_notify_cs_resolved,
    mock_mode,
    sender_name,
    updated_at
) VALUES (
    'default',
    'http://143.198.219.167:3000',
    '',
    'default',
    '6281241075981',
    true,
    false,
    true,
    true,
    false,
    'Amanda Brownies Balikpapan',
    now()
) ON CONFLICT (id) DO UPDATE SET
    server_url = EXCLUDED.server_url,
    admin_phone = EXCLUDED.admin_phone,
    updated_at = now();
