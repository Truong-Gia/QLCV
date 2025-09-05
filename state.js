export const state = {
    currentDate: new Date(),
    currentView: 'week',
    chartInstances: {},
    currentFilters: { priority: 'all', category: 'all', person: 'all' },
    userProfile: { name: 'Tôi', email: 'me@example.com' },
    teamMembers: [],
    supabase: null,
    PRIORITIES: { 'Cao': 'bg-red-100 text-red-800', 'Trung bình': 'bg-yellow-100 text-yellow-800', 'Thấp': 'bg-blue-100 text-blue-800' },
    CATEGORIES: ['Chung', 'Công việc', 'Cá nhân', 'Học tập', 'Dự án'],
    STATUSES: ['Cần làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'],
    STATUS_COLORS: { 'Cần làm': '#fca5a5', 'Đang làm': '#fdba74', 'Hoàn thành': '#86efac', 'Tạm dừng': '#d1d5db' },
    PRIORITY_COLORS: { 'Cao': '#ef4444', 'Trung bình': '#f59e0b', 'Thấp': '#3b82f6' },
    CATEGORY_COLORS: ['#6366f1', '#38bdf8', '#34d399', '#facc15', '#a855f7', '#ec4899'],
};

// state.js
const STORAGE_KEY = 'qlcv_state_v1';

const DEFAULT_STATE = {
  currentDate: new Date().toISOString().slice(0, 10), // 'YYYY-MM-DD'
  tasks: [],
  projects: [],
  users: [],
  settings: { weekStartsOnMonday: true },
};

function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);

    // hợp nhất an toàn
    return {
      ...DEFAULT_STATE,
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch (e) {
    console.warn('State parse error:', e);
    return { ...DEFAULT_STATE };
  }
}

function setState(next) {
  const cur = getState();
  const merged = { ...cur, ...(next || {}) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

function stringToColor(str) {
  const s = String(str || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 55%)`;
}

export default { getState, setState, stringToColor };
export { getState, setState }; // nếu nơi khác đang import theo named export

