import React from 'react';
import { useData } from '../../context/DataContext';

export default function Footer({ onOpenCsModal }) {
  const { setSelectedCategory, setSelectedCity } = useData();

  const handleSelectFav = (cat) => {
    setSelectedCategory(cat);
    const el = document.getElementById('katalog1');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    const el = document.getElementById('outlet');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <div className="brand-logo" style={{ marginBottom: '14px' }}>
              <img
                src="/assets/logo.png"
                alt="Amanda Brownies Official Logo"
                className="official-brand-logo"
                style={{ width: '46px', height: '46px' }}
              />
              <div className="brand-text">
                <span className="brand-title" style={{ color: '#ffffff' }}>AMANDA</span>
                <span>BROWNIES KALIMANTAN</span>
              </div>
            </div>
            <p>
              Layanan resmi pengecekan produk & pemesanan Amanda Brownies untuk wilayah Kalimantan Timur dan sekitarnya.
            </p>
            <div style={{ display: 'flex', gap: '12px', fontSize: '18px' }}>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-gold)' }}>
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-gold)' }}>
                <i className="fa-brands fa-tiktok"></i>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-gold)' }}>
                <i className="fa-brands fa-facebook"></i>
              </a>
              <a href="https://wa.me/6281241075981" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-gold)' }}>
                <i className="fa-brands fa-whatsapp"></i>
              </a>
            </div>
          </div>

          {/* Varian Favorit */}
          <div className="footer-col">
            <h4 className="font-serif">Varian Favorit</h4>
            <ul className="footer-links">
              <li>
                <a href="#katalog1" onClick={(e) => { e.preventDefault(); handleSelectFav('kukus'); }}>
                  Brownies Kukus Original
                </a>
              </li>
              <li>
                <a href="#katalog1" onClick={(e) => { e.preventDefault(); handleSelectFav('kukus'); }}>
                  Brownies Cheese Cream
                </a>
              </li>
              <li>
                <a href="#katalog1" onClick={(e) => { e.preventDefault(); handleSelectFav('marble'); }}>
                  Tiramisu Marble
                </a>
              </li>
              <li>
                <a href="#katalog1" onClick={(e) => { e.preventDefault(); handleSelectFav('kukus'); }}>
                  Sarikaya Pandan
                </a>
              </li>
              <li>
                <a href="#katalog1" onClick={(e) => { e.preventDefault(); handleSelectFav('bakar'); }}>
                  Brownies Bakar Almond
                </a>
              </li>
            </ul>
          </div>

          {/* Outlet Kalimantan */}
          <div className="footer-col">
            <h4 className="font-serif">Outlet Kalimantan</h4>
            <ul className="footer-links">
              <li>
                <a href="#outlet" onClick={(e) => { e.preventDefault(); handleSelectCity('Balikpapan'); }}>
                  Balikpapan
                </a>
              </li>
              <li>
                <a href="#outlet" onClick={(e) => { e.preventDefault(); handleSelectCity('Samarinda'); }}>
                  Samarinda
                </a>
              </li>
              <li>
                <a href="#outlet" onClick={(e) => { e.preventDefault(); handleSelectCity('Bontang'); }}>
                  Bontang
                </a>
              </li>
              <li>
                <a href="#outlet" onClick={(e) => { e.preventDefault(); handleSelectCity('Tanjung Tabalong'); }}>
                  Tanjung Tabalong
                </a>
              </li>
              <li>
                <a href="#outlet" onClick={(e) => { e.preventDefault(); handleSelectCity('Tanah Grogot'); }}>
                  Tanah Grogot
                </a>
              </li>
            </ul>
          </div>

          {/* Kontak Layanan */}
          <div className="footer-col footer-contact-col">
            <h4 className="font-serif">Kontak Layanan</h4>
            <div className="footer-wa-minimal-list">
              <a
                href="https://wa.me/628115954488?text=Halo%20Amanda%20Brownies%20Kalimantan%2C%20saya%20tertarik%20untuk%20mengajukan%20Kerjasama%20%2F%20Sponsorship%20%2F%20Pesanan%20Korporat."
                target="_blank"
                rel="noopener noreferrer"
                className="btn-wa-minimal"
                title="Hubungi Kerjasama & B2B"
              >
                <i className="fa-brands fa-whatsapp wa-icon-green"></i>
                <span className="btn-wa-label">Kerjasama</span>
              </a>

              <a
                href="https://wa.me/6289691470944?text=Halo%20Amanda%20Brownies%20Kalimantan%2C%20saya%20ingin%20info%20kemitraan%20Reseller%20%26%20Keagenan."
                target="_blank"
                rel="noopener noreferrer"
                className="btn-wa-minimal"
                title="Daftar Reseller & Agen"
              >
                <i className="fa-brands fa-whatsapp wa-icon-green"></i>
                <span className="btn-wa-label">Reseller</span>
              </a>

              <button
                type="button"
                onClick={onOpenCsModal}
                className="btn-wa-minimal"
                title="Layanan Pelanggan & Form Pengaduan Struk"
                style={{
                  background: 'rgba(79, 91, 42, 0.1)',
                  borderColor: 'var(--primary-olive)',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-receipt" style={{ color: 'var(--primary-olive)' }}></i>
                <span className="btn-wa-label" style={{ color: 'var(--primary-olive)', fontWeight: 700 }}>
                  Form CS & Struk
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          className="footer-bottom"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <p>&copy; 2026 Amanda Brownies Kalimantan. Hak Cipta Dilindungi.</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
            <button
              onClick={onOpenCsModal}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                textDecoration: 'underline',
                marginRight: '12px',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Pusat Layanan Pelanggan (CS)
            </button>
            Sistem Informasi & Pemesanan Resmi Outlet Kalimantan
          </p>
        </div>
      </div>
    </footer>
  );
}
