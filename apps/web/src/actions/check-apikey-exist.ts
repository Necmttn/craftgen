"use server";

import { action } from "@/lib/safe-action";
import { db } from "@seocraft/supabase/db";
import { z } from "zod";

export const checkAPIKeyExist = action(
  z.object({ projectId: z.string(), key: z.string() }),
  async ({ projectId, key }) => {
    const variable = await db.query.variable.findFirst({
      where: (variable, { eq, and }) =>
        and(eq(variable.key, key), eq(variable.project_id, projectId)),
    });
    if (!variable) throw new Error("API Key not found");
    return !!variable.value;
  }
);