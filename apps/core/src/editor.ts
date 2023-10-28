import { GetSchemes, NodeEditor, NodeId } from "rete";
import { createControlFlowEngine, createDataFlowEngine } from "./engine";
import { BaseNode, ParsedNode } from "./nodes/base";
import { Connection } from "./connection/connection";
import { NodeClass, WorkflowAPI, Node, Schemes, Position } from "./types";
import { ContextFrom, SnapshotFrom } from "xstate";
import { structures } from "rete-structures";
import { createId } from "@paralleldrive/cuid2";

import type { Structures } from "rete-structures/_types/types";
import type {
  Area2D,
  AreaExtensions,
  AreaPlugin,
  Zoom,
} from "rete-area-plugin";
import type {
  ClassicScheme,
  ReactArea2D,
  ReactPlugin,
  RenderEmit,
} from "rete-react-plugin";
import type { setupPanningBoundary } from "./plugins/panningBoundary";
import type { ExtractPayload } from "rete-react-plugin/_types/presets/classic/types";
import type { AcceptComponent } from "rete-react-plugin/_types/presets/classic/utility-types";
import type { CustomArrange } from "./plugins/arrage/custom-arrange";
import type { HistoryActions } from "rete-history-plugin";
import { match } from "ts-pattern";
import { debounce } from "lodash-es";
import { AllSockets, Socket } from "./sockets";
import { Input, Output } from "./input-output";
import { useMagneticConnection } from "./connection";
import { SetOptional } from "type-fest";

import { makeObservable, observable, action, computed } from "mobx";
import { InputNode } from "./nodes";

export type AreaExtra<Schemes extends ClassicScheme> = ReactArea2D<Schemes>;

type NodeRegistry = {
  [key: string]: NodeClass;
};

export type NodeWithState<
  T extends NodeRegistry,
  K extends keyof T = keyof T
> = Node & {
  type: keyof T;
  context: ContextFrom<InstanceType<T[K]>["machine"]>;
  state?: SnapshotFrom<InstanceType<T[K]>["machine"]>;
};

// Define a utility type to convert ParsedNode to NodeWithState
type ConvertToNodeWithState<
  T extends NodeRegistry,
  P extends ParsedNode<any, any>
> = {
  [K in keyof P]: K extends "type" ? keyof T : P[K];
};

export type EditorHandlers = {
  incompatibleConnection?: (data: { source: Socket; target: Socket }) => void;
};

export type EditorProps<
  NodeProps extends BaseNode<any, any, any>,
  ConnProps extends Connection<NodeProps, NodeProps>,
  Scheme extends GetSchemes<NodeProps, ConnProps>,
  Registry extends NodeRegistry
> = {
  config: {
    nodes: Registry;
    api: WorkflowAPI;
    logger?: typeof console;
    meta: {
      workflowId: string;
      workflowVersionId: string;
      projectId: string;
    };
    on?: EditorHandlers;
  };
  content?: {
    // nodes: NodeWithState<Registry>[];
    nodes: ConvertToNodeWithState<Registry, ParsedNode<any, any>>[];
    edges: SetOptional<ConnProps, "id">[];
  };
};

export class Editor<
  NodeProps extends BaseNode<any, any, any, any> = BaseNode<any, any, any, any>,
  ConnProps extends Connection<NodeProps, NodeProps> = Connection<
    NodeProps,
    NodeProps
  >,
  Scheme extends GetSchemes<NodeProps, ConnProps> & Schemes = GetSchemes<
    NodeProps,
    ConnProps
  > &
    Schemes,
  Registry extends NodeRegistry = NodeRegistry,
  NodeTypes extends keyof Registry = keyof Registry
> {
  public editor = new NodeEditor<Scheme>();
  public engine = createControlFlowEngine<Scheme>();
  public dataFlow = createDataFlowEngine<Scheme>();
  public graph: Structures<NodeProps, ConnProps> = structures(this.editor);
  public api: WorkflowAPI;

  // UI related
  public area?: AreaPlugin<Scheme, AreaExtra<Scheme>>;
  public areaControl?: {
    zoomAtNodes: (nodeIds: string[]) => Promise<void>;
  };
  public selector?: ReturnType<typeof AreaExtensions.selector>;
  public nodeSelector?: ReturnType<typeof AreaExtensions.selectableNodes>;
  public panningBoundary?: ReturnType<typeof setupPanningBoundary>;
  public arrange?: CustomArrange<Scheme>;
  public cursorPosition: Position = { x: 0, y: 0 };
  public selectedNodeId: NodeId | null = null;

  public nodeMeta: Map<
    keyof Registry,
    {
      nodeType: keyof Registry;
      label: string;
      description: string;
      icon: string;
      class: NodeClass;
    }
  > = new Map();

  public content = {
    nodes: [] as NodeWithState<Registry>[],
    edges: [] as SetOptional<ConnProps, "id">[],
  };

  public selectedInputId: string | null = null;

  get selectedInput(): InputNode | null {
    if (this.inputs.length === 1) {
      this.selectedInputId = this.inputs[0].id;
    }
    if (!this.selectedInputId) return null;
    return this.editor.getNode(this.selectedInputId);
  }

  public get inputs() {
    return this.editor
      .getNodes()
      .filter((n) => n.ID === InputNode.nodeType) as InputNode[];
  }
  public setInput(id: string) {
    this.selectedInputId = id;
  }

  public logger = console;
  public readonly workflowId: string;
  public readonly workflowVersionId: string;
  public readonly projectId: string;

  public handlers: EditorHandlers;

  constructor(props: EditorProps<NodeProps, ConnProps, Scheme, Registry>) {
    makeObservable(this, {
      cursorPosition: observable,
      setCursorPosition: action,

      selectedNodeId: observable,
      setSelectedNodeId: action,
      selectedNode: computed,

      selectedInputId: observable,
      selectedInput: computed,
      setInput: action,
    });

    Object.entries(props.config.nodes).forEach(([key, value]) => {
      this.nodeMeta.set(key, {
        nodeType: key,
        label: value.label,
        description: value.description,
        icon: value.icon,
        class: value,
      });
    });
    this.api = props.config.api;
    this.content = {
      nodes: (props.content?.nodes as NodeWithState<Registry>[]) || [],
      edges: props.content?.edges || [],
    };

    // handlers for events which might require user attention.
    this.handlers = props.config.on || {};

    this.workflowId = props.config.meta.workflowId;
    this.workflowVersionId = props.config.meta.workflowVersionId;
    this.projectId = props.config.meta.projectId;

    this.validateNodes(this.content);
  }

  private createId(prefix: "node" | "conn" | "context" | "state") {
    return `${prefix}_${createId()}`;
  }

  public createNodeInstance(
    node: ConvertToNodeWithState<Registry, ParsedNode<any, any>>
  ) {
    const nodeMeta = this.nodeMeta.get(node.type);
    if (!nodeMeta) {
      throw new Error(`Node type ${String(node.type)} not registered`);
    }
    const nodeClass = nodeMeta.class;

    return new nodeClass(this, node);
  }

  public async duplicateNode(node_Id: string) {
    const { state, executionNodeId, ...node } = await this.editor
      .getNode(node_Id)
      .serialize();
    const newNode = this.createNodeInstance({
      ...node,
      id: this.createId("node"),
      contextId: this.createId("context"),
    });
    return newNode;
  }

  public async addNode(node: NodeTypes) {
    const nodeMeta = this.nodeMeta.get(node);
    if (!nodeMeta) {
      throw new Error(`Node type ${String(node)} not registered`);
    }
    const newNode = this.createNodeInstance({
      type: node,
      label: nodeMeta?.label,
      id: this.createId("node"),
      contextId: this.createId("context"),
    });
    await this.editor.addNode(newNode);
    return newNode;
  }

  public async setup() {
    this.editor.use(this.engine);
    this.editor.use(this.dataFlow);

    await this.import(this.content);
    this.handleNodeEvents();

    await this.setUI();
  }

  public async mount(params: {
    container: HTMLElement;
    render: ReactPlugin<Scheme, AreaExtra<Scheme>>;
    costumize?: {
      node?: (data: ExtractPayload<Scheme, "node">) => AcceptComponent<
        (typeof data)["payload"],
        {
          emit: RenderEmit<Scheme>;
        }
      > | null;
      connection?: (
        data: ExtractPayload<Scheme, "connection">
      ) => AcceptComponent<(typeof data)["payload"]> | null;
      socket?: (
        data: ExtractPayload<Scheme, "socket">
      ) => AcceptComponent<(typeof data)["payload"]> | null;
      control?: (
        data: ExtractPayload<Scheme, "control">
      ) => AcceptComponent<(typeof data)["payload"]> | null;
    };
  }) {
    const { AreaExtensions, AreaPlugin, Zoom } = await import(
      "rete-area-plugin"
    );
    const render = params.render;
    this.area = new AreaPlugin(params.container);
    this.selector = AreaExtensions.selector();
    function accumulateOnCtrl() {
      let pressed = false;

      function keydown(e: KeyboardEvent) {
        if (e.key === "Shift") pressed = true;
      }
      function keyup(e: KeyboardEvent) {
        if (e.key === "Shift") pressed = false;
      }

      document.addEventListener("keydown", keydown);
      document.addEventListener("keyup", keyup);

      return {
        active() {
          return pressed;
        },
        destroy() {
          document.removeEventListener("keydown", keydown);
          document.removeEventListener("keyup", keyup);
        },
      };
    }
    this.nodeSelector = AreaExtensions.selectableNodes(
      this?.area,
      this?.selector,
      {
        accumulating: accumulateOnCtrl(),
      }
    );
    AreaExtensions.restrictor(this.area, {
      scaling: () => ({ min: 0.2, max: 1 }),
    });
    this.area.area.setZoomHandler(new Zoom(0.03));
    AreaExtensions.snapGrid(this.area, {
      dynamic: false,
      size: 20,
    });
    AreaExtensions.simpleNodesOrder(this.area);
    AreaExtensions.showInputControl(this.area);

    const { ConnectionPathPlugin } = await import(
      "rete-connection-path-plugin"
    );
    const { curveMonotoneX } = await import("d3-shape");
    const pathPlugin = new ConnectionPathPlugin<Scheme, Area2D<Scheme>>({
      curve: (c) => c.curve || curveMonotoneX,
    });

    // @ts-ignore
    render.use(pathPlugin);

    const { ConnectionPlugin, Presets: ConnectionPresets } = await import(
      "rete-connection-plugin"
    );
    const connection = new ConnectionPlugin<Scheme, AreaExtra<Scheme>>();
    connection.addPreset(ConnectionPresets.classic.setup());

    const self = this;

    this.editor.use(this.area);
    this.area.use(connection);
    this.area.use(render);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMagneticConnection(connection, {
      async createConnection(from, to) {
        if (from.side === to.side) return;
        const [source, target] =
          from.side === "output" ? [from, to] : [to, from];
        const sourceNode = self.editor.getNode(source.nodeId);
        const targetNode = self.editor.getNode(target.nodeId);

        await self.editor.addConnection(
          new Connection(
            sourceNode,
            source.key as never,
            targetNode,
            target.key as never
          ) as any
        );
      },
      display(from, to) {
        return from.side !== to.side;
      },
      offset(socket, position) {
        const socketRadius = 10;
        return {
          x:
            position.x +
            (socket.side === "input" ? -socketRadius : socketRadius),
          y: position.y,
        };
      },
    });

    this.areaControl = {
      async zoomAtNodes(nodeIds) {
        if (!self.area) return;
        await AreaExtensions.zoomAt(
          self.area,
          self.editor
            .getNodes()
            .filter((n) => (nodeIds.length > 0 ? nodeIds.includes(n.id) : true))
        );
      },
    };

    const { setupPanningBoundary } = await import("./plugins/panningBoundary");
    this.panningBoundary = setupPanningBoundary({
      area: this.area,
      selector: this.selector,
      padding: 30,
      intensity: 3,
    });

    const { CustomArrange, ArrangePresets } = await import(
      "./plugins/arrage/custom-arrange"
    );
    this.arrange = new CustomArrange<Scheme>();
    this.arrange.addPreset(
      ArrangePresets.classic.setup({
        spacing: 40,
        top: 100,
        bottom: 100,
      })
    );
    this.area.use(this.arrange);

    const {
      HistoryPlugin,
      HistoryExtensions,
      Presets: HistoryPresets,
    } = await import("rete-history-plugin");
    const history = new HistoryPlugin<Scheme, HistoryActions<Scheme>>();
    history.addPreset(HistoryPresets.classic.setup());
    HistoryExtensions.keyboard(history);

    this.area.use(history);

    this.handleAreaEvents();
  }

  public async layout() {
    await this.arrange?.layout({
      options: {
        "elk.spacing.nodeNode": 100,
        "spacing.nodeNodeBetweenLayers": 100,
      } as any,
    });
  }

  public async setUI() {
    await this.layout();
    await this.areaControl?.zoomAtNodes(
      this.editor.getNodes().map((n) => n.id)
    );
  }

  public destroy() {
    this.area?.destroy();
    this.panningBoundary?.destroy();
  }

  public async import({
    nodes,
    edges,
  }: {
    nodes: NodeWithState<Registry>[];
    edges: SetOptional<ConnProps, "id">[];
  }) {
    for (const n of nodes) {
      if (this.editor.getNode(n.id)) continue;
      const node = this.createNodeInstance(n);
      // console.log({ node });
      await this.editor.addNode(node);
    }

    for (const c of edges) {
      const source = this.editor.getNode(c.source);
      const target = this.editor.getNode(c.target);

      if (
        source &&
        target &&
        source.outputs[c.sourceOutput] &&
        target.inputs[c.targetInput]
      ) {
        const conn = new Connection<NodeProps, NodeProps>(
          source,
          c.sourceOutput,
          target,
          c.targetInput
        );

        await this.editor.addConnection(conn as Scheme["Connection"]);
      }
    }
  }

  public validateNodes({
    nodes,
    edges,
  }: {
    nodes: NodeWithState<Registry>[];
    edges: SetOptional<ConnProps, "id">[];
  }) {
    const nodesMap = new Map<NodeId, NodeProps>();
    for (const n of nodes) {
      if (!this.nodeMeta.has(n.type)) {
        throw new Error(`Node type ${String(n.type)} not registered`);
      }
      nodesMap.set(n.id, this.createNodeInstance(n));
    }
    for (const c of edges) {
      const source = nodesMap.get(c.source);
      if (!source)
        throw new Error(
          `Invalid connection:
          (${c.source})[${String(c.sourceOutput)}]  => (${c.target})[${String(
            c.targetInput
          )}]
          Source with id:${c.source} not found`
        );
      const target = nodesMap.get(c.target);
      if (!target) {
        throw new Error(
          `Invalid connection:
          (${c.source})[${String(c.sourceOutput)}]  => (${c.target})[${String(
            c.targetInput
          )}]
          Target with id:${c.target} not found`
        );
      }
      if (!source.outputs[c.sourceOutput]) {
        throw new Error(
          `Invalid connection:
           (${c.source})[${String(c.sourceOutput)}]  => (${c.target})[${String(
            c.targetInput
          )}]
          Source Output [${String(c.sourceOutput)}] not found`
        );
      }
      if (!target.inputs[c.targetInput]) {
        throw new Error(
          `Invalid connection:
          (${c.source})[${String(c.sourceOutput)}]  => (${c.target})[${String(
            c.targetInput
          )}]
          Target Input [${String(c.targetInput)}] not found`
        );
      }

      if (
        source &&
        target &&
        source.outputs[c.sourceOutput] &&
        target.inputs[c.targetInput]
      ) {
        // everything is ok
      } else {
        throw new Error(`Invalid connection ${JSON.stringify(c)}`);
      }
    }
  }

  public getConnectionSockets(connection: ConnProps) {
    const source = this.editor.getNode(connection.source);
    const target = this.editor.getNode(connection.target);

    const output =
      source &&
      (source.outputs as Record<string, Input<AllSockets>>)[
        connection.sourceOutput
      ];
    const input =
      target &&
      (target.inputs as Record<string, Output<AllSockets>>)[
        connection.targetInput
      ];

    return {
      source: output?.socket,
      target: input?.socket,
    };
  }

  private handleNodeEvents() {
    this.editor.addPipe((context) => {
      return match(context)
        .with({ type: "connectioncreate" }, ({ data }) => {
          const { source, target } = this.getConnectionSockets(data);
          if (target && !source.isCompatibleWith(target)) {
            this.handlers.incompatibleConnection?.({
              source,
              target,
            });
            return undefined;
          }
          return context;
        })
        .with({ type: "nodecreated" }, async ({ data }) => {
          console.log("nodecreated", { data });
          const size = data.size;
          await this.api.upsertNode({
            workflowId: this.workflowId,
            workflowVersionId: this.workflowVersionId,
            projectId: this.projectId,
            data: {
              id: data.id,
              type: data.ID,
              color: "default",
              label: data.label,
              contextId: data.contextId,
              context: JSON.stringify(data.actor.getSnapshot().context),
              position: { x: 0, y: 0 }, // When node is created it's position is 0,0 and it's moved later on.
              ...size,
            },
          });
          return context;
        })
        .with({ type: "noderemove" }, async ({ data }) => {
          console.log("noderemove", { data });
          await this.api.deleteNode({
            workflowId: this.workflowId,
            workflowVersionId: this.workflowVersionId,
            data: {
              id: data.id,
            },
          });
          return context;
        })
        .with({ type: "connectioncreated" }, async ({ data }) => {
          console.log("connectioncreated", { data });
          await this.api.saveEdge({
            workflowId: this.workflowId,
            workflowVersionId: this.workflowVersionId,
            data: JSON.parse(JSON.stringify(data)),
          });
          try {
            await this?.editor.getNode(data.target).data(); // is this about connecttinos.
          } catch (e) {
            console.log("Failed to update", e);
          }
          return context;
        })
        .with({ type: "connectionremoved" }, async ({ data }) => {
          console.log("connectionremoved", { data });
          await this.api.deleteEdge({
            workflowId: this.workflowId,
            workflowVersionId: this.workflowVersionId,
            data: JSON.parse(JSON.stringify(data)),
          });
          return context;
        })
        .otherwise(() => context);
    });
  }

  setCursorPosition(position: Position) {
    this.cursorPosition = position;
  }

  setSelectedNodeId(nodeId: NodeId | null) {
    this.selectedNodeId = nodeId;
  }

  get selectedNode() {
    if (!this.selectedNodeId) return null;
    return this.editor.getNode(this.selectedNodeId);
  }

  private handleAreaEvents() {
    const updateMeta = debounce(this.api.updateNodeMetadata, 500);
    const positionUpdate = debounce((position: Position) => {
      this.setCursorPosition(position);
    }, 10);
    this.area?.addPipe((context) => {
      match(context)
        .with({ type: "pointermove" }, ({ data: { position } }) => {
          positionUpdate(position);
        })
        .with({ type: "nodepicked" }, ({ data }) => {
          requestAnimationFrame(() => {
            this.setSelectedNodeId(data.id);
          });
        })
        .with({ type: "pointerdown" }, ({ data }) => {
          if (
            (data?.event.target as HTMLElement).classList.contains(
              "background"
            ) &&
            this.selectedNodeId
          ) {
            requestAnimationFrame(() => {
              this.setSelectedNodeId(null);
            });
            return context;
          }
        })
        .with({ type: "noderesized" }, ({ data }) => {
          const size = {
            width: Math.round(data.size.width),
            height: Math.round(data.size.height),
          };
          this.editor.getNode(data.id).setSize(size);
          updateMeta({ id: data.id, size });
        })
        .with({ type: "nodetranslated" }, ({ data }) => {
          if (
            data.position.x !== data.previous.y ||
            data.position.y !== data.previous.y
          ) {
            updateMeta(data);
          }
        });
      return context;
    });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
