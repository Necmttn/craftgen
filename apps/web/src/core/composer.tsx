"use client";

import { useEffect, useMemo } from "react";
import {
  CheckCircle,
  ChevronLeftCircle,
  Loader2,
  Lock,
  Play,
  Shrink,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import { useRete } from "rete-react-plugin";

import type { WorkflowAPI } from "@seocraft/core/src/types";

import { getWorkflow } from "@/actions/get-workflow";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ResultOfAction } from "@/lib/type";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/shared";

import { ContextMenuProvider } from "./context-menu"; // TODO: bind right click to kbar
import { createEditorFunc } from "./editor";
import { useCraftStore } from "./use-store";

export const Composer: React.FC<{
  workflow: RouterOutputs["craft"]["module"]["get"];
  store: any;
}> = observer(({ workflow, store }) => {
  const di = useCraftStore((state) => state.di);
  const { mutateAsync: upsertNode } = api.craft.node.upsert.useMutation();
  const { mutateAsync: deleteNode } = api.craft.node.delete.useMutation();
  const { mutateAsync: saveEdge } = api.craft.edge.create.useMutation();
  const { mutateAsync: deleteEdge } = api.craft.edge.delete.useMutation();
  const { mutateAsync: setContext } = api.craft.node.setContext.useMutation();
  const { mutateAsync: setState } = api.craft.execution.setState.useMutation();
  const { mutateAsync: updateNodeMetadata } =
    api.craft.node.updateMetadata.useMutation();
  const { mutateAsync: createExecution } =
    api.craft.execution.create.useMutation();
  const utils = api.useUtils();
  const getModule = utils.craft.module.getById.fetch;

  const workflowAPI: Partial<WorkflowAPI> = {
    upsertNode,
    deleteNode,
    saveEdge,
    deleteEdge,
    setContext,
    setState,
    updateNodeMetadata,
    createExecution,
    getModule,
  };

  const createEditor = useMemo(() => {
    return createEditorFunc({
      workflow,
      store: store.current,
      api: workflowAPI,
    });
  }, [workflow, store.current]);
  const [ref, rete] = useRete(createEditor);
  useEffect(() => {
    (window as any).Editor = rete;
  }, [rete]);

  const handleReset = () => {
    di?.reset();
  };
  return (
    <div className="h-full w-full">
      <div className="absolute right-1 top-1 z-50 flex ">
        {workflow.readonly && workflow.version.publishedAt && (
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} size="icon" onClick={() => di?.setUI()}>
              <Shrink />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Center the content</TooltipContent>
        </Tooltip>
      </div>
      {/* <ContextMenuProvider> */}
      <div ref={ref} className="h-full w-full " />
      {/* </ContextMenuProvider> */}
    </div>
  );
});
