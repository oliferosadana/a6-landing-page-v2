import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.SUPABASE_URL))
  || 'https://fywzoiqmlxwbnkvordxu.supabase.co';

export const SUPABASE_KEY =
  (typeof import.meta !== 'undefined' && (
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env?.SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env?.SUPABASE_ANON_KEY
  ))
  || 'sb_publishable_w8ai_EoixB5KG9jQiXo2Qg_MhbD-56d';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

/**
 * Fetch all outlets directly from Supabase PostgreSQL
 */
export async function fetchOutlets() {
  try {
    const { data, error } = await supabase
      .from('outlets')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn('Supabase fetch outlets error:', error.message);
      return [];
    }

    return data.map(o => ({
      id: o.id,
      name: o.name,
      city: o.city || 'Balikpapan',
      region: o.region || (o.city ? ('Kota ' + o.city) : 'Kota Balikpapan'),
      image: o.image || '/assets/outlet_mt_haryono.jpg',
      address: o.address || '',
      phone: o.phone || '',
      wa: o.wa || '',
      hours: o.hours || '07.00 - 22.00 WITA',
      mapsUrl: o.maps_url || o.mapsUrl || '',
      grabUrl: o.grab_url || o.grabUrl || '',
      gofoodUrl: o.gofood_url || o.gofoodUrl || '',
      shopeefoodUrl: o.shopeefood_url || o.shopeefoodUrl || '',
      distance: o.distance || '1.0 km',
      booths: Array.isArray(o.booths) ? o.booths : (typeof o.booths === 'string' ? JSON.parse(o.booths) : [])
    }));
  } catch (err) {
    console.error('Exception fetching outlets:', err);
    return [];
  }
}

/**
 * Fetch all outlet categories (Wilayah) directly from Supabase
 */
export async function fetchCategories() {
  try {
    const { data, error } = await supabase
      .from('outlet_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn('Supabase fetch categories error:', error.message);
      return [];
    }

    return data.map((c, idx) => ({
      id: c.id,
      slug: c.slug || c.id,
      name: c.name,
      region: c.region || ('Kota ' + c.name),
      icon: c.icon || 'fa-solid fa-location-dot',
      badgeColor: c.badge_color || c.badgeColor || 'olive',
      description: c.description || '',
      status: c.status || 'active',
      sortOrder: Number(c.sort_order || c.sortOrder) || (idx + 1)
    }));
  } catch (err) {
    console.error('Exception fetching categories:', err);
    return [];
  }
}

/**
 * Fetch all products directly from Supabase
 */
export async function fetchProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn('Supabase fetch products error:', error.message);
      return [];
    }

    return data.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      categoryLabel: p.category_label || (p.category === 'kukus' ? 'Brownies Kukus' : (p.category === 'bakar' ? 'Brownies Bakar' : 'Premium & Marble')),
      price: Number(p.price) || 0,
      description: p.description || '',
      image: p.image || '/assets/brownies_cheese_cream_1790255567593.jpg',
      badge: p.badge || '',
      badgeColor: p.badge_color || (p.category === 'bakar' ? 'bakar' : (p.category === 'marble' ? 'coffee' : 'gold')),
      weight: p.weight || '700 gram',
      shelfLife: p.shelf_life || p.shelfLife || '4 Hari (Suhu Ruang)',
      outlets: Array.isArray(p.stocks) ? p.stocks : (Array.isArray(p.outlets) ? p.outlets : [])
    }));
  } catch (err) {
    console.error('Exception fetching products:', err);
    return [];
  }
}

/**
 * Fetch promos directly from Supabase
 */
export async function fetchPromos() {
  try {
    const { data, error } = await supabase
      .from('promos')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(pr => ({
      id: pr.id,
      title: pr.title,
      badge: pr.badge || 'PROMO RESMI',
      badgeColor: pr.badge_color || pr.badgeColor || 'gold',
      image: pr.image || '/assets/promo_flyer_1.jpg',
      period: pr.period,
      description: pr.description || '',
      waMessage: pr.wa_msg || pr.waMessage || '',
      aspectRatio: '4/5',
      active: true
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Fetch price lists directly from Supabase
 */
export async function fetchPricelists() {
  try {
    const { data, error } = await supabase
      .from('pricelists')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(pr => ({
      id: pr.id,
      title: pr.title,
      badge: pr.badge || 'Price List',
      image: pr.image || '/assets/amanda_pricelist_poster.jpg',
      caption: pr.caption || ''
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Fetch announcement ticker directly from Supabase
 */
export async function fetchTicker() {
  try {
    const { data, error } = await supabase
      .from('ticker')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(t => ({
      id: t.id,
      title: t.title,
      text: t.text,
      icon: t.icon || 'fa-solid fa-bullhorn'
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Fetch CS inquiries directly from Supabase
 */
export async function fetchCsInquiries() {
  try {
    const { data, error } = await supabase
      .from('cs_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch cs_inquiries error:', error.message);
      return [];
    }
    if (!data) return [];
    return data.map(cs => {
      let parsedImages = [];
      if (Array.isArray(cs.receipt_images) && cs.receipt_images.length > 0) {
        parsedImages = cs.receipt_images;
      } else if (typeof cs.receipt_images === 'string' && cs.receipt_images.startsWith('[')) {
        try { parsedImages = JSON.parse(cs.receipt_images); } catch(e) {}
      }
      if (parsedImages.length === 0 && cs.receipt_image) {
        parsedImages = [cs.receipt_image];
      }

      return {
        id: cs.id,
        name: cs.name,
        phone: cs.phone,
        outlet_id: cs.outlet_id,
        outlet_name: cs.outlet_name,
        category: cs.category,
        receipt_number: cs.receipt_number || '',
        receipt_image: cs.receipt_image || (parsedImages[0] || null),
        receipt_images: parsedImages,
        message: cs.message,
        rating: Number(cs.rating) || 5,
        status: cs.status || 'NEW',
        admin_notes: cs.admin_notes || null,
        created_at: cs.created_at
      };
    });
  } catch (err) {
    console.error('Exception fetching cs_inquiries:', err);
    return [];
  }
}

/**
 * Push data changes to Supabase table
 */
export async function pushToSupabase(tableName, payload, operation = 'upsert') {
  try {
    if (operation === 'delete') {
      const deleteId = typeof payload === 'object' ? payload.id : payload;
      const { data, error } = await supabase.from(tableName).delete().eq('id', deleteId);
      if (error) console.warn(`Supabase delete [${tableName}] error:`, error.message);
      return { success: !error, data };
    }

    if (operation === 'update') {
      const updateObj = typeof payload === 'object' && !Array.isArray(payload) ? payload : (Array.isArray(payload) ? payload[0] : {});
      const targetId = updateObj.id;
      const { id, ...fieldsToUpdate } = updateObj;
      const { data, error } = await supabase.from(tableName).update(fieldsToUpdate).eq('id', targetId);
      if (error) console.warn(`Supabase update [${tableName}] error:`, error.message);
      return { success: !error, data };
    }

    let dbPayload = payload;

    if (tableName === 'outlets') {
      const list = Array.isArray(payload) ? payload : [payload];
      dbPayload = list.map(o => ({
        id: o.id || ('out-bpn-' + Date.now()),
        name: o.name || 'Cabang Amanda',
        city: o.city || 'Balikpapan',
        region: o.region || (o.city ? ('Kota ' + o.city) : 'Kota Balikpapan'),
        image: o.image || '/assets/outlet_mt_haryono.jpg',
        address: o.address || '',
        phone: o.phone || '',
        wa: (o.wa ? String(o.wa).replace(/[^0-9]/g, '') : '6281241075981'),
        hours: o.hours || '07.00 - 22.00 WITA',
        maps_url: o.mapsUrl || o.maps_url || '',
        grab_url: o.grabUrl || o.grab_url || '',
        gofood_url: o.gofoodUrl || o.gofood_url || '',
        shopeefood_url: o.shopeefoodUrl || o.shopeefood_url || '',
        distance: o.distance || '1.0 km',
        booths: Array.isArray(o.booths) ? o.booths : []
      }));
    } else if (tableName === 'products') {
      const list = Array.isArray(payload) ? payload : [payload];
      dbPayload = list.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: Number(p.price) || 0,
        description: p.description || '',
        image: p.image,
        badge: p.badge || '',
        stocks: p.outlets || p.stocks || []
      }));
    } else if (tableName === 'outlet_categories') {
      const list = Array.isArray(payload) ? payload : [payload];
      dbPayload = list.map((c, idx) => ({
        id: c.id || ('cat-' + Date.now() + '-' + idx),
        slug: c.slug || c.id || ('cat-' + idx),
        name: c.name,
        region: c.region || ('Kota ' + c.name),
        icon: c.icon || 'fa-solid fa-location-dot',
        badge_color: c.badgeColor || c.badge_color || 'olive',
        description: c.description || '',
        status: c.status || 'active',
        sort_order: Number(c.sortOrder || c.sort_order) || (idx + 1)
      }));
    } else if (tableName === 'promos') {
      const list = Array.isArray(payload) ? payload : [payload];
      dbPayload = list.map(pr => ({
        id: pr.id,
        title: pr.title,
        badge: pr.badge,
        badge_color: pr.badgeColor || pr.badge_color || 'gold',
        image: pr.image,
        period: pr.period,
        description: pr.description || '',
        wa_msg: pr.waMessage || pr.wa_msg || ''
      }));
    } else if (tableName === 'pricelists') {
      const list = Array.isArray(payload) ? payload : [payload];
      dbPayload = list.map(pr => ({
        id: pr.id,
        title: pr.title,
        badge: pr.badge || 'Price List',
        image: pr.image,
        caption: pr.caption || '',
        created_at: pr.created_at || new Date().toISOString()
      }));
    } else if (tableName === 'ticker') {
      const list = Array.isArray(payload) ? payload : [payload];
      dbPayload = list.map((t, idx) => ({
        id: t.id || ('tick-' + (idx + 1)),
        title: t.title,
        text: t.text,
        icon: t.icon || 'fa-solid fa-bullhorn'
      }));
    } else if (tableName === 'cs_inquiries') {
      const list = Array.isArray(payload) ? payload : [payload];
      dbPayload = list.map(cs => ({
        id: cs.id,
        name: cs.name,
        phone: cs.phone,
        outlet_id: cs.outlet_id || cs.outletId,
        outlet_name: cs.outlet_name || cs.outletName,
        category: cs.category,
        receipt_number: cs.receipt_number || cs.receiptNumber || '',
        receipt_image: cs.receipt_image || cs.receiptImage || null,
        receipt_images: Array.isArray(cs.receipt_images) ? cs.receipt_images : [],
        message: cs.message,
        rating: Number(cs.rating) || 5,
        status: cs.status || 'NEW',
        admin_notes: cs.admin_notes || cs.adminNotes || null,
        created_at: cs.created_at || new Date().toISOString()
      }));
    } else if (tableName === 'waha_config') {
      const c = Array.isArray(payload) ? payload[0] : payload;
      dbPayload = [{
        id: c.id || 'default',
        server_url: c.serverUrl || c.server_url || 'http://143.198.219.167:3000',
        api_key: c.apiKey || c.api_key || '',
        session_name: c.sessionName || c.session_name || 'default',
        admin_phone: c.adminPhone || c.admin_phone || '6281241075981',
        auto_notify_admin_new: c.autoNotifyAdminNew !== undefined ? c.autoNotifyAdminNew : (c.auto_notify_admin_new ?? true),
        auto_notify_cs_new: c.autoNotifyCsNew !== undefined ? c.autoNotifyCsNew : (c.auto_notify_cs_new ?? false),
        auto_notify_cs_progress: c.autoNotifyCsProgress !== undefined ? c.autoNotifyCsProgress : (c.auto_notify_cs_progress ?? true),
        auto_notify_cs_resolved: c.autoNotifyCsResolved !== undefined ? c.autoNotifyCsResolved : (c.auto_notify_cs_resolved ?? true),
        mock_mode: c.mockMode !== undefined ? c.mockMode : (c.mock_mode ?? false),
        sender_name: c.senderName || c.sender_name || 'Amanda Brownies Balikpapan',
        updated_at: new Date().toISOString()
      }];
    }

    let { data, error } = await supabase.from(tableName).upsert(dbPayload, { onConflict: 'id' });

    // Graceful schema degradation: If Supabase returns PGRST204 (column not found in schema cache),
    // strip optional columns that may not yet exist on legacy tables (e.g., grab_url, gofood_url, shopeefood_url)
    if (error && error.code === 'PGRST204' && tableName === 'outlets') {
      console.warn(`[Supabase] Schema notice on ${tableName}: ${error.message}. Retrying with core schema...`);
      const safePayload = dbPayload.map(o => {
        const { grab_url, gofood_url, shopeefood_url, ...core } = o;
        return core;
      });
      const retryResult = await supabase.from(tableName).upsert(safePayload, { onConflict: 'id' });
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) console.error(`Supabase upsert [${tableName}] error:`, error.message);
    return { success: !error, data };
  } catch (err) {
    console.error(`Exception pushing to [${tableName}]:`, err);
    return { success: false, error: err };
  }
}

/**
 * Fetch WAHA Configuration from Supabase database
 */
export async function fetchWahaConfig() {
  try {
    const { data, error } = await supabase
      .from('waha_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) {
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        console.warn('Supabase fetch waha_config:', error.message);
      }
      return null;
    }

    return {
      serverUrl: data.server_url || 'http://143.198.219.167:3000',
      apiKey: data.api_key || '',
      sessionName: data.session_name || 'default',
      adminPhone: data.admin_phone || '6281241075981',
      autoNotifyAdminNew: data.auto_notify_admin_new ?? true,
      autoNotifyCsNew: data.auto_notify_cs_new ?? false,
      autoNotifyCsProgress: data.auto_notify_cs_progress ?? true,
      autoNotifyCsResolved: data.auto_notify_cs_resolved ?? true,
      mockMode: data.mock_mode ?? false,
      senderName: data.sender_name || 'Amanda Brownies Balikpapan'
    };
  } catch (err) {
    console.warn('Exception fetching waha_config:', err);
    return null;
  }
}

/**
 * Save WAHA Configuration to Supabase database
 */
export async function saveWahaConfigToSupabase(config) {
  try {
    return await pushToSupabase('waha_config', config);
  } catch (err) {
    console.error('Error saving WAHA config to Supabase:', err);
    return { success: false, error: err };
  }
}
