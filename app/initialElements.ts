import { Node } from '@xyflow/react';
const position = { x: 0, y: 0 };
const edgeType = 'bezier';

export const initialNodes: Node[] = [
  {
    id: '2',
    type: 'middleNode',
    data: { label: 'node 2 long text size over aaaaa' },
    expandParent: false,
    position,
  },
  {
    id: 'root',
    type: 'middleNode',
    data: { label: 'Root' },
    position,
  },
  {
    id: '5',
    type: 'middleNode',
    data: { label: 'node 5' },
    position,
  },
  {
    id: '6',
    type: 'middleNode',
    data: { label: 'output' },
    position,
  },
  { id: '7', type: 'middleNode', data: { label: 'output' }, position },
];

export const initialEdges = [
  { id: 'e12', source: 'root', target: '2', type: edgeType },
  { id: 'e47', source: 'root', target: '5', type: edgeType },
  { id: 'e45', source: '4', target: '5', type: edgeType },
  { id: 'e56', source: '5', target: '6', type: edgeType },
  { id: 'e57', source: '5', target: '7', type: edgeType },
];