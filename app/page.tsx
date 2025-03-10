'use client';

import React, { useCallback, useState, useContext } from 'react';
import {
  Background,
  ReactFlow,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
  Controls,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { initialNodes } from './initialElements';
import { MiddleNode } from './middleNode';
import { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { MindMapProvider, MindMapContext } from './provider';
import { getLayoutedElements } from './lib';

const Flow = () => {
  const { getNode } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const { isEditing } = useContext(MindMapContext);

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        direction,
        getNode,
      );
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, getNode, setNodes, setEdges]
  );

  const handleAddNode = async (
    selectedNodes: Node[],
    direction: "parallell" | "series",
    getNode: (id: string) => Node | undefined
  ) => {
    const i = crypto.randomUUID();
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
    const newNode = {
      id: i,
      type: 'middleNode',
      data: { label: 'new data', parent: sourceNodeId, rank: 3 },
      position: { x: 0, y: 0 },
      selected: true,
    }
    const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
      [newNode, ...nodes.map(node => ({ ...node, selected: false }))],
      'LR',
      getNode
    );
    setNodes([...newNodes]);
    setEdges([...newEdges]);
  };

  // useEffect(() => {
  //   if (update) {
  //     const timer = setTimeout(() => {
  //       onLayout('LR');
  //       setUpdate(false);
  //     }, 50);

  //     return () => clearTimeout(timer);
  //   }
  // }, [update, onLayout, isEditing]);

  const handleSelectionChange = (params: OnSelectionChangeParams) => setSelectedNodes(params.nodes);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isEditing && event.key === 'Tab') {
      handleAddNode(selectedNodes, "series", getNode);
    }
    if (!isEditing && event.key === 'Enter') {
      handleAddNode(selectedNodes, "parallell", getNode);
    }
  }

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onKeyDown={handleKeyDown}
        onSelectionChange={handleSelectionChange}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={{ middleNode: MiddleNode }}
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
              onClick={() => handleAddNode(selectedNodes, "series", getNode)}
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