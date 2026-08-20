import React, { useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { TONE_OPTIONS } from '../constants';
import type { NewsArticle, RewriteResult, Tone } from '../types';
import { ToneControl } from './ToneControl';

interface NewsDetailProps {
  article: NewsArticle | null;
  tone: Tone;
  customStyle: string;
  rewrite: RewriteResult | null;
  isLoading: boolean;
  isRewriting: boolean;
  error: string | null;
  onClose: () => void;
  onToneChange: (tone: Tone) => void;
  onCustomStyleChange: (value: string) => void;
  onRewrite: () => void;
  onRetry: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="icon-button icon-button-small"
      title={copied ? 'Скопировано' : 'Копировать текст'}
      aria-label={copied ? 'Скопировано' : 'Копировать текст'}
    >
      {copied ? (
        <ClipboardCheck size={15} className="text-emerald-600" aria-hidden="true" />
      ) : (
        <Clipboard size={15} aria-hidden="true" />
      )}
    </button>
  );
}

export const NewsDetail: React.FC<NewsDetailProps> = ({
  article,
  tone,
  customStyle,
  rewrite,
  isLoading,
  isRewriting,
  error,
  onClose,
  onToneChange,
  onCustomStyleChange,
  onRewrite,
  onRetry,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!article) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [article, onClose]);

  if (!article) return null;

  const selectedTone = TONE_OPTIONS.find((option) => option.value === tone);
  const canRewrite = tone !== 'custom' || customStyle.trim().length > 0;
  const isNeutral = tone === 'neutral';
  const hasDisplayedResult = isNeutral || Boolean(rewrite);
  const rewrittenTitle = rewrite?.rewrittenTitle || article.title;
  const rewrittenSummary = rewrite?.rewrittenSummary || article.summary;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-0 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="mx-auto min-h-full max-w-6xl bg-natural-bg shadow-2xl sm:min-h-0 sm:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-detail-title"
      >
        <header className="sticky top-0 z-10 border-b border-natural-border bg-natural-bg/95 px-4 py-4 backdrop-blur sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-natural-ink-muted">
                <span className="source-mark">{article.sourceName}</span>
                <span>{formatDate(article.publishedAt)}</span>
                {article.author && <span>{article.author}</span>}
              </div>
              <h2
                id="news-detail-title"
                className="max-w-4xl font-serif text-2xl font-bold leading-tight text-natural-ink sm:text-3xl"
              >
                {article.title}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="icon-button shrink-0"
              title="Закрыть"
              aria-label="Закрыть подробности новости"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-natural-accent hover:underline"
            >
              Читать оригинал
              <ExternalLink size={13} aria-hidden="true" />
            </a>
            {article.externalLinks.map((link) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 truncate text-xs text-natural-ink-muted hover:text-natural-accent hover:underline"
              >
                Внешний источник
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            ))}
          </div>
        </header>

        <div className="space-y-7 px-4 py-5 sm:px-7 sm:py-7">
          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="comparison-panel animate-pulse">
                <div className="h-3 w-24 rounded bg-natural-border" />
                <div className="mt-5 space-y-3">
                  <div className="h-4 w-full rounded bg-natural-border" />
                  <div className="h-4 w-[88%] rounded bg-natural-border" />
                  <div className="h-4 w-[72%] rounded bg-natural-border" />
                </div>
              </div>
              <div className="comparison-panel animate-pulse">
                <div className="h-3 w-32 rounded bg-natural-border" />
                <div className="mt-5 space-y-3">
                  <div className="h-4 w-full rounded bg-natural-border" />
                  <div className="h-4 w-[84%] rounded bg-natural-border" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <section className="comparison-panel">
                  <div className="comparison-heading">
                    <div>
                      <p className="eyebrow">Оригинальная выжимка</p>
                      <h3>Что сообщил источник</h3>
                    </div>
                    <CopyButton text={`${article.title}\n\n${article.summary}`} />
                  </div>
                  <h4 className="mt-5 font-serif text-xl font-bold leading-tight text-natural-ink">
                    {article.title}
                  </h4>
                  <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-natural-ink-muted">
                    {article.summary}
                  </p>
                  <div className="mt-6 flex items-center gap-2 border-t border-natural-border pt-3 text-xs text-natural-ink-muted">
                    <CheckCircle2 size={14} className="text-emerald-600" aria-hidden="true" />
                    <span>Сохранено без изменений</span>
                  </div>
                </section>

                <section className="comparison-panel comparison-panel-accent">
                  <div className="comparison-heading">
                    <div>
                      <p className="eyebrow">Версия с подачей</p>
                      <h3>{selectedTone?.label || 'Рерайт'}</h3>
                    </div>
                    {hasDisplayedResult && (
                      <CopyButton text={`${rewrittenTitle}\n\n${rewrittenSummary}`} />
                    )}
                  </div>

                  {hasDisplayedResult ? (
                    <>
                      <h4 className="mt-5 font-serif text-xl font-bold leading-tight text-natural-ink">
                        {rewrittenTitle}
                      </h4>
                      <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-natural-ink">
                        {rewrittenSummary}
                      </p>
                      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-natural-border pt-3 text-xs text-natural-ink-muted">
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 size={14} aria-hidden="true" />
                          {isNeutral ? 'Исходная версия' : 'Факты проверены'}
                        </span>
                        {rewrite?.cached && <span>Из кэша</span>}
                      </div>
                    </>
                  ) : isRewriting ? (
                    <div className="flex min-h-56 flex-col items-center justify-center text-center">
                      <Loader2 size={24} className="animate-spin text-natural-accent" aria-hidden="true" />
                      <p className="mt-4 text-sm font-semibold text-natural-ink">
                        Проверяем и переписываем
                      </p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-natural-ink-muted">
                        Результат появится после проверки сохранения фактов.
                      </p>
                    </div>
                  ) : (
                    <div className="flex min-h-56 flex-col items-center justify-center text-center">
                      <SparklePlaceholder />
                      <p className="mt-4 text-sm font-semibold text-natural-ink">
                        Выберите подачу для этой новости
                      </p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-natural-ink-muted">
                        Имена, даты, числа и утверждения останутся неизменными.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <section className="border-y border-natural-border py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="eyebrow">Выбор подачи</p>
                    <p className="mt-1 text-sm text-natural-ink-muted">
                      Нейтральная версия доступна сразу, остальные требуют проверки на сервере.
                    </p>
                  </div>
                  <ToneControl
                    value={tone}
                    onChange={onToneChange}
                    disabled={isRewriting}
                    compact
                  />
                </div>

                {tone === 'custom' && (
                  <input
                    value={customStyle}
                    onChange={(event) => onCustomStyleChange(event.target.value)}
                    maxLength={240}
                    placeholder="Например: коротко, сухо и с акцентом на риски"
                    className="mt-4 w-full border border-natural-border bg-white px-3 py-2.5 text-sm text-natural-ink outline-none transition-colors placeholder:text-natural-ink-muted/60 focus:border-natural-accent dark:bg-natural-sidebar"
                  />
                )}

                {error && (
                  <div className="mt-4 flex flex-col gap-3 border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-start gap-2">
                      <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {error}
                    </span>
                    <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 self-start font-semibold hover:underline sm:self-auto">
                      <RefreshCw size={14} aria-hidden="true" />
                      Повторить
                    </button>
                  </div>
                )}

                <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <span className="text-xs text-natural-ink-muted">
                    {tone === 'neutral'
                      ? 'Оригинальный текст будет показан без вызова LLM.'
                      : 'Результат сохранится только после успешной проверки фактов.'}
                  </span>
                  {isNeutral ? (
                    <span className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Нейтральная версия активна
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={onRewrite}
                      disabled={!canRewrite || isRewriting}
                      className="inline-flex min-h-10 items-center gap-2 bg-natural-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-natural-border disabled:text-natural-ink-muted"
                    >
                      {isRewriting ? (
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <RefreshCw size={16} aria-hidden="true" />
                      )}
                      Переписать новость
                    </button>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

function SparklePlaceholder() {
  return (
    <div className="flex h-12 w-12 items-center justify-center border border-dashed border-natural-accent/50 text-natural-accent">
      <Sparkles size={21} aria-hidden="true" />
    </div>
  );
}
