import { state } from '../state.js';
import { showModal, setupModalEvents } from '../utils/uiUtils.js';

export function openProfileModal() {
    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Tên của bạn</label>
                <input id="profile-name-input" type="text" value="${state.userProfile.name}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Email của bạn (duy nhất)</label>
                <input id="profile-email-input" type="email" value="${state.userProfile.email}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            <hr>
            <div>
                <label class="block text-sm font-medium text-gray-700">Thành viên nhóm (mỗi người một dòng)</label>
                <textarea id="team-members-input" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-24" placeholder="Nguyễn Văn A, a@example.com\nhoặc chỉ cần email:\nb@example.com">${state.teamMembers.map(m => `${m.name}, ${m.email}`).join('\n')}</textarea>
                <p class="text-xs text-gray-500 mt-1">Định dạng: "Tên, email" hoặc chỉ "email". Email là duy nhất.</p>
            </div>
        </div>`;
    const footer = `<div class="flex-grow"></div><button id="save-profile-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu thay đổi</button>`;
    
    const modalElement = showModal('Hồ sơ & Quản lý Nhóm', body, footer);
    const closeModal = setupModalEvents(modalElement);
    
    modalElement.querySelector('#save-profile-btn').addEventListener('click', () => {
        const name = modalElement.querySelector('#profile-name-input').value.trim();
        const email = modalElement.querySelector('#profile-email-input').value.trim();
        if (!name || !email) {
            alert('Tên và Email của bạn không được để trống.');
            return;
        }
        state.userProfile = { name, email };

        const teamText = modalElement.querySelector('#team-members-input').value.trim();
        state.teamMembers = teamText.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const email = parts.pop().trim();
                    const name = parts.join(',').trim();
                    if (name && email.includes('@')) {
                        return { name: name, email: email };
                    }
                } else if (line.includes('@')) {
                    const email = line.trim();
                    const name = email.split('@')[0];
                    return { name: name, email: email };
                }
                return null;
            }).filter(Boolean);
        
        localStorage.setItem('userProfile', JSON.stringify(state.userProfile));
        localStorage.setItem('teamMembers', JSON.stringify(state.teamMembers));

        window.renderCurrentView();
        closeModal();
    });
}

export function openAddTaskModal(dueDate) {
    const allUsers = [state.userProfile, ...state.teamMembers];
    const body = `
        <div class="space-y-4">
            <div>
                <label for="task-content-input" class="block text-sm font-medium text-gray-700">Tên công việc</label>
                <input type="text" id="task-content-input" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="VD: Hoàn thành báo cáo...">
            </div>
            <div>
                <label for="task-assign-to" class="block text-sm font-medium text-gray-700">Giao cho</label>
                <select id="task-assign-to" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">-- Chọn thành viên --</option>
                    ${allUsers.map(u => `<option value="${u.email}">${u.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label for="task-priority-select" class="block text-sm font-medium text-gray-700">Mức độ ưu tiên</label>
                <select id="task-priority-select" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    ${Object.keys(state.PRIORITIES).map(p => `<option value="${p}">${p}</option>`).join('')}
                </select>
            </div>
            <div>
                <label for="task-category-select" class="block text-sm font-medium text-gray-700">Danh mục</label>
                <select id="task-category-select" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                    ${state.CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
        </div>`;
    const footer = `
        <button class="cancel-btn px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Hủy</button>
        <button class="save-task-btn px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu công việc</button>
    `;
    const modalElement = showModal('Thêm công việc mới', body, footer);
    const closeModal = setupModalEvents(modalElement);

    modalElement.querySelector('.cancel-btn').addEventListener('click', closeModal);
    modalElement.querySelector('.save-task-btn').addEventListener('click', async () => {
        const content = modalElement.querySelector('#task-content-input').value.trim();
        if (!content) { alert('Vui lòng nhập tên công việc.'); return; }

        const assignedToEmail = modalElement.querySelector('#task-assign-to').value;
        const assignedToUser = allUsers.find(u => u.email === assignedToEmail);

        const taskData = {
            content: content, due_date: dueDate,
            priority: modalElement.querySelector('#task-priority-select').value,
            category: modalElement.querySelector('#task-category-select').value,
            status: 'Cần làm', is_completed: false,
            assigned_to_email: assignedToUser ? assignedToUser.email : null,
            assigned_to_name: assignedToUser ? assignedToUser.name : null,
        };

        const saveBtn = modalElement.querySelector('.save-task-btn');
        saveBtn.disabled = true; saveBtn.textContent = 'Đang lưu...';
        const { error } = await state.supabase.from('tasks').insert([taskData]);
        
        if (error) {
            alert('Lỗi: ' + error.message);
            saveBtn.disabled = false; saveBtn.textContent = 'Lưu công việc';
        } else {
            closeModal();
            await window.renderCurrentView();
        }
    });
}

export async function openHabitsModal() {
    const { data: habits, error } = await state.supabase.from('habits').select('*').order('created_at');
    if (error) { alert("Lỗi tải thói quen: " + error.message); return; }

    const renderHabitList = (habits) => habits.map(h => `
        <li class="flex items-center justify-between p-2 hover:bg-gray-50">
            <span class="${!h.is_active ? 'text-gray-400' : ''}">${h.name}</span>
            <div class="flex items-center gap-2">
                 <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" value="" class="sr-only peer toggle-habit-active" data-habit-id="${h.id}" ${h.is_active ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <button class="delete-habit-btn p-1 text-gray-400 hover:text-red-600" data-habit-id="${h.id}">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd"></path></svg>
                </button>
            </div>
        </li>
    `).join('');

    const body = `
        <ul id="modal-habit-list" class="space-y-1">${renderHabitList(habits)}</ul>
        <div class="mt-4 pt-4 border-t">
            <div class="flex gap-2">
                <input type="text" id="new-habit-name" class="flex-grow border border-gray-300 rounded-md shadow-sm p-2" placeholder="Tên thói quen mới...">
                <button id="add-habit-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700">Thêm</button>
            </div>
        </div>`;
    
    const modalElement = showModal('Quản lý Thói quen', body, '');
    const closeModal = setupModalEvents(modalElement);

    modalElement.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.closest('.toggle-habit-active')) {
            const habitId = target.closest('.toggle-habit-active').dataset.habitId;
            const is_active = target.closest('.toggle-habit-active').checked;
            await state.supabase.from('habits').update({ is_active }).match({ id: habitId });
            await window.renderCurrentView();
        }
        if (target.closest('.delete-habit-btn')) {
            const habitId = target.closest('.delete-habit-btn').dataset.habitId;
            if(confirm('Bạn có chắc muốn xóa thói quen này?')) {
                await state.supabase.from('habits').delete().match({ id: habitId });
                closeModal();
                await window.renderCurrentView();
            }
        }
        if (target.closest('#add-habit-btn')) {
            const input = modalElement.querySelector('#new-habit-name');
            const name = input.value.trim();
            if(name) {
                await state.supabase.from('habits').insert({ name, is_active: true });
                closeModal();
                await window.renderCurrentView();
            }
        }
    });
}

export async function openReviewModal() {
    
        }


