// イベント処理を共通化するためのユーティリティファイル

// イベント名の定数
export const EVENTS = {
  AUTO_EDIT_NODE: 'autoEditNode',
  END_NODE_EDIT: 'endNodeEdit',
  NODE_SHOW_CHILDREN_CHANGED: 'nodeShowChildrenChanged',
  FORCE_LAYOUT_REFRESH: 'forceLayoutRefresh',
  DELETE_NODES: 'deleteNodes'
};

// イベントの型定義
export interface AutoEditNodeEvent {
  nodeId: string;
}

export interface EndNodeEditEvent {
  nodeId: string;
}

export interface NodeShowChildrenChangedEvent {
  nodeId: string;
  showChildren: boolean;
  timestamp: number;
}

export interface ForceLayoutRefreshEvent {
  timestamp: number;
}

export interface DeleteNodesEvent {
  changes: Array<{
    type: 'remove';
    id: string;
  }>;
}

// イベント発火関数
export function dispatchAutoEditNode(nodeId: string): void {
  const event = new CustomEvent<AutoEditNodeEvent>(EVENTS.AUTO_EDIT_NODE, {
    detail: { nodeId }
  });
  window.dispatchEvent(event);
}

export function dispatchEndNodeEdit(nodeId: string): void {
  const event = new CustomEvent<EndNodeEditEvent>(EVENTS.END_NODE_EDIT, {
    detail: { nodeId }
  });
  window.dispatchEvent(event);
}

export function dispatchNodeShowChildrenChanged(
  nodeId: string, 
  showChildren: boolean
): void {
  const event = new CustomEvent<NodeShowChildrenChangedEvent>(
    EVENTS.NODE_SHOW_CHILDREN_CHANGED, 
    {
      detail: {
        nodeId,
        showChildren,
        timestamp: Date.now()
      }
    }
  );
  window.dispatchEvent(event);
}

export function dispatchForceLayoutRefresh(): void {
  const event = new CustomEvent<ForceLayoutRefreshEvent>(
    EVENTS.FORCE_LAYOUT_REFRESH, 
    {
      detail: { timestamp: Date.now() }
    }
  );
  window.dispatchEvent(event);
}

export function dispatchDeleteNodes(nodeIds: string[]): void {
  const changes = nodeIds.map(id => ({
    type: 'remove' as const,
    id
  }));
  
  const event = new CustomEvent<DeleteNodesEvent>(EVENTS.DELETE_NODES, {
    detail: { changes }
  });
  window.dispatchEvent(event);
}

// イベントリスナー登録のヘルパー関数
export function addEventListenerWithCleanup<T>(
  eventName: string,
  handler: (event: CustomEvent<T>) => void,
  deps: React.DependencyList,
  useEffectHook: (effect: React.EffectCallback, deps?: React.DependencyList) => void
): void {
  useEffectHook(() => {
    window.addEventListener(eventName, handler as EventListener);
    return () => {
      window.removeEventListener(eventName, handler as EventListener);
    };
  }, deps);
} 