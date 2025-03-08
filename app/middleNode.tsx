import { Position, Handle, NodeToolbar, useReactFlow } from "@xyflow/react";
import { useState, useContext } from "react";
import { MindMapContext } from "./provider";

export const MiddleNode = ({ ...props }) => {
    const [label, setLabel] = useState(props.data.label);

    const { updateNodeData } = useReactFlow();
    const { setIsEditing: setIsEditingContext } = useContext(MindMapContext);
    const [isEditing, setIsEditing] = useState(false);
    const toggleEdit = () => {
        if (!isEditing) {
            setIsEditing(true)
            setIsEditingContext(true)
        } else {
            setIsEditing(false);
            setIsEditingContext(false);
            updateNodeData(props.id, { label: label });
        }
    }
    return (
        <>
            <NodeToolbar isVisible={props.selected} position={Position.Top}>
                <div className="p-1 flex gap-1 rounded-md bg-card shadow-md border">
                    <button onClick={toggleEdit} className="rounded-md hover:bg-accent hover:text-accent-foreground hover:cursor-pointer p-2">+</button>
                </div>
            </NodeToolbar>
            <NodeToolbar isVisible={props.selected} position={Position.Bottom}>
                <div className="p-1 flex gap-1 rounded-md bg-card shadow-md border">
                    <button onClick={toggleEdit} className="rounded-md hover:bg-accent hover:text-accent-foreground hover:cursor-pointer p-2">+</button>
                </div>
            </NodeToolbar>
            <NodeToolbar isVisible={props.selected} position={Position.Right}>
                <div className="p-1 flex gap-1 rounded-md bg-card shadow-md border">
                    <button onClick={toggleEdit} className="rounded-md hover:bg-accent hover:text-accent-foreground hover:cursor-pointer p-2">Edit</button>
                    <button onClick={toggleEdit} className="rounded-md hover:bg-accent hover:text-accent-foreground hover:cursor-pointer p-2">Plus</button>
                </div>
            </NodeToolbar>
            <div
                className={`bg-card text-card-foreground py-2 px-2 rounded-md border inline-block min-w-[100px] max-w-[200px] ${props.selected ? `${isEditing ? 'border-2' : ''} border-blue-500` : ''}`}
            >
                <div className="relative flex items-center text-xs">
                    {isEditing ? (
                        <textarea
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="bg-transparent outline-none w-full resize-none overflow-wrap-break-word"
                            autoFocus
                            onBlur={toggleEdit}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    toggleEdit()
                                }
                            }}
                        />
                    ) : (
                        <div
                            onMouseDown={e => e.preventDefault()}
                            className="w-full whitespace-pre-wrap"
                        >
                            {props.data.label}
                        </div>
                    )}
                </div>
                <Handle type="target" position={Position.Left} />
                <Handle type="source" position={Position.Right} />
            </div >
        </>
    );
};