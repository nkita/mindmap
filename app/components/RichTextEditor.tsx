declare global {
  interface Window {
    setIsHandlingPopover?: (value: boolean) => void;
  }
}

import { useState, useCallback, useEffect, useRef } from "react";
import { Bold, Italic, Underline, Link as LinkIcon, Code, Palette, ExternalLink, X } from "lucide-react";
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

// カラーパレット用の色の配列
const COLORS = [
  '#000000', '#5c5c5c', '#8e8e8e', '#c3c3c3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00',
  '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#d9ead3', '#d0e0e3',
];

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
  const isHandlingPopover = useRef(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // プレーンテキストとして初期化
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
      // Escapeキーでのブラーのみを処理するため、ここでは何もしない
      return;
    };

    // グローバルフラグを設定する関数を公開
    window.setIsHandlingPopover = (value: boolean) => {
      isHandlingPopover.current = value;

      if (!value && blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };

    return editor.registerRootListener((rootElement) => {
      if (rootElement) {
        rootElement.addEventListener('keydown', handleKeyDown);
        rootElement.addEventListener('blur', handleBlur, true);
        return () => {
          rootElement.removeEventListener('keydown', handleKeyDown);
          rootElement.removeEventListener('blur', handleBlur, true);
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
          }
          delete window.setIsHandlingPopover;
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
function FormatButton({ editor, format, icon }: {
  editor: LexicalEditorType,
  format: TextFormatType | 'link',
  icon: React.ReactNode
}) {
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
      className="p-2 rounded hover:cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title={format}
    >
      {icon}
    </button>
  );
}

// ツールバーコンポーネント
export function EditorToolbar({ editor, onClose }: {
  editor: LexicalEditorType | null,
  onClose?: () => void
}) {
  const [formatState, setFormatState] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isCode: false,
    isLink: false
  });
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [isColorPopoverOpen, setIsColorPopoverOpen] = useState(false);

  // エディタの選択状態が変わったときに書式状態を更新
  useEffect(() => {
    if (!editor) return;

    const updateFormatState = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const isBold = selection.hasFormat('bold');
          const isItalic = selection.hasFormat('italic');
          const isUnderline = selection.hasFormat('underline');
          const isCode = selection.hasFormat('code');
          let isLink = false;

          // リンク状態の確認
          const nodes = selection.getNodes();
          for (const node of nodes) {
            // @ts-expect-error - LinkNodeの型定義の問題を回避
            if (node.getType() === 'link' || (node.getParent() && node.getParent().getType() === 'link')) {
              isLink = true;
              const linkNode = node.getType() === 'link' ? node : node.getParent();
              // @ts-expect-error - LinkNodeの型定義の問題を回避
              const url = linkNode.getURL();
              if (url) setLinkUrl(url);
              break;
            }
          }

          setFormatState({ isBold, isItalic, isUnderline, isCode, isLink });
        }
      });
    };

    // 初期状態を設定
    updateFormatState();

    // 選択状態が変わったときに更新
    return editor.registerUpdateListener(() => {
      updateFormatState();
    });
  }, [editor]);

  if (!editor) return null;

  // ポップオーバーの状態を変更する関数
  const handlePopoverChange = (open: boolean) => {
    if (window.setIsHandlingPopover) {
      window.setIsHandlingPopover(open);
    }
    setIsLinkPopoverOpen(open);
  };

  // ポップオーバーを閉じてフォーカスを戻す関数
  const closePopoverAndFocus = () => {
    setIsLinkPopoverOpen(false);
    setTimeout(() => {
      if (window.setIsHandlingPopover) {
        window.setIsHandlingPopover(false);
      }
      editor.focus();
    }, 10);
  };

  // リンクを挿入/更新する関数
  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.setIsHandlingPopover) {
      window.setIsHandlingPopover(true);
    }

    if (linkUrl.trim()) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
    } else if (formatState.isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }

    setIsLinkPopoverOpen(false);

    setTimeout(() => {
      editor.focus();
      setTimeout(() => {
        if (window.setIsHandlingPopover) {
          window.setIsHandlingPopover(false);
        }
      }, 100);
    }, 10);
  };

  return (
    <div className="flex items-center gap-1">
      <FormatButton editor={editor} format="bold" icon={<Bold className="w-3 h-3" />} />
      <FormatButton editor={editor} format="italic" icon={<Italic className="w-3 h-3" />} />
      <FormatButton editor={editor} format="underline" icon={<Underline className="w-3 h-3" />} />
      <FormatButton editor={editor} format="code" icon={<Code className="w-3 h-3" />} />

      <Popover open={isLinkPopoverOpen} onOpenChange={handlePopoverChange}>
        <PopoverTrigger asChild>
          <button
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${formatState.isLink ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.setIsHandlingPopover) {
                window.setIsHandlingPopover(true);
              }
              setIsLinkPopoverOpen(true);
            }}
            title={formatState.isLink ? "リンクを編集" : "リンクを挿入"}
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 popover-content"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            closePopoverAndFocus();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
            closePopoverAndFocus();
          }}
        >
          <form onSubmit={handleLinkSubmit}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">{formatState.isLink ? "リンクを編集" : "リンクを挿入"}</h4>
                <p className="text-sm text-muted-foreground">
                  {formatState.isLink ? "選択したリンクのURLを編集します" : "選択したテキストにリンクを追加します"}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="col-span-3"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex justify-between">
                {formatState.isLink && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                      closePopoverAndFocus();
                    }}
                  >
                    リンクを削除
                  </button>
                )}
                <div className={formatState.isLink ? '' : 'ml-auto'}>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {formatState.isLink ? "リンクを更新" : "リンクを挿入"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </PopoverContent>
      </Popover>

      <Popover open={isColorPopoverOpen} onOpenChange={setIsColorPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="テキストカラー"
          >
            <Palette className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            setIsColorPopoverOpen(false);
            setTimeout(() => editor?.focus(), 0);
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
            setIsColorPopoverOpen(false);
            setTimeout(() => editor?.focus(), 0);
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: color }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  editor.dispatchCommand(TEXT_COLOR_COMMAND, color);
                  setIsColorPopoverOpen(false);
                  setTimeout(() => editor.focus(), 0);
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {onClose && (
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover:cursor-pointer ml-2"
          title="閉じる"
        >
          <X className="w-3 h-3 text-gray-600" />
        </button>
      )}
    </div>
  );
}

// メインコンポーネント
export default function RichTextEditor({
  initialValue,
  initialState,
  onSave,
  onBlur,
  isEditing,
  editorRef,
  setEditorInstance
}: RichTextEditorProps) {
  const internalEditorRef = useRef<HTMLDivElement>(null);
  const actualEditorRef = editorRef || internalEditorRef;

  // 最後のテキストノードを見つける補助関数
  const findLastTextNode = useCallback((node: Node | null): Node | null => {
    if (!node) return null;

    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }

    // 子ノードを後ろから探索
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const lastTextNode = findLastTextNode(node.childNodes[i]);
      if (lastTextNode) {
        return lastTextNode;
      }
    }

    return null;
  }, []);

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

  // エディタインスタンスを取得するためのハンドラー
  const handleEditorInstance = useCallback((editorInstance: LexicalEditorType) => {
    if (setEditorInstance) {
      setEditorInstance(editorInstance);
    }
  }, [setEditorInstance]);

  // 編集モードが変わったときにフォーカスを設定
  useEffect(() => {
    if (isEditing && actualEditorRef.current) {
      const editorElement = actualEditorRef.current.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editorElement) {
        setTimeout(() => {
          editorElement.focus();

          // カーソルを文字列の最後に配置
          const selection = window.getSelection();
          const range = document.createRange();

          // テキストノードを取得
          if (editorElement.childNodes.length > 0) {
            const lastChild = editorElement.lastChild;
            if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
              // テキストノードの場合は最後の位置に
              range.setStart(lastChild, lastChild.textContent?.length || 0);
            } else {
              // 要素ノードの場合はその中の最後に
              const lastTextNode = findLastTextNode(lastChild);
              if (lastTextNode) {
                range.setStart(lastTextNode, lastTextNode.textContent?.length || 0);
              } else {
                // テキストノードがない場合は要素の最後に
                range.selectNodeContents(editorElement);
                range.collapse(false);
              }
            }
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }, 0);
      }
    }
  }, [isEditing, actualEditorRef, findLastTextNode]);

  return (
    <div ref={actualEditorRef} className={`rich-text-editor ${isEditing ? 'editing' : ''}`}>
      <LexicalComposer initialConfig={initialConfig}>
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
        <EditorInstancePlugin setEditorInstance={handleEditorInstance} />
      </LexicalComposer>
    </div>
  );
} 