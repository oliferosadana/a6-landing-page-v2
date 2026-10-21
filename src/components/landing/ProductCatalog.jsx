import React from 'react';
import { useData } from '../../context/DataContext';
import SectionSpinner from '../common/SectionSpinner';

export default function ProductCatalog({ onSelectProduct }) {
  const {
    products,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    productsLoading
  } = useData();

  const isCatalogLoading = productsLoading && products.length === 0;

  const filtered = products.filter((prod) => {
    const matchesCat = (selectedCategory === 'all') || (prod.category === selectedCategory);
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      prod.name.toLowerCase().includes(q) ||
      (prod.description && prod.description.toLowerCase().includes(q)) ||
      (prod.categoryLabel && prod.categoryLabel.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <>
      {/* Search & Filters Bar */}
      <section className="finder-bar-section" id="katalog1">
        <div className="container">
          <div className="finder-box">
            <div className="finder-header">
              <div className="finder-title">
                <h3 className="font-serif">Katalog Produk Amanda</h3>
                <p>Pilihan varian brownies kukus, bakar, dan premium dengan cita rasa legit dan kualitas terbaik.</p>
              </div>

              {/* Live Search Bar */}
              <div className="search-input-wrapper">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  id="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari varian brownies (misal: Cheese, Original, Pandan)..."
                />
              </div>
            </div>

            {/* Category Buttons */}
            <div className="category-chips-row">
              <button
                className={`cat-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                <i className="fa-solid fa-layer-group"></i> Semua Menu
              </button>
              <button
                className={`cat-btn ${selectedCategory === 'kukus' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('kukus')}
              >
                <i className="fa-solid fa-cloud"></i> Brownies Kukus
              </button>
              <button
                className={`cat-btn ${selectedCategory === 'bakar' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('bakar')}
              >
                <i className="fa-solid fa-fire-burner"></i> Brownies Bakar
              </button>
              <button
                className={`cat-btn ${selectedCategory === 'marble' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('marble')}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i> Premium & Marble
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="catalog-section">
        <div className="container">
          {isCatalogLoading ? (
            <SectionSpinner
              icon="fa-solid fa-cake-candles"
              title="Memuat Katalog Produk..."
              subtitle="Mengambil varian brownies kukus, bakar, dan premium..."
              minHeight="320px"
            />
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'rgba(39, 22, 16, 0.4)',
                borderRadius: '16px',
                border: '1px dashed var(--border-subtle)',
                width: '100%'
              }}
            >
              <i
                className="fa-solid fa-cake-candles"
                style={{ fontSize: '40px', color: 'var(--primary-gold)', marginBottom: '12px', display: 'block' }}
              ></i>
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Produk Tidak Ditemukan</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Coba kata kunci lain atau pilih kategori yang berbeda.
              </p>
            </div>
          ) : (
            <div className="products-grid" id="products-grid">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="product-card"
                  id={`card-${product.id}`}
                  data-id={product.id}
                  title={`Klik untuk memperbesar gambar: ${product.name}`}
                  onClick={() => onSelectProduct(product)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-header-media">
                    <img src={product.image} alt={product.name} loading="lazy" />
                    <div className="card-media-overlay">
                      <h3 className="card-media-title font-serif">{product.name}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
