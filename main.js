// main.js - Entry point, DOM elements, init, event listeners

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

import { currentDate, currentView, chartInstances, currentFilters, userProfile, teamMembers, searchTerm, sortConfig, tasksCache, PRIORITIES, CATEGORIES, STATUSES, STATUS_COLORS, STATUS_CHART_COLORS, PRIORITY_COLORS, CATEGORY_COLORS, KANBAN_COLUMN_COLORS } from './state.js';
import { initSupabase, setupRealtimeSubscriptions } from './services/supabaseService.js';
import { formatDate, getWeekDays, debounce, stringToColor, getRandomPastelColor } from './utils/dateUtils.js';
import { showLoading, hideLoading, toggleSidebar, switchView, renderFilters, getFilteredTasksFromCache, renderCurrentView } from './utils/UIUtils.js';
import { openProfileModal } from './components/Modals.js';
import { renderWeeklyView } from './components/WeeklyView.js';
import { renderMonthlyView } from './components/MonthlyView.js';
import { renderDashboardView } from './components/DashboardView.js';
import { renderKanbanView } from './components/KanbanView.js';
import { renderListView } from './components/ListView.js';
import { renderMembersView } from './components/MembersView.js';
import { renderReportsView } from './components/ReportView.js';
import { openAddTaskModal } from './components/Modals.js';

// --- DOM Elements ---
const appContainer = document.getElementById('app-container');
const modalsContainer = document.getElementById('modals-container');
const loadingSpinner = document.getElementById('loading-spinner');
const weeklyViewContainer = document.getElementById('weekly-view-container');
const monthlyViewContainer = document.getElementById('monthly-view-container');
const dashboardViewContainer = document.getElementById('dashboard-view-container');
const kanbanViewContainer = document.getElementById('kanban-view-container');
const listViewContainer = document.getElementById('list-view-container');
const membersViewContainer = document.getElementById('members-view-container');
const reportsViewContainer = document.getElementById('reports-view-container');
const searchAndFilterContainer = document.getElementById('search-and-filter-container');
const sidebarNav = document.getElementById('sidebar-nav');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const hamburgerBtn = document.getElementById('hamburger-btn');
const currentViewTitle = document.getElementById('current-view-title');

export { appContainer, modalsContainer, loadingSpinner, weeklyViewContainer, monthlyViewContainer, dashboardViewContainer, kanbanViewContainer, listViewContainer, membersViewContainer, reportsViewContainer, searchAndFilterContainer, sidebarNav, sidebar, sidebarBackdrop, hamburgerBtn, currentViewTitle };

loadUserData();
hamburgerBtn.addEventListener('click', toggleSidebar);
sidebarBackdrop.addEventListener('click', toggleSidebar);
document.getElementById('profile-btn').addEventListener('click', openProfileModal);
document.getElementById('fab-add-task').addEventListener('click', () => openAddTaskModal());

sidebarNav.addEventListener('click', (e) => {
    e.preventDefault();
    const target = e.target.closest('.sidebar-item');
    if(target) {
        const view = target.dataset.view;
        switchView(view);
         if (window.innerWidth < 1024 && !sidebar.classList.contains('-translate-x-full')) {
            toggleSidebar();
        }
    }
});

document.getElementById('priority-filter').addEventListener('change', (e) => { currentFilters.priority = e.target.value; renderCurrentView(); });
document.getElementById('category-filter').addEventListener('change', (e) => { currentFilters.category = e.target.value; renderCurrentView(); });
document.getElementById('person-filter').addEventListener('change', (e) => { currentFilters.person = e.target.value; renderCurrentView(); });
document.getElementById('search-input').addEventListener('input', debounce((e) => {
    searchTerm = e.target.value;
    renderCurrentView();
}, 300));

appContainer.addEventListener('click', (e) => {
    const editButton = e.target.closest('.edit-task-btn');
    if (editButton) {
        e.preventDefault();
        e.stopPropagation();
        const taskId = editButton.dataset.taskId;
        if (taskId) openEditTaskModal(taskId);
        return;
    }
    
    const taskElement = e.target.closest('.task-item-clickable');
    if (taskElement && !e.target.matches('input[type="checkbox"]')) {
        e.preventDefault();
        const taskId = taskElement.dataset.taskId;
        if (taskId) {
            openEditTaskModal(taskId);
        }
    }
});

(async function init() {
    const savedUrl = localStorage.getItem('supabaseUrl');
    const savedKey = localStorage.getItem('supabaseKey');
    if (savedUrl && savedKey) {
        try {
            supabaseClient = createClient(savedUrl, savedKey);
            const { error: testError } = await supabaseClient.from('tasks').select('id').limit(1);
             if (testError && testError.message.includes('relation "public.tasks" does not exist')) {
                 alert('Cơ sở dữ liệu chưa được thiết lập. Vui lòng làm theo hướng dẫn trong cửa sổ cấu hình.');
                 localStorage.clear();
                 showSupabaseModal();
                 return;
        } else if (testError) {
             console.error("Supabase connection error:", testError.message);
             alert("Lỗi kết nối tới Supabase. Vui lòng kiểm tra lại URL, Key và chính sách RLS.");
             showSupabaseModal();
             return;
        }

            console.log("Performing initial data load into cache...");
            showLoading();
            const { data: tasksData, error: tasksError } = await supabaseClient.from('tasks').select('*');
            
            if(tasksError) throw tasksError;

            tasksCache = tasksData || [];
            console.log(`Loaded ${tasksCache.length} tasks.`);

            appContainer.classList.remove('hidden');
            hideLoading();
            switchView('dashboard');
            setupRealtimeSubscriptions();
        } catch(e) {
            alert('Lỗi khởi tạo Supabase. Vui lòng kiểm tra lại URL và Key. Lỗi: ' + e.message);
            localStorage.clear();
            showSupabaseModal();
        }
    } else {
        showSupabaseModal();
    }
})();
