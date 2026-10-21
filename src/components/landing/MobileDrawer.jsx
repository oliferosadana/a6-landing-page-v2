import React, { useState } from 'react';
import { useData } from '../../context/DataContext';

export default function MobileDrawer({ isOpen, onClose, onOpenAdmin }) {
  const { outlets, setSelectedCity, showToast, outletsLoading } = useData();
  const [drawerDropdownOpen, setDrawerDropdownOpen] = useState(true);
  const isOutletLoading = outletsLoading && outlets.length === 0;

  const handleSelectOutlet = (outlet) => {
    setSelectedCity(outlet.city);
    onClose();
    showToast(`Membuka info: ${outlet.name}`);
    const el = document.getElementById('outlet');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div
        className={`mobile-drawer-backdrop ${isOpen ? 'open' : ''}`}
        id="mobile-drawer-backdrop"
        onClick={onClose}
        style={{ display: isOpen ? 'block' : 'none' }}
      ></div>

      <aside className={`mobile-drawer ${isOpen ? 'open' : ''}`} id="mobile-drawer" aria-label="Menu Navigasi Mobile">
        <div className="mobile-drawer-header">
          <div className="brand-logo" style={{ gap: '10px' }}>
            <img
              src="/assets/logo.png"
              alt="Amanda Brownies Official Logo"
              className="official-brand-logo"
              style={{ width: '36px', height: '36px' }}
            />
            <div className="brand-text">
              <span className="brand-title" style={{ fontSize: '15px', color: 'var(--primary-olive-dark)' }}>AMANDA</span>
              <span style={{ fontSize: '8px', color: 'var(--primary-gold)' }}>BROWNIES KALIMANTAN</span>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Tutup Menu">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="mobile-drawer-body">
          <ul className="mobile-drawer-links">
            <li>
              <a href="#promo" onClick={onClose} className="drawer-link">
                <i className="fa-solid fa-tag"></i> <span>Promo Spesial</span>
              </a>
            </li>
            <li>
              <a href="#pricelist" onClick={onClose} className="drawer-link">
                <i className="fa-solid fa-file-invoice-dollar"></i> <span>Daftar Harga (Price List)</span>
              </a>
            </li>
            <li className={`drawer-dropdown-item ${drawerDropdownOpen ? 'open' : ''}`} id="drawer-outlet-item">
              <div
                className="drawer-dropdown-toggle"
                onClick={() => setDrawerDropdownOpen(!drawerDropdownOpen)}
                style={{ cursor: 'pointer' }}
              >
                <div className="drawer-dropdown-toggle-left">
                  <i className="fa-solid fa-shop"></i> <span>Pilihan Outlet Resmi</span>
                </div>
                <i className={`fa-solid fa-chevron-down drawer-arrow ${drawerDropdownOpen ? 'rotate' : ''}`}></i>
              </div>
              {drawerDropdownOpen && (
                <ul className="drawer-submenu-list" id="drawer-outlet-list">
                  {isOutletLoading ? (
                    <li style={{ padding: '12px 18px', color: 'var(--primary-gold)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Memuat outlet...</span>
                    </li>
                  ) : outlets.length === 0 ? (
                    <li style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Tidak ada cabang tersedia
                    </li>
                  ) : (
                    outlets.map((out) => {
                    const booths = out.booths || [];
                    return (
                      <li key={out.id} className="drawer-outlet-subitem">
                        <a
                          href="#outlet"
                          className="drawer-outlet-parent-link"
                          onClick={(e) => {
                            e.preventDefault();
                            handleSelectOutlet(out);
                          }}
                        >
                          <i className="fa-solid fa-shop"></i> {out.name}
                        </a>
                        {booths.length > 0 && (
                          <ul className="drawer-sub-booths">
                            {booths.map((b, bIdx) => (
                              <li key={bIdx} className="drawer-sub-booth-item">
                                <a
                                  href="#outlet"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleSelectOutlet(out);
                                  }}
                                >
                                  <i className="fa-solid fa-circle-dot"></i> {b.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  }))}
                </ul>
              )}
            </li>
            <li>
              <a href="#katalog1" onClick={onClose} className="drawer-link">
                <i className="fa-solid fa-cake-candles"></i> <span>Katalog Menu & Stok</span>
              </a>
            </li>
            <li>
              <a href="#cs" onClick={onClose} className="drawer-link">
                <i className="fa-solid fa-headset"></i> <span>Layanan & Pengaduan CS</span>
              </a>
            </li>
            <li>
              <a
                href="#admin"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  onOpenAdmin();
                }}
                className="drawer-link"
                style={{ color: 'var(--primary-gold)' }}
              >
                <i className="fa-solid fa-user-shield"></i> <span>Admin Portal CMS</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
