import { state } from '../state.js';

export const supabaseService = {
    async initialize(url, key) {
        const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
        state.supabaseClient = createClient(url, key);
        return state.supabaseClient;
    },

    async testConnection() {
        return await state.supabaseClient.from('tasks').select('id').limit(1);
    },

    async getAllTasks() {
        return await state.supabaseClient.from('tasks').select('*');
    },

    async addTask(taskData) {
        return await state.supabaseClient.from('tasks').insert([taskData]).select().single();
    },

    async updateTask(taskId, updatedData) {
        return await state.supabaseClient.from('tasks').update(updatedData).match({ id: taskId }).select().single();
    },

    async deleteTask(taskId) {
        return await state.supabaseClient.from('tasks').delete().match({ id: taskId });
    },
    
    async deleteAllData() {
        return await state.supabaseClient.rpc('truncate_all_data');
    },

    subscribeToChanges(callback) {
        return state.supabaseClient
            .channel('public-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, callback)
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to real-time updates!');
                } else {
                    console.error('Real-time subscription failed.', err);
                }
            });
    }
};
