import { Position, Handle, NodeToolbar, useReactFlow } from "@xyflow/react";
import { useState, useContext, useCallback, useEffect, useRef } from "react";
import { MindMapContext } from "./provider";
import { Plus } from "lucide-react";
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import React from "react";

// Lexicalエディタコンポーネントの型定義
interface LexicalEditorProps {
    initialValue: string;
    onSave: (text: string) => void;
    onBlur: () => void;
    isEditing: boolean;
}

// Lexicalエディタコンポーネント
const LexicalEditor = ({ initialValue, onSave, onBlur, isEditing }: LexicalEditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // エディタの設定
    const initialConfig = {
        namespace: 'MindMapEditor',
        theme: {
            paragraph: 'mb-0',
            text: {
                base: 'outline-none'
            }
        },
        onError: (error: Error) => console.error(error),
        editable: isEditing,
    };

    // 編集モードが変わったときにフォーカスを設定
    useEffect(() => {
        if (isEditing && editorRef.current) {
            const editorElement = editorRef.current.querySelector('[contenteditable="true"]') as HTMLElement;
            if (editorElement) {
                setTimeout(() => {
                    editorElement.focus();
                }, 0);
            }
        }
    }, [isEditing]);

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className="editor-container" ref={editorRef}>
                <PlainTextPlugin
                    contentEditable={<ContentEditable className={`w-full outline-none min-h-[1.5em] ${!isEditing ? 'pointer-events-none' : ''}`} />}
                    placeholder={isEditing ? <div className="text-zinc-400">アイデアを入力...</div> : null}
                    ErrorBoundary={({ children }) => <>{children}</>}
                />
                <HistoryPlugin />
                <EditorValuePlugin initialValue={initialValue} onSave={onSave} onBlur={onBlur} isEditing={isEditing} />
            </div>
        </LexicalComposer>
    );
};

// エディタの値を管理するプラグイン
function EditorValuePlugin({ initialValue, onSave, onBlur, isEditing }: LexicalEditorProps) {
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
                // 末尾の改行を削除
                onSave(text.replace(/\n$/, ''));
            });
        });
    }, [editor, onSave]);

    // キーボードイベントを処理
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isEditing) {
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
    }, [editor, onBlur, isEditing]);

    // onBlurイベントを処理
    useEffect(() => {
        const handleBlur = () => {
            if (isEditing) {
                onBlur();
            }
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
    }, [editor, onBlur, isEditing]);

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
    const handleLabelChange = useCallback((newText: string) => {
        setLabel(newText);
    }, []);

    // 編集モードかどうか
    const isNodeEditing = isEditing || (globalIsEditing && node.selected);

    return (
        <div
            onDoubleClick={onEdit}
            className="group cursor-default">
            <NodeToolbar isVisible={node.selected && !isNodeEditing} position={Position.Bottom}>
                <button
                    onClick={() => addNodes([{
                        id: crypto.randomUUID(),
                        type: "middleNode",
                        data: { label: "new data", parent: node.data.parent, rank: node.data.rank + 0.5 },
                        position: { x: 0, y: 0 },
                        selected: true
                    }])}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">
                    <Plus className="w-5 h-5" />
                </button>
            </NodeToolbar>
            <NodeToolbar isVisible={node.selected && !isNodeEditing} position={Position.Right}>
                <button
                    onClick={() => addNodes([{
                        id: crypto.randomUUID(),
                        type: "middleNode",
                        data: { label: "new data", parent: node.id, rank: 0 },
                        position: { x: 0, y: 0 },
                        selected: true
                    }])}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">
                    <Plus className="w-5 h-5" />
                </button>
            </NodeToolbar>
            <div
                className={`w-full text-[8px] relative bg-zinc-50 text-card-foreground px-2 inline-block border rounded-md p-2 ${node.selected ? `${isNodeEditing ? 'border-emerald-500' : ' border-blue-500'}` : 'border-transparent'} `}>
                {isNodeEditing ? (
                    <LexicalEditor
                        initialValue={label}
                        onSave={handleLabelChange}
                        onBlur={offEdit}
                        isEditing={isNodeEditing}
                    />
                ) : (
                    <div className="w-full break-words overflow-wrap-break-word whitespace-pre-wrap">
                        {label ? label.split('\n').map((line: string, i: number) => (
                            <React.Fragment key={i}>
                                {i > 0 && <br />}
                                {line || ' '}
                            </React.Fragment>
                        )) : <span className="text-zinc-400">No idea.</span>}
                    </div>
                )}
            </div>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
};