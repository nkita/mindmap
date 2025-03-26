import { Position, NodeToolbar } from "@xyflow/react";
import { Pencil, Trash, Plus, Minus } from "lucide-react";
import { EditorToolbar } from "./RichTextEditor";
import { LexicalEditor as LexicalEditorType } from 'lexical';
import React from "react";

// 編集ツールバー
export function EditToolbar({ 
  isVisible, 
  editor, 
  onClose 
}: { 
  isVisible: boolean; 
  editor: LexicalEditorType | null;
  onClose: () => void;
}) {
  return (
    <NodeToolbar
      isVisible={isVisible}
      position={Position.Top}
      className="bg-white dark:bg-gray-800 p-1 rounded-md shadow-md border border-gray-200 dark:border-gray-700 node-toolbar"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <EditorToolbar editor={editor} onClose={onClose} />
      </div>
    </NodeToolbar>
  );
}

// 操作ツールバー
export function ActionToolbar({ 
  isVisible, 
  onEdit, 
  onDelete 
}: { 
  isVisible: boolean; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  return (
    <NodeToolbar 
      isVisible={isVisible} 
      position={Position.Top} 
      className="bg-white dark:bg-gray-800 p-1 rounded-md shadow-md border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-2 rounded hover:bg-gray-200 transition-colors hover:cursor-pointer"
        >
          <Pencil className="w-3 h-3 text-gray-800" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded bg-red-500/50 text-white transition-colors hover:cursor-pointer"
        >
          <Trash className="w-3 h-3" />
        </button>
      </div>
    </NodeToolbar>
  );
}

// 兄弟ノード追加ツールバー
export function SiblingToolbar({ 
  isVisible, 
  onAddSibling 
}: { 
  isVisible: boolean; 
  onAddSibling: () => void;
}) {
  return (
    <NodeToolbar isVisible={isVisible} position={Position.Bottom}>
      <button
        onClick={onAddSibling}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
      >
        <Plus className="w-5 h-5" />
      </button>
    </NodeToolbar>
  );
}

// 子ノード操作ツールバー
export function ChildrenToolbar({ 
  hasChildNodes, 
  showChildren, 
  isSelected, 
  isEditing,
  onToggleChildren, 
  onAddChild 
}: { 
  hasChildNodes: boolean; 
  showChildren: boolean;
  isSelected: boolean;
  isEditing: boolean;
  onToggleChildren: (e: React.MouseEvent) => void; 
  onAddChild: () => void;
}) {
  return (
    <NodeToolbar position={Position.Right} isVisible className="flex gap-2 items-center">
      {hasChildNodes ? (
        <button
          onClick={onToggleChildren}
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
          {(isSelected && !isEditing) &&
            <button
              onClick={onAddChild}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
            >
              <Plus className="w-5 h-5" />
            </button>
          }
        </>
      )}
    </NodeToolbar>
  );
} 