import { useState, createContext, ReactNode } from "react";

interface MindMapContextType {
    isEditing: boolean;
    setIsEditing: (value: boolean) => void;
    currentEditingNodeId: string | null;
    setCurrentEditingNodeId: (nodeId: string | null) => void;
}

export const MindMapContext = createContext<MindMapContextType>({
    isEditing: false,
    setIsEditing: () => { },
    currentEditingNodeId: null,
    setCurrentEditingNodeId: () => { }
});

export const MindMapProvider = ({ children }: { children: ReactNode }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentEditingNodeId, setCurrentEditingNodeId] = useState<string | null>(null);

    return (
        <MindMapContext.Provider value={{
            isEditing,
            setIsEditing,
            currentEditingNodeId,
            setCurrentEditingNodeId
        }}>
            {children}
        </MindMapContext.Provider>
    )
}
