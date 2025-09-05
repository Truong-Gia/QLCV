import { state } from './state.js';
import { getSupabaseClient } from './services/supabaseService.js';
import { renderWeeklyView } from './components/WeeklyView.js';
import { renderMonthlyView } from './components/MonthlyView.js';
import { renderDashboardView } from './components/DashboardView.js';
import { renderKanbanView } from './components/KanbanView.js';
import { openProfileModal } from './components/Modals.js';
import { showLoading, hideLoading, updateProfileUI, showSupabaseModal } from './utils/uiUtils.js';

// --- DOM Elements ---
        const appContainer = document.getElementById('app-container');
        const modalsContainer = document.getElementById('modals-container');
        const loadingSpinner = document.getElementById('loading-spinner');
        const quoteDisplay = document.getElementById('quote-display');
        const weeklyViewContainer = document.getElementById('weekly-view-container');
        const monthlyViewContainer = document.getElementById('monthly-view-container');
        const dashboardViewContainer = document.getElementById('dashboard-view-container');
        const kanbanViewContainer = document.getElementById('kanban-view-container');
        const filtersContainer = document.getElementById('filters-container');
        const toggleWeekBtn = document.getElementById('toggle-week-view');
        const toggleMonthBtn = document.getElementById('toggle-month-view');
        const toggleDashboardBtn = document.getElementById('toggle-dashboard-view');
        const toggleKanbanBtn = document.getElementById('toggle-kanban-view');
};

// --- Constants ---
        const quotes = ["Bí mật của sự tiến bộ là bắt đầu.", "Hãy là sự thay đổi mà bạn muốn thấy trên thế giới.", "Cách tốt nhất để dự đoán tương lai là tạo ra nó.", "Có công mài sắc, có ngày nên kim."];
        const PRIORITIES = { 'Cao': 'bg-red-100 text-red-800', 'Trung bình': 'bg-yellow-100 text-yellow-800', 'Thấp': 'bg-blue-100 text-blue-800' };
        let CATEGORIES = ['Chung', 'Công việc', 'Cá nhân', 'Học tập', 'Dự án'];
        const STATUSES = ['Cần làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'];
        const STATUS_COLORS = { 'Cần làm': '#fca5a5', 'Đang làm': '#fdba74', 'Hoàn thành': '#86efac', 'Tạm dừng': '#d1d5db' };
        const PRIORITY_COLORS = { 'Cao': '#ef4444', 'Trung bình': '#f59e0b', 'Thấp': '#3b82f6' };
        const CATEGORY_COLORS = ['#6366f1', '#38bdf8', '#34d399', '#facc15', '#a855f7', '#ec4899'];

// --- RENDER FUNCTIONS ---
        async function renderCurrentView() {
            showLoading();
            const viewRenderers = {
                week: renderWeeklyView, month: renderMonthlyView,
                dashboard: renderDashboardView, kanban: renderKanbanView,
            };
            const filtersViews = ['dashboard', 'kanban'];
            if (filtersViews.includes(currentView)) {
                filtersContainer.classList.remove('hidden');
                await renderFilters();
            } else {
                filtersContainer.classList.add('hidden');
            }
            if(viewRenderers[currentView]) await viewRenderers[currentView]();
            hideLoading();
        }
        
        async function renderFilters() {
            const priorityFilter = document.getElementById('priority-filter');
            priorityFilter.innerHTML = `<option value="all">Tất cả</option>` + Object.keys(PRIORITIES).map(p => `<option value="${p}" ${currentFilters.priority === p ? 'selected' : ''}>${p}</option>`).join('');

            const { data, error } = await supabaseClient.from('tasks').select('category');
            if(data) {
                const uniqueCategories = [...new Set(data.map(t => t.category).filter(Boolean))];
                CATEGORIES = [...new Set([...CATEGORIES, ...uniqueCategories])];
            }
            const categoryFilter = document.getElementById('category-filter');
            categoryFilter.innerHTML = `<option value="all">Tất cả</option>` + CATEGORIES.map(c => `<option value="${c}" ${currentFilters.category === c ? 'selected' : ''}>${c}</option>`).join('');
            
            const personFilter = document.getElementById('person-filter');
            const allUsers = [userProfile, ...teamMembers];
            personFilter.innerHTML = `<option value="all">Tất cả</option>` + `<option value="unassigned">Chưa giao</option>` + allUsers.map(u => `<option value="${u.email}" ${currentFilters.person === u.email ? 'selected' : ''}>${u.name}</option>`).join('');
        }


// --- USER & TEAM MANAGEMENT ---
        function loadUserData() {
            const savedProfile = localStorage.getItem('userProfile');
            if (savedProfile) userProfile = JSON.parse(savedProfile);
            const savedTeam = localStorage.getItem('teamMembers');
            if (savedTeam) teamMembers = JSON.parse(savedTeam);
            updateProfileUI();
        }

        function saveUserData() {
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
            localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
        }

        function updateProfileUI() {
            const nameDisplay = document.getElementById('user-name-display');
            const avatarDisplay = document.getElementById('user-avatar');
            nameDisplay.textContent = userProfile.name || 'Hồ sơ';
            avatarDisplay.textContent = userProfile.name ? userProfile.name.charAt(0).toUpperCase() : '?';
            avatarDisplay.style.backgroundColor = stringToColor(userProfile.email || '');
        }

        function openProfileModal() {
            const body = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Tên của bạn</label>
                        <input id="profile-name-input" type="text" value="${userProfile.name}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Email của bạn (duy nhất)</label>
                        <input id="profile-email-input" type="email" value="${userProfile.email}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    </div>
                    <hr>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Thành viên nhóm (mỗi người một dòng)</label>
                        <textarea id="team-members-input" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-24" placeholder="Nguyễn Văn A, a@example.com\nhoặc chỉ cần email:\nb@example.com">${teamMembers.map(m => `${m.name}, ${m.email}`).join('\n')}</textarea>
                        <p class="text-xs text-gray-500 mt-1">Định dạng: "Tên, email" hoặc chỉ "email". Email là duy nhất.</p>
                    </div>
                </div>`;
            const footer = `<div class="flex-grow"></div><button id="save-profile-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu thay đổi</button>`;
            
            const modalElement = showModal('Hồ sơ & Quản lý Nhóm', body, footer);
            const closeModal = setupModalEvents(modalElement);
            
            modalElement.querySelector('#save-profile-btn').addEventListener('click', () => {
                const name = modalElement.querySelector('#profile-name-input').value.trim();
                const email = modalElement.querySelector('#profile-email-input').value.trim();
                if (!name || !email) {
                    alert('Tên và Email của bạn không được để trống.');
                    return;
                }
                userProfile = { name, email };

                const teamText = modalElement.querySelector('#team-members-input').value.trim();
                teamMembers = teamText.split('\n')
                    .map(line => line.trim())
                    .filter(line => line) // Bỏ qua các dòng trống
                    .map(line => {
                        const parts = line.split(',');
                        if (parts.length >= 2) {
                            // Định dạng: Tên, email
                            const email = parts.pop().trim();
                            const name = parts.join(',').trim();
                            if (name && email.includes('@')) {
                                return { name: name, email: email };
                            }
                        } else if (line.includes('@')) {
                            // Định dạng: chỉ có email
                            const email = line.trim();
                            const name = email.split('@')[0]; // Lấy phần trước @ làm tên tạm
                            return { name: name, email: email };
                        }
                        return null; // Bỏ qua các dòng không hợp lệ
                    }).filter(Boolean);

                saveUserData();
                updateProfileUI();
                renderCurrentView();
                closeModal();
            });
        }


// --- INITIALIZATION ---
(async function init() {
    loadUserData();
    
    Object.keys(toggleButtons).forEach(key => {
        if(toggleButtons[key]) {
            toggleButtons[key].addEventListener('click', () => switchView(key));
        }
    });
    document.getElementById('profile-btn').addEventListener('click', openProfileModal);

    const supabase = getSupabaseClient();
    if (supabase) {
        state.supabase = supabase;
        appContainer.classList.remove('hidden');
        quoteDisplay.textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
        await renderCurrentView();
    } else {
        showSupabaseModal();
    }
})();



