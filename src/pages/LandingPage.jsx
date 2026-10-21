import React, { useState } from 'react';
import Navbar from '../components/landing/Navbar';
import MobileDrawer from '../components/landing/MobileDrawer';
import PromoTicker from '../components/landing/PromoTicker';
import PromoFlyers from '../components/landing/PromoFlyers';
import PriceListSection from '../components/landing/PriceListSection';
import OutletLocator from '../components/landing/OutletLocator';
import ProductCatalog from '../components/landing/ProductCatalog';
import Footer from '../components/landing/Footer';
import SpeedDialWa from '../components/landing/SpeedDialWa';
import FlyerLightboxModal from '../components/landing/FlyerLightboxModal';
import DirectOrderModal from '../components/landing/DirectOrderModal';
import CustomerServiceModal from '../components/landing/CustomerServiceModal';
import Toast from '../components/landing/Toast';

export default function LandingPage({ onOpenAdmin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFlyerModal, setActiveFlyerModal] = useState(null);
  const [activeOrderProduct, setActiveOrderProduct] = useState(null);
  const [csModalOpen, setCsModalOpen] = useState(false);

  return (
    <div className="landing-page-root">
      {/* Toast Notification */}
      <Toast />

      {/* Navigation Header */}
      <Navbar
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onOpenAdmin={onOpenAdmin}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onOpenAdmin={onOpenAdmin}
      />

      {/* Running Marquee Ticker */}
      <PromoTicker />

      {/* Main Content Sections */}
      <main>
        {/* Primary Page Heading for SEO & Screen Readers */}
        <h1 className="sr-only">
          Amanda Brownies Kalimantan - Katalog Menu Lengkap, Promo & Ketersediaan Stok Outlet Resmi
        </h1>

        {/* Promo 4:5 Flyers Coverflow */}
        <PromoFlyers onOpenFlyerModal={(flyer) => setActiveFlyerModal(flyer)} />

        {/* Price List Showcase Posters */}
        <PriceListSection onOpenPriceListModal={(item) => setActiveFlyerModal(item)} />

        {/* 12 Outlets & Booths Network Locator */}
        <OutletLocator onOpenOutletModal={(outlet) => setActiveFlyerModal(outlet)} />

        {/* Product Catalog & Clean Image Lightbox Zoom */}
        <ProductCatalog onSelectProduct={(prod) => setActiveFlyerModal(prod)} />
      </main>

      {/* Footer */}
      <Footer onOpenCsModal={() => setCsModalOpen(true)} />

      {/* Floating Speed Dial WhatsApp */}
      <SpeedDialWa onOpenCsModal={() => setCsModalOpen(true)} />

      {/* Lightbox Zoom Modal */}
      {activeFlyerModal && (
        <FlyerLightboxModal
          item={activeFlyerModal}
          onClose={() => setActiveFlyerModal(null)}
        />
      )}

      {/* Direct Order Modal */}
      {activeOrderProduct && (
        <DirectOrderModal
          product={activeOrderProduct}
          onClose={() => setActiveOrderProduct(null)}
        />
      )}

      {/* Customer Service & Struk Modal */}
      <CustomerServiceModal
        isOpen={csModalOpen}
        onClose={() => setCsModalOpen(false)}
      />
    </div>
  );
}
