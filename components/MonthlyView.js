import { state } from '../state.js';
import { stringToColor, getRandomPastelColor } from '../utils/uiUtils.js';
import { renderCurrentView } from '../main.js';

const monthlyViewContainer = document.getElementById('monthly-view-container');

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

export function renderMonthlyView() {
    monthlyViewContainer.classList.remove('hidden');
    const { currentDate, tasksCache } = state;
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
        const taskDate = new Date(t.due_date.replace(/-/g, '/'));
        return taskDate.getFullYear() === year && taskDate.getMonth() === month;
    });

    tasksForMonth.forEach(task => {
        const taskDate = new Date(task.due_date.replace(/-/g, '/'));
        const day = taskDate.getDate();
        
        const dayTasksContainer = document.querySelector(`.month-day[data-day="${day}"] .month-day-tasks`);
        if(dayTasksContainer) {
            dayTasksContainer.innerHTML += `<div class="month-task-item text-xs p-1 rounded bg-white/60 flex gap-1 task-item-clickable" title="${task.content}" data-task-id="${task.id}">
                ${task.assigned_to_name ? `<div class="avatar text-white flex-shrink-0" style="width:14px; height:14px; font-size:0.6rem; background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div>` : ''}
                <span>${task.content}</span>
            </div>`;
        }
    });

    document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCurrentView(); });
    document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCurrentView(); });
}
