import { Position, Handle, NodeToolbar, useReactFlow, useOnSelectionChange, useKeyPress, OnSelectionChangeParams, Edge, Node } from "@xyflow/react";
import { useState, useContext, useCallback, useEffect } from "react";
import { MindMapContext } from "./provider";
import { CirclePlus, Pencil } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

export const MiddleNode = ({ ...node }) => {
    const [label, setLabel] = useState(node.data.label);
    const { updateNodeData, addNodes } = useReactFlow();
    const { isEditing: globalIsEditing, setIsEditing: globalSetIsEditingContext } = useContext(MindMapContext);
    const [isEditing, setIsEditing] = useState(false);
    const onEdit = useCallback(() => {
        setIsEditing(true)
        globalSetIsEditingContext(true)
    }, [setIsEditing, globalSetIsEditingContext])

    const offEdit = useCallback(() => {
        setIsEditing(false);
        globalSetIsEditingContext(false);
        updateNodeData(node.id, { label: label });
    }, [setIsEditing, globalSetIsEditingContext, node.id, label, updateNodeData])

    return (
        <div
            onDoubleClick={onEdit}
            style={{
                // width: `${Math.max(50, label.length * 8)}px`,
                width: `${label.length * 0.2 || 1}ch`,
            }}
            className="group cursor-default">
            <NodeToolbar isVisible={node.selected} position={Position.Bottom}>
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
            </NodeToolbar >
            <NodeToolbar isVisible={node.selected} position={Position.Right}>
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
                className={`w-full text-[8px] relative bg - transparent text - card - foreground px - 2 inline-block border-b ${node.selected ? `${isEditing || (globalIsEditing && node.selected) ? 'border-emerald-500' : ' border-blue-500'}` : 'border-transparent'} `}>
                {isEditing || (globalIsEditing && node.selected) ? (
                    <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        autoFocus
                        className="w-full outline-none"
                        onBlur={offEdit}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                offEdit()
                            }
                        }}
                    />
                ) : (
                    <div
                        className="w-full break-words  overflow-wrap-break-word whitespace-nowrap "
                    >
                        {label ? <span>{label}</span> : <span className="text-zinc-400">No idea.</span>}
                    </div>
                )}
                <Handle type="target" position={Position.Left} />
                <Handle type="source" position={Position.Right} />
            </div>
        </div>
    );
};