import React from 'react';
import {
  ExternalLink,
  Moon,
  Newspaper,
  RefreshCw,
  Sun,
} from 'lucide-react';

interface HeaderProps {
  sourceUrl: string;
  sourceName: string;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  theme: 'light' | 'dark';
  onRefresh: () => void;
  onToggleTheme: () => void;
}

function formatRefreshTime(value: Date | null): string {
  if (!value) return 'Еще не обновлялось';

  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

export const Header: React.FC<HeaderProps> = ({
  sourceUrl,
  sourceName,
  isRefreshing,
  lastUpdated,
  theme,
  onRefresh,
  onToggleTheme,
}) => {
  return (
    <header className="shrink-0 border-b border-natural-border bg-white/95 backdrop-blur dark:bg-natural-sidebar/95">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-natural-accent text-white">
            <Newspaper size={19} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-xl font-bold tracking-tight text-natural-ink">
              Новости об ИИ
            </h1>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-[11px] font-semibold text-natural-ink-muted transition-colors hover:text-natural-accent"
            >
              <span className="truncate">Источник: {sourceName}</span>
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <span className="hidden text-right text-[11px] text-natural-ink-muted sm:block">
            Обновлено в {formatRefreshTime(lastUpdated)}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="icon-button"
            title={isRefreshing ? 'Обновление новостей' : 'Обновить новости'}
            aria-label={isRefreshing ? 'Обновление новостей' : 'Обновить новости'}
          >
            <RefreshCw
              size={17}
              className={isRefreshing ? 'animate-spin' : ''}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="icon-button"
            title={theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'}
          >
            {theme === 'dark' ? (
              <Sun size={17} aria-hidden="true" />
            ) : (
              <Moon size={17} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
