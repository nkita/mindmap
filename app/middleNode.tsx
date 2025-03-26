import { Position, Handle, NodeToolbar, useReactFlow } from "@xyflow/react";
import { useState, useContext, useCallback, useRef, useEffect } from "react";
import { MindMapContext } from "./provider";
import { Plus, Minus, Pencil, Trash } from "lucide-react";
import { LexicalEditor as LexicalEditorType } from 'lexical';
import React from "react";
import RichTextEditor, { EditorToolbar } from "./components/RichTextEditor";

// ノードコンポーネント
export const MiddleNode = ({ ...node }) => {
    // 状態管理
    const [isDisplayed, setIsDisplayed] = useState(true);
    const [label, setLabel] = useState(node.data.label);
    const [editorState, setEditorState] = useState(node.data.editorState || '');
    const [showChildren, setShowChildren] = useState(node.data.showChildren !== false);
    const [isEditing, setIsEditing] = useState(false);
    const [editor, setEditor] = useState<LexicalEditorType | null>(null);
    const [hasChildNodes, setHasChildNodes] = useState(false);
    
    // 参照
    const editorRef = useRef<HTMLDivElement | null>(null);
    
    // コンテキストとフック
    const { updateNodeData, addNodes, getNodes } = useReactFlow();
    const { 
        isEditing: globalIsEditing, 
        setIsEditing: globalSetIsEditingContext,
        currentEditingNodeId,
        setCurrentEditingNodeId
    } = useContext(MindMapContext);

    // 計算値
    const isNodeEditing = isEditing || (globalIsEditing && node.selected);
    
    // ハンドルのスタイル
    const handleStyle = {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        border: 'none',
    };

    // 表示状態の更新
    useEffect(() => {
        setIsDisplayed(node.data.display !== false);
    }, [node.data.display]);

    // ノードデータが外部から更新された場合に状態を同期
    useEffect(() => {
        if (node.data.showChildren !== undefined && showChildren !== node.data.showChildren) {
            setShowChildren(node.data.showChildren);
        }
    }, [node.data.showChildren, showChildren]);

    // 子ノードの存在を確認し、状態を更新
    useEffect(() => {
        const checkChildren = () => {
            const allNodes = getNodes();
            const childNodes = allNodes.filter(n => n.data.parent === node.id);
            setHasChildNodes(childNodes.length > 0);
        };

        checkChildren();

        // ReactFlowインスタンスの変更を監視（頻度を下げる）
        const interval = setInterval(checkChildren, 2000);
        return () => clearInterval(interval);
    }, [getNodes, node.id]);

    // エディタにフォーカスを設定する共通関数
    const focusEditor = useCallback(() => {
        setTimeout(() => {
            if (editorRef.current) {
                const editorElement = editorRef.current.querySelector('[contenteditable="true"]') as HTMLElement;
                if (editorElement) {
                    // フォーカスを設定
                    editorElement.focus();
                    
                    // テキスト全体を選択
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(editorElement);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                }
            }
        }, 100);
    }, []);

    // 編集モードの開始
    const onEdit = useCallback(() => {
        if (!isDisplayed) return;
        
        // 既に他のノードが編集中の場合、そのノードの編集を終了させる
        if (globalIsEditing && currentEditingNodeId !== null && currentEditingNodeId !== node.id) {
            // 現在編集中のノードの編集を終了させるイベントを発火
            const endEditEvent = new CustomEvent('endNodeEdit', {
                detail: { nodeId: currentEditingNodeId }
            });
            window.dispatchEvent(endEditEvent);
            
            // 少し待ってから編集モードを開始
            setTimeout(() => {
                setIsEditing(true);
                globalSetIsEditingContext(true);
                setCurrentEditingNodeId(node.id);
                focusEditor();
            }, 10);
            return;
        }
        
        setIsEditing(true);
        globalSetIsEditingContext(true);
        setCurrentEditingNodeId(node.id);
        focusEditor();
    }, [globalIsEditing, currentEditingNodeId, globalSetIsEditingContext, isDisplayed, node.id, setCurrentEditingNodeId, focusEditor]);

    // 編集モードの終了
    const offEdit = useCallback(() => {
        if (!isDisplayed) return;
        
        // このノードが現在編集中のノードである場合のみグローバル状態をリセット
        if (currentEditingNodeId === node.id) {
            globalSetIsEditingContext(false);
            setCurrentEditingNodeId(null);
        }
        
        setIsEditing(false);
        updateNodeData(node.id, { label, editorState, showChildren });
    }, [globalSetIsEditingContext, currentEditingNodeId, node.id, label, editorState, showChildren, updateNodeData, isDisplayed, setCurrentEditingNodeId]);

    // エディタの変更を処理
    const handleEditorChange = useCallback((newText: string, newState: string) => {
        setLabel(newText);
        setEditorState(newState);
    }, []);

    // 新しいノードを作成する共通関数
    const createNewNode = useCallback((parentId: string, rank: number) => {
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
            const editEvent = new CustomEvent('autoEditNode', {
                detail: { nodeId: newNodeId }
            });
            window.dispatchEvent(editEvent);
        }, 100);
        
        return newNodeId;
    }, [addNodes]);

    // 兄弟ノードの追加
    const addSiblingNode = useCallback(() => {
        createNewNode(node.data.parent, node.data.rank + 0.5);
    }, [createNewNode, node.data]);

    // 子ノードの追加
    const addChildNode = useCallback(() => {
        // 子ノードを追加するときに親ノードの子要素表示を有効にする
        if (!showChildren) {
            setShowChildren(true);
            updateNodeData(node.id, {
                ...node.data,
                showChildren: true
            });
        }

        createNewNode(node.id, 0);
        
        // 子ノードを追加したら、hasChildNodesを更新
        setHasChildNodes(true);
    }, [createNewNode, node.id, showChildren, updateNodeData, node.data]);

    // 子要素の表示・非表示を切り替え
    const toggleChildren = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const newShowChildren = !showChildren;

        // 状態を更新
        setShowChildren(newShowChildren);

        // ノードデータを更新
        updateNodeData(node.id, {
            ...node.data,
            showChildren: newShowChildren,
            _updated: Date.now()
        });

        // カスタムイベントを発火
        const event = new CustomEvent('nodeShowChildrenChanged', {
            detail: {
                nodeId: node.id,
                showChildren: newShowChildren,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);

        // レイアウト再計算を要求
        setTimeout(() => {
            const refreshEvent = new CustomEvent('forceLayoutRefresh', {
                detail: { timestamp: Date.now() }
            });
            window.dispatchEvent(refreshEvent);
        }, 50);
    }, [node.id, node.data, showChildren, updateNodeData]);

    // 自動編集モードの処理
    useEffect(() => {
        // 自動編集モードのイベントリスナー
        const handleAutoEdit = (event: CustomEvent<{nodeId: string}>) => {
            if (event.detail.nodeId === node.id) {
                onEdit();
            }
        };

        // このノードが自動編集フラグを持っている場合、編集モードを有効にする
        if (node.data.autoEdit) {
            // フラグをリセット
            updateNodeData(node.id, {
                ...node.data,
                autoEdit: false
            });
            
            onEdit();
        }

        // イベントリスナーを登録
        window.addEventListener('autoEditNode', handleAutoEdit as EventListener);
        
        return () => {
            window.removeEventListener('autoEditNode', handleAutoEdit as EventListener);
        };
    }, [node.id, node.data, onEdit, updateNodeData]);

    // 編集終了イベントのリスナー
    useEffect(() => {
        const handleEndEdit = (event: CustomEvent<{nodeId: string}>) => {
            if (event.detail.nodeId === node.id) {
                // このノードの編集を終了
                setIsEditing(false);
                updateNodeData(node.id, { label, editorState, showChildren });
            }
        };
        
        window.addEventListener('endNodeEdit', handleEndEdit as EventListener);
        
        return () => {
            window.removeEventListener('endNodeEdit', handleEndEdit as EventListener);
        };
    }, [node.id, label, editorState, showChildren, updateNodeData]);

    // 外部クリックで編集モードを終了するイベントリスナー
    useEffect(() => {
        // 編集モード中のみイベントリスナーを設定
        if (isEditing) {
            const handleOutsideClick = (e: MouseEvent) => {
                // クリックされた要素がこのノードの子孫でない場合
                if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
                    // 編集モードを終了
                    offEdit();
                }
            };

            // キャプチャフェーズでイベントをリッスン（バブリングより先に実行される）
            document.addEventListener('click', handleOutsideClick, true);
            
            return () => {
                document.removeEventListener('click', handleOutsideClick, true);
            };
        }
    }, [isEditing, offEdit]);

    // 削除ボタンの処理を追加
    const handleDelete = useCallback(() => {
        // 削除対象のノードIDを収集
        const nodesToDelete = collectNodesToDelete(node.id, getNodes());
        
        // ReactFlowの標準機能を使用してノードを削除
        const deleteChanges = nodesToDelete.map(id => ({
            type: 'remove' as const,
            id
        }));
        
        // 削除変更を適用
        const customEvent = new CustomEvent('deleteNodes', {
            detail: { changes: deleteChanges }
        });
        window.dispatchEvent(customEvent);
        
        // コンソールに削除情報を出力（デバッグ用）
        console.log('Deleting nodes:', nodesToDelete);
    }, [node.id, getNodes]);

    // 削除対象のノードを収集する関数
    const collectNodesToDelete = (nodeId: string, allNodes: { id: string; data: { parent?: string } }[]): string[] => {
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
    };

    // 非表示の場合は何も描画しない
    if (!isDisplayed) {
        return null;
    }

    return (
        <div
            onDoubleClick={onEdit}
            className={`group ${isNodeEditing ? 'cursor-text' : 'cursor-default'}`}>
            
            {/* 非編集モード時のツールバー */}
            <NodeToolbar isVisible={node.selected && !isNodeEditing} position={Position.Top} className="bg-white dark:bg-gray-800 p-1 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className="p-2 rounded hover:bg-gray-200 transition-colors hover:cursor-pointer">
                        <Pencil className="w-3 h-3 text-gray-800" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 rounded bg-red-500/50 text-white transition-colors hover:cursor-pointer">
                        <Trash className="w-3 h-3" />
                    </button>
                </div>
            </NodeToolbar>

            {/* 編集モード時のツールバー */}
            <NodeToolbar isVisible={isNodeEditing} position={Position.Top} className="bg-white dark:bg-gray-800 p-1 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    <EditorToolbar editor={editor} onClose={offEdit} />
                </div>
            </NodeToolbar>

            {/* 兄弟ノード追加ボタン */}
            <NodeToolbar isVisible={node.selected && !isNodeEditing} position={Position.Bottom}>
                <button
                    onClick={addSiblingNode}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">
                    <Plus className="w-5 h-5" />
                </button>
            </NodeToolbar>

            {/* 子要素の表示・非表示を切り替えるボタン */}
            <NodeToolbar position={Position.Right} isVisible className="flex gap-2 items-center">
                {hasChildNodes ? (
                    <button
                        onClick={toggleChildren}
                        style={{ transform: 'translateX(-8px)' }}
                        className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors shadow-md border dark:border-gray-600"
                        title={showChildren ? "子要素を非表示" : "子要素を表示"}
                    >
                        {showChildren ? (
                            <Minus className="w-3 h-3 text-gray-800 dark:text-gray-200" />
                        ) : (
                            <Plus className="w-3 h-3 text-gray-800 dark:text-gray-200" />
                        )}
                    </button>
                ) : (
                    <>
                        {(node.selected && !isNodeEditing) &&
                            <button
                                onClick={addChildNode}
                                className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">
                                <Plus className="w-5 h-5" />
                            </button>
                        }
                    </>
                )}
            </NodeToolbar>

            {/* ノードの内容 */}
            <div
                className={`w-full text-[8px] relative bg-zinc-50 dark:bg-blue-900/10 text-card-foreground px-2 inline-block border rounded-md p-2 
                    ${isNodeEditing ? 'hover:cursor-text border-emerald-500' : `${node.selected ? 'border-blue-500' : 'border-transparent'}`}
                    `}>

                {isNodeEditing ? (
                    <RichTextEditor
                        initialValue={label}
                        initialState={editorState}
                        onSave={handleEditorChange}
                        onBlur={offEdit}
                        isEditing={true}
                        editorRef={editorRef}
                        setEditorInstance={setEditor}
                    />
                ) : (
                    <div className="w-full break-words overflow-wrap-break-word whitespace-pre-wrap">
                        {editorState ? (
                            <RichTextEditor
                                initialValue={label}
                                initialState={editorState}
                                onSave={() => {}}
                                onBlur={() => {}}
                                isEditing={false}
                            />
                        ) : (
                            label || <span className="text-zinc-400">No idea.</span>
                        )}
                    </div>
                )}
            </div>
            
            {/* ハンドル */}
            <Handle
                type="target"
                position={Position.Left}
                style={handleStyle}
                isConnectable={false}
            />
            <Handle
                type="source"
                position={Position.Right}
                style={handleStyle}
                isConnectable={false}
            />
        </div>
    );
};