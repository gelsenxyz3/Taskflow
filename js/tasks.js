/* tasks.js — data task: CRUD, filter, sorting, statistik (tanpa menyentuh tampilan) */
const CATEGORIES = ['Work', 'Personal', 'Study', 'Development', 'Health', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Todo', 'In Progress', 'Completed'];
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

const Tasks = {
  all: userId => Storage.get('tasks', []).filter(t => t.userId === userId),
  get: id => Storage.get('tasks', []).find(t => t.id === id),
  add(userId, data) {
    const list = Storage.get('tasks', []);
    list.push({ id: uid(), userId, ...data, createdAt: new Date().toISOString() });
    Storage.set('tasks', list);
  },
  update(id, data) { Storage.set('tasks', Storage.get('tasks', []).map(t => t.id === id ? { ...t, ...data } : t)); },
  remove(id) { Storage.set('tasks', Storage.get('tasks', []).filter(t => t.id !== id)); },
  clearUser(userId) { Storage.set('tasks', Storage.get('tasks', []).filter(t => t.userId !== userId)); }
};

const dateStr = offset => new Date(Date.now() + offset * 864e5).toLocaleDateString('en-CA'); // YYYY-MM-DD
const todayStr = () => dateStr(0);

function matchDue(t, due) {
  const today = todayStr();
  if (due === 'Today') return t.dueDate === today;
  if (due === 'Overdue') return !!t.dueDate && t.dueDate < today && t.status !== 'Completed';
  if (due === 'Week') return !!t.dueDate && t.dueDate >= today && t.dueDate <= dateStr(7);
  if (due === 'None') return !t.dueDate;
  return true; // 'Any'
}

// f = { view, status, priority, category, due, query }
function filterTasks(list, f) {
  const q = f.query.trim().toLowerCase();
  return list.filter(t => {
    if (f.view === 'today' && t.dueDate !== todayStr()) return false;
    if (f.view === 'important' && t.priority !== 'High') return false;
    if (f.view === 'completed' && t.status !== 'Completed') return false;
    if (f.status === 'Important') { if (t.priority !== 'High') return false; }
    else if (f.status !== 'All' && t.status !== f.status) return false;
    if (f.priority !== 'All' && t.priority !== f.priority) return false;
    if (f.category !== 'All' && t.category !== f.category) return false;
    return matchDue(t, f.due) && t.title.toLowerCase().includes(q);
  });
}

function sortTasks(list, mode) {
  const by = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    priority: (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    due: (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
    alpha: (a, b) => a.title.localeCompare(b.title)
  };
  return [...list].sort(by[mode] || by.newest);
}

function getStats(list) {
  const count = fn => list.filter(fn).length;
  return {
    total: list.length,
    progress: count(t => t.status === 'In Progress'),
    completed: count(t => t.status === 'Completed'),
    important: count(t => t.priority === 'High')
  };
}

// Teks tenggat: "Today", "Tomorrow", "Mar 5", atau penanda terlambat
function formatDue(date, status) {
  if (!date) return { text: 'Tanpa tenggat', overdue: false };
  if (date === todayStr()) return { text: 'Hari ini', overdue: false };
  if (date === dateStr(1)) return { text: 'Besok', overdue: false };
  const label = new Date(date + 'T00:00').toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
  const overdue = date < todayStr() && status !== 'Completed';
  return { text: overdue ? 'Terlambat · ' + label : label, overdue };
}

// Label tampilan (nilai di LocalStorage tetap sama, hanya tulisannya yang diterjemahkan)
const LABELS = { All: 'Semua', Low: 'Rendah', Medium: 'Sedang', High: 'Tinggi', Todo: 'Belum Dikerjakan', 'In Progress': 'Sedang Dikerjakan',
  Completed: 'Selesai', Important: 'Penting', Work: 'Pekerjaan', Personal: 'Pribadi', Study: 'Belajar', Development: 'Pengembangan', Health: 'Kesehatan', Other: 'Lainnya' };
const L = key => LABELS[key] || key;
