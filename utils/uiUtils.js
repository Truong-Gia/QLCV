export function showLoading() {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (!loadingSpinner) return;
    loadingSpinner.innerHTML = `
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Đang tải dữ liệu...</p>`;
    loadingSpinner.classList.remove('hidden');
    ['weekly-view-container', 'monthly-view-container', 'dashboard-view-container', 'kanban-view-container', 'filters-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

export function hideLoading() {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) loadingSpinner.classList.add('hidden');
}

export function showModal(title, bodyHTML, footerHTML) {
    const modalsContainer = document.getElementById('modals-container');
    if (!modalsContainer) return null;

    const modalId = `modal-${Date.now()}`;
    const modalElement = document.createElement('div');
    modalElement.id = modalId;
    modalElement.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4';
    modalElement.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 class="text-lg font-semibold">${title}</h3>
                <button class="p-1 rounded-full hover:bg-gray-200" data-close-modal="${modalId}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="p-6 modal-body max-h-[60vh] overflow-y-auto">${bodyHTML}</div>
            <div class="p-4 bg-gray-50 border-t flex justify-end gap-2">${footerHTML}</div>
        </div>`;
    
    modalsContainer.appendChild(modalElement);
    return modalElement;
}

export function setupModalEvents(modalElement) {
    if (!modalElement) return () => {};
    const modalId = modalElement.id;
    const closeModal = () => modalElement.remove();
    const closeButton = modalElement.querySelector(`[data-close-modal="${modalId}"]`);
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    return closeModal;
}

export function updateProfileUI(userProfile) {
    const nameDisplay = document.getElementById('user-name-display');
    const avatarDisplay = document.getElementById('user-avatar');
    if (nameDisplay) nameDisplay.textContent = userProfile.name || 'Hồ sơ';
    if (avatarDisplay) avatarDisplay.textContent = userProfile.name ? userProfile.name.charAt(0).toUpperCase() : '?';
}

export function showSupabaseModal() {
    const body = `
        <p class="text-sm text-gray-600 mb-4">Vui lòng nhập thông tin kết nối Supabase của bạn.</p>
        <div>
            <label for="supabase-url" class="block text-sm font-medium text-gray-700">Project URL</label>
            <input type="text" id="supabase-url" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
        </div>
        <div class="mt-4">
            <label for="supabase-key" class="block text-sm font-medium text-gray-700">Anon (public) Key</label>
            <input type="text" id="supabase-key" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
        </div>
    `;
    const footer = `<button id="save-supabase-config" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Lưu và Bắt đầu</button>`;
    const modalElement = showModal('Cấu hình Supabase', body, footer);
    const closeModal = setupModalEvents(modalElement);
    
    const saveButton = modalElement.querySelector('#save-supabase-config');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const urlInput = modalElement.querySelector('#supabase-url');
            const keyInput = modalElement.querySelector('#supabase-key');
            if (urlInput && keyInput) {
                const url = urlInput.value.trim();
                const key = keyInput.value.trim();
                if (url && key) {
                    localStorage.setItem('supabaseUrl', url);
                    localStorage.setItem('supabaseKey', key);
                    closeModal();
                    location.reload();
                } else {
                    alert("Vui lòng nhập đầy đủ URL và Key.");
                }
            }
        });
    }
}

