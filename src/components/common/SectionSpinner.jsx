import React from 'react';

/**
 * Reusable Section Spinner Component for Amanda Brownies
 * Displays a branded luxury spinner with smooth animations and customizable labels.
 */
export default function SectionSpinner({
  title = 'Memuat data...',
  subtitle = 'Mohon tunggu sebentar...',
  icon = 'fa-solid fa-cake-candles',
  minHeight = '260px'
}) {
  return (
    <div className="section-loading-container" style={{ minHeight }}>
      <div className="section-loading-box">
        <div className="amanda-spinner-dual-ring">
          <div className="spinner-core-icon">
            <i className={icon}></i>
          </div>
        </div>
        <div className="section-loading-text">
          <h4 className="section-loading-title font-serif">{title}</h4>
          {subtitle && <p className="section-loading-subtitle">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
