import { formatDate } from '../utils/dateUtils.js';
import { stringToColor } from '../utils/uiUtils.js';

const state = window.state;

function renderKanbanTask(task) {
    const priorityClass = state.PRIORITIES[task.priority] || state.PRIORITIES['Trung bình'];
    const priorityBorder = state.PRIORITY_COLORS[task.priority] || '#9ca3af';
    return `
        <div class="kanban-task bg-white p-3 rounded-md shadow-sm border-l-4" style="border-color: ${priorityBorder}" data-task-id="${task.id}">
            <p class="font-medium text-sm mb-2">${task.content}</p>
            <div class="flex items-center justify-between text-xs text-gray-500">
                <span>${formatDate(new Date(task.due_date))}</span>
                ${task.assigned_to_name ? `<div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div>` : ''}
            </div>
        </div>
    `;
}

function setupKanbanDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-tasks');
    columns.forEach(column => {
        new Sortable(column, {
            group: 'kanban',
            animation: 150,
            ghostClass: 'ghost-class',
            onEnd: async function(evt) {
                const taskId = evt.item.dataset.taskId;
                const newStatus = evt.to.dataset.status;
                
                const { error } = await state.supabase
                    .from('tasks')
                    .update({ status: newStatus })
                    .match({ id: taskId });

                if (error) {
                    alert("Lỗi cập nhật trạng thái: " + error.message);
                    // Revert on error by moving the item back
                    evt.from.appendChild(evt.item);
                }
            },
        });
    });
}

export async function renderKanbanView() {
    const kanbanViewContainer = document.getElementById('kanban-view-container');
    kanbanViewContainer.classList.remove('hidden');
    kanbanViewContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            ${state.STATUSES.map(status => `
                <div class="bg-gray-100 rounded-lg p-4 flex flex-col">
                    <h3 class="font-semibold mb-4 text-center">${status}</h3>
                    <div class="kanban-tasks flex-grow space-y-3 overflow-y-auto min-h-[300px]" data-status="${status}"></div>
                </div>
            `).join('')}
        </div>
    `;

    let query = state.supabase.from('tasks').select('*');
    if (state.currentFilters.priority !== 'all') query = query.eq('priority', state.currentFilters.priority);
    if (state.currentFilters.category !== 'all') query = query.eq('category', state.currentFilters.category);
    if (state.currentFilters.person === 'unassigned') {
         query = query.is('assigned_to_email', null);
    } else if (state.currentFilters.person !== 'all') {
        query = query.eq('assigned_to_email', state.currentFilters.person);
    }

    const { data: tasks, error } = await query;
    if (error) { alert("Lỗi tải dữ liệu Kanban: " + error.message); return; }

    tasks.forEach(task => {
        const status = task.status || 'Cần làm';
        const column = kanbanViewContainer.querySelector(`.kanban-tasks[data-status="${status}"]`);
        if(column) {
            column.insertAdjacentHTML('beforeend', renderKanbanTask(task));
        }
    });

    setupKanbanDragAndDrop();
}
