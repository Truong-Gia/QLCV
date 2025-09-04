import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

let supabaseClient = null;

export function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;

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
