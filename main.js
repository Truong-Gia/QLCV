import { currentView, setCurrentView, currentFilters, quotes, userProfile, teamMembers, PRIORITIES, CATEGORIES } from './state.js';
import { showLoading, hideLoading, updateProfileUI } from './utils/uiUtils.js';
import { initializeSupabase, getUniqueCategories } from './services/supabaseService.js';
import { renderWeeklyView } from './components/WeeklyView.js';
import { renderMonthlyView } from './components/MonthlyView.js';
import { renderDashboardView } from './components/DashboardView.js';
import { renderKanbanView } from './components/KanbanView.js';
import { openProfileModal, showSupabaseModal } from './components/Modals.js';
import { updateCategories } from './state.js';


// --- DOM Elements ---
const domElements = {
    appContainer: document.getElementById('app-container'),
    loadingSpinner: document.getElementById('loading-spinner'),
    quoteDisplay: document.getElementById('quote-display'),
    weeklyViewContainer: document.getElementById('weekly-view-container'),
    monthlyViewContainer: document.getElementById('monthly-view-container'),
    dashboardViewContainer: document.getElementById('dashboard-view-container'),
    kanbanViewContainer: document.getElementById('kanban-view-container'),
    filtersContainer: document.getElementById('filters-container'),
    toggleWeekBtn: document.getElementById('toggle-week-view'),
    toggleMonthBtn: document.getElementById('toggle-month-view'),
    toggleDashboardBtn: document.getElementById('toggle-dashboard-view'),
    toggleKanbanBtn: document.getElementById('toggle-kanban-view'),
};

// --- USER & TEAM MANAGEMENT ---
function loadUserData() {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        userProfile.name = parsedProfile.name;
        userProfile.email = parsedProfile.email;
    }
    const savedTeam = localStorage.getItem('teamMembers');
    if (savedTeam) {
        const parsedTeam = JSON.parse(savedTeam);
        teamMembers.length = 0;
        Array.prototype.push.apply(teamMembers, parsedTeam);
    }
    updateProfileUI(userProfile);
}

export function saveUserData() {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
    updateProfileUI(userProfile);
}


// --- RENDER FUNCTIONS ---
async function renderFilters() {
    const priorityFilter = document.getElementById('priority-filter');
    priorityFilter.innerHTML = `<option value="all">Tất cả</option>` + Object.keys(PRIORITIES).map(p => `<option value="${p}" ${currentFilters.priority === p ? 'selected' : ''}>${p}</option>`).join('');
    
    const { data } = await getUniqueCategories();
    if (data) {
        updateCategories(data.map(t => t.category).filter(Boolean));
    }
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.innerHTML = `<option value="all">Tất cả</option>` + CATEGORIES.map(c => `<option value="${c}" ${currentFilters.category === c ? 'selected' : ''}>${c}</option>`).join('');
    
    const personFilter = document.getElementById('person-filter');
    const allUsers = [userProfile, ...teamMembers];
    personFilter.innerHTML = `<option value="all">Tất cả</option>` + `<option value="unassigned">Chưa giao</option>` + allUsers.map(u => `<option value="${u.email}" ${currentFilters.person === u.email ? 'selected' : ''}>${u.name}</option>`).join('');
}


export async function renderCurrentView() {
    showLoading(domElements);
    const viewRenderers = {
        week: renderWeeklyView,
        month: renderMonthlyView,
        dashboard: renderDashboardView,
        kanban: renderKanbanView,
    };
    
    const filtersViews = ['dashboard', 'kanban'];
    if (filtersViews.includes(currentView)) {
        domElements.filtersContainer.classList.remove('hidden');
        await renderFilters();
    } else {
        domElements.filtersContainer.classList.add('hidden');
    }

    if (viewRenderers[currentView]) {
        await viewRenderers[currentView]();
    }
    hideLoading(domElements);
}

function switchView(view) {
    if (view === currentView) return;
    setCurrentView(view);
    
    const buttons = {
        week: domElements.toggleWeekBtn,
        month: domElements.toggleMonthBtn,
        dashboard: domElements.toggleDashboardBtn,
        kanban: domElements.toggleKanbanBtn
    };
    Object.values(buttons).forEach(btn => btn?.classList.remove('active'));
    if (buttons[view]) buttons[view].classList.add('active');
    
    renderCurrentView();
}


// --- INITIALIZATION ---
(async function init() {
    loadUserData();
    
    // Setup global event listeners
    document.getElementById('profile-btn').addEventListener('click', openProfileModal);
    domElements.toggleWeekBtn.addEventListener('click', () => switchView('week'));
    domElements.toggleMonthBtn.addEventListener('click', () => switchView('month'));
    domElements.toggleDashboardBtn.addEventListener('click', () => switchView('dashboard'));
    domElements.toggleKanbanBtn.addEventListener('click', () => switchView('kanban'));
    
    document.getElementById('priority-filter').addEventListener('change', (e) => { currentFilters.priority = e.target.value; renderCurrentView(); });
    document.getElementById('category-filter').addEventListener('change', (e) => { currentFilters.category = e.target.value; renderCurrentView(); });
    document.getElementById('person-filter').addEventListener('change', (e) => { currentFilters.person = e.target.value; renderCurrentView(); });

    const savedUrl = localStorage.getItem('supabaseUrl');
    const savedKey = localStorage.getItem('supabaseKey');

    if (savedUrl && savedKey) {
        if (initializeSupabase(savedUrl, savedKey)) {
            domElements.appContainer.classList.remove('hidden');
            domElements.quoteDisplay.textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
            await renderCurrentView();
        } else {
            alert('Lỗi khởi tạo Supabase. Vui lòng kiểm tra lại URL và Key.');
            localStorage.clear();
            showSupabaseModal();
        }
    } else {
        showSupabaseModal();
    }
})();
