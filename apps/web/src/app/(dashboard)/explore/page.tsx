import Link from "next/link";

import { Button } from "@craftgen/ui/components/button";

import { WorkflowList } from "@/components/template-list";
import { createClient } from "@/utils/supabase/server";

import { getFeaturedWorkflows } from "./actions";
import { ProjectList } from "./project-list";

const DashboardPage = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const featuredWorkflows = await getFeaturedWorkflows();

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full max-w-5xl p-4">
        {user && (
          <>
            <div className="flex items-center justify-between ">
              <h2>Projects</h2>
              <Link href="/project/new">
                <Button>Create New Project.</Button>
              </Link>
            </div>
            <div className="py-4">
              <ProjectList />
            </div>
          </>
        )}
        <div className="py-4">
          <WorkflowList workflows={featuredWorkflows} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
