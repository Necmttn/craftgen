"use client";

import { ReactElement, ReactNode, useEffect, useMemo } from "react";
import {
  CheckCircle,
  ChevronLeftCircle,
  Loader2,
  Lock,
  Play,
  Shrink,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import { createPortal } from "react-dom";

import { useRegistry, useRete } from "@seocraft/core/src/plugins/reactPlugin";
import type { WorkflowAPI } from "@seocraft/core/src/types";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/shared";

import { ContextMenuProvider } from "./context-menu"; // TODO: bind right click to kbar
import { createEditorFunc } from "./editor";
import { useCraftStore } from "./use-store";
import { useRegisterPlaygroundActions } from "./actions";

export type ComponentRegistry = Map<
  HTMLElement,
  {
    element: HTMLElement;
    component: ReactNode;
  }
>;

export const Composer: React.FC<{
  workflowMeta: RouterOutputs["craft"]["module"]["meta"];
  store: any;
}> = observer(({ workflowMeta, store }) => {
  const { data: latestWorkflow, isLoading } = api.craft.module.get.useQuery(
    {
      projectSlug: workflowMeta.project.slug,
      version: workflowMeta.version?.version!,
      workflowSlug: workflowMeta.slug,
      // executionId: workflow?.execution?.id,
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading) return <div> Loading </div>;
  console.log({ latestWorkflow });
  // return (
  //   <div>
  //     <pre>{JSON.stringify(latestWorkflow, null, 2)}</pre>
  //   </div>
  // );
  return <ComposerUI workflow={latestWorkflow} store={store} />;
});

const ComposerUI = (props: {
  workflow: RouterOutputs["craft"]["module"]["get"];
  store: any;
}) => {
  const utils = api.useUtils();
  const workflowAPI: Partial<WorkflowAPI> = {
    trpc: utils.client,
  };
  const [map, componentRegistry] = useRegistry<HTMLElement, ReactElement>();
  const createEditor = useMemo(() => {
    return createEditorFunc({
      workflow: props.workflow,
      store: props.store.current,
      api: workflowAPI,
      componentRegistry,
    });
  }, [props.workflow, props.store.current]);
  const [ref, rete] = useRete(createEditor);
  useEffect(() => {
    (window as any).Editor = rete;
  }, [rete]);

  const di = useCraftStore((state) => state.di);
  const layout = useCraftStore((state) => state.layout);
  const handleReset = () => {
    di?.reset();
  };

  useRegisterPlaygroundActions({ di, layout });

  const portals = useMemo(() => {
    return Array.from(map.entries()).reduce(
      (prev, curr) => {
        const [key, value] = curr;
        if (!document.body.contains(key)) {
          componentRegistry.remove(key);
          return prev;
        }
        return [
          ...prev,
          {
            element: key,
            component: value,
          },
        ];
      },
      [] as { element: HTMLElement; component: ReactNode }[],
    );
  }, [map]);

  return (
    <div className="h-full w-full">
      <div className="absolute right-1 top-1 z-50 flex ">
        {props.workflow.readonly && props.workflow.version?.publishedAt && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={"outline"}
                className="group cursor-pointer"
                size="sm"
              >
                <Lock className="h-4 w-4 group-hover:mr-2" />
                <span className="hidden group-hover:block">Read Only</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              This workflow is read-only because it is published.
            </TooltipContent>
          </Tooltip>
        )}
        {di?.executionId && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={"outline"} size="icon" onClick={handleReset}>
                  <ChevronLeftCircle size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go back</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"outline"}
                  // size="icon"
                  onClick={() => di?.setUI()}
                >
                  {false && (
                    <Loader2
                      size={14}
                      className="animate-spin text-green-400"
                    />
                  )}
                  {false && <Play size={14} />}
                  {true && <CheckCircle size={14} className="text-green-400" />}
                  <p className="ml-2 truncate">{di?.executionId}</p>
                </Button>
              </TooltipTrigger>
              <TooltipContent>The Execution: Current </TooltipContent>
            </Tooltip>
          </>
        )}
        {!di?.executionId && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"outline"}
                  onClick={() => di?.createExecution()}
                >
                  <Play size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <>
                  <Play size={14} />
                  Create a Execution
                </>
              </TooltipContent>
            </Tooltip>
          </>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size="icon" onClick={() => di?.setUI()}>
              <Shrink />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Center the content</TooltipContent>
        </Tooltip>
      </div>
      <ContextMenuProvider>
        {portals.map((portal) =>
          createPortal(portal.component, portal.element),
        )}
        <div ref={ref} id="rete-root" className="h-full w-full "></div>
      </ContextMenuProvider>
    </div>
  );
};
