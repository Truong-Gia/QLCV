import { getState, setState } from '../state.js';
import { getSupabaseClient } from '../services/supabaseService.js';
import { formatDate } from '../utils/dateUtils.js';
import { stringToColor } from '../utils/uiUtils.js';

// --- CONSTANTS ---
const STATUS_COLORS = { 'Cần làm': '#fca5a5', 'Đang làm': '#fdba74', 'Hoàn thành': '#86efac', 'Tạm dừng': '#d1d5db' };
const PRIORITY_COLORS = { 'Cao': '#ef4444', 'Trung bình': '#f59e0b', 'Thấp': '#3b82f6' };
const CATEGORY_COLORS = ['#6366f1', '#38bdf8', '#34d399', '#facc15', '#a855f7', '#ec4899'];

/**
 * Creates or updates a Chart.js instance.
 * @param {string} canvasId - The ID of the canvas element.
 * @param {string} type - The type of chart (e.g., 'pie', 'doughnut', 'bar').
 * @param {string[]} labels - The labels for the chart data.
 * @param {number[]} data - The data points for the chart.
 * @param {string[]} colors - The colors for the chart segments.
 */
function createChart(canvasId, type, labels, data, colors) {
    const { chartInstances } = getState();
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart instance to prevent memory leaks
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const newChart = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: 'Số lượng',
                data: data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: type === 'bar' ? 0 : 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type !== 'bar',
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 15 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    display: type === 'bar'
                },
                x: {
                    display: type === 'bar'
                }
            }
        }
    });

    // Save the new chart instance to the global state
    setState({ chartInstances: { ...chartInstances, [canvasId]: newChart } });
}

/**
 * Renders a list of tasks into a specified container.
 * @param {string} elementId - The ID of the container element.
 * @param {object[]} tasks - An array of task objects to render.
 */
function renderTaskList(elementId, tasks) {
    const listEl = document.getElementById(elementId);
    if (!listEl) return;

    if (!tasks || tasks.length === 0) {
        listEl.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">Không có công việc nào.</p>`;
        return;
    }
    listEl.innerHTML = tasks.map(task => `
        <div class="text-sm p-2 bg-gray-50 rounded-md border-l-4" style="border-color:${PRIORITY_COLORS[task.priority] || '#d1d5db'}">
            <p class="${task.is_completed ? 'line-through text-gray-400' : ''}">${task.content}</p>
            <div class="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>${formatDate(new Date(task.due_date + 'T00:00:00'))}</span>
                ${task.assigned_to_name ? `<div class="flex items-center gap-1"><div class="avatar text-white" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span>${task.assigned_to_name}</span></div>` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Renders the entire Dashboard view.
 */
export async function renderDashboardView() {
    const container = document.getElementById('dashboard-view-container');
    const supabase = getSupabaseClient();
    const { currentFilters } = getState();

    // 1. Render the basic HTML structure for the dashboard
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div class="bg-white p-4 rounded-lg shadow-sm"><h3 class="font-semibold text-center mb-2">Theo Trạng thái</h3><div class="h-64"><canvas id="status-chart"></canvas></div></div>
           <div class="bg-white p-4 rounded-lg shadow-sm"><h3 class="font-semibold text-center mb-2">Theo Ưu tiên</h3><div class="h-64"><canvas id="priority-chart"></canvas></div></div>
           <div class="bg-white p-4 rounded-lg shadow-sm"><h3 class="font-semibold text-center mb-2">Theo Danh mục</h3><div class="h-64"><canvas id="category-chart"></canvas></div></div>
           <div class="bg-white p-4 rounded-lg shadow-sm"><h3 class="font-semibold text-center mb-2">Theo Người phụ trách</h3><div class="h-64"><canvas id="person-chart"></canvas></div></div>
           
           <div class="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
               <h3 class="font-semibold mb-2 text-red-600">Công việc quá hạn</h3>
               <div id="overdue-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48 pr-1"></div>
           </div>
            <div class="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
               <h3 class="font-semibold mb-2 text-blue-600">Công việc hôm nay</h3>
               <div id="today-tasks-list" class="task-list space-y-2 overflow-y-auto max-h-48 pr-1"></div>
           </div>
        </div>
    `;
    container.classList.remove('hidden');

    // 2. Build and execute the Supabase query based on current filters
    let query = supabase.from('tasks').select('*');
    if (currentFilters.priority !== 'all') query = query.eq('priority', currentFilters.priority);
    if (currentFilters.category !== 'all') query = query.eq('category', currentFilters.category);
    if (currentFilters.person === 'unassigned') {
         query = query.is('assigned_to_email', null);
    } else if (currentFilters.person !== 'all') {
        query = query.eq('assigned_to_email', currentFilters.person);
    }
    
    const { data: tasks, error } = await query;
    if (error) { 
        console.error("Lỗi tải dữ liệu Dashboard: ", error.message); 
        return; 
    }

    // 3. Process data and render the dynamic components
    const todayStr = formatDate(new Date());
    renderTaskList('overdue-tasks-list', tasks.filter(t => t.due_date < todayStr && !t.is_completed));
    renderTaskList('today-tasks-list', tasks.filter(t => t.due_date === todayStr));

    // 4. Calculate stats and render charts
    const statusCounts = tasks.reduce((acc, t) => { const s = t.status || 'Cần làm'; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    createChart('status-chart', 'pie', Object.keys(statusCounts), Object.values(statusCounts), Object.keys(statusCounts).map(s => STATUS_COLORS[s] || '#d1d5db'));
    
    const priorityCounts = tasks.reduce((acc, t) => { const p = t.priority || 'Trung bình'; acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    createChart('priority-chart', 'doughnut', Object.keys(priorityCounts), Object.values(priorityCounts), Object.keys(priorityCounts).map(p => PRIORITY_COLORS[p] || '#d1d5db'));

    const categoryCounts = tasks.reduce((acc, t) => { const c = t.category || 'Chung'; acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    createChart('category-chart', 'pie', Object.keys(categoryCounts), Object.values(categoryCounts), CATEGORY_COLORS);

    const personCounts = tasks.reduce((acc, t) => { const name = t.assigned_to_name || 'Chưa giao'; acc[name] = (acc[name] || 0) + 1; return acc; }, {});
    createChart('person-chart', 'bar', Object.keys(personCounts), Object.values(personCounts), CATEGORY_COLORS);
}
