'use client';

import React, { useCallback, useState, useContext } from 'react';
import {
  Background,
  ReactFlow,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
  Controls,
  applyNodeChanges,
  ReactFlowProvider,
  NodeChange,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { initialNodes } from './initialElements';
import { MiddleNode } from './middleNode';
import { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { MindMapProvider, MindMapContext } from './provider';
// import { getLayoutedElements } from './helper-dagre-layout';
import { getLayoutedElements } from './helper-custom-layout';
import { determineSourceAndRank, recalculateRanks, sortNodesByRank, traverseHierarchy } from './helper-node-sort';

const Flow = () => {
  const { getNode } = useReactFlow();

  const [nodes, setNodes] = useNodesState(initialNodes);
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

  const onNodesChangeWithAutoLayout = useCallback((changes: NodeChange[]) => {
    if (changes.length === 1) {
      const change = changes[0];
      if (change.type === "add") {
        const newNodes = applyNodeChanges(changes, nodes.map(node => ({ ...node, selected: false })));
        const rootNode = newNodes.find(node => node.id === "root");
        // 階層構造を走査してノードをソート
        const traversedNodes = traverseHierarchy(newNodes, "root", sortNodesByRank);
        // 同一親ノード内でのランク再計算
        const sortedNodes = recalculateRanks(traversedNodes);
        // レイアウト計算と状態更新
        const { nodes: _nodes, edges: _edges } = getLayoutedElements(rootNode ? [rootNode, ...sortedNodes] : sortedNodes, 'LR', getNode
        );
        setNodes(_nodes)
        setEdges(_edges)
      } else if (change.type === "dimensions") {
        const updatedNodes = applyNodeChanges(changes, nodes);
        const { nodes: _nodes, edges: _edges } = getLayoutedElements(updatedNodes, 'LR', getNode);
        setNodes(_nodes)
        setEdges(_edges)
      } else {
        setNodes((prev) => applyNodeChanges(changes, prev))
      }
    } else {
      setNodes((prev) => applyNodeChanges(changes, prev))
    }
  }, [setNodes, getNode, setEdges, nodes]);


  const handleAddNode =
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
    }


  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     onLayout('LR');
  //   }, 50);

  //   return () => clearTimeout(timer);
  // }, []);

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
        onNodesChange={onNodesChangeWithAutoLayout}
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