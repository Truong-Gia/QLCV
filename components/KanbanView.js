import { getState } from '../state.js';
import { getSupabaseClient } from '../services/supabaseService.js';
import { formatDate } from '../utils/dateUtils.js';
import { stringToColor, showToast } from '../utils/uiUtils.js';

// --- CONSTANTS ---
const STATUSES = ['Cần làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'];
const PRIORITY_COLORS = { 'Cao': '#ef4444', 'Trung bình': '#f59e0b', 'Thấp': '#3b82f6' };

/**
 * Renders the HTML for a single task card on the Kanban board.
 * @param {object} task - The task object.
 * @returns {string} - The HTML string for the task card.
 */
function renderKanbanTask(task) {
    const priorityBorder = PRIORITY_COLORS[task.priority] || '#9ca3af';
    return `
        <div class="kanban-task bg-white p-3 rounded-md shadow-sm border-l-4" style="border-color: ${priorityBorder}" data-task-id="${task.id}">
            <p class="font-medium text-sm mb-2">${task.content}</p>
            <div class="flex items-center justify-between text-xs text-gray-500">
                <span>${formatDate(new Date(task.due_date + 'T00:00:00'))}</span>
                ${task.assigned_to_name ? `<div class="avatar text-white" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Initializes drag-and-drop functionality for the Kanban columns using SortableJS.
 */
function setupKanbanDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-tasks');
    const supabase = getSupabaseClient();
    
    columns.forEach(column => {
        new Sortable(column, {
            group: 'kanban',
            animation: 150,
            ghostClass: 'ghost-class',
            onEnd: async function(evt) {
                const taskId = evt.item.dataset.taskId;
                const newStatus = evt.to.dataset.status;
                
                const { error } = await supabase
                    .from('tasks')
                    .update({ status: newStatus })
                    .eq('id', taskId);

                if (error) {
                    showToast("Lỗi cập nhật trạng thái: " + error.message, 'error');
                    // Move the card back to the original column on failure
                    evt.from.appendChild(evt.item);
                } else {
                    showToast("Cập nhật trạng thái thành công!", 'success');
                }
            },
        });
    });
}

/**
 * Renders the entire Kanban view.
 */
export async function renderKanbanView() {
    const container = document.getElementById('kanban-view-container');
    const supabase = getSupabaseClient();
    const { currentFilters } = getState();

    // 1. Render the column structure
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            ${STATUSES.map(status => `
                <div class="bg-gray-100 rounded-lg p-4 flex flex-col">
                    <h3 class="font-semibold mb-4 text-center sticky top-0 bg-gray-100 py-1">${status}</h3>
                    <div class="kanban-tasks flex-grow space-y-3 overflow-y-auto min-h-[400px] p-1" data-status="${status}"></div>
                </div>
            `).join('')}
        </div>
    `;
    container.classList.remove('hidden');

    // 2. Fetch task data based on filters
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
        console.error("Lỗi tải dữ liệu Kanban: ", error.message); 
        return; 
    }

    // 3. Populate columns with task cards
    tasks.forEach(task => {
        const status = task.status || 'Cần làm';
        const column = container.querySelector(`.kanban-tasks[data-status="${status}"]`);
        if(column) {
            column.insertAdjacentHTML('beforeend', renderKanbanTask(task));
        }
    });

    // 4. Activate drag-and-drop functionality
    setupKanbanDragAndDrop();
}
