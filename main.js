import { getSupabaseClient, showSupabaseModal } from './services/supabaseService.js';
import { renderWeeklyView } from './components/WeeklyView.js';
import { renderMonthlyView } from './components/MonthlyView.js';
import { renderDashboardView } from './components/DashboardView.js';
import { renderKanbanView } from './components/KanbanView.js';
import { openProfileModal } from './components/Modals.js';
import { showLoading, hideLoading } from './utils/uiUtils.js';

// --- State ---
window.state = {
    currentDate: new Date(),
    currentView: 'week',
    chartInstances: {},
    currentFilters: { priority: 'all', category: 'all', person: 'all' },
    userProfile: { name: 'Tôi', email: 'me@example.com' },
    teamMembers: [],
};

// --- DOM Elements ---
const appContainer = document.getElementById('app-container');
const quoteDisplay = document.getElementById('quote-display');
const toggleButtons = {
    week: document.getElementById('toggle-week-view'),
    month: document.getElementById('toggle-month-view'),
    dashboard: document.getElementById('toggle-dashboard-view'),
    kanban: document.getElementById('toggle-kanban-view')
};
const quotes = ["Bí mật của sự tiến bộ là bắt đầu.", "Hãy là sự thay đổi mà bạn muốn thấy trên thế giới."];

// --- Core Functions ---
async function renderCurrentView() {
    showLoading();
    const viewRenderers = {
        week: renderWeeklyView,
        month: renderMonthlyView,
        dashboard: renderDashboardView,
        kanban: renderKanbanView,
    };
    
    if (viewRenderers[state.currentView]) {
        await viewRenderers[state.currentView]();
    }
    hideLoading();
}
window.renderCurrentView = renderCurrentView; // Make it globally accessible for components

function switchView(view) {
    if (view === state.currentView) return;
    state.currentView = view;
    
    Object.values(toggleButtons).forEach(btn => btn.classList.remove('active'));
    if (toggleButtons[view]) toggleButtons[view].classList.add('active');
    
    if (view !== 'dashboard') {
        Object.values(state.chartInstances).forEach(chart => chart.destroy());
        state.chartInstances = {};
    }
    renderCurrentView();
}

function loadUserData() {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) state.userProfile = JSON.parse(savedProfile);
    const savedTeam = localStorage.getItem('teamMembers');
    if (savedTeam) state.teamMembers = JSON.parse(savedTeam);
    updateProfileUI();
}

function updateProfileUI() {
    const nameDisplay = document.getElementById('user-name-display');
    const avatarDisplay = document.getElementById('user-avatar');
    nameDisplay.textContent = state.userProfile.name || 'Hồ sơ';
    avatarDisplay.textContent = state.userProfile.name ? state.userProfile.name.charAt(0).toUpperCase() : '?';
}

// --- INITIALIZATION ---
(async function init() {
    loadUserData();
    
    Object.keys(toggleButtons).forEach(key => {
        toggleButtons[key].addEventListener('click', () => switchView(key));
    });
    document.getElementById('profile-btn').addEventListener('click', openProfileModal);

    const supabase = getSupabaseClient();
    if (supabase) {
        window.supabase = supabase; // Make it globally accessible
        appContainer.classList.remove('hidden');
        quoteDisplay.textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
        await renderCurrentView();
    } else {
        showSupabaseModal();
    }
})();
