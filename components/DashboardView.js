import { state, CONSTANTS } from '../state.js';
import { getFilteredTasksFromCache } from '../main.js'; // main.js sẽ export hàm này
import { formatDate } from '../utils/dateUtils.js';
import { stringToColor, createChart } from '../utils/uiUtils.js';

const { STATUS_CHART_COLORS, PRIORITY_COLORS, CATEGORY_COLORS } = CONSTANTS;
const dashboardViewContainer = document.getElementById('dashboard-view-container');

function renderTaskList(elementId, tasks) {
    const listEl = document.getElementById(elementId);
    if (!listEl) return;
    if (!tasks || tasks.length === 0) {
        listEl.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Không có công việc nào.</p>`;
        return;
    }
    listEl.innerHTML = tasks.map(task => {
        const localDate = new Date(task.due_date.replace(/-/g, '/')); // Fix for date parsing
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

export function renderDashboardView() {
    dashboardViewContainer.classList.remove('hidden');
    dashboardViewContainer.innerHTML = `
        <div id="dashboard-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div class="md:col-span-2 lg:col-span-4 p-4 rounded-lg shadow-sm bg-white border border-gray-200/80">
               <h3 class="font-semibold mb-2 text-green-800" id="monthly-progress-title">Tiến độ Tháng</h3>
               <div class="bg-gray-200 rounded-full h-4"><div id="monthly-progress-bar" class="bg-green-500 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold" style="width: 0%;">0%</div></div>
           </div>
           <div class="p-4 rounded-lg shadow-sm bg-teal-50 border border-teal-200/80"><h3 class="font-semibold text-center mb-2 text-teal-800">Theo Trạng thái</h3><div class="h-64 relative"><canvas id="status-chart"></canvas></div></div>
           <div class="p-4 rounded-lg shadow-sm bg-amber-50 border border-amber-200/80"><h3 class="font-semibold text-center mb-2 text-amber-800">Theo Ưu tiên</h3><div class="h-64 relative"><canvas id="priority-chart"></canvas></div></div>
           <div class="p-4 rounded-lg shadow-sm bg-sky-50 border border-sky-200/80"><h3 class="font-semibold text-center mb-2 text-sky-800">Theo Danh mục</h3><div class="h-64 relative"><canvas id="category-chart"></canvas></div></div>
           <div class="p-4 rounded-lg shadow-sm bg-violet-50 border border-violet-200/80"><h3 class="font-semibold text-center mb-2 text-violet-800">Theo Người phụ trách</h3><div class="h-64 relative"><canvas id="person-chart"></canvas></div></div>
           <div class="p-4 rounded-lg shadow-sm md:col-span-2 bg-red-50 border border-red-200/80">
               <h3 class="font-semibold mb-2 text-red-700">Công việc quá hạn</h3>
               <div id="overdue-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48"></div>
           </div>
            <div class="p-4 rounded-lg shadow-sm md:col-span-2 bg-indigo-50 border border-indigo-200/80">
               <h3 class="font-semibold mb-2 text-indigo-700">Công việc hôm nay</h3>
               <div id="today-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48"></div>
           </div>
            <div class="p-4 rounded-lg shadow-sm md:col-span-2 lg:col-span-4 bg-slate-50 border border-slate-200/80">
               <h3 class="font-semibold mb-2 text-slate-700">Công việc sắp tới</h3>
               <div id="upcoming-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48"></div>
           </div>
        </div>`;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const todayStr = formatDate(today);

    const tasks = getFilteredTasksFromCache();

    const monthTasks = tasks.filter(t => {
        const taskDate = new Date(t.due_date.replace(/-/g, '/'));
        return taskDate.getFullYear() === year && taskDate.getMonth() === month;
    });
    const totalTasks = monthTasks.length;
    const completedTasks = monthTasks.filter(t => t.is_completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const monthlyProgressBar = document.getElementById('monthly-progress-bar');
    monthlyProgressBar.style.width = `${progress}%`;
    monthlyProgressBar.textContent = `${progress}%`;
    document.getElementById('monthly-progress-title').textContent = `Tiến độ Tháng ${month + 1}`;

    renderTaskList('overdue-tasks-list', tasks.filter(t => t.due_date < todayStr && !t.is_completed));
    renderTaskList('today-tasks-list', tasks.filter(t => t.due_date === todayStr));
    renderTaskList('upcoming-tasks-list', tasks.filter(t => t.due_date > todayStr && !t.is_completed).slice(0, 10));

    const statusCounts = tasks.reduce((acc, t) => { const s = t.status || 'Cần làm'; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    createChart('status-chart', 'pie', Object.keys(statusCounts), Object.values(statusCounts), Object.keys(statusCounts).map(s => STATUS_CHART_COLORS[s] || '#d1d5db'), state.chartInstances);
    
    const priorityCounts = tasks.reduce((acc, t) => { const p = t.priority || 'Trung bình'; acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    createChart('priority-chart', 'doughnut', Object.keys(priorityCounts), Object.values(priorityCounts), Object.keys(priorityCounts).map(p => PRIORITY_COLORS[p] || '#d1d5db'), state.chartInstances);

    const categoryCounts = tasks.reduce((acc, t) => { const c = t.category || 'Chung'; acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    createChart('category-chart', 'pie', Object.keys(categoryCounts), Object.values(categoryCounts), CATEGORY_COLORS, state.chartInstances);

    const personCounts = tasks.reduce((acc, t) => { const name = t.assigned_to_name || 'Chưa giao'; acc[name] = (acc[name] || 0) + 1; return acc; }, {});
    createChart('person-chart', 'bar', Object.keys(personCounts), Object.values(personCounts), CATEGORY_COLORS, state.chartInstances);
}
