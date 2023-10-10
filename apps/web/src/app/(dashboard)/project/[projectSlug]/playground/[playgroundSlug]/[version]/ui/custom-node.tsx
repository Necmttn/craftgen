import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { RenderEmit, Presets, Drag } from "rete-react-plugin";
import { createNode } from "../io";
import { Key } from "ts-key-enum";
import { Schemes, nodesMeta } from "../types";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Play, Wrench } from "lucide-react";
import { AnyActorRef } from "xstate";
import { useSelector } from "@xstate/react";
import { useStore } from "zustand";
import { ReteStoreInstance } from "../store";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import * as FlexLayout from "flexlayout-react";
import { useDebounce } from "react-use";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { ToastAction } from "@/components/ui/toast";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Resizable } from "react-resizable";
import "react-resizable/css/styles.css";
import { useState } from "react";
import { createExecution, updateNodeMeta } from "../../action";
import { Label } from "@/components/ui/label";

const { RefSocket, RefControl } = Presets.classic;

type NodeExtraData = {
  width?: number;
  height?: number;
  actor: AnyActorRef;
  action?: string;
};

function sortByIndex<T extends [string, undefined | { index?: number }][]>(
  entries: T
) {
  entries.sort((a, b) => {
    const ai = a[1]?.index || 0;
    const bi = b[1]?.index || 0;

    return ai - bi;
  });
}

type Props<S extends Schemes> = {
  data: S["Node"] & NodeExtraData;
  styles?: () => any;
  emit: RenderEmit<S>;
  store: ReteStoreInstance;
};
export type NodeComponent = (props: Props<Schemes>) => JSX.Element;

export function CustomNode(props: Props<Schemes>) {
  const inputs = Object.entries(props.data.inputs);
  const outputs = Object.entries(props.data.outputs);
  const controls = Object.entries(props.data.controls);
  const selected = props.data.selected || false;
  const { id } = props.data;
  const {
    di,
    workflowId,
    workflowVersionId,
    projectSlug,
    layout,
    setSelectedNodeId,
    workflowExecutionId,
    setWorkflowExecutionId,
  } = useStore(props.store);
  const [debug, SetDebug] = React.useState(false);
  const status = useSelector(props.data.actor, (state) => state.status);

  sortByIndex(inputs);
  sortByIndex(outputs);
  sortByIndex(controls);

  const deleteNode = React.useCallback(async () => {
    setSelectedNodeId(null);
    const connections =
      di?.editor.getConnections().filter((c) => {
        return c.source === props.data.id || c.target === props.data.id;
      }) || [];
    for (const connection of connections) {
      await di?.editor.removeConnection(connection.id);
    }
    await di?.editor.removeNode(props.data.id);
  }, [props.data]);

  const cloneNode = React.useCallback(async () => {
    console.log("clone node", {
      data: props.data,
      name: props.data.ID,
      state: props.data.actor.getSnapshot(),
    });
    const rawState = JSON.stringify(props.data.actor.getSnapshot());
    const newNode = await createNode({
      di: di!,
      type: props.data.ID,
      data: {
        ...props.data,
        context: {
          state: JSON.parse(rawState),
        },
      } as any, //TODO:TYPE
      saveToDB: true,
      workflowId: workflowId,
      projectSlug,
    });
    await di?.editor.addNode(newNode);
    await di?.area?.translate(newNode.id, di?.area?.area.pointer);
  }, []);
  const triggerNode = async () => {
    console.log({ workflowExecutionId, status });
    if (status === "done") {
      toast({
        title: "Creating new execution",
        description: "",
      });
      // return;
    }
    if (!workflowExecutionId || status === "done") {
      const nodes = di?.editor.getNodes().map((n) => {
        return {
          id: n.id,
          type: n.ID,
          contextId: n.contextId,
          state: null,
        };
      });
      if (!nodes) {
        throw new Error("No nodes");
      }
      const { data: execution } = await createExecution({
        workflowId: workflowId!,
        workflowVersionId,
        nodes,
      });
      if (!execution) {
        throw new Error("Execution not created");
      }
      setWorkflowExecutionId(execution.id);
      // di?.engine?.execute(props.data.id, undefined, execution.id);
    } else {
      di?.engine?.execute(props.data.id, undefined, workflowExecutionId);
    }
  };

  const pinNode = React.useCallback(async () => {
    const tabset = layout.getActiveTabset()?.getId()!;
    layout.doAction(
      FlexLayout.Actions.addNode(
        {
          type: "tab",
          component: "inspectorNode",
          name: props.data.label,
          config: {
            nodeId: props.data.id,
          },
        },
        tabset,
        FlexLayout.DockLocation.CENTER,
        1
      )
    );
  }, []);

  useHotkeys<HTMLDivElement>(
    `${Key.Backspace}, ${Key.Delete}`,
    async () => {
      await deleteNode();
    },
    {
      enabled: selected,
    }
  );
  useHotkeys<HTMLDivElement>(
    `${Key.Meta}+d`,
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await cloneNode();
    },
    {
      enabled: selected,
    }
  );

  useHotkeys<HTMLDivElement>(
    `${Key.Meta}+${Key.Enter}`,
    async (event) => {
      triggerNode();
    },
    {
      enabled: selected,
    }
  );

  const toggleDebug = () => {
    SetDebug(!debug);
  };
  const ref = React.useRef<HTMLButtonElement>(null);
  Drag.useNoDrag(ref);
  const ref2 = React.useRef<HTMLButtonElement>(null);
  Drag.useNoDrag(ref2);

  const state = useSelector(props.data.actor, (state) => state);

  const { toast } = useToast();
  React.useEffect(() => {
    const subs = props.data.actor.subscribe((state) => {
      if (state.matches("error")) {
        if (state.context.error.name === "MISSING_API_KEY_ERROR") {
          toast({
            title: "Error",
            description: state.context.error.message,
            action: (
              <Link href={`/project/${projectSlug}/settings/tokens`}>
                <ToastAction altText={"go to settings"}>
                  {/* <Button size="sm">Go to Settings</Button> */}
                  Go to Settings
                </ToastAction>
              </Link>
            ),
          });
        } else {
          toast({
            title: "Error",
            description: state.context.error.message,
          });
        }
      }
    });
    return subs.unsubscribe;
  }, []);
  const NodeIcon = React.useMemo(() => {
    return nodesMeta[props.data.ID].icon;
  }, []);
  const [editLabel, setEditLabel] = React.useState(false);
  const [size, setSize] = useState({
    width: props.data.width,
    height: props.data.height,
  });

  useDebounce(
    () => {
      const { width, height } = size;
      const { data } = props;

      if (width > 0 || height > 0) {
        if (data.width !== width || data.height !== height) {
          di?.area?.resize(data.id, width, height);
        }
      }
    },
    100,
    [size]
  );

  useDebounce(
    async () => {
      if (props.data.label !== props.data.nodeData.label) {
        await updateNodeMeta({
          id: props.data.id,
          label: props.data.label,
        });
      }
    },
    1000,
    [props.data.label]
  );
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.data.setLabel(e.target.value);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Resizable
          data-nodetype={props.data.ID}
          width={size.width}
          height={size.height}
          handle={<ResizeHandle />}
          onResize={(e, { size }) => {
            setSize(size);
          }}
          minConstraints={[200, 200]}
        >
          <Card
            style={{
              width: size.width,
              height: size.height,
            }}
            className={cn(
              "",
              "group @container",
              selected && " border-primary",
              "flex flex-col flex-1 glass",
              state.matches("loading") &&
                "border-blue-300 border-2 animate-pulse",
              state.matches("running") && "border-yellow-300",
              state.matches("error") && "border-red-600 border-2"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between py-1 px-2 space-y-0">
              <div className="flex space-x-2 items-center">
                <NodeIcon className="w-5 h-5" />
                {editLabel ? (
                  <Input
                    defaultValue={props.data.label}
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setEditLabel(false);
                      }
                    }}
                    onChange={handleLabelChange}
                  />
                ) : (
                  <Drag.NoDrag>
                    <CardTitle
                      className="flex"
                      onDoubleClick={() => {
                        setEditLabel(true);
                      }}
                    >
                      {props.data.label}{" "}
                      {props.data.action ? (
                        <span className="text-muted-foreground ml-2 text-sm">
                          {"/"}
                          {props.data.action}
                        </span>
                      ) : null}
                    </CardTitle>
                  </Drag.NoDrag>
                )}
              </div>
              <div className="flex">
                <Button
                  ref={ref}
                  variant={"ghost"}
                  size={"icon"}
                  onClick={toggleDebug}
                >
                  <Wrench size={14} />
                </Button>
                <Button
                  ref={ref2}
                  onClick={triggerNode}
                  disabled={!state.matches("idle")}
                  variant={"ghost"}
                  size="icon"
                >
                  {state.matches("running") && (
                    <Loader2
                      size={14}
                      className="animate-spin text-green-400"
                    />
                  )}
                  {state.matches("idle") && <Play size={14} />}
                  {state.matches("complete") && (
                    <CheckCircle size={14} className="text-green-400" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1">
              {/* controls */}
              <section
                className={cn(
                  "hidden",
                  size.height > props.data.minHeightForControls &&
                    "@xs:block my-2 space-y-2"
                )}
              >
                {controls.map(([key, control]) => {
                  return control ? (
                    <div className="space-y-1 flex flex-col" key={key}>
                      <Label htmlFor={control.id} className="capitalize">
                        {key}
                      </Label>
                      <Drag.NoDrag>
                        <RefControl
                          key={key}
                          name="control"
                          emit={props.emit}
                          payload={control}
                        />
                      </Drag.NoDrag>
                    </div>
                  ) : null;
                })}
              </section>
            </CardContent>
            <div className="py-4 grid-cols-2 grid">
              <div>
                {/* Inputs */}
                {inputs.map(([key, input]) => {
                  if (!input || !input.showSocket) return null;
                  return (
                    <RenderInput
                      emit={props.emit}
                      input={input}
                      key={`input-key-${key}`}
                      inputKey={key}
                      id={id}
                    />
                  );
                })}
              </div>
              <div>
                {/* Outputs */}
                {outputs.map(([key, output]) => {
                  if (!output) return null;
                  return (
                    <RenderOutput
                      emit={props.emit}
                      output={output}
                      key={`output-key-${key}`}
                      outputKey={key}
                      id={id}
                    />
                  );
                })}
              </div>
            </div>
            <CardFooter className="p-1 px-2 pt-0">
              <Badge
                variant={"outline"}
                className="font-mono text-muted group-hover:text-primary w-full text-xs truncate"
              >
                {props.data.id}
              </Badge>
            </CardFooter>
          </Card>
        </Resizable>
      </ContextMenuTrigger>
      {debug && (
        <div className="absolute">
          <pre>
            <code>
              {JSON.stringify(
                {
                  state: state,
                  node: props.data.nodeData,
                  size: props.data.size,
                },
                null,
                2
              )}
            </code>
          </pre>
        </div>
      )}
      <ContextMenuContent>
        <ContextMenuItem onClick={cloneNode}>
          Clone
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={pinNode}>Pin</ContextMenuItem>

        <ContextMenuItem onClick={deleteNode}>
          Delete
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>Controllers</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuCheckboxItem checked>
              Show Bookmarks Bar
              <ContextMenuShortcut>⌘⇧B</ContextMenuShortcut>
            </ContextMenuCheckboxItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}

const ResizeHandle = React.forwardRef<any>((props: any, ref: any) => {
  const { handleAxis, ...restProps } = props;
  Drag.useNoDrag(ref);
  return (
    <div
      ref={ref}
      className={`w-10 h-10 active:w-full active:h-full -m-2 active:-m-32  active:bg-none  hidden group-hover:block  react-resizable-handle-${handleAxis} react-resizable-handle`}
      {...restProps}
    ></div>
  );
});
ResizeHandle.displayName = "ResizeHandle";

const RenderInput: React.FC<any> = ({ input, emit, id, inputKey }) => {
  return (
    <div
      className="text-left flex items-center select-none "
      data-testid={`input-${inputKey}`}
    >
      <RefSocket
        name="input-socket"
        emit={emit}
        side="input"
        socketKey={inputKey}
        nodeId={id}
        payload={{ socket: input.socket, input } as any}
      />
    </div>
  );
};

const RenderOutput: React.FC<any> = ({ output, emit, id, outputKey }) => {
  return (
    <div
      className="text-right flex items-center justify-end select-none"
      data-testid={`output-${outputKey}`}
    >
      <RefSocket
        name="output-socket"
        side="output"
        emit={emit}
        socketKey={outputKey}
        nodeId={id}
        payload={{ socket: output?.socket!, output } as any}
      />
    </div>
  );
};
