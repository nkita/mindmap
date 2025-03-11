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
import { getLayoutedElements, sortNodesByRank, traverseHierarchy } from './helper-dagre-layout';
import { determineSourceAndRank, recalculateRanks } from './helper-node-sort';

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

  const handleAddNode = useCallback(
    (selectedNodes: Node[], direction: "parallel" | "series") => {
      const newNodeId = crypto.randomUUID();

      // ソースノードとランクの決定
      const { sourceNodeId, newRank } = determineSourceAndRank(selectedNodes, direction, nodes, edges);

      const newNode = {
        id: newNodeId,
        type: 'middleNode',
        data: { label: 'new data', parent: sourceNodeId, rank: newRank },
        position: { x: 0, y: 0 },
        selected: true,
      };

      // 既存ノードの選択状態をリセットして新ノードを追加
      const updatedNodes = [newNode, ...nodes.map(node => ({ ...node, selected: false }))];
      const rootNode = nodes.find(node => node.id === "root");
      
      // 階層構造を走査してノードをソート
      const traversedNodes = traverseHierarchy(updatedNodes, "root", sortNodesByRank);
      
      // 同一親ノード内でのランク再計算
      const sortedNodes = recalculateRanks(traversedNodes);

      // レイアウト計算と状態更新
      const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
        rootNode ? [rootNode, ...sortedNodes] : sortedNodes,
        'LR',
        getNode
      );

      setNodes([...newNodes]);
      setEdges([...newEdges]);
    },
    [nodes, edges, getNode, setNodes, setEdges]
  );


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
      handleAddNode(selectedNodes, "series");
    }
    if (!isEditing && event.key === 'Enter') {
      handleAddNode(selectedNodes, "parallel");
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