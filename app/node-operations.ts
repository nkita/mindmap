import { Node, Edge, NodeChange, applyNodeChanges } from '@xyflow/react';
import { NodeData, getLayoutedElements } from './helper-custom-layout';
import { recalculateRanks, sortNodesByRank, traverseHierarchy } from './helper-node-sort';

// ノード変更時のハンドラー
export const handleNodeChanges = (
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
export const updateChildNodesDisplay = (
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