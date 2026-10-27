/* storage.js — pembungkus LocalStorage + fungsi bantu umum */
const KEYS = { users: 'tf_users', currentUser: 'tf_currentUser', tasks: 'tf_tasks', settings: 'tf_settings' };

const Storage = {
  get(key, fallback) {
    try { const v = localStorage.getItem(KEYS[key]); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(KEYS[key], JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(KEYS[key]); },
  resetAll() { Object.values(KEYS).forEach(k => localStorage.removeItem(k)); sessionStorage.removeItem('tf_session'); }
};

const DEFAULT_SETTINGS = { notifications: true, defaultPriority: 'Medium', defaultSort: 'newest' };
const getSettings = () => ({ ...DEFAULT_SETTINGS, ...Storage.get('settings', {}) });
const saveSetting = (key, value) => Storage.set('settings', { ...getSettings(), [key]: value });

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Mencegah XSS: semua teks dari user di-escape sebelum masuk innerHTML
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Notifikasi pojok kanan atas (hilang otomatis setelah 3 detik)
function toast(message, force = false) {
  if (!force && !getSettings().notifications) return;
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3000);
}
