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
  applyNodeChanges,
  ReactFlowProvider,
  NodeChange,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import { MiddleNode } from './middleNode';
import { MindMapProvider, MindMapContext } from './provider';
import { getLayoutedElements, NodeData } from './helper-custom-layout';
import { recalculateRanks, sortNodesByRank, traverseHierarchy } from './helper-node-sort';

// IndexedDBの初期化と操作関数
const initializeDB = () => {
  return new Promise<IDBDatabase>((resolve) => {
    const request = indexedDB.open('mindmap-db', 1);


    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('mindmaps')) {
        db.createObjectStore('mindmaps', { keyPath: 'id' });
      }
    };
  });
};

// マインドマップデータの保存
const saveMindmap = async (id: string, nodes: Node[]) => {
  const db = await initializeDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['mindmaps'], 'readwrite');
    const store = transaction.objectStore('mindmaps');

    const request = store.put({
      id,
      nodes,
      updatedAt: new Date().toISOString()
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject('マインドマップの保存に失敗しました');

    transaction.oncomplete = () => db.close();
  });
};

// マインドマップデータの取得
const loadMindmap = async (id: string): Promise<Node[]> => {
  const db = await initializeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['mindmaps'], 'readonly');
    const store = transaction.objectStore('mindmaps');

    const request = store.get(id);

    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        resolve(data.nodes);
      } else {
        // デフォルトのルートノード
        resolve([{
          id: 'root',
          type: 'middleNode',
          data: {
            label: 'マインドマップ',
            parent: null,
            rank: 0,
            showChildren: true,
            display: true
          },
          position: { x: 0, y: 0 }
        }]);
      }
    };

    request.onerror = () => reject('マインドマップの読み込みに失敗しました');

    transaction.oncomplete = () => db.close();
  });
};

// ノード変更時のハンドラー
const handleNodeChanges = (
  changes: NodeChange[],
  nodes: Node[],
  getNode: (id: string) => Node | undefined,
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
) => {
  // showChildrenの変更を検出
  const hasShowChildrenChange = changes.some(change => {
    if (change.type === 'select' || change.type === 'remove' ||
      change.type === 'dimensions' || change.type === 'position') {
      return false;
    }

    // ノードデータの変更をチェック
    if (change.type === 'replace') {
      const node = nodes.find(n => n.id === change.id);
      const updatedNode = change.item;
      if (node && updatedNode && node.data.showChildren !== updatedNode.data?.showChildren) {
        return true;
      }
    }

    return false;
  });

  // 単一ノードの追加処理
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
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        rootNode ? [rootNode, ...sortedNodes] : sortedNodes,
        'LR',
        getNode
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      return;
    }

    if (change.type === "dimensions") {
      const updatedNodes = applyNodeChanges(changes, nodes);
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        updatedNodes,
        'LR',
        getNode
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      return;
    }
  }

  // showChildrenが変更された場合は強制的にレイアウトを再計算
  if (hasShowChildrenChange) {
    // 変更を適用
    const updatedNodes = applyNodeChanges(changes, nodes);

    // レイアウトを再計算
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      updatedNodes,
      'LR',
      getNode
    );

    // 更新されたノードとエッジを設定
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    return;
  }

  // 通常の変更処理
  setNodes(prev => applyNodeChanges(changes, prev));
};

// 子ノードの表示状態を更新する関数
const updateChildNodesDisplay = (
  nodeId: string,
  showChildren: boolean,
  nodes: Node[]
): Node[] => {
  return nodes.map(node => {
    // 対象ノード自体の更新
    if (node.id === nodeId) {
      return {
        ...node,
        data: {
          ...node.data,
          showChildren
        }
      };
    }

    // 子孫ノードの表示状態を更新
    let isDescendant = false;
    let parentId = (node.data as NodeData).parent;

    // 親をたどって対象ノードの子孫かどうかを確認
    while (parentId) {
      if (parentId === nodeId) {
        isDescendant = true;
        break;
      }

      // 親の親をたどる
      const parentNode = nodes.find(n => n.id === parentId);
      if (!parentNode) break;
      parentId = (parentNode.data as NodeData).parent;
    }

    // 子孫ノードの場合、表示状態を更新
    if (isDescendant) {
      return {
        ...node,
        data: {
          ...node.data,
          display: showChildren
        },
        style: showChildren ? undefined : { display: 'none' }
      };
    }

    return node;
  });
};

// Flowコンポーネント
const Flow = () => {
  const { getNode, getNodes, addNodes, updateNodeData } = useReactFlow();
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { isEditing, currentEditingNodeId, setIsEditing, setCurrentEditingNodeId } = useContext(MindMapContext);
  const [update, setUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // IndexedDBからデータを読み込む
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const loadedNodes = await loadMindmap('default');
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
        }, 200); // 100ms遅延させてレイアウト計算を行う
      } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [getNode, setNodes, setEdges]);

  // ノードが変更されたらIndexedDBに保存
  useEffect(() => {
    if (nodes.length > 0 && !isLoading) {
      const saveData = async () => {
        try {
          await saveMindmap('default', nodes);
        } catch (error) {
          console.error('データの保存に失敗しました:', error);
        }
      };

      // 変更があった場合のみ保存（デバウンス処理）
      const timer = setTimeout(() => {
        saveData();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [nodes, isLoading]);

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
    // 複数のノードが選択された場合、最後に選択されたノードのみを選択状態にする
    if (params.nodes.length > 1) {
      const lastSelectedNode = params.nodes[params.nodes.length - 1];

      // 他のノードの選択を解除
      setNodes(nodes => nodes.map(node => ({
        ...node,
        selected: node.id === lastSelectedNode.id
      })));
    }
  }, [setNodes]);

  // キーボードショートカットの処理
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // 編集中は何もしない
      if (isEditing) return;

      // 選択されたノードを取得
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

        // 子ノードを追加したら、親ノードの子要素表示を有効にする
        updateNodeData(selectedNode.id, {
          ...selectedNode.data,
          showChildren: true
        });

        // 新しいノードを自動的に編集モードにするためのイベントを発火
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

        // 新しいノードを自動的に編集モードにするためのイベントを発火
        setTimeout(() => {
          const editEvent = new CustomEvent('autoEditNode', {
            detail: { nodeId: newNodeId }
          });
          window.dispatchEvent(editEvent);
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, getNodes, addNodes, updateNodeData]);

  // カスタムイベントリスナー - 子ノードの表示状態変更
  useEffect(() => {
    const handleNodeShowChildrenChanged = (event: CustomEvent) => {
      // 変更されたノードのIDと新しい状態を取得
      const { nodeId, showChildren } = event.detail;

      // 子ノードの表示状態を更新
      const updatedNodes = updateChildNodesDisplay(nodeId, showChildren, nodes);

      // レイアウトを再計算
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        updatedNodes,
        'LR',
        getNode
      );

      // 更新されたノードとエッジを設定
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    };

    // イベントリスナーを登録
    window.addEventListener('nodeShowChildrenChanged', handleNodeShowChildrenChanged as EventListener);

    // クリーンアップ
    return () => {
      window.removeEventListener('nodeShowChildrenChanged', handleNodeShowChildrenChanged as EventListener);
    };
  }, [nodes, getNode, setNodes, setEdges]);

  // 強制レイアウト更新のイベントリスナー
  useEffect(() => {
    const handleForceLayoutRefresh = () => {
      // レイアウトを再計算
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        'LR',
        getNode
      );

      // 更新されたノードとエッジを設定
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    };

    // イベントリスナーを登録
    window.addEventListener('forceLayoutRefresh', handleForceLayoutRefresh);

    // クリーンアップ
    return () => {
      window.removeEventListener('forceLayoutRefresh', handleForceLayoutRefresh);
    };
  }, [nodes, getNode, setNodes, setEdges]);

  // 背景クリックで編集モードを終了
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    // ツールバー内のクリックかどうかをチェック
    const target = event.target as HTMLElement;
    const isToolbarClick =
      target.closest('.editor-toolbar') ||
      target.closest('.node-toolbar') ||
      target.closest('[data-toolbar-button="true"]') ||
      target.closest('[data-lexical-editor="true"]');

    // ツールバークリックの場合は何もしない
    if (isToolbarClick) {
      event.stopPropagation();
      return;
    }

    // 編集中のノードがある場合、編集を終了
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
  const [initialRenderComplete, setInitialRenderComplete] = useState(false);

  useEffect(() => {
    // 初期レンダリング時のみ実行
    if (!initialRenderComplete && !isLoading && nodes.length > 0) {
      // 少し遅延させてノードが正しく配置された後にフィットさせる
      const timer = setTimeout(() => {
        // レイアウトを再計算
        onLayout('LR');
        
        // その後ビューをフィット
        reactFlowInstance.fitView({
          padding: 0.2,
          includeHiddenNodes: false
        });
        
        // 初期レンダリング完了をマーク
        setInitialRenderComplete(true);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [reactFlowInstance, onLayout, initialRenderComplete, isLoading, nodes]);

  // ノード削除イベントのリスナー
  useEffect(() => {
    const handleDeleteNodes = (event: CustomEvent<{ changes: NodeChange[] }>) => {
      // 削除変更を適用
      const { changes } = event.detail;

      // 削除処理を実行
      onNodesChangeWithAutoLayout(changes);

      // 少し遅延させてからレイアウトを更新
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

    return () => {
      window.removeEventListener('deleteNodes', handleDeleteNodes as EventListener);
    };
  }, [onNodesChangeWithAutoLayout, nodes, getNode, setNodes, setEdges]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen w-screen">
      <div className="text-2xl">マインドマップを読み込み中...</div>
    </div>;
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
          <div className='flex gap-2'>
            <div className='bg-blue-500 text-white p-2 rounded-md'>{isEditing ? "編集中" : "閲覧中"}</div>
            <button className='bg-blue-500 text-white p-2 rounded-md' onClick={() => onLayout('TB')}>縦レイアウト</button>
            <button className='bg-blue-500 text-white p-2 rounded-md' onClick={() => onLayout('LR')}>横レイアウト</button>
          </div>
        </Panel>
        <Background
          color="#fff"
        />
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