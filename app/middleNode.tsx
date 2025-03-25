import { Position, Handle, NodeToolbar, useReactFlow } from "@xyflow/react";
import { useState, useContext, useCallback, useRef, useEffect } from "react";
import { MindMapContext } from "./provider";
import { Plus, Minus, Pencil, Trash } from "lucide-react";
import { LexicalEditor as LexicalEditorType } from 'lexical';
import React from "react";
import RichTextEditor, { EditorToolbar } from "./components/RichTextEditor";

// ノードコンポーネント
export const MiddleNode = ({ ...node }) => {
    // すべてのフックを最初に定義
    const [isDisplayed, setIsDisplayed] = useState(true);
    const [label, setLabel] = useState(node.data.label);
    const [editorState, setEditorState] = useState(node.data.editorState || '');
    const [showChildren, setShowChildren] = useState(node.data.showChildren !== false); // デフォルトはtrue
    const { updateNodeData, addNodes, getNodes } = useReactFlow();
    const { isEditing: globalIsEditing, setIsEditing: globalSetIsEditingContext } = useContext(MindMapContext);
    const [isEditing, setIsEditing] = useState(false);
    const [editor, setEditor] = useState<LexicalEditorType | null>(null);
    const editorRef = useRef<HTMLDivElement | null>(null);
    const [hasChildNodes, setHasChildNodes] = useState(false);

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

        // ReactFlowインスタンスの変更を監視
        const interval = setInterval(checkChildren, 1000);
        return () => clearInterval(interval);
    }, [getNodes, node.id]);

    // 編集モードの切り替え
    const onEdit = useCallback(() => {
        if (!isDisplayed) return;
        setIsEditing(true);
        globalSetIsEditingContext(true);
    }, [globalSetIsEditingContext, isDisplayed]);

    const offEdit = useCallback(() => {
        if (!isDisplayed) return;
        setIsEditing(false);
        globalSetIsEditingContext(false);
        updateNodeData(node.id, { label, editorState, showChildren });
    }, [globalSetIsEditingContext, node.id, label, editorState, showChildren, updateNodeData, isDisplayed]);

    // エディタの変更を処理
    const handleEditorChange = useCallback((newText: string, newState: string) => {
        setLabel(newText);
        setEditorState(newState);
    }, []);

    // 子要素の表示・非表示を切り替え
    const toggleChildren = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // イベントの伝播を止める
        const newShowChildren = !showChildren;

        // 状態を更新
        setShowChildren(newShowChildren);

        // ノードデータを更新
        updateNodeData(node.id, {
            ...node.data,
            showChildren: newShowChildren,
            _updated: Date.now() // 強制的に更新を検知させるためのタイムスタンプ
        });

        // カスタムイベントを発火
        const event = new CustomEvent('nodeShowChildrenChanged', {
            detail: {
                nodeId: node.id,
                showChildren: newShowChildren,
                timestamp: Date.now() // イベントの一意性を確保
            }
        });
        window.dispatchEvent(event);

        // 直接レイアウト再計算を要求
        setTimeout(() => {
            const refreshEvent = new CustomEvent('forceLayoutRefresh', {
                detail: { timestamp: Date.now() }
            });
            window.dispatchEvent(refreshEvent);
        }, 50);
    }, [node.id, node.data, showChildren, updateNodeData]);

    // 新しいノードを追加
    const addSiblingNode = useCallback(() => {
        const newNodeId = crypto.randomUUID();
        
        addNodes([{
            id: newNodeId,
            type: "middleNode",
            data: {
                label: "new data",
                parent: node.data.parent,
                rank: node.data.rank + 0.5,
                showChildren: true,
                display: true,
                autoEdit: true // 自動編集モードのフラグを追加
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
    }, [addNodes, node.data.parent, node.data.rank]);

    const addChildNode = useCallback(() => {
        // 子ノードを追加するときに親ノードの子要素表示を有効にする
        if (!showChildren) {
            setShowChildren(true);
            updateNodeData(node.id, {
                ...node.data,
                showChildren: true
            });
        }

        const newNodeId = crypto.randomUUID();
        
        addNodes([{
            id: newNodeId,
            type: "middleNode",
            data: {
                label: "new data",
                parent: node.id,
                rank: 0,
                showChildren: true,
                display: true,
                autoEdit: true // 自動編集モードのフラグを追加
            },
            position: { x: 0, y: 0 },
            selected: true
        }]);

        // 子ノードを追加したら、hasChildNodesを更新
        setHasChildNodes(true);
        
        // 新しいノードを自動的に編集モードにするためのイベントを発火
        setTimeout(() => {
            const editEvent = new CustomEvent('autoEditNode', {
                detail: { nodeId: newNodeId }
            });
            window.dispatchEvent(editEvent);
        }, 100);
    }, [addNodes, node.id, showChildren, node.data, updateNodeData]);

    // 編集モードかどうか
    const isNodeEditing = isEditing || (globalIsEditing && node.selected);

    // ハンドルのスタイル
    const handleStyle = {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        border: 'none',
    };

    // 自動編集モードの処理を追加
    useEffect(() => {
        // 自動編集モードのイベントリスナー
        const handleAutoEdit = (event: CustomEvent<{nodeId: string}>) => {
            if (event.detail.nodeId === node.id) {
                // 編集モードを有効にする
                onEdit();
                
                // エディタにフォーカスを設定
                setTimeout(() => {
                    if (editorRef.current) {
                        const editorElement = editorRef.current.querySelector('[contenteditable="true"]') as HTMLElement;
                        if (editorElement) {
                            // フォーカスを設定
                            editorElement.focus();
                            
                            // テキストを全選択（または必要に応じてカーソルを最後に配置）
                            const selection = window.getSelection();
                            const range = document.createRange();
                            range.selectNodeContents(editorElement);
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                        }
                    }
                }, 200); // タイミングを少し遅らせてエディタが初期化されるのを待つ
            }
        };

        // このノードが自動編集フラグを持っている場合、編集モードを有効にする
        if (node.data.autoEdit) {
            onEdit();
            // フラグをリセット
            updateNodeData(node.id, {
                ...node.data,
                autoEdit: false
            });
            
            // エディタにフォーカスを設定
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
            }, 200); // タイミングを少し遅らせてエディタが初期化されるのを待つ
        }

        // イベントリスナーを登録
        window.addEventListener('autoEditNode', handleAutoEdit as EventListener);
        
        return () => {
            window.removeEventListener('autoEditNode', handleAutoEdit as EventListener);
        };
    }, [node.id, node.data, onEdit, updateNodeData]);

    // 非表示の場合は何も描画しない
    if (!isDisplayed) {
        return null;
    }

    return (
        <div
            onDoubleClick={onEdit}
            className={`group ${isNodeEditing ? 'cursor-text' : 'cursor-default'}`}>
            {/* リッチエディタツールバー - 編集モード時のみ表示 */}
            <NodeToolbar isVisible={node.selected && !isNodeEditing} position={Position.Top} className="bg-white dark:bg-gray-800 p-1 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className={`p-2 rounded hover:bg-gray-200 transition-colors hover:cursor-pointer`}>
                        <Pencil className="w-3 h-3 text-gray-800" />
                    </button>
                    <button
                        onClick={() => { }}
                        className={`p-2 rounded bg-red-500/50 text-white transition-colors hover:cursor-pointer`}>
                        <Trash className="w-3 h-3" />
                    </button>
                </div>
            </NodeToolbar>

            {/* リッチエディタツールバー - 編集モード時のみ表示 */}
            <NodeToolbar isVisible={isNodeEditing} position={Position.Top} className="bg-white dark:bg-gray-800 p-1 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    <EditorToolbar editor={editor} onClose={offEdit} />
                </div>
            </NodeToolbar>

            {/* 通常のツールバー - 非編集モード時のみ表示 */}
            <NodeToolbar isVisible={node.selected && !isNodeEditing} position={Position.Bottom}>
                <button
                    onClick={addSiblingNode}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">
                    <Plus className="w-5 h-5" />
                </button>
            </NodeToolbar>

            {/* 子要素の表示・非表示を切り替えるボタンを含むツールバー */}
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
                                onSave={() => { }}
                                onBlur={() => { }}
                                isEditing={false}
                            />
                        ) : (
                            label || <span className="text-zinc-400">No idea.</span>
                        )}
                    </div>
                )}
            </div>
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
        </div >
    );
};