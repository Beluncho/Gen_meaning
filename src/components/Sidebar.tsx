import React from 'react';
import { Plus, MessageSquare, Trash2, MoreVertical, Edit2 } from 'lucide-react';
import { RequestRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  records: RequestRecord[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, newTitle: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  records,
  currentId,
  onSelect,
  onDelete,
  onNew,
  onRename,
}) => {
  return (
    <aside className="w-full h-full bg-natural-sidebar border-r border-natural-border flex flex-col overflow-hidden transition-colors duration-200">
      <div className="p-4">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-natural-accent text-white dark:text-natural-bg rounded-lg hover:opacity-90 transition-all font-semibold text-sm shadow-sm"
        >
          <Plus size={18} />
          <span>Новый запрос</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {records.map((record) => (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  currentId === record.id
                    ? 'bg-white dark:bg-natural-bg text-natural-ink shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                    : 'hover:bg-natural-border/30 text-natural-ink-muted'
                }`}
                onClick={() => onSelect(record.id)}
              >
                <MessageSquare size={16} className={`shrink-0 ${currentId === record.id ? 'text-natural-accent' : 'opacity-70'}`} />
                <span className={`flex-1 truncate text-sm ${currentId === record.id ? 'font-semibold' : 'font-medium'}`}>
                  {record.title || 'Без названия'}
                </span>
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTitle = prompt('Введите новое название:', record.title);
                      if (newTitle !== null) onRename(record.id, newTitle);
                    }}
                    className="p-1 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-500"
                    title="Переименовать"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Удалить этот запрос?')) onDelete(record.id);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 rounded transition-colors text-zinc-500"
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 text-center">
        История запросов (локально)
      </div>
    </aside>
  );
};
