import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  const envKeys = Object.keys(import.meta.env).join(', ');
  throw new Error(`Supabase environment variables are missing! Keys found: ${envKeys}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
