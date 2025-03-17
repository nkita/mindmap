'use client';

import React, { useCallback, useContext, KeyboardEvent, useState, useEffect } from 'react';
import {
  Background,
  ReactFlow,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  Controls,
  applyNodeChanges,
  ReactFlowProvider,
  NodeChange,
  OnSelectionChangeParams,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { initialNodes } from './initialElements';
import { MiddleNode } from './middleNode';
import { MindMapProvider, MindMapContext } from './provider';
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

  const [update, setUpdate] = useState(false);
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
        const { nodes: _nodes, edges: _edges } = getLayoutedElements(rootNode ? [rootNode, ...sortedNodes] : sortedNodes, 'LR', getNode);
        setNodes(_nodes)
        setEdges(_edges)
      } else if (change.type === "dimensions") {
        const updatedNodes = applyNodeChanges(changes, nodes);
        const { nodes: _nodes, edges: _edges } = getLayoutedElements(updatedNodes, 'LR', getNode);
        setNodes(_nodes)
        setEdges(_edges)
        setUpdate(true)
      } else {
        setNodes((prev) => applyNodeChanges(changes, prev))
      }
    } else {
      setNodes((prev) => applyNodeChanges(changes, prev))
      setUpdate(true)
    }
  }, [setNodes, getNode, setEdges, nodes]);

  useEffect(() => {
    if (update) {
      onLayout('LR');
      setUpdate(false);
    }
  }, [update, onLayout]);

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


  const handleSelectionChange = (params: OnSelectionChangeParams) => setSelectedNodes(params.nodes);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
        onNodesChange={onNodesChangeWithAutoLayout}
        onEdgesChange={onEdgesChange}
        onSelectionChange={handleSelectionChange}
        onKeyDown={handleKeyDown}
        nodeTypes={{ middleNode: MiddleNode, lastNode: MiddleNode }}
        nodesDraggable={!isEditing}
        nodeDragThreshold={0}
        panOnDrag={!isEditing}
        fitView={true}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        style={{ backgroundColor: "#F7F9FB" }}
      >
        <Panel position="top-right">
          <div className='flex gap-2'>
            <div className='bg-blue-500 text-white p-2 rounded-md'>{isEditing ? "editing" : "viewing"}</div>
            <button className='bg-blue-500 text-white p-2 rounded-md' onClick={() => onLayout('TB')}>vertical layout</button>
            <button className='bg-blue-500 text-white p-2 rounded-md' onClick={() => onLayout('LR')}>horizontal layout</button>
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