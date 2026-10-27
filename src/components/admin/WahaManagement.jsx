import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getWahaConfig,
  saveWahaConfig,
  initWahaConfigFromDb,
  checkWahaHealth,
  getWahaSessions,
  startWahaSession,
  stopWahaSession,
  restartWahaSession,
  logoutWahaSession,
  getWahaQrCode,
  sendWahaTextMessage,
  sendWahaFileMessage,
  compileTemplate,
  WAHA_TEMPLATES,
  formatPhoneNumber,
  getOutboundLogs,
  clearOutboundLogs,
  toggleWahaMockMode,
  generateMockQrSvg,
  sendAdminCsAlert
} from '../../services/waha';
import { saveWahaConfigToSupabase } from '../../services/supabase';

export default function WahaManagement({ csInquiries = [], outlets = [], showToast, onNavigateCs }) {
  // Main Configuration & Server State
  const [config, setConfig] = useState(() => getWahaConfig());
  const [health, setHealth] = useState({ connected: false, checking: true });
  const [sessions, setSessions] = useState([]);
  const [currentSessionName, setCurrentSessionName] = useState(config.sessionName || 'default');
  const [subTab, setSubTab] = useState('session'); // 'session' | 'send' | 'automation' | 'logs' | 'config'

  // Session Action Loadings
  const [actionLoading, setActionLoading] = useState('');
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [autoRefreshQr, setAutoRefreshQr] = useState(false);

  // Send Message Form
  const [sendRecipient, setSendRecipient] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [quickCsTicket, setQuickCsTicket] = useState('');

  // Logs
  const [logs, setLogs] = useState(() => getOutboundLogs());
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [viewLogDetail, setViewLogDetail] = useState(null);

  // Config Form
  const [configServerUrl, setConfigServerUrl] = useState(config.serverUrl);
  const [configApiKey, setConfigApiKey] = useState(config.apiKey);
  const [configDefaultSession, setConfigDefaultSession] = useState(config.sessionName);
  const [configAutoAdminNew, setConfigAutoAdminNew] = useState(config.autoNotifyAdminNew ?? true);
  const initialAdminPhone = (!config.adminPhone || config.adminPhone === '6281253439968' || config.adminPhone === '6281241075981')
    ? '628115954488'
    : config.adminPhone;
  const [configAdminPhone, setConfigAdminPhone] = useState(initialAdminPhone);
  const [testingAdminAlert, setTestingAdminAlert] = useState(false);
  const [configAutoCsNew, setConfigAutoCsNew] = useState(config.autoNotifyCsNew ?? false);
  const [configAutoCsProgress, setConfigAutoCsProgress] = useState(config.autoNotifyCsProgress ?? true);
  const [configAutoCsResolved, setConfigAutoCsResolved] = useState(config.autoNotifyCsResolved ?? true);
  const [isDbSynced, setIsDbSynced] = useState(false);
  const [savingDb, setSavingDb] = useState(false);

  // Check health and load sessions
  const refreshWahaStatus = useCallback(async (customConf = null) => {
    setHealth(prev => ({ ...prev, checking: true }));
    try {
      const activeConf = customConf || config;
      const res = await checkWahaHealth(activeConf);
      setHealth({ ...res, checking: false });

      if (res.connected) {
        try {
          const sList = await getWahaSessions(activeConf);
          setSessions(sList);
        } catch (sErr) {
          console.warn('Gagal memuat sesi:', sErr);
        }
      }
    } catch (err) {
      setHealth({ connected: false, checking: false, error: err.message });
    }
  }, [config]);

  // Initial load: sync from Supabase DB first, then check status
  useEffect(() => {
    initWahaConfigFromDb().then((dbConf) => {
      if (dbConf) {
        const resolvedPhone = (!dbConf.adminPhone || dbConf.adminPhone === '6281253439968' || dbConf.adminPhone === '6281241075981')
          ? '628115954488'
          : dbConf.adminPhone;
        setConfig({ ...dbConf, adminPhone: resolvedPhone });
        setConfigServerUrl(dbConf.serverUrl);
        setConfigApiKey(dbConf.apiKey || '');
        setConfigDefaultSession(dbConf.sessionName || 'default');
        setConfigAdminPhone(resolvedPhone);
        setConfigAutoAdminNew(dbConf.autoNotifyAdminNew ?? true);
        setConfigAutoCsNew(dbConf.autoNotifyCsNew ?? false);
        setConfigAutoCsProgress(dbConf.autoNotifyCsProgress ?? true);
        setConfigAutoCsResolved(dbConf.autoNotifyCsResolved ?? true);
        setIsDbSynced(true);
        refreshWahaStatus(dbConf);
      } else {
        refreshWahaStatus();
      }
    }).catch(() => {
      refreshWahaStatus();
    });
  }, []);

  // Current session object
  const activeSessionObj = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return {
        name: currentSessionName,
        status: health.connected ? 'WORKING' : 'STOPPED',
        me: null
      };
    }
    const found = sessions.find(s => s.name === currentSessionName);
    return found || { name: currentSessionName, status: 'STOPPED', me: null };
  }, [sessions, currentSessionName, health.connected]);

  // Load QR code when needed
  const fetchQr = useCallback(async () => {
    setQrLoading(true);
    try {
      if (config.mockMode) {
        setQrData({ type: 'image', data: generateMockQrSvg() });
        setQrLoading(false);
        return;
      }
      const data = await getWahaQrCode(currentSessionName, config);
      setQrData(data);
    } catch (err) {
      console.warn('QR error:', err);
      // If error but in mock or offline, provide mock SVG
      setQrData({ type: 'image', data: generateMockQrSvg() });
    } finally {
      setQrLoading(false);
    }
  }, [currentSessionName, config]);

  useEffect(() => {
    if (activeSessionObj.status === 'SCAN_QR_CODE' || subTab === 'session') {
      fetchQr();
    }
  }, [activeSessionObj.status, subTab, fetchQr]);

  // Handler: Session controls
  const handleStartSession = async () => {
    setActionLoading('start');
    try {
      await startWahaSession(currentSessionName, config);
      showToast?.(`Sesi ${currentSessionName} berhasil dimulai!`, 'success');
      await refreshWahaStatus();
      await fetchQr();
    } catch (err) {
      showToast?.(err.message || 'Gagal memulai sesi', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleStopSession = async () => {
    if (!window.confirm(`Hentikan sesi WhatsApp "${currentSessionName}"?`)) return;
    setActionLoading('stop');
    try {
      await stopWahaSession(currentSessionName, config);
      showToast?.(`Sesi ${currentSessionName} dihentikan`, 'info');
      await refreshWahaStatus();
    } catch (err) {
      showToast?.(err.message || 'Gagal menghentikan sesi', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleRestartSession = async () => {
    setActionLoading('restart');
    try {
      await restartWahaSession(currentSessionName, config);
      showToast?.(`Sesi ${currentSessionName} di-restart`, 'success');
      await refreshWahaStatus();
    } catch (err) {
      showToast?.(err.message || 'Gagal restart sesi', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleLogoutSession = async () => {
    if (!window.confirm(`Keluar dari WhatsApp pada sesi "${currentSessionName}"? Anda harus scan QR ulang.`)) return;
    setActionLoading('logout');
    try {
      await logoutWahaSession(currentSessionName, config);
      showToast?.(`Sesi ${currentSessionName} telah keluar`, 'info');
      await refreshWahaStatus();
      await fetchQr();
    } catch (err) {
      showToast?.(err.message || 'Gagal logout', 'error');
    } finally {
      setActionLoading('');
    }
  };

  // Toggle Mock Mode
  const handleToggleMock = (e) => {
    const isChecked = e.target.checked;
    const updated = toggleWahaMockMode(isChecked);
    setConfig(updated);
    showToast?.(isChecked ? 'Mode Demo / Simulasi WAHA diaktifkan' : 'Mode Demo dimatikan (Koneksi Nyata)', 'info');
    refreshWahaStatus(updated);
  };

  // Apply Quick Template
  const handleSelectTemplate = (templateKey) => {
    setSelectedTemplate(templateKey);
    if (!templateKey) return;
    const tpl = WAHA_TEMPLATES[templateKey];
    if (tpl) {
      let populated = tpl.text;
      // If a CS ticket is selected, replace variables immediately
      if (quickCsTicket) {
        const ticketObj = csInquiries.find(c => String(c.id) === String(quickCsTicket));
        if (ticketObj) {
          populated = compileTemplate(tpl.text, {
            nama: ticketObj.name || 'Pelanggan',
            tiket: ticketObj.id,
            outlet: ticketObj.outlet_name || 'Balikpapan',
            catatan: ticketObj.admin_notes || ticketObj.message || 'Segera kami tindak lanjuti.',
            tanggal: new Date().toLocaleDateString('id-ID')
          });
        }
      }
      setMessageText(populated);
    }
  };

  // Handle Quick Select CS Ticket
  const handleSelectCsTicket = (ticketId) => {
    setQuickCsTicket(ticketId);
    if (!ticketId) return;
    const ticketObj = csInquiries.find(c => String(c.id) === String(ticketId));
    if (ticketObj) {
      setSendRecipient(ticketObj.phone || '');
      // Auto populate template if selected
      const templateToUse = selectedTemplate || (ticketObj.status === 'RESOLVED' ? 'cs_resolved' : 'cs_progress');
      setSelectedTemplate(templateToUse);
      const tpl = WAHA_TEMPLATES[templateToUse] || WAHA_TEMPLATES.cs_progress;
      setMessageText(compileTemplate(tpl.text, {
        nama: ticketObj.name || 'Pelanggan',
        tiket: ticketObj.id,
        outlet: ticketObj.outlet_name || 'Balikpapan',
        catatan: ticketObj.admin_notes || ticketObj.message || 'Sedang kami tangani.',
        tanggal: new Date().toLocaleDateString('id-ID')
      }));
    }
  };

  // Insert Variable helper
  const insertVariable = (varName) => {
    setMessageText(prev => prev + ` {{${varName}}}`);
  };

  // Send Message Action
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!sendRecipient || !sendRecipient.trim()) {
      showToast?.('Nomor WhatsApp penerima wajib diisi', 'error');
      return;
    }
    if (!messageText || !messageText.trim()) {
      showToast?.('Isi pesan tidak boleh kosong', 'error');
      return;
    }

    setSendLoading(true);
    setSendResult(null);

    try {
      let res;
      if (mediaUrl && mediaUrl.trim()) {
        res = await sendWahaFileMessage({
          to: sendRecipient,
          fileUrl: mediaUrl.trim(),
          caption: messageText,
          sessionName: currentSessionName,
          customConfig: config
        });
      } else {
        res = await sendWahaTextMessage({
          to: sendRecipient,
          text: messageText,
          sessionName: currentSessionName,
          customConfig: config
        });
      }

      setSendResult({ success: true, message: `Pesan berhasil dikirim ke ${sendRecipient}!` });
      showToast?.(`WhatsApp berhasil dikirim ke ${sendRecipient}!`, 'success');
      setLogs(getOutboundLogs());
    } catch (err) {
      setSendResult({ success: false, message: err.message || 'Gagal mengirim pesan WhatsApp' });
      showToast?.(err.message || 'Gagal kirim WhatsApp', 'error');
    } finally {
      setSendLoading(false);
    }
  };

  // Save Configuration Form
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingDb(true);
    const payload = {
      serverUrl: configServerUrl,
      apiKey: configApiKey,
      sessionName: configDefaultSession,
      adminPhone: configAdminPhone,
      autoNotifyAdminNew: configAutoAdminNew,
      autoNotifyCsNew: configAutoCsNew,
      autoNotifyCsProgress: configAutoCsProgress,
      autoNotifyCsResolved: configAutoCsResolved
    };
    const updated = saveWahaConfig(payload);
    setConfig(updated);
    setCurrentSessionName(configDefaultSession);

    try {
      const res = await saveWahaConfigToSupabase(updated);
      if (res && res.success !== false) {
        setIsDbSynced(true);
        showToast?.('Konfigurasi WAHA berhasil disimpan ke Database Supabase & Local Cache!', 'success');
      } else {
        showToast?.('Konfigurasi WAHA berhasil disimpan di penyimpanan lokal.', 'info');
      }
    } catch (dbErr) {
      showToast?.('Konfigurasi WAHA disimpan di penyimpanan lokal.', 'info');
    } finally {
      setSavingDb(false);
    }

    refreshWahaStatus(updated);
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logFilter !== 'all' && log.status !== logFilter) return false;
      if (logSearch) {
        const kw = logSearch.toLowerCase();
        const matchTo = (log.to || '').toLowerCase().includes(kw);
        const matchText = (log.text || '').toLowerCase().includes(kw);
        const matchSession = (log.session || '').toLowerCase().includes(kw);
        if (!matchTo && !matchText && !matchSession) return false;
      }
      return true;
    });
  }, [logs, logFilter, logSearch]);

  // Export logs to CSV
  const exportLogsCsv = () => {
    if (logs.length === 0) {
      showToast?.('Belum ada log pesan untuk diekspor', 'info');
      return;
    }
    const headers = ['ID,Waktu,Nomor_Tujuan,Sesi,Status,Mode,Cuplikan_Pesan'];
    const rows = logs.map(l => {
      const time = l.timestamp ? new Date(l.timestamp).toLocaleString('id-ID') : '';
      const cleanText = (l.text || '').replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${l.id}","${time}","${l.to}","${l.session}","${l.status}","${l.mode || 'REAL'}","${cleanText}"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers, ...rows].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `waha-logs-amanda-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.('Log riwayat WAHA berhasil diunduh ke CSV', 'success');
  };

  return (
    <section id="section-waha" className="cms-section active" style={{ animation: 'fadeIn 0.28s ease' }}>
      {/* ================= HEADER & STATUS BANNER ================= */}
      <div className="section-toolbar" style={{ marginBottom: '20px' }}>
        <div className="toolbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-brands fa-whatsapp" style={{ color: '#25D366' }}></i>
              WhatsApp HTTP API (WAHA) Gateway
            </h2>
            <span
              className={`waha-status-badge ${
                health.connected ? (activeSessionObj.status === 'WORKING' ? 'status-connected' : 'status-warning') : 'status-offline'
              }`}
            >
              <span className="live-dot pulse"></span>
              {health.checking
                ? 'Memeriksa Host...'
                : health.connected
                ? (config.mockMode ? 'Simulasi Demo Aktif' : `Terhubung (${health.latencyMs}ms)`)
                : 'Server Offline'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0' }}>
            Otomatisasi pengiriman pesan WhatsApp, notifikasi tiket komplain pelanggan, dan integrasi WhatsApp Web resmi Amanda Brownies.
          </p>
        </div>

        <div className="toolbar-actions-row">
          <label className="waha-mock-switch" title="Gunakan simulator jika server WAHA Docker lokal belum aktif">
            <input
              type="checkbox"
              checked={config.mockMode}
              onChange={handleToggleMock}
            />
            <span className="mock-slider"></span>
            <span className="mock-label">
              <i className="fa-solid fa-flask"></i> Mode Demo
            </span>
          </label>

          <button
            className="btn-secondary"
            onClick={() => refreshWahaStatus()}
            disabled={health.checking}
            title="Muat ulang koneksi ke WAHA"
          >
            <i className={`fa-solid fa-arrows-rotate ${health.checking ? 'fa-spin' : ''}`}></i>
            {health.checking ? 'Mengecek...' : 'Ping Server'}
          </button>

          <button
            className="btn-primary"
            onClick={() => setSubTab('send')}
            style={{ background: '#25D366', borderColor: '#25D366' }}
          >
            <i className="fa-solid fa-paper-plane"></i> Kirim WhatsApp
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon green" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <i className="fa-brands fa-whatsapp"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Status Sesi ({activeSessionObj.name})</span>
            <h3 className="stat-value" style={{ fontSize: '18px', textTransform: 'uppercase', color: activeSessionObj.status === 'WORKING' ? '#16a34a' : '#ea580c' }}>
              {activeSessionObj.status}
            </h3>
            <span className="stat-desc">
              {activeSessionObj.me ? `Akun: ${activeSessionObj.me.pushName || activeSessionObj.me.id}` : 'WhatsApp Gateway'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon olive">
            <i className="fa-solid fa-server"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Endpoint WAHA</span>
            <h3 className="stat-value" style={{ fontSize: '14px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {config.serverUrl.replace(/^https?:\/\//, '')}
            </h3>
            <span className="stat-desc">
              {health.version || 'WAHA Core/Plus v2026'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon gold">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Pesan Keluar</span>
            <h3 className="stat-value">{logs.length}</h3>
            <span className="stat-desc">Tercatat dalam riwayat</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sand" style={{ background: '#fef3c7', color: '#d97706' }}>
            <i className="fa-solid fa-bolt"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Otomatisasi CS</span>
            <h3 className="stat-value" style={{ fontSize: '18px' }}>
              {config.autoNotifyCsProgress || config.autoNotifyCsResolved ? 'AKTIF' : 'NONAKTIF'}
            </h3>
            <span className="stat-desc">Kirim auto WA saat tiket diupdate</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="waha-nav-tabs">
        <button
          className={`waha-tab-btn ${subTab === 'session' ? 'active' : ''}`}
          onClick={() => setSubTab('session')}
        >
          <i className="fa-solid fa-qrcode"></i> Sesi & Pairing QR
        </button>
        <button
          className={`waha-tab-btn ${subTab === 'send' ? 'active' : ''}`}
          onClick={() => setSubTab('send')}
        >
          <i className="fa-solid fa-paper-plane"></i> Kirim Pesan & Template
        </button>
        <button
          className={`waha-tab-btn ${subTab === 'automation' ? 'active' : ''}`}
          onClick={() => setSubTab('automation')}
        >
          <i className="fa-solid fa-robot"></i> Otomatisasi CS
        </button>
        <button
          className={`waha-tab-btn ${subTab === 'logs' ? 'active' : ''}`}
          onClick={() => setSubTab('logs')}
        >
          <i className="fa-solid fa-list-check"></i> Log Riwayat ({logs.length})
        </button>
        <button
          className={`waha-tab-btn ${subTab === 'config' ? 'active' : ''}`}
          onClick={() => setSubTab('config')}
        >
          <i className="fa-solid fa-sliders"></i> Pengaturan & Docker
        </button>
      </div>

      {/* ================= TAB 1: SESI & PAIRING QR ================= */}
      {subTab === 'session' && (
        <div className="waha-tab-content">
          <div className="waha-grid-session">
            {/* Left: Active Session Card & Device Info */}
            <div className="panel-card waha-session-panel">
              <div className="panel-head">
                <div className="panel-head-title">
                  <i className="fa-brands fa-whatsapp" style={{ color: '#25D366' }}></i>
                  <h3>Status Sesi WhatsApp: <span style={{ color: 'var(--primary-olive)' }}>{currentSessionName}</span></h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="form-control-sm"
                    value={currentSessionName}
                    onChange={(e) => {
                      setCurrentSessionName(e.target.value);
                      saveWahaConfig({ sessionName: e.target.value });
                    }}
                    style={{ fontWeight: 600 }}
                  >
                    {sessions.length > 0 ? (
                      sessions.map(s => (
                        <option key={s.name} value={s.name}>Sesi: {s.name} ({s.status})</option>
                      ))
                    ) : (
                      <option value="default">Sesi: default</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Status details */}
              <div className="session-status-box">
                <div className="session-badge-wrapper">
                  <div className={`session-large-icon ${activeSessionObj.status === 'WORKING' ? 'is-active' : ''}`}>
                    <i className="fa-brands fa-whatsapp"></i>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                      WhatsApp Web: {activeSessionObj.status === 'WORKING' ? 'Terhubung & Siap Kirim' : activeSessionObj.status}
                    </h4>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {activeSessionObj.status === 'WORKING'
                        ? 'Sesi tersinkronisasi. Pesan dari admin & CS akan dikirim melalui nomor ini.'
                        : 'Sesi memerlukan scan QR Code atau perintah Mulai.'}
                    </span>
                  </div>
                </div>

                {/* Device metadata if connected */}
                {activeSessionObj.status === 'WORKING' && (
                  <div className="device-info-grid">
                    <div className="device-info-item">
                      <span className="lbl"><i className="fa-solid fa-user-tag"></i> Nama Akun WA:</span>
                      <strong className="val">{activeSessionObj.me?.pushName || 'Amanda Brownies Official'}</strong>
                    </div>
                    <div className="device-info-item">
                      <span className="lbl"><i className="fa-solid fa-phone"></i> Nomor WhatsApp:</span>
                      <strong className="val" style={{ fontFamily: 'monospace' }}>
                        {activeSessionObj.me?.id?.replace('@c.us', '') || '628115599881'}
                      </strong>
                    </div>
                    <div className="device-info-item">
                      <span className="lbl"><i className="fa-solid fa-battery-three-quarters"></i> Baterai HP:</span>
                      <strong className="val" style={{ color: '#16a34a' }}>
                        {activeSessionObj.me?.battery || 95}% (Terkoneksi)
                      </strong>
                    </div>
                    <div className="device-info-item">
                      <span className="lbl"><i className="fa-solid fa-network-wired"></i> Engine Backend:</span>
                      <strong className="val">{health.engine || 'Chromium WebJS'}</strong>
                    </div>
                  </div>
                )}

                {/* Session Action Buttons */}
                <div className="session-action-buttons">
                  {activeSessionObj.status !== 'WORKING' && (
                    <button
                      className="btn-primary"
                      onClick={handleStartSession}
                      disabled={actionLoading === 'start'}
                      style={{ background: '#25D366', borderColor: '#25D366' }}
                    >
                      <i className={`fa-solid fa-play ${actionLoading === 'start' ? 'fa-spin' : ''}`}></i>
                      Mulai Sesi (Start)
                    </button>
                  )}

                  <button
                    className="btn-secondary"
                    onClick={handleRestartSession}
                    disabled={actionLoading === 'restart'}
                    title="Muat ulang browser sesi WhatsApp"
                  >
                    <i className={`fa-solid fa-rotate-right ${actionLoading === 'restart' ? 'fa-spin' : ''}`}></i>
                    Restart Sesi
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={handleStopSession}
                    disabled={actionLoading === 'stop'}
                  >
                    <i className={`fa-solid fa-pause ${actionLoading === 'stop' ? 'fa-spin' : ''}`}></i>
                    Hentikan (Stop)
                  </button>

                  <button
                    className="btn-danger-outline"
                    onClick={handleLogoutSession}
                    disabled={actionLoading === 'logout'}
                    title="Putuskan sambungan WhatsApp Web dari sesi ini"
                  >
                    <i className={`fa-solid fa-arrow-right-from-bracket ${actionLoading === 'logout' ? 'fa-spin' : ''}`}></i>
                    Logout WA
                  </button>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="waha-callout">
                <i className="fa-solid fa-circle-info" style={{ color: 'var(--primary-olive)', fontSize: '18px' }}></i>
                <div>
                  <strong>Cara Menautkan WhatsApp Kantor Amanda Brownies:</strong>
                  <ol style={{ paddingLeft: '18px', margin: '6px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    <li>Buka aplikasi WhatsApp di Smartphone kantor / CS.</li>
                    <li>Ketuk ikon titik tiga (Android) atau Menu Pengaturan (iPhone) &rarr; pilih <strong>Perangkat Tertaut</strong>.</li>
                    <li>Ketuk tombol <strong>Tautkan Perangkat</strong>, lalu arahkan kamera ke QR Code di sebelah kanan.</li>
                    <li>Setelah terhubung, status sesi akan otomatis berubah menjadi <strong>WORKING</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Right: Live QR Code Card */}
            <div className="panel-card qr-card-panel">
              <div className="panel-head">
                <div className="panel-head-title">
                  <i className="fa-solid fa-qrcode" style={{ color: 'var(--primary-olive)' }}></i>
                  <h3>Scan QR Code Sesi</h3>
                </div>
                <button
                  className="btn-secondary-sm"
                  onClick={fetchQr}
                  disabled={qrLoading}
                  title="Segarkan QR Code"
                >
                  <i className={`fa-solid fa-arrows-rotate ${qrLoading ? 'fa-spin' : ''}`}></i> Refresh QR
                </button>
              </div>

              <div className="qr-viewport">
                {qrLoading ? (
                  <div className="qr-placeholder">
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '36px', color: 'var(--primary-olive)' }}></i>
                    <p>Mengambil QR Code terbaru dari server WAHA...</p>
                  </div>
                ) : qrData && qrData.data ? (
                  <div className="qr-container">
                    <div className="qr-frame">
                      {qrData.type === 'image' ? (
                        <img src={qrData.data} alt="QR Code WhatsApp WAHA" className="qr-image" />
                      ) : (
                        <div className="qr-raw-text">
                          <code>{typeof qrData.data === 'string' ? qrData.data.slice(0, 100) + '...' : JSON.stringify(qrData.data)}</code>
                        </div>
                      )}
                      <div className="qr-scanner-line"></div>
                    </div>
                    <div className="qr-caption">
                      <span className="badge-pill-green">
                        <i className="fa-solid fa-shield-check"></i> Sesi: {currentSessionName}
                      </span>
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Arahkan kamera WhatsApp pada HP ke kotak QR di atas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="qr-placeholder">
                    <i className="fa-solid fa-qrcode" style={{ fontSize: '42px', color: 'var(--text-dim)' }}></i>
                    <p>QR Code belum tersedia atau sesi sudah aktif terhubung.</p>
                    <button className="btn-secondary-sm" onClick={fetchQr}>
                      Minta QR Code Sesi
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: KIRIM PESAN & TEMPLATE ================= */}
      {subTab === 'send' && (
        <div className="waha-tab-content">
          <div className="waha-grid-send">
            {/* Left: Message Editor Form */}
            <div className="panel-card">
              <div className="panel-head">
                <div className="panel-head-title">
                  <i className="fa-solid fa-paper-plane" style={{ color: '#25D366' }}></i>
                  <h3>Kirim Pesan WhatsApp Langsung via WAHA</h3>
                </div>
              </div>

              {/* Quick Select from Open CS Inquiries */}
              {csInquiries && csInquiries.length > 0 && (
                <div className="quick-cs-selector-box">
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-headset" style={{ color: 'var(--primary-olive)' }}></i>
                    Pilih Cepat dari Tiket Komplain Pelanggan:
                  </label>
                  <select
                    className="form-control"
                    value={quickCsTicket}
                    onChange={(e) => handleSelectCsTicket(e.target.value)}
                  >
                    <option value="">-- Pilih Tiket Pelanggan untuk Auto-Fill --</option>
                    {csInquiries.map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.name} ({c.phone}) - {c.outlet_name || 'Balikpapan'} [{c.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleSendMessage}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Nomor WhatsApp Tujuan *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: 08123456789 atau 628123456789"
                      value={sendRecipient}
                      onChange={(e) => setSendRecipient(e.target.value)}
                      required
                    />
                    {sendRecipient && (
                      <span className="formatted-phone-badge">
                        Format WAHA: {formatPhoneNumber(sendRecipient)}@c.us
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Pilih Template Pesan Siap Pakai:</label>
                  <select
                    className="form-control"
                    value={selectedTemplate}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                  >
                    <option value="">-- Ketik Bebas / Pilih Template --</option>
                    {Object.values(WAHA_TEMPLATES).map(tpl => (
                      <option key={tpl.id} value={tpl.id}>
                        [{tpl.category}] {tpl.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variable insertion buttons */}
                <div className="variable-chips-wrap">
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Sisipkan Variabel:</span>
                  <button type="button" className="chip-btn" onClick={() => insertVariable('nama')}>+ Nama</button>
                  <button type="button" className="chip-btn" onClick={() => insertVariable('tiket')}>+ No Tiket</button>
                  <button type="button" className="chip-btn" onClick={() => insertVariable('outlet')}>+ Outlet</button>
                  <button type="button" className="chip-btn" onClick={() => insertVariable('catatan')}>+ Catatan Solusi</button>
                  <button type="button" className="chip-btn" onClick={() => insertVariable('tanggal')}>+ Tanggal</button>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Isi Pesan WhatsApp *</label>
                  <textarea
                    rows="8"
                    className="form-control"
                    placeholder="Tulis pesan... Mendukung formatting WhatsApp: *tebal*, _miring_, ~coret~, ```monospace```"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    required
                  ></textarea>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11.5px', color: 'var(--text-dim)' }}>
                    <span>Gunakan tanda bintang *kata* untuk teks tebal.</span>
                    <span>{messageText.length} Karakter</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label>Lampirkan Gambar / Flyer URL (Opsional):</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://... (URL gambar nota, flyer promo, atau brosur Amanda)"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                </div>

                {sendResult && (
                  <div className={`waha-alert-box ${sendResult.success ? 'alert-success' : 'alert-danger'}`}>
                    <i className={`fa-solid ${sendResult.success ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                    <span>{sendResult.message}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={sendLoading}
                    style={{ background: '#25D366', borderColor: '#25D366', padding: '12px 24px', fontSize: '14px' }}
                  >
                    <i className={`fa-solid ${sendLoading ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                    {sendLoading ? 'Mengirim via WAHA...' : 'Kirim Pesan WhatsApp Sekarang'}
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setMessageText('');
                      setSendRecipient('');
                      setMediaUrl('');
                      setSelectedTemplate('');
                      setSendResult(null);
                    }}
                  >
                    Reset Form
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Live WhatsApp Bubble Preview */}
            <div className="panel-card wa-preview-panel">
              <div className="panel-head">
                <div className="panel-head-title">
                  <i className="fa-solid fa-mobile-screen" style={{ color: 'var(--primary-olive)' }}></i>
                  <h3>Pratinjau Layar WhatsApp Chat</h3>
                </div>
              </div>

              <div className="wa-device-frame">
                <div className="wa-device-header">
                  <div className="wa-header-avatar">
                    <img src="/assets/logo.png" alt="Amanda" onError={(e) => { e.target.style.display = 'none'; }} />
                    <i className="fa-solid fa-cake-candles" style={{ color: '#fff', fontSize: '14px' }}></i>
                  </div>
                  <div className="wa-header-info">
                    <h4>Amanda Brownies Official</h4>
                    <span>{sendRecipient ? formatPhoneNumber(sendRecipient) : 'Nomor Pelanggan'} • Online</span>
                  </div>
                  <div className="wa-header-actions">
                    <i className="fa-solid fa-video"></i>
                    <i className="fa-solid fa-phone"></i>
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                  </div>
                </div>

                <div className="wa-chat-canvas">
                  <div className="wa-date-chip">HARI INI</div>

                  {messageText ? (
                    <div className="wa-bubble-out">
                      {mediaUrl && (
                        <div className="wa-bubble-media">
                          <img src={mediaUrl} alt="Lampiran" onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      )}
                      <div className="wa-bubble-text" style={{ whiteSpace: 'pre-wrap' }}>
                        {messageText}
                      </div>
                      <div className="wa-bubble-footer">
                        <span className="wa-time">
                          {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="wa-ticks">
                          <i className="fa-solid fa-check-double" style={{ color: '#53bdeb' }}></i>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="wa-empty-preview">
                      <i className="fa-regular fa-comment-dots"></i>
                      <p>Ketik pesan atau pilih template di sebelah kiri untuk melihat simulasi tampilan chat WhatsApp pelanggan.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: OTOMATISASI CS ================= */}
      {subTab === 'automation' && (
        <div className="waha-tab-content">
          <div className="panel-card" style={{ marginBottom: '24px' }}>
            <div className="panel-head">
              <div className="panel-head-title">
                <i className="fa-solid fa-robot" style={{ color: 'var(--primary-olive)' }}></i>
                <h3>Pemicu Notifikasi Otomatis (CS Auto-Notification Trigger)</h3>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '20px' }}>
              Saat admin mengubah status penanganan tiket di halaman CS atau saat tiket baru masuk dari form komplain,
              sistem akan otomatis mengirim konfirmasi WhatsApp ke nomor pelanggan.
            </p>

            <div className="automation-toggles-grid">
              {/* Trigger Utama: Alert WA ke Admin saat Form Masuk */}
              <div className="automation-card admin-alert-card" style={{ border: '2px solid rgba(79, 91, 42, 0.4)', background: 'linear-gradient(135deg, rgba(79, 91, 42, 0.05) 0%, rgba(212, 160, 23, 0.08) 100%)', gridColumn: '1 / -1' }}>
                <div className="card-top" style={{ alignItems: 'flex-start' }}>
                  <div className="icon-wrap" style={{ background: '#fef3c7', color: '#b45309', fontSize: '20px' }}>
                    <i className="fa-solid fa-bell-concierge"></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--primary-olive-dark)' }}>
                        🚨 Notifikasi WhatsApp Otomatis ke Admin saat Form Pelanggan Masuk
                      </h4>
                      <span className="badge-pill-sand" style={{ background: '#fef08a', color: '#854d0e', fontWeight: 800, fontSize: '10.5px' }}>
                        DOUBLE NOTIFIKASI
                      </span>
                    </div>
                    <span className="sub" style={{ display: 'block', marginTop: '4px', lineHeight: 1.4 }}>
                      Setiap kali pelanggan submit formulir komplain / pengaduan di website publik, bot WAHA akan secara otomatis mengirim pesan rincian tiket lengkap langsung ke nomor WhatsApp Admin Amanda.
                    </span>

                    {/* Form Input No WA Admin & Tombol Tes */}
                    <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 240px', maxWidth: '340px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                          Nomor WhatsApp Admin Penerima Notifikasi:
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '7px 12px', fontSize: '13px', fontWeight: 600 }}
                          placeholder="6281241075981"
                          value={configAdminPhone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConfigAdminPhone(val);
                            saveWahaConfig({ adminPhone: val });
                          }}
                        />
                      </div>

                      <div>
                        <button
                          type="button"
                          className="btn-secondary-sm"
                          disabled={testingAdminAlert}
                          style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={async () => {
                            if (!configAdminPhone) {
                              showToast?.('Silakan masukkan nomor WhatsApp admin terlebih dahulu', 'error');
                              return;
                            }
                            setTestingAdminAlert(true);
                            try {
                              const testPayload = {
                                id: 'CS-TEST-' + Math.floor(1000 + Math.random() * 9000),
                                name: 'Bpk. Hendra (Customer Tes)',
                                phone: '6281299887766',
                                outlet_name: 'Amanda Brownies Ruhui Rahayu Balikpapan',
                                category: 'complaint',
                                receipt_number: 'STR-20261016-01',
                                rating: 5,
                                message: 'Ini adalah tes verifikasi sistem notifikasi otomatis ke WhatsApp Admin Amanda Brownies.'
                              };
                              const res = await sendAdminCsAlert(testPayload, { ...config, adminPhone: configAdminPhone });
                              if (res && res.success !== false) {
                                showToast?.(`Tes notifikasi berhasil dikirim ke WA Admin (${configAdminPhone})!`, 'success');
                              } else {
                                showToast?.('Gagal mengirim: ' + (res?.error || 'Periksa koneksi WAHA atau aktifkan Mock Mode untuk simulasi'), 'error');
                              }
                            } catch (tErr) {
                              showToast?.('Gagal kirim tes: ' + tErr.message, 'error');
                            } finally {
                              setTestingAdminAlert(false);
                            }
                          }}
                        >
                          {testingAdminAlert ? (
                            <>
                              <i className="fa-solid fa-spinner fa-spin"></i> Mengirim Tes...
                            </>
                          ) : (
                            <>
                              <i className="fa-brands fa-whatsapp" style={{ color: '#25D366' }}></i> Kirim Tes Notifikasi ke WA Admin
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <label className="toggle-switch" title="Aktif / Nonaktifkan Notifikasi WA Admin">
                    <input
                      type="checkbox"
                      checked={configAutoAdminNew}
                      onChange={(e) => {
                        setConfigAutoAdminNew(e.target.checked);
                        saveWahaConfig({ autoNotifyAdminNew: e.target.checked });
                        showToast?.(`Notifikasi WA Admin ${e.target.checked ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="template-snippet" style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <i className="fa-solid fa-file-lines"></i> Format Pesan yang Diterima WhatsApp Admin:
                  </div>
                  <code style={{ fontSize: '11px', whiteSpace: 'pre-line', maxHeight: '110px', overflowY: 'auto', display: 'block' }}>
                    {WAHA_TEMPLATES.admin_cs_alert?.text || ''}
                  </code>
                </div>
              </div>

              {/* Trigger 1: Tiket Baru Pelanggan */}
              <div className="automation-card">
                <div className="card-top">
                  <div className="icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <i className="fa-solid fa-bell"></i>
                  </div>
                  <div>
                    <h4>Auto WA: Konfirmasi ke Pelanggan (NEW)</h4>
                    <span className="sub">Kirim tanda terima otomatis ke WA pelanggan saat submit komplain di web</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={configAutoCsNew}
                      onChange={(e) => {
                        setConfigAutoCsNew(e.target.checked);
                        saveWahaConfig({ autoNotifyCsNew: e.target.checked });
                        showToast?.('Pengaturan pemicu tiket baru diperbarui', 'info');
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="template-snippet">
                  <code>{WAHA_TEMPLATES.cs_new.text.slice(0, 160)}...</code>
                </div>
              </div>

              {/* Trigger 2: Tiket Diproses */}
              <div className="automation-card">
                <div className="card-top">
                  <div className="icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <i className="fa-solid fa-spinner"></i>
                  </div>
                  <div>
                    <h4>Auto WA: Tiket Sedang Diproses (IN_PROGRESS)</h4>
                    <span className="sub">Kirim update saat outlet mulai memeriksa kendala pelanggan</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={configAutoCsProgress}
                      onChange={(e) => {
                        setConfigAutoCsProgress(e.target.checked);
                        saveWahaConfig({ autoNotifyCsProgress: e.target.checked });
                        showToast?.('Pengaturan pemicu proses tiket diperbarui', 'info');
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="template-snippet">
                  <code>{WAHA_TEMPLATES.cs_progress.text.slice(0, 160)}...</code>
                </div>
              </div>

              {/* Trigger 3: Tiket Selesai */}
              <div className="automation-card">
                <div className="card-top">
                  <div className="icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
                    <i className="fa-solid fa-circle-check"></i>
                  </div>
                  <div>
                    <h4>Auto WA: Tiket Selesai Ditangani (RESOLVED)</h4>
                    <span className="sub">Kirim ucapan terima kasih dan konfirmasi penyelesaian kendala</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={configAutoCsResolved}
                      onChange={(e) => {
                        setConfigAutoCsResolved(e.target.checked);
                        saveWahaConfig({ autoNotifyCsResolved: e.target.checked });
                        showToast?.('Pengaturan pemicu tiket selesai diperbarui', 'info');
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="template-snippet">
                  <code>{WAHA_TEMPLATES.cs_resolved.text.slice(0, 160)}...</code>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Endpoint Info */}
          <div className="panel-card">
            <div className="panel-head">
              <div className="panel-head-title">
                <i className="fa-solid fa-network-wired" style={{ color: 'var(--primary-olive)' }}></i>
                <h3>Konfigurasi Webhook WAHA (Menerima Pesan Masuk / Chatbot Balasan)</h3>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Untuk menerima pesan masuk pelanggan secara realtime ke database atau menghubungkan chatbot AI Amanda Brownies, daftarkan URL webhook berikut pada server WAHA Anda:
            </p>
            <div className="webhook-box">
              <div className="webhook-url-line">
                <code>POST https://api.amandabrownies-balikpapan.id/webhook/waha</code>
                <button
                  className="btn-secondary-sm"
                  onClick={() => {
                    navigator.clipboard.writeText('https://api.amandabrownies-balikpapan.id/webhook/waha');
                    showToast?.('URL Webhook disalin ke clipboard!', 'success');
                  }}
                >
                  <i className="fa-solid fa-copy"></i> Salin
                </button>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', display: 'block' }}>
                Events didukung: <code>message</code>, <code>message.ack</code>, <code>session.status</code>.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: LOG RIWAYAT PESAN ================= */}
      {subTab === 'logs' && (
        <div className="waha-tab-content">
          <div className="panel-card" style={{ marginBottom: '20px' }}>
            <div className="section-toolbar" style={{ margin: 0 }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '240px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari nomor, pesan, sesi..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}></i>
                </div>

                <select
                  className="form-control"
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="all">Semua Status Log</option>
                  <option value="SENT">Terkirim (SENT)</option>
                  <option value="FAILED">Gagal (FAILED)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={exportLogsCsv}>
                  <i className="fa-solid fa-file-excel"></i> Ekspor CSV
                </button>
                <button
                  className="btn-danger-outline"
                  onClick={() => {
                    if (window.confirm('Bersihkan seluruh riwayat pengiriman pesan WAHA?')) {
                      clearOutboundLogs();
                      setLogs([]);
                      showToast?.('Riwayat log berhasil dikosongkan', 'info');
                    }
                  }}
                >
                  <i className="fa-solid fa-trash-can"></i> Hapus Log
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f7f4', fontSize: '12.5px', borderBottom: '1px solid var(--border-sand)' }}>
                    <th style={{ padding: '12px 16px' }}>Waktu & ID</th>
                    <th style={{ padding: '12px 16px' }}>Nomor Tujuan</th>
                    <th style={{ padding: '12px 16px' }}>Sesi WAHA</th>
                    <th style={{ padding: '12px 16px', minWidth: '260px' }}>Cuplikan Pesan</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Mode</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        <i className="fa-solid fa-inbox" style={{ fontSize: '32px', marginBottom: '8px', display: 'block', color: 'var(--text-dim)' }}></i>
                        Belum ada riwayat pesan WhatsApp yang dikirimkan.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border-sand-light)', fontSize: '13px' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--primary-olive)' }}>
                            {l.id.slice(0, 14)}
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            {new Date(l.timestamp).toLocaleString('id-ID')}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace' }}>
                          {l.to}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge-pill-sand">{l.session || 'default'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-main)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.text}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: '10.5px', background: l.mode === 'MOCK_SIMULATED' ? '#e0f2fe' : '#dcfce7', color: l.mode === 'MOCK_SIMULATED' ? '#0369a1' : '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {l.mode === 'MOCK_SIMULATED' ? 'MOCK' : 'LIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: l.status === 'SENT' ? '#16a34a' : '#dc2626' }}>
                            <i className={`fa-solid ${l.status === 'SENT' ? 'fa-check' : 'fa-xmark'}`}></i> {l.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            className="btn-secondary-sm"
                            onClick={() => setViewLogDetail(l)}
                            title="Lihat pesan lengkap"
                          >
                            <i className="fa-solid fa-eye"></i> Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: PENGATURAN SERVER & DOCKER ================= */}
      {subTab === 'config' && (
        <div className="waha-tab-content">
          <div className="waha-grid-send">
            {/* Server Settings Form */}
            <div className="panel-card">
              <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div className="panel-head-title">
                  <i className="fa-solid fa-gear" style={{ color: 'var(--primary-olive)' }}></i>
                  <h3>Kredensial Server WAHA & Host</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '999px',
                    background: isDbSynced ? '#dcfce7' : '#fef3c7',
                    color: isDbSynced ? '#15803d' : '#d97706',
                    border: `1px solid ${isDbSynced ? '#86efac' : '#fde68a'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <i className={`fa-solid ${isDbSynced ? 'fa-database' : 'fa-hard-drive'}`}></i>
                    {isDbSynced ? 'Database Supabase Synced' : 'Penyimpanan Lokal'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveConfig}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>WAHA Server URL (Host Address) *</label>
                  <input
                    type="url"
                    className="form-control"
                    value={configServerUrl}
                    onChange={(e) => setConfigServerUrl(e.target.value)}
                    placeholder="http://localhost:3000 atau https://waha.domainanda.com"
                    required
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                    Standar lokal: <code>http://localhost:3000</code> atau server VPS/Cloud.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>WAHA API Key (Header X-Api-Key) - Opsional:</label>
                  <input
                    type="password"
                    className="form-control"
                    value={configApiKey}
                    onChange={(e) => setConfigApiKey(e.target.value)}
                    placeholder="Kosongkan jika WAHA tidak menggunakan WAHA_API_KEY"
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                    Sesuai konfigurasi env <code>WAHA_API_KEY</code> di container Docker Anda.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label>Default Session Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={configDefaultSession}
                    onChange={(e) => setConfigDefaultSession(e.target.value)}
                    placeholder="default"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label>Nomor WhatsApp Admin Penerima Alert *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={configAdminPhone}
                    onChange={(e) => setConfigAdminPhone(e.target.value)}
                    placeholder="Contoh: 6281241075981"
                    required
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                    Nomor WhatsApp ini akan otomatis menerima notifikasi setiap ada customer yang submit formulir CS.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary" disabled={savingDb} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <i className={`fa-solid ${savingDb ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                    {savingDb ? 'Menyimpan...' : 'Simpan Konfigurasi (Database & Lokal)'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setConfigServerUrl('http://143.198.219.167:3000');
                      setConfigApiKey('');
                      setConfigDefaultSession('default');
                    }}
                  >
                    Reset ke Default VPS
                  </button>
                </div>
              </form>
            </div>

            {/* Docker Quick Start Guide */}
            <div className="panel-card">
              <div className="panel-head">
                <div className="panel-head-title">
                  <i className="fa-brands fa-docker" style={{ color: '#0db7ed' }}></i>
                  <h3>Panduan Menjalankan WAHA di Komputer / VPS</h3>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Jalankan perintah Docker berikut di terminal komputer atau server VPS Anda untuk menjalankan WAHA:
              </p>

              <div className="code-block-box">
                <pre>
{`# Jalankan WAHA Gateway resmi (Port 3000)
docker run -d \\
  --name amanda-waha \\
  -p 3000:3000 \\
  -e WAHA_CORS_ORIGIN="*" \\
  -e WHATSAPP_DEFAULT_ENGINE=WEBJS \\
  -v waha_data:/app/.sessions \\
  devlike.pro/waha`}
                </pre>
                <button
                  type="button"
                  className="btn-secondary-sm copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(`docker run -d --name amanda-waha -p 3000:3000 -e WAHA_CORS_ORIGIN="*" -e WHATSAPP_DEFAULT_ENGINE=WEBJS -v waha_data:/app/.sessions devlike.pro/waha`);
                    showToast?.('Perintah Docker disalin ke clipboard!', 'success');
                  }}
                >
                  <i className="fa-solid fa-copy"></i> Salin Perintah
                </button>
              </div>

              <div className="waha-callout" style={{ marginTop: '16px' }}>
                <i className="fa-solid fa-lightbulb" style={{ color: '#d97706' }}></i>
                <div>
                  <strong>Tips Deployment Produksi:</strong>
                  <ul style={{ paddingLeft: '16px', margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <li>Pastikan flag <code>WAHA_CORS_ORIGIN="*"</code> disertakan agar browser dapat memanggil API.</li>
                    <li>Gunakan volume <code>-v waha_data:/app/.sessions</code> agar sesi WhatsApp tidak hilang saat container restart.</li>
                    <li>Aktifkan <strong>Mode Demo</strong> di pojok kanan atas jika server fisik Docker sedang dalam persiapan.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETAIL LOG ================= */}
      {viewLogDetail && (
        <div className="cms-modal-overlay active" onClick={() => setViewLogDetail(null)}>
          <div className="cms-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-head">
              <h3>Detail Pesan WhatsApp Terkirim</h3>
              <button className="modal-close-btn" onClick={() => setViewLogDetail(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Nomor Penerima:</strong>
                <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace' }}>{viewLogDetail.to}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Waktu Pengiriman:</strong>
                <span style={{ fontSize: '13px' }}>{new Date(viewLogDetail.timestamp).toLocaleString('id-ID')}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Sesi WAHA / Mode:</strong>
                <span style={{ fontSize: '13px' }}>{viewLogDetail.session} ({viewLogDetail.mode || 'LIVE'})</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Isi Pesan:</strong>
                <div style={{ background: '#f8f7f4', border: '1px solid var(--border-sand)', borderRadius: '8px', padding: '12px', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.6 }}>
                  {viewLogDetail.text}
                </div>
              </div>
              <div className="modal-actions" style={{ padding: 0 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(viewLogDetail.text);
                    showToast?.('Pesan disalin ke clipboard!', 'success');
                  }}
                >
                  <i className="fa-solid fa-copy"></i> Salin Teks
                </button>
                <button type="button" className="btn-primary" onClick={() => setViewLogDetail(null)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
