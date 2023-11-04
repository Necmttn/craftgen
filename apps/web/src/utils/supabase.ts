import type { Database } from "@seocraft/supabase/db/database.types";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/env.mjs";

export const getServiceSupabase = () =>
  createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      },
    },
  );
