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

function GrabIcon({ size = 15, className = 'grab-icon-svg' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.129 10.863a2.927 2.927 0 00-2.079-.872c-.57 0-1.141.212-1.455.421-.651.434-1.186.904-2.149 2.148v.894c.817-1.064 1.59-1.903 2.177-2.364.386-.31.933-.501 1.427-.501 1.275 0 2.352 1.077 2.352 2.352v.538c0 .63-.247 1.223-.698 1.668a2.341 2.341 0 01-1.654.685c-1.048 0-1.97-.719-2.22-1.701l-.422.51c.307 1.03 1.417 1.789 2.642 1.789.778 0 1.516-.31 2.079-.872.562-.562.871-1.3.871-2.079v-.538c0-.778-.31-1.517-.871-2.078m-12.8-.274c.406 0 .757.087 1.074.266.149-.186.299-.337.411-.449-.335-.256-.903-.415-1.485-.415-.83 0-1.584.3-2.122.843-.534.54-.83 1.287-.83 2.107v3.489h.598V12.94c0-1.385.968-2.352 2.354-2.352m5.678 5.84v-3.488c0-1.072-.84-1.913-1.913-1.913-.5 0-.976.203-1.343.57a1.895 1.895 0 00-.57 1.343v.538c0 1.037.877 1.913 1.913 1.913.285 0 .671-.07.908-.264v-.631c-.232.187-.57.298-.908.298a1.302 1.302 0 01-1.315-1.316v-.538a1.3 1.3 0 011.315-1.314 1.3 1.3 0 011.316 1.314v3.489zM0 12.596v.193c0 1.036.393 2.003 1.107 2.722a3.759 3.759 0 002.689 1.112c.82 0 1.548-.186 2.162-.551.506-.302.73-.607.75-.635V12.22H3.65v.597H6.11v2.434l-.002.002c-.288.288-.972.77-2.312.77a3.165 3.165 0 01-2.279-.938 3.247 3.247 0 01-.92-2.297v-.193c0-.83.375-1.656 1.026-2.269a3.558 3.558 0 012.442-.967c.847 0 1.438.129 1.913.416v-.67c-.494-.21-1.085-.305-1.913-.305C1.862 8.8 0 10.538 0 12.595m10.329-.968c.226 0 .419.037.571.112.075-.186.151-.339.262-.525-.162-.116-.549-.186-.833-.186-1.09 0-1.913.823-1.913 1.913v3.489h.598V12.94c0-.774.54-1.314 1.315-1.314m-4.351-.702v-.707c-.541-.29-1.131-.419-1.913-.419-.799 0-1.555.293-2.132.824-.577.532-.895 1.233-.895 1.972v.193c0 1.542 1.237 2.796 2.758 2.796 1.237 0 1.745-.405 1.874-.533v-1.794H3.65v.598h1.46v.899l-.005.001c-.187.075-.578.231-1.31.231-.58 0-1.122-.225-1.528-.636a2.203 2.203 0 01-.632-1.562v-.193c0-1.192 1.113-2.198 2.43-2.198.91 0 1.45.147 1.913.528m14.105 1.126c.27-.27.623-.424.967-.424.737 0 1.315.577 1.315 1.314v.538c0 .738-.578 1.316-1.315 1.316-.357 0-.702-.196-.972-.55a2.151 2.151 0 01-.418-1.12l-.484.591c.095.452.33.885.665 1.19.344.313.774.486 1.209.486a1.915 1.915 0 001.913-1.913v-.538c0-.499-.202-.977-.57-1.343a1.896 1.896 0 00-1.343-.57c-.316 0-.818.114-1.417.652l-.002.002c-.16.16-.536.536-.765.804-.384.42-.943 1.054-1.42 1.688v.933c.529-.68.833-1.06 1.33-1.634.445-.519.996-1.15 1.307-1.422m-8.939 1.428c0 .779.31 1.517.872 2.08a2.93 2.93 0 002.078.87c.33 0 .669-.07.908-.188v-.597c-.28.117-.618.188-.908.188-1.274 0-2.352-1.077-2.352-2.353v-.538c0-1.275 1.078-2.352 2.352-2.352a2.34 2.34 0 012.353 2.353v3.488h.598v-3.604a2.979 2.979 0 00-.915-2.006 2.92 2.92 0 00-2.036-.83c-.778 0-1.516.31-2.078.873a2.926 2.926 0 00-.872 2.078zm6.918-2.313c.183-.22.372-.443.596-.631V7.378h-.596zm1.037-.876V7.378h.597V9.88a3.601 3.601 0 00-.597.41" />
    </svg>
  );
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
                                        title={`Chat WhatsApp ${bth.name}`}
                                        aria-label={`Chat WhatsApp ${bth.name}`}
                                      >
                                        <i className="fa-brands fa-whatsapp"></i>
                                      </a>
                                      <a
                                        href={bth.grabUrl || out.grabUrl || `https://food.grab.com/id/id/restaurants?search=${encodeURIComponent('Amanda Brownies ' + bth.name)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-booth-simple-grab"
                                        title={`Pesan via GrabFood ${bth.name}`}
                                        aria-label={`Pesan via GrabFood ${bth.name}`}
                                      >
                                        <GrabIcon size={14} className="grab-icon-mini" />
                                      </a>
                                      <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-booth-simple-maps"
                                        title={`Petunjuk Arah Google Maps ${bth.name}`}
                                        aria-label={`Petunjuk Arah Google Maps ${bth.name}`}
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

                        {/* Actions: WA (logo), Grab (logo), Location (logo) - Icon Only */}
                        <div className="outlet-network-actions">
                          <a
                            href={`https://wa.me/${out.wa}?text=${encodeURIComponent(`Halo ${out.name}, saya ingin pesan brownies Amanda. Mohon info varian yang ready saat ini.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-network-wa"
                            title={`Chat WhatsApp: ${out.name}`}
                            aria-label={`Chat WhatsApp ${out.name}`}
                          >
                            <i className="fa-brands fa-whatsapp"></i>
                          </a>
                          <a
                            href={out.grabUrl || `https://food.grab.com/id/id/restaurants?search=${encodeURIComponent('Amanda Brownies ' + (out.name || out.city))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-network-grab"
                            title={`Pesan via GrabFood: ${out.name}`}
                            aria-label={`Pesan via GrabFood ${out.name}`}
                          >
                            <GrabIcon size={18} className="grab-icon-svg" />
                          </a>
                          <a
                            href={out.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(out.name + ' ' + out.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-network-maps"
                            title={`Petunjuk Rute Google Maps: ${out.name}`}
                            aria-label={`Petunjuk Rute Google Maps ${out.name}`}
                          >
                            <i className="fa-solid fa-location-dot"></i>
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
