import React, { useState } from 'react';
import { useData } from '../../context/DataContext';

export default function DirectOrderModal({ product, onClose }) {
  const { outlets } = useData();
  const [selectedOutletId, setSelectedOutletId] = useState(outlets[0]?.id || '');
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  const handleOrderWhatsapp = () => {
    if (!selectedOutlet) return;
    const phone = selectedOutlet.wa || '6281241075981';
    const total = (product.price || 0) * quantity;
    const msg = `Halo ${selectedOutlet.name}, saya ingin memesan produk berikut:\n\n*${product.name}*\n• Jumlah: ${quantity} box\n• Perkiraan Harga: Rp ${total.toLocaleString('id-ID')}\n\nMohon info ketersediaan stok & petunjuk pengambilan/pengiriman. Terima kasih!`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    onClose();
  };

  return (
    <div
      className="modal-backdrop active"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #261712)',
          border: '1px solid var(--border-gold, rgba(212,175,55,0.3))',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          color: '#fff'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-cart-shopping" style={{ color: 'var(--primary-gold)' }}></i>
            <h3 style={{ fontSize: '17px', margin: 0 }} className="font-serif">
              Pesan Menu Amanda
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <img
              src={product.image}
              alt={product.name}
              style={{
                width: '110px',
                height: '110px',
                objectFit: 'cover',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(212,175,55,0.15)',
                  color: 'var(--primary-gold)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 600
                }}
              >
                {product.categoryLabel || 'Brownies Amanda'}
              </span>
              <h4 style={{ fontSize: '18px', margin: '6px 0', color: '#fff' }} className="font-serif">
                {product.name}
              </h4>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary-gold)', margin: '4px 0' }}>
                Rp {(product.price || 0).toLocaleString('id-ID')}
              </p>
              <span style={{ fontSize: '12px', color: '#aaa' }}>
                <i className="fa-solid fa-box-archive" style={{ marginRight: '4px' }}></i>
                {product.weight || '700 gram'} • {product.shelfLife || '4 Hari (Suhu Ruang)'}
              </span>
            </div>
          </div>

          {/* Outlet Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              <i className="fa-solid fa-store" style={{ color: 'var(--primary-gold)', marginRight: '6px' }}></i>
              Pilih Cabang Outlet Pengambilan / Chat:
            </label>
            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '14px'
              }}
            >
              {outlets.map((out) => (
                <option key={out.id} value={out.id} style={{ background: '#261712', color: '#fff' }}>
                  {out.name} ({out.city})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Jumlah Pesanan (Box):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                -
              </button>
              <span style={{ fontSize: '18px', fontWeight: 700, minWidth: '30px', textAlign: 'center' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                +
              </button>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#aaa', display: 'block' }}>Total Perkiraan:</span>
                <strong style={{ fontSize: '16px', color: 'var(--primary-gold)' }}>
                  Rp {((product.price || 0) * quantity).toLocaleString('id-ID')}
                </strong>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleOrderWhatsapp}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: '10px',
              background: '#25D366',
              border: 'none',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37,211,102,0.3)'
            }}
          >
            <i className="fa-brands fa-whatsapp" style={{ fontSize: '20px' }}></i>
            Pesan ke {selectedOutlet?.name || 'Outlet'}
          </button>
        </div>
      </div>
    </div>
  );
}
