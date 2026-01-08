"use client";

import { useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { useProjectStore } from '@/store/project-store';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export function VisualWorkflow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { workflow, setWorkflow } = useProjectStore();

  useEffect(() => {
    const wfNodes: Node[] = workflow.nodes.map(n => ({
      id: n.id,
      position: { x: n.x, y: n.y },
      data: { label: n.label },
      type: n.type as any,
      style: n.style,
    }));
    const wfEdges: Edge[] = workflow.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.animated,
    }));
    // Only update local state if store has data and it's different (basic check to avoid loops)
    if (wfNodes.length > 0 && nodes.length === 0) {
        setNodes(wfNodes);
        setEdges(wfEdges);
    }
  }, [workflow, setNodes, setEdges, nodes.length]);

  const onConnect = useCallback(
    (params: Connection) => {
        setEdges((eds) => {
            const newEdges = addEdge(params, eds);
            // Sync to Store
            const storeEdges = newEdges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                animated: e.animated
            }));
            // We need to keep current nodes in store, just update edges
            // But we can't access 'nodes' state directly here cleanly without ref or dependency
            // So we will do a trick: update store in onEdgesChange or separate effect?
            // Better: update store immediately here
            setWorkflow({ 
                nodes: workflow.nodes, 
                edges: storeEdges 
            });
            return newEdges;
        });
    },
    [setEdges, setWorkflow, workflow.nodes],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node, allNodes: Node[]) => {
        // Sync new positions to Store
        const storeNodes = allNodes.map(n => ({
            id: n.id,
            label: n.data.label,
            x: n.position.x,
            y: n.position.y,
            type: n.type,
            style: n.style
        }));
        setWorkflow({
            nodes: storeNodes,
            edges: workflow.edges // Keep edges as is
        });
    },
    [setWorkflow, workflow.edges]
  );

  return (
    <div className="h-[600px] border border-border/50 rounded-lg bg-zinc-950/50 backdrop-blur-sm overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-background/80 backdrop-blur border border-border rounded-full text-xs font-mono text-muted-foreground">
         Workflow Canvas v1.0
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        fitView
      >
        <Controls className="bg-background border-border fill-foreground" />
        <MiniMap className="bg-background border-border" nodeColor="#3f3f46" />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
