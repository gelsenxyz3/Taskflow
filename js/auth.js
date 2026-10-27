/* auth.js — register, login, logout, dan penjaga halaman.
   CATATAN: ini hanya SIMULASI autentikasi di frontend. Untuk produksi, autentikasi
   WAJIB memakai backend + database (hash dengan bcrypt/argon2, session/JWT, HTTPS). */

// Password tidak disimpan polos; di-hash SHA-256 (fallback sederhana bila crypto tidak tersedia)
async function hashPassword(p) {
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(unescape(encodeURIComponent(p)));
}

const isValidEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Mengembalikan user yang sedang login, atau null
function getCurrentUser() {
  const s = Storage.get('currentUser', null);
  if (!s) return null;
  // Tanpa "Remember me", login hanya berlaku selama tab/browser masih terbuka
  if (!s.remember && !sessionStorage.getItem('tf_session')) return null;
  return Storage.get('users', []).find(u => u.id === s.userId) || null;
}

// Dipanggil di index.html: belum login -> ke halaman login
function requireAuth() {
  const user = getCurrentUser();
  if (!user) location.replace('login.html');
  return user;
}

function logout() {
  Storage.remove('currentUser');
  sessionStorage.removeItem('tf_session');
  location.href = 'login.html';
}

// Tampilkan / hapus pesan error di bawah input
function showError(input, msg) {
  const field = input.closest('.field');
  field.classList.toggle('invalid', !!msg);
  field.querySelector('.error').textContent = msg || '';
}

/* ---------- Halaman Login ---------- */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  if (getCurrentUser()) location.replace('index.html');

  document.getElementById('forgot').addEventListener('click', e => {
    e.preventDefault();
    toast('Reset kata sandi butuh backend dan belum tersedia di sini.', true);
  });

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const { email, password } = loginForm;
    const emailVal = email.value.trim().toLowerCase();
    showError(email, isValidEmail(emailVal) ? '' : 'Masukkan email yang valid.');
    showError(password, password.value ? '' : 'Kata sandi wajib diisi.');
    if (!isValidEmail(emailVal) || !password.value) return;

    const user = Storage.get('users', []).find(u => u.email === emailVal);
    if (!user || user.passwordHash !== await hashPassword(password.value)) {
      showError(password, 'Email atau kata sandi salah.');
      return;
    }
    Storage.set('currentUser', { userId: user.id, remember: loginForm.remember.checked });
    sessionStorage.setItem('tf_session', '1');
    location.href = 'index.html';
  });
}

/* ---------- Halaman Register ---------- */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const { name, email, password, confirm } = registerForm;
    const emailVal = email.value.trim().toLowerCase();
    const users = Storage.get('users', []);

    const errors = [
      [name, name.value.trim() ? '' : 'Nama lengkap wajib diisi.'],
      [email, !emailVal ? 'Email wajib diisi.' : !isValidEmail(emailVal) ? 'Masukkan email yang valid.'
        : users.some(u => u.email === emailVal) ? 'Email ini sudah terdaftar.' : ''],
      [password, !password.value ? 'Kata sandi wajib diisi.' : password.value.length < 6 ? 'Minimal 6 karakter.' : ''],
      [confirm, !confirm.value ? 'Konfirmasi kata sandi dulu.' : confirm.value !== password.value ? 'Kata sandi tidak sama.' : '']
    ];
    errors.forEach(([input, msg]) => showError(input, msg));
    if (errors.some(([, msg]) => msg)) return;

    users.push({
      id: uid(), name: name.value.trim(), email: emailVal,
      passwordHash: await hashPassword(password.value), joined: new Date().toISOString()
    });
    Storage.set('users', users);
    toast('Akun berhasil dibuat! Mengarahkan ke halaman masuk...', true);
    setTimeout(() => location.href = 'login.html', 1200);
  });
}
