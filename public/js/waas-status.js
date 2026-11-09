/**
 * BORNEOLINK WAAS - DEDICATED TENANT SUSPENSION ENFORCER
 * Independent client connecting to Master WAAS Database.
 * Handles multi-table subscription lifecycle monitoring and realtime suspension overlay.
 */

(function initWaasStatusEnforcer() {
  const WAAS_CONFIG_KEY = 'tenant_waas_config';

  const DEFAULT_WAAS_CONFIG = {
    waasUrl: 'https://zomkdefqivvbtxqzavpz.supabase.co',
    waasKey: 'sb_publishable_xG2a15CPnDELITqWHdodiQ__PnNZX8-',
    tenantId: 'tenant_amanda', // ID Tenant terdaftar di WAAS untuk Amanda Brownies
    subdomain: 'amanda'        // Subdomain terdaftar di WAAS untuk Amanda Brownies
  };

  function getWaasConfig() {
    try {
      const raw = localStorage.getItem(WAAS_CONFIG_KEY) || localStorage.getItem('amanda_waas_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          waasUrl: (parsed.waasUrl || '').trim() || DEFAULT_WAAS_CONFIG.waasUrl,
          waasKey: (parsed.waasKey || '').trim() || DEFAULT_WAAS_CONFIG.waasKey,
          tenantId: (parsed.tenantId || '').trim() || DEFAULT_WAAS_CONFIG.tenantId,
          subdomain: (parsed.subdomain || '').trim() || DEFAULT_WAAS_CONFIG.subdomain
        };
      }
    } catch (e) {
      console.warn('Gagal membaca tenant_waas_config:', e);
    }
    return DEFAULT_WAAS_CONFIG;
  }

  let waasClient = null;
  let activeChannel = null;

  function getWaasClient() {
    if (typeof supabase === 'undefined' || !supabase.createClient) return null;
    const config = getWaasConfig();

    if (!waasClient || waasClient._currentUrl !== config.waasUrl || waasClient._currentKey !== config.waasKey) {
      try {
        if (activeChannel && waasClient) {
          waasClient.removeChannel(activeChannel);
          activeChannel = null;
        }
        waasClient = supabase.createClient(config.waasUrl, config.waasKey);
        waasClient._currentUrl = config.waasUrl;
        waasClient._currentKey = config.waasKey;
      } catch (e) {
        console.warn('WAAS client init error:', e);
        waasClient = null;
      }
    }
    return waasClient;
  }

  function createSuspensionOverlay(reason) {
    let overlay = document.getElementById('waas-suspended-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'waas-suspended-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999999;
      background: rgba(15, 23, 42, 0.5);
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      animation: fadeIn 0.25s ease-out;
    `;

    overlay.innerHTML = `
      <div style="
        max-width: 460px;
        width: 100%;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
        border-radius: 20px;
        padding: 32px 28px;
        text-align: center;
      ">
        <div style="
          width: 52px;
          height: 52px;
          margin: 0 auto 16px auto;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.25);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f43f5e;
          font-size: 22px;
        ">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>

        <div style="
          display: inline-block;
          padding: 3px 12px;
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 100px;
          color: #fda4af;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 12px;
        ">
          503 Service Suspended
        </div>

        <h2 style="
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        ">
          Layanan Website Ditangguhkan
        </h2>

        <p style="
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.55;
          margin: 0 0 20px 0;
        ">
          ${reason || 'Website ini sedang dinonaktifkan sementara oleh administrator atau masa aktif paket langganan telah berakhir.'}
        </p>

        <div style="
          padding: 12px 16px;
          background: rgba(2, 6, 23, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          text-align: left;
          font-size: 12px;
          color: #cbd5e1;
        ">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Domain</span>
            <strong style="color: #ffffff; font-weight: 600;">${window.location.hostname}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Status Jaringan</span>
            <span style="color: #f43f5e; font-weight: 700;">SUSPENDED</span>
          </div>
        </div>

        <div style="
          margin-top: 20px;
          font-size: 11px;
          color: #64748b;
        ">
          BorneoLink Cloud Network
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function removeSuspensionOverlay() {
    const overlay = document.getElementById('waas-suspended-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  async function checkWaasStatus() {
    const client = getWaasClient();
    if (!client) return;

    const config = getWaasConfig();

    try {
      const [
        { data: tenantData },
        { data: websiteDataList },
        { data: subData }
      ] = await Promise.all([
        client.from('tenants').select('status').eq('id', config.tenantId).maybeSingle(),
        client.from('websites').select('status, subdomain').or(`subdomain.eq.${config.subdomain},tenant_id.eq.${config.tenantId}`),
        client.from('subscriptions').select('status, current_period_end').eq('tenant_id', config.tenantId).maybeSingle()
      ]);

      const isTenantSuspended = tenantData && String(tenantData.status).toUpperCase() === 'SUSPENDED';
      const isWebsiteSuspended = websiteDataList && websiteDataList.some(w => String(w.status).toUpperCase() === 'SUSPENDED');
      const isSubscriptionSuspended = subData && (String(subData.status).toUpperCase() === 'SUSPENDED' || String(subData.status).toUpperCase() === 'CANCELLED');
      const isSubscriptionExpired = subData && subData.current_period_end && (new Date(subData.current_period_end).getTime() < Date.now()) && String(subData.status).toUpperCase() !== 'ACTIVE';

      if (isTenantSuspended || isWebsiteSuspended || isSubscriptionSuspended || isSubscriptionExpired) {
        let reason = 'Website ini sedang dinonaktifkan sementara oleh administrator atau masa aktif paket langganan telah berakhir.';
        if (isTenantSuspended) {
          reason = 'Tenant organisasi dinonaktifkan oleh administrator platform BorneoLink WAAS.';
        } else if (isWebsiteSuspended) {
          reason = 'Website engine dinonaktifkan oleh administrator platform BorneoLink WAAS.';
        } else if (isSubscriptionSuspended || isSubscriptionExpired) {
          reason = 'Masa sewa langganan telah habis atau ditangguhkan. Silakan perpanjang sewa melalui dashboard customer.';
        }
        createSuspensionOverlay(reason);
      } else {
        removeSuspensionOverlay();
      }

      // Realtime subscription setup
      if (!activeChannel) {
        activeChannel = client
          .channel('waas-live-status-enforcer-' + config.tenantId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'websites' }, () => checkWaasStatus())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => checkWaasStatus())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => checkWaasStatus())
          .subscribe();
      }
    } catch (err) {
      console.warn('WAAS status check error:', err);
    }
  }

  setInterval(checkWaasStatus, 10000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkWaasStatus);
  } else {
    checkWaasStatus();
  }

  window.refreshWaasStatusEnforcer = function() {
    waasClient = null;
    checkWaasStatus();
  };
})();
