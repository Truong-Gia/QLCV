import { getState, setState } from '../state.js';
import { getSupabaseClient } from '../services/supabaseService.js';
import { formatDate } from '../utils/dateUtils.js';
import { stringToColor } from '../utils/uiUtils.js';

/**
 * Hàm nội bộ: Render HTML cho một ô ngày trong tháng.
 * @param {number} day - Ngày trong tháng (ví dụ: 1, 2, 3...)
 * @param {number} month - Tháng (0-11)
 * @param {number} year - Năm
 * @returns {string} - Chuỗi HTML cho một ô ngày.
 */
function renderMonthDay(day, month, year) {
    const today = new Date();
    let dayClasses = 'month-day p-2 flex flex-col';
    
    // Đánh dấu ngày hôm nay bằng màu nền khác
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayClasses += ' bg-indigo-50';
    }

    return `
        <div class="${dayClasses}" data-day="${day}">
            <span class="font-medium ${day === today.getDate() && month === today.getMonth() ? 'text-indigo-600' : ''}">${day}</span>
            <div class="month-day-tasks mt-1 space-y-1 overflow-y-auto max-h-20 pr-1">
                </div>
        </div>
    `;
}

/**
 * Hàm chính (được export): Render toàn bộ giao diện Lịch Tháng.
 */
export async function renderMonthlyView() {
    // Lấy các state cần thiết
    const { currentDate } = getState();
    const supabase = getSupabaseClient();
    const container = document.getElementById('monthly-view-container');

    // Các tính toán về ngày tháng
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    let startDayOfWeek = firstDayOfMonth.getDay(); // 0=CN, 1=T2,...
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Chuyển sang 0=T2, 1=T3,..., 6=CN

    // 1. Render cấu trúc HTML cơ bản của lịch tháng
    container.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm">
            <div class="p-4 flex justify-between items-center border-b">
                 <button id="prev-month" class="p-2 rounded-md hover:bg-gray-100" aria-label="Tháng trước">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                 </button>
                 <h2 class="text-xl font-semibold">${firstDayOfMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}</h2>
                 <button id="next-month" class="p-2 rounded-md hover:bg-gray-100" aria-label="Tháng sau">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                 </button>
            </div>
            <div class="month-grid">
                ${['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ Nhật'].map(day => `<div class="p-2 text-center font-semibold text-sm text-gray-600 border-b">${day}</div>`).join('')}
                ${Array(startDayOfWeek).fill('').map(() => `<div class="month-day other-month"></div>`).join('')}
                ${Array.from({length: daysInMonth}, (_, i) => renderMonthDay(i + 1, month, year)).join('')}
            </div>
        </div>
    `;
    container.classList.remove('hidden');

    // 2. Lấy dữ liệu công việc của tháng từ Supabase
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .gte('due_date', formatDate(firstDayOfMonth))
        .lte('due_date', formatDate(lastDayOfMonth));

    if (error) {
        console.error('Lỗi tải công việc tháng:', error.message);
        // Có thể thêm thông báo lỗi cho người dùng ở đây
        return;
    }

    // 3. Chèn các công việc vào đúng ngày trên lịch
    tasks.forEach(task => {
        // Lấy ngày từ chuỗi 'YYYY-MM-DD'
        const day = new Date(task.due_date + 'T00:00:00').getDate(); 
        const dayTasksContainer = container.querySelector(`.month-day[data-day="${day}"] .month-day-tasks`);
        if (dayTasksContainer) {
            dayTasksContainer.innerHTML += `
                <div class="text-xs p-1 rounded bg-indigo-100 text-indigo-800 truncate flex items-center gap-1" title="${task.content}">
                    ${task.assigned_to_name ? `<div class="avatar text-white" style="width:14px; height:14px; font-size:0.6rem; background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div>` : ''}
                    <span>${task.content}</span>
                </div>`;
        }
    });

    // 4. Gán sự kiện cho các nút chuyển tháng
    document.getElementById('prev-month').addEventListener('click', () => {
        const newDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
        setState({ currentDate: newDate });
        window.renderCurrentView(); // Gọi hàm render lại toàn cục
    });
    document.getElementById('next-month').addEventListener('click', () => {
        const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        setState({ currentDate: newDate });
        window.renderCurrentView(); // Gọi hàm render lại toàn cục
    });
}
