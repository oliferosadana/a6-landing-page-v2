import React from 'react';
import { useData } from '../../context/DataContext';
import SectionSpinner from '../common/SectionSpinner';

function formatPhoneDisplay(raw) {
  if (!raw || raw === '-') return '-';
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.startsWith('628') && digits.length >= 11) {
    return `+62 ${digits.slice(2, 5)}-${digits.slice(5, 9)}-${digits.slice(9)}`;
  }
  if (digits.startsWith('08') && digits.length >= 10) {
    return `08${digits.slice(2, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (str.startsWith('+62') && !str.includes(' ') && !str.includes('-')) {
    return `+62 ${str.slice(3, 6)}-${str.slice(6, 10)}-${str.slice(10)}`;
  }
  return str;
}

export default function OutletLocator({ onOpenOutletModal }) {
  const { outlets, categories, selectedCity, setSelectedCity, outletsLoading } = useData();

  const activeCategories = (categories && categories.length > 0)
    ? categories.filter(c => c.status !== 'inactive')
    : [];

  const filteredOutlets = selectedCity === 'all'
    ? outlets
    : outlets.filter(o => o.city === selectedCity);

  const isLocating = outletsLoading && outlets.length === 0;

  return (
    <section className="locator-section" id="outlet">
      <div className="container">
        {/* Section Header */}
        <div className="section-head locator-section-head">
          <span className="section-tag">
            <i className="fa-solid fa-store" style={{ marginRight: '4px' }}></i> Jaringan Cabang Resmi Kalimantan
          </span>
          <h2 className="font-serif">Outlet Amanda Brownies Kalimantan</h2>
          <p>Kunjungi cabang resmi terdekat untuk pembelian langsung (Take Away) atau pesan via WhatsApp.</p>
        </div>

        {isLocating ? (
          <SectionSpinner
            icon="fa-solid fa-store"
            title="Memuat Jaringan Outlet Amanda..."
            subtitle="Menghubungkan ke database cabang & booth resmi Kalimantan..."
            minHeight="280px"
          />
        ) : (
          <>
            {/* Filter Tabs Bar */}
            <div className="locator-filter-bar">
              <div className="city-pill-list">
                <button
                  className={`city-pill ${selectedCity === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCity('all')}
                >
                  <i className="fa-solid fa-city"></i> Semua Cabang ({outlets.length})
                </button>
                {activeCategories.map((cat) => {
                  const count = outlets.filter(o => o.city === cat.name).length;
                  return (
                    <button
                      key={cat.id}
                      className={`city-pill ${selectedCity === cat.name ? 'active' : ''}`}
                      onClick={() => setSelectedCity(cat.name)}
                    >
                      <i className={cat.icon || 'fa-solid fa-location-dot'}></i> {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Outlets Responsive Grid */}
            {filteredOutlets.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  color: 'var(--text-muted)'
                }}
              >
                <i className="fa-solid fa-shop-slash" style={{ fontSize: '32px', color: 'var(--primary-gold)', marginBottom: '10px', display: 'block' }}></i>
                Belum ada data outlet untuk kategori wilayah ini.
              </div>
            ) : (
              <div className="outlets-network-grid" id="locator-outlets-list">
                {filteredOutlets.map((out) => {
                  const boothsList = out.booths || [];

                  return (
                    <div key={out.id} className="outlet-network-card">
                      {/* Left Media - 100% Minimalist Clean Image with Click-to-Zoom */}
                      <div
                        className="outlet-network-media"
                        onClick={() => onOpenOutletModal && onOpenOutletModal(out)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (onOpenOutletModal) onOpenOutletModal(out);
                          }
                        }}
                        title={`Klik untuk memperbesar foto: ${out.name}`}
                        style={{ cursor: 'zoom-in' }}
                      >
                        <img
                          src={out.image}
                          alt={out.name}
                          loading="lazy"
                          className="outlet-store-img"
                        />
                      </div>

                      {/* Right Body */}
                      <div className="outlet-network-body">
                        <div className="outlet-info-top">
                          <h3 className="outlet-network-title font-serif">{out.name}</h3>
                          <div className="outlet-meta-row">
                            <span className="outlet-meta-item outlet-meta-loc" title={`Wilayah: ${out.city}`}>
                              <i className="fa-solid fa-location-dot"></i>
                              <span>{out.city}</span>
                            </span>
                            <span className="outlet-meta-item outlet-meta-time" title={`Jam Operasional: ${out.hours}`}>
                              <i className="fa-regular fa-clock"></i>
                              <span>{out.hours}</span>
                            </span>
                            {out.phone && out.phone !== '-' && (
                              <a
                                href={`tel:${out.phone.startsWith('+') ? out.phone : '+' + out.phone}`}
                                className="outlet-meta-item outlet-meta-phone"
                                title={`Hubungi ${out.name}: ${out.phone}`}
                              >
                                <i className="fa-solid fa-phone"></i>
                                <span>{formatPhoneDisplay(out.phone)}</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Booths Counter List */}
                        {boothsList.length > 0 && (
                          <div className="outlet-booths-simple">
                            <div className="booths-simple-title">
                              <i className="fa-solid fa-store" style={{ color: 'var(--primary-gold)' }}></i>
                              <span>Booth Counter ({boothsList.length} Titik):</span>
                            </div>
                            <ul className="booths-simple-list">
                              {boothsList.map((bth, bIdx) => {
                                const mapsQuery = encodeURIComponent(`${bth.name} ${out.city}`);
                                const mapsUrl = bth.mapsUrl || `https://maps.google.com/?q=${mapsQuery}`;
                                const waMsg = encodeURIComponent(`Halo ${bth.name}, saya ingin memesan brownies Amanda. Mohon info ketersediaan stok.`);

                                return (
                                  <li key={bIdx} className="booth-simple-item">
                                    <div className="booth-simple-text">
                                      <span className="booth-simple-name">
                                        <i className="fa-solid fa-circle-dot" style={{ fontSize: '7px', color: 'var(--primary-gold)', marginRight: '4px' }}></i>
                                        {bth.name}
                                      </span>
                                      <span className="booth-simple-time">
                                        <i className="fa-regular fa-clock" style={{ fontSize: '10px', marginRight: '3px' }}></i>
                                        {bth.hours}
                                      </span>
                                    </div>
                                    <div className="booth-item-actions">
                                      <a
                                        href={`https://wa.me/${bth.wa || out.wa}?text=${waMsg}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-booth-simple-wa"
                                        title={`WhatsApp ${bth.name}`}
                                      >
                                        <i className="fa-brands fa-whatsapp"></i> Chat
                                      </a>
                                      <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-booth-simple-maps"
                                        title={`Petunjuk Arah Google Maps ${bth.name}`}
                                      >
                                        <i className="fa-solid fa-map-location-dot"></i>
                                      </a>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="outlet-network-actions">
                          <a
                            href={`https://wa.me/${out.wa}?text=${encodeURIComponent(`Halo ${out.name}, saya ingin pesan brownies Amanda. Mohon info varian yang ready saat ini.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-network-wa"
                          >
                            <i className="fa-brands fa-whatsapp"></i> Hubungi Outlet
                          </a>
                          <a
                            href={out.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(out.name + ' ' + out.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-network-maps"
                            title="Buka Rute Google Maps"
                          >
                            <i className="fa-solid fa-diamond-turn-right"></i> Rute Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
