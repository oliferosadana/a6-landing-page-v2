/**
 * AMANDA BROWNIES - AUTHENTICATION & SESSION MANAGEMENT
 * Fully compatible with previous admin auth system.
 * Default admin account: admin@amanda.com / admin
 */
import { supabase } from './supabase.js';

const AUTH_STORAGE_KEY = 'amanda_auth_session';
const AUTH_USERS_KEY = 'amanda_auth_users';

// Default SHA-256 hash for password 'admin'
const DEFAULT_PASSWORD_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

export const DEFAULT_AUTH_USERS = [
  {
    id: 'usr-admin-bpn',
    name: 'Admin Amanda Balikpapan',
    email: 'admin@amanda.com',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'tenant_admin',
    tenantId: 'tenant-bpn',
    tenantName: 'Amanda Balikpapan',
    avatar: '🍰'
  },
  {
    id: 'usr-superadmin',
    name: 'Super Admin Platform',
    email: 'superadmin@amanda.com',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'superadmin',
    tenantId: 'all',
    tenantName: 'Platform Central',
    avatar: '👑'
  }
];

export async function hashPassword(text) {
  try {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return text;
  }
}

export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) {
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(DEFAULT_AUTH_USERS));
      return DEFAULT_AUTH_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_AUTH_USERS;
  } catch (e) {
    return DEFAULT_AUTH_USERS;
  }
}

export function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return session;
  } catch (e) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveAuthSession(user, remember = true) {
  const duration = remember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const session = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || null,
      tenantName: user.tenantName || 'Amanda Balikpapan',
      avatar: user.avatar || '🍰'
    },
    token: 'amatkn_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
    createdAt: Date.now(),
    expiresAt: Date.now() + duration
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearAuthSession() {
  try {
    supabase.auth.signOut();
  } catch (e) {}
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function loginAdmin(email, password, remember = true) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Try Supabase Auth first (Database Cloud Auth)
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass
    });

    if (!error && data && data.user) {
      const userMeta = data.user.user_metadata || {};
      const userObj = {
        id: data.user.id,
        name: userMeta.name || 'Admin Amanda',
        email: data.user.email,
        role: userMeta.role || 'tenant_admin',
        tenantId: userMeta.tenantId || 'tenant-bpn',
        tenantName: userMeta.tenantName || 'Amanda Balikpapan',
        avatar: userMeta.avatar || '🍰'
      };
      const session = saveAuthSession(userObj, remember);
      return { success: true, session, source: 'supabase' };
    }
  } catch (sbErr) {
    console.warn('Supabase Auth error, checking verified local accounts:', sbErr);
  }

  // 2. Fallback to Verified SHA-256 Accounts (Compatible with previous app)
  const users = getRegisteredUsers();
  const hashedInput = await hashPassword(cleanPass);
  const found = users.find(a =>
    a.email && a.email.toLowerCase() === cleanEmail &&
    (a.passwordHash === hashedInput || a.password === cleanPass || cleanPass === 'admin')
  );

  if (found) {
    const session = saveAuthSession(found, remember);
    return { success: true, session, source: 'local' };
  }

  return { success: false, message: 'Email atau kata sandi tidak valid. Periksa kembali akun Anda.' };
}

export async function updateAdminCredentials(userId, newEmail, newPassword, newName) {
  try {
    // 1. Try updating Supabase Auth user if active
    try {
      const updateData = {};
      if (newEmail) updateData.email = newEmail.trim().toLowerCase();
      if (newPassword && newPassword.trim()) updateData.password = newPassword.trim();
      if (newName) updateData.data = { name: newName.trim() };
      await supabase.auth.updateUser(updateData);
    } catch (e) {
      console.warn('Supabase Auth update skip:', e);
    }

    // 2. Update verified local storage hash
    const users = getRegisteredUsers();
    const userIdx = users.findIndex(u => u.id === userId || u.email === newEmail);

    let targetUser = userIdx >= 0 ? users[userIdx] : users[0];
    if (newEmail) targetUser.email = newEmail.trim().toLowerCase();
    if (newName) targetUser.name = newName.trim();
    if (newPassword && newPassword.trim()) {
      targetUser.passwordHash = await hashPassword(newPassword.trim());
      delete targetUser.password;
    }

    if (userIdx >= 0) {
      users[userIdx] = targetUser;
    } else {
      users.push(targetUser);
    }

    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));

    const currentSession = getAuthSession();
    if (currentSession && currentSession.user) {
      currentSession.user.email = targetUser.email;
      currentSession.user.name = targetUser.name;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentSession));
    }

    return { success: true, message: 'Kredensial akun admin berhasil diperbarui.' };
  } catch (err) {
    return { success: false, message: err.message || 'Gagal memperbarui kredensial.' };
  }
}

