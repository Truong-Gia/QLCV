import { getState, setState } from '../state.js';
import { getSupabaseClient } from '../services/supabaseService.js';
import { showModal, setupModalEvents, debounce, showToast } from '../utils/uiUtils.js';
import { getWeekDays } from '../utils/dateUtils.js';

const PRIORITIES = { 'Cao': 'bg-red-100 text-red-800', 'Trung bình': 'bg-yellow-100 text-yellow-800', 'Thấp': 'bg-blue-100 text-blue-800' };

/**
 * Opens the modal for editing user profile and managing team members.
 */
export function openProfileModal() {
    const { userProfile, teamMembers } = getState();
    const body = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Tên của bạn</label>
                <input id="profile-name-input" type="text" value="${userProfile.name}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Email của bạn (duy nhất)</label>
                <input id="profile-email-input" type="email" value="${userProfile.email}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
            </div>
            <hr>
            <div>
                <label class="block text-sm font-medium text-gray-700">Thành viên nhóm (mỗi người một dòng)</label>
                <textarea id="team-members-input" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-24" placeholder="Nguyễn Văn A, a@example.com\nhoặc chỉ cần email:\nb@example.com">${teamMembers.map(m => `${m.name}, ${m.email}`).join('\n')}</textarea>
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
            showToast('Tên và Email của bạn không được để trống.', 'error');
            return;
        }
        const newProfile = { name, email };

        const teamText = modalElement.querySelector('#team-members-input').value.trim();
        const newTeam = teamText.split('\n')
            .map(line => line.trim()).filter(line => line)
            .map(line => {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const email = parts.pop().trim();
                    const name = parts.join(',').trim();
                    if (name && email.includes('@')) return { name, email };
                } else if (line.includes('@')) {
                    const email = line.trim();
                    const name = email.split('@')[0];
                    return { name, email };
                }
                return null;
            }).filter(Boolean);

        setState({ userProfile: newProfile, teamMembers: newTeam });
        localStorage.setItem('userProfile', JSON.stringify(newProfile));
        localStorage.setItem('teamMembers', JSON.stringify(newTeam));

        window.updateProfileUI();
        window.renderCurrentView();
        showToast('Cập nhật hồ sơ thành công!', 'success');
        closeModal();
    });
}

/**
 * Opens the modal to add a new task.
 * @param {string} dueDate - The default due date for the task (YYYY-MM-DD).
 */
export function openAddTaskModal(dueDate) {
            const allUsers = [userProfile, ...teamMembers];
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
                            ${Object.keys(PRIORITIES).map(p => `<option value="${p}">${p}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label for="task-category-select" class="block text-sm font-medium text-gray-700">Danh mục</label>
                        <select id="task-category-select" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                            ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
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
                const { error } = await supabaseClient.from('tasks').insert([taskData]);


        if (error) {
            showToast('Lỗi: ' + error.message, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Lưu công việc';
        } else {
            showToast('Thêm công việc thành công!', 'success');
            closeModal();
            window.renderCurrentView();
        }
    });
}


/**
 * Opens the modal for managing habits.
 */
export async function openHabitsModal() {
    const supabase = getSupabaseClient();
    const { data: habits, error } = await supabase.from('habits').select('*').order('created_at');
    if (error) {
        showToast("Lỗi tải thói quen: " + error.message, 'error');
        return;
    }

    const renderHabitList = (habits) => habits.map(h => `
        <li class="flex items-center justify-between p-2 hover:bg-gray-50">
            <span class="${!h.is_active ? 'text-gray-400 line-through' : ''}">${h.name}</span>
            <div class="flex items-center gap-2">
                 <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer toggle-habit-active" data-habit-id="${h.id}" ${h.is_active ? 'checked' : ''}>
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
            await supabase.from('habits').update({ is_active }).eq('id', habitId);
            await window.renderCurrentView();
        }
        if (target.closest('.delete-habit-btn')) {
            const habitId = target.closest('.delete-habit-btn').dataset.habitId;
            if(confirm('Bạn có chắc muốn xóa thói quen này? Hành động này không thể hoàn tác.')) {
                await supabase.from('habits').delete().eq('id', habitId);
                closeModal();
                await window.renderCurrentView();
            }
        }
        if (target.closest('#add-habit-btn')) {
            const input = modalElement.querySelector('#new-habit-name');
            const name = input.value.trim();
            if(name) {
                await supabase.from('habits').insert({ name, is_active: true });
                closeModal();
                await window.renderCurrentView();
            }
        }
    });
}

/**
 * Opens the modal for the weekly review.
 */
export async function openReviewModal() {
    const { currentDate } = getState();
    const supabase = getSupabaseClient();
    const weekDays = getWeekDays(currentDate);
    const year = weekDays[0].getFullYear();
    const weekNumber = Math.ceil((((weekDays[0] - new Date(year, 0, 1)) / 86400000) + 1) / 7);
    const week_identifier = `${year}-W${weekNumber}`;
    
    const { data, error } = await supabase.from('weekly_reviews').select('*').eq('week_identifier', week_identifier).single();
    if(error && error.code !== 'PGRST116') { // Ignore 'range not found' error
        showToast("Lỗi tải tổng kết tuần: " + error.message, 'error');
    }
    
    const body = `
        <div class="space-y-4 text-sm">
            <div>
                <label class="font-semibold text-gray-700">Điều tôi đã làm tốt trong tuần này:</label>
                <textarea id="review-good" class="mt-1 w-full border rounded p-2 h-24">${data?.good || ''}</textarea>
            </div>
             <div>
                <label class="font-semibold text-gray-700">Điều tôi có thể cải thiện:</label>
                <textarea id="review-improve" class="mt-1 w-full border rounded p-2 h-24">${data?.improve || ''}</textarea>
            </div>
             <div>
                <label class="font-semibold text-gray-700">Điều tôi biết ơn:</label>
                <textarea id="review-grateful" class="mt-1 w-full border rounded p-2 h-24">${data?.grateful || ''}</textarea>
            </div>
        </div>
    `;
    const footer = `<div id="review-save-status" class="text-sm text-gray-500 italic"></div>`;
    const modalElement = showModal(`Tổng kết Tuần (${week_identifier})`, body, footer);
    setupModalEvents(modalElement);
    
    const statusEl = modalElement.querySelector('#review-save-status');

    const saveReview = debounce(async () => {
        statusEl.textContent = 'Đang lưu...';
        statusEl.classList.remove('text-green-600', 'text-red-500');

        const reviewData = {
            week_identifier,
            good: modalElement.querySelector('#review-good').value,
            improve: modalElement.querySelector('#review-improve').value,
            grateful: modalElement.querySelector('#review-grateful').value,
        };
        const { error: upsertError } = await supabase.from('weekly_reviews').upsert(reviewData);

        if (upsertError) {
            statusEl.textContent = 'Lỗi! Không thể lưu.';
            statusEl.classList.add('text-red-500');
        } else {
            statusEl.textContent = 'Đã lưu ✓';
            statusEl.classList.add('text-green-600');
        }
    }, 1000);

    modalElement.querySelector('#review-good').addEventListener('input', saveReview);
    modalElement.querySelector('#review-improve').addEventListener('input', saveReview);
    modalElement.querySelector('#review-grateful').addEventListener('input', saveReview);
}


