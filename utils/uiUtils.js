export function showLoading() {
    document.getElementById('loading-spinner').innerHTML = `
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Đang tải dữ liệu...</p>`;
    document.getElementById('loading-spinner').classList.remove('hidden');
    ['weekly-view-container', 'monthly-view-container', 'dashboard-view-container', 'kanban-view-container', 'filters-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

export function hideLoading() {
    document.getElementById('loading-spinner').classList.add('hidden');
}

export function showModal(title, bodyHTML, footerHTML) {
    // ... (This function is unchanged)
}

export function setupModalEvents(modalElement) {
    // ... (This function is unchanged)
}

export function stringToColor(str) {
    // ... (This function is unchanged)
}
