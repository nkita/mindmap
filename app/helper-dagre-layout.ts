import {
    type Node,
    type Edge,
} from '@xyflow/react';
import dagre from 'dagre';
import { prepareHierarchicalElements } from './helper-node-sort';

// メイン関数: レイアウト済みの要素を取得
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

    // Dagreグラフの設定
    const isHorizontal = direction === 'LR';
    const dagreGraph = initializeDagreGraph(direction);

    // グラフにノードとエッジを追加
    addNodesToDagreGraph(dagreGraph, sortedNodes, getNodeData);
    addEdgesToDagreGraph(dagreGraph, hierarchyEdges);

    // レイアウトの計算
    dagre.layout(dagreGraph);

    // 位置情報を持つノードの生成
    const positionedNodes = createPositionedNodes(sortedNodes, dagreGraph, isHorizontal);

    return { nodes: positionedNodes, edges: hierarchyEdges };
};

// Dagreグラフを初期化する関数
const initializeDagreGraph = (direction = 'LR'): dagre.graphlib.Graph => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });
    return dagreGraph;
};

// Dagreグラフにノードを追加する関数
const addNodesToDagreGraph = (
    graph: dagre.graphlib.Graph,
    nodes: Node[],
    getNodeData: (id: string) => Node | undefined
): void => {
    nodes.forEach((node) => {
        const nodeData = getNodeData(node.id);
        // 実際のノードサイズを使用し、余裕を持たせる
        const width = (nodeData?.measured?.width || 172) + 20; // 余白を追加
        const height = (nodeData?.measured?.height || 36) + 10; // 余白を追加
        graph.setNode(node.id, {
            width: width,
            height: height,
        });
    });
};

// Dagreグラフにエッジを追加する関数
const addEdgesToDagreGraph = (
    graph: dagre.graphlib.Graph,
    edges: Edge[]
): void => {
    edges.forEach((edge) => {
        graph.setEdge(edge.source, edge.target);
    });
};

// 位置情報を持つノードを生成する関数
const createPositionedNodes = (
    nodes: Node[],
    graph: dagre.graphlib.Graph,
    isHorizontal: boolean
): Node[] => {
    return nodes.map((node) => {
        const nodeWithPosition = graph.node(node.id);
        return {
            ...node,
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
            position: {
                // // 水平方向の場合は、幅の半分を考慮して調整
                // x: isHorizontal ? nodeWithPosition.x - nodeWithPosition.width / 4 : nodeWithPosition.x,
                // y: nodeWithPosition.y - nodeWithPosition.height / 2,
                x: nodeWithPosition.x,
                y: nodeWithPosition.y,
            },
        } as Node;
    });
};

