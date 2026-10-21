import React, { useState, useEffect, useRef } from 'react';

export default function SpeedDialWa({ onOpenCsModal }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Dim Backdrop with blur to focus attention & allow 1-tap dismiss */}
      <div
        className={`wa-speeddial-backdrop ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        className={`wa-speeddial-container ${isOpen ? 'active' : ''}`}
        id="wa-speeddial-container"
      >
        {/* Pop-up Menu Panel */}
        <div
          className="wa-speeddial-menu"
          id="wa-speeddial-menu"
          role="menu"
          aria-label="Pilihan Layanan WhatsApp Amanda"
        >
          {/* Header */}
          <div className="wa-speeddial-header">
            <div className="wa-header-avatar">
              <i className="fa-brands fa-whatsapp"></i>
              <span className="wa-avatar-status" title="Aktif Online"></span>
            </div>
            <div className="wa-header-text">
              <div className="wa-header-title-row">
                <strong>Layanan Amanda</strong>
                <span className="wa-online-pill">
                  <span className="wa-status-dot"></span> Online
                </span>
              </div>
              <span>Respon Cepat via WhatsApp</span>
            </div>
            <button
              type="button"
              className="wa-speeddial-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup Pilihan"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Body Options: Hanya 3 Menu Layanan */}
          <div className="wa-speeddial-body">
            {/* 1. Kerjasama */}
            <a
              href="https://wa.me/628115954488?text=Halo%20Amanda%20Brownies%20Kalimantan%2C%20saya%20tertarik%20untuk%20mengajukan%20Kerjasama%20%2F%20Sponsorship%20%2F%20Pesanan%20Korporat."
              target="_blank"
              rel="noopener noreferrer"
              className="wa-speeddial-item wa-item-kerjasama"
              onClick={() => setIsOpen(false)}
            >
              <div className="wa-item-icon-wrap icon-gold">
                <i className="fa-solid fa-handshake"></i>
              </div>
              <div className="wa-item-info">
                <div className="wa-item-title">
                  <strong>Kerjasama</strong>
                  <span className="wa-item-badge">B2B</span>
                </div>
                <p className="wa-item-desc">Sponsorship & pesanan korporat</p>
              </div>
              <i className="fa-solid fa-chevron-right wa-item-arrow"></i>
            </a>

            {/* 2. Reseller */}
            <a
              href="https://wa.me/6289691470944?text=Halo%20Amanda%20Brownies%20Kalimantan%2C%20saya%20ingin%20bergabung%20menjadi%20mitra%20Reseller%20%26%20Keagenan%20resmi."
              target="_blank"
              rel="noopener noreferrer"
              className="wa-speeddial-item wa-item-reseller"
              onClick={() => setIsOpen(false)}
            >
              <div className="wa-item-icon-wrap icon-orange">
                <i className="fa-solid fa-store"></i>
              </div>
              <div className="wa-item-info">
                <div className="wa-item-title">
                  <strong>Reseller</strong>
                  <span className="wa-item-badge badge-orange">Peluang</span>
                </div>
                <p className="wa-item-desc">Keagenan resmi Amanda Brownies</p>
              </div>
              <i className="fa-solid fa-chevron-right wa-item-arrow"></i>
            </a>

            {/* 3. Layanan Pelanggan */}
            <button
              type="button"
              className="wa-speeddial-item wa-item-complaint"
              onClick={() => {
                setIsOpen(false);
                if (onOpenCsModal) onOpenCsModal();
              }}
            >
              <div className="wa-item-icon-wrap icon-olive">
                <i className="fa-solid fa-headset"></i>
              </div>
              <div className="wa-item-info">
                <div className="wa-item-title">
                  <strong>Layanan Pelanggan</strong>
                  <span className="wa-item-badge badge-olive">Formulir</span>
                </div>
                <p className="wa-item-desc">Pengaduan resmi & upload bukti struk</p>
              </div>
              <i className="fa-solid fa-chevron-right wa-item-arrow"></i>
            </button>
          </div>

          {/* Footer */}
          <div className="wa-speeddial-footer">
            <i className="fa-solid fa-shield-check"></i>
            <span>Amanda Brownies Wilayah Kalimantan</span>
          </div>
        </div>

        {/* Floating Main Action Button */}
        <button
          type="button"
          className="wa-speeddial-main-btn"
          id="wa-main-trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Tutup menu WhatsApp" : "Buka menu WhatsApp"}
          title="Hubungi Kami via WhatsApp"
        >
          <span className="wa-pulse-ring"></span>
          <span className="wa-pulse-ring delay"></span>

          {/* Morphing Icons */}
          <span className="wa-icon-state wa-icon-chat">
            <i className="fa-brands fa-whatsapp"></i>
          </span>
          <span className="wa-icon-state wa-icon-close">
            <i className="fa-solid fa-xmark"></i>
          </span>

          {/* Floating Pill Tooltip */}
          <span className="wa-floating-tooltip">
            <span>Ada pertanyaan?</span>
            <strong>Hubungi Kami</strong>
          </span>
        </button>
      </div>
    </>
  );
}
