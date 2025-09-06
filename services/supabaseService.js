import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { showModal, setupModalEvents } from '../utils/uiUtils.js';

let supabaseClient;

export function initializeSupabase() {
    const savedUrl = localStorage.getItem('supabaseUrl');
    const savedKey = localStorage.getItem('supabaseKey');

    if (savedUrl && savedKey) {
        try {
            supabaseClient = createClient(savedUrl, savedKey);
            return supabaseClient;
        } catch (e) {
            console.error('Lỗi khởi tạo Supabase:', e);
            localStorage.clear();
            return null;
        }
    }
    return null;
}

export function getSupabaseClient() {
    if (!supabaseClient) {
        console.error("Supabase client chưa được khởi tạo!");
    }
    return supabaseClient;
}

export function showSupabaseModal() {
    const body = `
        <p class="text-sm text-gray-600 mb-4">Vui lòng nhập thông tin kết nối Supabase của bạn.</p>
        <div>
            <label for="supabase-url" class="block text-sm font-medium text-gray-700">Project URL</label>
            <input type="text" id="supabase-url" class="mt-1 block w-full border rounded-md p-2">
        </div>
        <div class="mt-4">
            <label for="supabase-key" class="block text-sm font-medium text-gray-700">Anon (public) Key</label>
            <input type="text" id="supabase-key" class="mt-1 block w-full border rounded-md p-2">
        </div>
    `;
    const footer = `<button id="save-supabase-config" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Lưu và Bắt đầu</button>`;
    const modalElement = showModal('Cấu hình Supabase', body, footer);
    const closeModal = setupModalEvents(modalElement);
    
    modalElement.querySelector('#save-supabase-config').addEventListener('click', () => {
        const url = modalElement.querySelector('#supabase-url').value.trim();
        const key = modalElement.querySelector('#supabase-key').value.trim();
        if (url && key) {
            localStorage.setItem('supabaseUrl', url);
            localStorage.setItem('supabaseKey', key);
            closeModal();
            location.reload();
        } else {
            alert("Vui lòng nhập đầy đủ URL và Key.");
        }
    });
}

