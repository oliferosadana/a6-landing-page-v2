import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchOutlets,
  fetchCategories,
  fetchProducts,
  fetchPromos,
  fetchPricelists,
  fetchTicker,
  fetchCsInquiries,
  pushToSupabase,
  supabase
} from '../services/supabase';
import { getCache, setCache } from '../utils/cache';

const DataContext = createContext(null);
const CACHE_KEY = 'amanda_site_cache_v2';

export function DataProvider({ children }) {
  const [outlets, setOutlets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [promos, setPromos] = useState([]);
  const [pricelists, setPricelists] = useState([]);
  const [ticker, setTicker] = useState([]);
  const [csInquiries, setCsInquiries] = useState([]);
  const [csLoading, setCsLoading] = useState(false);

  // Granular section loading states for progressive rendering
  const [loading, setLoading] = useState(true);
  const [outletsLoading, setOutletsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [promosLoading, setPromosLoading] = useState(true);
  const [pricelistsLoading, setPricelistsLoading] = useState(true);

  // UI Interactive States
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeZoomFlyer, setActiveZoomFlyer] = useState(null);
  const [activeOrderProduct, setActiveOrderProduct] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const refreshCsInquiries = useCallback(async () => {
    setCsLoading(true);
    try {
      const data = await fetchCsInquiries();
      if (Array.isArray(data)) {
        setCsInquiries(data);
        try {
          localStorage.setItem('amanda_cs_cache', JSON.stringify(data));
        } catch (e) {
          // Fallback if local storage quota exceeded: save metadata without heavy image strings
          const lightweight = data.map(d => ({
            ...d,
            receipt_image: d.receipt_image ? 'has_image' : null,
            receipt_images: (d.receipt_images || []).length > 0 ? ['has_image'] : []
          }));
          localStorage.setItem('amanda_cs_cache', JSON.stringify(lightweight));
        }
      }
      return data || [];
    } catch (err) {
      console.warn('Error refreshing CS inquiries:', err);
      return [];
    } finally {
      setCsLoading(false);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    // Concurrent progressive loading: each query resolves independently and updates UI immediately
    const pOutlets = fetchOutlets()
      .then((data) => {
        if (data && data.length > 0) {
          setOutlets(data);
        }
        setOutletsLoading(false);
        return data || [];
      })
      .catch((e) => {
        console.warn('Error fetching outlets:', e);
        setOutletsLoading(false);
        return [];
      });

    const pCategories = fetchCategories()
      .then((data) => {
        if (data && data.length > 0) {
          setCategories(data);
        }
        setCategoriesLoading(false);
        return data || [];
      })
      .catch((e) => {
        console.warn('Error fetching categories:', e);
        setCategoriesLoading(false);
        return [];
      });

    const pProducts = fetchProducts()
      .then((data) => {
        if (data && data.length > 0) {
          setProducts(data);
        }
        setProductsLoading(false);
        return data || [];
      })
      .catch((e) => {
        console.warn('Error fetching products:', e);
        setProductsLoading(false);
        return [];
      });

    const pPromos = fetchPromos()
      .then((data) => {
        if (data && data.length > 0) {
          setPromos(data);
        }
        setPromosLoading(false);
        return data || [];
      })
      .catch((e) => {
        console.warn('Error fetching promos:', e);
        setPromosLoading(false);
        return [];
      });

    const pPricelists = fetchPricelists()
      .then((data) => {
        if (data && data.length > 0) {
          setPricelists(data);
        }
        setPricelistsLoading(false);
        return data || [];
      })
      .catch((e) => {
        console.warn('Error fetching pricelists:', e);
        setPricelistsLoading(false);
        return [];
      });

    const pTicker = fetchTicker()
      .then((data) => {
        if (data && data.length > 0) {
          setTicker(data);
        }
        return data || [];
      })
      .catch((e) => {
        console.warn('Error fetching ticker:', e);
        return [];
      });

    // Trigger CS inquiries refresh independently in the background
    refreshCsInquiries();

    try {
      const [dbOutlets, dbCategories, dbProducts, dbPromos, dbPricelists, dbTicker] = await Promise.all([
        pOutlets,
        pCategories,
        pProducts,
        pPromos,
        pPricelists,
        pTicker
      ]);

      // If database returned 0 items (e.g. RLS blocking anon read), load defaults gracefully
      if (dbOutlets.length === 0 && dbProducts.length === 0) {
        console.warn('⚠️ Supabase returned 0 items (likely Row Level Security policy not set for anon). Using fallback data.');
        const defaults = await import('../data/defaults.js');
        setOutlets(prev => (prev.length > 0 ? prev : defaults.DEFAULT_OUTLETS));
        setCategories(prev => (prev.length > 0 ? prev : defaults.DEFAULT_OUTLET_CATEGORIES));
        setProducts(prev => (prev.length > 0 ? prev : defaults.DEFAULT_PRODUCTS));
        setPromos(prev => (prev.length > 0 ? prev : defaults.DEFAULT_PROMOS));
        setPricelists(prev => (prev.length > 0 ? prev : defaults.DEFAULT_PRICELISTS));
        setTicker(prev => (prev.length > 0 ? prev : defaults.DEFAULT_TICKER));
      } else if (dbOutlets.length > 0 || dbProducts.length > 0) {
        // Cache fresh data locally in IndexedDB for instant loads on subsequent visits
        setCache(CACHE_KEY, {
          outlets: dbOutlets,
          categories: dbCategories,
          products: dbProducts,
          promos: dbPromos,
          pricelists: dbPricelists,
          ticker: dbTicker,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error('Error in refreshAllData:', e);
    } finally {
      setLoading(false);
      setOutletsLoading(false);
      setCategoriesLoading(false);
      setProductsLoading(false);
      setPromosLoading(false);
      setPricelistsLoading(false);
    }
  }, [refreshCsInquiries]);

  useEffect(() => {
    let isMounted = true;

    // 1. Stale-While-Revalidate: Instant read from local IndexedDB cache & CS cache
    try {
      const cachedCs = localStorage.getItem('amanda_cs_cache');
      if (cachedCs) {
        const parsed = JSON.parse(cachedCs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCsInquiries(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading initial CS cache:', e);
    }

    getCache(CACHE_KEY).then(async (cached) => {
      if (!isMounted) return;
      if (cached && (cached.outlets?.length > 0 || cached.products?.length > 0)) {
        if (cached.outlets && cached.outlets.length > 0) {
          setOutlets(cached.outlets);
          setOutletsLoading(false);
        }
        if (cached.categories && cached.categories.length > 0) {
          setCategories(cached.categories);
          setCategoriesLoading(false);
        }
        if (cached.products && cached.products.length > 0) {
          setProducts(cached.products);
          setProductsLoading(false);
        }
        if (cached.promos && cached.promos.length > 0) {
          setPromos(cached.promos);
          setPromosLoading(false);
        }
        if (cached.pricelists && cached.pricelists.length > 0) {
          setPricelists(cached.pricelists);
          setPricelistsLoading(false);
        }
        if (cached.ticker && cached.ticker.length > 0) {
          setTicker(cached.ticker);
        }
        setLoading(false);
      } else {
        // First-time visit: load local default data immediately so page is never empty
        const defaults = await import('../data/defaults.js');
        if (isMounted) {
          setOutlets(prev => (prev.length > 0 ? prev : defaults.DEFAULT_OUTLETS));
          setCategories(prev => (prev.length > 0 ? prev : defaults.DEFAULT_OUTLET_CATEGORIES));
          setProducts(prev => (prev.length > 0 ? prev : defaults.DEFAULT_PRODUCTS));
          setPromos(prev => (prev.length > 0 ? prev : defaults.DEFAULT_PROMOS));
          setPricelists(prev => (prev.length > 0 ? prev : defaults.DEFAULT_PRICELISTS));
          setTicker(prev => (prev.length > 0 ? prev : defaults.DEFAULT_TICKER));
          setOutletsLoading(false);
          setCategoriesLoading(false);
          setProductsLoading(false);
          setPromosLoading(false);
          setPricelistsLoading(false);
          setLoading(false);
        }
      }
    });

    // 2. Refresh live data from Supabase in the background
    refreshAllData();

    // Supabase Realtime channel
    const channel = supabase
      .channel('public-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('⚡ [Realtime V2] Event received on table:', payload.table);
        if (payload.table === 'cs_inquiries') {
          if (payload.eventType === 'INSERT' || payload.new) {
            const ticket = payload.new;
            if (ticket && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('amanda_new_cs_ticket', { detail: ticket }));
            }
          }
          // Fast selective refresh for CS tickets only
          refreshCsInquiries();
        } else {
          refreshAllData();
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [refreshAllData, refreshCsInquiries]);

  // Outlets Actions
  const saveOutlet = async (outletData) => {
    const isEdit = outlets.some(o => o.id === outletData.id);
    let updated;
    if (isEdit) {
      updated = outlets.map(o => o.id === outletData.id ? { ...o, ...outletData } : o);
    } else {
      updated = [...outlets, outletData];
    }
    setOutlets(updated);
    showToast(`Outlet ${outletData.name} berhasil disimpan.`);
    await pushToSupabase('outlets', updated);
  };

  const removeOutlet = async (id) => {
    const target = outlets.find(o => o.id === id);
    const updated = outlets.filter(o => o.id !== id);
    setOutlets(updated);
    showToast(`Outlet ${target ? target.name : id} berhasil dihapus.`);
    await pushToSupabase('outlets', id, 'delete');
  };

  // Categories Actions
  const saveCategory = async (catData) => {
    const isEdit = categories.some(c => c.id === catData.id);
    let updated;
    if (isEdit) {
      updated = categories.map(c => c.id === catData.id ? { ...c, ...catData } : c);
    } else {
      updated = [...categories, catData];
    }
    updated.sort((a, b) => (a.sortOrder || 1) - (b.sortOrder || 1));
    setCategories(updated);
    showToast(`Wilayah ${catData.name} berhasil disimpan.`);
    await pushToSupabase('outlet_categories', updated);
  };

  const removeCategory = async (id) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    showToast(`Wilayah berhasil dihapus.`);
    await pushToSupabase('outlet_categories', id, 'delete');
  };

  // Products Actions
  const saveProduct = async (prodData) => {
    const isEdit = products.some(p => p.id === prodData.id);
    let updated;
    if (isEdit) {
      updated = products.map(p => p.id === prodData.id ? { ...p, ...prodData } : p);
    } else {
      updated = [...products, prodData];
    }
    setProducts(updated);
    showToast(`Produk ${prodData.name} berhasil diperbarui.`);
    await pushToSupabase('products', updated);
  };

  const removeProduct = async (id) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    showToast(`Produk berhasil dihapus.`);
    await pushToSupabase('products', id, 'delete');
  };

  // Bulk Outlet Importer
  const bulkSaveOutlets = async (newOutlets, mode = 'append') => {
    let updated;
    if (mode === 'replace') {
      updated = newOutlets;
    } else {
      const existingIds = new Set(outlets.map(o => o.id));
      const filteredNew = newOutlets.filter(o => !existingIds.has(o.id));
      updated = [...outlets, ...filteredNew];
    }
    setOutlets(updated);
    showToast(`${newOutlets.length} cabang outlet berhasil diimpor.`);
    await pushToSupabase('outlets', updated);
  };

  // CS Actions
  const updateCsStatus = async (id, newStatus, adminNotes) => {
    let targetNotes = adminNotes;
    const updated = csInquiries.map(c => {
      if (c.id === id) {
        if (adminNotes === undefined) targetNotes = c.admin_notes;
        return { ...c, status: newStatus, admin_notes: targetNotes };
      }
      return c;
    });
    setCsInquiries(updated);
    try {
      localStorage.setItem('amanda_cs_cache', JSON.stringify(updated));
    } catch (e) {}
    showToast(`Status tiket #${id} berhasil diperbarui.`);
    const updatePayload = { id, status: newStatus };
    if (targetNotes !== undefined) {
      updatePayload.admin_notes = targetNotes;
    }
    await pushToSupabase('cs_inquiries', updatePayload, 'update');
  };

  const addCsInquiry = useCallback((ticket) => {
    setCsInquiries((prev) => {
      const updated = [ticket, ...prev.filter(c => c.id !== ticket.id)];
      try {
        localStorage.setItem('amanda_cs_cache', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('amanda_new_cs_ticket', { detail: ticket }));

        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('amanda_cs_channel');
          bc.postMessage({ type: 'NEW_TICKET', ticket });
          bc.close();
        }

        localStorage.setItem('amanda_latest_cs_ticket', JSON.stringify({
          ticket,
          time: Date.now()
        }));
      }
    } catch (e) {
      console.warn('Alert broadcast skipped:', e);
    }
  }, []);

  const deleteCsInquiry = async (id) => {
    const updated = csInquiries.filter(c => c.id !== id);
    setCsInquiries(updated);
    try {
      localStorage.setItem('amanda_cs_cache', JSON.stringify(updated));
    } catch (e) {}
    showToast(`Tiket #${id} berhasil dihapus.`);
    await pushToSupabase('cs_inquiries', id, 'delete');
  };

  // Reset to Defaults
  const resetToDefaults = async () => {
    setLoading(true);
    try {
      const defaults = await import('../data/defaults.js');
      setOutlets(defaults.DEFAULT_OUTLETS);
      setCategories(defaults.DEFAULT_OUTLET_CATEGORIES);
      setProducts(defaults.DEFAULT_PRODUCTS);
      setPromos(defaults.DEFAULT_PROMOS);
      setPricelists(defaults.DEFAULT_PRICELISTS);
      setTicker(defaults.DEFAULT_TICKER);
      await Promise.all([
        pushToSupabase('outlets', defaults.DEFAULT_OUTLETS),
        pushToSupabase('outlet_categories', defaults.DEFAULT_OUTLET_CATEGORIES),
        pushToSupabase('products', defaults.DEFAULT_PRODUCTS),
        pushToSupabase('promos', defaults.DEFAULT_PROMOS),
        pushToSupabase('pricelists', defaults.DEFAULT_PRICELISTS),
        pushToSupabase('ticker', defaults.DEFAULT_TICKER)
      ]);
      showToast('Semua data berhasil direset ke konfigurasi awal.');
    } catch (err) {
      console.error('Error resetting to defaults:', err);
      showToast('Gagal mereset data ke default.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Import Backup Data
  const importBackupData = async (backupData) => {
    if (backupData.outlets) {
      setOutlets(backupData.outlets);
      await pushToSupabase('outlets', backupData.outlets);
    }
    if (backupData.categories) {
      setCategories(backupData.categories);
      await pushToSupabase('outlet_categories', backupData.categories);
    }
    if (backupData.products) {
      setProducts(backupData.products);
      await pushToSupabase('products', backupData.products);
    }
    if (backupData.promos) {
      setPromos(backupData.promos);
      await pushToSupabase('promos', backupData.promos);
    }
    if (backupData.pricelists) {
      setPricelists(backupData.pricelists);
      await pushToSupabase('pricelists', backupData.pricelists);
    }
    if (backupData.ticker) {
      setTicker(backupData.ticker);
      await pushToSupabase('ticker', backupData.ticker);
    }
    showToast('Data cadangan berhasil dipulihkan.');
  };

  return (
    <DataContext.Provider
      value={{
        outlets,
        categories,
        products,
        promos,
        pricelists,
        ticker,
        csInquiries,
        csLoading,
        loading,
        outletsLoading,
        categoriesLoading,
        productsLoading,
        promosLoading,
        pricelistsLoading,
        selectedCity,
        setSelectedCity,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        activeZoomFlyer,
        setActiveZoomFlyer,
        activeOrderProduct,
        setActiveOrderProduct,
        toast,
        showToast,
        refreshAllData,
        refreshCsInquiries,
        saveOutlet,
        removeOutlet,
        saveCategory,
        removeCategory,
        saveProduct,
        removeProduct,
        bulkSaveOutlets,
        updateCsStatus,
        addCsInquiry,
        deleteCsInquiry,
        resetToDefaults,
        importBackupData
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
