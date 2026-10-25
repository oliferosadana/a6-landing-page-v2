import React, { useState } from 'react';
import { useData } from '../../context/DataContext';

export default function Navbar({ onOpenMobileMenu, onOpenAdmin }) {
  const { outlets, setSelectedCity, showToast, outletsLoading } = useData();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isOutletLoading = outletsLoading && outlets.length === 0;

  const handleSelectOutlet = (outlet) => {
    setSelectedCity(outlet.city);
    setDropdownOpen(false);
    showToast(`Membuka info: ${outlet.name}`);
    const el = document.getElementById('outlet');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="navbar" id="navbar">
      <div className="container nav-container">
        {/* Brand Logo */}
        <a href="#" className="brand-logo" aria-label="Beranda Amanda Brownies">
          <img
            src="/assets/logo.png"
            alt="Amanda Brownies Logo"
            className="official-brand-logo"
            width="44"
            height="44"
          />
          <div className="brand-text">
            <span className="brand-title">AMANDA</span>
            <span>BROWNIES KALIMANTAN</span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav>
          <ul className="nav-links">
            <li><a href="#promo">Promo</a></li>
            <li><a href="#pricelist">Price List</a></li>
            <li
              className={`nav-item-dropdown ${dropdownOpen ? 'open' : ''}`}
              id="nav-outlet-dropdown"
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <a href="#outlet" className="dropdown-toggle" onClick={(e) => { e.preventDefault(); setDropdownOpen(!dropdownOpen); }}>
                Outlet <i className="fa-solid fa-chevron-down dropdown-arrow"></i>
              </a>
              <ul className="nav-dropdown-menu" id="nav-outlet-list" style={{ display: dropdownOpen ? 'block' : 'none' }}>
                {isOutletLoading ? (
                  <li className="dropdown-outlet-loading">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Memuat outlet...</span>
                  </li>
                ) : outlets.length === 0 ? (
                  <li style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Tidak ada cabang tersedia
                  </li>
                ) : (
                  outlets.map((out) => {
                    const booths = out.booths || [];
                    return (
                      <li key={out.id} className="dropdown-outlet-item">
                        <a
                          href="#outlet"
                          className="dropdown-parent-link"
                          onClick={(e) => {
                            e.preventDefault();
                            handleSelectOutlet(out);
                          }}
                        >
                          <i className="fa-solid fa-shop"></i> {out.name}
                        </a>
                        {booths.length > 0 && (
                          <ul className="dropdown-sub-booths">
                            {booths.map((b, bIdx) => (
                              <li key={bIdx} className="dropdown-sub-booth-item">
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
            </li>
            <li><a href="#katalog1">Katalog Menu</a></li>
            <li><a href="#cs"><i className="fa-solid fa-headset" style={{ marginRight: '4px', fontSize: '13px' }}></i>Layanan & Pengaduan</a></li>
          </ul>
        </nav>

        {/* Nav Actions */}
        <div className="nav-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn-icon-badge"
            onClick={() => {
              const input = document.getElementById('search-input');
              if (input) input.focus();
              const el = document.getElementById('katalog1');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Cari Menu"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>

          {/* <button
            className="btn-icon-badge"
            onClick={onOpenAdmin}
            title="Admin CMS Portal"
            style={{ color: 'var(--primary-gold)' }}
          >
            <i className="fa-solid fa-user-shield"></i>
          </button> */}

          <button
            className="btn-hamburger"
            id="mobile-menu-btn"
            onClick={onOpenMobileMenu}
            title="Buka Menu Navigasi"
            aria-label="Buka Menu"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
