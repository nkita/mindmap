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
import { ChevronDown, Wifi, WifiOff, Wallpaper, Pencil, BookOpen, Plus, FileText, HelpCircle } from 'lucide-react';
import {
  saveMindmap,
  loadMindmap,
  getMindmapList,
  deleteMindmapFromDB
} from './db-service';
import {
  handleNodeChanges,
  updateChildNodesDisplay
} from './node-operations';
import MindmapList from './components/MindmapList';
import PrivacyTermsDialog from './components/PrivacyTermsDialog';

// Flowコンポーネント
const Flow = () => {
  const { getNode, getNodes, addNodes, updateNodeData } = useReactFlow();
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { isEditing, currentEditingNodeId, setIsEditing, setCurrentEditingNodeId } = useContext(MindMapContext);
  const [update, setUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMindmapId, setCurrentMindmapId] = useState('default');
  const [mindmapList, setMindmapList] = useState<{ id: string, title: string }[]>([]);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [isPrivacyTermsOpen, setIsPrivacyTermsOpen] = useState(false);

  // ReactFlowインスタンスの取得
  const reactFlowInstance = useReactFlow();

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
              label: 'New Mindmap',
              parent: null,
              rank: 0,
              showChildren: true,
              display: true
            },
            position: { x: 0, y: 0 }
          };

          await saveMindmap('default', [defaultNode]);
          setMindmapList([{ id: 'default', title: 'New Mindmap' }]);
        }
      } catch (error) {
        console.error('Failed to load mindmap list:', error);
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

      // 全てのノードの選択状態をクリア
      const nodesWithoutSelection = loadedNodes.map(node => ({
        ...node,
        selected: false
      }));

      setNodes(nodesWithoutSelection);

      setTimeout(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          nodesWithoutSelection,
          'LR',
          getNode
        );

        // 選択状態をクリアしたノードを設定
        setNodes(layoutedNodes.map(node => ({
          ...node,
          selected: false
        })));

        setEdges(layoutedEdges);
        setCurrentMindmapId(id);
        setIsLoading(false);
        setInitialRenderComplete(false); // 新しいマインドマップのためにリセット

        // 少し遅延させてからfitViewを実行
        setTimeout(() => {
          reactFlowInstance.fitView({
            padding: 0.3,
            includeHiddenNodes: false,
            duration: 800
          });
        }, 300);
      }, 200);
    } catch (error) {
      console.error('Failed to switch mindmap:', error);
      setIsLoading(false);
    }
  }, [currentMindmapId, getNode, setNodes, setEdges, reactFlowInstance]);

  // 新しいマインドマップの作成
  const createNewMindmap = useCallback(async () => {
    const newId = `mindmap-${Date.now()}`;
    const newTitle = 'New Mindmap';

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
      setMindmapList(prev => [...prev, { id: newId, title: newTitle }]);
      switchMindmap(newId);
    } catch (error) {
      console.error('Failed to create new mindmap:', error);
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
                  ? { ...item, title: rootNode.data.label as string }
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

        // 全てのノードの選択状態をクリア
        const nodesWithoutSelection = loadedNodes.map(node => ({
          ...node,
          selected: false
        }));

        setNodes(nodesWithoutSelection);

        // レイアウトを計算
        setTimeout(() => {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            nodesWithoutSelection,
            'LR',
            getNode
          );

          // 選択状態をクリアしたノードを設定
          setNodes(layoutedNodes.map(node => ({
            ...node,
            selected: false
          })));

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

      // ノードとエッジを更新
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

  // キーボードショートカットの処理を修正
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // 編集モード中はショートカットを無効化
      if (isEditing) {
        // Tabキーが押された場合、デフォルトの動作を防止するだけにする
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
        }
        return;
      }

      const selectedNodes = getNodes().filter(n => n.selected);
      if (selectedNodes.length !== 1) return;

      const selectedNode = selectedNodes[0];

      // Delete キー: 選択中のノードを削除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        // ルートノードは削除できないようにする
        if (selectedNode.id === 'root') {
          return;
        }

        // 削除対象のノードIDを収集
        const nodesToDelete = collectNodesToDelete(selectedNode.id, getNodes());

        // 削除イベントを発火
        const deleteEvent = new CustomEvent('deleteNodes', {
          detail: {
            changes: nodesToDelete.map(id => ({
              type: 'remove' as const,
              id
            }))
          }
        });
        window.dispatchEvent(deleteEvent);

        return;
      }

      // F2キー: 選択中のノードを編集モードに
      if (e.key === 'F2') {
        e.preventDefault();

        // 編集中フラグを設定
        setIsEditing(true);
        setCurrentEditingNodeId(selectedNode.id);

        // 編集開始イベントを発火
        setTimeout(() => {
          const editEvent = new CustomEvent('startNodeEdit', {
            detail: { nodeId: selectedNode.id }
          });
          window.dispatchEvent(editEvent);
        }, 50);

        return;
      }

      // Tab キー: 子ノード追加（子ノードが存在する場合は無効）
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();

        // 子ノードが存在するかチェック
        const hasChildNodes = getNodes().some(node => node.data.parent === selectedNode.id);

        // 子ノードが存在する場合は処理を中止
        if (hasChildNodes) {
          return;
        }

        // 編集中フラグを先に設定して、他のノードが編集モードに入るのを防止
        setIsEditing(true);

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

        // 現在編集中のノードIDを設定
        setCurrentEditingNodeId(newNodeId);

        setTimeout(() => {
          const editEvent = new CustomEvent('autoEditNode', {
            detail: { nodeId: newNodeId }
          });
          window.dispatchEvent(editEvent);
        }, 100);
      }

      // Enter キー: 兄弟ノード追加（同様に修正）
      if (e.key === 'Enter') {
        e.preventDefault();

        // 編集中フラグを先に設定
        setIsEditing(true);

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

        // 現在編集中のノードIDを設定
        setCurrentEditingNodeId(newNodeId);

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
  }, [isEditing, getNodes, addNodes, updateNodeData, setIsEditing, setCurrentEditingNodeId]);

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

  // 初期レンダリング時のfitView
  useEffect(() => {
    if (!isLoading && nodes.length > 0 && !initialRenderComplete) {
      // 少し遅延させてレイアウトが完全に計算された後に実行
      const timer = setTimeout(() => {
        // レイアウトを適用
        onLayout('LR');

        // 全ノードが表示されるようにビューを調整
        setTimeout(() => {
          reactFlowInstance.fitView({
            padding: 0.3, // 余白を設定
            includeHiddenNodes: false, // 非表示ノードは除外
            duration: 800 // アニメーション時間（ミリ秒）
          })
        }, 50);
        setInitialRenderComplete(true);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isLoading, nodes, reactFlowInstance, initialRenderComplete, onLayout]);

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

  // マインドマップの削除関数を追加
  const deleteMindmap = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // クリックイベントの伝播を止める

    // 確認ダイアログ
    if (!confirm('Are you sure you want to delete this mindmap?')) {
      return;
    }

    try {
      // 現在表示中のマインドマップを削除しようとした場合
      if (id === currentMindmapId) {
        // 他のマインドマップがあれば切り替え
        const otherMindmap = mindmapList.find(item => item.id !== id);
        if (otherMindmap) {
          await switchMindmap(otherMindmap.id);
        }
      }

      // IndexedDBから削除
      await deleteMindmapFromDB(id);

      // リストから削除
      setMindmapList(prev => prev.filter(item => item.id !== id));

      // 全て削除された場合は新しいマインドマップを作成
      if (mindmapList.length <= 1) {
        createNewMindmap();
      }
    } catch (error) {
      console.error('Failed to delete mindmap:', error);
    }
  }, [currentMindmapId, mindmapList, switchMindmap, createNewMindmap]);

  // カスタムイベントリスナー - ノード編集開始時に中央に表示
  useEffect(() => {
    const handleNodeEditStart = (event: CustomEvent<{ nodeId: string }>) => {
      const { nodeId } = event.detail;

      // 編集対象のノードを取得
      const nodeToFocus = getNode(nodeId);
      if (!nodeToFocus) return;

      // ノードを中央に表示
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.5,
          includeHiddenNodes: false,
          nodes: [nodeToFocus]
        });
      }, 50);
    };

    window.addEventListener('startNodeEdit', handleNodeEditStart as EventListener);
    window.addEventListener('autoEditNode', handleNodeEditStart as EventListener);

    return () => {
      window.removeEventListener('startNodeEdit', handleNodeEditStart as EventListener);
      window.removeEventListener('autoEditNode', handleNodeEditStart as EventListener);
    };
  }, [getNode, reactFlowInstance]);

  // オフライン状態の検出と監視を追加
  useEffect(() => {
    // 初期状態を設定
    setIsOffline(!navigator.onLine);

    // オンライン/オフライン状態の変化を監視
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ノードとその子孫を全て収集する関数
  const collectNodesToDelete = (nodeId: string, allNodes: Node[]): string[] => {
    const result: string[] = [nodeId];

    // 子ノードを再帰的に収集
    const collectChildren = (parentId: string) => {
      const childNodes = allNodes.filter(n => n.data.parent === parentId);
      childNodes.forEach(child => {
        result.push(child.id);
        collectChildren(child.id);
      });
    };

    collectChildren(nodeId);
    return result;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <div className="text-xl font-medium text-gray-700">Loading your mindmap...</div>
        <div className="text-sm text-gray-500 mt-2">Please wait a moment</div>
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
          <div className='flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-2 rounded-lg shadow-lg border border-blue-100 dark:border-blue-900'>
            {/* モードインジケーター */}
            <div
              className={`p-2 rounded-full flex items-center gap-2 px-2 text-xs transition-all ${isEditing
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
              title={isEditing ? "Edit Mode" : "View Mode"}
            >
              {isEditing ? <Pencil size={16} /> : <Wallpaper size={16} />}
              {isEditing ? "Edit Mode" : "View Mode"}
            </div>

            {/* オフラインインジケーター */}
            <div
              className={`p-2 rounded-full flex items-center gap-2 px-2 text-xs transition-all ${isOffline
                ? 'bg-yellow-500 text-white'
                : 'bg-green-500/90 text-white'
                }`}
              title={isOffline ? 'Offline' : 'Online'}
            >
              {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
              {isOffline ? 'Offline' : 'Online'}
            </div>
          </div>
        </Panel>
        <Panel position="top-left">
          <div className='flex flex-col gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-2 rounded-lg shadow-lg border border-blue-100 dark:border-blue-900'>
            <div className='flex items-center gap-2'>
              <BookOpen size={16} className="text-blue-500 dark:text-blue-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                {mindmapList.find(item => item.id === currentMindmapId)?.title || 'Mindmap'}
              </span>
              <button
                className={`p-2 rounded-lg hover:cursor-pointer text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ${isListExpanded ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                onClick={() => setIsListExpanded(!isListExpanded)}
                title="Mindmap List"
              >
                <ChevronDown size={16} className={`transition-transform ${isListExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* 新規作成ボタン */}
              <button
                className={`p-2 rounded-lg hover:cursor-pointer text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all`}
                onClick={createNewMindmap}
                title="Create New Mindmap"
              >
                <Plus className='w-4 h-4' />
              </button>
            </div>

            <MindmapList
              isExpanded={isListExpanded}
              mindmapList={mindmapList}
              currentMindmapId={currentMindmapId}
              onSwitchMindmap={switchMindmap}
              onDeleteMindmap={deleteMindmap}
            />
          </div>
        </Panel>
        <Panel position="bottom-right">
          <div className="flex flex-col gap-2 items-end">
            {/* ヘルプパネル */}
            {isHelpVisible && (
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-blue-100 dark:border-blue-900 max-w-xs relative">
                <button
                  className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors hover:cursor-pointer"
                  onClick={() => setIsHelpVisible(false)}
                  aria-label="Close help"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                {/* ヘルプコンテンツ */}
                <div className="flex items-center mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Shortcuts</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Edit Node</span>
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 font-mono text-[10px]">F2</kbd>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Add Child Node</span>
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 font-mono text-[10px]">Tab</kbd>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Add Sibling Node</span>
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 font-mono text-[10px]">Enter</kbd>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Delete Node</span>
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 font-mono text-[10px]">Delete</kbd>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Cancel Edit</span>
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 font-mono text-[10px]">Esc</kbd>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-50 dark:border-blue-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Node States</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-blue-100 dark:border-blue-900/50 bg-white dark:bg-slate-800"></div>
                      <span className="text-xs text-slate-600 dark:text-slate-300">Normal</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20 bg-white dark:bg-slate-800"></div>
                      <span className="text-xs text-slate-600 dark:text-slate-300">Selected</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-teal-500 dark:border-teal-400 ring-2 ring-teal-500/20 dark:ring-teal-400/20 bg-white dark:bg-slate-800"></div>
                      <span className="text-xs text-slate-600 dark:text-slate-300">Editing</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[10px] text-slate-500 dark:text-slate-400 italic">
                  Tip: Double-click a node to edit it
                </div>
              </div>
            )}

            {/* ボタン行 - 常に同じ位置に表示 */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsPrivacyTermsOpen(true)}
                className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-lg border border-blue-100 dark:border-blue-900 hover:bg-white dark:hover:bg-slate-700 transition-colors hover:cursor-pointer flex items-center gap-2"
                aria-label="Privacy & Terms"
              >
                <FileText size={16} className="text-blue-500 dark:text-blue-400" />
                <span className="text-xs text-slate-600 dark:text-slate-300">Privacy & Terms</span>
              </button>
              
              <button
                className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-lg border border-blue-100 dark:border-blue-900 hover:bg-white dark:hover:bg-slate-700 transition-colors hover:cursor-pointer flex items-center gap-2"
                onClick={() => setIsHelpVisible(!isHelpVisible)}
                aria-label={isHelpVisible ? "Hide help" : "Show help"}
              >
                <HelpCircle size={16} className="text-blue-500 dark:text-blue-400" />
                <span className="text-xs text-slate-600 dark:text-slate-300">Help</span>
              </button>
            </div>
          </div>
        </Panel>
        <Background
          color="#e6f0ff"
          className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100"
        />
        <Controls />
      </ReactFlow>
      
      {/* ダイアログコンポーネント */}
      <PrivacyTermsDialog 
        isOpen={isPrivacyTermsOpen} 
        onClose={() => setIsPrivacyTermsOpen(false)} 
      />
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