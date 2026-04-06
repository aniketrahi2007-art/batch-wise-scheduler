import { useEffect, useRef } from 'react';
import { useTimetableStore } from '@/store/timetableStore';
import { loadSharedConfig, saveSharedConfig } from '@/lib/syncConfig';

const SYNC_KEYS = [
  'teachers', 'batches', 'rooms', 'availability', 'mappings',
  'distributions', 'teacherSubDistributions', 'mergeRules', 'teacherPairs',
] as const;

export function useCloudSync() {
  const store = useTimetableStore();
  const loaded = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load from cloud on mount
  useEffect(() => {
    loadSharedConfig().then(config => {
      if (config && Object.keys(config).length > 0) {
        const updates: Record<string, any> = {};
        for (const key of SYNC_KEYS) {
          if (config[key] && Array.isArray(config[key]) && (config[key] as any[]).length > 0) {
            updates[key] = config[key];
          }
        }
        if (Object.keys(updates).length > 0) {
          useTimetableStore.setState(updates);
        }
      }
      loaded.current = true;
    });
  }, []);

  // Save to cloud on changes (debounced)
  useEffect(() => {
    if (!loaded.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const state = useTimetableStore.getState();
      const toSave: Record<string, any> = {};
      for (const key of SYNC_KEYS) {
        toSave[key] = (state as any)[key];
      }
      saveSharedConfig(toSave);
    }, 2000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [
    store.teachers, store.batches, store.rooms, store.availability,
    store.mappings, store.distributions, store.teacherSubDistributions,
    store.mergeRules, store.teacherPairs,
  ]);
}
