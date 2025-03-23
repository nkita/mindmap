import { type Edge, type Node } from "@xyflow/react";
import { prepareHierarchicalElements } from './helper-node-sort';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as MindmapLayouts from 'mindmap-layouts';

// 型定義を拡張
export interface NodeData {
  display?: boolean;
  parent?: string;
  showChildren?: boolean;
  label?: string;
  editorState?: string;
  rank?: number;
  children?: string[];
  [key: string]: unknown; // その他のプロパティも許可
}

// MindmapLayoutsライブラリ用のノード型
interface MindMapNode {
  name: string;
  id: string;
  width: number;
  height: number;
  children: MindMapNode[];
  originalNode?: Node;
  x?: number;
  y?: number;
  data?: unknown;
}

// レイアウトオプション
const layoutOptions = {
  getWidth: (d: MindMapNode) => d.width || 172,
  getHeight: (d: MindMapNode) => d.height || 36,
  horizontalGap: 10, // 水平方向の間隔
  verticalGap: 10    // 垂直方向の間隔
};

/**
 * ノードの表示状態を計算する
 * @param nodes すべてのノード
 * @returns 表示状態が設定されたノード
 */
const calculateNodeDisplayStatus = (nodes: Node[]): Node[] => {
  return nodes.map(node => {
    const parentId = (node.data as NodeData).parent;
    
    // ルートノードは常に表示
    if (!parentId) {
      return {
        ...node,
        data: {
          ...node.data,
          display: true
        }
      };
    }

    // 親をたどって非表示の子を持つ親があるかチェック
    let shouldDisplay = true;
    let currentParentId = parentId;
    
    while (currentParentId && shouldDisplay) {
      // 親ノードを検索
      const parentNode = nodes.find(n => n.id === currentParentId);
      if (!parentNode) break;

      // 親ノードが子要素を非表示に設定している場合
      if (parentNode.data.showChildren === false) {
        shouldDisplay = false;
      }
      // 親の親をたどる
      currentParentId = (parentNode.data as NodeData).parent || '';
    }

    return {
      ...node,
      data: {
        ...node.data,
        display: shouldDisplay
      },
      // 非表示の場合はスタイルを設定
      style: shouldDisplay ? undefined : { display: 'none' }
    };
  });
};

/**
 * マインドマップのレイアウトを計算する
 */
export const getLayoutedElements = (
  nodes: Node[],
  direction = 'LR',
  getNodeData: (id: string) => Node | undefined,
): { nodes: Node[]; edges: Edge[] } => {
  // 階層構造の準備
  const { sortedNodes, hierarchyEdges } = prepareHierarchicalElements(nodes);

  // 空の結果を早期に返す
  if (sortedNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // 表示状態を計算
  const nodesWithDisplayStatus = calculateNodeDisplayStatus(sortedNodes);
  
  // 表示するノードのみをフィルタリング（レイアウト計算用）
  const visibleNodes = nodesWithDisplayStatus.filter(node => node.data.display);

  // マインドマップのルートノードを作成
  const rootNode: { name: string; children: MindMapNode[] } = {
    name: 'root',
    children: []
  };

  // ノードマップの作成
  const nodeMap: Record<string, MindMapNode> = {};

  // 親子関係を構築
  visibleNodes.forEach(node => {
    // ノードデータを取得
    const nodeData = getNodeData(node.id);
    
    // マインドマップ用のノードを作成
    const mmNode: MindMapNode = {
      name: node.id,
      id: node.id,
      width: nodeData?.measured?.width || 10,
      height: nodeData?.measured?.height || 26,
      children: [],
      originalNode: node,
      data: node.data
    };

    // ノードマップに追加
    nodeMap[node.id] = mmNode;

    // 親ノードに追加
    const parentId = (node.data as NodeData).parent;
    if (!parentId) {
      // 親がない場合はルートの子として追加
      rootNode.children.push(mmNode);
    } else if (nodeMap[parentId]) {
      // 親がある場合は親の子として追加
      nodeMap[parentId].children.push(mmNode);
    }
  });

  // レイアウトの種類を選択
  let layout;
  switch (direction) {
    case 'RL':
      layout = new MindmapLayouts.LeftLogical(rootNode.children[0], layoutOptions);
      break;
    case 'TB':
      layout = new MindmapLayouts.DownwardOrganizational(rootNode.children[0], layoutOptions);
      break;
    case 'BT':
      layout = new MindmapLayouts.UpwardOrganizational(rootNode.children[0], layoutOptions);
      break;
    case 'STANDARD':
      layout = new MindmapLayouts.Standard(rootNode.children[0], layoutOptions);
      break;
    case 'LR':
    default:
      layout = new MindmapLayouts.RightLogical(rootNode.children[0], layoutOptions);
      break;
  }

  // レイアウト計算を実行
  layout.doLayout();

  // レイアウト後のノードを取得
  const layoutedNodes = layout.getNodes();

  // 計算された位置を元のノードに適用
  const updatedNodes = visibleNodes.map(node => {
    // レイアウト後のノード情報を検索
    const layoutNode = layoutedNodes.find((n: MindMapNode) => n.id === node.id);

    if (!layoutNode) {
      return node; // 見つからない場合は元のノードを返す
    }

    // 子ノードのIDを取得
    const childrenIds = layoutNode.children?.map((child: { id: unknown; }) => child.id) || [];

    return {
      ...node,
      data: {
        ...node.data,
        children: childrenIds
      },
      type: childrenIds.length > 0 ? 'middleNode' : 'lastNode',
      position: {
        x: layoutNode.x || 0,
        y: layoutNode.y || 0
      }
    };
  });

  // 非表示ノードも含めて返す（位置は更新しない）
  const allUpdatedNodes = nodesWithDisplayStatus.map(node => {
    // 表示ノードの中に含まれているか確認
    const updatedNode = updatedNodes.find(n => n.id === node.id);
    if (updatedNode) {
      return updatedNode; // 表示ノードならそのまま返す
    }

    // 非表示ノードは元の位置を保持
    return node;
  });

  // 表示するエッジのみをフィルタリング
  const visibleEdges = hierarchyEdges.filter(edge => {
    return visibleNodes.some(node => node.id === edge.source) &&
           visibleNodes.some(node => node.id === edge.target);
  });

  return { nodes: allUpdatedNodes, edges: visibleEdges };
};

