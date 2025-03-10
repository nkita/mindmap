'use client';

import React, { useCallback, useEffect, useState, useContext } from 'react';
import {
  Background,
  ReactFlow,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  useUpdateNodeInternals,
  type Node,
  type Edge,
  type Connection,
  type OnSelectionChangeParams,
  Controls,
} from '@xyflow/react';

import dagre from '@dagrejs/dagre';

import '@xyflow/react/dist/style.css';
import { initialNodes, initialEdges } from './initialElements';
import { MiddleNode } from './middleNode';
import { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { MindMapProvider, MindMapContext } from './provider';

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (
  nodes: Node[], edges: Edge[], direction = 'LR', getNodeData: (id: string) => Node | undefined, currentNodeId: string): { nodes: Node[], edges: Edge[] } => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, edgesep: 50 });

  nodes.forEach((node: Node) => {
    const nodeData = getNodeData(node.id);
    const nodeWidth = nodeData?.measured?.width || 172;
    const nodeHeight = nodeData?.measured?.height || 36;
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const nodeData = getNodeData(node.id);
    const nodeWidth = nodeData?.width || 172;
    const nodeHeight = nodeData?.height || 36;
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};


const Flow = () => {
  const { getNode } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [currentNodeId, setCurrentNodeId] = useState("2");
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const updateNodeInternals = useUpdateNodeInternals();
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params },
          eds,
        ),
      ),
    [],
  );
  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction, getNode, currentNodeId);
      setNodes([...layoutedNodes.map(node => ({
        ...node, type: node.type
      }))]);
      setEdges([...layoutedEdges.map(edge => ({
        ...edge, type: edge.type || 'default' // Ensure type is always defined
      }))]);
    },
    [nodes, edges, getNode, currentNodeId, setNodes, setEdges],
  );

  const handleAddNode = (selectedNodes: Node[], direction: "parallell" | "series") => {
    const i = crypto.randomUUID();
    const newNode = {
      id: i,
      type: 'middleNode',
      data: { label: 'new data' },
      position: { x: 0, y: 0 },
      selected: true,
    }
    let sourceNodeId = "root"
    if (selectedNodes.length === 1) {
      const i = selectedNodes[0].id;
      if (direction === "series") {
        sourceNodeId = i
      } else if (direction === "parallell") {
        const edge = edges.find(edge => edge.target === i);
        sourceNodeId = edge?.source ?? i;
      }
    } else if (selectedNodes.length > 1) {
      sourceNodeId = nodes[0].id;
    } else {
      sourceNodeId = nodes[0].id;
    }
    const newEdge = {
      id: crypto.randomUUID(),
      source: sourceNodeId,
      target: i,
      type: 'default',
      dragHandle: '.drag-handle__custom',
    }
    const { nodes: layoutedNodes, edges: layoutedEdges } =
      getLayoutedElements([newNode, ...nodes.map(node => ({ ...node, selected: false }))], [...edges, newEdge], 'LR', getNode, currentNodeId);
    setNodes([...layoutedNodes.map(node => ({ ...node, type: node.type }))] as Node[]);
    setEdges([...layoutedEdges.map(edge => ({ ...edge, type: edge.type || 'default' }))]);
  }
  useEffect(() => {
    setTimeout(() => {
      nodes.forEach((node) => updateNodeInternals(node.id));
      const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, "LR", getNode, currentNodeId);
      setNodes(layoutedNodes);
    }, 50);
  }, []);

  const handleSelectionChange = (params: OnSelectionChangeParams) => setSelectedNodes(params.nodes);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isEditing && event.key === 'Tab') {
      handleAddNode(selectedNodes, "series");
    }
    if (!isEditing && event.key === 'Enter') {
      handleAddNode(selectedNodes, "parallell");
    }
  }
  const { isEditing } = useContext(MindMapContext);

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onKeyDown={handleKeyDown}
        onSelectionChange={handleSelectionChange}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={{ middleNode: MiddleNode }}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodesDraggable={!isEditing}
        panOnDrag={!isEditing}
        fitView={true}
        style={{ backgroundColor: "#F7F9FB" }}
      >
        <Panel position="top-right">
          <div className='flex gap-2'>
            <div className='bg-blue-500 text-white p-2 rounded-md'>{isEditing ? "editing" : "viewing"}</div>
            <button className='bg-blue-500 text-white p-2 rounded-md' onClick={() => onLayout('TB')}>vertical layout</button>
            <button className='bg-blue-500 text-white p-2 rounded-md' onClick={() => onLayout('LR')}>horizontal layout</button>
            <button className='bg-blue-500 text-white p-2 rounded-md' onClick={() => handleAddNode(selectedNodes)}>ADD</button>
          </div>
        </Panel>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function Page() {
  return (
    <ReactFlowProvider>
      <MindMapProvider>
        <Flow />
      </MindMapProvider>
    </ReactFlowProvider>
  );
}