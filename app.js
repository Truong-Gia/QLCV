import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
let supabaseClient;

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

let currentDate = new Date();
let currentView = 'dashboard';
let chartInstances = {};
let currentFilters = { priority: 'all', category: 'all', person: 'all' };
let userProfile = { name: 'Tôi', email: 'me@example.com' };
let teamMembers = [];
let searchTerm = '';
let sortConfig = { key: 'due_date', direction: 'ascending' };

let tasksCache = [];

const PRIORITIES = { 'Cao': 'bg-red-100 text-red-800', 'Trung bình': 'bg-yellow-100 text-yellow-800', 'Thấp': 'bg-blue-100 text-blue-800' };
let CATEGORIES = ['Chung', 'Công việc', 'Cá nhân', 'Học tập', 'Dự án'];
const STATUSES = ['Cần làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'];
const STATUS_COLORS = { 'Cần làm': 'bg-red-200 text-red-800', 'Đang làm': 'bg-orange-200 text-orange-800', 'Hoàn thành': 'bg-green-200 text-green-800', 'Tạm dừng': 'bg-gray-200 text-gray-800' };
const STATUS_CHART_COLORS = { 'Cần làm': '#fca5a5', 'Đang làm': '#fdba74', 'Hoàn thành': '#86efac', 'Tạm dừng': '#d1d5db' };
const PRIORITY_COLORS = { 'Cao': '#ef4444', 'Trung bình': '#f59e0b', 'Thấp': '#3b82f6' };
const CATEGORY_COLORS = ['#6366f1', '#38bdf8', '#34d399', '#facc15', '#a855f7', '#ec4899'];
const KANBAN_COLUMN_COLORS = { 
    'Cần làm': 'bg-red-50/70 border border-red-200/80', 
    'Đang làm': 'bg-orange-50/70 border border-orange-200/80', 
    'Hoàn thành': 'bg-green-50/70 border border-green-200/80', 
    'Tạm dừng': 'bg-gray-100/80 border border-gray-200/80' 
};

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
    const footer = `<button id="open-settings-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300">Cài đặt</button>
                    <button id="save-profile-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu thay đổi</button>`;
    
    const modalElement = showModal('Hồ sơ & Quản lý Nhóm', body, footer);
    const closeModal = setupModalEvents(modalElement);
    
    modalElement.querySelector('#open-settings-btn').addEventListener('click', () => {
        closeModal();
        openSettingsModal();
    });
    
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
            .filter(line => line)
            .map(line => {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const email = parts.pop().trim();
                    const name = parts.join(',').trim();
                    if (name && email.includes('@')) return { name, email };
                } else if (line.includes('@')) {
                    const email = line.trim();
                    const name = email.split('@')[0];
                    return { name, email };
                }
                return null;
            }).filter(Boolean);

        saveUserData();
        updateProfileUI();
        renderCurrentView();
        closeModal();
    });
}

function openSettingsModal() {
    const body = `
        <div class="space-y-4">
            <h4 class="text-lg font-semibold text-red-600">Khu vực nguy hiểm</h4>
            <p class="text-sm text-gray-600">Các hành động sau đây không thể hoàn tác. Hãy chắc chắn trước khi tiếp tục.</p>
            <div>
                <button id="delete-all-data-btn" class="w-full px-4 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700">Xóa Toàn Bộ Dữ Liệu</button>
                <p class="text-xs text-gray-500 mt-1">Thao tác này sẽ xóa vĩnh viễn tất cả công việc và ghi chú cho mọi người dùng trong project Supabase này.</p>
            </div>
        </div>`;
    
    const modalElement = showModal('Cài đặt Nâng cao', body, '');
    const closeModal = setupModalEvents(modalElement);

    modalElement.querySelector('#delete-all-data-btn').addEventListener('click', async () => {
        const confirmation = prompt('HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC.\nTất cả công việc và ghi chú sẽ bị xóa vĩnh viễn cho TẤT CẢ NGƯỜI DÙNG.\n\nGõ "xóa tất cả" để xác nhận.');
        if (confirmation === 'xóa tất cả') {
            const { error } = await supabaseClient.rpc('truncate_all_data');
            if (error) {
                alert('Đã xảy ra lỗi khi xóa dữ liệu: ' + error.message);
            } else {
                alert('Toàn bộ dữ liệu đã được xóa thành công.');
                closeModal();
                location.reload(); 
            }
        } else {
            alert('Hành động đã được hủy.');
        }
    });
}

function stringToColor(str) {
    if (!str) return '#e0e7ff';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + (value & 0xCF | 0x30)).toString(16).substr(-2);
    }
    return color;
}

function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 80%, 92%)`;
}

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekDays = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return Array.from({ length: 7 }).map((_, i) => new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
};

const debounce = (func, timeout = 300) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
};

function showLoading() {
    loadingSpinner.classList.remove('hidden');
    [weeklyViewContainer, monthlyViewContainer, dashboardViewContainer, kanbanViewContainer, listViewContainer, membersViewContainer, reportsViewContainer, searchAndFilterContainer].forEach(el => el.classList.add('hidden'));
}
function hideLoading() { loadingSpinner.classList.add('hidden'); }

function showModal(title, bodyHTML, footerHTML) {
    const modalId = `modal-${Date.now()}`;
    const modalElement = document.createElement('div');
    modalElement.id = modalId;
    modalElement.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4';
    modalElement.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all glass-effect">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 class="text-lg font-semibold">${title}</h3>
                <button class="p-1 rounded-full hover:bg-gray-200/50" data-close-modal="${modalId}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="p-6 modal-body max-h-[70vh] overflow-y-auto">${bodyHTML}</div>
            <div class="p-4 bg-gray-50/50 border-t flex justify-end items-center">${footerHTML}</div>
        </div>`;
    
    modalsContainer.appendChild(modalElement);
    return modalElement;
}

function setupModalEvents(modalElement) {
    const modalId = modalElement.id;
    const closeModal = () => modalElement.remove();
    modalElement.querySelector(`[data-close-modal="${modalId}"]`).addEventListener('click', closeModal);
    return closeModal;
}

function getFilteredTasksFromCache() {
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

function renderCurrentView() {
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

function renderFilters() {
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

function renderWeeklyView() {
    weeklyViewContainer.classList.remove('hidden');
    const weekDays = getWeekDays(currentDate);
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];

    weeklyViewContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div class="lg:col-span-1 p-4 rounded-lg shadow-sm flex flex-col justify-between glass-effect">
                <div id="calendar-container"></div>
            </div>
            <div class="lg:col-span-3 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 glass-effect">
                <div class="flex items-center gap-2">
                    <button id="prev-week" class="p-2 rounded-md hover:bg-gray-100/50"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button>
                    <button id="today-btn" class="px-4 py-2 text-sm font-semibold bg-gray-100/50 hover:bg-gray-200/70 rounded-md">Hôm nay</button>
                    <button id="next-week" class="p-2 rounded-md hover:bg-gray-100/50"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>
                </div>
                <h2 id="week-range" class="text-xl font-semibold order-first sm:order-none"></h2>
                <div class="w-full sm:w-2/5">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium">Tiến độ tuần</span>
                        <span id="weekly-progress-text" class="font-bold">0%</span>
                    </div>
                    <div class="bg-gray-200 rounded-full h-2.5">
                        <div id="weekly-progress-bar" class="bg-indigo-600 h-2.5 rounded-full" style="width: 0%;"></div>
                    </div>
                </div>
            </div>
        </div>
        <div id="weekly-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6"></div>
    `;
    
    document.getElementById('week-range').textContent = `${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')}`;
    renderCalendar(currentDate);
    
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(weekEnd);

    const tasks = getFilteredTasksFromCache();
    const tasksForWeek = tasks.filter(t => t.due_date >= weekStartStr && t.due_date <= weekEndStr);
    
    renderWeeklyGrid(weekDays, tasksForWeek);
    updateWeeklyProgress(tasksForWeek);
    setupWeeklyViewEventListeners();
}

function renderWeeklyGrid(weekDays, tasks) {
    const weeklyGrid = document.getElementById('weekly-grid');
    if (!weeklyGrid) return;
    weeklyGrid.innerHTML = weekDays.map(day => {
        const dayStr = formatDate(day);
        const tasksForDay = tasks.filter(t => t.due_date === dayStr);
        const progress = tasksForDay.length > 0 ? (tasksForDay.filter(t => t.is_completed).length / tasksForDay.length) * 100 : 0;
        
        return `
        <div class="p-4 rounded-lg shadow-sm flex flex-col bg-white border border-gray-200/80">
            <div class="flex justify-between items-center mb-4">
                <div class="text-center">
                    <p class="font-semibold text-lg">${day.toLocaleDateString('vi-VN', { weekday: 'short' })}</p>
                    <p class="text-sm text-gray-500">${day.getDate()}</p>
                </div>
                <div class="donut-chart" style="--progress: ${progress}%">
                    <div class="chart-text">${Math.round(progress)}<span class="text-xs">%</span></div>
                </div>
            </div>
            
            <h4 class="font-semibold text-sm mb-2 mt-2 border-t pt-2 border-gray-400/30">Công việc</h4>
            <div class="task-list flex-grow space-y-2 overflow-y-auto max-h-48 pr-2">
                ${tasksForDay.length > 0 ? tasksForDay.map(renderTask).join('') : '<p class="text-xs text-gray-400">Không có công việc nào.</p>'}
            </div>
        </div>`;
    }).join('');
}

function renderTask(task) {
    const priorityClass = PRIORITIES[task.priority] || PRIORITIES['Trung bình'];
    const categoryClass = task.category ? 'bg-gray-100 text-gray-800' : '';
    const assignedUserHTML = task.assigned_to_name 
        ? `<div class="flex items-center gap-1 mt-1"><div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span class="text-xs text-gray-600">${task.assigned_to_name}</span></div>` 
        : '';

    return `
        <div class="p-2 rounded-md border ${task.is_completed ? 'bg-white/20' : 'bg-white/80'} border-gray-400/20 task-item-clickable relative group" data-task-id="${task.id}">
            <div class="flex items-start gap-2">
                <input type="checkbox" class="task-checkbox mt-1 flex-shrink-0" data-task-id="${task.id}" ${task.is_completed ? 'checked' : ''}>
                <p class="flex-grow text-sm ${task.is_completed ? 'line-through text-gray-400' : ''}">${task.content}</p>
            </div>
            <div class="mt-2 ml-6 space-y-1">
                <div class="flex items-center flex-wrap gap-2">
                    <span class="task-tag ${priorityClass}">${task.priority || 'Trung bình'}</span>
                    ${task.category ? `<span class="task-tag ${categoryClass}">${task.category}</span>` : ''}
                </div>
                ${assignedUserHTML}
            </div>
            <button class="edit-task-btn absolute top-1 right-1 p-1 rounded-full bg-white/50 text-gray-500 hover:bg-gray-200/80 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" data-task-id="${task.id}">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
            </button>
        </div>
    `;
}

function renderCalendar(dateToRender) {
     const calendarContainer = document.getElementById('calendar-container');
     if (!calendarContainer) return;
     const today = new Date();
     const month = dateToRender.getMonth();
     const year = dateToRender.getFullYear();
     const firstDayOfMonth = new Date(year, month, 1);
     const daysInMonth = new Date(year, month + 1, 0).getDate();
     let startingDay = firstDayOfMonth.getDay();
     startingDay = startingDay === 0 ? 6 : startingDay - 1; 

     let calendarHTML = `
        <div class="flex justify-between items-center mb-2">
            <h4 class="font-semibold">${dateToRender.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}</h4>
        </div>
        <div class="calendar-grid text-sm">
            ${['T2','T3','T4','T5','T6','T7','CN'].map(day => `<div class="font-bold text-gray-500">${day}</div>`).join('')}
     `;
     
     for(let i = 0; i < startingDay; i++) { calendarHTML += `<div></div>`; }

     const weekDays = getWeekDays(dateToRender);
     const weekDayStrings = weekDays.map(d => formatDate(d));

     for(let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(year, month, i);
        const dayStr = formatDate(dayDate);
        let classes = 'calendar-day py-1';
        if(weekDayStrings.includes(dayStr)) classes += ' week-highlight';
        if(i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) classes += ' current-day';
        calendarHTML += `<div class="${classes}">${i}</div>`;
     }
     calendarHTML += `</div>`;
     calendarContainer.innerHTML = calendarHTML;
}

function updateWeeklyProgress(tasks) {
    const weeklyProgressBar = document.getElementById('weekly-progress-bar');
    const weeklyProgressText = document.getElementById('weekly-progress-text');
    if (!weeklyProgressBar || !weeklyProgressText) return;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.is_completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    weeklyProgressBar.style.width = `${progress}%`;
    weeklyProgressText.textContent = `${progress}%`;
}

function getTaskMonthStatusIndicator(task) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDateParts = task.due_date.split('-').map(Number);
    const dueDate = new Date(dueDateParts[0], dueDateParts[1] - 1, dueDateParts[2]);
    dueDate.setHours(0, 0, 0, 0);

    if (task.is_completed) {
        const completedDate = new Date(task.completed_at);
        completedDate.setHours(0, 0, 0, 0);

        if (completedDate < dueDate) {
            return {
                title: 'Hoàn thành sớm hạn',
                iconHTML: `<svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`
            };
        }
        if (completedDate > dueDate) {
            return {
                title: 'Hoàn thành trễ hạn',
                iconHTML: `<svg class="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.01-1.742 3.01H4.42c-1.53 0-2.493-1.676-1.743-3.01l5.58-9.92zM10 5a1 1 0 011 1v3a1 1 0 11-2 0V6a1 1 0 011-1zm1 5a1 1 0 10-2 0v2a1 1 0 102 0v-2z" clip-rule="evenodd"></path></svg>`
            };
        }
        return {
            title: 'Hoàn thành đúng hạn',
            iconHTML: `<svg class="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
        };
    }

    if (dueDate < today) {
        return {
            title: 'Quá hạn',
            iconHTML: `<svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>`
        };
    }

    if (task.status === 'Đang làm') {
        return {
            title: 'Đang làm',
            iconHTML: `<svg class="w-3 h-3 text-orange-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM M8 5H6v2h2V5z m4 0h-2v2h2V5z m2 0h-2v2h2V5z"></path></svg>`
        };
    }

    return {
        title: 'Cần làm',
        iconHTML: `<svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9z m-4 0H9v2h2V9z" clip-rule="evenodd"></path></svg>`
    };
}

function renderMonthlyView() {
    monthlyViewContainer.classList.remove('hidden');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    let startDayOfWeek = firstDayOfMonth.getDay(); 
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    monthlyViewContainer.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm">
            <div class="p-4 flex justify-between items-center border-b border-gray-200">
                 <button id="prev-month" class="p-2 rounded-md hover:bg-gray-100"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button>
                 <h2 class="text-xl font-semibold">${firstDayOfMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}</h2>
                 <button id="next-month" class="p-2 rounded-md hover:bg-gray-100"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>
            </div>
            <div class="month-grid">
                ${['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ Nhật'].map(day => `<div class="p-2 text-center font-semibold text-sm text-gray-600">${day}</div>`).join('')}
                ${Array(startDayOfWeek).fill('').map(() => `<div class="month-day other-month"></div>`).join('')}
                ${Array.from({length: daysInMonth}, (_, i) => renderMonthDay(i + 1, month, year)).join('')}
            </div>
        </div>
    `;
    
    const tasksForMonth = tasksCache.filter(t => {
        const dateParts = t.due_date.split('-').map(Number);
        const taskDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        return taskDate.getFullYear() === year && taskDate.getMonth() === month;
    });

    tasksForMonth.forEach(task => {
        const dateParts = task.due_date.split('-').map(Number);
        const taskDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        const day = taskDate.getDate();
        
        const dayTasksContainer = document.querySelector(`.month-day[data-day="${day}"] .month-day-tasks`);
        if(dayTasksContainer) {
            const avatarHTML = task.assigned_to_name 
                ? `<div class="avatar text-white flex-shrink-0" style="width:14px; height:14px; font-size:0.6rem; background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div>` 
                : '';
            
            const statusIndicator = getTaskMonthStatusIndicator(task);

            dayTasksContainer.innerHTML += `
                <div class="month-task-item text-xs p-1 rounded bg-white/60 flex items-center gap-1.5 task-item-clickable" title="${task.content}" data-task-id="${task.id}">
                    ${avatarHTML}
                    <div class="flex-shrink-0" title="${statusIndicator.title}">${statusIndicator.iconHTML}</div>
                    <span class="truncate">${task.content}</span>
                </div>`;
        }
    });

    document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCurrentView(); });
    document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCurrentView(); });
}

function renderMonthDay(day, month, year) {
    const today = new Date();
    let dayClasses = 'month-day p-2 flex flex-col';
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayClasses += ' ring-2 ring-indigo-500 z-10';
    }

    return `
        <div class="${dayClasses}" data-day="${day}" style="background-color: ${getRandomPastelColor()};">
            <span class="font-medium ${day === today.getDate() && month === today.getMonth() ? 'text-indigo-600' : ''}">${day}</span>
            <div class="month-day-tasks mt-1 space-y-1 pr-1"></div>
        </div>
    `;
}

function openEarlyCompletionModal(tasks) {
    const title = 'Danh sách công việc hoàn thành sớm hạn';
    let bodyHTML;

    if (!tasks || tasks.length === 0) {
        bodyHTML = '<p class="text-gray-500 text-center py-4">Không có công việc nào.</p>';
    } else {
        bodyHTML = '<div class="space-y-3">';
        bodyHTML += tasks.map(task => {
            const dateParts = task.due_date.split('-').map(Number);
            const dueDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            const completedDate = new Date(task.completed_at);

            const assignedUserHTML = task.assigned_to_name 
                ? `<div class="flex items-center gap-1.5"><div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span>${task.assigned_to_name}</span></div>` 
                : '<span>-</span>';

            return `
                <div class="p-3 bg-white/60 rounded-lg border border-gray-200/80">
                    <p class="font-semibold text-gray-800">${task.content}</p>
                    <div class="mt-2 pt-2 border-t border-gray-200/60 text-xs text-gray-500 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div><strong>Người phụ trách:</strong> ${assignedUserHTML}</div>
                        <div class="flex items-center gap-1"><strong>Hoàn thành:</strong> <span class="text-green-600 font-medium">${completedDate.toLocaleDateString('vi-VN')}</span></div>
                        <div class="flex items-center gap-1"><strong>Hết hạn:</strong> <span class="font-medium">${dueDate.toLocaleDateString('vi-VN')}</span></div>
                    </div>
                </div>
            `;
        }).join('');
        bodyHTML += '</div>';
    }

    const modalElement = showModal(title, bodyHTML, '');
    setupModalEvents(modalElement);
}

// === BẮT ĐẦU HÀM MỚI 2/2: Hàm chung để mở pop-up danh sách công việc ===
function openListTasksModal(tasks, title) {
    let bodyHTML;
    if (!tasks || tasks.length === 0) {
        bodyHTML = '<p class="text-gray-500 text-center py-4">Không có công việc nào trong danh sách này.</p>';
    } else {
        bodyHTML = '<div class="space-y-3">';
        bodyHTML += tasks.map(task => {
            const dateParts = task.due_date.split('-').map(Number);
            const dueDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            
            const statusClass = STATUS_COLORS[task.status] || STATUS_COLORS['Cần làm'];
            const assignedUserHTML = task.assigned_to_name 
                ? `<div class="flex items-center gap-1.5"><div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span>${task.assigned_to_name}</span></div>` 
                : '<span>-</span>';

            return `
                <div class="p-3 bg-white/60 rounded-lg border border-gray-200/80">
                    <p class="font-semibold text-gray-800 ${task.is_completed ? 'line-through text-gray-400' : ''}">${task.content}</p>
                    <div class="mt-2 pt-2 border-t border-gray-200/60 text-xs text-gray-500 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div><strong>Người phụ trách:</strong> ${assignedUserHTML}</div>
                        <div><strong>Trạng thái:</strong> <span class="status-badge ${statusClass}">${task.status || 'Cần làm'}</span></div>
                        <div><strong>Hết hạn:</strong> <span class="font-medium">${dueDate.toLocaleDateString('vi-VN')}</span></div>
                    </div>
                </div>
            `;
        }).join('');
        bodyHTML += '</div>';
    }
    const modalElement = showModal(title, bodyHTML, '');
    setupModalEvents(modalElement);
}
// === KẾT THÚC HÀM MỚI 2/2 ===


function renderDashboardView() {
    dashboardViewContainer.classList.remove('hidden');
    
    // === BẮT ĐẦU SỬA ĐỔI 1/4: Cập nhật HTML Dashboard để thêm ID cho các tiêu đề ===
    dashboardViewContainer.innerHTML = `
         <div id="dashboard-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-3 p-4 rounded-lg shadow-sm bg-white border border-gray-200/80">
                <h3 class="font-semibold mb-2 text-green-800" id="monthly-progress-title">Tiến độ Tháng</h3>
                <div class="bg-gray-200 rounded-full h-4"><div id="monthly-progress-bar" class="bg-green-500 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold" style="width: 0%;">0%</div></div>
            </div>

            <div class="p-4 rounded-lg shadow-sm bg-teal-50 border border-teal-200/80"><h3 class="font-semibold text-center mb-2 text-teal-800">Theo Trạng thái</h3><div class="h-64 relative"><canvas id="status-chart"></canvas></div></div>
            <div class="p-4 rounded-lg shadow-sm bg-amber-50 border border-amber-200/80"><h3 class="font-semibold text-center mb-2 text-amber-800">Theo Ưu tiên</h3><div class="h-64 relative"><canvas id="priority-chart"></canvas></div></div>
            <div class="p-4 rounded-lg shadow-sm bg-sky-50 border border-sky-200/80"><h3 class="font-semibold text-center mb-2 text-sky-800">Theo Danh mục</h3><div class="h-64 relative"><canvas id="category-chart"></canvas></div></div>
            
            <div id="early-completion-card" class="p-4 rounded-lg shadow-sm bg-emerald-50 border border-emerald-200/80 flex flex-col items-center justify-center text-center task-item-clickable">
                <h3 class="font-semibold mb-2 text-emerald-800">Hoàn thành sớm hạn</h3>
                <p id="early-completion-count" class="text-4xl font-bold text-emerald-600">0</p>
                <p id="early-completion-rate" class="text-sm text-gray-500 mt-1">0% trên tổng số hoàn thành</p>
            </div>

            <div class="p-4 rounded-lg shadow-sm bg-red-50 border border-red-200/80 flex flex-col">
                <h3 id="dashboard-overdue-title" class="font-semibold mb-2 text-red-700 task-item-clickable">Công việc quá hạn</h3>
                <div id="overdue-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48 flex-grow"></div>
            </div>
             <div class="p-4 rounded-lg shadow-sm bg-indigo-50 border border-indigo-200/80 flex flex-col">
                <h3 id="dashboard-today-title" class="font-semibold mb-2 text-indigo-700 task-item-clickable">Công việc hôm nay</h3>
                <div id="today-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48 flex-grow"></div>
            </div>

            <div class="p-4 rounded-lg shadow-sm bg-violet-50 border border-violet-200/80"><h3 class="font-semibold text-center mb-2 text-violet-800">Theo Người phụ trách</h3><div class="h-64 relative"><canvas id="person-chart"></canvas></div></div>
            <div class="lg:col-span-2 p-4 rounded-lg shadow-sm bg-slate-50 border border-slate-200/80 flex flex-col">
                <h3 id="dashboard-upcoming-title" class="font-semibold mb-2 text-slate-700 task-item-clickable">Công việc sắp tới</h3>
                <div id="upcoming-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48 flex-grow"></div>
            </div>
         </div>`;
    // === KẾT THÚC SỬA ĐỔI 1/4 ===
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const todayStr = formatDate(today);

    const tasks = getFilteredTasksFromCache();

    const allCompletedTasks = tasks.filter(t => t.is_completed);
    const earlyCompletedTasks = allCompletedTasks.filter(t => {
        if (!t.completed_at || !t.due_date) return false;
        
        const completionDate = new Date(t.completed_at);
        completionDate.setHours(0, 0, 0, 0);
        
        const dueDateParts = t.due_date.split('-').map(Number);
        const dueDate = new Date(dueDateParts[0], dueDateParts[1] - 1, dueDateParts[2]);
        dueDate.setHours(0, 0, 0, 0);
        
        return completionDate < dueDate;
    });

    const earlyCount = earlyCompletedTasks.length;
    const earlyRate = allCompletedTasks.length > 0 ? Math.round((earlyCount / allCompletedTasks.length) * 100) : 0;

    document.getElementById('early-completion-count').textContent = earlyCount;
    document.getElementById('early-completion-rate').textContent = `${earlyRate}% trên tổng số hoàn thành`;

    const monthTasks = tasks.filter(t => {
        const dateParts = t.due_date.split('-').map(Number);
        const taskDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        return taskDate.getFullYear() === year && taskDate.getMonth() === month;
    });
    const totalTasks = monthTasks.length;
    const completedTasks = monthTasks.filter(t => t.is_completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const monthlyProgressBar = document.getElementById('monthly-progress-bar');
    monthlyProgressBar.style.width = `${progress}%`;
    monthlyProgressBar.textContent = `${progress}%`;
    document.getElementById('monthly-progress-title').textContent = `Tiến độ Tháng ${month + 1}`;
    
    // === BẮT ĐẦU SỬA ĐỔI 2/4: Chuẩn bị danh sách công việc cho các modal ===
    const overdueTasks = tasks.filter(t => t.due_date < todayStr && !t.is_completed);
    const todayTasks = tasks.filter(t => t.due_date === todayStr);
    const upcomingTasks = tasks.filter(t => t.due_date > todayStr && !t.is_completed).slice(0, 10);

    renderTaskList('overdue-tasks-list', overdueTasks);
    renderTaskList('today-tasks-list', todayTasks);
    renderTaskList('upcoming-tasks-list', upcomingTasks);
    // === KẾT THÚC SỬA ĐỔI 2/4 ===

    const statusCounts = tasks.reduce((acc, t) => { const s = t.status || 'Cần làm'; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    createChart('status-chart', 'pie', Object.keys(statusCounts), Object.values(statusCounts), Object.keys(statusCounts).map(s => STATUS_CHART_COLORS[s] || '#d1d5db'));
    
    const priorityCounts = tasks.reduce((acc, t) => { const p = t.priority || 'Trung bình'; acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    createChart('priority-chart', 'doughnut', Object.keys(priorityCounts), Object.values(priorityCounts), Object.keys(priorityCounts).map(p => PRIORITY_COLORS[p] || '#d1d5db'));

    const categoryCounts = tasks.reduce((acc, t) => { const c = t.category || 'Chung'; acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    createChart('category-chart', 'pie', Object.keys(categoryCounts), Object.values(categoryCounts), CATEGORY_COLORS);

    const personCounts = tasks.reduce((acc, t) => { const name = t.assigned_to_name || 'Chưa giao'; acc[name] = (acc[name] || 0) + 1; return acc; }, {});
    createChart('person-chart', 'bar', Object.keys(personCounts), Object.values(personCounts), CATEGORY_COLORS);
    
    // === BẮT ĐẦU SỬA ĐỔI 3/4: Gắn sự kiện click cho Dashboard ===
    document.getElementById('early-completion-card').addEventListener('click', () => {
        openEarlyCompletionModal(earlyCompletedTasks);
    });
    document.getElementById('dashboard-overdue-title').addEventListener('click', () => {
        openListTasksModal(overdueTasks, 'Danh sách Công việc Quá hạn');
    });
    document.getElementById('dashboard-today-title').addEventListener('click', () => {
        openListTasksModal(todayTasks, 'Danh sách Công việc Hôm nay');
    });
    document.getElementById('dashboard-upcoming-title').addEventListener('click', () => {
        openListTasksModal(upcomingTasks, 'Danh sách Công việc Sắp tới');
    });
    // === KẾT THÚC SỬA ĐỔI 3/4 ===
}

function createChart(canvasId, type, labels, data, colors, centerText = '') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstances[canvasId]) { chartInstances[canvasId].destroy(); }

    const chartPlugins = [];
    if (centerText && (type === 'doughnut')) {
        chartPlugins.push({
            id: 'centerText',
            beforeDraw: function(chart) {
                const width = chart.width, height = chart.height, ctx = chart.ctx;
                ctx.restore();
                const fontSize = (height / 110).toFixed(2);
                ctx.font = `bold ${fontSize}em Inter, sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#374151';
                
                const text = centerText,
                    textX = Math.round((width - ctx.measureText(text).width) / 2),
                    textY = height / 2;
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        });
    }

    chartInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{ label: 'Số lượng', data: data, backgroundColor: colors, borderWidth: type === 'doughnut' ? 0 : 1 }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: true, 
                    position: 'top' 
                },
                tooltip: { 
                    enabled: true
                }
            },
            cutout: type === 'doughnut' ? '70%' : '0%'
        },
        plugins: chartPlugins
    });
}

function renderTaskList(elementId, tasks) {
    const listEl = document.getElementById(elementId);
    if (!listEl) return;
    if (!tasks || tasks.length === 0) {
        listEl.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Không có công việc nào.</p>`;
        return;
    }
    listEl.innerHTML = tasks.map(task => {
        const dateParts = task.due_date.split('-').map(Number);
        const localDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        return `
        <div class="text-sm p-2 bg-white/50 rounded-md task-item-clickable relative group" data-task-id="${task.id}">
            <p class="${task.is_completed ? 'line-through text-gray-400' : ''}">${task.content}</p>
            <div class="flex items-center justify-between text-xs text-gray-400 mt-1">
                <span>${localDate.toLocaleDateString('vi-VN')}</span>
                ${task.assigned_to_name ? `<div class="flex items-center gap-1"><div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span>${task.assigned_to_name}</span></div>` : ''}
            </div>
            <button class="edit-task-btn absolute top-1 right-1 p-1 rounded-full bg-white/80 text-gray-500 hover:bg-gray-200 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" data-task-id="${task.id}">
                 <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
            </button>
        </div>
    `}).join('');
}

function renderKanbanView() {
    kanbanViewContainer.classList.remove('hidden');
    kanbanViewContainer.innerHTML = `
        <div id="kanban-columns-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            ${STATUSES.map(status => `
                <div class="rounded-lg p-4 flex flex-col ${KANBAN_COLUMN_COLORS[status] || 'bg-gray-100/80 border border-gray-200/80'}">
                    <h3 class="font-semibold mb-4 text-center">${status}</h3>
                    <div class="kanban-tasks flex-grow space-y-3 overflow-y-auto min-h-[300px]" data-status="${status}"></div>
                </div>
            `).join('')}
        </div>
    `;

    const tasks = getFilteredTasksFromCache();

    tasks.forEach(task => {
        const status = task.status || 'Cần làm';
        const column = kanbanViewContainer.querySelector(`.kanban-tasks[data-status="${status}"]`);
        if(column) {
            column.insertAdjacentHTML('beforeend', renderKanbanTask(task));
        }
    });

    setupKanbanDragAndDrop();
}

function renderKanbanTask(task) {
    const priorityBorder = PRIORITY_COLORS[task.priority] || '#9ca3af';
    const dateParts = task.due_date.split('-').map(Number);
    const localDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

    return `
        <div class="kanban-task bg-white p-3 rounded-md shadow-sm border-l-4 task-item-clickable relative group" style="border-color: ${priorityBorder}" data-task-id="${task.id}">
            <p class="font-medium text-sm mb-2">${task.content}</p>
            <div class="flex items-center justify-between text-xs text-gray-500">
                <span>${localDate.toLocaleDateString('vi-VN')}</span>
                ${task.assigned_to_name ? `<div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div>` : ''}
            </div>
            <button class="edit-task-btn absolute top-1 right-1 p-1 rounded-full bg-white/50 text-gray-500 hover:bg-gray-200/80 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" data-task-id="${task.id}">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
            </button>
        </div>
    `;
}

function setupKanbanDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-tasks');
    columns.forEach(column => {
        new Sortable(column, {
            group: 'kanban',
            animation: 150,
            ghostClass: 'ghost-class',
            onEnd: async function(evt) {
                const taskId = evt.item.dataset.taskId;
                const newStatus = evt.to.dataset.status;
                
                const isCompleted = newStatus === 'Hoàn thành';
                
                const updatedData = {
                    status: newStatus,
                    is_completed: isCompleted,
                    completed_at: isCompleted ? new Date() : null
                };

                const { data, error } = await supabaseClient
                    .from('tasks')
                    .update(updatedData)
                    .match({ id: taskId })
                    .select()
                    .single();

                if (error) {
                    alert("Lỗi cập nhật trạng thái: " + error.message);
                    evt.from.appendChild(evt.item);
                } else if (data) {
                    const index = tasksCache.findIndex(t => t.id === data.id);
                    if (index > -1) {
                        tasksCache[index] = data;
                    }
                }
            },
        });
    });
}

function renderListView() {
    listViewContainer.classList.remove('hidden');
    let tasks = getFilteredTasksFromCache();

    const priorityOrder = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };
    tasks.sort((a, b) => {
        let valA, valB;

        if (sortConfig.key === 'priority') {
            valA = priorityOrder[a.priority] || 0;
            valB = priorityOrder[b.priority] || 0;
        } else {
            valA = a[sortConfig.key] || '';
            valB = b[sortConfig.key] || '';
        }

        if (valA < valB) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });
    
    const sortIcon = (key) => {
        if (sortConfig.key !== key) return `<svg class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>`;
        if (sortConfig.direction === 'ascending') return `<svg class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>`;
        return `<svg class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
    };

    const headerClass = (key) => `sortable-header py-3 px-6 ${sortConfig.key === key ? 'sorted' : ''}`;

    listViewContainer.innerHTML = `
        <div class="rounded-lg shadow-sm overflow-x-auto bg-white/80 glass-effect border border-gray-200/60">
            <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50/80">
                    <tr>
                        <th scope="col" class="py-3 px-6">Công việc</th>
                        <th scope="col" class="py-3 px-6">Người phụ trách</th>
                        <th scope="col" data-sort-key="status" class="${headerClass('status')}">Trạng thái ${sortIcon('status')}</th>
                        <th scope="col" data-sort-key="priority" class="${headerClass('priority')}">Ưu tiên ${sortIcon('priority')}</th>
                        <th scope="col" data-sort-key="due_date" class="${headerClass('due_date')}">Ngày hết hạn ${sortIcon('due_date')}</th>
                        <th scope="col" class="py-3 px-6"><span class="sr-only">Hành động</span></th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.length > 0 ? tasks.map(renderListItem).join('') : '<tr><td colspan="6" class="text-center py-4">Không có công việc nào.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    listViewContainer.querySelector('thead').addEventListener('click', (e) => {
        const header = e.target.closest('[data-sort-key]');
        if (header) {
            const key = header.dataset.sortKey;
            if (sortConfig.key === key) {
                sortConfig.direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
            } else {
                sortConfig.key = key;
                sortConfig.direction = 'ascending';
            }
            renderListView();
        }
    });
}

function renderListItem(task) {
    const statusClass = STATUS_COLORS[task.status] || STATUS_COLORS['Cần làm'];
    const priorityClass = PRIORITIES[task.priority] || PRIORITIES['Trung bình'];

    const assignedUserHTML = task.assigned_to_name 
        ? `<div class="flex items-center gap-2"><div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span>${task.assigned_to_name}</span></div>` 
        : '<span class="text-gray-400 italic">Chưa giao</span>';
    
    const dateParts = task.due_date.split('-').map(Number);
    const localDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

    return `
        <tr class="bg-white border-b hover:bg-gray-50/80 task-item-clickable" data-task-id="${task.id}">
            <td class="py-4 px-6 font-medium text-gray-900">${task.content}</td>
            <td class="py-4 px-6">${assignedUserHTML}</td>
            <td class="py-4 px-6"><span class="status-badge ${statusClass}">${task.status || 'Cần làm'}</span></td>
            <td class="py-4 px-6"><span class="task-tag ${priorityClass}">${task.priority || 'Trung bình'}</span></td>
            <td class="py-4 px-6">${localDate.toLocaleDateString('vi-VN')}</td>
            <td class="py-4 px-6 text-right">
                <button class="edit-task-btn font-medium text-indigo-600 hover:underline" data-task-id="${task.id}">Sửa</button>
            </td>
        </tr>
    `;
}

function renderMembersView() {
    membersViewContainer.classList.remove('hidden');
    const tasksForOverview = getFilteredTasksFromCache(); 

    const allUsers = [userProfile, ...teamMembers];
    
    const memberStats = allUsers.map(user => {
        const assignedTasks = tasksForOverview.filter(t => t.assigned_to_email === user.email);
        return {
            ...user,
            total: assignedTasks.length,
            completed: assignedTasks.filter(t => t.status === 'Hoàn thành').length,
            in_progress: assignedTasks.filter(t => t.status === 'Đang làm').length,
        }
    });

    membersViewContainer.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Tổng quan Nhân sự</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${memberStats.map(member => `
                <div class="p-4 rounded-lg shadow-sm bg-white/90 border-l-4" style="border-left-color: ${stringToColor(member.email)}">
                    <div class="flex items-center space-x-4 mb-4">
                        <div class="avatar" style="width: 40px; height: 40px; font-size: 1.25rem; background-color: ${stringToColor(member.email)}">${member.name.charAt(0)}</div>
                        <div>
                            <p class="font-semibold text-lg">${member.name}</p>
                            <p class="text-sm text-gray-500">${member.email}</p>
                        </div>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Tổng công việc:</span> <span class="font-semibold">${member.total}</span></div>
                        <div class="flex justify-between"><span>Đang thực hiện:</span> <span class="font-semibold text-orange-600">${member.in_progress}</span></div>
                        <div class="flex justify-between"><span>Đã hoàn thành:</span> <span class="font-semibold text-green-600">${member.completed}</span></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderReportsView() {
    reportsViewContainer.classList.remove('hidden');
    const allUsers = [userProfile, ...teamMembers];

    reportsViewContainer.innerHTML = `
        <div class="space-y-8">
            <div class="w-full p-6 sm:p-8 space-y-6 bg-white/80 glass-effect rounded-xl shadow-lg border border-gray-200/60">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Tùy chỉnh Báo cáo</h2>
                    <p class="mt-1 text-gray-500">Chọn khoảng thời gian và bộ lọc để tạo báo cáo.</p>
                </div>
                
                <div class="space-y-3">
                    <label class="text-sm font-medium text-gray-700">Khoảng thời gian</label>
                    <div id="report-options" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <button data-range="this_week" class="report-range-btn btn p-3 text-center rounded-lg font-medium">Tuần này</button>
                        <button data-range="this_month" class="report-range-btn btn p-3 text-center rounded-lg font-medium">Tháng này</button>
                        <button data-range="last_month" class="report-range-btn btn p-3 text-center rounded-lg font-medium">Tháng trước</button>
                        <button data-range="this_quarter" class="report-range-btn btn p-3 text-center rounded-lg font-medium">Quý này</button>
                        <button data-range="this_year" class="report-range-btn btn p-3 text-center rounded-lg font-medium">Năm nay</button>
                        <button data-range="custom" class="report-range-btn btn p-3 text-center rounded-lg font-medium">Tùy chỉnh...</button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                    <div id="custom-date-range-picker" class="hidden md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                         <div>
                            <label for="report-start-date" class="text-sm font-medium text-gray-700">Từ ngày</label>
                            <input type="date" id="report-start-date" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
                         </div>
                         <div>
                             <label for="report-end-date" class="text-sm font-medium text-gray-700">Đến ngày</label>
                            <input type="date" id="report-end-date" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
                         </div>
                    </div>
                    <div>
                        <label for="report-person-filter" class="text-sm font-medium text-gray-700">Báo cáo theo thành viên</label>
                        <select id="report-person-filter" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
                            <option value="all">Tổng quan tất cả</option>
                            ${allUsers.map(u => `<option value="${u.email}">${u.name}</option>`).join('')}
                        </select>
                    </div>
                     <div>
                        <label class="text-sm font-medium text-gray-700">Hành động</label>
                        <div class="flex flex-wrap gap-2 mt-1">
                            <button id="export-csv-btn" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                                <span>CSV</span>
                            </button>
                            <button id="export-pdf-btn" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                                 <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
                                 <span>PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="report-content-area" class="space-y-6">
            </div>
        </div>
    `;
    setupReportEventListeners();
    setReportDateRange('this_week'); 
    document.querySelector('.report-range-btn[data-range="this_week"]').click();
}

function setupReportEventListeners() {
    const container = reportsViewContainer;
    if (!container) return;
    
    const activeClasses = ['btn-active'];

    container.querySelectorAll('.report-range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.report-range-btn').forEach(b => b.classList.remove(...activeClasses));
            btn.classList.add(...activeClasses);
            
            const range = btn.dataset.range;
            const customPicker = document.getElementById('custom-date-range-picker');

            if (range === 'custom') {
                customPicker.classList.remove('hidden');
            } else {
                customPicker.classList.add('hidden');
                setReportDateRange(range);
                renderReportContent();
            }
        });
    });

    const updateOnDateChange = debounce(() => renderReportContent(), 500);
    container.querySelector('#report-start-date').addEventListener('change', updateOnDateChange);
    container.querySelector('#report-end-date').addEventListener('change', updateOnDateChange);
    container.querySelector('#report-person-filter').addEventListener('change', () => renderReportContent());
    container.querySelector('#export-csv-btn').addEventListener('click', exportReportToCSV);
    container.querySelector('#export-pdf-btn').addEventListener('click', exportReportToPDF);
}

function setReportDateRange(rangeKey) {
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    if (!startDateInput || !endDateInput) return;

    const today = new Date();
    let start = new Date(), end = new Date();

    switch(rangeKey) {
        case 'this_week':
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            start = new Date(new Date().setDate(diff));
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            break;
        case 'this_month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'last_month':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'this_quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            start = new Date(today.getFullYear(), quarter * 3, 1);
            end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
            break;
        case 'this_year':
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31);
            break;
    }
    if (rangeKey !== 'custom') {
        startDateInput.value = formatDate(start);
        endDateInput.value = formatDate(end);
    }
}

function getReportTasks() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const personEmail = document.getElementById('report-person-filter').value;
    
    let tasks = getFilteredTasksFromCache();

    if (startDate && endDate) {
        tasks = tasks.filter(t => t.due_date >= startDate && t.due_date <= endDate);
    }

    if (personEmail !== 'all') {
        tasks = tasks.filter(t => t.assigned_to_email === personEmail);
    }
    return tasks;
}

function renderReportContent() {
    const contentArea = document.getElementById('report-content-area');
    if (!contentArea) return;
    
    const tasks = getReportTasks();
    const personEmail = document.getElementById('report-person-filter').value;
    const memberName = personEmail === 'all' ? 'Tất cả thành viên' : (teamMembers.find(m => m.email === personEmail) || userProfile).name;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
    const overdueTasks = tasks.filter(t => !t.is_completed && new Date(t.due_date) < new Date() && t.due_date < formatDate(new Date())).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const earlyCompletedTasks = tasks.filter(t => {
        if (!t.is_completed || !t.completed_at || !t.due_date) return false;
        
        const completionDate = new Date(t.completed_at);
        completionDate.setHours(0, 0, 0, 0);
        
        const dueDateParts = t.due_date.split('-').map(Number);
        const dueDate = new Date(dueDateParts[0], dueDateParts[1] - 1, dueDateParts[2]);
        dueDate.setHours(0, 0, 0, 0);
        
        return completionDate < dueDate;
    });
    const earlyCount = earlyCompletedTasks.length;

    // === BẮT ĐẦU SỬA ĐỔI 4/4: Cập nhật HTML cho Báo cáo để thêm ID và class click ===
    contentArea.innerHTML = `
        <div class="p-4 rounded-lg shadow-sm bg-white">
            <h3 class="font-semibold text-xl mb-4">Báo cáo hiệu suất cho: <span class="text-indigo-600">${memberName}</span></h3>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
                <div id="report-total-card" class="p-4 bg-blue-50 rounded-lg task-item-clickable">
                    <p class="text-2xl font-bold text-blue-600">${totalTasks}</p>
                    <p class="text-sm text-gray-600">Tổng công việc</p>
                </div>
                <div class="p-4 bg-green-50 rounded-lg">
                    <p class="text-2xl font-bold text-green-600">${completionRate}%</p>
                    <p class="text-sm text-gray-600">Tỷ lệ hoàn thành</p>
                </div>
                 <div id="report-overdue-card" class="p-4 bg-red-50 rounded-lg task-item-clickable">
                    <p class="text-2xl font-bold text-red-600">${overdueTasks}</p>
                    <p class="text-sm text-gray-600">Công việc quá hạn</p>
                </div>
                 <div id="report-early-card" class="p-4 bg-emerald-50 rounded-lg task-item-clickable">
                    <p class="text-2xl font-bold text-emerald-600">${earlyCount}</p>
                    <p class="text-sm text-gray-600">Hoàn thành sớm hạn</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="p-4 rounded-lg shadow-sm bg-teal-50 border border-teal-200/80"><h3 class="font-semibold text-center mb-2 text-teal-800">Phân loại theo Trạng thái</h3><div class="h-64 relative"><canvas id="report-status-chart"></canvas></div></div>
                <div class="p-4 rounded-lg shadow-sm bg-amber-50 border border-amber-200/80"><h3 class="font-semibold text-center mb-2 text-amber-800">Phân loại theo Ưu tiên</h3><div class="h-64 relative"><canvas id="report-priority-chart"></canvas></div></div>
            </div>
        </div>
    `;

    const statusCounts = tasks.reduce((acc, t) => { const s = t.status || 'Cần làm'; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    createChart('report-status-chart', 'pie', Object.keys(statusCounts), Object.values(statusCounts), Object.keys(statusCounts).map(s => STATUS_CHART_COLORS[s] || '#d1d5db'));
    
    const priorityCounts = tasks.reduce((acc, t) => { const p = t.priority || 'Trung bình'; acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    createChart('report-priority-chart', 'doughnut', Object.keys(priorityCounts), Object.values(priorityCounts), Object.keys(priorityCounts).map(p => PRIORITY_COLORS[p] || '#d1d5db'));
    
    document.getElementById('report-early-card').addEventListener('click', () => {
        openEarlyCompletionModal(earlyCompletedTasks);
    });
    document.getElementById('report-total-card').addEventListener('click', () => {
        openListTasksModal(tasks, `Tổng công việc cho: ${memberName}`);
    });
    document.getElementById('report-overdue-card').addEventListener('click', () => {
        openListTasksModal(overdueTasks, `Công việc quá hạn cho: ${memberName}`);
    });
     // === KẾT THÚC SỬA ĐỔI 4/4 ===
}

function exportReportToCSV() {
    const tasks = getReportTasks();
    if (tasks.length === 0) {
        alert('Không có dữ liệu để xuất.');
        return;
    }

    const headers = ['Công việc', 'Người phụ trách', 'Trạng thái', 'Ưu tiên', 'Danh mục', 'Ngày hết hạn', 'Hoàn thành'];
    const rows = tasks.map(task => [
        `"${task.content.replace(/"/g, '""')}"`,
        task.assigned_to_name || 'N/A',
        task.status || 'Cần làm',
        task.priority || 'Trung bình',
        task.category || 'N/A',
        task.due_date,
        task.is_completed ? 'Có' : 'Không'
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
        + headers.join(';') + '\n' 
        + rows.map(e => e.join(';')).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bao_cao_cong_viec.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function exportReportToPDF() {
    const tasks = getReportTasks();
    if (tasks.length === 0) {
        alert('Không có dữ liệu để xuất.');
        return;
    }

    const fontBase64 = 'AAEAAAASAQAABAAgR0RFRqZDpEwAAAOUAAACWEdQT1MH0tr...';

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');

    const personName = document.getElementById('report-person-filter').selectedOptions[0].text;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    doc.setFontSize(16);
    doc.text(`Báo cáo Công việc`, 14, 16);

    doc.setFontSize(11);
    doc.text(`Đối tượng: ${personName}`, 14, 24);
    doc.text(`Từ ngày: ${startDate} đến ngày: ${endDate}`, 14, 30);

    const tableColumn = ["Công việc", "Người phụ trách", "Trạng thái", "Ngày hết hạn"];
    const tableRows = tasks.map(task => [
        task.content,
        task.assigned_to_name || 'N/A',
        task.status || 'Cần làm',
        task.due_date
    ]);

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: {
            font: "Roboto",
            fontStyle: 'normal'
        },
        headStyles: {
            fontStyle: 'bold',
            fillColor: [41, 128, 185]
        }
    });

    doc.save('bao_cao_cong_viec.pdf');
}

let weeklyViewController = new AbortController();

function weeklyViewClickHandler(event) {
    const target = event.target;
    if(target.closest('#prev-week')) { currentDate.setDate(currentDate.getDate() - 7); renderCurrentView(); }
    if(target.closest('#today-btn')) { currentDate = new Date(); renderCurrentView(); }
    if(target.closest('#next-week')) { currentDate.setDate(currentDate.getDate() + 7); renderCurrentView(); }
}

async function weeklyViewChangeHandler(event) {
     const target = event.target;
     if (target.classList.contains('task-checkbox')) {
        const taskId = target.dataset.taskId;
        const isCompleted = target.checked;
        const updatedStatus = isCompleted ? 'Hoàn thành' : 'Cần làm';

        const { data, error } = await supabaseClient
            .from('tasks')
            .update({ 
                is_completed: isCompleted, 
                status: updatedStatus,
                completed_at: isCompleted ? new Date() : null 
            })
            .match({ id: taskId })
            .select()
            .single();
        
        if (error) {
            console.error("Lỗi cập nhật trạng thái:", error.message);
            target.checked = !isCompleted;
            alert("Không thể cập nhật trạng thái công việc.");
        } else if (data) {
            const taskIndex = tasksCache.findIndex(t => t.id == taskId);
            if (taskIndex > -1) {
                tasksCache[taskIndex] = data;
            }
            renderCurrentView();
        }
     }
}

function setupWeeklyViewEventListeners() {
    const weeklyView = document.getElementById('weekly-view-container');
    if (!weeklyView) return;
    weeklyViewController.abort();
    weeklyViewController = new AbortController();
    weeklyView.addEventListener('click', weeklyViewClickHandler, { signal: weeklyViewController.signal });
    weeklyView.addEventListener('change', weeklyViewChangeHandler, { signal: weeklyViewController.signal });
}

function openAddTaskModal(dueDate = '') {
    const allUsers = [userProfile, ...teamMembers];
    const body = `
        <div class="space-y-4">
            <div>
                <label for="task-content-input" class="block text-sm font-medium text-gray-700">Tên công việc</label>
                <input type="text" id="task-content-input" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="VD: Hoàn thành báo cáo...">
            </div>
             <div>
                <label for="task-due-date-input" class="block text-sm font-medium text-gray-700">Ngày hết hạn</label>
                <input type="date" id="task-due-date-input" value="${dueDate || formatDate(new Date())}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            <div>
                <label for="task-assign-to" class="block text-sm font-medium text-gray-700">Giao cho</label>
                <select id="task-assign-to" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">-- Chọn thành viên --</option>
                    ${allUsers.map(u => `<option value="${u.email}">${u.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label for="task-priority-select" class="block text-sm font-medium text-gray-700">Mức độ ưu tiên</label>
                <select id="task-priority-select" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    ${Object.keys(PRIORITIES).map(p => `<option value="${p}">${p}</option>`).join('')}
                </select>
            </div>
            <div>
                <label for="task-category-select" class="block text-sm font-medium text-gray-700">Danh mục</label>
                <select id="task-category-select" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
        </div>`;
    const footer = `
        <button class="cancel-btn px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Hủy</button>
        <button class="save-task-btn px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu công việc</button>
    `;
    const modalElement = showModal('Thêm công việc mới', body, footer);
    const closeModal = setupModalEvents(modalElement);

    modalElement.querySelector('.cancel-btn').addEventListener('click', closeModal);
    modalElement.querySelector('.save-task-btn').addEventListener('click', async () => {
        const content = modalElement.querySelector('#task-content-input').value.trim();
        const dueDateValue = modalElement.querySelector('#task-due-date-input').value;
        if (!content) { alert('Vui lòng nhập tên công việc.'); return; }
        if (!dueDateValue) { alert('Vui lòng chọn ngày hết hạn.'); return; }

        const assignedToEmail = modalElement.querySelector('#task-assign-to').value;
        const assignedToUser = allUsers.find(u => u.email === assignedToEmail);

        const taskData = {
            content: content, due_date: dueDateValue,
            priority: modalElement.querySelector('#task-priority-select').value,
            category: modalElement.querySelector('#task-category-select').value,
            status: 'Cần làm', is_completed: false,
            assigned_to_email: assignedToUser ? assignedToUser.email : null,
            assigned_to_name: assignedToUser ? assignedToUser.name : null,
        };

        const saveBtn = modalElement.querySelector('.save-task-btn');
        saveBtn.disabled = true; saveBtn.textContent = 'Đang lưu...';
        
        const { data, error } = await supabaseClient
            .from('tasks')
            .insert([taskData])
            .select()
            .single();
        
        if (error) {
            alert('Lỗi: ' + error.message);
            saveBtn.disabled = false; saveBtn.textContent = 'Lưu công việc';
        } else {
            tasksCache.push(data);
            renderCurrentView();
            closeModal();
        }
    });
}

function openEditTaskModal(taskId) {
    const task = tasksCache.find(t => t.id == taskId);
    if (!task) {
        alert('Không thể tìm thấy công việc.');
        return;
    }
    
    const allUsers = [userProfile, ...teamMembers];
    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Tên công việc</label>
                <input type="text" id="edit-task-content" value="${task.content}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Ngày hết hạn</label>
                    <input type="date" id="edit-task-due-date" value="${task.due_date}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Giao cho</label>
                    <select id="edit-task-assign-to" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        <option value="">-- Bỏ trống --</option>
                        ${allUsers.map(u => `<option value="${u.email}" ${task.assigned_to_email === u.email ? 'selected' : ''}>${u.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Ưu tiên</label>
                    <select id="edit-task-priority" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        ${Object.keys(PRIORITIES).map(p => `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Trạng thái</label>
                    <select id="edit-task-status" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        ${STATUSES.map(s => `<option value="${s}" ${task.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Danh mục</label>
                <input type="text" id="edit-task-category" value="${task.category || ''}" list="category-datalist" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                <datalist id="category-datalist">${CATEGORIES.map(c => `<option value="${c}">`).join('')}</datalist>
            </div>
        </div>`;

    const footer = `
        <button id="delete-task-btn" class="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">Xóa công việc</button>
        <button id="update-task-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu thay đổi</button>
    `;
    const modalElement = showModal('Chi tiết công việc', body, footer);
    const closeModal = setupModalEvents(modalElement);
    
    modalElement.querySelector('#update-task-btn').addEventListener('click', async () => {
         const content = modalElement.querySelector('#edit-task-content').value.trim();
         if (!content) { alert('Tên công việc không được để trống.'); return; }

         const assignedToEmail = modalElement.querySelector('#edit-task-assign-to').value;
         const assignedToUser = allUsers.find(u => u.email === assignedToEmail);
         
         const newStatus = modalElement.querySelector('#edit-task-status').value;
         
         const updatedData = {
            content: content,
            due_date: modalElement.querySelector('#edit-task-due-date').value,
            priority: modalElement.querySelector('#edit-task-priority').value,
            status: newStatus,
            category: modalElement.querySelector('#edit-task-category').value.trim(),
            assigned_to_email: assignedToUser ? assignedToUser.email : null,
            assigned_to_name: assignedToUser ? assignedToUser.name : null,
            is_completed: newStatus === 'Hoàn thành',
            completed_at: newStatus === 'Hoàn thành' ? new Date() : null
         };

         const { data, error: updateError } = await supabaseClient
            .from('tasks')
            .update(updatedData)
            .match({ id: taskId })
            .select()
            .single();

         if (updateError) {
             alert('Lỗi khi cập nhật công việc: ' + updateError.message);
         } else {
             const index = tasksCache.findIndex(t => t.id === data.id);
             if (index > -1) {
                 tasksCache[index] = data;
             }
             renderCurrentView();
             closeModal();
         }
    });

    modalElement.querySelector('#delete-task-btn').addEventListener('click', async () => {
        const confirmed = prompt('Công việc này sẽ bị xóa vĩnh viễn. Gõ "xóa" để xác nhận.');
        if (confirmed === 'xóa') {
            const { error: deleteError } = await supabaseClient.from('tasks').delete().match({ id: taskId });
            if (deleteError) {
                 alert('Lỗi khi xóa công việc: ' + deleteError.message);
            } else {
                tasksCache = tasksCache.filter(t => t.id !== taskId);
                renderCurrentView();
                closeModal();
            }
        }
    });
}

function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    sidebarBackdrop.classList.toggle('hidden');
}

function switchView(view) {
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

function showSupabaseModal() {
    const sqlSetup = `
        <h4 class="font-semibold text-gray-800 mt-4 mb-2">Yêu cầu thiết lập Supabase</h4>
        <p class="text-sm text-gray-600 mb-2">Để ứng dụng hoạt động, bạn cần chạy <strong>toàn bộ</strong> kịch bản SQL sau trong <strong class="font-semibold">SQL Editor</strong> của project Supabase.</p>
        <pre class="bg-gray-100 p-2 rounded-md text-xs overflow-x-auto"><code>-- 1. TẠO BẢNG CHÍNH
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  content text,
  due_date date,
  is_completed boolean DEFAULT false,
  priority text,
  category text,
  status text,
  assigned_to_email text,
  assigned_to_name text,
  completed_at timestamp with time zone
);

-- 2. KÍCH HOẠT RLS (BẮT BUỘC)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. XÓA CHÍNH SÁCH CŨ (ĐỂ TRÁNH XUNG ĐỘT)
DROP POLICY IF EXISTS "Enable all access for all users" ON public.tasks;

-- 4. TẠO CHÍNH SÁCH MỚI (CHO PHÉP MỌI NGƯỜI TRUY CẬP)
CREATE POLICY "Enable all access for all users" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- 5. TẠO HÀM (FUNCTION) ĐỂ XÓA DỮ LIỆU (TÙY CHỌN)
CREATE OR REPLACE FUNCTION truncate_all_data()
RETURNS void AS $$
BEGIN
  TRUNCATE TABLE public.tasks RESTART IDENTITY CASCADE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
</code></pre>
    `;
    const body = `
        <p class="text-sm text-gray-600 mb-4">Vui lòng nhập thông tin kết nối Supabase của bạn. Bạn có thể tìm thấy chúng trong mục Settings > API trong project Supabase.</p>
        <div>
            <label for="supabase-url" class="block text-sm font-medium text-gray-700">Project URL</label>
            <input type="text" id="supabase-url" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
        </div>
        <div class="mt-4">
            <label for="supabase-key" class="block text-sm font-medium text-gray-700">Anon (public) Key</label>
            <input type="text" id="supabase-key" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
        </div>
        ${sqlSetup}
    `;
    const footer = `<button id="save-supabase-config" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu và Bắt đầu</button>`;
    const modalElement = showModal('Cấu hình Supabase', body, footer);
    
    modalElement.querySelector('[data-close-modal]').addEventListener('click', () => modalElement.remove());
    
    modalElement.querySelector('#save-supabase-config').addEventListener('click', () => {
        const url = modalElement.querySelector('#supabase-url').value.trim();
        const key = modalElement.querySelector('#supabase-key').value.trim();
        if (url && key) {
            localStorage.setItem('supabaseUrl', url);
            localStorage.setItem('supabaseKey', key);
            modalElement.remove();
            location.reload();
        } else {
            alert("Vui lòng nhập đầy đủ URL và Key.");
        }
    });
}

function setupRealtimeSubscriptions() {
    const handleRealtimeChange = (payload) => {
        console.log('Real-time change received!', payload);
        const { table, eventType, new: newRecord, old: oldRecord } = payload;

        let cacheUpdated = false;
        if (table === 'tasks') {
            if (eventType === 'INSERT') {
                if (!tasksCache.some(t => t.id === newRecord.id)) {
                    tasksCache.push(newRecord);
                    cacheUpdated = true;
                }
            } else if (eventType === 'UPDATE') {
                const index = tasksCache.findIndex(t => t.id === newRecord.id);
                if (index > -1) {
                    tasksCache[index] = newRecord;
                    cacheUpdated = true;
                }
            } else if (eventType === 'DELETE') {
                const initialLength = tasksCache.length;
                tasksCache = tasksCache.filter(t => t.id !== oldRecord.id);
                if (tasksCache.length < initialLength) {
                    cacheUpdated = true;
                }
            }
        }
        
        if (cacheUpdated) renderCurrentView();
    };

    const allTablesSubscription = supabaseClient
        .channel('public-db-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public' },
            handleRealtimeChange
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to real-time updates!');
            } else if (status === 'TIMED_OUT') {
                console.warn('Real-time subscription timed out. Will attempt to reconnect.');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Real-time subscription channel error.', err);
            }
        });
}

(async function init() {
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