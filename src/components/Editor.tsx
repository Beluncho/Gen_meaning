import React, { useState } from 'react';
import { Settings2, ChevronDown, ChevronUp, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { TransformationParams, Goal, Audience, Tonality, Formality, Length } from '../types';
import { GOALS, AUDIENCES, TONALITIES, FORMALITIES, LENGTHS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface EditorProps {
  sourceText: string;
  params: TransformationParams;
  onChange: (updates: { sourceText?: string; params?: Partial<TransformationParams> }) => void;
  onTransform: () => void;
  isProcessing: boolean;
  error: string | null;
}

export const Editor: React.FC<EditorProps> = ({
  sourceText,
  params,
  onChange,
  onTransform,
  isProcessing,
  error,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleParamChange = (key: keyof TransformationParams, value: any) => {
    onChange({ params: { ...params, [key]: value } });
  };

  return (
    <div className="space-y-6">
      {/* Input Text Area */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-natural-accent">
          Исходный текст
        </label>
        <div className="p-4 bg-white dark:bg-natural-sidebar/30 border border-natural-border rounded-xl shadow-sm transition-colors duration-200">
          <textarea
            value={sourceText}
            onChange={(e) => onChange({ sourceText: e.target.value })}
            placeholder="Введите текст для трансформации..."
            className="w-full h-32 md:h-40 border-none outline-none transition-all resize-none bg-transparent text-natural-ink placeholder:text-natural-ink-muted/50"
          />
          <div className="text-[10px] text-natural-ink-muted/60 font-mono text-right mt-2">
            {sourceText.length} симв.
          </div>
        </div>
      </div>

      {/* Basic Params */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Goal */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-natural-accent">
            Цель
          </label>
          <select
            value={params.goal}
            onChange={(e) => handleParamChange('goal', e.target.value as Goal)}
            className="w-full p-2 bg-white dark:bg-natural-sidebar/50 border border-natural-border rounded-lg text-xs outline-none focus:border-natural-accent transition-colors text-natural-ink"
          >
            {Object.entries(GOALS).map(([key, info]) => (
              <option key={key} value={key} className="bg-natural-bg text-natural-ink">
                {info.label}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-natural-ink-muted/80 leading-tight">
            {GOALS[params.goal].description}
          </p>
        </div>

        {/* Audience */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-natural-accent">
            Аудитория
          </label>
          <select
            value={params.audience}
            onChange={(e) => handleParamChange('audience', e.target.value as Audience)}
            className="w-full p-2 bg-white dark:bg-natural-sidebar/50 border border-natural-border rounded-lg text-xs outline-none focus:border-natural-accent transition-colors text-natural-ink"
          >
            {Object.entries(AUDIENCES).map(([key, info]) => (
              <option key={key} value={key} className="bg-natural-bg text-natural-ink">
                {info.label}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-natural-ink-muted/80 leading-tight">
            {AUDIENCES[params.audience].description}
          </p>
        </div>

        {/* Tonality */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-natural-accent">
            Тональность
          </label>
          <select
            value={params.tonality}
            onChange={(e) => handleParamChange('tonality', e.target.value as Tonality)}
            className="w-full p-2 bg-white dark:bg-natural-sidebar/50 border border-natural-border rounded-lg text-xs outline-none focus:border-natural-accent transition-colors text-natural-ink"
          >
            {Object.entries(TONALITIES).map(([key, info]) => (
              <option key={key} value={key} className="bg-natural-bg text-natural-ink">
                {info.label}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-natural-ink-muted/80 leading-tight">
            {TONALITIES[params.tonality].description}
          </p>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <div className="space-y-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-semibold text-natural-accent hover:underline transition-all flex items-center gap-1.5"
        >
          <span>Дополнительные параметры</span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white dark:bg-natural-sidebar/20 rounded-xl border border-natural-border grid grid-cols-1 sm:grid-cols-3 gap-6 mt-2 transition-colors duration-200">
                {/* Formality */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-natural-ink-muted">Формальность</label>
                  <div className="flex gap-1 p-1 bg-natural-sidebar/30 rounded-lg">
                    {(['low', 'medium', 'high'] as Formality[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => handleParamChange('formality', f)}
                        className={`flex-1 py-1 text-[10px] font-medium rounded ${
                          params.formality === f
                            ? 'bg-white dark:bg-natural-accent shadow-sm text-natural-accent dark:text-white'
                            : 'text-natural-ink-muted hover:bg-white/50 dark:hover:bg-natural-accent/20'
                        } transition-all`}
                      >
                        {FORMALITIES[f]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-natural-ink-muted">Желаемая длина</label>
                  <div className="flex gap-1 p-1 bg-natural-sidebar/30 rounded-lg">
                    {(['short', 'medium', 'detailed'] as Length[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => handleParamChange('length', l)}
                        className={`flex-1 py-1 text-[10px] font-medium rounded ${
                          params.length === l
                            ? 'bg-white dark:bg-natural-accent shadow-sm text-natural-accent dark:text-white'
                            : 'text-natural-ink-muted hover:bg-white/50 dark:hover:bg-natural-accent/20'
                        } transition-all`}
                      >
                        {LENGTHS[l]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simplify Terms */}
                <div className="space-y-2 flex flex-col justify-center">
                   <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={params.simplifyTerms} 
                        onChange={(e) => handleParamChange('simplifyTerms', e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-natural-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-natural-accent transition-colors"></div>
                      <span className="ml-3 text-[11px] font-medium text-natural-ink-muted/80">Упрощение терминов</span>
                    </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400 text-sm"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={onTransform}
          disabled={isProcessing || !sourceText.trim()}
          className={`px-8 py-3 rounded-full font-bold transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 ${
            isProcessing || !sourceText.trim()
              ? 'bg-natural-border text-natural-ink-muted cursor-not-allowed'
              : 'bg-natural-accent text-white dark:text-natural-bg hover:opacity-90'
          }`}
        >
          {isProcessing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Wand2 size={18} />
          )}
          <span>Адаптировать текст</span>
        </button>
      </div>
    </div>
  );
};
