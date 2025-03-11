import {
    type Node,
    type Edge,
} from '@xyflow/react';
import { orderBy } from 'lodash';
import dagre from 'dagre';

// 型ガード関数
const isNode = (item: unknown): item is Node =>
    item instanceof Object && 'id' in item;

const isEdge = (item: unknown): item is Edge =>
    item instanceof Object && 'source' in item;

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

// 階層構造を再帰的に処理するユーティリティ関数
export const traverseHierarchy = <T>(
    nodes: Node[],
    parentId: string | null,
    processor: (nodes: Node[], parentId: string | null) => T[]
): T[] => {
    const childNodes = nodes.filter(node => node.data?.parent === parentId);
    const currentLevel = processor(childNodes, parentId);
    const childResults = childNodes.flatMap(node =>
        traverseHierarchy(nodes, node.id, processor)
    );
    return [...currentLevel, ...childResults];
};

// ノードをランク順にソートする関数
export const sortNodesByRank = (nodes: Node[]): Node[] => {
    return orderBy(nodes, [(node: Node) => node.data?.rank || 0], ['asc']);
};

// 親子関係に基づいてエッジを生成する関数
export const createHierarchyEdges = (nodes: Node[], parentId: string | null): Edge[] => {
    if (parentId === null) return [];
    return nodes.map(node => ({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'default',
    }));
};

// ノードとエッジの階層構造を準備する関数
const prepareHierarchicalElements = (nodes: Node[]): { sortedNodes: Node[]; hierarchyEdges: Edge[] } => {
    const rootNode = nodes.find(node => node.id === "root");
    if (!rootNode) return { sortedNodes: [], hierarchyEdges: [] };

    const nodeResults = traverseHierarchy(nodes, "root", sortNodesByRank);
    const sortedNodes = [rootNode, ...nodeResults.filter(isNode)];
    const edgeResults = traverseHierarchy(sortedNodes, 'root', createHierarchyEdges);
    const hierarchyEdges = edgeResults.filter(isEdge);

    return { sortedNodes, hierarchyEdges };
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
        graph.setNode(node.id, {
            width: nodeData?.measured?.width || 172,
            height: nodeData?.measured?.height || 36,
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
                x: nodeWithPosition.x - nodeWithPosition.width / 2,
                y: nodeWithPosition.y - nodeWithPosition.height / 2,
            },
        } as Node;
    });
};
