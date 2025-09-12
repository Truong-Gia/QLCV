import { state, CONSTANTS } from '../state.js';
import { getFilteredTasksFromCache } from '../main.js';
import { formatDate } from '../utils/dateUtils.js';
import { debounce, createChart } from '../utils/uiUtils.js';

const { STATUS_CHART_COLORS, PRIORITY_COLORS } = CONSTANTS;
const reportsViewContainer = document.getElementById('reports-view-container');

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
    const memberName = personEmail === 'all' ? 'Tất cả thành viên' : (state.teamMembers.find(m => m.email === personEmail) || state.userProfile).name;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Hoàn thành').length;
    const overdueTasks = tasks.filter(t => !t.is_completed && new Date(t.due_date) < new Date()).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    contentArea.innerHTML = `
        <div class="p-4 rounded-lg shadow-sm bg-white">
            <h3 class="font-semibold text-xl mb-4">Báo cáo hiệu suất cho: <span class="text-indigo-600">${memberName}</span></h3>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
                <div class="p-4 bg-blue-50 rounded-lg"><p class="text-2xl font-bold text-blue-600">${totalTasks}</p><p class="text-sm text-gray-600">Tổng công việc</p></div>
                <div class="p-4 bg-green-50 rounded-lg"><p class="text-2xl font-bold text-green-600">${completionRate}%</p><p class="text-sm text-gray-600">Tỷ lệ hoàn thành</p></div>
                 <div class="p-4 bg-red-50 rounded-lg"><p class="text-2xl font-bold text-red-600">${overdueTasks}</p><p class="text-sm text-gray-600">Công việc quá hạn</p></div>
                 <div class="p-4 bg-yellow-50 rounded-lg"><p class="text-2xl font-bold text-yellow-600">${completedTasks} / ${totalTasks}</p><p class="text-sm text-gray-600">Hoàn thành / Tổng</p></div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="p-4 rounded-lg shadow-sm bg-teal-50 border border-teal-200/80"><h3 class="font-semibold text-center mb-2 text-teal-800">Phân loại theo Trạng thái</h3><div class="h-64 relative"><canvas id="report-status-chart"></canvas></div></div>
                <div class="p-4 rounded-lg shadow-sm bg-amber-50 border border-amber-200/80"><h3 class="font-semibold text-center mb-2 text-amber-800">Phân loại theo Ưu tiên</h3><div class="h-64 relative"><canvas id="report-priority-chart"></canvas></div></div>
            </div>
        </div>
    `;

    const statusCounts = tasks.reduce((acc, t) => { const s = t.status || 'Cần làm'; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    createChart('report-status-chart', 'pie', Object.keys(statusCounts), Object.values(statusCounts), Object.keys(statusCounts).map(s => STATUS_CHART_COLORS[s] || '#d1d5db'), state.chartInstances);
    
    const priorityCounts = tasks.reduce((acc, t) => { const p = t.priority || 'Trung bình'; acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    createChart('report-priority-chart', 'doughnut', Object.keys(priorityCounts), Object.values(priorityCounts), Object.keys(priorityCounts).map(p => PRIORITY_COLORS[p] || '#d1d5db'), state.chartInstances);
}

function exportReportToCSV() {
    const tasks = getReportTasks();
    if (tasks.length === 0) { alert('Không có dữ liệu để xuất.'); return; }

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

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(';') + '\n' + rows.map(e => e.join(';')).join('\n');
    
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
    if (tasks.length === 0) { alert('Không có dữ liệu để xuất.'); return; }

    // This is a placeholder for a base64 encoded font. 
    // For a real application, you might need to host the font file and fetch it.
    // Due to environment limitations, a full base64 font cannot be included here.
    // We will proceed without it, and jsPDF will use a default font.
    console.warn("Custom font not loaded. PDF will use a default font.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // In a real scenario with a proper build setup, you would add the font like this:
    // doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    // doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    // doc.setFont('Roboto', 'normal');

    const personName = document.getElementById('report-person-filter').selectedOptions[0].text;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    doc.setFontSize(16);
    doc.text(`Bao cao Cong viec`, 14, 16); // Using non-unicode for default font

    doc.setFontSize(11);
    doc.text(`Doi tuong: ${personName}`, 14, 24);
    doc.text(`Tu ngay: ${startDate} den ngay: ${endDate}`, 14, 30);

    const tableColumn = ["Cong viec", "Nguoi phu trach", "Trang thai", "Ngay het han"];
    const tableRows = tasks.map(task => [
        task.content,
        task.assigned_to_name || 'N/A',
        task.status || 'Can lam',
        task.due_date
    ]);

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        // styles: { font: "Roboto", fontStyle: 'normal' },
        headStyles: { fontStyle: 'bold', fillColor: [41, 128, 185] }
    });

    doc.save('bao_cao_cong_viec.pdf');
}

function setupReportEventListeners() {
    const container = reportsViewContainer;
    if (!container) return;
    
    container.querySelectorAll('.report-range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.report-range-btn').forEach(b => b.classList.remove('btn-active'));
            btn.classList.add('btn-active');
            
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

export function renderReportsView() {
    reportsViewContainer.classList.remove('hidden');
    const allUsers = [state.userProfile, ...state.teamMembers];

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
                            <button id="export-csv-btn" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"><span>CSV</span></button>
                            <button id="export-pdf-btn" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"><span>PDF</span></button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="report-content-area" class="space-y-6"></div>
        </div>
    `;
    setupReportEventListeners();
    setReportDateRange('this_week'); 
    document.querySelector('.report-range-btn[data-range="this_week"]').click();
}
