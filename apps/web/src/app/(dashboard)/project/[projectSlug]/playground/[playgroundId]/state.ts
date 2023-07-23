import { create } from "zustand";
import { createClient, EnsureJson } from "@liveblocks/client";
import { liveblocks } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";

import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";

const initialNodes = [
  {
    id: "3",
    position: { x: 0, y: 200 },
    data: { label: "3" },
    type: "functionCalling",
  },
];
const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
};
// Create a Liveblocks client with your API key
const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_API_KEY as string,
  throttle: 16, // Updates every 16ms === 60fps animation
});

type Storage = {
  nodes: FlowState["nodes"];
  edges: FlowState["edges"];
};

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useStore = create<WithLiveblocks<FlowState, {}, EnsureJson<Storage>>>(
  liveblocks(
    (set, get) => ({
      nodes: initialNodes,
      edges: initialEdges,
      onNodesChange: (changes: NodeChange[]) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },
      onEdgesChange: (changes: EdgeChange[]) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },
      onConnect: (connection: Connection) => {
        set({
          edges: addEdge(connection, get().edges),
        });
      },
    }),
    {
      // Add Liveblocks client
      client,

      // Define the store properties that should be shared in real-time
      storageMapping: {
        nodes: true,
        edges: true,
      },
    }
  )
);

export default useStore;
