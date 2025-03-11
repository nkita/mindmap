import { Edge, Node } from "@xyflow/react";

// ソースノードとランクを決定するヘルパー関数
export const determineSourceAndRank = (
    selectedNodes: Node[],
    direction: "parallel" | "series",
    nodes: Node[],
    edges: Edge[]
): { sourceNodeId: string, newRank: number } => {
    // 単一ノード選択の場合
    if (selectedNodes.length === 1) {
        const selectedNodeId = selectedNodes[0].id;
        const selectedNodeRank = selectedNodes[0].data?.rank as number;

        if (direction === "series") {
            // 直列追加（子ノードとして追加）
            const sourceNodeId = selectedNodeId;
            const sameParentNodes = nodes.filter(node => node.data?.parent === sourceNodeId);
            const maxRank = sameParentNodes.length === 0 ? 0 :
                Math.max(...sameParentNodes.map(node => node.data?.rank as number));
            return { sourceNodeId, newRank: maxRank + 1 };
        } else {
            // 並列追加（兄弟ノードとして追加）
            const edge = edges.find(edge => edge.target === selectedNodeId);
            const sourceNodeId = edge?.source ?? selectedNodeId;
            return { sourceNodeId, newRank: selectedNodeRank ? selectedNodeRank + 0.5 : 1 };
        }
    }

    // 複数選択またはノード未選択の場合
    const sourceNodeId = nodes[0].id;
    const sameParentNodes = nodes.filter(node => node.data?.parent === "root");
    const maxRank = sameParentNodes.length === 0 ? 0 :
        Math.max(...sameParentNodes.map(node => node.data?.rank as number));
    return { sourceNodeId, newRank: maxRank + 1 };
};

// ノードのランクを再計算するヘルパー関数
export const recalculateRanks = (nodes: Node[]): Node[] => {
    return nodes.map(node => {
        const sameParentNodes = nodes.filter(n => n.data?.parent === node.data?.parent);
        const sortedSameParentNodes = sameParentNodes.sort((a, b) =>
            a.data?.rank === b.data?.rank ? a.id.localeCompare(b.id) : a.data?.rank - b.data?.rank
        );
        return { ...node, data: { ...node.data, rank: sortedSameParentNodes.indexOf(node) } };
    });
};