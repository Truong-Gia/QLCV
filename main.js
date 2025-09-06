import { getState, setState } from './state.js';
import { initializeSupabase, showSupabaseModal } from './services/supabaseService.js';
import { showLoading, hideLoading } from './utils/uiUtils.js';
import { renderWeeklyView } from './components/WeeklyView.js';
import { renderMonthlyView } from './components/MonthlyView.js';
import { renderDashboardView } from './components/DashboardView.js';
import { renderKanbanView } from './components/KanbanView.js';
import { openProfileModal } from './components/Modals.js';

// --- DOM Elements ---
const appContainer = document.getElementById('app-container');
const quoteDisplay = document.getElementById('quote-display');
const viewButtons = {
    week: document.getElementById('toggle-week-view'),
    month: document.getElementById('toggle-month-view'),
    dashboard: document.getElementById('toggle-dashboard-view'),
    kanban: document.getElementById('toggle-kanban-view'),
};

const quotes = ["Bí mật của sự tiến bộ là bắt đầu.", "Hãy là sự thay đổi mà bạn muốn thấy trên thế giới.", "Cách tốt nhất để dự đoán tương lai là tạo ra nó.", "Có công mài sắt, có ngày nên kim.", "Một dự án của Trương Hải Lâm.", "Chúc bạn một ngày làm việc đầy năng lượng."];

// --- Core App Logic ---

async function renderCurrentView() {
    showLoading();
    const { currentView } = getState();
    
    const viewRenderers = {
        week: renderWeeklyView,
        month: renderMonthlyView,
        dashboard: renderDashboardView,
        kanban: renderKanbanView,
    };
    
    // Hide all views first
    Object.keys(viewRenderers).forEach(view => {
        document.getElementById(`${view}-view-container`).classList.add('hidden');
    });

    if (viewRenderers[currentView]) {
        await viewRenderers[currentView]();
    }
    
    hideLoading();
}
// Make it globally accessible for components that need to trigger a re-render
window.renderCurrentView = renderCurrentView; 

function switchView(view) {
    const { currentView } = getState();
    if (view === currentView) return;
    
    setState({ currentView: view });

    Object.values(viewButtons).forEach(btn => btn.classList.remove('active'));
    viewButtons[view].classList.add('active');
    
    // Clear charts if switching away from dashboard
    if (view !== 'dashboard') {
        const { chartInstances } = getState();
        Object.values(chartInstances).forEach(chart => chart.destroy());
        setState({ chartInstances: {} });
    }
    
    renderCurrentView();
}

function loadUserData() {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) setState({ userProfile: JSON.parse(savedProfile) });
    
    const savedTeam = localStorage.getItem('teamMembers');
    if (savedTeam) setState({ teamMembers: JSON.parse(savedTeam) });
    
    updateProfileUI();
}

function updateProfileUI() {
    const { userProfile } = getState();
    const nameDisplay = document.getElementById('user-name-display');
    const avatarDisplay = document.getElementById('user-avatar');
    nameDisplay.textContent = userProfile.name || 'Hồ sơ';
    avatarDisplay.textContent = userProfile.name ? userProfile.name.charAt(0).toUpperCase() : '?';
}
window.updateProfileUI = updateProfileUI; // Make it global for modals to call

// --- INITIALIZATION ---
(async function init() {
    const supabase = initializeSupabase();
    if (supabase) {
        setState({ supabaseClient: supabase });
        
        loadUserData();
        
        // Setup event listeners
        document.getElementById('profile-btn').addEventListener('click', openProfileModal);
        Object.keys(viewButtons).forEach(key => {
            viewButtons[key].addEventListener('click', () => switchView(key));
        });
        
        appContainer.classList.remove('hidden');
        quoteDisplay.textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;
        await renderCurrentView();
    } else {
        showSupabaseModal();
    }
})();

