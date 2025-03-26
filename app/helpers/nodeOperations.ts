import { Node, Edge } from "@xyflow/react";
import { NodeData } from "../helper-custom-layout";
import { dispatchAutoEditNode } from "../events";

// 新しいノードを作成する関数
export function createNewNode(
  parentId: string, 
  rank: number, 
  addNodes: (nodes: Node[]) => void
): string {
  const newNodeId = crypto.randomUUID();

  addNodes([{
    id: newNodeId,
    type: "middleNode",
    data: {
      label: "new data",
      parent: parentId,
      rank: rank,
      showChildren: true,
      display: true,
      autoEdit: true
    },
    position: { x: 0, y: 0 },
    selected: true
  }]);

  // 新しいノードを自動的に編集モードにするためのイベントを発火
  setTimeout(() => {
    dispatchAutoEditNode(newNodeId);
  }, 100);

  return newNodeId;
}

// 削除対象のノードを収集する関数
export function collectNodesToDelete(
  nodeId: string, 
  allNodes: { id: string; data: { parent?: string } }[]
): string[] {
  const result: string[] = [nodeId];

  // 子ノードを再帰的に収集
  const collectChildren = (parentId: string) => {
    const children = allNodes.filter(n => n.data && n.data.parent === parentId);
    children.forEach(child => {
      result.push(child.id);
      collectChildren(child.id);
    });
  };

  collectChildren(nodeId);
  return result;
}

// 子ノードの表示状態を更新する関数
export function updateChildNodesDisplay(
  nodeId: string,
  showChildren: boolean,
  nodes: Node[]
): Node[] {
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
} 