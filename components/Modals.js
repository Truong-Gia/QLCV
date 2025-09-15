// components/Modals.js

import { userProfile, teamMembers, tasksCache, PRIORITIES, CATEGORIES } from '../state.js';
import { formatDate } from '../utils/dateUtils.js';
import { renderCurrentView } from '../utils/UIUtils.js';
import { supabaseClient } from '../services/supabaseService.js';
import { modalsContainer } from '../main.js';

export function openProfileModal() {
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
    const footer = `<button id="open-settings-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300">Cài đặt</button>
                    <button id="save-profile-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu thay đổi</button>`;
    
    const modalElement = showModal('Hồ sơ & Quản lý Nhóm', body, footer);
    const closeModal = setupModalEvents(modalElement);
    
    modalElement.querySelector('#open-settings-btn').addEventListener('click', () => {
        closeModal();
        openSettingsModal();
    });
    
    modalElement.querySelector('#save-profile-btn').addEventListener('click', () => {
        const name = modalElement.querySelector('#profile-name-input').value.trim();
        const email = modalElement.querySelector('#profile-email-input').value.trim();
        if (!name || !email) {
            alert('Tên và Email của bạn không được để trống.');
            return;
        }
        userProfile = { name, email };

        const teamText = modalElement.querySelector('#team-members-input').value.trim();
        teamMembers = teamText.split('\n')
            .map(line => line.trim())
            .filter(line => line)
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

        saveUserData();
        updateProfileUI();
        renderCurrentView();
        closeModal();
    });
}

function openSettingsModal() {
    const body = `
        <div class="space-y-4">
            <h4 class="text-lg font-semibold text-red-600">Khu vực nguy hiểm</h4>
            <p class="text-sm text-gray-600">Các hành động sau đây không thể hoàn tác. Hãy chắc chắn trước khi tiếp tục.</p>
            <div>
                <button id="delete-all-data-btn" class="w-full px-4 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700">Xóa Toàn Bộ Dữ Liệu</button>
                <p class="text-xs text-gray-500 mt-1">Thao tác này sẽ xóa vĩnh viễn tất cả công việc và ghi chú cho mọi người dùng trong project Supabase này.</p>
            </div>
        </div>`;
    
    const modalElement = showModal('Cài đặt Nâng cao', body, '');
    const closeModal = setupModalEvents(modalElement);

    modalElement.querySelector('#delete-all-data-btn').addEventListener('click', async () => {
        const confirmation = prompt('HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC.\nTất cả công việc và ghi chú sẽ bị xóa vĩnh viễn cho TẤT CẢ NGƯỜI DÙNG.\n\nGõ "xóa tất cả" để xác nhận.');
        if (confirmation === 'xóa tất cả') {
            const { error } = await supabaseClient.rpc('truncate_all_data');
            if (error) {
                alert('Đã xảy ra lỗi khi xóa dữ liệu: ' + error.message);
            } else {
                alert('Toàn bộ dữ liệu đã được xóa thành công.');
                closeModal();
                location.reload(); 
            }
        } else {
            alert('Hành động đã được hủy.');
        }
    });
}

export function showModal(title, bodyHTML, footerHTML) {
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

export function setupModalEvents(modalElement) {
    const modalId = modalElement.id;
    const closeModal = () => modalElement.remove();
    modalElement.querySelector(`[data-close-modal="${modalId}"]`).addEventListener('click', closeModal);
    return closeModal;
}

export function openAddTaskModal(dueDate = '') {
    const allUsers = [userProfile, ...teamMembers];
    const body = `
        <div class="space-y-4">
            <div>
                <label for="task-content-input" class="block text-sm font-medium text-gray-700">Tên công việc</label>
                <input type="text" id="task-content-input" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="VD: Hoàn thành báo cáo...">
            </div>
             <div>
                <label for="task-due-date-input" class="block text-sm font-medium text-gray-700">Ngày hết hạn</label>
                <input type="date" id="task-due-date-input" value="${dueDate || formatDate(new Date())}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
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
        const dueDateValue = modalElement.querySelector('#task-due-date-input').value;
        if (!content) { alert('Vui lòng nhập tên công việc.'); return; }
        if (!dueDateValue) { alert('Vui lòng chọn ngày hết hạn.'); return; }

        const assignedToEmail = modalElement.querySelector('#task-assign-to').value;
        const assignedToUser = allUsers.find(u => u.email === assignedToEmail);

        const taskData = {
            content: content, due_date: dueDateValue,
            priority: modalElement.querySelector('#task-priority-select').value,
            category: modalElement.querySelector('#task-category-select').value,
            status: 'Cần làm', is_completed: false,
            assigned_to_email: assignedToUser ? assignedToUser.email : null,
            assigned_to_name: assignedToUser ? assignedToUser.name : null,
        };

        const saveBtn = modalElement.querySelector('.save-task-btn');
        saveBtn.disabled = true; saveBtn.textContent = 'Đang lưu...';
        
        const { data, error } = await supabaseClient
            .from('tasks')
            .insert([taskData])
            .select()
            .single(); 
        
        if (error) {
            alert('Lỗi: ' + error.message);
            saveBtn.disabled = false; saveBtn.textContent = 'Lưu công việc';
        } else {
            tasksCache.push(data); 
            renderCurrentView();   
            closeModal();
        }
    });
}

export function openEditTaskModal(taskId) {
    const task = tasksCache.find(t => t.id == taskId);
    if (!task) {
        alert('Không thể tìm thấy công việc.');
        return;
    }
    
    const allUsers = [userProfile, ...teamMembers];
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
                        ${Object.keys(PRIORITIES).map(p => `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Trạng thái</label>
                    <select id="edit-task-status" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                        ${STATUSES.map(s => `<option value="${s}" ${task.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Danh mục</label>
                <input type="text" id="edit-task-category" value="${task.category || ''}" list="category-datalist" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                <datalist id="category-datalist">${CATEGORIES.map(c => `<option value="${c}">`).join('')}</datalist>
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

         const { data, error: updateError } = await supabaseClient
            .from('tasks')
            .update(updatedData)
            .match({ id: taskId })
            .select()
            .single();

         if (updateError) {
             alert('Lỗi khi cập nhật công việc: ' + updateError.message);
         } else {
             const index = tasksCache.findIndex(t => t.id === data.id);
             if (index > -1) {
                 tasksCache[index] = data; // Cập nhật cache
             }
             renderCurrentView(); // Vẽ lại giao diện
             closeModal();
         }
    });

    modalElement.querySelector('#delete-task-btn').addEventListener('click', async () => {
        const confirmed = prompt('Công việc này sẽ bị xóa vĩnh viễn. Gõ "xóa" để xác nhận.');
        if (confirmed === 'xóa') {
            const { error: deleteError } = await supabaseClient.from('tasks').delete().match({ id: taskId });
            if (deleteError) {
                 alert('Lỗi khi xóa công việc: ' + deleteError.message);
            } else {
                tasksCache = tasksCache.filter(t => t.id !== taskId); // Xóa khỏi cache
                renderCurrentView(); // Vẽ lại giao diện
                closeModal();
            }
        }
    });
}

export function showSupabaseModal() {
    const sqlSetup = `
        <h4 class="font-semibold text-gray-800 mt-4 mb-2">Yêu cầu thiết lập Supabase</h4>
        <p class="text-sm text-gray-600 mb-2">Để ứng dụng hoạt động, bạn cần chạy <strong>toàn bộ</strong> kịch bản SQL sau trong <strong class="font-semibold">SQL Editor</strong> của project Supabase.</p>
        <pre class="bg-gray-100 p-2 rounded-md text-xs overflow-x-auto"><code>-- 1. TẠO CÁC BẢNG (NẾU CHƯA CÓ)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  content text,
  due_date date,
  is_completed boolean DEFAULT false,
  priority text,
  category text,
  status text,
  assigned_to_email text,
  assigned_to_name text
);

-- 2. KÍCH HOẠT RLS (BẮT BUỘC)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. XÓA CHÍNH SÁCH CŨ (ĐỂ TRÁNH XUNG ĐỘT)
DROP POLICY IF EXISTS "Enable all access for all users" ON public.tasks;

-- 4. TẠO CHÍNH SÁCH MỚI (CHO PHÉP MỌI NGƯỜI TRUY CẬP)
CREATE POLICY "Enable all access for all users" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- 5. TẠO HÀM (FUNCTION) ĐỂ XÓA DỮ LIỆU (TÙY CHỌN)
CREATE OR REPLACE FUNCTION truncate_all_data()
RETURNS void AS $$
BEGIN
  TRUNCATE TABLE public.tasks RESTART IDENTITY CASCADE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
</code></pre>
    `;
    const body = `
        <p class="text-sm text-gray-600 mb-4">Vui lòng nhập thông tin kết nối Supabase của bạn. Bạn có thể tìm thấy chúng trong mục Settings > API trong project Supabase.</p>
        <div>
            <label for="supabase-url" class="block text-sm font-medium text-gray-700">Project URL</label>
            <input type="text" id="supabase-url" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
        </div>
        <div class="mt-4">
            <label for="supabase-key" class="block text-sm font-medium text-gray-700">Anon (public) Key</label>
            <input type="text" id="supabase-key" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
        </div>
        ${sqlSetup}
    `;
    const footer = `<button id="save-supabase-config" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu và Bắt đầu</button>`;
    const modalElement = showModal('Cấu hình Supabase', body, footer);
    
    modalElement.querySelector('[data-close-modal]').addEventListener('click', () => modalElement.remove());
    
    modalElement.querySelector('#save-supabase-config').addEventListener('click', () => {
        const url = modalElement.querySelector('#supabase-url').value.trim();
        const key = modalElement.querySelector('#supabase-key').value.trim();
        if (url && key) {
            localStorage.setItem('supabaseUrl', url);
            localStorage.setItem('supabaseKey', key);
            modalElement.remove();
            location.reload();
        } else {
            alert("Vui lòng nhập đầy đủ URL và Key.");
        }
    });
}
