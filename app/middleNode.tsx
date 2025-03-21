import { Position, Handle, NodeToolbar, useReactFlow } from "@xyflow/react";
import { useState, useContext, useCallback, useEffect, useRef } from "react";
import { MindMapContext } from "./provider";
import { Plus, Bold, Italic, Underline, Link, Code, Palette } from "lucide-react";
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode, FORMAT_TEXT_COMMAND, TextNode, $getSelection, $isRangeSelection, TextFormatType, LexicalCommand, createCommand } from 'lexical';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TOGGLE_LINK_COMMAND, LinkNode } from '@lexical/link';
import { LexicalEditor as LexicalEditorType } from 'lexical';
import React from "react";

// 型定義
interface LexicalEditorProps {
    initialValue: string;
    initialState?: string;
    onSave: (text: string, state: string) => void;
    onBlur: () => void;
    isEditing: boolean;
    editorRef?: React.RefObject<HTMLDivElement | null>;
}

// コマンド定数
const TEXT_COLOR_COMMAND: LexicalCommand<string> = createCommand('textColor');

// ユーティリティ関数
const focusEditor = (editor: LexicalEditorType) => {
  setTimeout(() => editor.focus(), 0);
};

// リンク作成ユーティリティ
function toggleLink(editor: LexicalEditorType, url: string | null) {
  if (!url) {
    url = prompt('リンクURLを入力してください:', 'https://');
  }
  
  if (!url) return;
  
  editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  focusEditor(editor);
}

// プラグイン
function EditorInstancePlugin({ setEditorInstance }: { setEditorInstance: (editor: LexicalEditorType) => void }) {
    const [editor] = useLexicalComposerContext();
    
    useEffect(() => {
        setEditorInstance(editor);
    }, [editor, setEditorInstance]);
    
    return null;
}

function TextColorPlugin() {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    return editor.registerCommand(
      TEXT_COLOR_COMMAND,
      (color: string) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.getNodes().forEach(node => {
              if (node instanceof TextNode) {
                const currentStyle = node.getStyle() || '';
                const styleWithoutColor = currentStyle.replace(/color:.*?(;|$)/, '');
                const newStyle = `${styleWithoutColor ? styleWithoutColor + ';' : ''}color: ${color}`;
                node.setStyle(newStyle);
              }
            });
          }
        });
        return true;
      },
      0
    );
  }, [editor]);
  
  return null;
}

function EditorValuePlugin({ initialValue, initialState, onSave, onBlur, isEditing }: LexicalEditorProps) {
    const [editor] = useLexicalComposerContext();
    const initialized = useRef(false);

    // プレーンテキストとして初期化する関数
    const setPlainText = useCallback((text: string) => {
        editor.update(() => {
            const root = $getRoot();
            root.clear();
            const paragraph = $createParagraphNode();
            const textNode = $createTextNode(text);
            paragraph.append(textNode);
            root.append(paragraph);
        });
    }, [editor]);

    // 初期値を設定
    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;

            if (initialState) {
                try {
                    const editorState = editor.parseEditorState(initialState);
                    editor.setEditorState(editorState);
                } catch (e) {
                    console.error('エディタ状態の復元に失敗しました:', e);
                    setPlainText(initialValue);
                }
            } else {
                setPlainText(initialValue);
            }
        }
    }, [editor, initialValue, initialState, setPlainText]);

    // 変更を監視して保存
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            const plainText = editorState.read(() => $getRoot().getTextContent());
            const serializedState = JSON.stringify(editorState);
            onSave(plainText, serializedState);
        });
    }, [editor, onSave]);

    // キーボードイベントとブラーイベントを処理
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isEditing) {
                editor.blur();
                onBlur?.();
            }
        };

        const handleBlur = () => {
            if (isEditing) {
                onBlur?.();
            }
        };

        return editor.registerRootListener((rootElement) => {
            if (rootElement) {
                rootElement.addEventListener('keydown', handleKeyDown);
                rootElement.addEventListener('blur', handleBlur, true);
                return () => {
                    rootElement.removeEventListener('keydown', handleKeyDown);
                    rootElement.removeEventListener('blur', handleBlur, true);
                };
            }
            return null;
        });
    }, [editor, onBlur, isEditing]);

    return null;
}

// UI コンポーネント
function FormatButton({ editor, format, icon, active = false }: { editor: LexicalEditorType, format: TextFormatType | 'link', icon: React.ReactNode, active?: boolean }) {
    const onFormatClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (format === 'link') {
            toggleLink(editor, null);
        } else {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
            focusEditor(editor);
        }
    }, [editor, format]);

    return (
        <button 
            onMouseDown={(e) => e.preventDefault()}
            onClick={onFormatClick}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                active ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title={format}
        >
            {icon}
        </button>
    );
}

function ColorPicker({ editor }: { editor: LexicalEditorType }) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', 
    '#8000FF', '#0080FF', '#FF0080'
  ];
  
  // クリック外側でピッカーを閉じる
  useEffect(() => {
    if (!showPicker) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);
  
  const onColorSelect = useCallback((color: string) => {
    editor.dispatchCommand(TEXT_COLOR_COMMAND, color);
    setShowPicker(false);
    focusEditor(editor);
  }, [editor]);
  
  return (
    <div className="relative">
      <button 
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShowPicker(!showPicker)}
        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="テキストカラー"
      >
        <Palette className="w-4 h-4" />
      </button>
      
      {showPicker && (
        <div 
          ref={pickerRef}
          className="absolute top-full right-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          style={{ width: '120px' }}
        >
          <div className="grid grid-cols-3 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: color }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onColorSelect(color)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditorToolbar({ editor }: { editor: LexicalEditorType | null }) {
  if (!editor) return null;
  
  return (
    <>
      <FormatButton 
        editor={editor} 
        format="bold" 
        icon={<Bold className="w-4 h-4" />} 
      />
      <FormatButton 
        editor={editor} 
        format="italic" 
        icon={<Italic className="w-4 h-4" />} 
      />
      <FormatButton 
        editor={editor} 
        format="underline" 
        icon={<Underline className="w-4 h-4" />} 
      />
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      <FormatButton 
        editor={editor} 
        format="link" 
        icon={<Link className="w-4 h-4" />} 
      />
      <FormatButton 
        editor={editor} 
        format="code" 
        icon={<Code className="w-4 h-4" />} 
      />
      <ColorPicker editor={editor} />
    </>
  );
}

// メインコンポーネント
const LexicalEditor = ({ initialValue, initialState, onSave, onBlur, isEditing, editorRef, setEditorInstance }: LexicalEditorProps & { setEditorInstance?: (editor: LexicalEditorType) => void }) => {
    const internalEditorRef = useRef<HTMLDivElement>(null);
    const actualEditorRef = editorRef || internalEditorRef;

    // エディタの設定
    const initialConfig = {
        namespace: 'MindMapEditor',
        theme: {
            paragraph: 'mb-0',
            text: {
                base: 'outline-none',
                bold: 'font-bold',
                italic: 'italic',
                underline: 'underline',
                strikethrough: 'line-through',
                underlineStrikethrough: 'underline line-through',
                code: 'bg-gray-100 border py-0.5 rounded font-mono',
            },
            link: 'text-blue-500 underline cursor-pointer',
        },
        onError: (error: Error) => console.error(error),
        editable: isEditing,
        nodes: [LinkNode, TextNode],
    };

    // 編集モードが変わったときにフォーカスを設定
    useEffect(() => {
        if (isEditing && actualEditorRef.current) {
            const editorElement = actualEditorRef.current.querySelector('[contenteditable="true"]') as HTMLElement;
            if (editorElement) {
                setTimeout(() => editorElement.focus(), 0);
            }
        }
    }, [isEditing, actualEditorRef]);

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className="editor-container" ref={actualEditorRef}>
                <RichTextPlugin
                    contentEditable={<ContentEditable className={`w-full outline-none min-h-[1.5em] ${!isEditing ? 'pointer-events-none' : ''}`} />}
                    placeholder={isEditing ? <div className="text-zinc-400">アイデアを入力...</div> : null}
                    ErrorBoundary={({ children }) => <>{children}</>}
                />
                <HistoryPlugin />
                <LinkPlugin />
                <TextColorPlugin />
                <EditorValuePlugin 
                    initialValue={initialValue} 
                    initialState={initialState}
                    onSave={onSave} 
                    onBlur={onBlur} 
                    isEditing={isEditing} 
                />
                {setEditorInstance && <EditorInstancePlugin setEditorInstance={setEditorInstance} />}
            </div>
        </LexicalComposer>
    );
};

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
    }, [setIsEditing, globalSetIsEditingContext]);

    const offEdit = useCallback(() => {
        setIsEditing(false);
        globalSetIsEditingContext(false);
        updateNodeData(node.id, { label, editorState });
    }, [setIsEditing, globalSetIsEditingContext, node.id, label, editorState, updateNodeData]);

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
                className={`w-full text-[8px] relative bg-blue-50/40 dark:bg-blue-900/10 text-card-foreground px-2 inline-block border rounded-md p-2 ${node.selected ? `${isNodeEditing ? 'border-emerald-500' : ' border-blue-500'}` : 'border-transparent'} `}>
                {isNodeEditing ? (
                    <LexicalEditor
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
                            <LexicalEditor
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
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
};