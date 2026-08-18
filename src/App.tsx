/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { ResultView } from './components/ResultView';
import { Header } from './components/Header';
import { useLocalStorage } from './hooks/useLocalStorage';
import { RequestRecord, AppSettings, TransformationParams } from './types';
import { DEFAULT_PARAMS } from './constants';
import { transformText } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';

export default function App() {
  // Persistence
  const [records, setRecords] = useLocalStorage<RequestRecord[]>('requests_history', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('app_settings', {
    theme: 'light',
    apiKey: '',
  });

  // Local State
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize first record if empty
  useEffect(() => {
    if (records.length === 0) {
      const initialRecord: RequestRecord = {
        id: crypto.randomUUID(),
        title: 'Первый запрос',
        sourceText: '',
        params: DEFAULT_PARAMS,
        result: null,
        createdAt: Date.now(),
      };
      setRecords([initialRecord]);
      setCurrentId(initialRecord.id);
    } else if (!currentId) {
      setCurrentId(records[0].id);
    }
  }, [records, currentId, setRecords]);

  // Derived state
  const currentRecord = records.find((r) => r.id === currentId) || null;

  // Theme Sync
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Actions
  const handleNewRecord = useCallback(() => {
    const newRecord: RequestRecord = {
      id: crypto.randomUUID(),
      title: 'Новый запрос',
      sourceText: '',
      params: DEFAULT_PARAMS,
      result: null,
      createdAt: Date.now(),
    };
    setRecords([newRecord, ...records]);
    setCurrentId(newRecord.id);
    setIsSidebarOpen(false);
  }, [records, setRecords]);

  const handleDeleteRecord = useCallback((id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    if (currentId === id) {
      setCurrentId(updated.length > 0 ? updated[0].id : null);
    }
  }, [records, currentId, setRecords]);

  const handleUpdateRecord = useCallback((updates: Partial<RequestRecord>) => {
    if (!currentId) return;
    setRecords((prev) =>
      prev.map((r) => (r.id === currentId ? { ...r, ...updates } : r))
    );
  }, [currentId, setRecords]);

  const handleRename = useCallback((id: string, newTitle: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, title: newTitle || 'Без названия' } : r))
    );
  }, [setRecords]);

  const handleTransform = async () => {
    if (!currentRecord || !currentRecord.sourceText.trim()) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const apiKey = settings.apiKey || process.env.GEMINI_API_KEY || '';
      const result = await transformText(
        currentRecord.sourceText,
        currentRecord.params,
        apiKey
      );
      
      handleUpdateRecord({ 
        result,
        title: currentRecord.sourceText.slice(0, 30).trim() || 'Результат'
      });
    } catch (err: any) {
      setError(err.message || 'Произошла непредвиденная ошибка');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-natural-bg text-natural-ink font-sans transition-colors duration-200">
      <Header 
        settings={settings} 
        onUpdateSettings={(updates) => setSettings({ ...settings, ...updates })} 
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Toggle */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-full shadow-2xl"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 lg:hidden z-40 transition-opacity"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className={`
          fixed lg:relative inset-y-0 left-0 w-80 z-40 lg:z-auto transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar
            records={records}
            currentId={currentId}
            onSelect={(id) => {
              setCurrentId(id);
              setIsSidebarOpen(false);
              setError(null);
            }}
            onDelete={handleDeleteRecord}
            onNew={handleNewRecord}
            onRename={handleRename}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-natural-bg">
          <div className="max-w-4xl mx-auto p-6 md:p-10">
            {currentRecord ? (
              <motion.div
                key={currentRecord.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <section>
                  <Editor
                    sourceText={currentRecord.sourceText}
                    params={currentRecord.params}
                    onChange={(updates) => {
                      if (updates.sourceText !== undefined) handleUpdateRecord({ sourceText: updates.sourceText });
                      if (updates.params !== undefined) handleUpdateRecord({ params: { ...currentRecord.params, ...updates.params } });
                    }}
                    onTransform={handleTransform}
                    isProcessing={isProcessing}
                    error={error}
                  />
                </section>

                <AnimatePresence>
                  {currentRecord.result && (
                    <motion.section
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <ResultView result={currentRecord.result} />
                    </motion.section>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4 py-20">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center">
                  <X size={32} />
                </div>
                <p className="text-sm font-medium">Выберите или создайте запрос</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

