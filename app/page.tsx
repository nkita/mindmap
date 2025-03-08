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

import ELK from 'elkjs/lib/elk.bundled.js';
import '@xyflow/react/dist/style.css';
import { initialNodes, initialEdges } from './initialElements';
import { MiddleNode } from './middleNode';
import { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { MindMapProvider, MindMapContext } from './provider';
import { orderBy } from 'lodash';

const elk = new ELK();

const getLayoutedElements = async (
  nodes: Node[],
  edges: Edge[],
  direction = 'LR',
  getNodeData: (id: string) => Node | undefined,
  currentNodeId: string
): Promise<{ nodes: Node[]; edges: Edge[] }> => {

  const isHorizontal = direction === 'LR';

  // ELKグラフの設定
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': isHorizontal ? 'RIGHT' : 'DOWN',
      'elk.spacing.nodeNode': '50',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.layered.considerModelOrder': 'true',
      'elk.layered.crossingMinimization.strategy': 'INTERACTIVE',
      'elk.layered.nodePlacement.strategy': 'INTERACTIVE',
    },
    children: nodes.map(node => {
      const nodeData = getNodeData(node.id);

      return {
        id: node.id,
        width: nodeData?.measured?.width || 172,
        height: nodeData?.measured?.height || 36,
      };
    }),

    edges: edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  // レイアウトの計算
  const layout = await elk.layout(elkGraph);

  // 計算結果を適用
  const newNodes = nodes.map(node => {
    const elkNode = layout.children?.find(n => n.id === node.id);
    if (elkNode) {
      return {
        ...node,
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom',
        position: {
          x: elkNode.x || 0,
          y: elkNode.y || 0
        }
      };
    }
    return node;
  });

  return { nodes: newNodes, edges };
};

const Flow = () => {
  const { getNode } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  useEffect(() => {
    const sortedNodes = orderBy(initialNodes, [(node: Node) => node.data?.rank || 0], ['asc']);
    setNodes(sortedNodes);
  }, [initialNodes, setNodes]);
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
    async (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
        nodes,
        edges,
        direction,
        getNode,
        currentNodeId
      );
      setNodes([...layoutedNodes.map(node => ({
        ...node,
        type: node.type
      }))]);
      setEdges([...layoutedEdges.map(edge => ({
        ...edge,
        type: edge.type || 'default'
      }))]);
    },
    [nodes, edges, getNode, currentNodeId, setNodes, setEdges]
  );

  const handleAddNode = async (selectedNodes: Node[], direction: "parallell" | "series") => {
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
    }
    const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
      [newNode, ...nodes.map(node => ({ ...node, selected: false }))],
      [...edges, newEdge],
      'LR',
      getNode,
      currentNodeId
    );
    setNodes([...layoutedNodes.map(node => ({ ...node, type: node.type }))]);
    setEdges([...layoutedEdges.map(edge => ({ ...edge, type: edge.type || 'default' }))]);
  }
  useEffect(() => {
    const initLayout = async () => {
      nodes.forEach((node) => updateNodeInternals(node.id));
      const { nodes: layoutedNodes } = await getLayoutedElements(nodes, edges, "LR", getNode, currentNodeId);
      setNodes(layoutedNodes);
    };

    setTimeout(() => {
      initLayout();
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
            <button
              className='bg-blue-500 text-white p-2 rounded-md'
              onClick={() => handleAddNode(selectedNodes, "series")}
            >
              ADD
            </button>
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