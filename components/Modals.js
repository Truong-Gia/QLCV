import { state, CONSTANTS } from '../state.js';
import { supabaseService } from '../services/supabaseService.js';
import { renderCurrentView } from '../main.js';
import { formatDate } from '../utils/dateUtils.js';

const modalsContainer = document.getElementById('modals-container');

// --- Helper Functions for Modals ---
function showModal(title, bodyHTML, footerHTML) {
    const modalId = `modal-${Date.now()}`;
    const modalElement = document.createElement('div');
    modalElement.id = modalId;
    modalElement.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4';
    modalElement.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all glass-effect">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 class="text-lg font-semibold">${title}</h3>
                <button class="p-1 rounded-full hover:bg-gray-200/50" data-close-modal="${modalId}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="p-6 modal-body max-h-[70vh] overflow-y-auto">${bodyHTML}</div>
            <div class="p-4 bg-gray-50/50 border-t flex justify-between items-center">${footerHTML}</div>
        </div>`;
    modalsContainer.appendChild(modalElement);
    return modalElement;
}

function setupModalEvents(modalElement) {
    const modalId = modalElement.id;
    const closeModal = () => modalElement.remove();
    modalElement.querySelector(`[data-close-modal="${modalId}"]`).addEventListener('click', closeModal);
    return closeModal;
}

// --- Specific Modal Implementations ---
export function openAddTaskModal(dueDate = '') {
    const allUsers = [state.userProfile, ...state.teamMembers];
    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Tên công việc</label>
                <input type="text" id="task-content-input" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="VD: Hoàn thành báo cáo...">
            </div>
             <div>
                <label class="block text-sm font-medium text-gray-700">Ngày hết hạn</label>
                <input type="date" id="task-due-date-input" value="${dueDate || formatDate(new Date())}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Giao cho</label>
                <select id="task-assign-to" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">-- Chọn thành viên --</option>
                    ${allUsers.map(u => `<option value="${u.email}">${u.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Mức độ ưu tiên</label>
                <select id="task-priority-select" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    ${Object.keys(CONSTANTS.PRIORITIES).map(p => `<option value="${p}">${p}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Danh mục</label>
                <select id="task-category-select" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    ${CONSTANTS.CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
        </div>`;
    const footer = `<button class="cancel-btn px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Hủy</button>
                    <button class="save-task-btn px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu công việc</button>`;
    
    const modalElement = showModal('Thêm công việc mới', body, footer);
    const closeModal = setupModalEvents(modalElement);

    modalElement.querySelector('.cancel-btn').addEventListener('click', closeModal);
    modalElement.querySelector('.save-task-btn').addEventListener('click', async () => {
        const content = modalElement.querySelector('#task-content-input').value.trim();
        const dueDateValue = modalElement.querySelector('#task-due-date-input').value;
        if (!content || !dueDateValue) { alert('Vui lòng nhập tên công việc và ngày hết hạn.'); return; }

        const assignedToEmail = modalElement.querySelector('#task-assign-to').value;
        const assignedToUser = allUsers.find(u => u.email === assignedToEmail);

        const taskData = {
            content, due_date: dueDateValue,
            priority: modalElement.querySelector('#task-priority-select').value,
            category: modalElement.querySelector('#task-category-select').value,
            status: 'Cần làm', is_completed: false,
            assigned_to_email: assignedToUser ? assignedToUser.email : null,
            assigned_to_name: assignedToUser ? assignedToUser.name : null,
        };

        const { data, error } = await supabaseService.addTask(taskData);
        if (error) {
            alert('Lỗi: ' + error.message);
        } else {
            state.tasksCache.push(data);
            renderCurrentView();
            closeModal();
        }
    });
}

export function openEditTaskModal(taskId) {
    const task = state.tasksCache.find(t => t.id == taskId);
    if (!task) { alert('Không thể tìm thấy công việc.'); return; }
    
    const allUsers = [state.userProfile, ...state.teamMembers];
    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Tên công việc</label>
                <input type="text" id="edit-task-content" value="${task.content}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Ngày hết hạn</label>
                    <input type="date" id="edit-task-due-date" value="${task.due_date}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Giao cho</label>
                    <select id="edit-task-assign-to" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        <option value="">-- Bỏ trống --</option>
                        ${allUsers.map(u => `<option value="${u.email}" ${task.assigned_to_email === u.email ? 'selected' : ''}>${u.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Ưu tiên</label>
                    <select id="edit-task-priority" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        ${Object.keys(CONSTANTS.PRIORITIES).map(p => `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Trạng thái</label>
                    <select id="edit-task-status" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        ${CONSTANTS.STATUSES.map(s => `<option value="${s}" ${task.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Danh mục</label>
                <input type="text" id="edit-task-category" value="${task.category || ''}" list="category-datalist" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                <datalist id="category-datalist">${CONSTANTS.CATEGORIES.map(c => `<option value="${c}">`).join('')}</datalist>
            </div>
        </div>`;

    const footer = `
        <button id="delete-task-btn" class="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">Xóa công việc</button>
        <button id="update-task-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu thay đổi</button>
    `;
    const modalElement = showModal('Chi tiết công việc', body, footer);
    const closeModal = setupModalEvents(modalElement);
    
    modalElement.querySelector('#update-task-btn').addEventListener('click', async () => {
         const content = modalElement.querySelector('#edit-task-content').value.trim();
         if (!content) { alert('Tên công việc không được để trống.'); return; }

         const assignedToEmail = modalElement.querySelector('#edit-task-assign-to').value;
         const assignedToUser = allUsers.find(u => u.email === assignedToEmail);

         const updatedData = {
            content: content,
            due_date: modalElement.querySelector('#edit-task-due-date').value,
            priority: modalElement.querySelector('#edit-task-priority').value,
            status: modalElement.querySelector('#edit-task-status').value,
            category: modalElement.querySelector('#edit-task-category').value.trim(),
            assigned_to_email: assignedToUser ? assignedToUser.email : null,
            assigned_to_name: assignedToUser ? assignedToUser.name : null,
         };
         updatedData.is_completed = updatedData.status === 'Hoàn thành';

         const { data, error } = await supabaseService.updateTask(taskId, updatedData);

         if (error) {
             alert('Lỗi khi cập nhật công việc: ' + error.message);
         } else {
             const index = state.tasksCache.findIndex(t => t.id === data.id);
             if (index > -1) state.tasksCache[index] = data;
             renderCurrentView();
             closeModal();
         }
    });

    modalElement.querySelector('#delete-task-btn').addEventListener('click', async () => {
        const confirmed = prompt('Công việc này sẽ bị xóa vĩnh viễn. Gõ "xóa" để xác nhận.');
        if (confirmed === 'xóa') {
            const { error } = await supabaseService.deleteTask(taskId);
            if (error) {
                 alert('Lỗi khi xóa công việc: ' + error.message);
            } else {
                state.tasksCache = state.tasksCache.filter(t => t.id !== taskId);
                renderCurrentView();
                closeModal();
            }
        }
    });
}


export function openProfileModal() {
    const body = `...`; // (Nội dung HTML cho modal profile)
    // (Logic xử lý sự kiện cho modal)
}

// Bạn có thể thêm các modal khác như openProfileModal, openSettingsModal, showSupabaseModal ở đây theo mẫu trên.
