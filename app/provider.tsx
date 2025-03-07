import { useState, createContext, Dispatch, SetStateAction } from "react";

interface MindMapContextType {
    isEditing: boolean;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
}

export const MindMapContext = createContext<MindMapContextType>({
    isEditing: false,
    setIsEditing: () => { }
});

export const MindMapProvider = ({ children }: { children: React.ReactNode }) => {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <MindMapContext.Provider value={{ isEditing, setIsEditing }}>
            {children}
        </MindMapContext.Provider>
    )
}
