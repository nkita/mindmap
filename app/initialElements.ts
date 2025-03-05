import { Node } from '@xyflow/react';
const position = { x: 0, y: 0 };
const edgeType = 'smoothstep';

export const initialNodes: Node[] = [
  {
    id: '1',
    type: 'middleNode',
    data: { label: 'input new input for sep' },
    expandParent: false,
    position,
  },
  {
    id: '2',
    type: 'middleNode',
    data: { label: 'node 2 long text size over aaaaa' },
    expandParent: false,
    position,
  },
  {
    id: '4',
    type: 'middleNode',
    data: { label: 'node 4 new node for sep' },
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
  { id: 'e12', source: '1', target: '2', type: edgeType },
  { id: 'e13', source: '1', target: '3', type: edgeType },
  { id: 'e22a', source: '2', target: '2a', type: edgeType },
  { id: 'e22b', source: '2', target: '2b', type: edgeType },
  { id: 'e22c', source: '2', target: '2c', type: edgeType },
  { id: 'e2c2d', source: '2c', target: '2d', type: edgeType },
  { id: 'e45', source: '4', target: '5', type: edgeType },
  { id: 'e56', source: '5', target: '6', type: edgeType },
  { id: 'e57', source: '5', target: '7', type: edgeType },
];