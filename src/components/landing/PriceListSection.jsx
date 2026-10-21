import React from 'react';
import { useData } from '../../context/DataContext';
import SectionSpinner from '../common/SectionSpinner';

export default function PriceListSection({ onOpenPriceListModal }) {
  const { pricelists, pricelistsLoading } = useData();

  if (pricelistsLoading && (!pricelists || pricelists.length === 0)) {
    return (
      <section className="pricelist-section" id="pricelist">
        <div className="container">
          <div className="section-head pricelist-section-head">
            <h2 className="font-serif">Daftar Harga & Menu Amanda</h2>
          </div>
          <SectionSpinner
            icon="fa-solid fa-file-invoice-dollar"
            title="Memuat Daftar Harga & Menu..."
            subtitle="Mengambil poster price list resmi Kalimantan..."
            minHeight="240px"
          />
        </div>
      </section>
    );
  }

  if (!pricelists || pricelists.length === 0) return null;

  return (
    <section className="pricelist-section" id="pricelist">
      <div className="container">
        <div className="section-head pricelist-section-head">
          <h2 className="font-serif">Daftar Harga & Menu Amanda</h2>
        </div>

        {/* Price List Cards Track */}
        <div className="pricelist-grid-wrapper">
          <div className="pricelist-cards-track" id="pricelist-cards-track">
            {pricelists.map((item) => (
              <div
                key={item.id}
                className="pricelist-card"
                id={`card-${item.id}`}
                onClick={() => onOpenPriceListModal(item)}
                title={`Klik untuk memperbesar: ${item.title}`}
                style={{ cursor: 'pointer' }}
              >
                {/* Clean Image without badge or perbesar overlay */}
                <div className="pricelist-media-box">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="pricelist-img"
                    loading="lazy"
                  />
                </div>

                {/* Retained Description Footer */}
                <div className="pricelist-card-footer">
                  <h3 className="pricelist-card-title">{item.title}</h3>
                  {item.caption && <p className="pricelist-card-caption">{item.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
