// utils/UIUtils.js

import { currentFilters, CATEGORIES, tasksCache, searchTerm } from '../state.js';
import { userProfile, teamMembers } from '../state.js';
import { weeklyViewContainer, monthlyViewContainer, dashboardViewContainer, kanbanViewContainer, listViewContainer, membersViewContainer, reportsViewContainer, searchAndFilterContainer, loadingSpinner, sidebar, sidebarBackdrop, currentViewTitle } from '../main.js';
import { renderWeeklyView } from '../components/WeeklyView.js';
import { renderMonthlyView } from '../components/MonthlyView.js';
import { renderDashboardView } from '../components/DashboardView.js';
import { renderKanbanView } from '../components/KanbanView.js';
import { renderListView } from '../components/ListView.js';
import { renderMembersView } from '../components/MembersView.js';
import { renderReportsView } from '../components/ReportView.js';
import { chartInstances, currentView } from '../state.js';

export function showLoading() {
    loadingSpinner.classList.remove('hidden');
    [weeklyViewContainer, monthlyViewContainer, dashboardViewContainer, kanbanViewContainer, listViewContainer, membersViewContainer, reportsViewContainer, searchAndFilterContainer].forEach(el => el.classList.add('hidden'));
}

export function hideLoading() { loadingSpinner.classList.add('hidden'); }

export function getFilteredTasksFromCache() {
    return tasksCache.filter(task => {
        const priorityMatch = currentFilters.priority === 'all' || task.priority === currentFilters.priority;
        const categoryMatch = currentFilters.category === 'all' || task.category === currentFilters.category;
        
        let personMatch = true;
        if (currentFilters.person === 'unassigned') {
            personMatch = !task.assigned_to_email;
        } else if (currentFilters.person !== 'all') {
            personMatch = task.assigned_to_email === currentFilters.person;
        }

        const searchMatch = searchTerm === '' || (task.content && task.content.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return priorityMatch && categoryMatch && personMatch && searchMatch;
    });
}

export function renderCurrentView() {
    const viewRenderers = {
        week: renderWeeklyView, month: renderMonthlyView,
        dashboard: renderDashboardView, kanban: renderKanbanView,
        list: renderListView, members: renderMembersView, reports: renderReportsView,
    };
    const viewsWithFilters = ['dashboard', 'kanban', 'list', 'members', 'week', 'reports'];

    if (viewsWithFilters.includes(currentView)) {
        searchAndFilterContainer.classList.remove('hidden');
        renderFilters();
    } else {
        searchAndFilterContainer.classList.add('hidden');
    }
    if(viewRenderers[currentView]) viewRenderers[currentView]();
}

export function renderFilters() {
    const priorityFilter = document.getElementById('priority-filter');
    priorityFilter.innerHTML = `<option value="all">Tất cả</option>` + Object.keys(PRIORITIES).map(p => `<option value="${p}" ${currentFilters.priority === p ? 'selected' : ''}>${p}</option>`).join('');

    const uniqueCategories = [...new Set(tasksCache.map(t => t.category).filter(Boolean))];
    CATEGORIES = [...new Set([...CATEGORIES, ...uniqueCategories])];
    
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.innerHTML = `<option value="all">Tất cả</option>` + CATEGORIES.map(c => `<option value="${c}" ${currentFilters.category === c ? 'selected' : ''}>${c}</option>`).join('');
    
    const personFilter = document.getElementById('person-filter');
    const allUsers = [userProfile, ...teamMembers];
    personFilter.innerHTML = `<option value="all">Tất cả</option>` + `<option value="unassigned">Chưa giao</option>` + allUsers.map(u => `<option value="${u.email}" ${currentFilters.person === u.email ? 'selected' : ''}>${u.name}</option>`).join('');
}

export function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    sidebarBackdrop.classList.toggle('hidden');
}

export function switchView(view) {
    if (currentView === view && view !== 'dashboard') return;
    currentView = view;
    
    const allViewIds = ['weekly-view-container', 'monthly-view-container', 'dashboard-view-container', 'kanban-view-container', 'list-view-container', 'members-view-container', 'reports-view-container'];
    allViewIds.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = ''; 
            container.classList.add('hidden');
        }
    });
    
    document.querySelectorAll('#sidebar-nav .sidebar-item').forEach(el => el.classList.remove('active'));
    const newActiveItem = document.querySelector(`#sidebar-nav .sidebar-item[data-view="${view}"]`);
    if (newActiveItem) newActiveItem.classList.add('active');
    
    const viewTitles = { dashboard: 'Dashboard', week: 'Lịch Tuần', month: 'Lịch Tháng', kanban: 'Bảng Kanban', list: 'Danh sách', members: 'Nhân sự', reports: 'Báo cáo' };
    if(currentViewTitle) currentViewTitle.textContent = viewTitles[view] || 'Dashboard';

    if (view !== 'week') {
        weeklyViewController.abort();
        weeklyViewController = new AbortController();
    }
    if (view !== 'dashboard' && view !== 'reports') {
        Object.values(chartInstances).forEach(chart => chart.destroy());
        chartInstances = {};
    }
    
    renderCurrentView();
}
