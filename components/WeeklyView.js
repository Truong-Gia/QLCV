import { state, CONSTANTS } from '../state.js';
import { getFilteredTasksFromCache, renderCurrentView } from '../main.js';
import { supabaseService } from '../services/supabaseService.js';
import { formatDate, getWeekDays } from '../utils/dateUtils.js';
import { stringToColor } from '../utils/uiUtils.js';

const { PRIORITIES } = CONSTANTS;
const weeklyViewContainer = document.getElementById('weekly-view-container');

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
        if(dayDate.toDateString() === today.toDateString()) classes += ' current-day';
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

async function weeklyViewChangeHandler(event) {
     const target = event.target;
     if (target.classList.contains('task-checkbox')) {
        const taskId = target.dataset.taskId;
        const isCompleted = target.checked;
        const updatedStatus = isCompleted ? 'Hoàn thành' : 'Cần làm';

        const { data, error } = await supabaseService.updateTask(taskId, { is_completed: isCompleted, status: updatedStatus });
        
        if (error) {
            console.error("Lỗi cập nhật trạng thái:", error.message);
            target.checked = !isCompleted; 
            alert("Không thể cập nhật trạng thái công việc.");
        } else if (data) {
            const taskIndex = state.tasksCache.findIndex(t => t.id == taskId);
            if (taskIndex > -1) {
                state.tasksCache[taskIndex] = data;
            }
            renderCurrentView();
        }
     }
}

function weeklyViewClickHandler(event) {
    const target = event.target;
    if(target.closest('#prev-week')) { state.currentDate.setDate(state.currentDate.getDate() - 7); renderCurrentView(); }
    if(target.closest('#today-btn')) { state.currentDate = new Date(); renderCurrentView(); }
    if(target.closest('#next-week')) { state.currentDate.setDate(state.currentDate.getDate() + 7); renderCurrentView(); }
}


export function renderWeeklyView() {
    weeklyViewContainer.classList.remove('hidden');
    const weekDays = getWeekDays(state.currentDate);
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
    renderCalendar(state.currentDate);
    
    const weekStartStr = formatDate(weekStart);
    const weekEndStr = formatDate(weekEnd);

    const tasks = getFilteredTasksFromCache();
    const tasksForWeek = tasks.filter(t => t.due_date >= weekStartStr && t.due_date <= weekEndStr);
    
    renderWeeklyGrid(weekDays, tasksForWeek);
    updateWeeklyProgress(tasksForWeek);

    // Add event listeners for this view
    weeklyViewContainer.removeEventListener('click', weeklyViewClickHandler);
    weeklyViewContainer.removeEventListener('change', weeklyViewChangeHandler);
    weeklyViewContainer.addEventListener('click', weeklyViewClickHandler);
    weeklyViewContainer.addEventListener('change', weeklyViewChangeHandler);
}
