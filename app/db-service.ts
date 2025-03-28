import { Node } from '@xyflow/react';

// IndexedDBの初期化
export const initializeDB = () => {
  return new Promise<IDBDatabase>((resolve) => {
    const request = indexedDB.open('mindmap-db', 1);

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('mindmaps')) {
        db.createObjectStore('mindmaps', { keyPath: 'id' });
      }
    };
  });
};

// マインドマップデータの保存
export const saveMindmap = async (id: string, nodes: Node[]) => {
  const db = await initializeDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['mindmaps'], 'readwrite');
    const store = transaction.objectStore('mindmaps');

    const request = store.put({
      id,
      nodes,
      updatedAt: new Date().toISOString()
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject('マインドマップの保存に失敗しました');

    transaction.oncomplete = () => db.close();
  });
};

// マインドマップデータの取得
export const loadMindmap = async (id: string): Promise<Node[]> => {
  const db = await initializeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['mindmaps'], 'readonly');
    const store = transaction.objectStore('mindmaps');

    const request = store.get(id);

    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        resolve(data.nodes);
      } else {
        // デフォルトのルートノード
        resolve([{
          id: 'root',
          type: 'middleNode',
          data: {
            label: 'マインドマップ',
            parent: null,
            rank: 0,
            showChildren: true,
            display: true
          },
          position: { x: 0, y: 0 }
        }]);
      }
    };

    request.onerror = () => reject('マインドマップの読み込みに失敗しました');

    transaction.oncomplete = () => db.close();
  });
};

// マインドマップリストの取得
export const getMindmapList = async (): Promise<{id: string, title: string}[]> => {
  const db = await initializeDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['mindmaps'], 'readonly');
    const store = transaction.objectStore('mindmaps');
    
    const request = store.getAll();
    
    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        resolve(data.map(item => ({
          id: item.id,
          title: item.nodes.find((n: Node) => n.id === 'root')?.data?.label || 'マインドマップ'
        })));
      } else {
        resolve([]);
      }
    };
    
    request.onerror = () => reject('マインドマップリストの取得に失敗しました');
    
    transaction.oncomplete = () => db.close();
  });
}; 