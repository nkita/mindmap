import { type Edge, type Node } from "@xyflow/react";
import { prepareHierarchicalElements } from './helper-node-sort';
import * as MindmapLayouts from 'mindmap-layouts';
// MindmapLayoutsライブラリを使用したレイアウト関数
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

    // 型定義を先に追加
    interface MindMapNode {
        name: string;
        id: string;
        width: number;
        height: number;
        children: MindMapNode[];
        originalNode?: Node;
        x?: number;
        y?: number;
    }

    // マインドマップのルートノードを作成
    const rootNode: {
        name: string;
        children: MindMapNode[];
    } = {
        name: 'root',
        children: []
    };

    // nodeMapの型を修正
    const nodeMap: Record<string, MindMapNode> = {};

    // 親子関係を構築
    sortedNodes.forEach(node => {
        // ノードデータを取得
        const nodeData = getNodeData(node.id);
        // マインドマップ用のノードを作成
        const mmNode = {
            name: node.id,
            id: node.id,
            width: nodeData?.measured?.width || 10,
            height: nodeData?.measured?.height || 26,
            children: [],
            originalNode: node
        };

        // ノードマップに追加
        nodeMap[node.id] = mmNode;

        // 親ノードに追加
        const parentId = node.data?.parent as string;
        if (!parentId) {
            // 親がない場合はルートの子として追加
            rootNode.children.push(mmNode);
        } else if (nodeMap[parentId]) {
            // 親がある場合は親の子として追加
            nodeMap[parentId].children.push(mmNode);
        }
    });
    // レイアウトオプションの型を修正
    const options = {
        getWidth: (d: MindMapNode) => d.width || 172,
        getHeight: (d: MindMapNode) => d.height || 36,
        horizontalGap: 10, // 水平方向の間隔
        verticalGap: 10     // 垂直方向の間隔
    };
    // レイアウトの種類を選択
    let layout;
    switch (direction) {
        case 'RL':
            layout = new MindmapLayouts.LeftLogical(rootNode.children[0], options);
            break;
        case 'TB':
            layout = new MindmapLayouts.DownwardOrganizational(rootNode.children[0], options);
            break;
        case 'BT':
            layout = new MindmapLayouts.UpwardOrganizational(rootNode.children[0], options);
            break;
        case 'STANDARD':
            layout = new MindmapLayouts.Standard(rootNode.children[0], options);
            break;
        case 'LR':
        default:
            layout = new MindmapLayouts.RightLogical(rootNode.children[0], options);
            break;
    }
    // レイアウト計算を実行
    layout.doLayout();

    // レイアウト後のノードを取得
    const layoutedNodes = layout.getNodes();
    // 計算された位置を元のノードに適用
    const updatedNodes = sortedNodes.map(node => {
        // レイアウト後のノード情報を検索
        const layoutNode = layoutedNodes.find((n: MindMapNode) => n.id === node.id);

        if (!layoutNode) {
            return node; // 見つからない場合は元のノードを返す
        }

        return {
            ...node,
            position: {
                x: layoutNode.x,
                y: layoutNode.y
            }
        };
    });
    return { nodes: updatedNodes, edges: hierarchyEdges };
};

