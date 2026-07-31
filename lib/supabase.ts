import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const REQUEST_TIMEOUT_MS = 8_000;

const fetchWithTimeout: typeof fetch = (input, init = {}) => {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, {
    ...init,
    signal,
  });
};

export const supabase =
  typeof window === "undefined"
      ? createClient(supabaseUrl, supabaseAnonKey, {
        global: { fetch: fetchWithTimeout },
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      })
    : createBrowserClient(supabaseUrl, supabaseAnonKey, {
        global: { fetch: fetchWithTimeout },
      });
