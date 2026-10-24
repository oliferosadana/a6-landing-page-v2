/**
 * WAHA (WhatsApp HTTP API) Service & Client for Amanda Brownies
 * Compatible with WAHA Core / WAHA Plus (devlike.pro/waha)
 * Provides Session Management, QR Code Pairing, Direct Messaging, Templates, and Auto-Notification.
 */

const STORAGE_KEY_CONFIG = 'amanda_waha_config';
const STORAGE_KEY_LOGS = 'amanda_waha_logs';
const STORAGE_KEY_MOCK_STATE = 'amanda_waha_mock_state';

export const DEFAULT_WAHA_CONFIG = {
  serverUrl: 'https://waha.oodana.my.id',
  apiKey: 'zNqV4kRkBjEymlCgNxTiKLWZw75EgNg',
  sessionName: 'default',
  mockMode: false,
  autoNotifyAdminNew: true, // Kirim notifikasi otomatis ke WhatsApp Admin saat ada form baru
  adminPhone: '6281253439968', // Nomor WhatsApp Admin penerima alert
  autoNotifyCsNew: true,
  autoNotifyCsProgress: true,
  autoNotifyCsResolved: true,
  senderName: 'Amanda Brownies Balikpapan'
};

export const WAHA_TEMPLATES = {
  admin_cs_alert: {
    id: 'admin_cs_alert',
    title: 'Pemberitahuan CS Baru (Untuk Admin)',
    category: 'Admin Alert',
    text: `🔔 *NOTIFIKASI PENGADUAN BARU (CS)* 🍫\n\nHalo Admin Amanda Brownies, ada tiket pengaduan baru dari pelanggan yang perlu ditindaklanjuti:\n\n📋 *No. Tiket*: #{{tiket}}\n👤 *Nama Pelanggan*: {{nama}}\n📞 *No. WhatsApp*: {{phone}}\n🏪 *Outlet/Cabang*: {{outlet}}\n🏷️ *Kategori*: {{kategori}}\n🧾 *No. Struk*: {{struk}}\n⭐ *Rating*: {{rating}} / 5\n💬 *Pesan/Kendala*:\n"{{pesan}}"\n\n⏰ *Waktu*: {{tanggal}}\n\nSilakan buka panel Admin Amanda untuk tindak lanjut segera. Terima kasih!`
  },
  cs_new: {
    id: 'cs_new',
    title: 'Notifikasi Tiket Diterima',
    category: 'Customer Service',
    text: `Halo Kak *{{nama}}*,\n\nTerima kasih telah menghubungi Layanan Pelanggan *Amanda Brownies Balikpapan*.\n\nPengaduan/pesan Kakak dengan nomor tiket *#{{tiket}}* untuk cabang *{{outlet}}* telah berhasil kami catat di sistem kami dan sedang diteruskan ke tim outlet.\n\nTim kami akan segera menindaklanjuti kendala Kakak. Mohon kesediaannya menunggu konfirmasi selanjutnya ya Kak.\n\nSalam hangat,\n*Amanda Brownies Official Balikpapan* 🍫✨`
  },
  cs_progress: {
    id: 'cs_progress',
    title: 'Update Tiket Sedang Diproses',
    category: 'Customer Service',
    text: `Halo Kak *{{nama}}*,\n\nKami ingin menginformasikan perkembangan penanganan tiket *#{{tiket}}* terkait cabang *{{outlet}}*.\n\nStatus saat ini: *Sedang Diproses oleh Tim Outlet* ⚙️\nCatatan Tindak Lanjut: {{catatan}}\n\nTim kami sedang mengupayakan solusi terbaik untuk Kakak. Terima kasih atas pengertian dan kesabaran Kakak.`
  },
  cs_resolved: {
    id: 'cs_resolved',
    title: 'Konfirmasi Tiket Selesai Ditangani',
    category: 'Customer Service',
    text: `Halo Kak *{{nama}}*,\n\nKabar baik! Laporan/kendala Kakak pada tiket *#{{tiket}}* di cabang *{{outlet}}* telah *berhasil diselesaikan* oleh tim kami. ✅\n\nPenjelasan / Solusi: {{catatan}}\n\nKami memohon maaf atas ketidaknyamanan yang sempat terjadi dan berterima kasih atas masukan berharga Kakak untuk peningkatan kualitas layanan Amanda Brownies.\n\nSelamat menikmati varian brownies favorit Kakak! 🍰💖`
  },
  order_catering: {
    id: 'order_catering',
    title: 'Konfirmasi Pesanan Acara / Katering',
    category: 'Pesanan & Outlet',
    text: `Halo Kak *{{nama}}*,\n\nTerima kasih telah mempercayakan momen istimewa Kakak bersama *Amanda Brownies Balikpapan*! 🎂\n\nPesanan Kakak untuk cabang *{{outlet}}* telah kami verifikasi.\n\nDetail Pesanan:\n{{catatan}}\n\nTim kami akan memastikan pesanan dikemas fresh dan siap tepat waktu. Untuk pertanyaan teknis pengantaran atau perubahan, silakan balas chat ini ya Kak.`
  },
  promo_flash: {
    id: 'promo_flash',
    title: 'Broadcast Promo & Voucher Amanda',
    category: 'Pemasaran & Promo',
    text: `Kabar Gembira untuk Warga Balikpapan! 🎉\n\nHalo Kak *{{nama}}*, nikmati promo spesial Amanda Brownies di seluruh cabang resmi Balikpapan hari ini!\n\n🍫 Diskon Spesial Varian Favorit\n📦 Ketersediaan Fresh dari Dapur Tiap Hari\n📍 Kunjungi outlet terdekat atau cek katalog lengkap di website kami.\n\nJangan lewatkan promo terbatas ini ya Kak! ✨`
  }
};

/**
 * Clean and format phone number for WhatsApp WAHA (must end in @c.us or international format)
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');

  if (cleaned.startsWith('08')) {
    cleaned = '628' + cleaned.slice(2);
  } else if (cleaned.startsWith('8')) {
    cleaned = '628' + cleaned.slice(1);
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }

  return cleaned;
}

export function formatChatId(phone) {
  const cleaned = formatPhoneNumber(phone);
  if (!cleaned) return '';
  return cleaned.includes('@c.us') ? cleaned : `${cleaned}@c.us`;
}

import { fetchWahaConfig, saveWahaConfigToSupabase } from './supabase.js';

/**
 * Get saved WAHA configuration
 */
export function getWahaConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Auto-migrate if local storage still has old localhost URL or old default phone
      if (parsed.serverUrl && (parsed.serverUrl.includes('localhost') || parsed.serverUrl.includes('127.0.0.1'))) {
        parsed.serverUrl = DEFAULT_WAHA_CONFIG.serverUrl;
        parsed.apiKey = parsed.apiKey || DEFAULT_WAHA_CONFIG.apiKey;
      }
      if (parsed.adminPhone === '6281241075981' && DEFAULT_WAHA_CONFIG.adminPhone) {
        parsed.adminPhone = DEFAULT_WAHA_CONFIG.adminPhone;
      }
      return { ...DEFAULT_WAHA_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Error reading WAHA config:', e);
  }
  return DEFAULT_WAHA_CONFIG;
}

/**
 * Load WAHA configuration from Supabase database and update local cache
 */
export async function initWahaConfigFromDb() {
  try {
    const dbConfig = await fetchWahaConfig();
    if (dbConfig) {
      const merged = { ...getWahaConfig(), ...dbConfig };
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
      return merged;
    }
  } catch (e) {
    console.warn('Failed to load WAHA config from DB:', e);
  }
  return getWahaConfig();
}

/**
 * Save WAHA configuration to local cache & Supabase database
 */
export function saveWahaConfig(config) {
  try {
    const merged = { ...getWahaConfig(), ...config };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
    // Asynchronously push to Supabase database
    saveWahaConfigToSupabase(merged).catch(err => {
      console.warn('Auto-sync WAHA config to Supabase skipped:', err);
    });
    return merged;
  } catch (e) {
    console.error('Error saving WAHA config:', e);
    return config;
  }
}

/**
 * Message Outbound Logs
 */
export function getOutboundLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading WAHA logs:', e);
  }
  return [];
}

export function logOutboundMessage(logEntry) {
  try {
    const logs = getOutboundLogs();
    const newEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      status: 'SENT',
      ...logEntry
    };
    const updated = [newEntry, ...logs].slice(0, 150); // keep last 150
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
    return newEntry;
  } catch (e) {
    console.error('Error writing WAHA log:', e);
  }
}

export function clearOutboundLogs() {
  localStorage.removeItem(STORAGE_KEY_LOGS);
}

// Helper to make WAHA HTTP calls with timeout and headers
async function wahaFetch(path, options = {}, customConfig = null) {
  const config = customConfig || getWahaConfig();
  let base = (config.serverUrl || 'http://localhost:3000').replace(/\/+$/, '');
  const url = `${base}${path.startsWith('/') ? path : '/' + path}`;

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (config.apiKey) {
    headers['X-Api-Key'] = config.apiKey;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeout || 6000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// -------------------------------------------------------------
// MOCK STATE HANDLER (FOR SIMULATION / DEMO MODE)
// -------------------------------------------------------------
function getMockState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOCK_STATE);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    status: 'WORKING', // 'WORKING' | 'SCAN_QR_CODE' | 'STOPPED'
    phone: '628115599881',
    pushName: 'Amanda Brownies Official',
    sessionName: 'default',
    battery: 94,
    platform: 'WAHA Plus v2026.4 (Docker Demo)'
  };
}

function setMockState(state) {
  try {
    const current = getMockState();
    const updated = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY_MOCK_STATE, JSON.stringify(updated));
    return updated;
  } catch (e) {}
}

/**
 * Generate simulated QR Code SVG string for mock mode
 */
export function generateMockQrSvg() {
  // SVG Mock QR Code with Amanda & WhatsApp styling
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" fill="%23ffffff" rx="12"/>
    <rect x="20" y="20" width="60" height="60" fill="%23231b14" rx="4"/>
    <rect x="30" y="30" width="40" height="40" fill="%23ffffff"/>
    <rect x="40" y="40" width="20" height="20" fill="%2325d366"/>
    
    <rect x="160" y="20" width="60" height="60" fill="%23231b14" rx="4"/>
    <rect x="170" y="30" width="40" height="40" fill="%23ffffff"/>
    <rect x="180" y="40" width="20" height="20" fill="%2325d366"/>
    
    <rect x="20" y="160" width="60" height="60" fill="%23231b14" rx="4"/>
    <rect x="30" y="170" width="40" height="40" fill="%23ffffff"/>
    <rect x="40" y="180" width="20" height="20" fill="%2325d366"/>
    
    <!-- Matrix dots -->
    <rect x="90" y="25" width="15" height="15" fill="%23231b14"/>
    <rect x="115" y="35" width="20" height="15" fill="%234f5b2a"/>
    <rect x="95" y="65" width="30" height="15" fill="%23231b14"/>
    <rect x="135" y="65" width="15" height="15" fill="%234f5b2a"/>
    <rect x="25" y="95" width="25" height="15" fill="%23231b14"/>
    <rect x="60" y="105" width="20" height="20" fill="%2325d366"/>
    <rect x="90" y="95" width="60" height="60" fill="%23231b14" rx="6"/>
    <circle cx="120" cy="125" r="16" fill="%2325d366"/>
    <text x="120" y="130" font-size="14" font-family="sans-serif" text-anchor="middle" fill="%23ffffff" font-weight="bold">AB</text>
    <rect x="160" y="95" width="25" height="25" fill="%23231b14"/>
    <rect x="195" y="105" width="25" height="15" fill="%234f5b2a"/>
    <rect x="95" y="165" width="30" height="20" fill="%23231b14"/>
    <rect x="135" y="175" width="25" height="20" fill="%234f5b2a"/>
    <rect x="170" y="165" width="20" height="25" fill="%23231b14"/>
    <rect x="200" y="185" width="20" height="35" fill="%2325d366"/>
    <rect x="95" y="200" width="25" height="20" fill="%23231b14"/>
    <rect x="130" y="205" width="35" height="15" fill="%23231b14"/>
  </svg>`;
}

// -------------------------------------------------------------
// CORE WAHA API METHODS
// -------------------------------------------------------------

/**
 * Check if WAHA server is reachable and get server info
 */
export async function checkWahaHealth(customConfig = null) {
  const config = customConfig || getWahaConfig();

  if (config.mockMode) {
    const mock = getMockState();
    return {
      connected: true,
      isMock: true,
      latencyMs: 18,
      version: 'v2026.4 (Mock/Demo Environment)',
      engine: 'WEBJS / NOWEB',
      sessionStatus: mock.status
    };
  }

  const startTime = Date.now();
  try {
    // Try /api/version or /api/status or /health
    let res;
    try {
      res = await wahaFetch('/api/version', { method: 'GET', timeout: 3500 }, config);
    } catch (e1) {
      try {
        res = await wahaFetch('/health', { method: 'GET', timeout: 3500 }, config);
      } catch (e2) {
        res = await wahaFetch('/api/status', { method: 'GET', timeout: 3500 }, config);
      }
    }

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { version: 'WAHA Gateway Running' };
      }
      return {
        connected: true,
        isMock: false,
        latencyMs,
        version: data.version || data.name || 'WAHA Core',
        engine: data.engine || 'Chromium WebJS',
        details: data
      };
    } else {
      return {
        connected: false,
        isMock: false,
        error: `Server merespon dengan status: ${res.status} ${res.statusText}`
      };
    }
  } catch (err) {
    return {
      connected: false,
      isMock: false,
      error: err.name === 'AbortError' 
        ? 'Koneksi timeout. Pastikan server WAHA aktif.' 
        : (err.message || 'Gagal terhubung ke host WAHA')
    };
  }
}

/**
 * Fetch all sessions from WAHA
 */
export async function getWahaSessions(customConfig = null) {
  const config = customConfig || getWahaConfig();

  if (config.mockMode) {
    const mock = getMockState();
    return [
      {
        name: mock.sessionName,
        status: mock.status,
        config: { noweb: { store: { enabled: true } } },
        me: mock.status === 'WORKING' ? {
          id: `${mock.phone}@c.us`,
          pushName: mock.pushName,
          battery: mock.battery
        } : null
      },
      {
        name: 'cs-balikpapan',
        status: 'STOPPED',
        me: null
      }
    ];
  }

  try {
    const res = await wahaFetch('/api/sessions?all=true', { method: 'GET', timeout: 4500 }, config);
    if (!res.ok) {
      // Fallback single session get
      const singleRes = await wahaFetch(`/api/sessions/${config.sessionName}`, { method: 'GET' }, config);
      if (singleRes.ok) {
        const item = await singleRes.json();
        return [item];
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [data];
  } catch (err) {
    console.warn('Could not fetch sessions list:', err);
    throw err;
  }
}

/**
 * Get single session details
 */
export async function getWahaSessionDetails(sessionName, customConfig = null) {
  const config = customConfig || getWahaConfig();
  const session = sessionName || config.sessionName || 'default';

  if (config.mockMode) {
    const mock = getMockState();
    return {
      name: session,
      status: mock.status,
      me: mock.status === 'WORKING' ? {
        id: `${mock.phone}@c.us`,
        pushName: mock.pushName,
        phone: mock.phone
      } : null
    };
  }

  try {
    const res = await wahaFetch(`/api/sessions/${session}`, { method: 'GET' }, config);
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw err;
  }
}

/**
 * Start a session
 */
export async function startWahaSession(sessionName, customConfig = null) {
  const config = customConfig || getWahaConfig();
  const session = sessionName || config.sessionName || 'default';

  if (config.mockMode) {
    setMockState({ status: 'WORKING' });
    return { name: session, status: 'WORKING', message: 'Simulasi sesi berhasil dimulai' };
  }

  try {
    // WAHA supports POST /api/sessions/start with { name: ... } or POST /api/sessions/${name}/start
    let res;
    try {
      res = await wahaFetch(`/api/sessions/${session}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }, config);
    } catch (e) {
      res = await wahaFetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: session })
      }, config);
    }

    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    throw new Error(errText || `Gagal memulai sesi (HTTP ${res.status})`);
  } catch (err) {
    throw err;
  }
}

/**
 * Stop a session
 */
export async function stopWahaSession(sessionName, customConfig = null) {
  const config = customConfig || getWahaConfig();
  const session = sessionName || config.sessionName || 'default';

  if (config.mockMode) {
    setMockState({ status: 'STOPPED' });
    return { name: session, status: 'STOPPED', message: 'Sesi dinonaktifkan (simulasi)' };
  }

  try {
    let res;
    try {
      res = await wahaFetch(`/api/sessions/${session}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }, config);
    } catch (e) {
      res = await wahaFetch('/api/sessions/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: session })
      }, config);
    }

    if (res.ok) return await res.json();
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw err;
  }
}

/**
 * Restart a session
 */
export async function restartWahaSession(sessionName, customConfig = null) {
  const config = customConfig || getWahaConfig();
  const session = sessionName || config.sessionName || 'default';

  if (config.mockMode) {
    setMockState({ status: 'WORKING' });
    return { name: session, status: 'WORKING', message: 'Sesi di-restart (simulasi)' };
  }

  try {
    let res;
    try {
      res = await wahaFetch(`/api/sessions/${session}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }, config);
    } catch (e) {
      res = await wahaFetch('/api/sessions/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: session })
      }, config);
    }

    if (res.ok) return await res.json();
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw err;
  }
}

/**
 * Logout session (disconnect WhatsApp)
 */
export async function logoutWahaSession(sessionName, customConfig = null) {
  const config = customConfig || getWahaConfig();
  const session = sessionName || config.sessionName || 'default';

  if (config.mockMode) {
    setMockState({ status: 'SCAN_QR_CODE' });
    return { name: session, status: 'SCAN_QR_CODE', message: 'WhatsApp logged out (simulasi)' };
  }

  try {
    const res = await wahaFetch(`/api/sessions/${session}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }, config);

    if (res.ok) return await res.json();
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw err;
  }
}

/**
 * Get QR Code (data URL or raw QR string)
 */
export async function getWahaQrCode(sessionName, customConfig = null) {
  const config = customConfig || getWahaConfig();
  const session = sessionName || config.sessionName || 'default';

  if (config.mockMode) {
    return {
      type: 'image',
      data: generateMockQrSvg(),
      raw: '2@amanda-mock-qr-code-session'
    };
  }

  try {
    // Attempt 1: GET /api/{session}/auth/qr
    const res = await wahaFetch(`/api/${session}/auth/qr`, { method: 'GET' }, config);
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('image')) {
      const blob = await res.blob();
      return {
        type: 'image',
        data: URL.createObjectURL(blob)
      };
    } else {
      const json = await res.json();
      return {
        type: 'raw',
        data: json.qr || json.data || json,
        raw: json.qr || json.data
      };
    }
  } catch (err) {
    // Attempt 2: screenshot
    try {
      const screenRes = await wahaFetch(`/api/screenshot?session=${session}`, { method: 'GET' }, config);
      if (screenRes.ok) {
        const blob = await screenRes.blob();
        return {
          type: 'image',
          data: URL.createObjectURL(blob)
        };
      }
    } catch (e2) {}
    throw err;
  }
}

/**
 * Send Direct Text Message via WAHA
 */
export async function sendWahaTextMessage({ to, text, sessionName = null, customConfig = null }) {
  const config = customConfig || getWahaConfig();
  const session = sessionName || config.sessionName || 'default';
  const chatId = formatChatId(to);

  if (!chatId) {
    throw new Error('Nomor tujuan WhatsApp tidak valid');
  }

  if (!text || !text.trim()) {
    throw new Error('Isi pesan tidak boleh kosong');
  }

  if (config.mockMode) {
    // Simulate delay
    await new Promise(r => setTimeout(r, 600));
    const log = logOutboundMessage({
      to: formatPhoneNumber(to),
      chatId,
      session,
      text,
      mode: 'MOCK_SIMULATED',
      status: 'SENT'
    });
    return {
      success: true,
      messageId: 'mock-msg-' + Date.now(),
      log
    };
  }

  try {
    const res = await wahaFetch('/api/sendText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session,
        chatId,
        text
      })
    }, config);

    if (res.ok) {
      const data = await res.json();
      const log = logOutboundMessage({
        to: formatPhoneNumber(to),
        chatId,
        session,
        text,
        messageId: data.id || data.messageId || 'waha-' + Date.now(),
        mode: 'REAL_HTTP',
        status: 'SENT'
      });
      return {
        success: true,
        data,
        log
      };
    }

    const errData = await res.text();
    logOutboundMessage({
      to: formatPhoneNumber(to),
      chatId,
      session,
      text,
      status: 'FAILED',
      error: errData
    });
    throw new Error(errData || `Gagal mengirim pesan (HTTP ${res.status})`);
  } catch (err) {
    throw err;
  }
}

/**
 * Send Media / Image File via WAHA
 */
export async function sendWahaFileMessage({ to, fileUrl, caption = '', filename = 'file.jpg', sessionName = null, customConfig = null }) {
  const config = customConfig || getWahaConfig();
  const session = sessionName || config.sessionName || 'default';
  const chatId = formatChatId(to);

  if (!chatId) throw new Error('Nomor tujuan WhatsApp tidak valid');
  if (!fileUrl) throw new Error('URL / gambar tidak boleh kosong');

  if (config.mockMode) {
    await new Promise(r => setTimeout(r, 800));
    const log = logOutboundMessage({
      to: formatPhoneNumber(to),
      chatId,
      session,
      text: caption ? `[MEDIA] ${caption}` : '[MEDIA GAMBAR]',
      fileUrl,
      mode: 'MOCK_SIMULATED',
      status: 'SENT'
    });
    return { success: true, messageId: 'mock-media-' + Date.now(), log };
  }

  try {
    const res = await wahaFetch('/api/sendFile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session,
        chatId,
        file: {
          url: fileUrl,
          filename: filename || 'amanda-attachment.jpg'
        },
        caption: caption || ''
      })
    }, config);

    if (res.ok) {
      const data = await res.json();
      const log = logOutboundMessage({
        to: formatPhoneNumber(to),
        chatId,
        session,
        text: caption ? `[MEDIA] ${caption}` : '[MEDIA GAMBAR]',
        fileUrl,
        status: 'SENT'
      });
      return { success: true, data, log };
    }

    const errData = await res.text();
    throw new Error(errData || `Gagal kirim media (HTTP ${res.status})`);
  } catch (err) {
    throw err;
  }
}

/**
 * Compile template variables
 */
export function compileTemplate(templateText, variables = {}) {
  let result = templateText || '';
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
}

/**
 * Trigger CS Notification via WAHA based on status change
 */
export async function sendCsStatusNotification(inquiry, newStatus, adminNotes = '') {
  let config = getWahaConfig();

  // Ensure live server config is resolved from Supabase if local cache is missing or on localhost
  if (!config.serverUrl || config.serverUrl.includes('localhost') || !config.apiKey) {
    try {
      const dbConfig = await fetchWahaConfig();
      if (dbConfig && dbConfig.serverUrl) {
        config = { ...config, ...dbConfig };
        try { localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config)); } catch(e) {}
      }
    } catch (e) {}
  }

  // Check if auto notification is enabled for this status
  if (newStatus === 'NEW' && !config.autoNotifyCsNew) return null;
  if (newStatus === 'IN_PROGRESS' && !config.autoNotifyCsProgress) return null;
  if (newStatus === 'RESOLVED' && !config.autoNotifyCsResolved) return null;

  if (!inquiry || !inquiry.phone) return null;

  let templateId = 'cs_progress';
  if (newStatus === 'RESOLVED') templateId = 'cs_resolved';
  if (newStatus === 'NEW') templateId = 'cs_new';

  const tpl = WAHA_TEMPLATES[templateId];
  if (!tpl) return null;

  const vars = {
    nama: inquiry.name || 'Pelanggan',
    tiket: inquiry.id || '-',
    outlet: inquiry.outlet_name || 'Balikpapan',
    catatan: adminNotes || inquiry.admin_notes || 'Sedang dalam penanganan petugas kami.',
    tanggal: new Date().toLocaleDateString('id-ID')
  };

  const messageText = compileTemplate(tpl.text, vars);

  try {
    return await sendWahaTextMessage({
      to: inquiry.phone,
      text: messageText,
      sessionName: config.sessionName
    });
  } catch (err) {
    console.error('Auto WAHA notification failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send WhatsApp Notification directly to Admin phone when a customer submits a CS inquiry/form
 */
export async function sendAdminCsAlert(inquiry) {
  let config = getWahaConfig();

  // Ensure live server config is resolved from Supabase if local cache is missing or on localhost
  if (!config.serverUrl || config.serverUrl.includes('localhost') || !config.apiKey) {
    try {
      const dbConfig = await fetchWahaConfig();
      if (dbConfig && dbConfig.serverUrl) {
        config = { ...config, ...dbConfig };
        try { localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config)); } catch(e) {}
      }
    } catch (e) {
      console.warn('Failed to fetch live WAHA config from Supabase:', e);
    }
  }

  if (!config.autoNotifyAdminNew) {
    console.log('[WAHA] Auto alert to admin is disabled in config.');
    return null;
  }

  const targetPhone = config.adminPhone || '6281253439968';
  if (!targetPhone) return null;

  const tpl = WAHA_TEMPLATES.admin_cs_alert || {
    text: `🔔 *NOTIFIKASI PENGADUAN BARU (CS)* 🍫\n\nTiket #{{tiket}} dari {{nama}} ({{phone}}) di cabang {{outlet}}.\nPesan: "{{pesan}}"`
  };

  const categoryLabels = {
    complaint: 'Komplain / Pengaduan Produk',
    stock: 'Tanya Ketersediaan Stok',
    catering: 'Pesanan Katering / Acara',
    promo: 'Klaim Promo & Flyer',
    partnership: 'Kerjasama / Reseller B2B',
    other: 'Pertanyaan Lainnya'
  };

  const vars = {
    nama: inquiry.name || 'Pelanggan',
    phone: inquiry.phone || '-',
    tiket: inquiry.id || '-',
    outlet: inquiry.outlet_name || 'Amanda Brownies',
    kategori: categoryLabels[inquiry.category] || inquiry.category || 'Pengaduan',
    struk: inquiry.receipt_number || 'Tidak dilampirkan',
    rating: inquiry.rating || 5,
    pesan: inquiry.message || '-',
    tanggal: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  };

  const messageText = compileTemplate(tpl.text, vars);

  try {
    return await sendWahaTextMessage({
      to: targetPhone,
      text: messageText,
      sessionName: config.sessionName
    });
  } catch (err) {
    console.error('Admin WAHA alert failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle Mock / Demo Mode
 */
export function toggleWahaMockMode(enabled) {
  const config = saveWahaConfig({ mockMode: enabled });
  if (enabled) {
    setMockState({ status: 'WORKING' });
  }
  return config;
}
