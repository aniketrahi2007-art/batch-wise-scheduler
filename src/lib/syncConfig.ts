import { supabase } from '@/integrations/supabase/client';

interface SharedConfig {
  teachers: any[];
  batches: any[];
  rooms: any[];
  availability: any[];
  mappings: any[];
  distributions: any[];
  teacherSubDistributions: any[];
  mergeRules: any[];
  teacherPairs: any[];
}

const CONFIG_ID = 'default';
const SYNC_KEYS: (keyof SharedConfig)[] = [
  'teachers', 'batches', 'rooms', 'availability', 'mappings',
  'distributions', 'teacherSubDistributions', 'mergeRules', 'teacherPairs',
];

export async function loadSharedConfig(): Promise<Partial<SharedConfig> | null> {
  const { data, error } = await supabase
    .from('shared_config')
    .select('config')
    .eq('id', CONFIG_ID)
    .single();

  if (error || !data) return null;
  const config = data.config as Record<string, any>;
  if (!config || Object.keys(config).length === 0) return null;
  return config as Partial<SharedConfig>;
}

export async function saveSharedConfig(state: Record<string, any>): Promise<void> {
  const config: Record<string, any> = {};
  for (const key of SYNC_KEYS) {
    if (state[key] !== undefined) config[key] = state[key];
  }

  await supabase
    .from('shared_config')
    .update({ config, updated_at: new Date().toISOString() })
    .eq('id', CONFIG_ID);
}
