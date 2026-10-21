import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../services/supabase';
import { processImageFile } from '../../utils/image';
import { sendCsStatusNotification, sendAdminCsAlert } from '../../services/waha';

export const CS_CATEGORIES = [
  { id: 'complaint', label: 'Komplain / Pengaduan Produk', icon: 'fa-solid fa-triangle-exclamation', desc: 'Rasa, kemasan, atau pelayanan' },
  { id: 'stock', label: 'Tanya Ketersediaan Stok', icon: 'fa-solid fa-boxes-stacked', desc: 'Cek varian rasa di outlet' },
  { id: 'catering', label: 'Pesanan Katering / Acara', icon: 'fa-solid fa-utensils', desc: 'Pemesanan jumlah banyak' },
  { id: 'promo', label: 'Klaim Promo & Flyer', icon: 'fa-solid fa-tags', desc: 'Diskon & voucher Amanda' },
  { id: 'partnership', label: 'Kerjasama / Reseller B2B', icon: 'fa-solid fa-handshake', desc: 'Kemitraan bisnis & event' },
  { id: 'other', label: 'Pertanyaan Lainnya', icon: 'fa-solid fa-comment-dots', desc: 'Informasi umum seputar Amanda' }
];

const RATING_LABELS = {
  5: '⭐⭐⭐⭐⭐ (5/5) Sangat Puas & Memuaskan',
  4: '⭐⭐⭐⭐ (4/5) Puas & Pelayanan Baik',
  3: '⭐⭐⭐ (3/5) Cukup Memadai',
  2: '⭐⭐ (2/5) Kurang Memuaskan',
  1: '⭐ (1/5) Sangat Kecewa / Perlu Perbaikan'
};

export default function CustomerServiceModal({ isOpen, onClose }) {
  const { outlets, showToast, addCsInquiry } = useData();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    selectedLocationId: '',
    category: 'complaint',
    receipt_number: '',
    message: '',
    rating: 5
  });

  // Images state (max 3)
  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Status submission & success modal
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);

  // Prepare combined outlets & booths dropdown list
  const locationOptions = useMemo(() => {
    const list = [];
    (outlets || []).forEach((outlet) => {
      // 1. Outlet utama
      list.push({
        id: outlet.id,
        outlet_id: outlet.id,
        outlet_name: outlet.name,
        name: outlet.name,
        label: `🏬 Outlet: ${outlet.name}`,
        type: 'outlet',
        city: outlet.city
      });

      // 2. Booths di bawah outlet ini
      if (Array.isArray(outlet.booths) && outlet.booths.length > 0) {
        outlet.booths.forEach((booth) => {
          list.push({
            id: booth.id,
            outlet_id: outlet.id,
            outlet_name: `${outlet.name} - ${booth.name}`,
            name: booth.name,
            label: `  ↳ 📍 Booth: ${booth.name}`,
            type: 'booth',
            city: outlet.city
          });
        });
      }
    });
    return list;
  }, [outlets]);

  // Initial selection
  const activeLocationId = formData.selectedLocationId || locationOptions[0]?.id || '';

  if (!isOpen) return null;

  // Handle image upload & compression (max 3)
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 3) {
      showToast('Maksimal lampiran bukti foto adalah 3 foto.', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const processedPromises = files.map(file => processImageFile(file, 960, 0.82));
      const base64List = await Promise.all(processedPromises);
      setImages(prev => [...prev, ...base64List].slice(0, 3));
      showToast(`${files.length} foto bukti struk berhasil dilampirkan.`, 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Gagal memproses gambar struk.', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // reset input
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Silakan isi Nama Lengkap Anda.', 'error');
      return;
    }

    if (!formData.phone.trim() || formData.phone.trim().length < 9) {
      showToast('Silakan isi nomor WhatsApp aktif Anda dengan benar.', 'error');
      return;
    }

    if (!formData.message.trim() || formData.message.trim().length < 8) {
      showToast('Silakan sampaikan pesan/uraian pengaduan minimal 8 karakter.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const selectedLoc = locationOptions.find(l => l.id === activeLocationId) || locationOptions[0];
      const ticketId = 'CS-' + Math.floor(100000 + Math.random() * 900000);

      const payload = {
        id: ticketId,
        name: formData.name.trim(),
        phone: formData.phone.trim().replace(/^0/, '62'),
        outlet_id: selectedLoc ? selectedLoc.outlet_id : (outlets[0]?.id || 'out-1'),
        outlet_name: selectedLoc ? selectedLoc.outlet_name : 'Amanda Brownies Balikpapan',
        category: formData.category,
        receipt_number: formData.receipt_number ? formData.receipt_number.trim() : null,
        receipt_images: images,
        receipt_image: images[0] || null, // fallback
        message: formData.message.trim(),
        rating: Number(formData.rating) || 5,
        status: 'NEW',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('cs_inquiries').insert([payload]);

      if (error) {
        console.error('Supabase CS submit error:', error);
        showToast('Gagal mengirim pengaduan: ' + error.message, 'error');
      } else {
        // 1. Update in-app state & broadcast live notification to Admin page immediately
        if (addCsInquiry) {
          addCsInquiry(payload);
        }

        // 2. Trigger WAHA notification to Customer (auto-reply)
        try {
          sendCsStatusNotification(payload, 'NEW');
        } catch (wahaErr) {
          console.warn('WAHA customer notify skipped:', wahaErr);
        }

        // 3. Trigger WAHA notification to Admin WA (double notification)
        try {
          sendAdminCsAlert(payload);
        } catch (adminWaErr) {
          console.warn('WAHA admin alert skipped:', adminWaErr);
        }

        setSubmittedTicket(payload);
        showToast('Pesan & pengaduan Anda berhasil diterima!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi gangguan jaringan saat mengirim data.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedTicket(null);
    setImages([]);
    setFormData({
      name: '',
      phone: '',
      selectedLocationId: '',
      category: 'complaint',
      receipt_number: '',
      message: '',
      rating: 5
    });
    onClose();
  };

  return (
    <div className="cs-modal-backdrop active" onClick={handleResetAndClose}>
      <div className="cs-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* ================= SUCCESS STATE ================= */}
        {submittedTicket ? (
          <div className="cs-success-card">
            <div className="cs-success-icon-wrap">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="cs-success-title font-serif">Laporan Berhasil Terkirim!</h2>
            <p className="cs-success-desc">
              Terima kasih <strong>Kak {submittedTicket.name}</strong>. Tim Customer Service Amanda Brownies telah menerima laporan Anda secara realtime dan akan segera menindaklanjuti.
            </p>

            <div className="cs-ticket-badge-box">
              <span className="lbl">Nomor Tiket Resmi Pelanggan:</span>
              <div className="ticket-code-row">
                <strong className="code">#{submittedTicket.id}</strong>
                <button
                  type="button"
                  className="btn-copy-ticket"
                  onClick={() => {
                    navigator.clipboard.writeText(`#${submittedTicket.id}`);
                    showToast('Nomor tiket berhasil disalin ke clipboard!', 'success');
                  }}
                  title="Salin Nomor Tiket"
                >
                  <i className="fa-solid fa-copy"></i> Salin
                </button>
              </div>
            </div>

            <div className="cs-ticket-summary-list">
              <div className="item">
                <span>Cabang/Titik:</span>
                <strong>{submittedTicket.outlet_name}</strong>
              </div>
              <div className="item">
                <span>Kategori:</span>
                <span className="cat-badge">
                  {CS_CATEGORIES.find(c => c.id === submittedTicket.category)?.label || submittedTicket.category}
                </span>
              </div>
              <div className="item">
                <span>Kontak WhatsApp:</span>
                <strong>+{submittedTicket.phone}</strong>
              </div>
              {submittedTicket.receipt_number && (
                <div className="item">
                  <span>No. Struk Kasir:</span>
                  <strong>#{submittedTicket.receipt_number}</strong>
                </div>
              )}
              {images.length > 0 && (
                <div className="item">
                  <span>Lampiran Foto:</span>
                  <strong>{images.length} Berkas Struk Terlampir</strong>
                </div>
              )}
            </div>

            <div className="cs-success-actions">
              <button type="button" className="btn-cs-primary" onClick={handleResetAndClose}>
                <i className="fa-solid fa-check"></i> Selesai & Tutup
              </button>
            </div>
          </div>
        ) : (
          /* ================= FORM STATE ================= */
          <div className="cs-modal-content">
            {/* Modal Header */}
            <div className="cs-modal-header">
              <div className="cs-modal-brand">
                <div className="cs-icon-header">
                  <i className="fa-solid fa-headset"></i>
                </div>
                <div>
                  <h3 className="cs-modal-title font-serif">Pusat Layanan Pelanggan & Pengaduan</h3>
                  <span className="cs-modal-subtitle">
                    Official Amanda Brownies Kalimantan • Cepat, Transparan, & Ditangani Langsung
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="cs-modal-close-btn"
                onClick={handleResetAndClose}
                aria-label="Tutup Formulir"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="cs-modal-body">
              {/* Row 1: Nama & WhatsApp */}
              <div className="cs-form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="cs-input-name">
                    Nama Lengkap Anda <span className="req">*</span>
                  </label>
                  <div className="cs-input-icon-wrap">
                    <i className="fa-solid fa-user"></i>
                    <input
                      id="cs-input-name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Ibu Rina Marlina"
                      className="cs-form-input"
                    />
                  </div>
                </div>

                <div className="cs-form-group">
                  <label htmlFor="cs-input-phone">
                    Nomor WhatsApp Aktif <span className="req">*</span>
                  </label>
                  <div className="cs-input-icon-wrap">
                    <i className="fa-brands fa-whatsapp" style={{ color: '#25D366' }}></i>
                    <input
                      id="cs-input-phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Contoh: 081234567890"
                      className="cs-form-input"
                    />
                  </div>
                  <span className="cs-field-hint">Untuk pengiriman tanggapan & solusi resmi dari CS</span>
                </div>
              </div>

              {/* Row 2: Cabang Outlet / Titik Booth & Kategori */}
              <div className="cs-form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="cs-select-outlet">
                    Lokasi Cabang Outlet / Titik Booth <span className="req">*</span>
                  </label>
                  <div className="cs-input-icon-wrap">
                    <i className="fa-solid fa-store"></i>
                    <select
                      id="cs-select-outlet"
                      value={activeLocationId}
                      onChange={(e) => setFormData({ ...formData, selectedLocationId: e.target.value })}
                      className="cs-form-input cs-select-styled"
                      required
                    >
                      {locationOptions.length === 0 ? (
                        <option value="">Memuat cabang resmi...</option>
                      ) : (
                        locationOptions.map((opt) => (
                          <option
                            key={opt.id}
                            value={opt.id}
                            style={{
                              fontWeight: opt.type === 'outlet' ? '700' : '400',
                              padding: '6px 10px',
                              background: opt.type === 'outlet' ? '#f5efe3' : '#ffffff'
                            }}
                          >
                            {opt.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <span className="cs-field-hint">Pilih lokasi tempat Anda membeli atau memesan</span>
                </div>

                <div className="cs-form-group">
                  <label htmlFor="cs-input-receipt">
                    Nomor Struk Kasir <span className="opt">(Opsional tapi disarankan)</span>
                  </label>
                  <div className="cs-input-icon-wrap">
                    <i className="fa-solid fa-receipt"></i>
                    <input
                      id="cs-input-receipt"
                      type="text"
                      value={formData.receipt_number}
                      onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                      placeholder="Contoh: STR-2026-0921"
                      className="cs-form-input"
                    />
                  </div>
                  <span className="cs-field-hint">Nomor transaksi yang tercetak pada nota pembelian</span>
                </div>
              </div>

              {/* Category Selector Chips */}
              <div className="cs-form-group">
                <label>
                  Kategori Layanan / Topik Masukan <span className="req">*</span>
                </label>
                <div className="cs-category-chips-grid">
                  {CS_CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      className={`cs-category-card ${formData.category === cat.id ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                    >
                      <div className="cat-icon-circle">
                        <i className={cat.icon}></i>
                      </div>
                      <div className="cat-text">
                        <span className="cat-label">{cat.label}</span>
                        <span className="cat-desc">{cat.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Rating Picker */}
              <div className="cs-form-group">
                <label>
                  Penilaian Kepuasan Pelayanan <span className="opt">(Klik bintang)</span>
                </label>
                <div className="cs-rating-box">
                  <div className="cs-stars-row" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= (hoverRating || formData.rating);
                      return (
                        <button
                          type="button"
                          key={star}
                          className={`cs-star-btn ${isFilled ? 'filled' : ''}`}
                          onMouseEnter={() => setHoverRating(star)}
                          onClick={() => setFormData({ ...formData, rating: star })}
                          aria-label={`Beri nilai ${star} bintang`}
                        >
                          <i className="fa-solid fa-star"></i>
                        </button>
                      );
                    })}
                  </div>
                  <span className="cs-rating-text">
                    {RATING_LABELS[hoverRating || formData.rating]}
                  </span>
                </div>
              </div>

              {/* Message Textarea */}
              <div className="cs-form-group">
                <label htmlFor="cs-textarea-message">
                  Uraian Masukan, Pengaduan, atau Pertanyaan <span className="req">*</span>
                </label>
                <textarea
                  id="cs-textarea-message"
                  required
                  rows="4"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Ceritakan kendala produk, pesanan, atau masukan Anda dengan jelas agar dapat segera kami tangani..."
                  className="cs-form-input cs-textarea"
                ></textarea>
                <div className="cs-char-counter">
                  <span>{formData.message.length} karakter</span>
                </div>
              </div>

              {/* Upload Bukti Struk (Max 3 Images) */}
              <div className="cs-form-group">
                <label>
                  Lampiran Foto Struk / Bukti Produk <span className="opt">(Maksimal 3 Foto)</span>
                </label>

                {/* Previews Grid */}
                <div className="cs-image-upload-container">
                  {images.map((imgSrc, idx) => (
                    <div key={idx} className="cs-image-preview-card">
                      <img src={imgSrc} alt={`Bukti Foto ${idx + 1}`} className="preview-img" />
                      <span className="preview-badge">Foto {idx + 1}</span>
                      <button
                        type="button"
                        className="btn-remove-photo"
                        onClick={() => handleRemoveImage(idx)}
                        title="Hapus foto ini"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))}

                  {/* Add more button if < 3 */}
                  {images.length < 3 && (
                    <label className={`cs-upload-dropzone ${uploadingImage ? 'is-loading' : ''}`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        style={{ display: 'none' }}
                      />
                      {uploadingImage ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin upload-icon"></i>
                          <span className="upload-title">Mengompres Foto...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-cloud-arrow-up upload-icon"></i>
                          <span className="upload-title">
                            {images.length === 0 ? 'Pilih / Ambil Foto Struk' : '+ Tambah Foto'}
                          </span>
                          <span className="upload-sub">Format JPG/PNG (Maks 3)</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                <span className="cs-field-hint">
                  <i className="fa-solid fa-shield-halved"></i> Foto dikompresi otomatis tanpa membebani kuota data Anda.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="cs-modal-footer">
                <button
                  type="button"
                  className="btn-cs-secondary"
                  onClick={handleResetAndClose}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-cs-primary"
                  disabled={submitting || uploadingImage}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      <span>Mengirimkan Laporan...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>Kirim ke Layanan Pelanggan Amanda</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
