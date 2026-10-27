/* app.js — tampilan & interaksi dashboard */
const SORTS = { newest: 'Terbaru', oldest: 'Terlama', priority: 'Prioritas', due: 'Tenggat', alpha: 'Abjad (A-Z)' };
const TASK_VIEWS = { dashboard: 'Tugas Saya', tasks: 'Tugas Saya', today: 'Hari Ini', important: 'Penting', completed: 'Selesai' };

let user = requireAuth(); // belum login -> otomatis dialihkan ke login.html
const $ = s => document.querySelector(s);
const icons = () => lucide.createIcons();
const initials = n => n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const opt = (v, l = v) => `<option value="${v}">${l}</option>`;

const state = { view: 'dashboard', status: 'All', priority: 'All', category: 'All', due: 'Any', sort: getSettings().defaultSort, query: '' };

/* ---------- Header & user ---------- */
function renderUser() {
  const h = new Date().getHours();
  const hello = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  $('#greeting').textContent = `${hello}, ${user.name.split(' ')[0]} `;
  $('#sbName').textContent = user.name;
  $('#sbEmail').textContent = user.email;
  $('#sbAvatar').textContent = $('#headerAvatar').textContent = initials(user.name);
}

/* ---------- Statistik (dengan animasi angka) ---------- */
function animateCount(el, to) {
  const from = +el.textContent || 0;
  if (from === to) return;
  const start = performance.now(), dur = 600;
  const step = now => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(from + (to - from) * p);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderStats(tasks) {
  const s = getStats(tasks), box = $('#stats');
  const items = [['Total Tugas', 'clipboard-list', s.total], ['Sedang Dikerjakan', 'timer', s.progress], ['Selesai', 'circle-check', s.completed], ['Penting', 'star', s.important]];
  if (!box.children.length) {
    box.innerHTML = items.map(([l, i]) => `<div class="stat"><div class="ico"><i data-lucide="${i}"></i></div><b>0</b><span>${l}</span></div>`).join('');
  }
  box.querySelectorAll('b').forEach((el, i) => animateCount(el, items[i][2]));
}

/* ---------- Daftar task ---------- */
function taskCard(t) {
  const done = t.status === 'Completed', due = formatDue(t.dueDate, t.status);
  return `<article class="task ${done ? 'done' : ''}" data-id="${t.id}">
    <button class="check" data-act="toggle" aria-label="Toggle complete">${done ? '<i data-lucide="check"></i>' : ''}</button>
    <div class="task-body">
      <h3>${escapeHTML(t.title)}</h3>
      ${t.description ? `<p>${escapeHTML(t.description)}</p>` : ''}
      <div class="meta">
        <span class="tag">${escapeHTML(L(t.category))}</span>
        <span class="tag p-${t.priority.toLowerCase()}">${L(t.priority)}</span>
        <span class="tag">${L(t.status)}</span>
        <span class="due ${due.overdue ? 'overdue' : ''}"><i data-lucide="calendar"></i>${due.text}</span>
      </div>
    </div>
    <div class="actions">
      <button data-act="edit" aria-label="Edit"><i data-lucide="pencil"></i></button>
      <button data-act="delete" aria-label="Delete"><i data-lucide="trash-2"></i></button>
    </div></article>`;
}

function emptyState(hasTasks) {
  return `<div class="empty"><div class="ico"><i data-lucide="${hasTasks ? 'search-x' : 'inbox'}"></i></div>
    <h3>${hasTasks ? 'Tugas tidak ditemukan' : 'Belum ada tugas'}</h3>
    <p>${hasTasks ? 'Coba kata kunci atau filter yang lain.' : 'Buat tugas pertamamu dan mulai produktif.'}</p>
    ${hasTasks ? '' : '<button class="btn btn-primary" data-act="create"><i data-lucide="plus"></i>Buat Tugas</button>'}</div>`;
}

function render() {
  const tasks = Tasks.all(user.id);
  renderStats(tasks);
  const list = sortTasks(filterTasks(tasks, state), state.sort);
  $('#taskList').innerHTML = list.length ? list.map(taskCard).join('') : emptyState(tasks.length > 0);
  icons();
}

function renderChips() {
  $('#chips').innerHTML = ['All', 'Todo', 'In Progress', 'Completed', 'Important']
    .map(s => `<button class="chip ${state.status === s ? 'active' : ''}" data-status="${s}">${L(s)}</button>`).join('');
}

/* ---------- Modal (dipakai ulang untuk semua form & konfirmasi) ---------- */
function openModal(title, body, submitText, onSubmit) {
  $('#modalBox').innerHTML = `<form novalidate><h2>${title}</h2>${body}<p class="error" id="formError"></p>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>Batal</button>
    <button class="btn btn-primary">${submitText}</button></div></form>`;
  const form = $('#modalBox form');
  form.onsubmit = async e => {
    e.preventDefault();
    const error = await onSubmit(Object.fromEntries(new FormData(form))); // return teks = error, kosong = sukses
    if (error) $('#formError').textContent = error; else closeModal();
  };
  $('#overlay').classList.add('show');
  form.querySelector('input,select,textarea')?.focus();
}
const closeModal = () => $('#overlay').classList.remove('show');
const confirmModal = (title, msg, label, onConfirm) => openModal(title, `<p class="muted">${msg}</p>`, label, onConfirm);

const field = (label, control) => `<div class="field"><label>${label}</label>${control}</div>`;
const select = (name, arr, val) => `<select name="${name}">${arr.map(v => `<option value="${v}" ${v === val ? 'selected' : ''}>${L(v)}</option>`).join('')}</select>`;

function openTaskModal(task) {
  const t = task || { title: '', description: '', category: CATEGORIES[0], priority: getSettings().defaultPriority, status: 'Todo', dueDate: '' };
  openModal(task ? 'Ubah Tugas' : 'Tugas Baru',
    field('Judul Tugas', `<input name="title" maxlength="80" placeholder="contoh: Selesaikan portofolio" value="${escapeHTML(t.title)}">`) +
    field('Deskripsi', `<textarea name="description" rows="3" maxlength="300" placeholder="Keterangan tambahan (opsional)">${escapeHTML(t.description)}</textarea>`) +
    `<div class="grid2">${field('Kategori', select('category', CATEGORIES, t.category))}${field('Prioritas', select('priority', PRIORITIES, t.priority))}
     ${field('Status', select('status', STATUSES, t.status))}${field('Tenggat Waktu', `<input type="date" name="dueDate" value="${t.dueDate}">`)}</div>`,
    task ? 'Simpan Perubahan' : 'Buat Tugas',
    d => {
      if (!d.title.trim()) return 'Judul tugas wajib diisi.';
      const data = { title: d.title.trim(), description: d.description.trim(), category: d.category, priority: d.priority, status: d.status, dueDate: d.dueDate };
      if (task) { Tasks.update(task.id, data); toast('Tugas berhasil diperbarui.'); }
      else { Tasks.add(user.id, data); toast('Tugas berhasil dibuat.'); }
      render();
    });
}

/* ---------- Navigasi antar tampilan ---------- */
function setView(v) {
  state.view = v; state.status = 'All';
  document.querySelectorAll('.nav [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  const isTasks = v in TASK_VIEWS;
  $('#view-tasks').classList.toggle('hidden', !isTasks);
  $('#view-profile').classList.toggle('hidden', v !== 'profile');
  $('#view-settings').classList.toggle('hidden', v !== 'settings');
  $('#stats').classList.toggle('hidden', v !== 'dashboard');
  if (isTasks) $('#listTitle').textContent = TASK_VIEWS[v];
  if (v === 'profile') renderProfile();
  if (v === 'settings') renderSettings();
  $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); $('#userMenu').classList.add('hidden');
  renderChips(); render();
}

/* ---------- Profile ---------- */
function renderProfile() {
  const all = Tasks.all(user.id), done = all.filter(t => t.status === 'Completed').length;
  $('#view-profile').innerHTML = `<h2 class="page-title">Profil</h2><div class="card"><div class="profile">
    <div class="avatar lg">${initials(user.name)}</div>
    <div class="grow"><h3>${escapeHTML(user.name)}</h3><p class="muted">${escapeHTML(user.email)}</p></div>
    <button class="btn btn-primary" data-s="profile">Ubah Profil</button></div>
    <div class="pstats"><div><b>${all.length}</b><span>Total Tugas</span></div><div><b>${done}</b><span>Tugas Selesai</span></div>
    <div><b>${new Date(user.joined).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</b><span>Tanggal Bergabung</span></div></div></div>`;
}

function updateUser(changes) {
  Storage.set('users', Storage.get('users', []).map(u => u.id === user.id ? { ...u, ...changes } : u));
  user = getCurrentUser(); renderUser();
}

function editProfileModal() {
  openModal('Ubah Profil',
    field('Nama Lengkap', `<input name="name" value="${escapeHTML(user.name)}">`) + field('Email', `<input name="email" type="email" value="${escapeHTML(user.email)}">`),
    'Simpan', d => {
      const email = d.email.trim().toLowerCase();
      if (!d.name.trim()) return 'Nama lengkap wajib diisi.';
      if (!isValidEmail(email)) return 'Masukkan email yang valid.';
      if (Storage.get('users', []).some(u => u.email === email && u.id !== user.id)) return 'Email ini sudah dipakai.';
      updateUser({ name: d.name.trim(), email }); toast('Profil berhasil diperbarui.');
      if (state.view === 'profile') renderProfile();
    });
}

function changePasswordModal() {
  openModal('Ubah Kata Sandi',
    field('Kata Sandi Saat Ini', '<input name="current" type="password" autocomplete="current-password">') +
    field('Kata Sandi Baru', '<input name="next" type="password" autocomplete="new-password">') +
    field('Konfirmasi Kata Sandi Baru', '<input name="confirm" type="password" autocomplete="new-password">'),
    'Perbarui', async d => {
      if (await hashPassword(d.current) !== user.passwordHash) return 'Kata sandi saat ini salah.';
      if (d.next.length < 6) return 'Kata sandi baru minimal 6 karakter.';
      if (d.next !== d.confirm) return 'Kata sandi tidak sama.';
      updateUser({ passwordHash: await hashPassword(d.next) }); toast('Kata sandi berhasil diubah.');
    });
}

/* ---------- Settings ---------- */
function renderSettings() {
  const s = getSettings();
  const row = (t, d, c) => `<div class="setting"><div><b>${t}</b><small>${d}</small></div>${c}</div>`;
  const pref = (key, arr) => `<select class="control" data-pref="${key}">${arr.map(([v, l]) => `<option value="${v}" ${s[key] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  $('#view-settings').innerHTML = `<h2 class="page-title">Pengaturan</h2>
    <div class="card"><h2>Akun</h2>
      ${row('Profil', 'Ubah nama dan email kamu', '<button class="btn btn-ghost" data-s="profile">Ubah</button>')}
      ${row('Ubah kata sandi', 'Gunakan minimal 6 karakter', '<button class="btn btn-ghost" data-s="password">Ubah</button>')}</div>
    <div class="card"><h2>Aplikasi</h2>
      ${row('Notifikasi', 'Tampilkan pesan pop-up', `<label class="switch"><input type="checkbox" data-pref="notifications" ${s.notifications ? 'checked' : ''}><i></i></label>`)}
      ${row('Prioritas bawaan', 'Dipakai saat membuat tugas', pref('defaultPriority', PRIORITIES.map(p => [p, L(p)])))}
      ${row('Urutan bawaan', 'Dipakai saat aplikasi dibuka', pref('defaultSort', Object.entries(SORTS)))}</div>
    <div class="card"><h2>Data</h2>
      ${row('Hapus semua tugas', 'Hapus seluruh tugas di akunmu', '<button class="btn btn-ghost" data-s="clear">Hapus</button>')}
      ${row('Reset aplikasi', 'Hapus semua akun, tugas, dan pengaturan', '<button class="btn btn-ghost" data-s="reset">Reset</button>')}</div>`;
}

const SETTING_ACTIONS = {
  profile: editProfileModal,
  password: changePasswordModal,
  clear: () => confirmModal('Hapus semua tugas?', 'Seluruh tugasmu akan dihapus permanen.', 'Hapus', () => { Tasks.clearUser(user.id); toast('Semua tugas dihapus.'); render(); }),
  reset: () => confirmModal('Reset aplikasi?', 'Semua akun, tugas, dan pengaturan di browser ini akan dihapus.', 'Reset', () => { Storage.resetAll(); location.href = 'login.html'; })
};

/* ---------- Event listeners ---------- */
function bindEvents() {
  // Satu listener global untuk navigasi, logout, dan tombol pengaturan (event delegation)
  document.addEventListener('click', e => {
    const view = e.target.closest('[data-view]'), s = e.target.closest('[data-s]');
    if (view) setView(view.dataset.view);
    if (e.target.closest('[data-logout]')) logout();
    if (s) SETTING_ACTIONS[s.dataset.s]();
    if (e.target.closest('[data-close]') || e.target === $('#overlay')) closeModal();
    if (!e.target.closest('.user')) $('#userMenu').classList.add('hidden');
  });
  document.addEventListener('keydown', e => e.key === 'Escape' && closeModal());

  $('#taskList').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    if (btn.dataset.act === 'create') return openTaskModal();
    const task = Tasks.get(btn.closest('.task').dataset.id), act = btn.dataset.act;
    if (act === 'edit') openTaskModal(task);
    if (act === 'toggle') {
      const done = task.status === 'Completed';
      Tasks.update(task.id, { status: done ? 'Todo' : 'Completed' });
      toast(done ? 'Tugas dikembalikan ke belum dikerjakan.' : 'Tugas selesai.'); render();
    }
    if (act === 'delete') confirmModal('Hapus tugas ini?', 'Apakah kamu yakin ingin menghapus tugas ini?', 'Hapus', () => { Tasks.remove(task.id); toast('Tugas berhasil dihapus.'); render(); });
  });

  $('#view-settings').addEventListener('change', e => {
    const key = e.target.dataset.pref; if (!key) return;
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    saveSetting(key, value);
    if (key === 'defaultSort') { state.sort = value; $('#fSort').value = value; render(); }
    toast('Pengaturan disimpan.');
  });

  $('#chips').addEventListener('click', e => { const c = e.target.closest('[data-status]'); if (c) { state.status = c.dataset.status; renderChips(); render(); } });
  [['#fPriority', 'priority'], ['#fCategory', 'category'], ['#fDue', 'due'], ['#fSort', 'sort']]
    .forEach(([id, key]) => $(id).addEventListener('change', e => { state[key] = e.target.value; render(); }));

  $('#search').addEventListener('input', e => { state.query = e.target.value; if (state.view in TASK_VIEWS) render(); else setView('tasks'); });
  $('#addTask').addEventListener('click', () => openTaskModal());
  $('#userBtn').addEventListener('click', () => $('#userMenu').classList.toggle('hidden'));
  $('#headerAvatar').addEventListener('click', () => setView('profile'));
  $('#menuToggle').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); });
  $('#scrim').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); });
  $('#bell').addEventListener('click', () => {
    const n = Tasks.all(user.id).filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate <= todayStr()).length;
    toast(n ? `Ada ${n} tugas yang jatuh tempo hari ini atau sudah terlambat.` : 'Semua tugas aman, mantap!', true);
  });
}

function init() {
  $('#fPriority').innerHTML = opt('All', 'Semua prioritas') + [...PRIORITIES].reverse().map(p => opt(p, L(p))).join('');
  $('#fCategory').innerHTML = opt('All', 'Semua kategori') + CATEGORIES.map(c => opt(c, L(c))).join('');
  $('#fDue').innerHTML = [['Any', 'Semua tenggat'], ['Today', 'Hari ini'], ['Overdue', 'Terlambat'], ['Week', '7 hari ke depan'], ['None', 'Tanpa tenggat']].map(([v, l]) => opt(v, l)).join('');
  $('#fSort').innerHTML = Object.entries(SORTS).map(([v, l]) => opt(v, 'Urutkan: ' + l)).join('');
  $('#fSort').value = state.sort;
  renderUser(); bindEvents(); setView('dashboard');
}
if (user) init();
