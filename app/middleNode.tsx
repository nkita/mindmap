import { Position, Handle, useReactFlow } from "@xyflow/react";
import { useState, useContext, useCallback, useRef, useEffect } from "react";
import { MindMapContext } from "./provider";
import { LexicalEditor as LexicalEditorType } from 'lexical';
import React from "react";
import RichTextEditor from "./components/RichTextEditor";
import { 
  EditToolbar, 
  ActionToolbar, 
  SiblingToolbar, 
  ChildrenToolbar 
} from "./components/NodeToolbars";
import { 
  EVENTS, 
  addEventListenerWithCleanup, 
  dispatchNodeShowChildrenChanged,
  dispatchForceLayoutRefresh,
  dispatchDeleteNodes,
  dispatchEndNodeEdit
} from "./events";
import { createNewNode, collectNodesToDelete } from "./helpers/nodeOperations";

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
            dispatchEndNodeEdit(currentEditingNodeId);

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

    // 兄弟ノードの追加
    const addSiblingNode = useCallback(() => {
        createNewNode(node.data.parent, node.data.rank + 0.5, addNodes);
    }, [node.data, addNodes]);

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

        createNewNode(node.id, 0, addNodes);

        // 子ノードを追加したら、hasChildNodesを更新
        setHasChildNodes(true);
    }, [node.id, showChildren, updateNodeData, node.data, addNodes]);

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
        dispatchNodeShowChildrenChanged(node.id, newShowChildren);

        // レイアウト再計算を要求
        setTimeout(() => {
            dispatchForceLayoutRefresh();
        }, 50);
    }, [node.id, node.data, showChildren, updateNodeData]);

    // 自動編集モードの処理
    addEventListenerWithCleanup(
        EVENTS.AUTO_EDIT_NODE,
        (event: CustomEvent<{ nodeId: string }>) => {
            if (event.detail.nodeId === node.id) {
                onEdit();
            }
        }
    );

    // このノードが自動編集フラグを持っている場合、編集モードを有効にする
    useEffect(() => {
        if (node.data.autoEdit) {
            // フラグをリセット
            updateNodeData(node.id, {
                ...node.data,
                autoEdit: false
            });

            onEdit();
        }
    }, [node.id, node.data, onEdit, updateNodeData]);

    // 編集終了イベントのリスナー
    addEventListenerWithCleanup(
        EVENTS.END_NODE_EDIT,
        (event: CustomEvent<{ nodeId: string }>) => {
            if (event.detail.nodeId === node.id) {
                // このノードの編集を終了
                setIsEditing(false);
                updateNodeData(node.id, { label, editorState, showChildren });
            }
        }
    );

    // 削除ボタンの処理
    const handleDelete = useCallback(() => {
        // 削除対象のノードIDを収集
        const nodesToDelete = collectNodesToDelete(node.id, getNodes());

        // 削除イベントを発火
        dispatchDeleteNodes(nodesToDelete);

        // コンソールに削除情報を出力（デバッグ用）
        console.log('Deleting nodes:', nodesToDelete);
    }, [node.id, getNodes]);

    // 非表示の場合は何も描画しない
    if (!isDisplayed) {
        return null;
    }

    return (
        <div
            onDoubleClick={onEdit}
            className={`group ${isNodeEditing ? 'cursor-text' : 'cursor-default'}`}>

            {/* 非編集モード時のツールバー */}
            <ActionToolbar 
                isVisible={node.selected && !isNodeEditing}
                onEdit={onEdit}
                onDelete={handleDelete}
            />

            {/* 編集モード時のツールバー */}
            <EditToolbar 
                isVisible={isNodeEditing}
                editor={editor}
                onClose={offEdit}
            />

            {/* 兄弟ノード追加ボタン */}
            <SiblingToolbar 
                isVisible={node.selected && !isNodeEditing}
                onAddSibling={addSiblingNode}
            />

            {/* 子要素の表示・非表示を切り替えるボタン */}
            <ChildrenToolbar 
                hasChildNodes={hasChildNodes}
                showChildren={showChildren}
                isSelected={node.selected}
                isEditing={isNodeEditing}
                onToggleChildren={toggleChildren}
                onAddChild={addChildNode}
            />

            {/* ノードの内容 */}
            <div
                className={`w-full text-[8px] relative bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 inline-block border rounded-lg shadow-sm transition-all
                    ${isNodeEditing 
                        ? 'hover:cursor-text border-teal-500 dark:border-teal-400 ring-2 ring-teal-500/20 dark:ring-teal-400/20 shadow-md' 
                        : `${node.selected 
                            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20 shadow-md' 
                            : 'border-blue-100 dark:border-blue-900/50 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md'}`
                    }`}>

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
                            label || <span className="text-slate-400 dark:text-slate-500 italic">No idea.</span>
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