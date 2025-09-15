// services/supabaseService.js

import { tasksCache } from '../state.js';
import { renderCurrentView } from '../utils/UIUtils.js';

let supabaseClient;

export function initSupabase(url, key) {
    supabaseClient = createClient(url, key);
    return supabaseClient;
}

export function setupRealtimeSubscriptions() {
    const handleRealtimeChange = (payload) => {
        console.log('Real-time change received!', payload);
        const { table, eventType, new: newRecord, old: oldRecord } = payload;

        let cacheUpdated = false;
        if (table === 'tasks') {
            if (eventType === 'INSERT') {
                if (!tasksCache.some(t => t.id === newRecord.id)) {
                    tasksCache.push(newRecord);
                    cacheUpdated = true;
                }
            } else if (eventType === 'UPDATE') {
                const index = tasksCache.findIndex(t => t.id === newRecord.id);
                if (index > -1) {
                    tasksCache[index] = newRecord;
                    cacheUpdated = true;
                }
            } else if (eventType === 'DELETE') {
                const initialLength = tasksCache.length;
                tasksCache = tasksCache.filter(t => t.id !== oldRecord.id);
                if (tasksCache.length < initialLength) {
                    cacheUpdated = true;
                }
            }
        }
        
        if (cacheUpdated) renderCurrentView();
    };

    const allTablesSubscription = supabaseClient
        .channel('public-db-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public' },
            handleRealtimeChange
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to real-time updates!');
            } else if (status === 'TIMED_OUT') {
                console.warn('Real-time subscription timed out. Will attempt to reconnect.');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Real-time subscription channel error.', err);
            }
        });
}

export { supabaseClient };
