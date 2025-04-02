import { BookOpen, Trash2 } from 'lucide-react';

interface MindmapListProps {
  isExpanded: boolean;
  mindmapList: { id: string; title: string }[];
  currentMindmapId: string;
  onSwitchMindmap: (id: string) => void;
  onDeleteMindmap: (id: string, e: React.MouseEvent) => void;
}

export default function MindmapList({
  isExpanded,
  mindmapList,
  currentMindmapId,
  onSwitchMindmap,
  onDeleteMindmap
}: MindmapListProps) {
  if (!isExpanded || mindmapList.length === 0) return null;

  return (
    <div className='bg-white dark:bg-slate-800 rounded-lg shadow-inner border border-blue-50 dark:border-blue-900/30 overflow-hidden'>
      <div className='p-3 border-b border-blue-50 dark:border-blue-900/30 bg-blue-50/50 dark:bg-slate-700/50'>
        <h3 className='text-sm font-semibold text-slate-700 dark:text-slate-200'>Mindmap List</h3>
      </div>
      <ul className='max-h-60 overflow-y-auto divide-y divide-blue-50 dark:divide-blue-900/30'>
        {mindmapList.map(item => (
          <li
            key={item.id}
            className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${
              item.id === currentMindmapId 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
            }`}
            onClick={() => onSwitchMindmap(item.id)}
          >
            <div className="flex items-center overflow-hidden">
              <BookOpen size={16} className={`mr-2 flex-shrink-0 ${
                item.id === currentMindmapId 
                  ? 'text-blue-500 dark:text-blue-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`} />
              <span className="truncate">{item.title}</span>
            </div>

            {/* 削除ボタン - 最後の1つは削除できないようにする */}
            {mindmapList.length > 1 && (
              <button
                className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                onClick={(e) => onDeleteMindmap(item.id, e)}
                title="Delete mindmap"
              >
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
} 