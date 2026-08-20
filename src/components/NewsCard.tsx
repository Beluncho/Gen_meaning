import React from 'react';
import { ArrowUpRight, CalendarDays, UserRound } from 'lucide-react';
import type { NewsArticle } from '../types';

interface NewsCardProps {
  article: NewsArticle;
  onOpen: (article: NewsArticle) => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export const NewsCard: React.FC<NewsCardProps> = ({ article, onOpen }) => {
  return (
    <article className="news-card group">
      <button
        type="button"
        onClick={() => onOpen(article)}
        className="block w-full text-left"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="source-mark">{article.sourceName}</span>
          <ArrowUpRight
            size={17}
            className="text-natural-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-natural-accent"
            aria-hidden="true"
          />
        </div>
        <h2 className="line-clamp-3 font-serif text-[1.2rem] font-bold leading-tight text-natural-ink transition-colors group-hover:text-natural-accent">
          {article.title}
        </h2>
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-natural-ink-muted">
          {article.summary}
        </p>
      </button>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-natural-border pt-3 text-[11px] text-natural-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={13} aria-hidden="true" />
          {formatDate(article.publishedAt)}
        </span>
        {article.author && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <UserRound size={13} aria-hidden="true" />
            <span className="max-w-[12rem] truncate">{article.author}</span>
          </span>
        )}
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="ml-auto inline-flex items-center gap-1 font-semibold text-natural-accent hover:underline"
        >
          Оригинал
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
};

export function NewsCardSkeleton() {
  return (
    <div className="news-card animate-pulse">
      <div className="mb-5 flex items-center justify-between">
        <div className="h-4 w-16 rounded bg-natural-border" />
        <div className="h-4 w-4 rounded bg-natural-border" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-[92%] rounded bg-natural-border" />
        <div className="h-5 w-[76%] rounded bg-natural-border" />
        <div className="h-5 w-[60%] rounded bg-natural-border" />
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-3 w-full rounded bg-natural-border/80" />
        <div className="h-3 w-[90%] rounded bg-natural-border/80" />
        <div className="h-3 w-[72%] rounded bg-natural-border/80" />
      </div>
      <div className="mt-6 border-t border-natural-border pt-3">
        <div className="h-3 w-2/3 rounded bg-natural-border/80" />
      </div>
    </div>
  );
}
