import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { pushToSupabase, SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';
import {
  getAuthSession,
  saveAuthSession,
  clearAuthSession,
  loginAdmin,
  updateAdminCredentials
} from '../services/auth';
import WahaManagement from '../components/admin/WahaManagement';
import { sendCsStatusNotification } from '../services/waha';
import { playNotificationSound } from '../utils/sound';


/**
 * Smart Client-Side Image Resizer & Compressor
 * Scales down large device/smartphone photos to max 960px (~60-100KB JPEG Data URL)
 */
function processImageFile(file, maxDim = 960) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Pilih file gambar valid (JPG, PNG, WebP)'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar'));
    reader.readAsDataURL(file);
  });
}

// Category labels metadata for CS
const CS_CATEGORY_LABELS = {
  catering: { label: 'Pesanan Katering', icon: 'fa-solid fa-utensils', badgeColor: '#3b82f6' },
  stock: { label: 'Tanya Stok Outlet', icon: 'fa-solid fa-boxes-stacked', badgeColor: '#8b5cf6' },
  complaint: { label: 'Komplain / Pengaduan', icon: 'fa-solid fa-triangle-exclamation', badgeColor: '#ef4444' },
  promo: { label: 'Klaim Promo', icon: 'fa-solid fa-tags', badgeColor: '#f59e0b' },
  partnership: { label: 'Kerjasama / B2B', icon: 'fa-solid fa-handshake', badgeColor: '#10b981' },
  other: { label: 'Lainnya', icon: 'fa-solid fa-comment-dots', badgeColor: '#6b7280' }
};

export default function AdminPage({ onBackToLanding }) {
  const {
    outlets,
    categories,
    products,
    promos,
    pricelists,
    ticker,
    csInquiries,
    csLoading,
    refreshCsInquiries,
    saveOutlet,
    removeOutlet,
    saveCategory,
    removeCategory,
    saveProduct,
    removeProduct,
    bulkSaveOutlets,
    updateCsStatus,
    deleteCsInquiry,
    resetToDefaults,
    importBackupData,
    refreshAllData,
    showToast
  } = useData();

  // Authentication Session
  const [session, setSession] = useState(() => getAuthSession());
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRemember, setLoginRemember] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Active Tab state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals state
  const [productModal, setProductModal] = useState({ open: false, data: null });
  const [stocksModal, setStocksModal] = useState({ open: false, product: null });
  const [outletModal, setOutletModal] = useState({ open: false, data: null });
  const [bulkOutletModal, setBulkOutletModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState({ open: false, data: null });
  const [promoModal, setPromoModal] = useState({ open: false, data: null });
  const [pricelistModal, setPricelistModal] = useState({ open: false, data: null });
  const [tickerModal, setTickerModal] = useState({ open: false, data: null });
  const [csDetailModal, setCsDetailModal] = useState({ open: false, inquiry: null });
  const [csReceiptModal, setCsReceiptModal] = useState({ open: false, inquiry: null, activeImgIdx: 0, isZoomed: false });

  // Dynamic Booths Editor state inside Outlet Modal
  const [outletBooths, setOutletBooths] = useState([]);

  // Form image previews
  const [prodImgPreview, setProdImgPreview] = useState('');
  const [promoImgPreview, setPromoImgPreview] = useState('');
  const [pricelistImgPreview, setPricelistImgPreview] = useState('');
  const [outletImgPreview, setOutletImgPreview] = useState('');

  // Filter & Search states
  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [csFilterStatus, setCsFilterStatus] = useState('all');
  const [csFilterOutlet, setCsFilterOutlet] = useState('all');
  const [csFilterCategory, setCsFilterCategory] = useState('all');
  const [csSearchInput, setCsSearchInput] = useState('');

  // Bulk Outlet Modal Tab & State
  const [bulkTab, setBulkTab] = useState('excel'); // 'excel' | 'text' | 'table' | 'json'
  const [bulkMode, setBulkMode] = useState('append'); // 'append' | 'replace'
  const [bulkText, setBulkText] = useState('');
  const [bulkJson, setBulkJson] = useState('');
  const [bulkTableRows, setBulkTableRows] = useState([]);
  const [bulkPreviewOutlets, setBulkPreviewOutlets] = useState([]);
  const [bulkPreviewVisible, setBulkPreviewVisible] = useState(false);

  // Vault form state
  const [vaultUrl, setVaultUrl] = useState(SUPABASE_URL);
  const [vaultKey, setVaultKey] = useState(SUPABASE_KEY);
  const [showKey, setShowKey] = useState(false);
  const [adminName, setAdminName] = useState(session?.user?.name || 'Admin Amanda Balikpapan');
  const [adminEmail, setAdminEmail] = useState(session?.user?.email || 'admin@amanda.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Sync session name & email
  useEffect(() => {
    if (session?.user) {
      setAdminName(session.user.name || 'Admin Amanda Balikpapan');
      setAdminEmail(session.user.email || 'admin@amanda.com');
    }
  }, [session]);

  // Fast background revalidation of CS inquiries when switching to CS tab
  useEffect(() => {
    if (session && activeTab === 'cs' && refreshCsInquiries) {
      refreshCsInquiries();
    }
  }, [session, activeTab, refreshCsInquiries]);

  // KPI Calculations
  const csNewCount = useMemo(() => {
    return csInquiries.filter((c) => c.status === 'NEW').length;
  }, [csInquiries]);

  const csInProgressCount = useMemo(() => {
    return csInquiries.filter((c) => c.status === 'IN_PROGRESS').length;
  }, [csInquiries]);

  const csResolvedCount = useMemo(() => {
    return csInquiries.filter((c) => c.status === 'RESOLVED').length;
  }, [csInquiries]);

  const csAvgRating = useMemo(() => {
    if (csInquiries.length === 0) return '5.0';
    const sum = csInquiries.reduce((acc, c) => acc + (Number(c.rating) || 5), 0);
    return (sum / csInquiries.length).toFixed(1);
  }, [csInquiries]);

  // Filtered CS inquiries list for efficient rendering
  const filteredCsList = useMemo(() => {
    return (Array.isArray(csInquiries) ? csInquiries : []).filter((item) => {
      if (csFilterOutlet !== 'all' && item.outlet_id !== csFilterOutlet) return false;
      if (csFilterCategory !== 'all' && item.category !== csFilterCategory) return false;
      if (csFilterStatus !== 'all' && item.status !== csFilterStatus) return false;
      if (csSearchInput) {
        const kw = csSearchInput.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(kw);
        const matchPhone = (item.phone || '').toLowerCase().includes(kw);
        const matchId = (item.id || '').toLowerCase().includes(kw);
        const matchReceipt = (item.receipt_number || '').toLowerCase().includes(kw);
        const matchMsg = (item.message || '').toLowerCase().includes(kw);
        if (!matchName && !matchPhone && !matchId && !matchReceipt && !matchMsg) return false;
      }
      return true;
    });
  }, [csInquiries, csFilterOutlet, csFilterCategory, csFilterStatus, csSearchInput]);

  // Live Alert & Notification Center state
  const [liveAlertTicket, setLiveAlertTicket] = useState(null);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const notifDropdownRef = useRef(null);
  const [readTicketIds, setReadTicketIds] = useState(() => {
    try {
      const raw = localStorage.getItem('amanda_read_tickets');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Calculate unread tickets
  const unreadCsList = useMemo(() => {
    const ids = Array.isArray(readTicketIds) ? readTicketIds : [];
    return (Array.isArray(csInquiries) ? csInquiries : []).filter(c => c && !ids.includes(c.id) && c.status === 'NEW');
  }, [csInquiries, readTicketIds]);

  const markAllTicketsRead = () => {
    const allIds = (csInquiries || []).map(c => c.id);
    setReadTicketIds(allIds);
    try {
      localStorage.setItem('amanda_read_tickets', JSON.stringify(allIds));
    } catch { }
    showToast('Semua notifikasi pengaduan telah ditandai dibaca.');
  };

  const markSingleTicketRead = (id) => {
    if (!readTicketIds.includes(id)) {
      const updated = [...readTicketIds, id];
      setReadTicketIds(updated);
      try {
        localStorage.setItem('amanda_read_tickets', JSON.stringify(updated));
      } catch { }
    }
  };

  const openTicketFromNotification = (ticket) => {
    markSingleTicketRead(ticket.id);
    setLiveAlertTicket(null);
    setNotifDropdownOpen(false);
    setActiveTab('cs');
    setCsDetailModal({ open: true, inquiry: ticket });
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!notifDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifDropdownOpen]);

  // Auto-dismiss live alert toast after 12 seconds
  useEffect(() => {
    if (!liveAlertTicket) return;
    const timer = setTimeout(() => {
      setLiveAlertTicket(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [liveAlertTicket]);

  // Handler when a new ticket event is received
  const handleIncomingTicket = useCallback((ticket) => {
    if (!ticket || !ticket.id) return;

    // Play chime sound if enabled
    if (soundEnabled) {
      playNotificationSound();
    }

    // Set floating live alert toast
    setLiveAlertTicket(ticket);

    // Desktop Notification API if supported & granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(`🚨 Komplain Baru Amanda (#${ticket.id})`, {
            body: `${ticket.name} (${ticket.outlet_name || 'Outlet'}): ${ticket.message?.slice(0, 80) || ''}`,
            icon: '/assets/logo.png'
          });
        } catch (e) {
          console.warn('Desktop notification error:', e);
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => { });
      }
    }
  }, [soundEnabled]);

  // Subscribe to all incoming ticket channels (window CustomEvent, BroadcastChannel, localStorage)
  useEffect(() => {
    const onCustomEvent = (e) => {
      if (e.detail) {
        handleIncomingTicket(e.detail);
      }
    };
    window.addEventListener('amanda_new_cs_ticket', onCustomEvent);

    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('amanda_cs_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'NEW_TICKET' && event.data.ticket) {
            handleIncomingTicket(event.data.ticket);
          }
        };
      } catch (bcErr) {
        console.warn('BroadcastChannel not initialized:', bcErr);
      }
    }

    const onStorage = (event) => {
      if (event.key === 'amanda_latest_cs_ticket' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed && parsed.ticket) {
            handleIncomingTicket(parsed.ticket);
          }
        } catch (err) {
          console.warn('Storage event parse error:', err);
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('amanda_new_cs_ticket', onCustomEvent);
      window.removeEventListener('storage', onStorage);
      if (bc) bc.close();
    };
  }, [handleIncomingTicket]);

  // Tab Title
  const tabTitles = {
    dashboard: 'Ringkasan Dashboard',
    promos: 'Manajemen Flyer & Promo Resmi (4:5)',
    products: 'Katalog Produk & Ketersediaan Stok',
    outlets: 'Cabang Outlet Resmi Balikpapan',
    'outlet-categories': 'Manajemen Kategori & Wilayah Outlet',
    cs: 'Layanan CS & Pengaduan Pelanggan',
    waha: 'WhatsApp HTTP API (WAHA) Gateway',
    ticker: 'Running Promo Ticker',
    settings: 'Cadangan, Impor & Reset Data',
    security: 'Vault Kunci API & Keamanan Database'
  };

  // --- AUTHENTICATION ACTIONS ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await loginAdmin(loginEmail, loginPassword, loginRemember);
      if (res.success) {
        setSession(res.session);
        showToast(`Selamat datang, ${res.session.user.name}!`);
      } else {
        setLoginError(res.message || 'Email atau kata sandi tidak valid.');
      }
    } catch (err) {
      setLoginError(err.message || 'Terjadi kesalahan saat masuk.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari panel CMS?')) {
      clearAuthSession();
      setSession(null);
      showToast('Anda telah keluar dari sesi admin.');
    }
  };

  const handleUpdateAdminProfile = async (e) => {
    e.preventDefault();
    const userId = session?.user?.id || 'usr-admin-bpn';
    const res = await updateAdminCredentials(userId, adminEmail, adminPassword, adminName);
    if (res.success) {
      setAdminPassword('');
      setSession(getAuthSession());
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  // --- MODAL OPENERS ---
  const handleOpenProductModal = (prod = null) => {
    setProductModal({ open: true, data: prod });
    setProdImgPreview(prod?.image || '/assets/amanda_brownies_hero_1790255505694.jpg');
  };

  const handleOpenPromoModal = (promo = null) => {
    setPromoModal({ open: true, data: promo });
    setPromoImgPreview(promo?.image || '/assets/promo_flyer_1.jpg');
  };

  const handleOpenPricelistModal = (price = null) => {
    setPricelistModal({ open: true, data: price });
    setPricelistImgPreview(price?.image || '/assets/amanda_pricelist_poster.jpg');
  };

  const handleOpenOutletModal = (out = null) => {
    setOutletModal({ open: true, data: out });
    setOutletImgPreview(out?.image || '/assets/outlet_mt_haryono.jpg');
    setOutletBooths(out?.booths ? JSON.parse(JSON.stringify(out.booths)) : []);
  };

  // --- BOOTHS MANAGEMENT INSIDE OUTLET MODAL ---
  const handleAddBoothRow = () => {
    const newBooth = {
      id: 'bth-' + Date.now(),
      name: '',
      location: '',
      wa: outletModal.data?.wa || '6281241075981',
      hours: '08.00 - 22.00 WITA',
      mapsUrl: ''
    };
    setOutletBooths([...outletBooths, newBooth]);
  };

  const handleUpdateBoothField = (index, field, value) => {
    const updated = [...outletBooths];
    updated[index][field] = value;
    setOutletBooths(updated);
  };

  const handleDeleteBoothRow = (index) => {
    const updated = outletBooths.filter((_, idx) => idx !== index);
    setOutletBooths(updated);
  };

  // --- SAVE ACTIONS ---
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = productModal.data?.id || ('prod-' + Date.now());

    // Gather per-outlet stocks from table inputs
    const updatedStocks = outlets.map((out) => {
      const statusEl = document.getElementById(`prod-modal-stock-status-${out.id}`);
      const descEl = document.getElementById(`prod-modal-stock-desc-${out.id}`);
      return {
        outletId: out.id,
        name: out.name,
        status: statusEl ? statusEl.value : 'Tersedia',
        stock: descEl ? descEl.value.trim() : 'Stok Melimpah',
        lastRestock: 'Baru saja diperbarui'
      };
    });

    const newProd = {
      id,
      name: fd.get('name'),
      category: fd.get('category'),
      categoryLabel: fd.get('category') === 'kukus' ? 'Brownies Kukus' : (fd.get('category') === 'bakar' ? 'Brownies Bakar' : 'Premium & Marble'),
      price: Number(fd.get('price')) || 0,
      weight: fd.get('weight') || '700 gram',
      shelfLife: fd.get('shelfLife') || '4 Hari (Suhu Ruang)',
      description: fd.get('description') || '',
      image: prodImgPreview || fd.get('image') || '/assets/amanda_brownies_hero_1790255505694.jpg',
      badge: fd.get('badge') || 'Varian Pilihan',
      outlets: updatedStocks
    };
    await saveProduct(newProd);
    setProductModal({ open: false, data: null });
  };

  const handleSaveStock = async (productId, updatedStocks) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const updatedProd = {
      ...prod,
      outlets: updatedStocks
    };
    await saveProduct(updatedProd);
    setStocksModal({ open: false, product: null });
    showToast(`Stok untuk ${prod.name} berhasil diperbarui.`);
  };

  const handleSaveOutlet = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = outletModal.data?.id || ('out-bpn-' + Date.now());
    const city = fd.get('city') || 'Balikpapan';
    const newOutlet = {
      id,
      name: fd.get('name'),
      city,
      region: 'Kota ' + city,
      address: fd.get('address') || '',
      phone: fd.get('phone') || '',
      wa: fd.get('wa') || '',
      hours: fd.get('hours') || '07.00 - 22.00 WITA',
      mapsUrl: fd.get('mapsUrl') || '',
      image: outletImgPreview || fd.get('image') || '/assets/outlet_mt_haryono.jpg',
      distance: '1.0 km',
      booths: outletBooths
    };
    await saveOutlet(newOutlet);
    setOutletModal({ open: false, data: null });
  };

  const handleDeleteSingleBooth = async (outletId, boothId) => {
    const targetOut = outlets.find(o => o.id === outletId);
    if (!targetOut) return;
    if (!window.confirm('Hapus titik booth counter ini?')) return;
    const updatedBooths = (targetOut.booths || []).filter(b => b.id !== boothId);
    await saveOutlet({ ...targetOut, booths: updatedBooths });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = categoryModal.data?.id || ('cat-' + Date.now());
    const newCat = {
      id,
      name: fd.get('name'),
      slug: fd.get('slug') || id,
      region: fd.get('region') || ('Kota ' + fd.get('name')),
      icon: fd.get('icon') || 'fa-solid fa-location-dot',
      badgeColor: fd.get('badgeColor') || 'olive',
      description: fd.get('description') || '',
      status: fd.get('status') || 'active',
      sortOrder: Number(fd.get('sortOrder')) || 1
    };
    await saveCategory(newCat);
    setCategoryModal({ open: false, data: null });
  };

  const handleSavePromo = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = promoModal.data?.id || ('promo-' + Date.now());
    const newPromo = {
      id,
      title: fd.get('title'),
      badge: fd.get('badge') || 'PROMO RESMI',
      badgeColor: fd.get('badgeColor') || 'gold',
      period: fd.get('period') || '',
      waMessage: fd.get('waMessage') || '',
      description: fd.get('description') || '',
      image: promoImgPreview || fd.get('image') || '/assets/promo_flyer_1.jpg',
      aspectRatio: '4/5',
      active: true
    };
    const updated = promos.some(p => p.id === id)
      ? promos.map(p => p.id === id ? newPromo : p)
      : [...promos, newPromo];
    await pushToSupabase('promos', updated);
    await refreshAllData();
    setPromoModal({ open: false, data: null });
    showToast('Flyer promo berhasil disimpan.');
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('Hapus flyer promo ini?')) return;
    await pushToSupabase('promos', id, 'delete');
    await refreshAllData();
    showToast('Flyer promo berhasil dihapus.');
  };

  const handleSavePricelist = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = pricelistModal.data?.id || ('price-' + Date.now());
    const newPrice = {
      id,
      title: fd.get('title'),
      badge: fd.get('badge') || 'Price List',
      caption: fd.get('caption') || '',
      image: pricelistImgPreview || fd.get('image') || '/assets/amanda_pricelist_poster.jpg'
    };
    const updated = pricelists.some(p => p.id === id)
      ? pricelists.map(p => p.id === id ? newPrice : p)
      : [...pricelists, newPrice];
    await pushToSupabase('pricelists', updated);
    await refreshAllData();
    setPricelistModal({ open: false, data: null });
    showToast('Poster price list berhasil disimpan.');
  };

  const handleDeletePricelist = async (id) => {
    if (!window.confirm('Hapus poster price list ini?')) return;
    await pushToSupabase('pricelists', id, 'delete');
    await refreshAllData();
    showToast('Poster price list berhasil dihapus.');
  };

  const handleSaveTicker = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = tickerModal.data?.id || ('tick-' + Date.now());
    const newTick = {
      id,
      title: fd.get('title'),
      text: fd.get('text'),
      icon: fd.get('icon') || 'fa-solid fa-bullhorn'
    };
    const updated = ticker.some(t => t.id === id)
      ? ticker.map(t => t.id === id ? newTick : t)
      : [...ticker, newTick];
    await pushToSupabase('ticker', updated);
    await refreshAllData();
    setTickerModal({ open: false, data: null });
    showToast('Pengumuman ticker berhasil disimpan.');
  };

  const handleDeleteTicker = async (id) => {
    if (!window.confirm('Hapus teks pengumuman ticker ini?')) return;
    await pushToSupabase('ticker', id, 'delete');
    await refreshAllData();
    showToast('Pengumuman ticker berhasil dihapus.');
  };

  // --- CS ACTIONS & EXCEL EXPORT ---
  const handleOpenReceiptModal = (inquiry, initialIdx = 0) => {
    setCsReceiptModal({
      open: true,
      inquiry,
      activeImgIdx: initialIdx,
      isZoomed: false
    });
  };

  const exportCsToExcel = () => {
    if (!csInquiries || csInquiries.length === 0) {
      alert('Belum ada data tiket CS untuk diekspor.');
      return;
    }
    const headers = [
      'No Tiket',
      'Tanggal & Waktu (WITA)',
      'Nama Pelanggan',
      'Nomor WhatsApp',
      'Outlet Amanda',
      'Kategori Pengaduan',
      'No Struk Pembelian',
      'Ada Lampiran Foto',
      'Rating Kepuasan (1-5)',
      'Pesan & Keterangan',
      'Status Tiket',
      'Catatan Admin'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const rows = csInquiries.map((item) => {
      const catMeta = CS_CATEGORY_LABELS[item.category] || CS_CATEGORY_LABELS.other;
      const dateObj = item.created_at ? new Date(item.created_at) : new Date();
      const dateStr = dateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WITA';

      const hasReceipt = (item.receipt_images && item.receipt_images.length > 0) || item.receipt_image ? 'YA' : 'TIDAK';

      return [
        item.id || '',
        dateStr,
        item.name || '',
        '\'' + (item.phone || ''),
        item.outlet_name || 'Amanda Brownies',
        catMeta.label,
        item.receipt_number || '-',
        hasReceipt,
        item.rating || 5,
        (item.message || '').replace(/\r?\n/g, ' '),
        item.status || 'NEW',
        item.admin_notes || '-'
      ];
    });

    const csvContent = '\uFEFF' + [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const filename = `Laporan_CS_Amanda_Balikpapan_${timestamp}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Laporan data CS berhasil diekspor ke file Excel (${filename})!`);
  };

  // --- BULK OUTLET IMPORTER LOGIC ---
  const parseBulkOutletText = (text) => {
    if (!text || !text.trim()) return [];
    const lines = text.split('\n');
    const parsedOutlets = [];
    let currentOutlet = null;

    lines.forEach((rawLine, lineIdx) => {
      const line = rawLine.trim();
      if (!line) return;

      if (line.startsWith('-') || line.startsWith('*') || line.startsWith('+')) {
        if (!currentOutlet) {
          currentOutlet = {
            id: 'out-bpn-' + (Date.now() + lineIdx),
            name: 'Outlet Pusat',
            city: categories[0]?.name || 'Balikpapan',
            region: 'Kota ' + (categories[0]?.name || 'Balikpapan'),
            image: '/assets/outlet_mt_haryono.jpg',
            hours: '07.00 - 22.00 WITA',
            wa: '6281241075981',
            phone: '+6281241075981',
            address: 'Kota Balikpapan',
            mapsUrl: 'https://maps.google.com',
            distance: '1.0 km',
            booths: []
          };
          parsedOutlets.push(currentOutlet);
        }

        const boothSep = line.includes('\t') ? '\t' : (line.includes('|') ? '|' : ',');
        const parts = line.replace(/^[-*+]\s*/, '').split(boothSep).map(s => s.trim());
        const bName = parts[0] || `Booth ${currentOutlet.booths.length + 1}`;
        const bLoc = parts[1] || '';
        let bWa = parts[2] ? parts[2].replace(/[^0-9]/g, '') : currentOutlet.wa;
        if (!bWa) bWa = currentOutlet.wa;
        const bHours = parts[3] || '10.00 - 22.00 WITA';
        const bMaps = parts[4] || `https://maps.google.com/?q=${encodeURIComponent(bName + ' ' + currentOutlet.city)}`;

        currentOutlet.booths.push({
          id: 'bth-' + (Date.now() + lineIdx + currentOutlet.booths.length),
          name: bName,
          location: bLoc,
          hours: bHours,
          status: 'Tersedia',
          wa: bWa,
          mapsUrl: bMaps
        });
      } else {
        const sep = line.includes('\t') ? '\t' : (line.includes('|') ? '|' : ',');
        const parts = line.split(sep).map(s => s.trim());
        const name = parts[0] || 'Cabang Amanda Brownies';
        const city = parts[1] || categories[0]?.name || 'Balikpapan';
        let wa = parts[2] ? parts[2].replace(/[^0-9]/g, '') : '6281241075981';
        if (!wa) wa = '6281241075981';
        const hours = parts[3] || '07.00 - 22.00 WITA';
        const address = parts[4] || `Jl. Utama ${city}`;
        const mapsUrl = parts[5] || `https://maps.google.com/?q=${encodeURIComponent(name + ' ' + city)}`;

        currentOutlet = {
          id: 'out-bpn-' + (Date.now() + lineIdx),
          name,
          city,
          region: 'Kota ' + city,
          image: '/assets/outlet_mt_haryono.jpg',
          hours,
          wa,
          phone: '+' + wa,
          address,
          mapsUrl,
          distance: '1.0 km',
          booths: []
        };
        parsedOutlets.push(currentOutlet);
      }
    });

    return parsedOutlets;
  };

  const handlePreviewBulkData = () => {
    let result = [];
    if (bulkTab === 'text') {
      result = parseBulkOutletText(bulkText);
    } else if (bulkTab === 'json') {
      try {
        const parsed = JSON.parse(bulkJson);
        result = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        alert('Format JSON tidak valid: ' + e.message);
        return;
      }
    } else if (bulkTab === 'table') {
      result = bulkTableRows;
    }
    setBulkPreviewOutlets(result);
    setBulkPreviewVisible(true);
  };

  const handleExecuteBulkSave = async () => {
    let toSave = bulkPreviewOutlets;
    if (toSave.length === 0) {
      if (bulkTab === 'text') toSave = parseBulkOutletText(bulkText);
      else if (bulkTab === 'json') {
        try { toSave = JSON.parse(bulkJson); } catch (e) { return; }
      } else if (bulkTab === 'table') toSave = bulkTableRows;
    }

    if (!toSave || toSave.length === 0) {
      alert('Tidak ada data outlet yang valid untuk disimpan.');
      return;
    }

    await bulkSaveOutlets(toSave, bulkMode);
    setBulkOutletModal(false);
    setBulkPreviewVisible(false);
    setBulkText('');
    setBulkJson('');
    setBulkTableRows([]);
  };

  const downloadBulkTemplate = () => {
    const csvContent = '\uFEFF' + [
      'Tipe,Nama Cabang / Booth,Kota / Wilayah,Nomor WhatsApp,Jam Operasional,Alamat / Lokasi,Link Google Maps',
      'Outlet,Amanda Brownies MT Haryono,Balikpapan,6281241075981,07.00 - 22.00 WITA,Jl. MT Haryono No. 15 Damai,https://maps.google.com',
      'Booth,- Booth Point Sales Bandara SAMS,Gate 4 Keberangkatan,6281241075981,06.00 - 21.00 WITA,https://maps.google.com'
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Impor_Outlet_Amanda.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- BACKUP & RESTORE ACTIONS ---
  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      platform: 'Amanda Brownies CMS',
      city: 'Kota Balikpapan',
      outlets,
      categories,
      products,
      promos,
      pricelists,
      ticker,
      csInquiries
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amanda_balikpapan_backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Cadangan data berhasil diunduh dalam format JSON.');
  };

  const handleImportBackupFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        await importBackupData(parsed);
      } catch (err) {
        alert('File backup JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = async () => {
    if (window.confirm('Peringatan: Semua perubahan khusus akan dihapus dan dikembalikan ke data default resmi Balikpapan. Lanjutkan?')) {
      await resetToDefaults();
    }
  };

  // =========================================================================
  // VIEW 1: LOGIN CARD (IF NOT AUTHENTICATED)
  // =========================================================================
  if (!session || !session.user) {
    return (
      <div className="login-page-wrap">
        {/* Left Visual Panel */}
        <div className="login-visual-panel">
          <div className="visual-overlay"></div>
          <div className="visual-content">
            <div className="visual-logo-badge" style={{ background: 'none', boxShadow: 'none', width: 'auto', height: 'auto' }}>
              <img
                src="/assets/logo.png"
                alt="Amanda Logo"
                style={{
                  height: '64px',
                  width: 'auto',
                  maxWidth: '140px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.35))'
                }}
              />
            </div>
            <h1 className="font-serif">AMANDA CMS</h1>
            <p className="visual-tagline">
              Sistem Manajemen Pengelolaan Landing Page, Katalog Menu, Promo Flyer & Multi-Cabang Outlet Kalimantan.
            </p>

            <div className="visual-highlights">
              <div className="vh-item">
                <i className="fa-solid fa-shield-check"></i>
                <span>Otentikasi Berlapis & Session Guard</span>
              </div>
              <div className="vh-item">
                <i className="fa-solid fa-bolt"></i>
                <span>Sinkronisasi Realtime Supabase PostgreSQL</span>
              </div>
              <div className="vh-item">
                <i className="fa-solid fa-shop"></i>
                <span>Pengelolaan Cabang Outlet Balikpapan</span>
              </div>
            </div>

            <div className="visual-footer">
              <span>&copy; 2026 Amanda Brownies Kalimantan. Hak Cipta Dilindungi.</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="login-form-panel">
          <div className="login-card-container">
            <div className="login-top-nav">
              <button
                type="button"
                onClick={onBackToLanding}
                className="btn-back-home"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-arrow-left"></i> Kembali ke Website
              </button>
              <span className="secure-badge"><i className="fa-solid fa-lock"></i> SSL Secured</span>
            </div>

            <div className="login-header">
              <h2 className="font-serif">Selamat Datang</h2>
              <p>Masuk ke panel CMS kelola menu, promo, dan outlet Amanda Brownies.</p>
            </div>

            {loginError && (
              <div className="login-alert-box" style={{ display: 'flex' }}>
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{loginError}</span>
              </div>
            )}

            <form id="login-form" onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label htmlFor="login-email">Email / Akun Terdaftar *</label>
                <div className="input-with-icon">
                  <i className="fa-solid fa-envelope"></i>
                  <input
                    type="email"
                    id="login-email"
                    required
                    placeholder="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="login-password">Kata Sandi / Password *</label>
                </div>
                <div className="input-with-icon">
                  <i className="fa-solid fa-key"></i>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    id="login-password"
                    required
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    tabIndex={-1}
                  >
                    <i className={`fa-regular ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="form-options-row">
                <label className="remember-label">
                  <input
                    type="checkbox"
                    checked={loginRemember}
                    onChange={(e) => setLoginRemember(e.target.checked)}
                  />
                  <span>Ingat saya selama 7 hari</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn-login-submit"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket"></i>
                    <span>Masuk ke Panel CMS</span>
                  </>
                )}
              </button>
            </form>

            {/* <div className="login-security-footer">
              <i className="fa-solid fa-shield-halved"></i>
              <span>Gunakan akun <code>admin@amanda.com</code> / sandi <code>admin</code> untuk login panel ini.</span>
            </div> */}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED ADMIN DASHBOARD
  // =========================================================================
  return (
    <div className="cms-layout">
      {/* ==================== SIDEBAR ==================== */}
      <aside className={`cms-sidebar ${sidebarOpen ? 'open' : ''}`} id="cms-sidebar">
        <div className="sidebar-brand">
          <div className="brand-left">
            <img
              src="/assets/logo.png"
              alt="Amanda Logo"
              style={{
                height: '38px',
                width: 'auto',
                maxWidth: '76px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))'
              }}
            />
            <div className="brand-info">
              <h2>AMANDA CMS</h2>
              <span>KOTA BALIKPAPAN</span>
            </div>
          </div>
          <button
            className="btn-close-sidebar-mobile"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup Menu"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li>
              <button
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
              >
                <i className="fa-solid fa-chart-pie"></i>
                <span>Ringkasan Dashboard</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeTab === 'promos' ? 'active' : ''}`}
                onClick={() => { setActiveTab('promos'); setSidebarOpen(false); }}
              >
                <i className="fa-solid fa-fire"></i>
                <span>Flyer & Promo (4:5)</span>
                <span className="badge-count" id="badge-promo-count">{promos.length}</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => { setActiveTab('products'); setSidebarOpen(false); }}
              >
                <i className="fa-solid fa-box-open"></i>
                <span>Katalog & Stok Outlet</span>
                <span className="badge-count" id="badge-prod-count">{products.length}</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeTab === 'outlets' ? 'active' : ''}`}
                onClick={() => { setActiveTab('outlets'); setSidebarOpen(false); }}
              >
                <i className="fa-solid fa-store"></i>
                <span>Cabang Balikpapan</span>
                <span className="badge-count" id="badge-outlet-count">{outlets.length}</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeTab === 'outlet-categories' ? 'active' : ''}`}
                onClick={() => { setActiveTab('outlet-categories'); setSidebarOpen(false); }}
              >
                <i className="fa-solid fa-map-location-dot"></i>
                <span>Kategori Wilayah</span>
                <span className="badge-count" id="badge-outlet-cat-count">{categories.length}</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeTab === 'cs' ? 'active' : ''}`}
                onClick={() => { setActiveTab('cs'); setSidebarOpen(false); }}
              >
                <i className="fa-solid fa-headset"></i>
                <span>Layanan CS & Analisis Data</span>
                {csNewCount > 0 && (
                  <span className="badge-count" style={{ background: '#dc2626', color: '#fff' }}>
                    {csNewCount}
                  </span>
                )}
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeTab === 'waha' ? 'active' : ''}`}
                onClick={() => { setActiveTab('waha'); setSidebarOpen(false); }}
              >
                <i className="fa-brands fa-whatsapp" style={{ color: '#25D366' }}></i>
                <span>WAHA Gateway & WhatsApp</span>
                <span className="badge-count" style={{ background: '#25D366', color: '#fff' }}>WA</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeTab === 'ticker' ? 'active' : ''}`}
                onClick={() => { setActiveTab('ticker'); setSidebarOpen(false); }}
              >
                <i className="fa-solid fa-bullhorn"></i>
                <span>Running Promo Ticker</span>
                <span className="badge-count">{ticker.length}</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
              >
                <i className="fa-solid fa-database"></i>
                <span>Cadangan & Reset Data</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => { setActiveTab('security'); setSidebarOpen(false); }}
              >
                <i className="fa-solid fa-shield-halved"></i>
                <span>Kredensial & Kunci API</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={onBackToLanding}
            className="btn-view-site"
            style={{ width: '100%', border: 'none', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-arrow-up-right-from-square"></i>
            <span>Buka Website Publik</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <main className="cms-main">
        {/* Topbar Header */}
        <header className="cms-topbar">
          <div className="topbar-left">
            <button
              className="btn-toggle-sidebar"
              onClick={() => setSidebarOpen(true)}
              aria-label="Toggle Sidebar"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <div className="topbar-title-wrap">
              <h1 id="page-heading">{tabTitles[activeTab]}</h1>
              <span className="topbar-subtitle">
                Pusat Pengelolaan Konten & Ketersediaan Stok Resmi Kota Balikpapan
              </span>
            </div>
          </div>

          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Topbar CS Notification Bell & Dropdown */}
            <div className="topbar-notif-wrapper" ref={notifDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className={`btn-topbar-bell ${unreadCsList.length > 0 ? 'has-unread' : ''}`}
                onClick={() => setNotifDropdownOpen((prev) => !prev)}
                title="Pemberitahuan CS & Pengaduan Masuk"
                aria-label="Pemberitahuan CS"
              >
                <i className="fa-solid fa-bell"></i>
                {unreadCsList.length > 0 && (
                  <span className="bell-badge-pulse">
                    {unreadCsList.length > 99 ? '99+' : unreadCsList.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {notifDropdownOpen && (
                <div className="topbar-notif-dropdown">
                  <div className="notif-dropdown-header">
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-bell" style={{ color: 'var(--primary-gold)' }}></i> Notifikasi Pengaduan
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {unreadCsList.length} tiket baru belum ditindaklanjuti
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-dropdown-sound"
                        onClick={() => {
                          setSoundEnabled((prev) => !prev);
                          showToast(!soundEnabled ? 'Suara notifikasi diaktifkan' : 'Suara notifikasi dibisukan', 'info');
                        }}
                        title={soundEnabled ? 'Matikan Suara Chime' : 'Aktifkan Suara Chime'}
                      >
                        <i className={`fa-solid ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
                      </button>
                      {unreadCsList.length > 0 && (
                        <button
                          type="button"
                          className="btn-mark-all-read"
                          onClick={markAllTicketsRead}
                          title="Tandai semua telah dibaca"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="notif-dropdown-list">
                    {(Array.isArray(csInquiries) ? csInquiries : [])
                      .filter(Boolean)
                      .slice(0, 6)
                      .map((item, idx) => {
                        const ids = Array.isArray(readTicketIds) ? readTicketIds : [];
                        const isUnread = !ids.includes(item?.id) && item?.status === 'NEW';
                        return (
                          <div
                            key={item?.id || idx}
                            className={`notif-dropdown-item ${isUnread ? 'is-unread' : ''}`}
                            onClick={() => openTicketFromNotification(item)}
                          >
                            <div className="notif-item-icon">
                              <i className="fa-solid fa-triangle-exclamation"></i>
                            </div>
                            <div className="notif-item-body">
                              <div className="notif-item-title-row">
                                <span className="notif-ticket-id">#{item?.id || '-'}</span>
                                <span className="notif-item-time">
                                  {item?.created_at
                                    ? new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                    : 'Baru'}
                                </span>
                              </div>
                              <div className="notif-customer-name">{item?.name || 'Pelanggan'}</div>
                              <div className="notif-outlet-label">📍 {item?.outlet_name || 'Balikpapan'}</div>
                              <div className="notif-message-snip">"{item?.message || ''}"</div>
                            </div>
                          </div>
                        );
                      })}

                    {(!csInquiries || csInquiries.length === 0) && (
                      <div className="notif-empty-state">
                        <i className="fa-regular fa-bell-slash"></i>
                        <p>Belum ada tiket pengaduan masuk</p>
                      </div>
                    )}
                  </div>

                  <div className="notif-dropdown-footer">
                    <button
                      type="button"
                      className="btn-view-all-cs"
                      onClick={() => {
                        setNotifDropdownOpen(false);
                        setActiveTab('cs');
                      }}
                    >
                      Buka Semua di Menu CS <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Badge */}
            <div
              className="sa-auth-user-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(79, 91, 42, 0.08)',
                padding: '5px 12px',
                borderRadius: '999px',
                border: '1px solid rgba(79, 91, 42, 0.2)'
              }}
            >
              <div className="auth-avatar" style={{ fontSize: '18px' }}>
                {session?.user?.avatar || '🍰'}
              </div>
              <div className="auth-user-info" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="auth-user-name" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {session?.user?.name || 'Admin'}
                </span>
                <span className="auth-user-role" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  {session?.user?.tenantName || 'Admin Cabang'}
                </span>
              </div>
              <button
                type="button"
                className="btn-auth-logout"
                onClick={handleLogout}
                title="Keluar / Logout"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  padding: '4px',
                  marginLeft: '4px'
                }}
              >
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>

            <span className="sync-status-pill">
              <i className="fa-solid fa-circle-check"></i>{' '}
              <span className="sync-text">Tersinkronisasi Realtime</span>
            </span>

            <button
              onClick={refreshAllData}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
              title="Refresh Data dari Cloud"
            >
              <i className="fa-solid fa-arrows-rotate"></i>
            </button>

            <button
              onClick={onBackToLanding}
              className="btn-preview-top"
              title="Lihat Website Publik"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-eye"></i> <span className="preview-text">Live Preview</span>
            </button>
          </div>
        </header>

        {/* ================= LIVE CS ALERT BANNER ================= */}
        {liveAlertTicket && (
          <div className="admin-live-cs-alert">
            <div className="live-alert-icon-wrap">
              <i className="fa-solid fa-bell-concierge"></i>
            </div>
            <div className="live-alert-content">
              <div className="live-alert-header">
                <span className="live-alert-tag">🚨 PENGADUAN BARU MASUK!</span>
                <span className="live-alert-ticket">#{liveAlertTicket?.id || ''}</span>
                <span className="live-alert-time">Baru Saja</span>
              </div>
              <div className="live-alert-meta">
                <span className="live-alert-customer">
                  <i className="fa-solid fa-user"></i> {liveAlertTicket?.name || 'Pelanggan'}
                </span>
                <span className="live-alert-outlet">
                  <i className="fa-solid fa-store"></i> {liveAlertTicket?.outlet_name || 'Cabang Balikpapan'}
                </span>
                <span className="live-alert-category">
                  {liveAlertTicket?.category || 'Komplain'}
                </span>
              </div>
              <p className="live-alert-text">"{liveAlertTicket?.message || ''}"</p>
            </div>
            <div className="live-alert-actions">
              <button
                type="button"
                className="btn-live-alert-open"
                onClick={() => openTicketFromNotification(liveAlertTicket)}
              >
                <i className="fa-solid fa-folder-open"></i> Buka Tiket
              </button>
              <button
                type="button"
                className="btn-live-alert-dismiss"
                onClick={() => setLiveAlertTicket(null)}
                aria-label="Tutup notifikasi"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        )}

        {/* Content Container */}
        <div className="cms-content-wrapper">
          {/* ==================== TAB 1: DASHBOARD ==================== */}
          {activeTab === 'dashboard' && (
            <section id="section-dashboard" className="cms-section active">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon olive">
                    <i className="fa-solid fa-cake-candles"></i>
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Total Varian Produk</span>
                    <h3 className="stat-value">{products.length}</h3>
                    <span className="stat-desc">Kukus, Bakar, & Marble</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon gold">
                    <i className="fa-solid fa-fire"></i>
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Flyer Promo Aktif</span>
                    <h3 className="stat-value">{promos.length}</h3>
                    <span className="stat-desc">Rasio standar 4:5</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon sand">
                    <i className="fa-solid fa-store"></i>
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Total Cabang Outlet</span>
                    <h3 className="stat-value">{outlets.length}</h3>
                    <span className="stat-desc">Jaringan Kalimantan</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green">
                    <i className="fa-solid fa-bullhorn"></i>
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Item Running Ticker</span>
                    <h3 className="stat-value">{ticker.length}</h3>
                    <span className="stat-desc">Marquee promosi live</span>
                  </div>
                </div>
              </div>

              {/* Quick Split Panels */}
              <div className="dash-grid-split">
                <div className="panel-card">
                  <div className="panel-head">
                    <div className="panel-head-title">
                      <i className="fa-solid fa-images" style={{ color: 'var(--primary-olive)' }}></i>
                      <h3>Flyer Promo Berjalan Saat Ini</h3>
                    </div>
                    <button className="btn-secondary-sm" onClick={() => setActiveTab('promos')}>
                      Kelola Promo
                    </button>
                  </div>
                  <div className="panel-body">
                    <div className="dash-promos-preview">
                      {promos.slice(0, 3).map((p) => (
                        <div key={p.id} className="dash-promo-item">
                          <img src={p.image} alt={p.title} />
                          <div className="dash-promo-info">
                            <h5>{p.title}</h5>
                            <span>{p.badge || 'Promo Spesial'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-head">
                    <div className="panel-head-title">
                      <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--primary-olive)' }}></i>
                      <h3>Status Cabang Balikpapan</h3>
                    </div>
                    <button className="btn-secondary-sm" onClick={() => setActiveTab('outlets')}>
                      Kelola Outlet
                    </button>
                  </div>
                  <div className="panel-body">
                    <div className="dash-outlets-list">
                      {outlets.map((o) => (
                        <div key={o.id} className="dash-outlet-row">
                          <div>
                            <span className="dash-outlet-name">{o.name}</span>
                            <div className="dash-outlet-city">
                              <i className="fa-solid fa-location-dot" style={{ color: 'var(--ch-olive)' }}></i> {o.city} • {o.hours}
                            </div>
                          </div>
                          <span className="stock-tag-mini"><i className="fa-solid fa-circle-check"></i> Aktif</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ==================== TAB 2: PROMOS (4:5) & PRICE LISTS ==================== */}
          {activeTab === 'promos' && (
            <section id="section-promos" className="cms-section active">
              <div className="section-toolbar">
                <div className="toolbar-left">
                  <h2>Manajemen Flyer & Banner Promosi (Rasio 4:5)</h2>
                  <p>Tambah flyer resmi dari pusat berukuran standar 4:5 beserta kode promo & tautan pesanan outlet.</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenPromoModal(null)}>
                  <i className="fa-solid fa-plus"></i> Tambah Flyer Promo Baru
                </button>
              </div>

              <div className="promos-management-grid">
                {promos.map((p) => (
                  <div key={p.id} className="cms-promo-card">
                    <div className="cms-promo-media">
                      <img src={p.image} alt={p.title} />
                      <span className={`cms-promo-badge ${p.badgeColor === 'red' ? 'red' : ''}`}>{p.badge}</span>
                    </div>
                    <div className="cms-promo-body">
                      <h4 className="cms-promo-title font-serif">{p.title}</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{p.description}</p>
                      <small style={{ color: 'var(--text-dim)', fontSize: '11.5px', display: 'block', marginBottom: '12px' }}>
                        <i className="fa-regular fa-clock"></i> {p.period}
                      </small>
                      <div className="cms-promo-actions">
                        <button className="btn-edit-sm" onClick={() => handleOpenPromoModal(p)}>
                          <i className="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                        <button className="btn-del-sm" onClick={() => handleDeletePromo(p.id)} title="Hapus">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price List Posters Manager */}
              <div className="section-toolbar" style={{ marginTop: '36px' }}>
                <div className="toolbar-left">
                  <h2>Poster Daftar Harga & Menu Resmi (Fitur Zoom Lightbox)</h2>
                  <p>Kelola file poster brosur/price list resmi yang dapat diperbesar dengan navigasi zoom in/out di halaman utama.</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenPricelistModal(null)}>
                  <i className="fa-solid fa-plus"></i> Tambah Poster Price List
                </button>
              </div>

              <div className="promos-management-grid">
                {pricelists.map((pr) => (
                  <div key={pr.id} className="cms-promo-card">
                    <div className="cms-promo-media">
                      <img src={pr.image} alt={pr.title} style={{ objectFit: 'contain', background: '#ede3d1' }} />
                      <span className="cms-promo-badge">{pr.badge || 'Price List'}</span>
                    </div>
                    <div className="cms-promo-body">
                      <h4 className="cms-promo-title font-serif">{pr.title}</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{pr.caption || '-'}</p>
                      <div className="cms-promo-actions">
                        <button className="btn-edit-sm" onClick={() => handleOpenPricelistModal(pr)}>
                          <i className="fa-solid fa-pen-to-square"></i> Edit Poster
                        </button>
                        <button className="btn-del-sm" onClick={() => handleDeletePricelist(pr.id)} title="Hapus">
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ==================== TAB 3: PRODUCTS & STOCKS ==================== */}
          {activeTab === 'products' && (
            <section id="section-products" className="cms-section active">
              <div className="section-toolbar">
                <div className="toolbar-left">
                  <h2>Katalog Menu & Ketersediaan Stok Realtime</h2>
                  <p>Kelola harga resmi, deskripsi, masa ketahanan, serta status stok per cabang outlet Balikpapan.</p>
                </div>
                <div className="toolbar-actions-row">
                  <div className="search-box-cms">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                      type="text"
                      id="product-search-input"
                      placeholder="Cari varian menu..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  <button className="btn-primary" onClick={() => handleOpenProductModal(null)}>
                    <i className="fa-solid fa-plus"></i> Tambah Menu Baru
                  </button>
                </div>
              </div>

              <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive">
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>Foto Menu</th>
                        <th>Nama Varian & Kategori</th>
                        <th>Harga Resmi</th>
                        <th>Berat & Ketahanan</th>
                        <th>Status Stok di Cabang</th>
                        <th style={{ textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products
                        .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.categoryLabel.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((p) => {
                          const stockBadges = (p.outlets || []).map((outStock) => {
                            const outlet = outlets.find(o => o.id === outStock.outletId) || { city: 'Cabang' };
                            const isAvailable = outStock.status === 'Tersedia' || outStock.status === 'ready';
                            const isLimited = outStock.status === 'Terbatas' || outStock.status === 'limited';
                            const tagClass = isAvailable ? '' : (isLimited ? 'limited' : 'empty');
                            const label = isAvailable ? 'Ready' : (isLimited ? 'Terbatas' : 'Habis');
                            return (
                              <span key={outStock.outletId || Math.random()} className={`stock-tag-mini ${tagClass}`}>
                                {outlet.city}: {label}
                              </span>
                            );
                          });

                          return (
                            <tr key={p.id}>
                              <td>
                                <img src={p.image} alt={p.name} className="table-prod-img" />
                              </td>
                              <td>
                                <strong>{p.name}</strong>
                                <div style={{ fontSize: '11.5px', color: 'var(--ch-olive)' }}>{p.categoryLabel}</div>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--ch-gold-dark)' }}>Rp {p.price.toLocaleString('id-ID')}</strong>
                              </td>
                              <td>
                                <div>{p.weight || '700 gram'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.shelfLife || '-'}</div>
                              </td>
                              <td>
                                <div className="prod-stock-badges-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {stockBadges}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    className="btn-edit-sm"
                                    onClick={() => setStocksModal({ open: true, product: p })}
                                    title="Atur Stok Cepat"
                                  >
                                    <i className="fa-solid fa-boxes-stacked"></i>
                                  </button>
                                  <button
                                    className="btn-edit-sm"
                                    onClick={() => handleOpenProductModal(p)}
                                    title="Edit Menu"
                                  >
                                    <i className="fa-solid fa-pen-to-square"></i>
                                  </button>
                                  <button
                                    className="btn-del-sm"
                                    onClick={() => {
                                      if (window.confirm(`Apakah Anda yakin ingin menghapus menu "${p.name}"?`)) {
                                        removeProduct(p.id);
                                      }
                                    }}
                                    title="Hapus Menu"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ==================== TAB 4: OUTLETS & BOOTHS ==================== */}
          {activeTab === 'outlets' && (
            <section id="section-outlets" className="cms-section active">
              <div className="section-toolbar">
                <div className="toolbar-left">
                  <h2>Jaringan Outlet Resmi Kota Balikpapan</h2>
                  <p>Edit alamat cabang, nomor WhatsApp operasional, jam buka WITA, link rute peta, dan titik booth counter.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn-outline"
                    onClick={() => { setBulkOutletModal(true); setBulkPreviewVisible(false); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <i className="fa-solid fa-layer-group" style={{ color: 'var(--ch-gold)' }}></i> Bulk Add / Impor Massal
                  </button>
                  <button className="btn-primary" onClick={() => handleOpenOutletModal(null)}>
                    <i className="fa-solid fa-plus"></i> Tambah Cabang Outlet
                  </button>
                </div>
              </div>

              <div className="outlets-management-grid">
                {outlets.map((o) => {
                  const boothsList = o.booths || [];
                  return (
                    <div key={o.id} className="cms-outlet-card">
                      <div className="cms-outlet-media">
                        <img src={o.image} alt={o.name} />
                      </div>
                      <div className="cms-outlet-body">
                        <h4 className="cms-outlet-name font-serif">{o.name}</h4>
                        <div className="cms-outlet-meta">
                          <span><i className="fa-solid fa-location-dot"></i> {o.address}</span>
                          <span><i className="fa-solid fa-clock"></i> {o.hours}</span>
                          <span><i className="fa-brands fa-whatsapp"></i> +{o.wa}</span>
                        </div>

                        {/* Booths list */}
                        {boothsList.length > 0 ? (
                          <div className="cms-outlet-booths-box" style={{ marginTop: '12px', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--ch-sand-border)' }}>
                            <div className="cms-booths-header" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ch-gold-dark)', marginBottom: '6px' }}>
                              <i className="fa-solid fa-store"></i> {boothsList.length} Titik Booth Counter:
                            </div>
                            <div className="cms-booths-tags" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {boothsList.map((b) => (
                                <div
                                  key={b.id || Math.random()}
                                  className="cms-booth-badge"
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    background: '#fff',
                                    borderRadius: '6px',
                                    border: '1px solid var(--ch-sand-border)'
                                  }}
                                >
                                  <div>
                                    <strong style={{ fontSize: '12px' }}>{b.name}</strong>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.location || b.hours}</div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <a
                                      href={`https://wa.me/${b.wa || o.wa}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#25d366', fontSize: '14px' }}
                                      title={`WhatsApp Booth: ${b.wa || o.wa}`}
                                    >
                                      <i className="fa-brands fa-whatsapp"></i>
                                    </a>
                                    <a
                                      href={b.mapsUrl || o.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(b.name + ' ' + o.city)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#3b82f6', fontSize: '13px' }}
                                      title="Buka Google Maps Titik Booth"
                                    >
                                      <i className="fa-solid fa-map-location-dot"></i>
                                    </a>
                                    <button
                                      type="button"
                                      className="btn-del-mini-booth"
                                      onClick={() => handleDeleteSingleBooth(o.id, b.id)}
                                      title="Hapus Booth Ini"
                                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px 4px' }}
                                    >
                                      <i className="fa-solid fa-xmark"></i>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '8px', fontStyle: 'italic' }}>
                            Belum ada titik booth counter cabang.
                          </div>
                        )}

                        <div className="cms-outlet-actions" style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                          <button className="btn-edit-sm" onClick={() => handleOpenOutletModal(o)} style={{ flex: 1 }}>
                            <i className="fa-solid fa-pen-to-square"></i> Edit Cabang
                          </button>
                          <button
                            className="btn-del-sm"
                            onClick={() => {
                              if (window.confirm(`Apakah Anda yakin ingin menghapus data cabang "${o.name}" beserta semua booth-nya?`)) {
                                removeOutlet(o.id);
                              }
                            }}
                            title="Hapus Cabang"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ==================== TAB 5: OUTLET CATEGORIES / WILAYAH ==================== */}
          {activeTab === 'outlet-categories' && (
            <section id="section-outlet-categories" className="cms-section active">
              <div className="section-toolbar">
                <div className="toolbar-left">
                  <h2>Manajemen Kategori & Wilayah Outlet</h2>
                  <p>Kelola zona wilayah cabang (Balikpapan Selatan, Kota, Utara, Barat, IKN) untuk filter landing page & pengelompokan outlet.</p>
                </div>
                <div className="toolbar-actions-row">
                  <div className="search-box-cms">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                      type="text"
                      id="search-outlet-cat-input"
                      placeholder="Cari kategori wilayah..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                    />
                  </div>
                  <button className="btn-primary" onClick={() => setCategoryModal({ open: true, data: null })}>
                    <i className="fa-solid fa-plus"></i> Tambah Kategori Wilayah
                  </button>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                  <div className="stat-icon olive"><i className="fa-solid fa-map-location-dot"></i></div>
                  <div>
                    <span className="stat-label">Total Kategori Wilayah</span>
                    <span className="stat-value">{categories.length}</span>
                    <span className="stat-desc">Zona distribusi outlet</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green"><i className="fa-solid fa-circle-check"></i></div>
                  <div>
                    <span className="stat-label">Wilayah Aktif</span>
                    <span className="stat-value">{categories.filter(c => c.status !== 'inactive').length}</span>
                    <span className="stat-desc">Tampil di filter landing page</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon gold"><i className="fa-solid fa-store"></i></div>
                  <div>
                    <span className="stat-label">Total Outlet Terhubung</span>
                    <span className="stat-value">{outlets.length}</span>
                    <span className="stat-desc">Cabang resmi teralokasi</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon sand"><i className="fa-solid fa-network-wired"></i></div>
                  <div>
                    <span className="stat-label">Sinkronisasi Cloud</span>
                    <span className="stat-value" style={{ fontSize: '18px', color: '#1b7a42' }}>
                      <i className="fa-solid fa-bolt"></i> Realtime
                    </span>
                    <span className="stat-desc">Supabase PostgreSQL</span>
                  </div>
                </div>
              </div>

              {/* Categories Grid */}
              <div className="outlet-categories-grid">
                {categories
                  .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                  .map((cat) => {
                    const connected = outlets.filter(o => o.city === cat.name || o.region === cat.name);
                    const isActive = cat.status !== 'inactive';
                    return (
                      <div key={cat.id} className={`cms-category-card ${isActive ? '' : 'inactive'}`}>
                        <div className="cat-card-header">
                          <div className={`cat-icon-badge ${cat.badgeColor || 'olive'}`}>
                            <i className={cat.icon || 'fa-solid fa-location-dot'}></i>
                          </div>
                          <div className="cat-title-wrap">
                            <div className="cat-name-row">
                              <h4 className="cat-name font-serif">{cat.name}</h4>
                              <span className={`cat-status-pill ${isActive ? 'active' : 'inactive'}`}>
                                {isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </div>
                            <span className="cat-region"><i className="fa-solid fa-map"></i> {cat.region || 'Kota Balikpapan'}</span>
                          </div>
                        </div>

                        <div className="cat-card-body">
                          <div className="cat-slug-badge">
                            <i className="fa-solid fa-tag"></i> <code>slug: {cat.slug || cat.id}</code>
                            <span className="cat-order-tag" title="Urutan Tampilan">Urutan #{cat.sortOrder || 1}</span>
                          </div>
                          <p className="cat-description">{cat.description || 'Tidak ada deskripsi wilayah tambahan.'}</p>

                          <div className="cat-connected-outlets" style={{ marginTop: '12px' }}>
                            <span className="cat-connected-title"><i className="fa-solid fa-store"></i> {connected.length} Cabang Terhubung:</span>
                            <div className="cat-connected-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                              {connected.map((o) => (
                                <span key={o.id} className="cat-outlet-tag" style={{ fontSize: '11px', background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {o.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="cat-card-footer">
                          <button className="btn-edit-sm" onClick={() => setCategoryModal({ open: true, data: cat })}>
                            <i className="fa-solid fa-pen-to-square"></i> Edit Wilayah
                          </button>
                          <button
                            className="btn-del-sm"
                            onClick={() => {
                              if (window.confirm(`Apakah Anda yakin ingin menghapus kategori wilayah "${cat.name}"?`)) {
                                removeCategory(cat.id);
                              }
                            }}
                            title="Hapus Kategori Wilayah"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* ==================== TAB 6: CUSTOMER SERVICE & ANALYTICS ==================== */}
          {activeTab === 'cs' && (
            <section id="section-cs" className="cms-section active">
              <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0 }}>Layanan CS & Pengaduan Pelanggan</h2>
                    <span id="cs-live-badge" className="badge-live-realtime" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '999px', border: '1px solid #86efac' }}>
                      <span className="live-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span> Live Realtime Aktif
                    </span>
                  </div>
                  <p className="section-desc" style={{ marginTop: '4px' }}>Pesan dan pengaduan pelanggan masuk secara otomatis & realtime dari form publik ke tabel admin.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn-secondary"
                    onClick={refreshCsInquiries}
                    disabled={csLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <i className={`fa-solid fa-arrows-rotate ${csLoading ? 'fa-spin' : ''}`}></i>
                    {csLoading ? 'Menyegarkan CS...' : 'Refresh Data CS'}
                  </button>
                  <button className="btn-primary" onClick={exportCsToExcel} style={{ background: '#16a34a', borderColor: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-file-excel"></i> Ekspor ke Excel (CSV)
                  </button>
                </div>
              </div>

              {/* CS KPI Stats Grid (Interactive Clickable Filters) */}
              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div
                  className="stat-card"
                  onClick={() => setCsFilterStatus('all')}
                  style={{
                    cursor: 'pointer',
                    outline: csFilterStatus === 'all' ? '2px solid var(--primary-olive)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  title="Klik untuk tampilkan semua tiket"
                >
                  <div className="stat-icon olive"><i className="fa-solid fa-inbox"></i></div>
                  <div className="stat-info">
                    <span className="stat-label">Total Pesan & Tiket</span>
                    <h3 className="stat-value">{csInquiries.length}</h3>
                    <span className="stat-desc">Semua pengaduan & masukan</span>
                  </div>
                </div>

                <div
                  className="stat-card"
                  onClick={() => setCsFilterStatus('NEW')}
                  style={{
                    cursor: 'pointer',
                    outline: csFilterStatus === 'NEW' ? '2px solid #dc2626' : 'none',
                    background: csFilterStatus === 'NEW' ? '#fff5f5' : '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                  title="Klik untuk filter hanya tiket baru"
                >
                  <div className="stat-icon red" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <i className="fa-solid fa-bell"></i>
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Tiket Baru (Belum Dibalas)</span>
                    <h3 className="stat-value" style={{ color: '#dc2626' }}>{csNewCount}</h3>
                    <span className="stat-desc">Perlu segera ditindaklanjuti</span>
                  </div>
                </div>

                <div
                  className="stat-card"
                  onClick={() => setCsFilterStatus('IN_PROGRESS')}
                  style={{
                    cursor: 'pointer',
                    outline: csFilterStatus === 'IN_PROGRESS' ? '2px solid #d97706' : 'none',
                    background: csFilterStatus === 'IN_PROGRESS' ? '#fffdf5' : '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                  title="Klik untuk filter tiket yang sedang diproses"
                >
                  <div className="stat-icon gold"><i className="fa-solid fa-spinner"></i></div>
                  <div className="stat-info">
                    <span className="stat-label">Sedang Diproses</span>
                    <h3 className="stat-value" style={{ color: '#d97706' }}>{csInProgressCount}</h3>
                    <span className="stat-desc">Dalam koordinasi outlet</span>
                  </div>
                </div>

                <div
                  className="stat-card"
                  onClick={() => setCsFilterStatus('RESOLVED')}
                  style={{
                    cursor: 'pointer',
                    outline: csFilterStatus === 'RESOLVED' ? '2px solid #16a34a' : 'none',
                    background: csFilterStatus === 'RESOLVED' ? '#f0fdf4' : '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                  title="Klik untuk filter tiket yang sudah selesai"
                >
                  <div className="stat-icon green"><i className="fa-solid fa-circle-check"></i></div>
                  <div className="stat-info">
                    <span className="stat-label">Selesai Ditangani</span>
                    <h3 className="stat-value" style={{ color: '#16a34a' }}>{csResolvedCount}</h3>
                    <span className="stat-desc">Tiket terselesaikan</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon sand" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <i className="fa-solid fa-star"></i>
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Rata-rata Rating</span>
                    <h3 className="stat-value">{csAvgRating} ★</h3>
                    <span className="stat-desc">Indeks kepuasan pembeli</span>
                  </div>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="panel-card cs-filter-toolbar-card" style={{ marginBottom: '20px' }}>
                <div className="cs-filter-toolbar" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div className="cs-filter-inner-wrap" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1 1 540px', alignItems: 'flex-end' }}>
                    <div className="cs-filter-group" style={{ flex: '1 1 180px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Filter Outlet:</label>
                      <select
                        value={csFilterOutlet}
                        onChange={(e) => setCsFilterOutlet(e.target.value)}
                        className="form-control"
                      >
                        <option value="all">Semua Outlet Balikpapan</option>
                        {outlets.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="cs-filter-group" style={{ flex: '1 1 180px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Filter Kategori:</label>
                      <select
                        value={csFilterCategory}
                        onChange={(e) => setCsFilterCategory(e.target.value)}
                        className="form-control"
                      >
                        <option value="all">Semua Kategori</option>
                        <option value="complaint">Komplain / Pengaduan Produk</option>
                        <option value="stock">Tanya Ketersediaan Stok</option>
                        <option value="catering">Pesanan Katering / Jumlah Besar</option>
                        <option value="promo">Klaim Promo & Flyer</option>
                        <option value="partnership">Kerjasama / Reseller B2B</option>
                        <option value="other">Pertanyaan Lainnya</option>
                      </select>
                    </div>

                    <div className="cs-filter-group" style={{ flex: '1 1 160px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Filter Status:</label>
                      <select
                        value={csFilterStatus}
                        onChange={(e) => setCsFilterStatus(e.target.value)}
                        className="form-control"
                      >
                        <option value="all">Semua Status</option>
                        <option value="NEW">🔴 Baru (Belum Ditanggapi)</option>
                        <option value="IN_PROGRESS">🟡 Sedang Diproses</option>
                        <option value="RESOLVED">🟢 Selesai (Resolved)</option>
                      </select>
                    </div>

                    <div className="cs-search-group" style={{ flex: '2 1 200px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Pencarian Data:</label>
                      <div className="cs-search-input-wrap" style={{ position: 'relative' }}>
                        <input
                          type="text"
                          placeholder="Cari nama, WhatsApp, tiket, struk..."
                          value={csSearchInput}
                          onChange={(e) => setCsSearchInput(e.target.value)}
                          className="form-control"
                          style={{ paddingLeft: '32px' }}
                        />
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}></i>
                      </div>
                    </div>
                  </div>

                  {(csFilterOutlet !== 'all' || csFilterCategory !== 'all' || csFilterStatus !== 'all' || csSearchInput) && (
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      onClick={() => {
                        setCsFilterOutlet('all');
                        setCsFilterCategory('all');
                        setCsFilterStatus('all');
                        setCsSearchInput('');
                      }}
                      style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '9px 14px', whiteSpace: 'nowrap' }}
                      title="Kembalikan semua filter ke awal"
                    >
                      <i className="fa-solid fa-rotate-left"></i> Reset Filter
                    </button>
                  )}
                </div>
              </div>

              {/* CS Inquiries Table */}
              <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive">
                  <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f7f4', fontSize: '12.5px', borderBottom: '1px solid var(--border-sand)' }}>
                        <th style={{ padding: '12px 16px' }}>No Tiket & Tanggal</th>
                        <th style={{ padding: '12px 16px' }}>Pelanggan & Kontak</th>
                        <th style={{ padding: '12px 16px' }}>Outlet Tujuan</th>
                        <th style={{ padding: '12px 16px' }}>Kategori & Rating</th>
                        <th style={{ padding: '12px 16px', minWidth: '220px' }}>Pesan & Kendala</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Foto Struk</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csLoading && (!csInquiries || csInquiries.length === 0) ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                            <i className="fa-solid fa-arrows-rotate fa-spin" style={{ fontSize: '28px', color: 'var(--primary-olive)', marginBottom: '12px', display: 'block' }}></i>
                            <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>Memuat Data Layanan CS...</strong>
                            <span style={{ fontSize: '12px' }}>Menghubungkan ke database pengaduan pelanggan secara aman.</span>
                          </td>
                        </tr>
                      ) : filteredCsList.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                            <i className="fa-regular fa-folder-open" style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '12px', display: 'block' }}></i>
                            <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>Belum Ada Tiket yang Sesuai</strong>
                            <span style={{ fontSize: '12px' }}>
                              {csSearchInput || csFilterStatus !== 'all' || csFilterOutlet !== 'all' || csFilterCategory !== 'all'
                                ? 'Coba reset filter atau kata kunci pencarian Anda.'
                                : 'Pesan & aduan dari pelanggan akan otomatis tampil di sini secara live realtime.'}
                            </span>
                          </td>
                        </tr>
                      ) : (
                        filteredCsList.map((item) => {
                          const catMeta = CS_CATEGORY_LABELS[item.category] || CS_CATEGORY_LABELS.other;
                          const dateObj = item.created_at ? new Date(item.created_at) : new Date();
                          const dateFormatted = dateObj.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) + ' WITA';

                          const ratingStars = '★'.repeat(Math.max(1, Math.min(5, Number(item.rating) || 5)));
                          const waReplyText = encodeURIComponent(
                            `Halo Kak ${item.name},\n\nTerima kasih telah menghubungi Customer Service Amanda Brownies Balikpapan terkait tiket *#${item.id}*.\n\nKami siap membantu tindak lanjut pesanan/kendala Kakak...`
                          );
                          const waLink = `https://wa.me/${item.phone}?text=${waReplyText}`;

                          // Extract photos
                          let imagesList = [];
                          if (Array.isArray(item.receipt_images) && item.receipt_images.length > 0) {
                            imagesList = item.receipt_images.filter(img => typeof img === 'string' && img.length > 0);
                          } else if (item.receipt_image && typeof item.receipt_image === 'string') {
                            imagesList = [item.receipt_image];
                          }

                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-sand-light)', fontSize: '13px' }}>
                              <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 700, color: 'var(--primary-olive)', fontFamily: 'monospace' }}>
                                  #{item.id}{' '}
                                  {item.status === 'NEW' && (
                                    <span style={{ fontSize: '10px', background: '#dc2626', color: '#fff', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px' }}>
                                      BARU
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{dateFormatted}</div>
                              </td>

                              <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#16a34a', fontWeight: 600, textDecoration: 'none', marginTop: '2px' }}
                                >
                                  <i className="fa-brands fa-whatsapp"></i> +{item.phone}
                                </a>
                              </td>

                              <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                                  {item.outlet_name || 'Amanda Brownies'}
                                </div>
                                {item.receipt_number && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                    No Struk: <strong>#{item.receipt_number}</strong>
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#fff', background: catMeta.badgeColor, padding: '3px 8px', borderRadius: '12px' }}>
                                  <i className={catMeta.icon}></i> {catMeta.label}
                                </span>
                                <div style={{ color: '#eab308', fontSize: '12px', marginTop: '4px' }}>
                                  {ratingStars} <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>({item.rating || 5}/5)</span>
                                </div>
                              </td>

                              <td style={{ padding: '12px 16px', verticalAlign: 'top', maxWidth: '280px' }}>
                                <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--text-main)', background: '#fdfbf7', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-sand-light)' }}>
                                  {item.message}
                                </div>
                              </td>

                              <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'top' }}>
                                {imagesList.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                      {imagesList.slice(0, 2).map((imgSrc, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => handleOpenReceiptModal(item, idx)}
                                          style={{ background: 'none', border: '1px solid var(--border-sand)', padding: '2px', borderRadius: '6px', cursor: 'pointer' }}
                                        >
                                          <img src={imgSrc} alt="Struk" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', display: 'block' }} />
                                        </button>
                                      ))}
                                    </div>
                                    <span
                                      style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--primary-olive)', cursor: 'pointer' }}
                                      onClick={() => handleOpenReceiptModal(item, 0)}
                                    >
                                      <i className="fa-solid fa-images"></i> {imagesList.length} Foto
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-dim)', fontSize: '11.5px', fontStyle: 'italic' }}>Tanpa Lampiran</span>
                                )}
                              </td>

                              <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'top' }}>
                                <select
                                  value={item.status || 'NEW'}
                                  onChange={(e) => updateCsStatus(item.id, e.target.value)}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    cursor: 'pointer',
                                    background: item.status === 'NEW' ? '#fee2e2' : (item.status === 'IN_PROGRESS' ? '#fef3c7' : '#dcfce7'),
                                    color: item.status === 'NEW' ? '#dc2626' : (item.status === 'IN_PROGRESS' ? '#d97706' : '#16a34a'),
                                    borderColor: item.status === 'NEW' ? '#fca5a5' : (item.status === 'IN_PROGRESS' ? '#fde68a' : '#86efac')
                                  }}
                                >
                                  <option value="NEW">🔴 Baru</option>
                                  <option value="IN_PROGRESS">🟡 Diproses</option>
                                  <option value="RESOLVED">🟢 Selesai</option>
                                </select>
                              </td>

                              <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn-secondary-sm"
                                    onClick={() => {
                                      setActiveTab('waha');
                                      showToast(`Membuka WAHA Gateway untuk tiket #${item.id}...`, 'info');
                                    }}
                                    style={{ color: '#15803d', borderColor: '#86efac', background: '#dcfce7', padding: '5px 9px', fontWeight: 600 }}
                                    title="Kirim Pesan via WAHA Gateway"
                                  >
                                    <i className="fa-solid fa-paper-plane"></i> WAHA
                                  </button>
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary-sm"
                                    style={{ color: '#16a34a', borderColor: '#86efac', textDecoration: 'none', padding: '5px 9px' }}
                                    title="Balas via WhatsApp Web Manual"
                                  >
                                    <i className="fa-brands fa-whatsapp"></i>
                                  </a>
                                  <button
                                    type="button"
                                    className="btn-secondary-sm"
                                    onClick={() => setCsDetailModal({ open: true, inquiry: item })}
                                    style={{ padding: '5px 9px' }}
                                    title="Tanggapi & Tambah Catatan"
                                  >
                                    <i className="fa-solid fa-pen-to-square"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-secondary-sm"
                                    onClick={() => deleteCsInquiry(item.id)}
                                    style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '5px 9px' }}
                                    title="Hapus Tiket"
                                  >
                                    <i className="fa-solid fa-trash-can"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ==================== TAB: WAHA MANAGEMENT ==================== */}
          {activeTab === 'waha' && (
            <WahaManagement
              csInquiries={csInquiries}
              outlets={outlets}
              showToast={showToast}
              onNavigateCs={() => setActiveTab('cs')}
            />
          )}

          {/* ==================== TAB 7: TICKER ==================== */}
          {activeTab === 'ticker' && (
            <section id="section-ticker" className="cms-section active">
              <div className="section-toolbar">
                <div className="toolbar-left">
                  <h2>Running Promo Ticker (Marquee Balikpapan)</h2>
                  <p>Kelola teks pengumuman berjalan di bagian atas landing page.</p>
                </div>
                <button className="btn-primary" onClick={() => setTickerModal({ open: true, data: null })}>
                  <i className="fa-solid fa-plus"></i> Tambah Pengumuman Ticker
                </button>
              </div>

              <div className="panel-card">
                <div className="ticker-list" id="ticker-list-container">
                  {ticker.map((t) => (
                    <div key={t.id} className="ticker-cms-item">
                      <div className="ticker-cms-content">
                        <div className="ticker-cms-icon"><i className={t.icon || 'fa-solid fa-bullhorn'}></i></div>
                        <div className="ticker-cms-text">
                          <strong>{t.title}</strong> {t.text}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-edit-sm" onClick={() => setTickerModal({ open: true, data: t })}>
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button className="btn-del-sm" onClick={() => handleDeleteTicker(t.id)}>
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ==================== TAB 8: SETTINGS, BACKUP & RESET ==================== */}
          {activeTab === 'settings' && (
            <section id="section-settings" className="cms-section active">
              <div className="section-toolbar">
                <div className="toolbar-left">
                  <h2>Pencadangan, Pemulihan & Reset Data</h2>
                  <p>Simpan data konfigurasi dalam format JSON atau reset kembali ke data default pabrik.</p>
                </div>
              </div>

              <div className="settings-grid">
                <div className="panel-card">
                  <div className="panel-head">
                    <div className="panel-head-title">
                      <i className="fa-solid fa-download" style={{ color: 'var(--primary-olive)' }}></i>
                      <h3>Ekspor Cadangan (Backup JSON)</h3>
                    </div>
                  </div>
                  <div className="panel-body">
                    <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Unduh seluruh database (produk, stok outlet, flyer 4:5, cabang, dan ticker) dalam satu file JSON untuk dicadangkan.
                    </p>
                    <button className="btn-primary" onClick={handleExportBackup}>
                      <i className="fa-solid fa-file-arrow-down"></i> Unduh File Backup JSON
                    </button>
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-head">
                    <div className="panel-head-title">
                      <i className="fa-solid fa-upload" style={{ color: 'var(--primary-gold)' }}></i>
                      <h3>Impor File Cadangan</h3>
                    </div>
                  </div>
                  <div className="panel-body">
                    <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Pulihkan data dari file JSON yang telah dicadangkan sebelumnya.
                    </p>
                    <input
                      type="file"
                      id="import-json-input"
                      accept=".json"
                      style={{ display: 'none' }}
                      onChange={handleImportBackupFile}
                    />
                    <button
                      className="btn-secondary"
                      onClick={() => document.getElementById('import-json-input').click()}
                    >
                      <i className="fa-solid fa-file-arrow-up"></i> Pilih File JSON & Impor
                    </button>
                  </div>
                </div>

                <div className="panel-card" style={{ borderColor: 'rgba(192, 57, 43, 0.4)' }}>
                  <div className="panel-head">
                    <div className="panel-head-title">
                      <i className="fa-solid fa-rotate-left" style={{ color: 'var(--accent-red)' }}></i>
                      <h3>Reset ke Data Default Balikpapan</h3>
                    </div>
                  </div>
                  <div className="panel-body">
                    <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Kembalikan semua varian produk, promo flyer 4:5, dan 12 cabang resmi ke konfigurasi bawaan semula.
                    </p>
                    <button className="btn-danger" onClick={handleConfirmReset}>
                      <i className="fa-solid fa-trash-can"></i> Reset Semua Data ke Default
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ==================== TAB 9: SECURITY & API VAULT ==================== */}
          {activeTab === 'security' && (
            <section id="section-security" className="cms-section active">
              <div className="section-toolbar">
                <div className="toolbar-left">
                  <h2>Vault Kunci API, Database & Keamanan Kredensial</h2>
                  <p>Kelola Service Role Secret Key, Anon Key Supabase, integrasi Cloudflare, dan keamanan akun admin dalam satu brankas terpusat.</p>
                </div>
                <button className="btn-secondary" onClick={refreshAllData}>
                  <i className="fa-solid fa-arrows-rotate"></i> Muat Ulang Vault
                </button>
              </div>

              {/* Status Banner */}
              <div
                className="vault-status-banner"
                style={{
                  background: 'rgba(79, 91, 42, 0.08)',
                  border: '1px solid rgba(79, 91, 42, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 22px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--ch-olive)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    <i className="fa-solid fa-shield-check"></i>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 2px' }}>
                      Status Vault Database Cloud: <span style={{ color: 'var(--ch-olive-dark)' }}>Tersambung Aktif</span>
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                      Terakhir disinkronkan ke PostgreSQL: Baru saja
                    </p>
                  </div>
                </div>
                <button
                  className="btn-primary-sm"
                  onClick={async () => {
                    showToast('Menguji koneksi ke database Supabase...');
                    await refreshAllData();
                    showToast('Koneksi ke Supabase PostgreSQL berhasil!');
                  }}
                >
                  <i className="fa-solid fa-bolt"></i> Uji Koneksi Database
                </button>
              </div>

              <div className="settings-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
                {/* Supabase Database Credentials */}
                <div className="panel-card" style={{ gridColumn: 'span 2' }}>
                  <div className="panel-head">
                    <div className="panel-head-title">
                      <i className="fa-solid fa-database" style={{ color: 'var(--primary-olive)' }}></i>
                      <h3>Kredensial Database Supabase Cloud</h3>
                    </div>
                    <span className="badge-pill olive"><i className="fa-solid fa-lock"></i> Terisolasi Aman</span>
                  </div>
                  <div className="panel-body">
                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Supabase Project URL *</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Format: https://[project-id].supabase.co</span>
                      </label>
                      <div className="input-with-icon">
                        <i className="fa-solid fa-globe"></i>
                        <input type="url" readOnly value={vaultUrl} />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Supabase Publishable / Anon Key *</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}><i className="fa-solid fa-eye"></i> Kunci Publik Frontend</span>
                      </label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <i className="fa-solid fa-key"></i>
                        <input
                          type={showKey ? 'text' : 'password'}
                          readOnly
                          value={vaultKey}
                          style={{ paddingRight: '42px' }}
                        />
                        <button
                          type="button"
                          className="btn-toggle-eye"
                          onClick={() => setShowKey(!showKey)}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                        >
                          <i className={`fa-regular ${showKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CMS Admin Credentials Manager */}
                <div className="panel-card">
                  <div className="panel-head">
                    <div className="panel-head-title">
                      <i className="fa-solid fa-user-lock" style={{ color: 'var(--primary-gold)' }}></i>
                      <h3>Kelola Akun Admin CMS</h3>
                    </div>
                  </div>
                  <div className="panel-body">
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Ganti email dan password login panel CMS. Password otomatis dienkripsi dengan standar hash <strong>SHA-256</strong> sebelum disimpan.
                    </p>
                    <form onSubmit={handleUpdateAdminProfile}>
                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label>Nama Admin / Tenant</label>
                        <input
                          type="text"
                          required
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label>Email Login Admin *</label>
                        <input
                          type="email"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '18px' }}>
                        <label>Kata Sandi Baru (Kosongkan jika tidak ingin diubah)</label>
                        <div className="input-with-icon" style={{ position: 'relative' }}>
                          <i className="fa-solid fa-lock"></i>
                          <input
                            type={showAdminPass ? 'text' : 'password'}
                            placeholder="••••••••••••"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            style={{ paddingRight: '42px' }}
                          />
                          <button
                            type="button"
                            className="btn-toggle-eye"
                            onClick={() => setShowAdminPass(!showAdminPass)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                          >
                            <i className={`fa-regular ${showAdminPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                      </div>
                      <button type="submit" className="btn-secondary" style={{ width: '100%' }}>
                        <i className="fa-solid fa-key"></i> Perbarui Kredensial Login
                      </button>
                    </form>
                  </div>
                </div>

                {/* RLS Info Card */}
                <div className="panel-card">
                  <div className="panel-head">
                    <div className="panel-head-title">
                      <i className="fa-solid fa-shield-halved" style={{ color: 'var(--accent-green)' }}></i>
                      <h3>Standar Keamanan Database (RLS)</h3>
                    </div>
                  </div>
                  <div className="panel-body">
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                      <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent-green)', marginTop: '3px' }}></i>
                        <span><strong>Anon Key Terisolasi:</strong> Pengunjung publik hanya memiliki izin baca (SELECT) untuk menu, promo, dan outlet.</span>
                      </li>
                      <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent-green)', marginTop: '3px' }}></i>
                        <span><strong>Proteksi Tabel Settings:</strong> Tabel konfigurasi diproteksi dan hanya bisa diakses via otentikasi admin.</span>
                      </li>
                      <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent-green)', marginTop: '3px' }}></i>
                        <span><strong>Nol Plain-Text Secret di Git:</strong> Kunci rahasia dikelola secara dinamis via Cloud Vault.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* CMS MODALS (ALL STYLED WITH ORIGINAL CMS-MODAL-OVERLAY & CARD) */}
      {/* ========================================================================= */}

      {/* 1. PROMO FLYER MODAL */}
      {promoModal.open && (
        <div className="cms-modal-overlay active" onClick={() => setPromoModal({ open: false, data: null })}>
          <div className="cms-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{promoModal.data ? 'Edit Flyer Promo (4:5)' : 'Tambah Flyer Promo Baru (4:5)'}</h3>
              <button className="modal-close-btn" onClick={() => setPromoModal({ open: false, data: null })}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSavePromo}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Judul Promo *</label>
                  <input type="text" name="title" required defaultValue={promoModal.data?.title || ''} placeholder="Contoh: Diskon 20% Semua Varian" />
                </div>
                <div className="form-group">
                  <label>Label Badge *</label>
                  <input type="text" name="badge" required defaultValue={promoModal.data?.badge || 'Flash Sale Balikpapan'} />
                </div>
              </div>

              <div className="form-group">
                <label>Warna Tema Badge</label>
                <select name="badgeColor" defaultValue={promoModal.data?.badgeColor || 'gold'}>
                  <option value="gold">Gold / Kuning Emas</option>
                  <option value="red">Merah Spesial</option>
                  <option value="olive">Hijau Olive</option>
                </select>
              </div>

              <div className="form-group">
                <label>Upload Foto Poster Flyer (Rasio 4:5) *</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="promo-file-input"
                    accept="image/*"
                    className="file-upload-input"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        try {
                          const dataUrl = await processImageFile(file);
                          setPromoImgPreview(dataUrl);
                        } catch (err) { alert(err.message); }
                      }
                    }}
                  />
                  <label htmlFor="promo-file-input" className="file-upload-dropzone">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span className="dropzone-main-text">Pilih Foto dari Perangkat / HP</span>
                    <span className="dropzone-sub-text">Klik di sini untuk upload foto flyer (JPG, PNG, WEBP)</span>
                  </label>
                </div>

                <div className="image-url-toggle-wrap">
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>Atau gunakan path / link gambar:</span>
                  <input
                    type="text"
                    name="image"
                    value={promoImgPreview}
                    onChange={(e) => setPromoImgPreview(e.target.value)}
                  />
                </div>

                <div className="image-preview-box" style={{ width: '120px', aspectRatio: '4/5', marginTop: '10px' }}>
                  <img src={promoImgPreview || '/assets/promo_flyer_1.jpg'} alt="Preview Flyer" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                </div>
              </div>

              <div className="form-group">
                <label>Periode Masa Berlaku *</label>
                <input type="text" name="period" required defaultValue={promoModal.data?.period || 'Berlaku Hari Ini s/d Pukul 21:30 WITA'} />
              </div>

              <div className="form-group">
                <label>Deskripsi Singkat Promo</label>
                <textarea name="description" rows="3" defaultValue={promoModal.data?.description || ''} placeholder="Rincian keuntungan dan syarat promo..."></textarea>
              </div>

              <div className="form-group">
                <label>Pesan Default WhatsApp</label>
                <input type="text" name="waMessage" defaultValue={promoModal.data?.waMessage || ''} placeholder="Halo Amanda Brownies Balikpapan, saya ingin klaim promo ini..." />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setPromoModal({ open: false, data: null })}>Batal</button>
                <button type="submit" className="btn-primary"><i className="fa-solid fa-floppy-disk"></i> Simpan Flyer Promo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PRODUCT & STOCKS MODAL */}
      {productModal.open && (
        <div className="cms-modal-overlay active" onClick={() => setProductModal({ open: false, data: null })}>
          <div className="cms-modal-card large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{productModal.data ? 'Edit Menu & Stok: ' + productModal.data.name : 'Tambah Menu Brownies Baru'}</h3>
              <button className="modal-close-btn" onClick={() => setProductModal({ open: false, data: null })}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Nama Varian Menu *</label>
                  <input type="text" name="name" required defaultValue={productModal.data?.name || ''} placeholder="Contoh: Brownies Kukus Original" />
                </div>
                <div className="form-group">
                  <label>Kategori *</label>
                  <select name="category" defaultValue={productModal.data?.category || 'kukus'}>
                    <option value="kukus">Brownies Kukus</option>
                    <option value="bakar">Brownies Bakar</option>
                    <option value="marble">Premium & Marble</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Harga Resmi (Rp) *</label>
                  <input type="number" name="price" required defaultValue={productModal.data?.price || 48000} />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Berat Bersih</label>
                  <input type="text" name="weight" defaultValue={productModal.data?.weight || '700 gram'} />
                </div>
                <div className="form-group">
                  <label>Masa Ketahanan</label>
                  <input type="text" name="shelfLife" defaultValue={productModal.data?.shelfLife || '4 Hari (Suhu Ruang) / 7 Hari (Kulkas)'} />
                </div>
                <div className="form-group">
                  <label>Badge Sorotan</label>
                  <input type="text" name="badge" defaultValue={productModal.data?.badge || 'Varian Pilihan'} />
                </div>
              </div>

              <div className="form-group">
                <label>Upload Foto Produk *</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="prod-file-input"
                    accept="image/*"
                    className="file-upload-input"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        try {
                          const dataUrl = await processImageFile(file);
                          setProdImgPreview(dataUrl);
                        } catch (err) { alert(err.message); }
                      }
                    }}
                  />
                  <label htmlFor="prod-file-input" className="file-upload-dropzone">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span className="dropzone-main-text">Pilih Foto Produk dari Perangkat / HP</span>
                    <span className="dropzone-sub-text">Klik di sini untuk upload foto brownies</span>
                  </label>
                </div>

                <div className="image-url-toggle-wrap">
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>Atau path / link gambar:</span>
                  <input
                    type="text"
                    name="image"
                    value={prodImgPreview}
                    onChange={(e) => setProdImgPreview(e.target.value)}
                  />
                </div>

                <div className="image-preview-box" style={{ width: '140px', aspectRatio: '16/10', marginTop: '10px' }}>
                  <img src={prodImgPreview || '/assets/amanda_brownies_hero_1790255505694.jpg'} alt="Preview Produk" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                </div>
              </div>

              <div className="form-group">
                <label>Deskripsi Rasa & Kelezatan</label>
                <textarea name="description" rows="2" defaultValue={productModal.data?.description || ''}></textarea>
              </div>

              {/* Per-Outlet Stocks Table */}
              <div className="stocks-manager-section" style={{ marginTop: '18px' }}>
                <h4><i className="fa-solid fa-boxes-stacked" style={{ color: 'var(--primary-olive)' }}></i> Status Ketersediaan di Cabang Balikpapan</h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Atur ketersediaan stok untuk masing-masing cabang outlet saat ini.
                </p>

                <div className="stocks-table-wrap">
                  <table className="stocks-mini-table">
                    <thead>
                      <tr>
                        <th>Cabang Outlet</th>
                        <th>Status Stok</th>
                        <th>Keterangan Stok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outlets.map((out) => {
                        const existingStock = (productModal.data?.outlets || []).find(os => os.outletId === out.id) || {
                          status: 'Tersedia',
                          stock: 'Stok Melimpah (30+ box)'
                        };
                        return (
                          <tr key={out.id}>
                            <td>
                              <strong>{out.name}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{out.city}</div>
                            </td>
                            <td>
                              <select
                                id={`prod-modal-stock-status-${out.id}`}
                                defaultValue={existingStock.status}
                                className="stock-status-select"
                              >
                                <option value="Tersedia">Tersedia (Ready)</option>
                                <option value="Terbatas">Terbatas (Sisa Sedikit)</option>
                                <option value="Habis">Habis (Sold Out)</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                id={`prod-modal-stock-desc-${out.id}`}
                                defaultValue={existingStock.stock || 'Stok Melimpah'}
                                className="stock-desc-input"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setProductModal({ open: false, data: null })}>Batal</button>
                <button type="submit" className="btn-primary"><i className="fa-solid fa-floppy-disk"></i> Simpan Menu Produk</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. QUICK STOCKS MANAGER MODAL */}
      {stocksModal.open && (
        <div className="cms-modal-overlay active" onClick={() => setStocksModal({ open: false, product: null })}>
          <div className="cms-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-head">
              <h3>Kelola Stok: {stocksModal.product?.name}</h3>
              <button className="modal-close-btn" onClick={() => setStocksModal({ open: false, product: null })}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px 20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Atur status stok (Ready, Terbatas, Habis) untuk produk ini di seluruh cabang Kalimantan.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {outlets.map((out) => {
                  const existingStock = (stocksModal.product?.outlets || []).find(s => s.outletId === out.id || s.name === out.name);
                  return (
                    <div key={out.id} className="stock-manage-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--ch-sand-border)' }}>
                      <div>
                        <strong>{out.name}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{out.city}</span>
                      </div>
                      <div className="stock-manage-inputs" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <select
                          defaultValue={existingStock?.status || 'Tersedia'}
                          id={`quick-stock-status-${out.id}`}
                          className="stock-status-select"
                        >
                          <option value="Tersedia">Tersedia (Ready)</option>
                          <option value="Terbatas">Terbatas (Sisa Sedikit)</option>
                          <option value="Habis">Habis (Sold Out)</option>
                        </select>
                        <input
                          type="text"
                          defaultValue={existingStock?.stock || 'Stok Melimpah'}
                          id={`quick-stock-desc-${out.id}`}
                          placeholder="Keterangan"
                          style={{ width: '130px', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--ch-sand-border)' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid var(--ch-sand-border)' }}>
              <button type="button" className="btn-secondary" onClick={() => setStocksModal({ open: false, product: null })}>Batal</button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const updatedStocks = outlets.map(out => {
                    const statusEl = document.getElementById(`quick-stock-status-${out.id}`);
                    const descEl = document.getElementById(`quick-stock-desc-${out.id}`);
                    return {
                      outletId: out.id,
                      name: out.name,
                      status: statusEl ? statusEl.value : 'Tersedia',
                      stock: descEl ? descEl.value.trim() : 'Stok Melimpah'
                    };
                  });
                  handleSaveStock(stocksModal.product.id, updatedStocks);
                }}
              >
                <i className="fa-solid fa-floppy-disk"></i> Simpan Semua Stok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. OUTLET MODAL WITH BOOTHS EDITOR */}
      {outletModal.open && (
        <div className="cms-modal-overlay active" onClick={() => setOutletModal({ open: false, data: null })}>
          <div className="cms-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
            <div className="modal-head">
              <h3>{outletModal.data ? 'Edit Data Cabang Outlet Balikpapan' : 'Tambah Cabang Outlet Balikpapan'}</h3>
              <button className="modal-close-btn" onClick={() => setOutletModal({ open: false, data: null })}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSaveOutlet}>
              <div className="form-group">
                <label>Nama Cabang Outlet *</label>
                <input type="text" name="name" required defaultValue={outletModal.data?.name || ''} placeholder="Contoh: Amanda Brownies Outlet MT Haryono" />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Wilayah Kecamatan / Kota *</label>
                  <select name="city" defaultValue={outletModal.data?.city || (categories[0]?.name || 'Balikpapan')}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Jam Operasional (WITA) *</label>
                  <input type="text" name="hours" required defaultValue={outletModal.data?.hours || '07.00 - 22.00 WITA'} />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Nomor WhatsApp (Format 62xxx) *</label>
                  <input type="text" name="wa" required defaultValue={outletModal.data?.wa || '6281241075981'} placeholder="6281241075981" />
                </div>
                <div className="form-group">
                  <label>Nomor Telepon Toko</label>
                  <input type="text" name="phone" defaultValue={outletModal.data?.phone || ''} placeholder="(0542) 876-5432" />
                </div>
              </div>

              <div className="form-group">
                <label>Alamat Lengkap Cabang *</label>
                <textarea name="address" required rows="2" defaultValue={outletModal.data?.address || ''} placeholder="Jl. MT Haryono No. 15, Damai..."></textarea>
              </div>

              <div className="form-group">
                <label>Upload Foto Storefront Fasad Toko *</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="outlet-file-input"
                    accept="image/*"
                    className="file-upload-input"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        try {
                          const dataUrl = await processImageFile(file);
                          setOutletImgPreview(dataUrl);
                        } catch (err) { alert(err.message); }
                      }
                    }}
                  />
                  <label htmlFor="outlet-file-input" className="file-upload-dropzone">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span className="dropzone-main-text">Pilih Foto Toko dari Perangkat / HP</span>
                    <span className="dropzone-sub-text">Format: JPG, PNG, WEBP</span>
                  </label>
                </div>

                <div className="image-url-toggle-wrap">
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>Atau path / link gambar:</span>
                  <input
                    type="text"
                    name="image"
                    value={outletImgPreview}
                    onChange={(e) => setOutletImgPreview(e.target.value)}
                  />
                </div>

                <div className="image-preview-box" style={{ width: '140px', aspectRatio: '16/10', marginTop: '10px' }}>
                  <img src={outletImgPreview || '/assets/outlet_mt_haryono.jpg'} alt="Preview Toko" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                </div>
              </div>

              <div className="form-group">
                <label>Tautan Google Maps</label>
                <input type="text" name="mapsUrl" defaultValue={outletModal.data?.mapsUrl || ''} placeholder="https://maps.google.com/?q=Amanda+Brownies+Balikpapan" />
              </div>

              {/* BOOTHS MANAGER SECTION */}
              <div className="stocks-manager-section" style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '13.5px' }}>
                    <i className="fa-solid fa-store" style={{ color: 'var(--ch-olive)' }}></i> Titik Booth Counter Cabang
                  </h4>
                  <button type="button" className="btn-secondary-sm" onClick={handleAddBoothRow}>
                    <i className="fa-solid fa-plus"></i> Tambah Booth
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Booth counter ini akan otomatis tampil di menu dropdown navbar dan kartu outlet di halaman depan.
                </p>

                <div className="outlet-booths-editor-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {outletBooths.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                      Belum ada booth counter. Klik "+ Tambah Booth" untuk menambahkan titik penjualan di area ini.
                    </div>
                  ) : (
                    outletBooths.map((booth, bIdx) => (
                      <div
                        key={booth.id || bIdx}
                        style={{
                          background: 'rgba(0,0,0,0.02)',
                          border: '1px solid var(--ch-sand-border)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ch-olive-dark)' }}>Booth #{bIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteBoothRow(bIdx)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}
                          >
                            <i className="fa-solid fa-trash"></i> Hapus
                          </button>
                        </div>
                        <div className="booth-editor-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', display: 'block', fontWeight: 600 }}>
                              <i className="fa-solid fa-store" style={{ marginRight: '4px', color: 'var(--ch-gold-dark)' }}></i> Nama Titik Booth *
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: Booth Point Sales Bandara"
                              value={booth.name || ''}
                              onChange={(e) => handleUpdateBoothField(bIdx, 'name', e.target.value)}
                              style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--ch-sand-border)', boxSizing: 'border-box' }}
                              required
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', display: 'block', fontWeight: 600 }}>
                              <i className="fa-solid fa-location-dot" style={{ marginRight: '4px', color: 'var(--ch-olive)' }}></i> Lokasi Detail / Mall
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: Gate 4 Ruang Tunggu"
                              value={booth.location || ''}
                              onChange={(e) => handleUpdateBoothField(bIdx, 'location', e.target.value)}
                              style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--ch-sand-border)', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        <div className="booth-editor-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', display: 'block', fontWeight: 600 }}>
                              <i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: '4px' }}></i> No. WA Khusus Booth (62xxx)
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: 6281241075981"
                              value={booth.wa || ''}
                              onChange={(e) => handleUpdateBoothField(bIdx, 'wa', e.target.value)}
                              style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--ch-sand-border)', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', display: 'block', fontWeight: 600 }}>
                              <i className="fa-regular fa-clock" style={{ marginRight: '4px' }}></i> Jam Operasional
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: 08.00 - 21.00 WITA"
                              value={booth.hours || ''}
                              onChange={(e) => handleUpdateBoothField(bIdx, 'hours', e.target.value)}
                              style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--ch-sand-border)', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        <div className="booth-editor-row" style={{ marginTop: '2px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', display: 'block', fontWeight: 600 }}>
                            <i className="fa-solid fa-map-location-dot" style={{ color: '#e74c3c', marginRight: '4px' }}></i> Tautan Google Maps Titik Booth
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: https://maps.app.goo.gl/... atau https://maps.google.com/?q=..."
                            value={booth.mapsUrl || ''}
                            onChange={(e) => handleUpdateBoothField(bIdx, 'mapsUrl', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--ch-sand-border)', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '18px' }}>
                <button type="button" className="btn-secondary" onClick={() => setOutletModal({ open: false, data: null })}>Batal</button>
                <button type="submit" className="btn-primary"><i className="fa-solid fa-floppy-disk"></i> Simpan Data Cabang</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. BULK ADD OUTLETS & BOOTHS MODAL */}
      {bulkOutletModal && (
        <div className="cms-modal-overlay active" onClick={() => setBulkOutletModal(false)}>
          <div className="cms-modal-card" style={{ maxWidth: '960px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head" style={{ flexShrink: 0 }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <i className="fa-solid fa-layer-group" style={{ color: 'var(--ch-gold)' }}></i>
                  Bulk Add / Impor Massal Outlet & Booth Counter
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                  Tambahkan banyak cabang outlet dan titik booth counter sekaligus dengan cepat ke database.
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setBulkOutletModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="bulk-modal-body" style={{ overflowY: 'auto', flex: 1, padding: '18px 24px' }}>
              {/* Tab Selector */}
              <div className="bulk-tab-nav" style={{ display: 'flex', gap: '8px', marginBottom: '18px', borderBottom: '2px solid var(--ch-sand-border)', paddingBottom: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`bulk-tab-btn ${bulkTab === 'excel' ? 'active' : ''}`}
                  onClick={() => setBulkTab('excel')}
                >
                  <i className="fa-solid fa-file-excel" style={{ color: '#27ae60' }}></i> Mode 1: File Excel (.csv)
                </button>
                <button
                  type="button"
                  className={`bulk-tab-btn ${bulkTab === 'text' ? 'active' : ''}`}
                  onClick={() => setBulkTab('text')}
                >
                  <i className="fa-solid fa-file-lines"></i> Mode 2: Copy-Paste Teks
                </button>
                <button
                  type="button"
                  className={`bulk-tab-btn ${bulkTab === 'json' ? 'active' : ''}`}
                  onClick={() => setBulkTab('json')}
                >
                  <i className="fa-solid fa-code"></i> Mode 3: Impor JSON
                </button>
              </div>

              {/* Tab 1: Excel CSV Upload */}
              {bulkTab === 'excel' && (
                <div>
                  <div style={{ background: 'linear-gradient(135deg, #f3faf5, #e8f5e9)', border: '1.5px dashed #27ae60', borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '52px', height: '52px', background: '#27ae60', color: '#fff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '12px' }}>
                      <i className="fa-solid fa-file-excel"></i>
                    </div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '16px', color: '#1e7e34' }}>Upload File Excel / Spreadsheet (.csv)</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '540px', margin: '0 auto 16px' }}>
                      Pilih file spreadsheet dari komputer/laptop Anda. Sistem akan mengekstrak seluruh cabang dan titik booth counter.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <label className="btn-primary" style={{ cursor: 'pointer', background: '#27ae60', borderColor: '#1e7e34', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-upload"></i> Pilih File (.csv)
                        <input
                          type="file"
                          accept=".csv, text/csv"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files && e.target.files[0];
                            if (file) {
                              const r = new FileReader();
                              r.onload = (event) => {
                                const parsed = parseBulkOutletText(event.target.result);
                                setBulkPreviewOutlets(parsed);
                                setBulkPreviewVisible(true);
                              };
                              r.readAsText(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={downloadBulkTemplate}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: '#27ae60', color: '#1e7e34' }}
                      >
                        <i className="fa-solid fa-download"></i> Unduh Template CSV
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Copy-Paste Text */}
              {bulkTab === 'text' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      <i className="fa-solid fa-paste"></i> Tempel Data Baris Outlet & Booth:
                    </label>
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      onClick={() => {
                        setBulkText(
                          'Amanda Brownies Rapak | Balikpapan | 6282148048956 | 07.00 - 22.00 WITA | Jl. Soekarno Hatta Km. 2,5 | https://maps.google.com\n' +
                          '- Booth SPBU Rapak | Rest Area SPBU | 6282148048956 | 08.00 - 21.00 WITA | https://maps.google.com\n\n' +
                          'Amanda Brownies Sudirman | Balikpapan | 6281241075981 | 07.00 - 22.00 WITA | Jl. Jend. Sudirman No. 8 | https://maps.google.com'
                        );
                      }}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles"></i> Muat Contoh Format
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Tempel baris data outlet & booth Anda di sini..."
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '12.5px', padding: '12px', border: '1.5px solid var(--ch-sand-border)', borderRadius: 'var(--radius-sm)' }}
                  ></textarea>
                </div>
              )}

              {/* Tab 3: JSON Import */}
              {bulkTab === 'json' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      <i className="fa-solid fa-code"></i> Tempel JSON Array Objek Outlet:
                    </label>
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      onClick={() => {
                        setBulkJson(JSON.stringify([
                          {
                            name: "Amanda Brownies Rapak",
                            city: "Balikpapan",
                            wa: "6282148048956",
                            hours: "07.00 - 22.00 WITA",
                            address: "Jl. Soekarno Hatta Km.2,5",
                            booths: [
                              { name: "Booth SPBU", location: "Rest Area", wa: "6282148048956" }
                            ]
                          }
                        ], null, 2));
                      }}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles"></i> Contoh JSON
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={bulkJson}
                    onChange={(e) => setBulkJson(e.target.value)}
                    placeholder="[ { name: '...', city: '...', wa: '...' } ]"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', padding: '12px', border: '1.5px solid var(--ch-sand-border)', borderRadius: 'var(--radius-sm)' }}
                  ></textarea>
                </div>
              )}

              {/* Append vs Replace Options */}
              <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-elevated)', border: '1px solid var(--ch-sand-border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    <i className="fa-solid fa-sliders"></i> Opsi Penyimpanan:
                  </div>
                  <div style={{ display: 'flex', gap: '18px', fontSize: '13px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="bulk-outlet-mode"
                        value="append"
                        checked={bulkMode === 'append'}
                        onChange={() => setBulkMode('append')}
                      />
                      <span><strong>Tambahkan (Append)</strong> — Gabungkan dengan data cabang yang sudah ada</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="bulk-outlet-mode"
                        value="replace"
                        checked={bulkMode === 'replace'}
                        onChange={() => setBulkMode('replace')}
                      />
                      <span style={{ color: 'var(--accent-red)' }}><strong>Gantikan Semua (Replace)</strong> — Timpa semua cabang dengan data baru</span>
                    </label>
                  </div>
                </div>
                <button type="button" className="btn-outline" onClick={handlePreviewBulkData} style={{ fontSize: '12.5px', padding: '7px 14px' }}>
                  <i className="fa-solid fa-eye"></i> Uji & Preview Data
                </button>
              </div>

              {/* Preview Box */}
              {bulkPreviewVisible && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '13.5px', color: 'var(--ch-olive-dark)' }}>
                      <i className="fa-solid fa-clipboard-check"></i> Hasil Validasi & Preview Data:
                    </h4>
                    <span style={{ fontSize: '12px', fontWeight: 700, background: 'var(--ch-olive-subtle)', color: 'var(--ch-olive-dark)', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}>
                      {bulkPreviewOutlets.length} Outlet Terdeteksi
                    </span>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--ch-sand-border)', borderRadius: 'var(--radius-sm)', background: '#fff', padding: '10px' }}>
                    {bulkPreviewOutlets.map((item, idx) => (
                      <div key={idx} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '12.5px' }}>
                        <strong>{idx + 1}. {item.name}</strong> ({item.city}) • WA: {item.wa}
                        {item.booths && item.booths.length > 0 && (
                          <span style={{ color: 'var(--ch-gold-dark)', marginLeft: '6px' }}>
                            [+{item.booths.length} Booth]
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid var(--ch-sand-border)', background: 'var(--bg-elevated)', margin: 0 }}>
              <button type="button" className="btn-secondary" onClick={() => setBulkOutletModal(false)}>Batal</button>
              <button type="button" className="btn-primary" onClick={handleExecuteBulkSave} style={{ padding: '10px 20px' }}>
                <i className="fa-solid fa-cloud-arrow-up"></i> Simpan Semua Outlet & Booth ke Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CS RECEIPT LIGHTBOX MODAL */}
      {csReceiptModal.open && (
        <div className="cms-modal-overlay active" onClick={() => setCsReceiptModal({ open: false, inquiry: null, activeImgIdx: 0, isZoomed: false })}>
          <div className="cms-modal-card" style={{ maxWidth: '760px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Bukti Lampiran Foto Pengaduan - #{csReceiptModal.inquiry?.id}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Klik foto untuk memperbesar / zoom in/out</span>
              </div>
              <button className="modal-close-btn" onClick={() => setCsReceiptModal({ open: false, inquiry: null, activeImgIdx: 0, isZoomed: false })}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div style={{ background: '#f8f7f4', border: '1px solid var(--border-sand)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Pelanggan:</span>
                    <strong>{csReceiptModal.inquiry?.name || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>No Struk:</span>
                    <strong style={{ color: 'var(--primary-olive)' }}>#{csReceiptModal.inquiry?.receipt_number || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Outlet:</span>
                    <span>{csReceiptModal.inquiry?.outlet_name || 'Amanda Balikpapan'}</span>
                  </div>
                </div>
              </div>

              {/* Viewport */}
              <div style={{ textAlign: 'center', background: '#18181b', borderRadius: '10px', padding: '14px', minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {(() => {
                  let images = [];
                  if (Array.isArray(csReceiptModal.inquiry?.receipt_images) && csReceiptModal.inquiry.receipt_images.length > 0) {
                    images = csReceiptModal.inquiry.receipt_images;
                  } else if (csReceiptModal.inquiry?.receipt_image) {
                    images = [csReceiptModal.inquiry.receipt_image];
                  }

                  const currentImg = images[csReceiptModal.activeImgIdx] || images[0];

                  return (
                    <>
                      <div style={{ maxHeight: '520px', overflow: 'auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {currentImg ? (
                          <img
                            src={currentImg}
                            alt="Struk Pembelian"
                            onClick={() => setCsReceiptModal({ ...csReceiptModal, isZoomed: !csReceiptModal.isZoomed })}
                            style={{
                              maxWidth: '100%',
                              maxHeight: csReceiptModal.isZoomed ? 'none' : '440px',
                              transform: csReceiptModal.isZoomed ? 'scale(1.85)' : 'none',
                              cursor: csReceiptModal.isZoomed ? 'zoom-out' : 'zoom-in',
                              transition: 'transform 0.25s ease',
                              objectFit: 'contain',
                              borderRadius: '6px'
                            }}
                          />
                        ) : (
                          <div style={{ color: '#aaa' }}>Tidak ada foto bukti dilampirkan</div>
                        )}
                      </div>

                      {images.length > 1 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
                          {images.map((src, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCsReceiptModal({ ...csReceiptModal, activeImgIdx: idx, isZoomed: false })}
                              style={{
                                border: idx === csReceiptModal.activeImgIdx ? '2px solid var(--primary-gold)' : '2px solid rgba(255,255,255,0.3)',
                                borderRadius: '6px',
                                padding: '2px',
                                background: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <img src={src} alt="Thumb" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', display: 'block' }} />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between', padding: '14px 20px', background: '#fff', borderTop: '1px solid var(--border-sand-light)' }}>
              <a
                href={`https://wa.me/${csReceiptModal.inquiry?.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ color: '#16a34a', borderColor: '#86efac', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-brands fa-whatsapp"></i> Chat Pelanggan
              </a>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCsReceiptModal({ open: false, inquiry: null, activeImgIdx: 0, isZoomed: false })}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CS DETAIL & RESPONSE MODAL */}
      {csDetailModal.open && (() => {
        const inq = csDetailModal.inquiry;
        const catMeta = CS_CATEGORY_LABELS[inq?.category] || CS_CATEGORY_LABELS.other;
        let imagesList = [];
        if (Array.isArray(inq?.receipt_images) && inq.receipt_images.length > 0) {
          imagesList = inq.receipt_images.filter(img => typeof img === 'string' && img.length > 0);
        } else if (inq?.receipt_image && typeof inq.receipt_image === 'string') {
          imagesList = [inq.receipt_image];
        }

        return (
          <div className="cms-modal-overlay active" onClick={() => setCsDetailModal({ open: false, inquiry: null })}>
            <div className="cms-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div>
                  <h3 style={{ margin: 0 }}>Tanggapi Pengaduan Pelanggan</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nomor Tiket: #{inq?.id}</span>
                </div>
                <button className="modal-close-btn" onClick={() => setCsDetailModal({ open: false, inquiry: null })}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div style={{ padding: '20px' }}>
                {/* Customer Info Card */}
                <div style={{ background: 'var(--bg-surface-elevated, #faf6ee)', border: '1px solid var(--border-sand-light, #ede4d3)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>{inq?.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <a
                          href={`https://wa.me/${inq?.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}
                        >
                          <i className="fa-brands fa-whatsapp"></i> +{inq?.phone}
                        </a>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>• Outlet: {inq?.outlet_name}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#fff', background: catMeta.badgeColor, padding: '3px 10px', borderRadius: '999px' }}>
                        <i className={catMeta.icon}></i> {catMeta.label}
                      </span>
                      <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 700, background: '#fef3c7', padding: '2px 8px', borderRadius: '999px' }}>
                        ★ {inq?.rating || 5}/5
                      </span>
                    </div>
                  </div>

                  {inq?.receipt_number && (
                    <div style={{ fontSize: '12px', color: 'var(--primary-olive)', marginBottom: '8px', fontWeight: 600 }}>
                      <i className="fa-solid fa-receipt"></i> Nomor Struk Kasir: <strong>#{inq.receipt_number}</strong>
                    </div>
                  )}

                  <div style={{ background: '#ffffff', border: '1px solid var(--border-sand, #d8c9a8)', borderRadius: '8px', padding: '12px 14px', fontSize: '13.5px', lineHeight: 1.55, color: 'var(--text-main)', fontStyle: 'italic' }}>
                    "{inq?.message}"
                  </div>
                </div>

                {/* Attached receipt photos (if any) */}
                {imagesList.length > 0 && (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                      Lampiran Bukti Foto ({imagesList.length} Foto) - Klik untuk zoom:
                    </label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {imagesList.map((imgSrc, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => {
                            setCsReceiptModal({ open: true, inquiry: inq, activeImgIdx: imgIdx, isZoomed: false });
                          }}
                          style={{
                            border: '1.5px solid var(--border-sand)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            padding: 0,
                            cursor: 'pointer',
                            width: '68px',
                            height: '68px',
                            background: '#faf6ee'
                          }}
                          title="Klik untuk memperbesar foto"
                        >
                          <img src={imgSrc} alt="Bukti" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Selection */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Ubah Status Penanganan Tiket:
                  </label>
                  <select id="cs-new-status" defaultValue={inq?.status || 'NEW'} className="form-control">
                    <option value="NEW">🔴 NEW (Tiket Baru Belum Ditanggapi)</option>
                    <option value="IN_PROGRESS">🟡 IN_PROGRESS (Sedang Ditangani oleh Outlet)</option>
                    <option value="RESOLVED">🟢 RESOLVED (Selesai Ditangani & Solusi Diberikan)</option>
                  </select>
                </div>

                {/* Admin Notes */}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    Catatan Internal Tim Admin / Outlet:
                  </label>
                  <textarea
                    id="cs-admin-notes"
                    rows="3"
                    defaultValue={inq?.admin_notes || ''}
                    placeholder="Tuliskan catatan tindak lanjut, kompensasi, atau penjelasan solusi..."
                    className="form-control"
                    style={{ resize: 'vertical' }}
                  ></textarea>
                </div>

                {/* Quick Chips for Admin Notes */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', alignSelf: 'center', fontWeight: 600 }}>Template Cepat:</span>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => {
                      const el = document.getElementById('cs-admin-notes');
                      if (el) el.value = (el.value ? el.value + ' | ' : '') + 'Penggantian produk brownies baru disiapkan outlet.';
                    }}
                  >
                    + Ganti Produk
                  </button>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => {
                      const el = document.getElementById('cs-admin-notes');
                      if (el) el.value = (el.value ? el.value + ' | ' : '') + 'Pemberian voucher diskon 20% kompensasi pelanggan.';
                    }}
                  >
                    + Voucher Diskon
                  </button>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => {
                      const el = document.getElementById('cs-admin-notes');
                      if (el) el.value = (el.value ? el.value + ' | ' : '') + 'Pelanggan telah dihubungi dan klarifikasi selesai.';
                    }}
                  >
                    + Selesai Dihubungi
                  </button>
                </div>
              </div>

              <div className="modal-actions" style={{ flexWrap: 'wrap', gap: '10px', background: '#faf6ee', padding: '14px 20px', borderTop: '1px solid var(--border-sand-light)' }}>
                <button type="button" className="btn-secondary" onClick={() => setCsDetailModal({ open: false, inquiry: null })}>Tutup</button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  onClick={async () => {
                    const statusEl = document.getElementById('cs-new-status');
                    const notesEl = document.getElementById('cs-admin-notes');
                    showToast('Mengirim notifikasi WhatsApp via WAHA...', 'info');
                    const res = await sendCsStatusNotification(inq, statusEl.value, notesEl.value);
                    if (res && res.success) {
                      showToast('Notifikasi WhatsApp WAHA berhasil terkirim ke pelanggan!', 'success');
                    } else if (res && !res.success) {
                      showToast(res.error || 'Gagal mengirim notifikasi WAHA', 'error');
                    }
                  }}
                  title="Kirim notifikasi update tiket langsung ke nomor WhatsApp pelanggan via WAHA"
                >
                  <i className="fa-brands fa-whatsapp"></i> Kirim Notif WAHA
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    const statusEl = document.getElementById('cs-new-status');
                    const notesEl = document.getElementById('cs-admin-notes');
                    const newStatus = statusEl.value;
                    const newNotes = notesEl.value;
                    await updateCsStatus(inq.id, newStatus, newNotes);
                    sendCsStatusNotification(inq, newStatus, newNotes);
                    setCsDetailModal({ open: false, inquiry: null });
                  }}
                >
                  <i className="fa-solid fa-floppy-disk"></i> Simpan Penanganan
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 8. PRICELIST POSTER MODAL */}
      {pricelistModal.open && (
        <div className="cms-modal-overlay active" onClick={() => setPricelistModal({ open: false, data: null })}>
          <div className="cms-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{pricelistModal.data ? 'Edit Poster Price List' : 'Tambah Poster Price List'}</h3>
              <button className="modal-close-btn" onClick={() => setPricelistModal({ open: false, data: null })}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSavePricelist}>
              <div className="form-group">
                <label>Judul Poster Price List *</label>
                <input type="text" name="title" required defaultValue={pricelistModal.data?.title || ''} placeholder="Daftar Harga Menu Resmi Amanda" />
              </div>

              <div className="form-group">
                <label>Badge / Kategori Singkat</label>
                <input type="text" name="badge" defaultValue={pricelistModal.data?.badge || 'Price List Brownies'} />
              </div>

              <div className="form-group">
                <label>Upload Gambar Poster Price List *</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="pricelist-file-input"
                    accept="image/*"
                    className="file-upload-input"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        try {
                          const dataUrl = await processImageFile(file);
                          setPricelistImgPreview(dataUrl);
                        } catch (err) { alert(err.message); }
                      }
                    }}
                  />
                  <label htmlFor="pricelist-file-input" className="file-upload-dropzone">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span className="dropzone-main-text">Pilih Poster dari Perangkat / HP</span>
                    <span className="dropzone-sub-text">Bisa di-zoom in/out di halaman depan</span>
                  </label>
                </div>

                <div className="image-url-toggle-wrap">
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>Atau path / link gambar:</span>
                  <input
                    type="text"
                    name="image"
                    value={pricelistImgPreview}
                    onChange={(e) => setPricelistImgPreview(e.target.value)}
                  />
                </div>

                <div className="image-preview-box" style={{ width: '130px', aspectRatio: '4/5', marginTop: '10px' }}>
                  <img src={pricelistImgPreview || '/assets/amanda_pricelist_poster.jpg'} alt="Preview Price List" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#ede3d1', borderRadius: '8px' }} />
                </div>
              </div>

              <div className="form-group">
                <label>Keterangan / Subtitle</label>
                <input type="text" name="caption" defaultValue={pricelistModal.data?.caption || ''} placeholder="Daftar Harga Resmi Amanda Brownies Balikpapan" />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setPricelistModal({ open: false, data: null })}>Batal</button>
                <button type="submit" className="btn-primary"><i className="fa-solid fa-floppy-disk"></i> Simpan Poster Price List</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. CATEGORY WILAYAH MODAL */}
      {categoryModal.open && (
        <div className="cms-modal-overlay active" onClick={() => setCategoryModal({ open: false, data: null })}>
          <div className="cms-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{categoryModal.data ? 'Edit Kategori Wilayah: ' + categoryModal.data.name : 'Tambah Kategori Wilayah Baru'}</h3>
              <button className="modal-close-btn" onClick={() => setCategoryModal({ open: false, data: null })}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Nama Kategori / Wilayah *</label>
                  <input type="text" name="name" required defaultValue={categoryModal.data?.name || ''} placeholder="Contoh: Balikpapan Selatan" />
                </div>
                <div className="form-group">
                  <label>Wilayah Induk / Provinsi *</label>
                  <input type="text" name="region" required defaultValue={categoryModal.data?.region || 'Kota Balikpapan'} />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Kode Slug Unik *</label>
                  <input type="text" name="slug" required defaultValue={categoryModal.data?.slug || ''} placeholder="balikpapan-selatan" />
                </div>
                <div className="form-group">
                  <label>Ikon FontAwesome</label>
                  <input type="text" name="icon" defaultValue={categoryModal.data?.icon || 'fa-solid fa-location-dot'} />
                </div>
                <div className="form-group">
                  <label>Warna Tema Badge</label>
                  <select name="badgeColor" defaultValue={categoryModal.data?.badgeColor || 'olive'}>
                    <option value="olive">Olive (Hijau Khas)</option>
                    <option value="gold">Gold (Kuning Emas)</option>
                    <option value="green">Emerald Green</option>
                    <option value="sand">Sand (Cokelat Pasir)</option>
                    <option value="red">Red (Merah Bold)</option>
                    <option value="blue">Blue (Biru Modern)</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Urutan Tampilan (Sort Order)</label>
                  <input type="number" name="sortOrder" defaultValue={categoryModal.data?.sortOrder || (categories.length + 1)} />
                </div>
                <div className="form-group">
                  <label>Status Publikasi</label>
                  <select name="status" defaultValue={categoryModal.data?.status || 'active'}>
                    <option value="active">Aktif (Tampil di Landing Page)</option>
                    <option value="inactive">Nonaktif (Disembunyikan)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Deskripsi & Area Cakupan Wilayah</label>
                <textarea name="description" rows="3" defaultValue={categoryModal.data?.description || ''} placeholder="Mencakup area MT Haryono, Sepinggan, Ruhui Rahayu..."></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setCategoryModal({ open: false, data: null })}>Batal</button>
                <button type="submit" className="btn-primary"><i className="fa-solid fa-floppy-disk"></i> Simpan Kategori Wilayah</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. TICKER MODAL */}
      {tickerModal.open && (
        <div className="cms-modal-overlay active" onClick={() => setTickerModal({ open: false, data: null })}>
          <div className="cms-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{tickerModal.data ? 'Edit Pengumuman Ticker' : 'Tambah Pengumuman Ticker'}</h3>
              <button className="modal-close-btn" onClick={() => setTickerModal({ open: false, data: null })}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSaveTicker}>
              <div className="form-group">
                <label>Ikon FontAwesome</label>
                <input type="text" name="icon" defaultValue={tickerModal.data?.icon || 'fa-solid fa-bullhorn'} />
              </div>

              <div className="form-group">
                <label>Judul Sorotan *</label>
                <input type="text" name="title" required defaultValue={tickerModal.data?.title || ''} placeholder="FLASH SALE BALIKPAPAN:" />
              </div>

              <div className="form-group">
                <label>Teks Pengumuman *</label>
                <input type="text" name="text" required defaultValue={tickerModal.data?.text || ''} placeholder="Diskon 20% varian cheese cream & tiramisu marble..." />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setTickerModal({ open: false, data: null })}>Batal</button>
                <button type="submit" className="btn-primary"><i className="fa-solid fa-floppy-disk"></i> Simpan Pengumuman</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
