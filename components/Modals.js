import { showModal, setupModalEvents } from '../utils/uiUtils.js';

const state = window.state;

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
    // ... Function implementation
}

export async function openReviewModal() {
    // ... Function implementation
}

