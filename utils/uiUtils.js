export const debounce = (func, timeout = 500) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
};

export function stringToColor(str) {
    if (!str) return '#e0e7ff';
    let hash = 0;
    str.split('').forEach(char => {
        hash = char.charCodeAt(0) + ((hash << 5) - hash);
    });
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + (value & 0xCF | 0x30).toString(16)).substr(-2);
    }
    return color;
}

export function showLoading() {
    document.getElementById('loading-spinner').classList.remove('hidden');
    ['weekly-view-container', 'monthly-view-container', 'dashboard-view-container', 'kanban-view-container', 'filters-container'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
}

export function hideLoading() {
    document.getElementById('loading-spinner').classList.add('hidden');
}

export function showModal(title, bodyHTML, footerHTML) {
    const modalId = `modal-${Date.now()}`;
    const modalElement = document.createElement('div');
    modalElement.id = modalId;
    modalElement.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4';
    modalElement.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 class="text-lg font-semibold">${title}</h3>
                <button class="p-1 rounded-full hover:bg-gray-200" data-close-modal>
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="p-6 modal-body max-h-[60vh] overflow-y-auto">${bodyHTML}</div>
            <div class="p-4 bg-gray-50 border-t flex justify-between items-center">${footerHTML}</div>
        </div>`;
    
    document.getElementById('modals-container').appendChild(modalElement);
    return modalElement;
}

export function setupModalEvents(modalElement) {
    const closeModal = () => modalElement.remove();
    modalElement.querySelector('[data-close-modal]').addEventListener('click', closeModal);
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
            closeModal();
        }
    });
    return closeModal;
}

export function showToast(message, type = 'success') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `text-white px-4 py-2 rounded-md shadow-lg transition-opacity duration-300 ${colors[type]}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}
