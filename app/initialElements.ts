import { Node } from '@xyflow/react';
const position = { x: 0, y: 0 };

export const initialNodes: Node[] = [
  {
    id: 'root',
    type: 'middleNode',
    data: { label: 'Root', parent: '', rank: 1 },
    position,
  },
  {
    id: 'root-1',
    type: 'middleNode',
    data: { label: 'id node 1 long text', parent: 'root', rank: 1 },
    expandParent: false,
    position,
  },
  {
    id: 'root-3',
    type: 'middleNode',
    data: { label: 'id node 3', parent: 'root', rank: 3 },
    position,
  },
  {
    id: 'root-2',
    type: 'middleNode',
    data: { label: 'id node 2', parent: 'root', rank: 2 },
    position,
  },
  { id: 'root-2-7', type: 'middleNode', data: { label: ' id 7 node output', parent: 'root-2', rank: 2 }, position },
  {
    id: 'root-2-6',
    type: 'middleNode',
    data: { label: 'id node 6', parent: 'root-2', rank: 1 },
    position,
  },
];

export const initialEdges = [
  // { id: 'e47', source: 'root', target: 'root-1', type: edgeType },
  // { id: 'e12', source: 'root', target: 'root-2', type: edgeType },
  // { id: 'e56', source: 'root-2', target: 'root-2-6', type: edgeType },
  // { id: 'e57', source: 'root-2', target: 'root-2-7', type: edgeType },
];