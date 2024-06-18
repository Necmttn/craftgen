"use client";

import {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useKBar } from "kbar";
import {
  CheckCircle,
  ChevronLeftCircle,
  Loader2,
  Lock,
  Play,
  PlusIcon,
  Shrink,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useCopyToClipboard } from "react-use";

import type { RouterOutputs } from "@craftgen/api";
import type { WorkflowAPI } from "@craftgen/core/types";
import { Button } from "@craftgen/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@craftgen/ui/components/tooltip";
// import { BASE_URL } from "@/lib/constants";
import { api } from "@craftgen/ui/lib/api";

import { useRegisterPlaygroundActions } from "./actions";
import { ContextMenuProvider } from "./context-menu"; // TODO: bind right click to kbar
import { createEditorFunc } from "./editor";
import { useRegistry, useRete } from "./plugins/reactPlugin";

// import { useCraftStore } from "./use-store";

export type ComponentRegistry = Map<
  HTMLElement,
  {
    element: HTMLElement;
    component: ReactNode;
  }
>;

export const Composer: React.FC<{
  workflowMeta: RouterOutputs["craft"]["module"]["meta"];
}> = ({ workflowMeta }) => {
  const { data: latestWorkflow, isLoading } = api.craft.module.get.useQuery(
    {
      projectSlug: workflowMeta.project.slug,
      version: workflowMeta.version?.version!,
      workflowSlug: workflowMeta.slug,
      executionId: workflowMeta.execution?.id,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center fill-current">
        <svg
          className="h-20 w-20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 200"
        >
          <circle
            fill="current"
            stroke="current"
            stroke-width="15"
            r="15"
            cx="40"
            cy="65"
          >
            <animate
              attributeName="cy"
              calcMode="spline"
              dur="2"
              values="65;135;65;"
              keySplines=".5 0 .5 1;.5 0 .5 1"
              repeatCount="indefinite"
              begin="-.4"
            ></animate>
          </circle>
          <circle
            fill="current"
            stroke="current"
            stroke-width="15"
            r="15"
            cx="100"
            cy="65"
          >
            <animate
              attributeName="cy"
              calcMode="spline"
              dur="2"
              values="65;135;65;"
              keySplines=".5 0 .5 1;.5 0 .5 1"
              repeatCount="indefinite"
              begin="-.2"
            ></animate>
          </circle>
          <circle
            fill="current"
            stroke="current"
            stroke-width="15"
            r="15"
            cx="160"
            cy="65"
          >
            <animate
              attributeName="cy"
              calcMode="spline"
              dur="2"
              values="65;135;65;"
              keySplines=".5 0 .5 1;.5 0 .5 1"
              repeatCount="indefinite"
              begin="0"
            ></animate>
          </circle>
        </svg>
      </div>
    );

  return <ComposerUI workflow={latestWorkflow} />;
};

const ComposerUI = (props: {
  workflow: RouterOutputs["craft"]["module"]["get"];
}) => {
  const utils = api.useUtils();
  const workflowAPI: Partial<WorkflowAPI> = {
    trpc: utils.client,
  };
  const [map, componentRegistry] = useRegistry<HTMLElement, ReactElement>();
  const createEditor = useMemo(() => {
    return createEditorFunc({
      workflow: props.workflow,
      api: workflowAPI,
      componentRegistry,
    });
  }, [props.workflow]);
  const [ref, rete] = useRete(createEditor);
  // useEffect(() => {
  //   (window as any).Editor = rete;
  // }, [rete]);

  // const di = useCraftStore((state) => state.di);
  // const layout = useCraftStore((state) => state.layout);

  // useRegisterPlaygroundActions({ di, layout });

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
  const k = useKBar();
  const [copyToClipboardState, copyToClipboard] = useCopyToClipboard();
  // const router = useRouter();
  // const pathname = usePathname();
  // const searchParams = useSearchParams();

  // const handleCopyExecutionId = () => {
  //   if (di?.executionId) {
  //     copyToClipboard(
  //       `${BASE_URL}${pathname}?${createQueryString(
  //         "execution",
  //         di.executionId,
  //       )}`,
  //     );
  //   }
  // };

  // useEffect(() => {
  //   if (di?.executionId) {
  //     window.history.pushState(
  //       null,
  //       "",
  //       `?${createQueryString("execution", di?.executionId)}`,
  //     );
  //   }
  // }, [di?.executionId]);

  // const handleReset = () => {
  //   router.push(`${pathname}?${createQueryString("execution", null)}`);
  // };
  // const createQueryString = useCallback(
  //   (name: string, value: string | null) => {
  //     const params = new URLSearchParams(searchParams.toString());
  //     if (value === null) {
  //       params.delete(name);
  //     } else {
  //       params.set(name, value);
  //     }

  //     return params.toString();
  //   },
  //   [searchParams],
  // );

  return (
    <div className="h-full w-full">
      <div className="absolute left-1 top-1 z-50 flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"outline"}
              className="group cursor-pointer"
              onClick={k.query.toggle}
              size="sm"
            >
              <PlusIcon className="h-4 w-4 group-hover:hidden " />
              <div className="hidden group-hover:flex ">
                {/* <Command className="mr-2 h-4 w-4 " />
                <span>+ K</span> */}
                <span className="hidden group-hover:block">Add Node </span>
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Node</TooltipContent>
        </Tooltip>
      </div>
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
        {/* {di?.executionId && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"outline"}
                  size="sm"
                  onClick={handleReset}
                  className="glass rounded-r-none border-r-0"
                >
                  <ChevronLeftCircle size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go back</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"outline"}
                  size="sm"
                  onClick={handleCopyExecutionId}
                  className="glass rounded-l-none border-l-0"
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
        )} */}
        <Tooltip>
          <TooltipTrigger asChild>
            {/* <Button variant={"ghost"} size="icon" onClick={() => di?.setUI()}>
              <Shrink />
            </Button> */}
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