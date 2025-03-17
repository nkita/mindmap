import { Position, Handle, NodeToolbar, useReactFlow, useOnSelectionChange, useKeyPress, OnSelectionChangeParams, Edge, Node } from "@xyflow/react";
import { useState, useContext, useCallback, useEffect } from "react";
import { MindMapContext } from "./provider";
import { CirclePlus, Pencil } from "lucide-react";

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
        <div className="group">
            <NodeToolbar isVisible={node.selected} position={Position.Bottom}>
                <div className="p-1 flex gap-1 rounded-md bg-card shadow-md border py-1">
                    <button
                        onClick={() => addNodes([{
                            id: crypto.randomUUID(),
                            type: "middleNode",
                            data: { label: "new data", parent: node.data.parent, rank: node.data.rank + 0.5 },
                            position: { x: 0, y: 0 },
                            selected: true
                        }])}
                        className="flex text-xs text-muted-foreground items-center gap-1 px-2 rounded-md hover:bg-accent hover:text-accent-foreground hover:cursor-pointer ">
                        <CirclePlus className="w-4 h-4" />
                        Add Bottom [Enter]</button>
                </div>
            </NodeToolbar >
            <NodeToolbar isVisible={node.selected} position={Position.Right}>
                <div className="p-1 flex gap-1 rounded-md bg-card shadow-md border py-1">
                    <button
                        onClick={() => addNodes([{
                            id: crypto.randomUUID(),
                            type: "middleNode",
                            data: { label: "new data", parent: node.id, rank: 0 },
                            position: { x: 0, y: 0 },
                            selected: true
                        }])}
                        className="flex text-xs text-muted-foreground items-center gap-1 px-2 rounded-md hover:bg-accent hover:text-accent-foreground hover:cursor-pointer ">
                        <CirclePlus className="w-4 h-4" />
                        Add Right [Tab]</button>
                </div>
            </NodeToolbar>
            <div
                className={`relative font-xs bg-transparent text-card-foreground px-2 inline-block border-b ${node.selected ? `${isEditing || (globalIsEditing && node.selected) ? 'border-emerald-500' : ' border-blue-500'}` : ''}`}
            >
                <div
                    className="relative flex items-center ">
                    {isEditing || (globalIsEditing && node.selected) ? (
                        <input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            autoFocus
                            className="w-full outline-none"
                            placeholder="Please enter your idea."
                            onBlur={offEdit}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    offEdit()
                                }
                            }}
                        />
                    ) : (
                        <div
                            onClick={onEdit}
                            className="w-full overflow-wrap-break-word cursor-text"
                        >
                            {node.data.label}
                        </div>
                    )}
                </div>
                <Handle type="target" position={Position.Left} />
                <Handle type="source" position={Position.Right} />
            </div >
        </div>
    );
};