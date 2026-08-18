import React, { useState } from 'react';
import { Settings, Moon, Sun, Key, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { AppSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
}

export const Header: React.FC<HeaderProps> = ({ settings, onUpdateSettings }) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasApiKey = settings.apiKey || process.env.GEMINI_API_KEY;

  return (
    <header className="h-16 shrink-0 bg-white dark:bg-natural-sidebar border-b border-natural-border px-6 flex items-center justify-between z-40 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-natural-accent rounded-lg">
          <Cpu size={20} className="text-white dark:text-natural-sidebar" />
        </div>
        <div>
          <h1 className="text-lg font-bold font-serif tracking-tight text-natural-accent leading-none">Редактор смыслов</h1>
          <span className="text-[10px] font-bold text-natural-ink-muted uppercase tracking-widest block mt-0.5">Коммуникационная адаптация</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* API Key Status */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          hasApiKey 
            ? 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/30' 
            : 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30'
        }`}>
          {hasApiKey ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
          <span>{hasApiKey ? 'Активен' : 'Нужен Ключ'}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors text-zinc-500"
          >
            <Settings size={20} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-2 w-72 bg-white dark:bg-natural-sidebar border border-natural-border rounded-xl shadow-2xl p-4 z-50 space-y-4 transition-colors duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-natural-ink-muted">Настройки</h3>
                    </div>

                     {/* Theme Toggle */}
                    <div className="flex items-center justify-between p-2 bg-natural-bg dark:bg-zinc-800 rounded-lg">
                      <div className="flex items-center gap-2 text-xs font-medium text-natural-ink dark:text-zinc-300">
                        {settings.theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                        <span>Тёмная тема</span>
                      </div>
                      <button
                        onClick={() => onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                        className={`w-10 h-5 rounded-full transition-colors relative border ${
                          settings.theme === 'dark' 
                            ? 'bg-natural-accent border-natural-accent' 
                            : 'bg-natural-border border-natural-border'
                        }`}
                      >
                        <motion.div 
                          animate={{ x: settings.theme === 'dark' ? 20 : 0 }}
                          className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>

                    {/* API Key Input */}
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                         <Key size={14} />
                         <span>Gemini API Key</span>
                       </div>
                       <input
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => onUpdateSettings({ apiKey: e.target.value })}
                        placeholder="Введите ваш API ключ..."
                        className="w-full p-2 bg-natural-bg border border-natural-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-natural-accent transition-colors text-natural-ink placeholder:text-natural-ink-muted/50"
                       />
                       <p className="text-[9px] text-zinc-400 leading-tight">
                         Ключ сохраняется только в вашем браузере. Получить его можно на <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 underline">Google AI Studio</a>.
                       </p>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
