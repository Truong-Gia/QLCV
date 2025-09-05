import { state } from '../state.js';
import { formatDate, getWeekDays } from '../utils/dateUtils.js';
import { stringToColor } from '../utils/uiUtils.js';
import { openAddTaskModal, openHabitsModal, openReviewModal } from './Modals.js';

const state = window.state;

async function fetchDataForWeek(startDate, endDate) {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    const [tasksRes, habitsRes, habitEntriesRes, notesRes] = await Promise.all([
        state.supabase.from('tasks').select('*').gte('due_date', start).lte('due_date', end).order('created_at'),
        state.supabase.from('habits').select('*').eq('is_active', true).order('created_at'),
        state.supabase.from('habit_entries').select('*').gte('entry_date', start).lte('entry_date', end),
        state.supabase.from('daily_notes').select('*').gte('note_date', start).lte('note_date', end)
    ]);
    const checkError = (res, name) => { if (res.error) console.error(`Fetch ${name} error:`, res.error.message); return res.data || []; };
    return { 
        tasks: checkError(tasksRes, 'tasks'), 
        habits: checkError(habitsRes, 'habits'), 
        habitEntries: checkError(habitEntriesRes, 'habit entries'), 
        notes: checkError(notesRes, 'notes') 
   };
}

function renderTask(task) {
    const priorityClass = state.PRIORITIES[task.priority] || state.PRIORITIES['Trung bình'];
    const assignedUserHTML = task.assigned_to_name 
        ? `<div class="flex items-center gap-1 mt-2 ml-6"><div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span class="text-xs text-gray-600">${task.assigned_to_name}</span></div>` 
        : '';

    return `
        <div class="p-2 rounded-md border ${task.is_completed ? 'bg-gray-50' : 'bg-white'}">
            <div class="flex items-start gap-2">
                <input type="checkbox" class="task-checkbox mt-1 flex-shrink-0" data-task-id="${task.id}" ${task.is_completed ? 'checked' : ''}>
                <p class="flex-grow text-sm ${task.is_completed ? 'line-through text-gray-400' : ''}">${task.content}</p>
            </div>
            <div class="flex items-center flex-wrap gap-2 mt-2 ml-6">
                <span class="task-tag ${priorityClass}">${task.priority || 'Trung bình'}</span>
                ${task.category ? `<span class="task-tag bg-gray-100 text-gray-800">${task.category}</span>` : ''}
            </div>
            ${assignedUserHTML}
        </div>
    `;
}

function renderWeeklyGrid(weekDays, tasks, habits, habitEntries, notes) {
    const weeklyGrid = document.getElementById('weekly-grid');
    if(!weeklyGrid) return;
    weeklyGrid.innerHTML = weekDays.map(day => {
        const dayStr = formatDate(day);
        const tasksForDay = tasks.filter(t => t.due_date === dayStr);
        const progress = tasksForDay.length > 0 ? (tasksForDay.filter(t => t.is_completed).length / tasksForDay.length) * 100 : 0;
        const noteForDay = notes.find(n => n.note_date === dayStr);

        return `
        <div class="bg-white p-4 rounded-lg shadow-sm flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <div class="text-center">
                    <p class="font-semibold text-lg">${day.toLocaleDateString('vi-VN', { weekday: 'short' })}</p>
                    <p class="text-sm text-gray-500">${day.getDate()}</p>
                </div>
                <div class="donut-chart" style="--progress: ${progress}%">
                    <div class="chart-text">${Math.round(progress)}<span class="text-xs">%</span></div>
                </div>
            </div>
            <h4 class="font-semibold text-sm mb-2 mt-2 border-t pt-2">Công việc</h4>
            <div class="task-list flex-grow space-y-2 overflow-y-auto max-h-48 pr-2">
                ${tasksForDay.length > 0 ? tasksForDay.map(renderTask).join('') : '<p class="text-xs text-gray-400">Không có công việc nào.</p>'}
            </div>
            <button class="add-task-btn mt-2 w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-semibold" data-date="${dayStr}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Thêm công việc
            </button>
            <h4 class="font-semibold text-sm mb-2 mt-4 border-t pt-2">Thói quen</h4>
            <ul class="habit-list text-sm space-y-1">
                 ${habits.map(h => {
                     const entry = habitEntries.find(e => e.habit_id === h.id && e.entry_date === dayStr);
                     return `
                        <li class="habit-item">
                            <label for="habit-${h.id}-${dayStr}" class="flex-grow cursor-pointer">${h.name}</label>
                            <input type="checkbox" id="habit-${h.id}-${dayStr}" class="habit-checkbox" data-habit-id="${h.id}" data-date="${dayStr}" ${entry ? 'checked' : ''}>
                        </li>`;
                 }).join('')}
            </ul>
            <h4 class="font-semibold text-sm mb-2 mt-4 border-t pt-2">Ghi chú</h4>
            <textarea class="daily-note text-sm w-full border rounded p-1.5 h-20" data-date="${dayStr}" placeholder="Ghi chú nhanh...">${noteForDay?.content || ''}</textarea>
        </div>`;
    }).join('');
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

function setupWeeklyViewEventListeners() {
    const weeklyView = document.getElementById('weekly-view-container');
    if (!weeklyView) return;

    weeklyView.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.closest('#prev-week')) { state.currentDate.setDate(state.currentDate.getDate() - 7); window.renderCurrentView(); }
        if (target.closest('#today-btn')) { state.currentDate = new Date(); window.renderCurrentView(); }
        if (target.closest('#next-week')) { state.currentDate.setDate(state.currentDate.getDate() + 7); window.renderCurrentView(); }
        if (target.closest('#open-habits-btn')) { openHabitsModal(); }
        if (target.closest('#open-review-btn')) { openReviewModal(); }
        const taskTarget = event.target.closest('.add-task-btn');
        if (taskTarget) { openAddTaskModal(taskTarget.dataset.date); }
    });
    
    const debouncedSaveNote = (func, timeout = 500) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    };

    weeklyView.addEventListener('input', (event) => {
        const target = event.target;
        if (target.classList.contains('daily-note')) {
           debouncedSaveNote(async () => {
                const noteData = { note_date: target.dataset.date, content: target.value };
                await state.supabase.from('daily_notes').upsert(noteData);
           })();
        }
   });

   weeklyView.addEventListener('change', async (event) => {
        const target = event.target;
        if (target.classList.contains('habit-checkbox')) {
            const habit_id = target.dataset.habitId;
            const entry_date = target.dataset.date;
            if (target.checked) {
                await state.supabase.from('habit_entries').upsert({ habit_id, entry_date });
            } else {
                await state.supabase.from('habit_entries').delete().match({ habit_id, entry_date });
            }
        }
        if (target.classList.contains('task-checkbox')) {
           const taskId = target.dataset.taskId;
           const isCompleted = target.checked;
           await state.supabase.from('tasks').update({ is_completed: isCompleted }).match({ id: taskId });
           await window.renderCurrentView();
        }
   });
}

export async function renderWeeklyView() {
    const weeklyViewContainer = document.getElementById('weekly-view-container');
    weeklyViewContainer.classList.remove('hidden');
    const weekDays = getWeekDays(state.currentDate);
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];

    weeklyViewContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div class="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between">
                <div id="calendar-container"></div>
                 <div class="grid grid-cols-2 gap-2 mt-4">
                    <button id="open-habits-btn" class="w-full text-sm font-semibold py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-md">Quản lý Thói quen</button>
                    <button id="open-review-btn" class="w-full text-sm font-semibold py-2 px-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-md">Tổng kết Tuần</button>
                </div>
            </div>
            <div class="lg:col-span-3 bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div class="flex items-center gap-2">
                    <button id="prev-week" class="p-2 rounded-md hover:bg-gray-100"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button>
                    <button id="today-btn" class="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 rounded-md">Hôm nay</button>
                    <button id="next-week" class="p-2 rounded-md hover:bg-gray-100"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>
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
    
    const { tasks, habits, habitEntries, notes } = await fetchDataForWeek(weekStart, weekEnd);
    
    renderWeeklyGrid(weekDays, tasks, habits, habitEntries, notes);
    updateWeeklyProgress(tasks);
    setupWeeklyViewEventListeners();
}




