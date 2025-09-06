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
// Hàm để lấy state, tránh việc thay đổi trực tiếp
export function getState() {
    return { ...state };
}

// Hàm duy nhất để cập nhật state
export function setState(newState) {
    Object.assign(state, newState);
}
