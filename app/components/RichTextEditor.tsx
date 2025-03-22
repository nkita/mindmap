import { useState, useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Underline, Link as LinkIcon, Code, Palette, ExternalLink } from "lucide-react";
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getRoot, 
  $createParagraphNode, 
  $createTextNode, 
  FORMAT_TEXT_COMMAND, 
  TextNode, 
  $getSelection, 
  $isRangeSelection, 
  TextFormatType, 
  LexicalCommand, 
  createCommand,
  LexicalEditor as LexicalEditorType
} from 'lexical';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TOGGLE_LINK_COMMAND, LinkNode } from '@lexical/link';
import React from "react";

// Shadcn UIのコンポーネント
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 型定義
export interface RichTextEditorProps {
  initialValue: string;
  initialState?: string;
  onSave: (text: string, state: string) => void;
  onBlur: () => void;
  isEditing: boolean;
  editorRef?: React.RefObject<HTMLDivElement | null>;
  setEditorInstance?: (editor: LexicalEditorType) => void;
}

// コマンド定数
const TEXT_COLOR_COMMAND: LexicalCommand<string> = createCommand('textColor');

// ユーティリティ関数
const focusEditor = (editor: LexicalEditorType) => {
  setTimeout(() => editor.focus(), 0);
};

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

function EditorValuePlugin({ initialValue, initialState, onSave, onBlur, isEditing }: RichTextEditorProps) {
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
    
    const handleBlur = (e: FocusEvent) => {
      if (!isEditing) return;
      
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget) {
        // ポップオーバーやツールバー内の要素にフォーカスが移った場合は無視
        if (relatedTarget.closest('[role="dialog"]') || relatedTarget.closest('[role="toolbar"]')) {
          return;
        }
      }
      
      onBlur?.();
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

// カスタムリンクプラグイン
function CustomLinkPlugin() {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    // リンククリックイベントを処理する関数
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const linkElement = target.closest('a');
      
      if (!linkElement) return;
      
      // 編集モードでなければリンクを開く
      if (!editor.isEditable()) {
        event.preventDefault();
        const href = linkElement.getAttribute('href');
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    };
    
    document.addEventListener('click', handleLinkClick, true);
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [editor]);
  
  return <LinkPlugin />;
}

// UI コンポーネント
function LinkPopover({ editor }: { editor: LexicalEditorType }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('https://');
  const [isLink, setIsLink] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // 選択範囲のリンク状態を確認
  const checkLinkStatus = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();
        let foundLink = false;
        
        for (const node of nodes) {
          // @ts-expect-error - LinkNodeの型定義の問題を回避
          if (node.getType() === 'link' || (node.getParent() && node.getParent().getType() === 'link')) {
            foundLink = true;
            const linkNode = node.getType() === 'link' ? node : node.getParent();
            // @ts-expect-error - LinkNodeの型定義の問題を回避
            const linkUrl = linkNode.getURL();
            if (linkUrl) {
              setUrl(linkUrl);
            }
            break;
          }
        }
        
        setIsLink(foundLink);
      }
    });
  }, [editor]);
  
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      checkLinkStatus();
    }
    setOpen(isOpen);
  }, [checkLinkStatus]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (url.trim()) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    } else if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
    
    setOpen(false);
    setTimeout(() => editor.focus(), 0);
  };
  
  const handleRemoveLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setOpen(false);
    setTimeout(() => editor.focus(), 0);
  };
  
  const handlePopoverInteraction = (e: Event) => {
    const editorRoot = editor.getRootElement();
    const target = e.target as Node;
    
    // エディタ内またはポップオーバー内のクリックは無視
    if ((editorRoot && editorRoot.contains(target)) || 
        (popoverRef.current && popoverRef.current.contains(target))) {
      e.preventDefault();
      return;
    }
    
    setOpen(false);
    setTimeout(() => editor.focus(), 0);
  };
  
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button 
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${isLink ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            checkLinkStatus();
            setOpen(true);
          }}
          title={isLink ? "リンクを編集" : "リンクを挿入"}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80" 
        ref={popoverRef}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          setOpen(false);
          setTimeout(() => editor.focus(), 0);
        }}
        onInteractOutside={handlePopoverInteraction}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">{isLink ? "リンクを編集" : "リンクを挿入"}</h4>
              <p className="text-sm text-muted-foreground">
                {isLink ? "選択したリンクのURLを編集します" : "選択したテキストにリンクを追加します"}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="col-span-3"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex justify-between">
              {isLink && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleRemoveLink}
                >
                  リンクを削除
                </button>
              )}
              <div className={isLink ? '' : 'ml-auto'}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {isLink ? "リンクを更新" : "リンクを挿入"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function FormatButton({ editor, format, icon, active = false }: { editor: LexicalEditorType, format: TextFormatType | 'link', icon: React.ReactNode, active?: boolean }) {
  const onFormatClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (format !== 'link') {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
      focusEditor(editor);
    }
  }, [editor, format]);
  
  if (format === 'link') return null;
  
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

export function EditorToolbar({ editor }: { editor: LexicalEditorType | null }) {
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
      <LinkPopover editor={editor} />
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
const RichTextEditor = ({ initialValue, initialState, onSave, onBlur, isEditing, editorRef, setEditorInstance }: RichTextEditorProps) => {
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
          contentEditable={<ContentEditable className="w-full outline-none min-h-[1.5em]" />}
          placeholder={isEditing ? <div className="text-zinc-400">アイデアを入力...</div> : null}
          ErrorBoundary={({ children }) => <>{children}</>}
        />
        <HistoryPlugin />
        <CustomLinkPlugin />
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

export default RichTextEditor; 