import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import SectionSpinner from '../common/SectionSpinner';

export default function PromoFlyers({ onOpenFlyerModal }) {
  const { promos, promosLoading } = useData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipingOut, setIsSwipingOut] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState('left'); // 'left' | 'right'

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalDragRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const autoPlayTimerRef = useRef(null);

  // Auto-cycle deck every 6 seconds if user is idle
  useEffect(() => {
    if (!promos || promos.length <= 1 || isDragging || isSwipingOut) return;
    autoPlayTimerRef.current = setInterval(() => {
      handleNext('left');
    }, 6000);
    return () => clearInterval(autoPlayTimerRef.current);
  }, [promos, currentIndex, isDragging, isSwipingOut]);

  if (promosLoading && (!promos || promos.length === 0)) {
    return (
      <section className="promo-showcase-section" id="promo">
        <div className="container">
          <div className="section-head promo-section-head">
            <h2 className="font-serif">Promo Spesial Amanda</h2>
          </div>
          <SectionSpinner
            icon="fa-solid fa-tags"
            title="Memuat Promo Spesial..."
            subtitle="Mengambil promo dan flyer penawaran terbaru..."
            minHeight="240px"
          />
        </div>
      </section>
    );
  }

  if (!promos || promos.length === 0) return null;

  const N = promos.length;

  const handleNext = (dir = 'left') => {
    if (N <= 1 || isSwipingOut) return;
    setIsSwipingOut(true);
    setSwipeDirection(dir);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % N);
      setDragOffset(0);
      setIsSwipingOut(false);
    }, 320);
  };

  const handlePrev = (dir = 'right') => {
    if (N <= 1 || isSwipingOut) return;
    setIsSwipingOut(true);
    setSwipeDirection(dir);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + N) % N);
      setDragOffset(0);
      setIsSwipingOut(false);
    }, 320);
  };

  // Touch Swipe Handlers
  const onTouchStart = (e) => {
    if (N <= 1 || isSwipingOut) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    dragDistanceRef.current = 0;
    isHorizontalDragRef.current = false;
    setIsDragging(true);
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    if (!isHorizontalDragRef.current) {
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
        isHorizontalDragRef.current = true;
      } else if (Math.abs(diffY) > 12) {
        setIsDragging(false);
        return;
      }
    }

    if (isHorizontalDragRef.current) {
      setDragOffset(diffX * 0.85);
      dragDistanceRef.current = Math.abs(diffX);
    }
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragOffset) > 50) {
      handleNext(dragOffset < 0 ? 'left' : 'right');
    } else {
      setDragOffset(0);
    }
  };

  // Mouse Drag Handlers
  const onMouseDown = (e) => {
    if (N <= 1 || isSwipingOut) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    dragDistanceRef.current = 0;
    setIsDragging(true);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const diffX = e.clientX - startXRef.current;
    setDragOffset(diffX * 0.85);
    dragDistanceRef.current = Math.abs(diffX);
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragOffset) > 50) {
      handleNext(dragOffset < 0 ? 'left' : 'right');
    } else {
      setDragOffset(0);
    }
  };

  const onMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(0);
    }
  };

  // Card click: reveal flyer underneath if user just tapped without dragging
  const handleCardClick = (promo, isTop) => {
    if (dragDistanceRef.current > 8) return; // Ignore if user was dragging
    if (N > 1) {
      handleNext('left');
    } else {
      onOpenFlyerModal(promo);
    }
  };

  return (
    <section className="promo-showcase-section" id="promo">
      <div className="container">
        <div className="section-head promo-section-head">
          <h2 className="font-serif">Promo Spesial Amanda</h2>
        </div>

        {/* Card Stack / Deck Wrapper */}
        <div className="promo-deck-container">
          <div
            className={`promo-deck-stage ${isDragging ? 'is-dragging' : ''}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
          >
            {promos.map((promo, idx) => {
              const offset = (idx - currentIndex + N) % N;
              const isTop = offset === 0;
              const isNext = offset === 1;
              const isSecondNext = offset === 2;

              // Compute stacked 3D transform & style
              let cardStyle = {};

              if (N === 1) {
                // Single card: centered
                cardStyle = {
                  transform: 'none',
                  opacity: 1,
                  zIndex: 10,
                  cursor: 'pointer'
                };
              } else if (isTop) {
                // Top card
                if (isSwipingOut) {
                  const xDist = swipeDirection === 'left' ? '-125%' : '125%';
                  const rot = swipeDirection === 'left' ? '-16deg' : '16deg';
                  cardStyle = {
                    transform: `translate3d(${xDist}, 15px, 0) rotate(${rot}) scale(0.95)`,
                    opacity: 0,
                    zIndex: 10
                  };
                } else {
                  const rot = dragOffset * 0.045;
                  cardStyle = {
                    transform: `translate3d(${dragOffset}px, 0, 0) rotate(${rot}deg)`,
                    opacity: 1,
                    zIndex: 10,
                    cursor: isDragging ? 'grabbing' : 'pointer'
                  };
                }
              } else if (isNext) {
                // Card directly underneath
                if (isSwipingOut) {
                  cardStyle = {
                    transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
                    opacity: 1,
                    zIndex: 9
                  };
                } else {
                  cardStyle = {
                    transform: 'translate3d(0, 16px, -30px) scale(0.93) rotate(3deg)',
                    opacity: 0.9,
                    zIndex: 8,
                    filter: 'brightness(0.96)',
                    cursor: 'pointer'
                  };
                }
              } else if (isSecondNext) {
                // 3rd card in deck
                if (isSwipingOut) {
                  cardStyle = {
                    transform: 'translate3d(0, 16px, -30px) scale(0.93) rotate(3deg)',
                    opacity: 0.9,
                    zIndex: 8
                  };
                } else {
                  cardStyle = {
                    transform: 'translate3d(0, 30px, -60px) scale(0.86) rotate(-2.5deg)',
                    opacity: 0.72,
                    zIndex: 6,
                    filter: 'brightness(0.9)',
                    pointerEvents: 'none'
                  };
                }
              } else {
                // Hidden deep in the stack
                cardStyle = {
                  transform: 'translate3d(0, 42px, -90px) scale(0.8) rotate(0deg)',
                  opacity: 0,
                  zIndex: 4,
                  pointerEvents: 'none'
                };
              }

              return (
                <div
                  key={promo.id || idx}
                  className={`promo-deck-card ${isTop ? 'is-top' : ''} ${isSwipingOut && isTop ? 'is-swiping' : ''}`}
                  style={cardStyle}
                  onClick={() => handleCardClick(promo, isTop)}
                  title={isTop ? 'Ketuk atau swipe untuk flyer berikutnya' : 'Lihat promo ini'}
                >
                  <div className="promo-deck-media">
                    <img
                      src={promo.image}
                      alt={promo.title || 'Promo Amanda'}
                      className="promo-deck-img"
                      loading="lazy"
                    />

                  </div>
                </div>
              );
            })}
          </div>

          {/* Clean Pagination Dots */}
          {N > 1 && (
            <div className="promo-slider-pagination" style={{ marginTop: '24px' }}>
              {promos.map((_, idx) => (
                <button
                  key={idx}
                  className={`promo-slide-dot ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => {
                    if (idx !== currentIndex) {
                      handleNext(idx > currentIndex ? 'left' : 'right');
                    }
                  }}
                  aria-label={`Lihat Promo ${idx + 1}`}
                ></button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
