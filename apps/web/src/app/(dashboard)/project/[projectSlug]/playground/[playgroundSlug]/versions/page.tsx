import type { Metadata, ResolvingMetadata } from "next";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getWorkflowVersions, getWorkflowVersionsById } from "@/actions/get-workflow-versions";
import { getWorkflowMeta } from "@/actions/get-workflow-meta";

type Props = {
  params: {
    projectSlug: string;
    playgroundSlug: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { data: playground } = await getWorkflowMeta({
    projectSlug: params.projectSlug,
    workflowSlug: params.playgroundSlug,
    version: Number(searchParams.version),
  });

  return {
    title: `${playground?.name} | ${playground?.project.name}`,
  };
}

const PlaygroundVersionsPage: React.FC<Props> = async (props) => {
  const { data: workflowMeta } = await getWorkflowMeta({
    projectSlug: props.params.projectSlug,
    workflowSlug: props.params.playgroundSlug,
  });
  const { data: workflow } = await getWorkflowVersionsById({
    workflowId: workflowMeta?.id,
  });
  return (
    <div className="h-full flex flex-col">
      <section className="grid grid-cols-1 divide-y ">
        {workflow?.versions.map((version) => (
          <div className="p-2" key={version.id}>
            <div className="flex">
              <Link
                href={`/${workflow.projectSlug}/${workflow.slug}/versions/${version.version}`}
              >
                <h2 className="text-mono">v{version.version}</h2>
              </Link>
              {!version.publishedAt && (
                <Badge variant={"outline"}>Canary</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{version.changeLog}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default PlaygroundVersionsPage;
