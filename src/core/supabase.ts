import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykvogmlldhqapvbpjzto.supabase.co';
const supabaseAnonKey = 'sb_publishable_UtqGxDX6f1qM4aYUMMFKRg__MQoil7V';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
