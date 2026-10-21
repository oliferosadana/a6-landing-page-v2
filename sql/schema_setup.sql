-- ==========================================================
-- SKEMA DATABASE AMANDA BROWNIES & PLATFORM MANAGEMENT
-- Siap Dijalankan di Supabase Dashboard > SQL Editor
-- ==========================================================

-- ----------------------------------------------------------
-- TABEL: public.outlet_categories
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outlet_categories (
id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    region text DEFAULT 'Kota Balikpapan'::text,
    icon text DEFAULT 'fa-solid fa-location-dot'::text,
    badge_color text DEFAULT 'olive'::text,
    description text,
    status text DEFAULT 'active'::text,
    sort_order integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.outlet_categories DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.outlets
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outlets (
id text NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    region text DEFAULT 'Kota Balikpapan'::text,
    image text,
    address text NOT NULL,
    phone text,
    wa text NOT NULL,
    hours text NOT NULL,
    maps_url text,
    distance text,
    booths jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.outlets DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.products
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    price numeric(12,2) NOT NULL,
    description text,
    image text NOT NULL,
    badge text,
    best_seller boolean DEFAULT false,
    stocks jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.promos
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promos (
id text NOT NULL,
    title text NOT NULL,
    badge text,
    badge_color text DEFAULT 'gold'::text,
    image text NOT NULL,
    period text,
    description text,
    wa_msg text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.promos DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.pricelists
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricelists (
id text NOT NULL,
    title text NOT NULL,
    badge text DEFAULT 'Price List'::text,
    image text NOT NULL,
    caption text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.pricelists DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.ticker
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticker (
id text NOT NULL,
    title text NOT NULL,
    text text NOT NULL,
    icon text DEFAULT 'fa-solid fa-bullhorn'::text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.ticker DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.cs_inquiries
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cs_inquiries (
id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    outlet_id text,
    outlet_name text,
    category text NOT NULL,
    receipt_number text,
    receipt_image text,
    receipt_images jsonb DEFAULT '[]'::jsonb,
    message text NOT NULL,
    rating integer DEFAULT 5,
    status text DEFAULT 'NEW'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.cs_inquiries DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.waha_config
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waha_config (
id text DEFAULT 'default'::text NOT NULL,
    server_url text DEFAULT 'http://143.198.219.167:3000'::text NOT NULL,
    api_key text DEFAULT ''::text,
    session_name text DEFAULT 'default'::text NOT NULL,
    admin_phone text DEFAULT '6281241075981'::text,
    auto_notify_admin_new boolean DEFAULT true,
    auto_notify_cs_new boolean DEFAULT false,
    auto_notify_cs_progress boolean DEFAULT true,
    auto_notify_cs_resolved boolean DEFAULT true,
    mock_mode boolean DEFAULT false,
    sender_name text DEFAULT 'Amanda Brownies Balikpapan'::text,
    templates jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.waha_config DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.waha_logs
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waha_logs (
id text NOT NULL,
    type text NOT NULL,
    recipient text,
    chat_id text,
    session text,
    status text NOT NULL,
    snippet text,
    error text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.waha_logs DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.tenants
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
id text NOT NULL,
    name text NOT NULL,
    city text,
    phone text NOT NULL,
    email text,
    domain text NOT NULL,
    plan_id text DEFAULT 'plan-6m'::text NOT NULL,
    plan_name text DEFAULT 'Paket Bisnis (6 Bulan)'::text NOT NULL,
    cycle text DEFAULT 'monthly'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    start_date date DEFAULT CURRENT_DATE,
    expires_at date NOT NULL,
    total_paid numeric(12,2) DEFAULT 0,
    outlets_count integer DEFAULT 1,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.invoices
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    due_date timestamp with time zone,
    tenant_name text NOT NULL,
    tenant_phone text,
    tenant_email text,
    tenant_domain text,
    plan_id text NOT NULL,
    plan_name text NOT NULL,
    duration_months integer DEFAULT 1,
    subtotal numeric(12,2) NOT NULL,
    unique_code integer DEFAULT 0,
    total_amount numeric(12,2) NOT NULL,
    payment_method_id text,
    payment_method_name text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    paid_at timestamp with time zone,
    PRIMARY KEY (id)
);

ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- TABEL: public.platform_settings
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (key)
);

ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;
