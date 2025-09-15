// components/ListView.js

import { tasksCache, PRIORITIES, STATUS_COLORS } from '../state.js';
import { getFilteredTasksFromCache } from '../utils/UIUtils.js';
import { stringToColor } from '../utils/dateUtils.js';
import { sortConfig } from '../state.js';

export function renderListView() {
    listViewContainer.classList.remove('hidden');
    let tasks = getFilteredTasksFromCache();

    // Sorting logic
    const priorityOrder = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };
    tasks.sort((a, b) => {
        let valA, valB;

        if (sortConfig.key === 'priority') {
            valA = priorityOrder[a.priority] || 0;
            valB = priorityOrder[b.priority] || 0;
        } else {
            valA = a[sortConfig.key] || '';
            valB = b[sortConfig.key] || '';
        }

        if (valA < valB) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });
    
    const sortIcon = (key) => {
        if (sortConfig.key !== key) return `<svg class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>`;
        if (sortConfig.direction === 'ascending') return `<svg class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>`;
        return `<svg class="sort-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
    };

    const headerClass = (key) => `sortable-header py-3 px-6 ${sortConfig.key === key ? 'sorted' : ''}`;

    listViewContainer.innerHTML = `
        <div class="rounded-lg shadow-sm overflow-x-auto bg-white/80 glass-effect border border-gray-200/60">
            <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50/80">
                    <tr>
                        <th scope="col" class="py-3 px-6">Công việc</th>
                        <th scope="col" class="py-3 px-6">Người phụ trách</th>
                        <th scope="col" data-sort-key="status" class="${headerClass('status')}">Trạng thái ${sortIcon('status')}</th>
                        <th scope="col" data-sort-key="priority" class="${headerClass('priority')}">Ưu tiên ${sortIcon('priority')}</th>
                        <th scope="col" data-sort-key="due_date" class="${headerClass('due_date')}">Ngày hết hạn ${sortIcon('due_date')}</th>
                        <th scope="col" class="py-3 px-6"><span class="sr-only">Hành động</span></th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.length > 0 ? tasks.map(renderListItem).join('') : '<tr><td colspan="6" class="text-center py-4">Không có công việc nào.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    // Add event listener for sorting
    listViewContainer.querySelector('thead').addEventListener('click', (e) => {
        const header = e.target.closest('[data-sort-key]');
        if (header) {
            const key = header.dataset.sortKey;
            if (sortConfig.key === key) {
                sortConfig.direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
            } else {
                sortConfig.key = key;
                sortConfig.direction = 'ascending';
            }
            renderListView(); // Re-render only the list view
        }
    });
}

export function renderListItem(task) {
    const statusClass = STATUS_COLORS[task.status] || STATUS_COLORS['Cần làm'];
    const priorityClass = PRIORITIES[task.priority] || PRIORITIES['Trung bình'];

    const assignedUserHTML = task.assigned_to_name 
        ? `<div class="flex items-center gap-2"><div class="avatar" style="background-color: ${stringToColor(task.assigned_to_email)}" title="${task.assigned_to_name}">${task.assigned_to_name.charAt(0)}</div><span>${task.assigned_to_name}</span></div>` 
        : '<span class="text-gray-400 italic">Chưa giao</span>';
    
    const dateParts = task.due_date.split('-').map(Number);
    const localDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

    return `
        <tr class="bg-white border-b hover:bg-gray-50/80 task-item-clickable" data-task-id="${task.id}">
            <td class="py-4 px-6 font-medium text-gray-900">${task.content}</td>
            <td class="py-4 px-6">${assignedUserHTML}</td>
            <td class="py-4 px-6"><span class="status-badge ${statusClass}">${task.status || 'Cần làm'}</span></td>
            <td class="py-4 px-6"><span class="task-tag ${priorityClass}">${task.priority || 'Trung bình'}</span></td>
            <td class="py-4 px-6">${localDate.toLocaleDateString('vi-VN')}</td>
            <td class="py-4 px-6 text-right">
                <button class="edit-task-btn font-medium text-indigo-600 hover:underline" data-task-id="${task.id}">Sửa</button>
            </td>
        </tr>
    `;
}
