# 🚀 Panduan Deploy Amanda Brownies ke Cloudflare Pages

Dokumentasi ini menjelaskan langkah-langkah lengkap untuk melakukan deployment proyek **Amanda Brownies (React + Vite)** ke **Cloudflare Pages**.

---

## 📁 File Konfigurasi yang Telah Disiapkan

Proyek ini telah dikonfigurasi secara optimal untuk Cloudflare Pages:

| File | Fungsi |
| :--- | :--- |
| [`public/_redirects`](./public/_redirects) | Penanganan SPA routing (`/* /index.html 200`). Menjamin halaman seperti `/admin` atau rute lain tidak 404 saat di-refresh. |
| [`public/_headers`](./public/_headers) | Header keamanan (`X-Frame-Options`, `nosniff`, dsb.) dan pengaturan Cache HTTP jangka panjang untuk asset statis di `/assets/*`. |
| [`wrangler.toml`](./wrangler.toml) | Konfigurasi CLI Cloudflare Pages / Wrangler. |
| [`.gitignore`](./.gitignore) | Mencegah file kredensial `.env` dan direktori cache `.wrangler` terunggah ke Git. |
| [`package.json`](./package.json) | Menambahkan skrip helper `cf:build` dan `cf:deploy`. |

---

## ⚙️ Variabel Lingkungan (Environment Variables)

Sebelum melakukan deploy, siapkan nilai variabel berikut (dapat dilihat pada file `.env` atau `.env.example`):

| Variabel | Keterangan | Contoh Nilai |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | URL endpoint Supabase | `https://fywzoiqmlxwbnkvordxu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key (Client) | `sb_publishable_...` |

*(Opsional: `VITE_WAHA_URL` dan `VITE_WAHA_API_KEY` jika menggunakan integrasi WAHA secara langsung via env)*

---

## 🌟 Metode 1: Deploy Otomatis via Git (Direkomendasikan)

Metode ini paling direkomendasikan karena setiap kali Anda melakukan `git push`, Cloudflare Pages akan otomatis mem-build dan memperbarui website Anda.

### Langkah-langkah:
1. **Push Proyek ke Repository Git**:
   Pastikan kode proyek sudah di-push ke GitHub atau GitLab.

2. **Masuk ke Dashboard Cloudflare**:
   - Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) dan login.
   - Pilih menu **Workers & Pages** di bilah navigasi kiri.
   - Klik tombol **Create** > pilih tab **Pages** > klik **Connect to Git**.

3. **Pilih Repository**:
   - Hubungkan akun GitHub/GitLab Anda dan pilih repository proyek ini.

4. **Konfigurasi Build Settings**:
   - **Project name**: `amanda-brownies` (atau sesuai keinginan)
   - **Production branch**: `main` (atau `master`)
   - **Framework preset**: Pilih **`Vite`**
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: Kosongkan (atau `/`)

5. **Tambahkan Environment Variables**:
   - Klik **Environment variables (advanced)**.
   - Tambahkan variabel:
     - `VITE_SUPABASE_URL` = *(isi URL Supabase Anda)*
     - `VITE_SUPABASE_ANON_KEY` = *(isi Anon Key Supabase Anda)*
     - `NODE_VERSION` = `20` (atau `22`)

6. **Deploy**:
   - Klik **Save and Deploy**.
   - Tunggu proses build selesai (~1-2 menit).
   - Website Anda langsung aktif di domain gratis `https://[nama-projek].pages.dev`.

---

## 💻 Metode 2: Deploy Langsung via CLI (Wrangler)

Jika Anda ingin langsung melakukan upload dari komputer lokal tanpa menghubungkan ke Git:

### Langkah-langkah:
1. **Login ke Cloudflare via Terminal**:
   ```bash
   npx wrangler login
   ```
   *(Browser akan terbuka untuk konfirmasi otorisasi akun Cloudflare Anda)*

2. **Build Proyek**:
   ```bash
   npm run build
   ```

3. **Deploy ke Cloudflare Pages**:
   ```bash
   npm run cf:deploy
   ```
   *Atau jalankan perintah spesifik:*
   ```bash
   npx wrangler pages deploy dist --project-name=amanda-brownies
   ```

4. **Atur Environment Variables di Dashboard**:
   Jika menggunakan CLI, masuk ke dashboard Cloudflare:
   - Buka **Workers & Pages** > klik nama proyek Anda.
   - Buka tab **Settings** > **Environment variables**.
   - Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.

---

## 🌐 Menghubungkan Custom Domain

1. Di dashboard Cloudflare Pages, buka proyek Anda.
2. Klik tab **Custom domains**.
3. Klik tombol **Set up a custom domain**.
4. Masukkan nama domain Anda (misal: `amanda.domainanda.com`).
5. Ikuti petunjuk DNS CNAME otomatis yang disediakan Cloudflare (aktif dengan SSL gratis).

---

## 🔍 Verifikasi Setelah Deploy

Setelah deploy selesai, periksa:
1. **Halaman Utama**: Akses URL `pages.dev` Anda dan pastikan landing page, banner promo, dan katalog produk tampil dengan benar.
2. **SPA Refresh Test**: Buka rute `/admin` atau rute lain, lalu tekan **F5 / Refresh**. Berkat `_redirects`, halaman akan tetap termuat tanpa error 404.
3. **Koneksi Supabase**: Pastikan data katalog produk dan outlet berhasil ditarik dari database Supabase (tidak ada error di inspect browser console).
