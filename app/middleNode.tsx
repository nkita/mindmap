import { Position, Handle, NodeProps } from "@xyflow/react";


export const MiddleNode = ({ ...props }) => {
    // console.log(props);
    return (
        <div className={`bg-card  text-card-foreground p-2 rounded-md border ${props.selected ? 'border-blue-500' : ''}`}>
            <div>{props.data.label}</div>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
};