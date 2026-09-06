import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[realtime] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set; live sync progress is disabled");
}

// Realtime is a progressive enhancement (sync-progress toasts), so a missing configuration
// degrades to "no live updates" rather than taking the whole app down at module load.
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
