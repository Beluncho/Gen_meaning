import React from 'react';
import { TransformationResult } from '../types';
import { Check, Copy, History, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface ResultViewProps {
  result: TransformationResult;
}

export const ResultView: React.FC<ResultViewProps> = ({ result }) => {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sections = [
    {
      id: 'adapted',
      title: 'Адаптированный текст',
      content: result.adapted,
      bg: 'bg-white',
      fullWidth: false,
    },
    {
      id: 'neutral',
      title: 'Исходный смысл',
      content: result.neutral,
      bg: 'bg-white',
      fullWidth: false,
      isItalic: true,
    },
    {
      id: 'changes',
      title: 'Пояснение изменений',
      content: result.changes,
      bg: 'bg-white',
      fullWidth: true,
      isSmall: true,
    },
  ];

  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex flex-col rounded-xl border border-natural-border overflow-hidden shadow-sm bg-white dark:bg-natural-sidebar/20 ${section.fullWidth ? 'md:col-span-2' : ''} transition-colors duration-200`}
          >
            <div className="px-4 py-2 bg-natural-bg/50 dark:bg-natural-sidebar/40 border-b border-natural-border flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-natural-accent">
                {section.title}
              </h3>
              <button
                onClick={() => copyToClipboard(section.content, section.id)}
                className="p-1 hover:bg-natural-border/30 rounded transition-colors text-natural-ink-muted"
                title="Копировать"
              >
                {copied === section.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="p-4 flex-1">
              <p className={`text-sm leading-relaxed text-natural-ink whitespace-pre-wrap ${section.isItalic ? 'italic opacity-80' : ''} ${section.isSmall ? 'text-[13px]' : ''}`}>
                {section.content}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
