"use server";

import { action } from "@/lib/safe-action";
import { db } from "@seocraft/supabase/db";
import { z } from "zod";

export const getWorkflowVersions = action(
  z.object({
    projectSlug: z.string(),
    workflowSlug: z.string(),
  }),
  async (params) => {
    return await db.transaction(async (tx) => {
      return await tx.query.workflow.findFirst({
        where: (workflow, { eq, and }) =>
          and(
            eq(workflow.slug, params.workflowSlug),
            eq(workflow.projectSlug, params.projectSlug)
          ),
        columns: {
          id: true,
          slug: true,
          projectSlug: true,
        },
        with: {
          versions: {
            // where: (workflowVersion, { eq, and, isNotNull }) =>
            //   and(isNotNull(workflowVersion.publishedAt)),
            orderBy: (workflowVersion, { desc }) => [
              desc(workflowVersion.version),
            ],
          },
        },
      });
    });
  }
);
