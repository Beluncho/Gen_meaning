import type { Tone } from './types';

export const TONE_OPTIONS: Array<{
  value: Tone;
  label: string;
  description: string;
}> = [
  {
    value: 'neutral',
    label: 'Нейтрально',
    description: 'Исходная выжимка без изменения подачи',
  },
  {
    value: 'joyful',
    label: 'Радостно',
    description: 'Более живой и позитивный тон',
  },
  {
    value: 'sad',
    label: 'Грустно',
    description: 'Сдержанная и меланхоличная подача',
  },
  {
    value: 'ironic',
    label: 'Иронично',
    description: 'Легкая ирония без изменения фактов',
  },
  {
    value: 'custom',
    label: 'Свой стиль',
    description: 'Короткое описание желаемой подачи',
  },
];
