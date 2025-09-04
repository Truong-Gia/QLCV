import { formatDate } from '../utils/dateUtils.js';
import { stringToColor } from '../utils/uiUtils.js';

const state = window.state;

function renderMonthDay(day, month, year) {
    const today = new Date();
    let dayClasses = 'month-day p-2 flex flex-col';
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayClasses += ' bg-indigo-50';
    }
    return `
        <div class="${dayClasses}" data-day="${day}">
            <span class="font-medium ${day === today.getDate() && month === today.getMonth() ? 'text-indigo-600' : ''}">${day}</span>
            <div class="month-day-tasks mt-1 space-y-1 overflow-y-auto max-h-20"></div>
        </div>
    `;
}

export async function renderMonthlyView() {
    const monthlyViewContainer = document.getElementById('monthly-view-container');
    monthlyViewContainer.classList.remove('hidden');
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    let startDayOfWeek = firstDayOfMonth.getDay(); 
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    monthlyViewContainer.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm">
            <div class="p-4 flex justify-between items-center border-b">
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
    
    const { data: tasks, error } = await state.supabase.from('tasks').select('*').gte('due_date', formatDate(firstDayOfMonth)).lte('due_date', formatDate(lastDayOfMonth));
    if(error) { alert('Lỗi tải công việc tháng: ' + error.message); return; }

    tasks.forEach(task => {
        const day = new Date(task.due_date).getDate();
        const dayTasksContainer = document.querySelector(`.month-day[data-day="${day}"] .month-day-tasks`);
        if(dayTasksContainer) {
            dayTasksContainer.innerHTML += `<div class="text-xs p-1 rounded bg-indigo-100 text-indigo-800 truncate flex items-center gap-1" title="${task.content}">
                ${task.assigned_to_name ? `<div class="avatar text-white" style="width:14px; height:14px; font-size:0.6rem; background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div>` : ''}
                <span>${task.content}</span>
            </div>`;
        }
    });

    document.getElementById('prev-month').addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth() - 1); window.renderCurrentView(); });
    document.getElementById('next-month').addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth() + 1); window.renderCurrentView(); });
}

