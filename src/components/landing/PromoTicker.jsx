import React from 'react';
import { useData } from '../../context/DataContext';

export default function PromoTicker() {
  const { ticker } = useData();

  if (!ticker || ticker.length === 0) return null;

  return (
    <div className="promo-ticker-wrapper" id="promo-ticker">
      <div className="promo-ticker-badge">
        <i className="fa-solid fa-bolt"></i>
        <span>PROMO</span>
      </div>
      <div className="promo-ticker-track-container">
        <div className="promo-ticker-track">
          {/* Sequence 1 */}
          {ticker.map((item, idx) => (
            <React.Fragment key={`seq1-${item.id || idx}`}>
              <span className="ticker-item">
                <i className={item.icon || 'fa-solid fa-tag'}></i>{' '}
                <strong>{item.title}:</strong> {item.text}
              </span>
              <span className="ticker-dot">•</span>
            </React.Fragment>
          ))}

          {/* Sequence 2 for seamless infinite marquee loop */}
          {ticker.map((item, idx) => (
            <React.Fragment key={`seq2-${item.id || idx}`}>
              <span className="ticker-item">
                <i className={item.icon || 'fa-solid fa-tag'}></i>{' '}
                <strong>{item.title}:</strong> {item.text}
              </span>
              <span className="ticker-dot">•</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
