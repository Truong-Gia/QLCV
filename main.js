import { state, CONSTANTS } from './state.js';
import { supabaseService } from './services/supabaseService.js';
import { debounce } from './utils/uiUtils.js';
import { stringToColor } from './utils/uiUtils.js';
import * as Modals from './components/Modals.js';
import { renderDashboardView } from './components/DashboardView.js';
import { renderKanbanView } from './components/KanbanView.js';
import { renderListView } from './components/ListView.js';
import { renderMembersView } from './components/MembersView.js';
import { renderMonthlyView } from './components/MonthlyView.js';
import { renderWeeklyView } from './components/WeeklyView.js';
import { renderReportsView } from './components/ReportView.js';

// --- DOM Elements ---
const appContainer = document.getElementById('app-container');
const loadingSpinner = document.getElementById('loading-spinner');
const searchAndFilterContainer = document.getElementById('search-and-filter-container');
const sidebarNav = document.getElementById('sidebar-nav');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const hamburgerBtn = document.getElementById('hamburger-btn');
const currentViewTitle = document.getElementById('current-view-title');

// --- Helper Functions ---
function showLoading() {
    loadingSpinner.classList.remove('hidden');
    document.querySelectorAll('main > div[id$="-container"]').forEach(el => el.classList.add('hidden'));
}
function hideLoading() { loadingSpinner.classList.add('hidden'); }

function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    sidebarBackdrop.classList.toggle('hidden');
}

// --- Data Filtering ---
export function getFilteredTasksFromCache() {
    return state.tasksCache.filter(task => {
        const { priority, category, person } = state.currentFilters;
        const priorityMatch = priority === 'all' || task.priority === priority;
        const categoryMatch = category === 'all' || task.category === category;
        
        let personMatch = true;
        if (person === 'unassigned') personMatch = !task.assigned_to_email;
        else if (person !== 'all') personMatch = task.assigned_to_email === person;

        const searchMatch = state.searchTerm === '' || (task.content && task.content.toLowerCase().includes(state.searchTerm.toLowerCase()));
        
        return priorityMatch && categoryMatch && personMatch && searchMatch;
    });
}

// --- View Rendering ---
const viewRenderers = {
    dashboard: renderDashboardView,
    week: renderWeeklyView,
    month: renderMonthlyView,
    kanban: renderKanbanView,
    list: renderListView,
    members: renderMembersView,
    reports: renderReportsView,
};

export function renderCurrentView() {
    const viewsWithFilters = ['dashboard', 'kanban', 'list', 'members', 'week', 'reports'];
    searchAndFilterContainer.classList.toggle('hidden', !viewsWithFilters.includes(state.currentView));

    if (viewsWithFilters.includes(state.currentView)) {
        renderFilters();
    }
    
    if (viewRenderers[state.currentView]) {
        viewRenderers[state.currentView]();
    }
}

function switchView(view) {
    if (state.currentView === view) return;
    state.currentView = view;
    
    document.querySelectorAll('main > div[id$="-container"]').forEach(el => {
        el.innerHTML = '';
        el.classList.add('hidden');
    });
    
    document.querySelectorAll('#sidebar-nav .sidebar-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`#sidebar-nav .sidebar-item[data-view="${view}"]`).classList.add('active');
    
    const viewTitles = { dashboard: 'Dashboard', week: 'Lịch Tuần', month: 'Lịch Tháng', kanban: 'Bảng Kanban', list: 'Danh sách', members: 'Nhân sự', reports: 'Báo cáo' };
    currentViewTitle.textContent = viewTitles[view] || 'Dashboard';
    
    // Cleanup charts if not on a view that uses them
    if (view !== 'dashboard' && view !== 'reports') {
        Object.values(state.chartInstances).forEach(chart => chart.destroy());
        state.chartInstances = {};
    }

    renderCurrentView();
}


// --- User Management ---
function loadUserData() {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) state.userProfile = JSON.parse(savedProfile);
    const savedTeam = localStorage.getItem('teamMembers');
    if (savedTeam) state.teamMembers = JSON.parse(savedTeam);
    updateProfileUI();
}

function saveUserData() {
    localStorage.setItem('userProfile', JSON.stringify(state.userProfile));
    localStorage.setItem('teamMembers', JSON.stringify(state.teamMembers));
}

function updateProfileUI() {
    const nameDisplay = document.getElementById('user-name-display');
    const avatarDisplay = document.getElementById('user-avatar');
    nameDisplay.textContent = state.userProfile.name || 'Hồ sơ';
    avatarDisplay.textContent = state.userProfile.name ? state.userProfile.name.charAt(0).toUpperCase() : '?';
    avatarDisplay.style.backgroundColor = stringToColor(state.userProfile.email || '');
}

// --- Filters ---
function renderFilters() {
    const priorityFilter = document.getElementById('priority-filter');
    priorityFilter.innerHTML = `<option value="all">Tất cả</option>` + Object.keys(CONSTANTS.PRIORITIES).map(p => `<option value="${p}" ${state.currentFilters.priority === p ? 'selected' : ''}>${p}</option>`).join('');

    const uniqueCategories = [...new Set(state.tasksCache.map(t => t.category).filter(Boolean))];
    let allCategories = [...new Set([...CONSTANTS.CATEGORIES, ...uniqueCategories])];
    
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.innerHTML = `<option value="all">Tất cả</option>` + allCategories.map(c => `<option value="${c}" ${state.currentFilters.category === c ? 'selected' : ''}>${c}</option>`).join('');
    
    const personFilter = document.getElementById('person-filter');
    const allUsers = [state.userProfile, ...state.teamMembers];
    personFilter.innerHTML = `<option value="all">Tất cả</option><option value="unassigned">Chưa giao</option>` + allUsers.map(u => `<option value="${u.email}" ${state.currentFilters.person === u.email ? 'selected' : ''}>${u.name}</option>`).join('');
}


// --- Initialization and Event Listeners ---
function setupEventListeners() {
    hamburgerBtn.addEventListener('click', toggleSidebar);
    sidebarBackdrop.addEventListener('click', toggleSidebar);
    document.getElementById('profile-btn').addEventListener('click', Modals.openProfileModal); // You'll need to create this in Modals.js
    document.getElementById('fab-add-task').addEventListener('click', () => Modals.openAddTaskModal());

    sidebarNav.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('.sidebar-item');
        if (target) {
            switchView(target.dataset.view);
            if (window.innerWidth < 1024) toggleSidebar();
        }
    });

    document.getElementById('priority-filter').addEventListener('change', (e) => { state.currentFilters.priority = e.target.value; renderCurrentView(); });
    document.getElementById('category-filter').addEventListener('change', (e) => { state.currentFilters.category = e.target.value; renderCurrentView(); });
    document.getElementById('person-filter').addEventListener('change', (e) => { state.currentFilters.person = e.target.value; renderCurrentView(); });
    document.getElementById('search-input').addEventListener('input', debounce((e) => {
        state.searchTerm = e.target.value;
        renderCurrentView();
    }, 300));

    appContainer.addEventListener('click', (e) => {
        const target = e.target;
        const editButton = target.closest('.edit-task-btn');
        if (editButton) {
            e.preventDefault();
            e.stopPropagation();
            Modals.openEditTaskModal(editButton.dataset.taskId);
            return;
        }
        
        const taskElement = target.closest('.task-item-clickable');
        if (taskElement && !target.matches('input[type="checkbox"]')) {
            e.preventDefault();
            Modals.openEditTaskModal(taskElement.dataset.taskId);
        }
    });
}

function handleRealtimeChange(payload) {
    console.log('Real-time change received!', payload);
    const { table, eventType, new: newRecord, old: oldRecord } = payload;
    let cacheUpdated = false;

    if (table === 'tasks') {
        if (eventType === 'INSERT' && !state.tasksCache.some(t => t.id === newRecord.id)) {
            state.tasksCache.push(newRecord);
            cacheUpdated = true;
        } else if (eventType === 'UPDATE') {
            const index = state.tasksCache.findIndex(t => t.id === newRecord.id);
            if (index > -1) {
                state.tasksCache[index] = newRecord;
                cacheUpdated = true;
            }
        } else if (eventType === 'DELETE') {
            const initialLength = state.tasksCache.length;
            state.tasksCache = state.tasksCache.filter(t => t.id !== oldRecord.id);
            if (state.tasksCache.length < initialLength) {
                cacheUpdated = true;
            }
        }
    }
    if (cacheUpdated) renderCurrentView();
}


async function init() {
    loadUserData();
    setupEventListeners();

    const savedUrl = localStorage.getItem('supabaseUrl');
    const savedKey = localStorage.getItem('supabaseKey');

    if (savedUrl && savedKey) {
        try {
            await supabaseService.initialize(savedUrl, savedKey);
            const { error: testError } = await supabaseService.testConnection();
            if (testError) throw testError;

            console.log("Performing initial data load into cache...");
            showLoading();
            const { data: tasksData, error: tasksError } = await supabaseService.getAllTasks();
            if(tasksError) throw tasksError;

            state.tasksCache = tasksData || [];
            console.log(`Loaded ${state.tasksCache.length} tasks.`);

            appContainer.classList.remove('hidden');
            hideLoading();
            switchView('dashboard');
            supabaseService.subscribeToChanges(handleRealtimeChange);

        } catch(e) {
            alert('Lỗi khởi tạo Supabase. Vui lòng kiểm tra lại URL, Key và thiết lập SQL. Lỗi: ' + e.message);
            localStorage.clear();
            // showSupabaseModal(); // You need to implement this in Modals.js
        }
    } else {
        // showSupabaseModal(); // You need to implement this in Modals.js
        alert('Vui lòng cấu hình Supabase trước.');
    }
}

// Start the application
init();
