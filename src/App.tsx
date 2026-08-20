import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Header } from './components/Header';
import { NewsCard, NewsCardSkeleton } from './components/NewsCard';
import { NewsDetail } from './components/NewsDetail';
import { ToneControl } from './components/ToneControl';
import { NewsApiError, fetchArticle, fetchNews, rewriteArticle } from './services/newsApi';
import type { NewsArticle, NewsSource, RewriteResult, Tone } from './types';

const NEWS_LIMIT = 20;
const FALLBACK_SOURCE: NewsSource = {
  id: 'habr-ai',
  name: 'Хабр',
  feedUrl: 'https://habr.com/ru/rss/hubs/artificial_intelligence/news/?fl=ru',
  newsUrl: 'https://habr.com/ru/hubs/artificial_intelligence/news/',
};

function readStoredTheme(): 'light' | 'dark' {
  try {
    return window.localStorage.getItem('gen-meaning-theme') === 'dark'
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof NewsApiError) {
    if (error.code === 'LLM_NOT_CONFIGURED') {
      return 'Сервис переписывания еще не настроен на сервере.';
    }
    if (error.code === 'REWRITE_FACT_CHECK_FAILED') {
      return 'Результат не прошел проверку сохранения фактов.';
    }
    if (error.code === 'REWRITE_RATE_LIMITED') {
      return 'Слишком много запросов. Повторите немного позже.';
    }
    return error.message;
  }

  return error instanceof Error
    ? error.message
    : 'Произошла непредвиденная ошибка.';
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(readStoredTheme);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<NewsSource>(FALLBACK_SOURCE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>('neutral');
  const [customStyle, setCustomStyle] = useState('');
  const [rewrite, setRewrite] = useState<RewriteResult | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  const detailAbortRef = useRef<AbortController | null>(null);
  const rewriteAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem('gen-meaning-theme', theme);
    } catch {
      // Theme persistence is optional.
    }
  }, [theme]);

  const loadNews = useCallback(async (append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else if (articles.length > 0) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    if (!append) setError(null);

    try {
      const response = await fetchNews(
        NEWS_LIMIT,
        append ? articles.length : 0,
      );

      setArticles((current) =>
        append ? [...current, ...response.items] : response.items,
      );
      setTotal(response.pagination.total);
      setSource(response.source);
      setLastUpdated(new Date());
      if (!append) setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [articles.length]);

  useEffect(() => {
    void loadNews();
    return () => {
      detailAbortRef.current?.abort();
      rewriteAbortRef.current?.abort();
    };
  }, []); // Initial fetch only.

  const handleOpenArticle = useCallback((article: NewsArticle) => {
    detailAbortRef.current?.abort();
    rewriteAbortRef.current?.abort();

    const controller = new AbortController();
    detailAbortRef.current = controller;
    setSelectedArticle(article);
    setIsDetailLoading(true);
    setDetailError(null);
    setRewrite(null);
    setRewriteError(null);
    setCustomStyle('');

    void fetchArticle(article.id, controller.signal)
      .then((freshArticle) => {
        setSelectedArticle(freshArticle);
        setArticles((current) =>
          current.map((item) => (item.id === freshArticle.id ? freshArticle : item)),
        );
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }
        setDetailError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsDetailLoading(false);
      });
  }, []);

  const handleCloseArticle = useCallback(() => {
    detailAbortRef.current?.abort();
    rewriteAbortRef.current?.abort();
    setSelectedArticle(null);
    setIsDetailLoading(false);
    setIsRewriting(false);
  }, []);

  const handleToneChange = useCallback((nextTone: Tone) => {
    setTone(nextTone);
    setRewrite(null);
    setRewriteError(null);
  }, []);

  const handleRewrite = useCallback(async () => {
    if (!selectedArticle || (tone === 'custom' && !customStyle.trim())) return;

    rewriteAbortRef.current?.abort();
    const controller = new AbortController();
    rewriteAbortRef.current = controller;
    setIsRewriting(true);
    setRewriteError(null);
    setRewrite(null);

    try {
      const result = await rewriteArticle(
        selectedArticle.id,
        tone,
        tone === 'custom' ? customStyle.trim() : null,
        controller.signal,
      );
      setRewrite(result);
    } catch (rewriteRequestError) {
      if (
        rewriteRequestError instanceof DOMException &&
        rewriteRequestError.name === 'AbortError'
      ) {
        return;
      }
      setRewriteError(getErrorMessage(rewriteRequestError));
    } finally {
      if (!controller.signal.aborted) setIsRewriting(false);
    }
  }, [customStyle, selectedArticle, tone]);

  const hasStaleData = Boolean(error && articles.length > 0);
  const hasMore = articles.length < total;

  return (
    <div className="flex min-h-screen flex-col bg-natural-bg text-natural-ink">
      <Header
        sourceName={source.name}
        sourceUrl={source.newsUrl}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        theme={theme}
        onRefresh={() => void loadNews()}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <section className="border-b border-natural-border pb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow">Лента Хабра</p>
                <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-natural-ink sm:text-4xl">
                  Свежие материалы
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-natural-ink-muted">
                  Короткие AI-новости на русском языке с сохраненной ссылкой на первоисточник.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 lg:items-end">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-natural-ink-muted">
                  Тональность
                </span>
                <ToneControl value={tone} onChange={handleToneChange} compact />
              </div>
            </div>
          </section>

          {hasStaleData && (
            <div className="mt-5 flex flex-col gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-start gap-2">
                <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                Не удалось обновить ленту. Показаны последние сохраненные новости.
              </span>
              <button
                type="button"
                onClick={() => void loadNews()}
                className="inline-flex items-center gap-1.5 self-start font-semibold hover:underline sm:self-auto"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Повторить
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="news-grid mt-7" aria-label="Загрузка новостей">
              {Array.from({ length: 6 }, (_, index) => (
                <NewsCardSkeleton key={index} />
              ))}
            </div>
          ) : error && articles.length === 0 ? (
            <EmptyState
              icon={<AlertCircle size={24} aria-hidden="true" />}
              title="Лента временно недоступна"
              message={error}
              action={
                <button
                  type="button"
                  onClick={() => void loadNews()}
                  className="inline-flex items-center gap-2 bg-natural-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Повторить загрузку
                </button>
              }
            />
          ) : articles.length === 0 ? (
            <EmptyState
              icon={<Inbox size={24} aria-hidden="true" />}
              title="В ленте пока нет новостей"
              message="Обновите источник, чтобы получить свежие материалы."
              action={
                <button
                  type="button"
                  onClick={() => void loadNews()}
                  className="inline-flex items-center gap-2 border border-natural-border bg-white px-4 py-2.5 text-sm font-semibold text-natural-ink hover:border-natural-accent dark:bg-natural-sidebar"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Обновить
                </button>
              }
            />
          ) : (
            <>
              <div className="mb-5 mt-7 flex items-center justify-between gap-4">
                <p className="text-sm text-natural-ink-muted">
                  {total} {pluralize(total, 'материал', 'материала', 'материалов')}
                </p>
                <span className="text-xs text-natural-ink-muted">
                  Показано {articles.length}
                </span>
              </div>

              <div className="news-grid">
                {articles.map((article) => (
                  <NewsCard key={article.id} article={article} onOpen={handleOpenArticle} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-8">
                  <button
                    type="button"
                    onClick={() => void loadNews(true)}
                    disabled={isLoadingMore}
                    className="inline-flex min-h-10 items-center gap-2 border border-natural-border bg-white px-5 py-2.5 text-sm font-semibold text-natural-ink transition-colors hover:border-natural-accent disabled:cursor-wait disabled:opacity-60 dark:bg-natural-sidebar"
                  >
                    {isLoadingMore && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                    {isLoadingMore ? 'Загружаем' : 'Показать еще'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <NewsDetail
        article={selectedArticle}
        tone={tone}
        customStyle={customStyle}
        rewrite={rewrite}
        isLoading={isDetailLoading}
        isRewriting={isRewriting}
        error={detailError || rewriteError}
        onClose={handleCloseArticle}
        onToneChange={handleToneChange}
        onCustomStyleChange={setCustomStyle}
        onRewrite={() => void handleRewrite()}
        onRetry={() => {
          if (detailError && selectedArticle) {
            handleOpenArticle(selectedArticle);
          } else {
            void handleRewrite();
          }
        }}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action: React.ReactNode;
}) {
  return (
    <section className="flex min-h-[22rem] flex-col items-center justify-center border border-dashed border-natural-border px-5 text-center">
      <div className="flex h-12 w-12 items-center justify-center border border-natural-border text-natural-accent">
        {icon}
      </div>
      <h3 className="mt-5 font-serif text-xl font-bold text-natural-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-natural-ink-muted">{message}</p>
      <div className="mt-5">{action}</div>
    </section>
  );
}

function pluralize(
  value: number,
  one: string,
  few: string,
  many: string,
): string {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 14) return many;
  switch (value % 10) {
    case 1:
      return one;
    case 2:
    case 3:
    case 4:
      return few;
    default:
      return many;
  }
}
