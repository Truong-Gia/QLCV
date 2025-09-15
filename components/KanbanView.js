// components/KanbanView.js

import { tasksCache, STATUSES, KANBAN_COLUMN_COLORS, STATUS_COLORS } from '../state.js';
import { getFilteredTasksFromCache } from '../utils/UIUtils.js';
import { stringToColor } from '../utils/dateUtils.js';
import { supabaseClient } from '../services/supabaseService.js';

export function renderKanbanView() {
    kanbanViewContainer.classList.remove('hidden');
    const tasks = getFilteredTasksFromCache();
    
    kanbanViewContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            ${STATUSES.map(status => `
                <div class="p-4 rounded-lg shadow-sm glass-effect ${KANBAN_COLUMN_COLORS[status] || 'bg-gray-100/80'}">
                    <h3 class="font-semibold mb-4 text-center">${status} (${tasks.filter(t => t.status === status).length})</h3>
                    <div class="kanban-tasks space-y-3 overflow-y-auto max-h-[calc(100vh-250px)]" data-status="${status}">
                        ${tasks.filter(t => t.status === status).map(renderKanbanTask).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    setupKanbanDragAndDrop();
}

function renderKanbanTask(task) {
    const priorityClass = PRIORITIES[task.priority] || PRIORITIES['Trung bình'];
    const assignedUserHTML = task.assigned_to_name 
        ? `<div class="flex items-center gap-1 mt-1"><div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span class="text-xs text-gray-600">${task.assigned_to_name}</span></div>` 
        : '';
    
    return `
        <div class="kanban-task p-3 rounded-md bg-white/80 border border-gray-200/60 shadow-sm task-item-clickable" data-task-id="${task.id}">
            <p class="text-sm font-medium mb-2">${task.content}</p>
            <div class="flex flex-wrap gap-2 mb-2">
                <span class="task-tag ${priorityClass}">${task.priority || 'Trung bình'}</span>
                ${task.category ? `<span class="task-tag bg-gray-100 text-gray-800">${task.category}</span>` : ''}
            </div>
            ${assignedUserHTML}
            <p class="text-xs text-gray-500 mt-2">Hết hạn: ${task.due_date}</p>
        </div>
    `;
}

function setupKanbanDragAndDrop() {
    document.querySelectorAll('.kanban-tasks').forEach(column => {
        new Sortable(column, {
            group: 'kanban',
            animation: 150,
            ghostClass: 'ghost-class',
            onEnd: async (evt) => {
                const taskId = evt.item.dataset.taskId;
                const newStatus = evt.to.dataset.status;
                
                const { data, error } = await supabaseClient
                    .from('tasks')
                    .update({ status: newStatus, is_completed: newStatus === 'Hoàn thành' })
                    .match({ id: taskId })
                    .select()
                    .single();
                
                if (error) {
                    alert('Lỗi cập nhật trạng thái: ' + error.message);
                    evt.to.removeChild(evt.item);
                    evt.from.insertBefore(evt.item, evt.from.children[evt.oldIndex]);
                } else {
                    const index = tasksCache.findIndex(t => t.id == taskId);
                    if (index > -1) tasksCache[index] = data;
                    renderCurrentView();
                }
            }
        });
    });
}
