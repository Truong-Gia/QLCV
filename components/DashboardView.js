// components/DashboardView.js

import { tasksCache, PRIORITIES, STATUS_CHART_COLORS, PRIORITY_COLORS, CATEGORY_COLORS } from '../state.js';
import { formatDate, stringToColor } from '../utils/dateUtils.js';
import { getFilteredTasksFromCache } from '../utils/UIUtils.js';
import { chartInstances } from '../state.js';
import { renderTask } from './WeeklyView.js'; // Reuse renderTask if possible

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

    renderTaskList('overdue-tasks-list', tasks.filter(t => t.due_date < todayStr && !t.is_completed));
    renderTaskList('today-tasks-list', tasks.filter(t => t.due_date === todayStr));
    renderTaskList('upcoming-tasks-list', tasks.filter(t => t.due_date > todayStr && !t.is_completed).slice(0, 10));

    const statusCounts = tasks.reduce((acc, t) => { const s = t.status || 'Cần làm'; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    createChart('status-chart', 'pie', Object.keys(statusCounts), Object.values(statusCounts), Object.keys(statusCounts).map(s => STATUS_CHART_COLORS[s] || '#d1d5db'));
    
    const priorityCounts = tasks.reduce((acc, t) => { const p = t.priority || 'Trung bình'; acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    createChart('priority-chart', 'doughnut', Object.keys(priorityCounts), Object.values(priorityCounts), Object.keys(priorityCounts).map(p => PRIORITY_COLORS[p] || '#d1d5db'));

    const categoryCounts = tasks.reduce((acc, t) => { const c = t.category || 'Chung'; acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    createChart('category-chart', 'pie', Object.keys(categoryCounts), Object.values(categoryCounts), CATEGORY_COLORS);

    const personCounts = tasks.reduce((acc, t) => { const name = t.assigned_to_name || 'Chưa giao'; acc[name] = (acc[name] || 0) + 1; return acc; }, {});
    createChart('person-chart', 'bar', Object.keys(personCounts), Object.values(personCounts), CATEGORY_COLORS);
}

export function createChart(canvasId, type, labels, data, colors, centerText = '') {
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
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: 'rgba(255,255,255,0.8)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, font: { size: 12 } }
                }
            }
        },
        plugins: chartPlugins
    });
}

function renderTaskList(listId, tasks) {
    const listContainer = document.getElementById(listId);
    if (!listContainer) return;
    listContainer.innerHTML = tasks.length > 0 ? tasks.map(renderTask).join('') : '<p class="text-sm text-gray-500">Không có công việc nào.</p>';
}
