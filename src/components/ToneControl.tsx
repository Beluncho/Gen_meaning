import React from 'react';
import { CloudRain, Laugh, Minus, Sparkles, VenetianMask } from 'lucide-react';
import { TONE_OPTIONS } from '../constants';
import type { Tone } from '../types';

const TONE_ICONS = {
  neutral: Minus,
  joyful: Laugh,
  sad: CloudRain,
  ironic: VenetianMask,
  custom: Sparkles,
} as const;

interface ToneControlProps {
  value: Tone;
  onChange: (tone: Tone) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const ToneControl: React.FC<ToneControlProps> = ({
  value,
  onChange,
  disabled = false,
  compact = false,
}) => {
  return (
    <div
      className={`tone-control ${compact ? 'tone-control-compact' : ''}`}
      role="group"
      aria-label="Тональность выжимки"
    >
      {TONE_OPTIONS.map((option) => {
        const Icon = TONE_ICONS[option.value];
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            title={option.description}
            aria-pressed={selected}
            className={`tone-option ${selected ? 'tone-option-active' : ''}`}
          >
            <Icon size={compact ? 14 : 15} aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
