import { state } from '../state.js';
import { formatDate } from '../utils/dateUtils.js';

function createChart(canvasId, type, labels, data, colors) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (state.chartInstances[canvasId]) {
        state.chartInstances[canvasId].destroy();
    }
    state.chartInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: 'Số lượng',
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

function renderTaskList(elementId, tasks) {
    const listEl = document.getElementById(elementId);
    if (!listEl) return;
    if (!tasks || tasks.length === 0) {
        listEl.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Không có công việc nào.</p>`;
        return;
    }
    listEl.innerHTML = tasks.map(task => `
        <div class="text-sm p-2 bg-gray-50 rounded-md">
            <p class="${task.is_completed ? 'line-through text-gray-400' : ''}">${task.content}</p>
            <div class="flex items-center justify-between text-xs text-gray-400 mt-1">
                <span>${formatDate(new Date(task.due_date))}</span>
                ${task.assigned_to_name ? `<div class="flex items-center gap-1"><div class="avatar" style="background-color: ${state.stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span>${task.assigned_to_name}</span></div>` : ''}
            </div>
        </div>
    `).join('');
}

export async function renderDashboardView() {
    const dashboardViewContainer = document.getElementById('dashboard-view-container');
    dashboardViewContainer.classList.remove('hidden');
    dashboardViewContainer.innerHTML = `
         <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="md:col-span-4 bg-white p-4 rounded-lg shadow-sm">
                <h3 class="font-semibold mb-2" id="monthly-progress-title">Tiến độ Tháng</h3>
                <div class="bg-gray-200 rounded-full h-4"><div id="monthly-progress-bar" class="bg-green-500 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold" style="width: 0%;">0%</div></div>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm"><h3 class="font-semibold text-center mb-2">Theo Trạng thái</h3><canvas id="status-chart"></canvas></div>
            <div class="bg-white p-4 rounded-lg shadow-sm"><h3 class="font-semibold text-center mb-2">Theo Ưu tiên</h3><canvas id="priority-chart"></canvas></div>
            <div class="bg-white p-4 rounded-lg shadow-sm"><h3 class="font-semibold text-center mb-2">Theo Danh mục</h3><canvas id="category-chart"></canvas></div>
            <div class="bg-white p-4 rounded-lg shadow-sm"><h3 class="font-semibold text-center mb-2">Theo Người phụ trách</h3><canvas id="person-chart"></canvas></div>
            <div class="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
                <h3 class="font-semibold mb-2 text-red-600">Công việc quá hạn</h3>
                <div id="overdue-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48"></div>
            </div>
             <div class="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
                <h3 class="font-semibold mb-2 text-blue-600">Công việc hôm nay</h3>
                <div id="today-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48"></div>
            </div>
             <div class="md:col-span-4 bg-white p-4 rounded-lg shadow-sm">
                <h3 class="font-semibold mb-2 text-gray-600">Công việc sắp tới</h3>
                <div id="upcoming-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48"></div>
            </div>
         </div>`;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDayOfMonth = formatDate(new Date(year, month, 1));
    const lastDayOfMonth = formatDate(new Date(year, month + 1, 0));
    const todayStr = formatDate(today);

    let query = state.supabase.from('tasks').select('*');
    if (state.currentFilters.priority !== 'all') query = query.eq('priority', state.currentFilters.priority);
    if (state.currentFilters.category !== 'all') query = query.eq('category', state.currentFilters.category);
    if (state.currentFilters.person === 'unassigned') {
         query = query.is('assigned_to_email', null);
    } else if (state.currentFilters.person !== 'all') {
        query = query.eq('assigned_to_email', state.currentFilters.person);
    }
    
    const { data: tasks, error } = await query;
    if (error) { alert("Lỗi tải dữ liệu Dashboard: " + error.message); return; }

    // Monthly Progress
    const monthTasks = tasks.filter(t => t.due_date >= firstDayOfMonth && t.due_date <= lastDayOfMonth);
    const totalTasks = monthTasks.length;
    const completedTasks = monthTasks.filter(t => t.is_completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const monthlyProgressBar = document.getElementById('monthly-progress-bar');
    monthlyProgressBar.style.width = `${progress}%`;
    monthlyProgressBar.textContent = `${progress}%`;
    document.getElementById('monthly-progress-title').textContent = `Tiến độ Tháng ${month + 1}`;
    
    // Task Lists
    renderTaskList('overdue-tasks-list', tasks.filter(t => t.due_date < todayStr && !t.is_completed));
    renderTaskList('today-tasks-list', tasks.filter(t => t.due_date === todayStr));
    renderTaskList('upcoming-tasks-list', tasks.filter(t => t.due_date > todayStr && !t.is_completed).slice(0, 10));

    // Charts
    const statusCounts = tasks.reduce((acc, t) => { const s = t.status || 'Cần làm'; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    createChart('status-chart', 'pie', Object.keys(statusCounts), Object.values(statusCounts), Object.keys(statusCounts).map(s => state.STATUS_COLORS[s] || '#d1d5db'));
    
    const priorityCounts = tasks.reduce((acc, t) => { const p = t.priority || 'Trung bình'; acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    createChart('priority-chart', 'doughnut', Object.keys(priorityCounts), Object.values(priorityCounts), Object.keys(priorityCounts).map(p => state.PRIORITY_COLORS[p] || '#d1d5db'));

    const categoryCounts = tasks.reduce((acc, t) => { const c = t.category || 'Chung'; acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    createChart('category-chart', 'pie', Object.keys(categoryCounts), Object.values(categoryCounts), state.CATEGORY_COLORS);

    const personCounts = tasks.reduce((acc, t) => { const name = t.assigned_to_name || 'Chưa giao'; acc[name] = (acc[name] || 0) + 1; return acc; }, {});
    createChart('person-chart', 'bar', Object.keys(personCounts), Object.values(personCounts), state.CATEGORY_COLORS);
}


