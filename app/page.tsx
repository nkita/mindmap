'use client';

import React, { useCallback, useContext, useState, useEffect } from 'react';
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
  ReactFlowProvider,
  NodeChange,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { MiddleNode } from './middleNode';
import { MindMapProvider, MindMapContext } from './provider';
import { getLayoutedElements, NodeData } from './helper-custom-layout';
import { Plus, ChevronDown, BookOpen } from 'lucide-react';
import { 
  saveMindmap, 
  loadMindmap, 
  getMindmapList 
} from './db-service';
import { 
  handleNodeChanges, 
  updateChildNodesDisplay 
} from './node-operations';

// Flowコンポーネント
const Flow = () => {
  const { getNode, getNodes, addNodes, updateNodeData } = useReactFlow();
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { isEditing, currentEditingNodeId, setIsEditing, setCurrentEditingNodeId } = useContext(MindMapContext);
  const [update, setUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMindmapId, setCurrentMindmapId] = useState('default');
  const [mindmapList, setMindmapList] = useState<{id: string, title: string}[]>([]);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);

  // マインドマップリストの読み込み
  useEffect(() => {
    const loadMindmapList = async () => {
      try {
        const list = await getMindmapList();
        setMindmapList(list);
        
        // リストが空の場合はデフォルトのマインドマップを追加
        if (list.length === 0) {
          const defaultNode = {
            id: 'root',
            type: 'middleNode',
            data: {
              label: '新しいマインドマップ',
              parent: null,
              rank: 0,
              showChildren: true,
              display: true
            },
            position: { x: 0, y: 0 }
          };
          
          await saveMindmap('default', [defaultNode]);
          setMindmapList([{id: 'default', title: '新しいマインドマップ'}]);
        }
      } catch (error) {
        console.error('マインドマップリストの読み込みに失敗しました:', error);
      }
    };
    
    loadMindmapList();
  }, []);
  
  // マインドマップの切り替え
  const switchMindmap = useCallback(async (id: string) => {
    if (id === currentMindmapId) return;
    
    setIsLoading(true);
    try {
      const loadedNodes = await loadMindmap(id);
      setNodes(loadedNodes);
      
      setTimeout(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          loadedNodes,
          'LR',
          getNode
        );
        
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setCurrentMindmapId(id);
        setIsLoading(false);
        setInitialRenderComplete(false); // 新しいマインドマップのためにリセット
      }, 200);
    } catch (error) {
      console.error('マインドマップの切り替えに失敗しました:', error);
      setIsLoading(false);
    }
  }, [currentMindmapId, getNode, setNodes, setEdges]);
  
  // 新しいマインドマップの作成
  const createNewMindmap = useCallback(async () => {
    const newId = `mindmap-${Date.now()}`;
    const newTitle = '新しいマインドマップ';
    
    try {
      const rootNode = {
        id: 'root',
        type: 'middleNode',
        data: {
          label: newTitle,
          parent: null,
          rank: 0,
          showChildren: true,
          display: true
        },
        position: { x: 0, y: 0 }
      };
      
      await saveMindmap(newId, [rootNode]);
      setMindmapList(prev => [...prev, {id: newId, title: newTitle}]);
      switchMindmap(newId);
    } catch (error) {
      console.error('新しいマインドマップの作成に失敗しました:', error);
    }
  }, [switchMindmap]);

  // ノードが変更されたらIndexedDBに保存
  useEffect(() => {
    if (nodes.length > 0 && !isLoading) {
      const saveData = async () => {
        try {
          await saveMindmap(currentMindmapId, nodes);
          
          // ルートノードのラベルが変更された場合、リストも更新
          const rootNode = nodes.find(n => n.id === 'root');
          if (rootNode) {
            setMindmapList(prev => 
              prev.map(item => 
                item.id === currentMindmapId 
                  ? {...item, title: rootNode.data.label as string} 
                  : item
              )
            );
          }
        } catch (error) {
          console.error('データの保存に失敗しました:', error);
        }
      };
      
      const timer = setTimeout(saveData, 500);
      return () => clearTimeout(timer);
    }
  }, [nodes, isLoading, currentMindmapId]);

  // IndexedDBからデータを読み込む
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const loadedNodes = await loadMindmap(currentMindmapId);
        setNodes(loadedNodes);
        
        // レイアウトを計算
        setTimeout(() => {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            loadedNodes,
            'LR',
            getNode
          );
          
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setIsLoading(false);
        }, 200);
      } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [currentMindmapId, getNode, setNodes, setEdges]);

  // レイアウト方向の変更
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

  // ノード変更ハンドラー
  const onNodesChangeWithAutoLayout = useCallback((changes: NodeChange[]) => {
    handleNodeChanges(changes, nodes, getNode, setNodes, setEdges);

    // 複数の変更がある場合は更新フラグを設定
    if (changes.length > 1) {
      setUpdate(true);
    }
  }, [nodes, getNode, setNodes, setEdges]);

  // 更新フラグが立った場合にレイアウトを再計算
  useEffect(() => {
    if (update) {
      onLayout('LR');
      setUpdate(false);
    }
  }, [update, onLayout]);

  // 選択変更ハンドラー - 複数選択を防止
  const handleSelectionChange = useCallback((params: { nodes: Node[] }) => {
    if (params.nodes.length > 1) {
      const lastSelectedNode = params.nodes[params.nodes.length - 1];
      setNodes(nodes => nodes.map(node => ({
        ...node,
        selected: node.id === lastSelectedNode.id
      })));
    }
  }, [setNodes]);

  // キーボードショートカットの処理
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (isEditing) return;

      const selectedNodes = getNodes().filter(n => n.selected);
      if (selectedNodes.length !== 1) return;

      const selectedNode = selectedNodes[0];

      // Tab キー: 子ノード追加
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const newNodeId = crypto.randomUUID();

        addNodes([{
          id: newNodeId,
          type: "middleNode",
          data: {
            label: "new data",
            parent: selectedNode.id,
            rank: 0,
            showChildren: true,
            display: true,
            autoEdit: true
          },
          position: { x: 0, y: 0 },
          selected: true
        }]);

        updateNodeData(selectedNode.id, {
          ...selectedNode.data,
          showChildren: true
        });

        setTimeout(() => {
          const editEvent = new CustomEvent('autoEditNode', {
            detail: { nodeId: newNodeId }
          });
          window.dispatchEvent(editEvent);
        }, 100);
      }

      // Enter キー: 兄弟ノード追加
      if (e.key === 'Enter') {
        e.preventDefault();
        const newNodeId = crypto.randomUUID();
        const nodeData = selectedNode.data as NodeData;

        addNodes([{
          id: newNodeId,
          type: "middleNode",
          data: {
            label: "new data",
            parent: nodeData.parent,
            rank: nodeData.rank !== undefined ? nodeData.rank + 0.5 : 0,
            showChildren: true,
            display: true,
            autoEdit: true
          },
          position: { x: 0, y: 0 },
          selected: true
        }]);

        setTimeout(() => {
          const editEvent = new CustomEvent('autoEditNode', {
            detail: { nodeId: newNodeId }
          });
          window.dispatchEvent(editEvent);
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, getNodes, addNodes, updateNodeData]);

  // カスタムイベントリスナー - 子ノードの表示状態変更
  useEffect(() => {
    const handleNodeShowChildrenChanged = (event: CustomEvent) => {
      const { nodeId, showChildren } = event.detail;
      const updatedNodes = updateChildNodesDisplay(nodeId, showChildren, nodes);

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        updatedNodes,
        'LR',
        getNode
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    };

    window.addEventListener('nodeShowChildrenChanged', handleNodeShowChildrenChanged as EventListener);
    return () => {
      window.removeEventListener('nodeShowChildrenChanged', handleNodeShowChildrenChanged as EventListener);
    };
  }, [nodes, getNode, setNodes, setEdges]);

  // 強制レイアウト更新のイベントリスナー
  useEffect(() => {
    const handleForceLayoutRefresh = () => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        'LR',
        getNode
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    };

    window.addEventListener('forceLayoutRefresh', handleForceLayoutRefresh);
    return () => window.removeEventListener('forceLayoutRefresh', handleForceLayoutRefresh);
  }, [nodes, getNode, setNodes, setEdges]);

  // 背景クリックで編集モードを終了
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const isToolbarClick =
      target.closest('.editor-toolbar') ||
      target.closest('.node-toolbar') ||
      target.closest('[data-toolbar-button="true"]') ||
      target.closest('[data-lexical-editor="true"]');
    
    if (isToolbarClick) {
      event.stopPropagation();
      return;
    }
    
    if (isEditing && currentEditingNodeId) {
      const endEditEvent = new CustomEvent('endNodeEdit', {
        detail: { nodeId: currentEditingNodeId }
      });
      window.dispatchEvent(endEditEvent);
      setIsEditing(false);
      setCurrentEditingNodeId(null);
    }
  }, [isEditing, currentEditingNodeId, setIsEditing, setCurrentEditingNodeId]);

  // 初期レンダリング後にビューをフィットさせる
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    if (!initialRenderComplete && !isLoading && nodes.length > 0) {
      const timer = setTimeout(() => {
        onLayout('LR');
        
        reactFlowInstance.fitView({
          padding: 0.2,
          includeHiddenNodes: false
        });
        
        setInitialRenderComplete(true);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [reactFlowInstance, onLayout, initialRenderComplete, isLoading, nodes]);

  // ノード削除イベントのリスナー
  useEffect(() => {
    const handleDeleteNodes = (event: CustomEvent<{ changes: NodeChange[] }>) => {
      const { changes } = event.detail;
      onNodesChangeWithAutoLayout(changes);

      setTimeout(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          nodes.filter(n => !changes.some(change =>
            change.type === 'remove' && change.id === n.id
          )),
          'LR',
          getNode
        );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      }, 50);
    };

    window.addEventListener('deleteNodes', handleDeleteNodes as EventListener);
    return () => window.removeEventListener('deleteNodes', handleDeleteNodes as EventListener);
  }, [onNodesChangeWithAutoLayout, nodes, getNode, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <div className="text-2xl">マインドマップを読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWithAutoLayout}
        onEdgesChange={onEdgesChange}
        onSelectionChange={handleSelectionChange}
        onPaneClick={onPaneClick}
        nodeTypes={{ middleNode: MiddleNode, lastNode: MiddleNode }}
        nodesDraggable={!isEditing}
        nodeDragThreshold={0}
        panOnDrag={!isEditing}
        fitView={true}
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 1.5
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        selectNodesOnDrag={false}
        selectionOnDrag={false}
      >
        <Panel position="top-right">
          <div className='flex flex-col gap-3 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200'>
            <div className='flex items-center gap-3'>
              <div className={`px-3 py-2 rounded-full text-sm font-medium ${isEditing ? "bg-indigo-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                {isEditing ? "編集モード" : "表示モード"}
              </div>
              <button 
                className='px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-1'
                onClick={createNewMindmap}
              >
                <Plus size={16} />
                新規作成
              </button>
              <button 
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${isListExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setIsListExpanded(!isListExpanded)}
              >
                <ChevronDown size={16} className={`transition-transform ${isListExpanded ? 'rotate-180' : ''}`} />
                マインドマップ一覧
              </button>
            </div>
            
            {isListExpanded && mindmapList.length > 0 && (
              <div className='bg-white rounded-lg shadow-inner border border-gray-100 overflow-hidden'>
                <div className='p-3 border-b border-gray-100 bg-gray-50'>
                  <h3 className='text-sm font-semibold text-gray-700'>マインドマップ一覧</h3>
                </div>
                <ul className='max-h-60 overflow-y-auto divide-y divide-gray-100'>
                  {mindmapList.map(item => (
                    <li 
                      key={item.id}
                      className={`p-3 cursor-pointer transition-colors flex items-center ${item.id === currentMindmapId ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}
                      onClick={() => switchMindmap(item.id)}
                    >
                      <BookOpen size={16} className={`mr-2 ${item.id === currentMindmapId ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <span className="truncate">{item.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>
        <Background color="#fff" />
        <Controls />
      </ReactFlow>
    </div>
  );
};

// アプリケーションのルートコンポーネント
export default function App() {
  return (
    <ReactFlowProvider>
      <MindMapProvider>
        <Flow />
      </MindMapProvider>
    </ReactFlowProvider>
  );
}