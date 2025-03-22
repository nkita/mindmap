import { Position, Handle, NodeToolbar, useReactFlow } from "@xyflow/react";
import { useState, useContext, useCallback, useRef } from "react";
import { MindMapContext } from "./provider";
import { Plus } from "lucide-react";
import { LexicalEditor as LexicalEditorType } from 'lexical';
import React from "react";
import RichTextEditor, { EditorToolbar } from "./components/RichTextEditor";

// ノードコンポーネント
export const MiddleNode = ({ ...node }) => {
    const [label, setLabel] = useState(node.data.label);
    const [editorState, setEditorState] = useState(node.data.editorState || '');
    const { updateNodeData, addNodes } = useReactFlow();
    const { isEditing: globalIsEditing, setIsEditing: globalSetIsEditingContext } = useContext(MindMapContext);
    const [isEditing, setIsEditing] = useState(false);
    const [editor, setEditor] = useState<LexicalEditorType | null>(null);
    const editorRef = useRef<HTMLDivElement | null>(null);

    // 編集モードの切り替え
    const onEdit = useCallback(() => {
        setIsEditing(true);
        globalSetIsEditingContext(true);
    }, [globalSetIsEditingContext]);

    const offEdit = useCallback(() => {
        setIsEditing(false);
        globalSetIsEditingContext(false);
        updateNodeData(node.id, { label, editorState });
    }, [globalSetIsEditingContext, node.id, label, editorState, updateNodeData]);

    // エディタの変更を処理
    const handleEditorChange = useCallback((newText: string, newState: string) => {
        setLabel(newText);
        setEditorState(newState);
    }, []);

    // 新しいノードを追加
    const addSiblingNode = useCallback(() => {
        addNodes([{
            id: crypto.randomUUID(),
            type: "middleNode",
            data: { label: "new data", parent: node.data.parent, rank: node.data.rank + 0.5 },
            position: { x: 0, y: 0 },
            selected: true
        }]);
    }, [addNodes, node.data.parent, node.data.rank]);

    const addChildNode = useCallback(() => {
        addNodes([{
            id: crypto.randomUUID(),
            type: "middleNode",
            data: { label: "new data", parent: node.id, rank: 0 },
            position: { x: 0, y: 0 },
            selected: true
        }]);
    }, [addNodes, node.id]);

    // 編集モードかどうか
    const isNodeEditing = isEditing || (globalIsEditing && node.selected);

    return (
        <div
            onDoubleClick={onEdit}
            className="group cursor-default">
            {/* リッチエディタツールバー - 編集モード時のみ表示 */}
            <NodeToolbar isVisible={isNodeEditing} position={Position.Top} className="bg-white dark:bg-gray-800 p-1 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    <EditorToolbar editor={editor} />
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

            <NodeToolbar isVisible={node.selected && !isNodeEditing} position={Position.Right}>
                <button
                    onClick={addChildNode}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">
                    <Plus className="w-5 h-5" />
                </button>
            </NodeToolbar>

            <div
                className={`w-full text-[8px] relative bg-zinc-50 dark:bg-blue-900/10 text-card-foreground px-2 inline-block border rounded-md p-2 ${node.selected ? `${isNodeEditing ? 'border-emerald-500' : ' border-blue-500'}` : 'border-transparent'} `}>
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
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
};