import { state } from '../state.js';
import { getFilteredTasksFromCache } from '../main.js';
import { stringToColor } from '../utils/uiUtils.js';

const membersViewContainer = document.getElementById('members-view-container');

export function renderMembersView() {
    membersViewContainer.classList.remove('hidden');
    const tasksForOverview = getFilteredTasksFromCache(); 

    const allUsers = [state.userProfile, ...state.teamMembers];
    
    const memberStats = allUsers.map(user => {
        const assignedTasks = tasksForOverview.filter(t => t.assigned_to_email === user.email);
        return {
            ...user,
            total: assignedTasks.length,
            completed: assignedTasks.filter(t => t.status === 'Hoàn thành').length,
            in_progress: assignedTasks.filter(t => t.status === 'Đang làm').length,
        }
    });

    membersViewContainer.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">Tổng quan Nhân sự</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${memberStats.map(member => `
                <div class="p-4 rounded-lg shadow-sm bg-white/90 border-l-4" style="border-left-color: ${stringToColor(member.email)}">
                    <div class="flex items-center space-x-4 mb-4">
                        <div class="avatar" style="width: 40px; height: 40px; font-size: 1.25rem; background-color: ${stringToColor(member.email)}">${member.name.charAt(0)}</div>
                        <div>
                            <p class="font-semibold text-lg">${member.name}</p>
                            <p class="text-sm text-gray-500">${member.email}</p>
                        </div>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Tổng công việc:</span> <span class="font-semibold">${member.total}</span></div>
                        <div class="flex justify-between"><span>Đang thực hiện:</span> <span class="font-semibold text-orange-600">${member.in_progress}</span></div>
                        <div class="flex justify-between"><span>Đã hoàn thành:</span> <span class="font-semibold text-green-600">${member.completed}</span></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
