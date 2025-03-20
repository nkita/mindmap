import { Position, Handle, NodeToolbar, useReactFlow } from "@xyflow/react";
import { useState, useContext, useCallback, useEffect, useRef } from "react";
import { MindMapContext } from "./provider";
import { CirclePlus } from "lucide-react";
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';

// Lexicalエディタコンポーネント
const LexicalEditor = ({ initialValue, onSave, onBlur }) => {
    // エディタの設定
    const initialConfig = {
        namespace: 'MindMapEditor',
        theme: {
            paragraph: 'mb-0',
            text: {
                base: 'outline-none'
            }
        },
        onError: (error) => console.error(error),
        editable: true,
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className="editor-container">
                <PlainTextPlugin
                    contentEditable={<ContentEditable className="w-full outline-none min-h-[1.5em]" />}
                    placeholder={<div className="text-zinc-400">アイデアを入力...</div>}
                />
                <HistoryPlugin />
                <EditorValuePlugin initialValue={initialValue} onSave={onSave} onBlur={onBlur} />
            </div>
        </LexicalComposer>
    );
};

// エディタの値を管理するプラグイン
function EditorValuePlugin({ initialValue, onSave, onBlur }) {
    const [editor] = useLexicalComposerContext();
    const initialized = useRef(false);

    // 初期値を設定
    useEffect(() => {
        if (!initialized.current && initialValue) {
            initialized.current = true;
            
            editor.update(() => {
                const root = $getRoot();
                root.clear();
                
                const paragraph = $createParagraphNode();
                const text = $createTextNode(initialValue);
                paragraph.append(text);
                root.append(paragraph);
            });
        }
    }, [editor, initialValue]);

    // 変更を監視して保存
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const root = $getRoot();
                const text = root.getTextContent();
                onSave(text);
            });
        });
    }, [editor, onSave]);

    // キーボードイベントを処理
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                editor.blur();
                onBlur();
            }
        };

        editor.registerRootListener((rootElement) => {
            if (rootElement) {
                rootElement.addEventListener('keydown', handleKeyDown);
                return () => {
                    rootElement.removeEventListener('keydown', handleKeyDown);
                };
            }
            return null;
        });
    }, [editor, onBlur]);

    // onBlurイベントを処理
    useEffect(() => {
        const handleBlur = () => {
            onBlur();
        };

        editor.registerRootListener((rootElement) => {
            if (rootElement) {
                rootElement.addEventListener('blur', handleBlur, true);
                return () => {
                    rootElement.removeEventListener('blur', handleBlur, true);
                };
            }
            return null;
        });
    }, [editor, onBlur]);

    return null;
}

export const MiddleNode = ({ ...node }) => {
    const [label, setLabel] = useState(node.data.label);
    const { updateNodeData, addNodes } = useReactFlow();
    const { isEditing: globalIsEditing, setIsEditing: globalSetIsEditingContext } = useContext(MindMapContext);
    const [isEditing, setIsEditing] = useState(false);
    
    const onEdit = useCallback(() => {
        setIsEditing(true);
        globalSetIsEditingContext(true);
    }, [setIsEditing, globalSetIsEditingContext]);

    const offEdit = useCallback(() => {
        setIsEditing(false);
        globalSetIsEditingContext(false);
        updateNodeData(node.id, { label: label });
    }, [setIsEditing, globalSetIsEditingContext, node.id, label, updateNodeData]);

    // ラベルの更新処理
    const handleLabelChange = useCallback((newText) => {
        setLabel(newText);
    }, []);

    return (
        <div
            onDoubleClick={onEdit}
            className="group cursor-default">
            <NodeToolbar isVisible={node.selected && !isEditing && !(globalIsEditing && node.selected)} position={Position.Bottom}>
                <button
                    onClick={() => addNodes([{
                        id: crypto.randomUUID(),
                        type: "middleNode",
                        data: { label: "new data", parent: node.data.parent, rank: node.data.rank + 0.5 },
                        position: { x: 0, y: 0 },
                        selected: true
                    }])}
                    className="flex text-xs items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors shadow-sm">
                    <CirclePlus className="w-4 h-4" />
                    <span className="font-medium">Enter</span>
                </button>
            </NodeToolbar>
            <NodeToolbar isVisible={node.selected && !isEditing && !(globalIsEditing && node.selected)} position={Position.Right}>
                <button
                    onClick={() => addNodes([{
                        id: crypto.randomUUID(),
                        type: "middleNode",
                        data: { label: "new data", parent: node.id, rank: 0 },
                        position: { x: 0, y: 0 },
                        selected: true
                    }])}
                    className="flex text-xs items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors shadow-sm">
                    <CirclePlus className="w-4 h-4" />
                    <span className="font-medium">Tab</span>
                </button>
            </NodeToolbar>
            <div
                className={`w-full text-[8px] relative bg-transparent text-card-foreground px-2 inline-block border rounded-md p-2 ${node.selected ? `${isEditing || (globalIsEditing && node.selected) ? 'border-emerald-500' : ' border-blue-500'}` : 'border-transparent'} `}>
                {isEditing || (globalIsEditing && node.selected) ? (
                    <LexicalEditor 
                        initialValue={label} 
                        onSave={handleLabelChange}
                        onBlur={offEdit}
                    />
                ) : (
                    <div className="w-full break-words overflow-wrap-break-word whitespace-pre-wrap">
                        {label ? <span>{label}</span> : <span className="text-zinc-400">No idea.</span>}
                    </div>
                )}
            </div>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
};