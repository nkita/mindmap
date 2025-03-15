import { Position, Handle, NodeToolbar, useReactFlow } from "@xyflow/react";
import { useState, useContext } from "react";
import { MindMapContext } from "./provider";
import { CirclePlus, Pencil } from "lucide-react";

export const MiddleNode = ({ ...node }) => {
    const [label, setLabel] = useState(node.data.label);

    const { updateNodeData, addNodes } = useReactFlow();
    const { setIsEditing: setIsEditingContext } = useContext(MindMapContext);
    const [isEditing, setIsEditing] = useState(false);
    const toggleEdit = () => {
        if (!isEditing) {
            setIsEditing(true)
            setIsEditingContext(true)
        } else {
            setIsEditing(false);
            setIsEditingContext(false);
            updateNodeData(node.id, { label: label });
        }
    }
    return (
        <>
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
                    <button onClick={toggleEdit}
                        className="flex text-xs text-muted-foreground items-center gap-1 px-2 rounded-md hover:bg-accent hover:text-accent-foreground hover:cursor-pointer ">
                        <Pencil className="w-4 h-4" />
                        Edit</button>
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
                className={` bg-card text-card-foreground py-2 px-2 rounded-md inline-block border ${node.selected ? `${isEditing ? 'border-emerald-500' : ' border-blue-500'}` : ''}`}
            >
                <div
                    className="relative flex items-center ">
                    {isEditing ? (
                        <input
                            style={{ fontSize: '10px', width: `${Math.max(100, label.length * 10)}px` }}
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="bg-transparent outline-none w-full resize-none overflow-wrap-break-word ring-0"
                            autoFocus
                            placeholder="Please enter your idea."
                            onBlur={toggleEdit}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    toggleEdit()
                                }
                            }}
                        />
                    ) : (
                        <div
                            style={{ fontSize: '10px' }}
                            onMouseDown={e => e.preventDefault()}
                            className="w-full overflow-wrap-break-word "
                        >
                            {node.data.label}
                        </div>
                    )}
                </div>
                <Handle type="target" position={Position.Left} />
                <Handle type="source" position={Position.Right} />
            </div >
        </>
    );
};